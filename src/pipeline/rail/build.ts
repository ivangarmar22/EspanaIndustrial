/**
 * Pure construction of the railway dataset from the raw downloads. No I/O, so
 * it is unit-tested with fixtures and re-runnable offline from snapshots.
 */
import type { Feature, FeatureCollection, LineString } from "geojson";
import {
  GREENWAY_NEAR_M,
  STATION_STATUS,
  type LineState,
  type RailLine,
  type RailStation,
  type StationStatus,
  type TrackKind,
} from "@/domain/rail";
import { getProvince } from "@/domain/territory";
import { slugify } from "@/lib/text";
import { bbox, distanceToLineM, lineLengthM, nearBBox, simplify, type BBox, type LonLat } from "./geometry";
import type { OsmElement, OsmResponse, SparqlRow } from "./sources";

/** ~15 m: keeps curves recognisable at street zoom while cutting most vertices. */
const SIMPLIFY_DEG = 0.00015;
/** A former alignment this close to a station is taken to be the station's own line. */
const TRACKBED_NEAR_M = 300;

const GREENWAY_NAME = /v[ií]a verd[ae]|bide berdea/i;
const TRAIL_HIGHWAYS = new Set(["cycleway", "path", "footway", "track", "bridleway", "pedestrian"]);
/** Most specific status wins when Wikidata lists several. */
const STATUS_PRECEDENCE: StationStatus[] = ["demolished", "abandoned", "out-of-service", "closed"];
const statusByQid = new Map<string, StationStatus>(
  Object.entries(STATION_STATUS).map(([k, v]) => [v.qid, k as StationStatus]),
);

const qid = (uri?: string) => uri?.split("/").pop();
const year = (iso?: string) => {
  const m = iso?.match(/^(-?\d{4})-/);
  return m ? Number(m[1]) : undefined;
};
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("es") + s.slice(1);

interface TrackFeatureProps {
  /** Kind of alignment (short key keeps the public GeoJSON small). */
  k: TrackKind;
  n?: string;
}
export type TrackCollection = FeatureCollection<LineString, TrackFeatureProps>;

interface Track {
  kind: TrackKind;
  name?: string;
  coords: LonLat[];
  box: BBox;
}

function classifyWay(tags: Record<string, string> = {}): TrackKind {
  if (GREENWAY_NAME.test(tags.name ?? "")) return "greenway";
  if (tags.highway && TRAIL_HIGHWAYS.has(tags.highway)) return "trail";
  return tags.railway === "disused" ? "disused" : "abandoned";
}

const toCoords = (g: Array<{ lat: number; lon: number }>): LonLat[] => g.map((p) => [p.lon, p.lat]);

/** Merges the two OSM downloads into one set of classified alignments; each way is drawn once. */
export function buildTracks(tracks: OsmResponse, greenways: OsmResponse): Track[] {
  const out: Track[] = [];
  const seen = new Set<number>();
  const add = (id: number, kind: TrackKind, name: string | undefined, geometry?: OsmElement["geometry"]) => {
    if (seen.has(id) || !geometry || geometry.length < 2) return;
    seen.add(id);
    const coords = toCoords(geometry);
    out.push({ kind, name, coords, box: bbox(coords) });
  };
  // Named greenway ways first, so a former railway that is now a greenway is classified as such.
  for (const el of greenways.elements) {
    if (el.type === "way") add(el.id, "greenway", el.tags?.name, el.geometry);
  }
  for (const el of greenways.elements) {
    if (el.type !== "relation") continue;
    for (const m of el.members ?? []) if (m.type === "way") add(m.ref, "greenway", el.tags?.name, m.geometry);
  }
  for (const el of tracks.elements) {
    if (el.type === "way") add(el.id, classifyWay(el.tags), el.tags?.name, el.geometry);
  }
  return out;
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export function tracksToGeoJSON(tracks: Track[]): TrackCollection {
  return {
    type: "FeatureCollection",
    features: tracks.map((t): Feature<LineString, TrackFeatureProps> => ({
      type: "Feature",
      properties: t.name ? { k: t.kind, n: t.name } : { k: t.kind },
      geometry: {
        type: "LineString",
        coordinates: simplify(t.coords, SIMPLIFY_DEG).map(([x, y]) => [round5(x), round5(y)]),
      },
    })),
  };
}

export function trackKm(tracks: Track[]): Record<TrackKind, number> {
  const km: Record<TrackKind, number> = { greenway: 0, trail: 0, abandoned: 0, disused: 0 };
  for (const t of tracks) km[t.kind] += lineLengthM(t.coords) / 1000;
  for (const k of Object.keys(km) as TrackKind[]) km[k] = Math.round(km[k]);
  return km;
}

function nearest(p: LonLat, tracks: Track[], maxM: number): { track: Track; distanceM: number } | undefined {
  const margin = maxM / 80_000; // metres → degrees, generous at Spanish latitudes
  let best: { track: Track; distanceM: number } | undefined;
  for (const t of tracks) {
    if (!nearBBox(p, t.box, margin)) continue;
    const d = distanceToLineM(p, t.coords);
    if (d <= maxM && (!best || d < best.distanceM)) best = { track: t, distanceM: d };
  }
  return best;
}

interface StationDraft {
  id: string;
  name: string;
  point?: LonLat;
  statuses: Set<StationStatus>;
  lines: Map<string, string>;
  opened?: number;
  closed?: number;
  image?: string;
  ine?: string;
  municipality?: string;
}

export interface RailBuildResult {
  stations: RailStation[];
  lines: RailLine[];
  skipped: { withoutCoordinates: number; withoutLabel: number };
}

export function buildRail(stationRows: SparqlRow[], lineRows: SparqlRow[], tracks: Track[]): RailBuildResult {
  const drafts = new Map<string, StationDraft>();
  let withoutLabel = 0;
  for (const row of stationRows) {
    const id = qid(row.s?.value);
    const status = statusByQid.get(qid(row.state?.value) ?? "");
    if (!id || !status) continue;
    let d = drafts.get(id);
    if (!d) {
      d = { id, name: capitalize(row.sLabel?.value ?? id), statuses: new Set(), lines: new Map() };
      drafts.set(id, d);
    }
    d.statuses.add(status);
    const coord = row.coord?.value.match(/Point\((-?[\d.]+) (-?[\d.]+)\)/);
    if (coord && !d.point) d.point = [Number(coord[1]), Number(coord[2])];
    const line = qid(row.line?.value);
    if (line && row.lineLabel?.value && row.lineLabel.value !== line)
      d.lines.set(line, capitalize(row.lineLabel.value));
    d.opened ??= year(row.opened?.value);
    d.closed ??= year(row.closed?.value);
    d.image ??= row.image ? decodeURIComponent(row.image.value.split("/Special:FilePath/").pop() ?? "") : undefined;
    if (row.ine?.value && /^\d{5}$/.test(row.ine.value)) {
      d.ine ??= row.ine.value;
      d.municipality ??= row.mLabel?.value;
    }
  }

  // Line slugs: unique, stable for a given name; a collision gets the Q-id appended.
  const lineNames = new Map<string, string>();
  for (const d of drafts.values()) for (const [id, name] of d.lines) lineNames.set(id, name);
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  for (const [id, name] of [...lineNames].sort((a, b) => a[0].localeCompare(b[0]))) {
    let slug = slugify(name);
    if (used.has(slug)) slug = `${slug}-${id.toLowerCase()}`;
    used.add(slug);
    slugs.set(id, slug);
  }

  const greenways = tracks.filter((t) => t.kind === "greenway");
  let withoutCoordinates = 0;
  const stations: RailStation[] = [];
  for (const d of drafts.values()) {
    if (d.name === d.id) {
      withoutLabel++;
      continue;
    }
    if (!d.point) {
      withoutCoordinates++;
      continue;
    }
    const province = d.ine ? getProvince(d.ine.slice(0, 2)) : undefined;
    const gw = nearest(d.point, greenways, GREENWAY_NEAR_M);
    const bed = nearest(d.point, tracks, TRACKBED_NEAR_M);
    stations.push({
      id: d.id,
      name: d.name,
      lon: round5(d.point[0]),
      lat: round5(d.point[1]),
      status: STATUS_PRECEDENCE.find((s) => d.statuses.has(s))!,
      lines: [...d.lines].map(([id, name]) => ({ id, name, slug: slugs.get(id)! })),
      openedYear: d.opened,
      closedYear: d.closed,
      municipality: province ? d.municipality : undefined,
      provinceCode: province?.code,
      regionCode: province?.regionCode,
      commonsFile: d.image || undefined,
      greenway: gw ? { name: gw.track.name ?? "Vía Verde", distanceM: Math.round(gw.distanceM) } : undefined,
      trackbedM: bed ? Math.round(bed.distanceM) : undefined,
    });
  }
  stations.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const lineInfo = new Map<string, { states: Set<string>; closed?: number }>();
  for (const row of lineRows) {
    const id = qid(row.line?.value);
    if (!id) continue;
    const info = lineInfo.get(id) ?? { states: new Set() };
    const state = qid(row.state?.value);
    if (state) info.states.add(state);
    info.closed ??= year(row.closing?.value) ?? year(row.dissolved?.value);
    lineInfo.set(id, info);
  }
  const lineState = (id: string): LineState => {
    const info = lineInfo.get(id);
    if (info?.states.has("Q55654238")) return "active";
    if (info && ([...info.states].some((s) => statusByQid.has(s)) || info.closed)) return "closed";
    return "unknown";
  };

  const lines: RailLine[] = [...lineNames].map(([id, name]) => {
    const own = stations.filter((s) => s.lines.some((l) => l.id === id));
    return {
      id,
      slug: slugs.get(id)!,
      name,
      state: lineState(id),
      closedYear: lineInfo.get(id)?.closed,
      stationCount: own.length,
      regionCodes: [...new Set(own.flatMap((s) => (s.regionCode ? [s.regionCode] : [])))].sort(),
      greenways: [...new Set(own.flatMap((s) => (s.greenway ? [s.greenway.name] : [])))].sort(),
    };
  });
  lines.sort((a, b) => b.stationCount - a.stationCount || a.name.localeCompare(b.name, "es"));

  return { stations, lines, skipped: { withoutCoordinates, withoutLabel } };
}
