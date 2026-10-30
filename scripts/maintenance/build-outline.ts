/**
 * Regenerates src/features/home/outline.generated.ts from Natural Earth 1:10m
 * data (public domain): countries, first-level divisions (Spanish provinces,
 * grouped by autonomous community) and river centre lines.
 *
 *   base=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
 *   curl -LO $base/ne_10m_admin_0_countries.geojson
 *   curl -LO $base/ne_10m_admin_1_states_provinces.geojson
 *   curl -LO $base/ne_10m_rivers_lake_centerlines.geojson
 *   npm run maintenance:outline -- ne_10m_admin_0_countries.geojson ne_10m_admin_1_states_provinces.geojson ne_10m_rivers_lake_centerlines.geojson
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CANARY, H, MAIN, W, isCanary, project, projectCanary } from "@/features/home/projection";
import { simplify, type LonLat } from "@/pipeline/rail/geometry";

type Ring = number[][];
type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] }
  | { type: "LineString"; coordinates: Ring }
  | { type: "MultiLineString"; coordinates: Ring[] };
interface Feature {
  properties: Record<string, string | number | null>;
  geometry: Geometry | null;
}
type Proj = (lon: number, lat: number) => { x: number; y: number };

const [countriesFile, admin1File, riversFile] = process.argv.slice(2);
if (!countriesFile || !admin1File || !riversFile) {
  console.error(
    "Uso: tsx scripts/maintenance/build-outline.ts <countries> <admin_1> <rivers> (Natural Earth 10m GeoJSON)",
  );
  process.exit(1);
}
const load = async (f: string) => (JSON.parse(await readFile(f, "utf8")) as { features: Feature[] }).features;
const [countries, admin1, rivers] = await Promise.all([load(countriesFile), load(admin1File), load(riversFile)]);

/** Simplification tolerance in output pixels (the map is drawn 600 px wide). */
const TOLERANCE = 0.35;

const polygons = (g: Geometry | null): Ring[][] =>
  g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : [];
const lines = (g: Geometry | null): Ring[] =>
  g?.type === "LineString" ? [g.coordinates] : g?.type === "MultiLineString" ? g.coordinates : [];

function toPoints(coords: Ring, proj: Proj): LonLat[] {
  return coords.map(([lon, lat]) => {
    const { x, y } = proj(lon!, lat!);
    return [x, y];
  });
}

function pathOf(parts: LonLat[][], closed: boolean): string {
  return parts
    .map((pts) => simplify(pts, TOLERANCE))
    .filter((pts) => pts.length >= (closed ? 3 : 2))
    .map((pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`)
    .join("");
}

/** Sutherland–Hodgman clip of a closed ring to the drawing (plus a margin), so neighbours are not drawn in full. */
function clipToFrame(pts: LonLat[], margin = 8): LonLat[] {
  const edges: Array<[(p: LonLat) => boolean, (a: LonLat, b: LonLat) => LonLat]> = [
    [(p) => p[0] >= -margin, (a, b) => cut(a, b, 0, -margin)],
    [(p) => p[0] <= W + margin, (a, b) => cut(a, b, 0, W + margin)],
    [(p) => p[1] >= -margin, (a, b) => cut(a, b, 1, -margin)],
    [(p) => p[1] <= H + margin, (a, b) => cut(a, b, 1, H + margin)],
  ];
  let out = pts;
  for (const [inside, intersect] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      if (inside(cur)) {
        if (!inside(prev)) out.push(intersect(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(intersect(prev, cur));
    }
  }
  return out;
}
function cut(a: LonLat, b: LonLat, axis: 0 | 1, value: number): LonLat {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return axis === 0 ? [value, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), value];
}

const inBox = (ring: Ring, b: { minLon: number; maxLon: number; minLat: number; maxLat: number }, margin = 2) =>
  ring.some(
    ([lon, lat]) =>
      lon! >= b.minLon - margin && lon! <= b.maxLon + margin && lat! >= b.minLat - margin && lat! <= b.maxLat + margin,
  );

// ─── Coastlines ──────────────────────────────────────────────────────────────
const spain = countries.find((f) => f.properties.ADMIN === "Spain");
if (!spain) throw new Error("Spain not found in the countries file");
const spainRings = polygons(spain.geometry).map((p) => p[0]!);
const mainland = spainRings.filter((r) => !isCanary(r[0]![1]!, r[0]![0]!) && inBox(r, MAIN, 0.5));
const canaries = spainRings.filter((r) => isCanary(r[0]![1]!, r[0]![0]!) && inBox(r, CANARY, 0.5));
const neighbours = countries
  .filter((f) =>
    ["Portugal", "France", "Andorra", "Morocco", "Algeria", "Gibraltar"].includes(String(f.properties.ADMIN)),
  )
  .flatMap((f) => polygons(f.geometry).map((p) => p[0]!))
  .filter((r) => inBox(r, MAIN));

// ─── Internal borders: shared province edges, split by autonomous community ──
const provinces = admin1.filter((f) => f.properties.admin === "Spain");
const key = (a: number[], b: number[]) => {
  const p = `${a[0]!.toFixed(5)},${a[1]!.toFixed(5)}`;
  const q = `${b[0]!.toFixed(5)},${b[1]!.toFixed(5)}`;
  return p < q ? `${p}|${q}` : `${q}|${p}`;
};
const owners = new Map<string, number[]>();
provinces.forEach((f, i) => {
  for (const poly of polygons(f.geometry))
    for (const ring of poly)
      for (let k = 1; k < ring.length; k++) {
        const id = key(ring[k - 1]!, ring[k]!);
        const list = owners.get(id) ?? [];
        if (!list.includes(i)) list.push(i);
        owners.set(id, list);
      }
});
function borders(sameRegion: boolean): LonLat[][] {
  const out: LonLat[][] = [];
  provinces.forEach((f, i) => {
    for (const poly of polygons(f.geometry)) {
      for (const ring of poly) {
        if (isCanary(ring[0]![1]!, ring[0]![0]!)) continue;
        let run: Ring = [];
        const flush = () => {
          if (run.length >= 2) out.push(toPoints(run, project));
          run = [];
        };
        for (let k = 1; k < ring.length; k++) {
          const list = owners.get(key(ring[k - 1]!, ring[k]!)) ?? [];
          const other = list.find((j) => j !== i);
          // Each shared edge is emitted once, from the province with the lower index.
          const wanted =
            other !== undefined &&
            i < other &&
            (provinces[other]!.properties.region === f.properties.region) === sameRegion;
          if (wanted) {
            if (!run.length) run.push(ring[k - 1]!);
            run.push(ring[k]!);
          } else flush();
        }
        flush();
      }
    }
  });
  return out;
}

// ─── Rivers: the main Iberian rivers only ────────────────────────────────────
const riverLines = rivers
  .filter((f) => f.properties.featurecla === "River" && Number(f.properties.scalerank) <= 6)
  .flatMap((f) => lines(f.geometry))
  .filter((l) => inBox(l, MAIN, 0));

const out = `// Generated by scripts/maintenance/build-outline.ts from Natural Earth 1:10m (public domain). Do not edit.
export const SPAIN_PATH = ${JSON.stringify(
  pathOf(
    mainland.map((r) => toPoints(r, project)),
    true,
  ),
)};
export const CANARY_PATH = ${JSON.stringify(
  pathOf(
    canaries.map((r) => toPoints(r, projectCanary)),
    true,
  ),
)};
export const NEIGHBOURS_PATH = ${JSON.stringify(
  pathOf(
    neighbours.map((r) => clipToFrame(toPoints(r, project))),
    true,
  ),
)};
export const REGION_BORDERS_PATH = ${JSON.stringify(pathOf(borders(false), false))};
export const PROVINCE_BORDERS_PATH = ${JSON.stringify(pathOf(borders(true), false))};
export const RIVERS_PATH = ${JSON.stringify(
  pathOf(
    riverLines.map((l) => toPoints(l, project)),
    false,
  ),
)};
`;
const target = path.join(process.cwd(), "src", "features", "home", "outline.generated.ts");
await writeFile(target, out);
console.log(`Escrito ${target} (${(out.length / 1024).toFixed(1)} KB)`);
