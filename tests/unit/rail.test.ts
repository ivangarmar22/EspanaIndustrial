import { describe, expect, it } from "vitest";
import { buildRail, buildTracks, trackKm, tracksToGeoJSON } from "@/pipeline/rail/build";
import { distanceToLineM, simplify, type LonLat } from "@/pipeline/rail/geometry";
import type { OsmResponse, SparqlRow } from "@/pipeline/rail/sources";

const WD = "http://www.wikidata.org/entity/";
const row = (r: Record<string, string>): SparqlRow =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { value: v }]));
// A straight east-west segment ~8.5 km long at 42.8° N (near Vitoria-Gasteiz).
const line = (lat: number) => [
  { lat, lon: -2.6 },
  { lat, lon: -2.5 },
];

const tracks: OsmResponse = {
  elements: [
    { type: "way", id: 1, tags: { railway: "abandoned", name: "Vía Verde del Vasco-Navarro" }, geometry: line(42.8) },
    { type: "way", id: 2, tags: { railway: "abandoned", highway: "track" }, geometry: line(42.7) },
    { type: "way", id: 3, tags: { railway: "disused" }, geometry: line(42.6) },
    { type: "way", id: 4, tags: { railway: "abandoned" }, geometry: line(42.5) },
  ],
};
const greenways: OsmResponse = {
  elements: [
    { type: "way", id: 1, tags: { highway: "cycleway", name: "Vía Verde del Vasco-Navarro" }, geometry: line(42.8) },
    {
      type: "relation",
      id: 9,
      tags: { route: "bicycle", name: "Plazaolako Bide Berdea" },
      members: [{ type: "way", ref: 5, role: "", geometry: line(42.9) }],
    },
  ],
};

describe("rail alignments", () => {
  const built = buildTracks(tracks, greenways);
  it("classifies each OSM way once, greenways first", () => {
    expect(built.map((t) => [t.kind, t.name])).toEqual([
      ["greenway", "Vía Verde del Vasco-Navarro"],
      ["greenway", "Plazaolako Bide Berdea"],
      ["trail", undefined],
      ["disused", undefined],
      ["abandoned", undefined],
    ]);
  });
  it("measures lengths per kind and writes compact GeoJSON", () => {
    expect(trackKm(built)).toEqual({ greenway: 16, trail: 8, abandoned: 8, disused: 8 });
    expect(tracksToGeoJSON(built).features[2]!.properties).toEqual({ k: "trail" });
  });
});

describe("closed stations", () => {
  const built = buildTracks(tracks, greenways);
  const rows = [
    row({
      s: `${WD}Q1`,
      sLabel: "estación de Ullíbarri",
      coord: "Point(-2.55 42.805)",
      state: `${WD}Q11639308`,
      line: `${WD}Q100`,
      lineLabel: "ferrocarril Vasco-Navarro",
      ine: "01059",
      mLabel: "Vitoria-Gasteiz",
      closed: "1967-12-31T00:00:00Z",
    }),
    row({
      s: `${WD}Q1`,
      sLabel: "estación de Ullíbarri",
      coord: "Point(-2.55 42.805)",
      state: `${WD}Q56556915`,
      line: `${WD}Q101`,
      lineLabel: "Línea Vitoria-Estella",
    }),
    row({ s: `${WD}Q2`, sLabel: "Estación sin coordenadas", state: `${WD}Q11639308` }),
    row({ s: `${WD}Q3`, sLabel: "Q3", coord: "Point(-3 40)", state: `${WD}Q11639308` }),
    row({
      s: `${WD}Q4`,
      sLabel: "Estación lejana",
      coord: "Point(-3.7 40.4)",
      state: `${WD}Q11639308`,
      line: `${WD}Q100`,
      lineLabel: "ferrocarril Vasco-Navarro",
    }),
  ];
  const lineRows = [row({ line: `${WD}Q100`, state: `${WD}Q11639308`, closing: "1967-12-31T00:00:00Z" })];
  const { stations, lines, skipped } = buildRail(rows, lineRows, built);

  it("merges rows per station, keeps the most specific status and derives the territory from the INE code", () => {
    const s = stations.find((x) => x.id === "Q1")!;
    expect(s.name).toBe("Estación de Ullíbarri");
    expect(s.status).toBe("demolished");
    expect(s.lines.map((l) => l.name)).toEqual(["Ferrocarril Vasco-Navarro", "Línea Vitoria-Estella"]);
    expect([s.provinceCode, s.regionCode, s.municipality, s.closedYear]).toEqual(["01", "16", "Vitoria-Gasteiz", 1967]);
  });
  it("finds the nearest greenway and the station's own trackbed", () => {
    const s = stations.find((x) => x.id === "Q1")!;
    expect(s.greenway?.name).toBe("Vía Verde del Vasco-Navarro");
    expect(s.greenway!.distanceM).toBeGreaterThan(500);
    expect(s.greenway!.distanceM).toBeLessThan(600);
    expect(s.trackbedM).toBeUndefined(); // > 300 m from any alignment
    expect(stations.find((x) => x.id === "Q4")!.greenway).toBeUndefined();
  });
  it("skips stations without coordinates or label instead of guessing", () => {
    expect(stations.map((s) => s.id)).toEqual(["Q1", "Q4"]);
    expect(skipped).toEqual({ withoutCoordinates: 1, withoutLabel: 1 });
  });
  it("aggregates lines with their Wikidata state", () => {
    const vn = lines.find((l) => l.id === "Q100")!;
    expect(vn).toMatchObject({ slug: "ferrocarril-vasco-navarro", state: "closed", closedYear: 1967, stationCount: 2 });
    expect(vn.greenways).toEqual(["Vía Verde del Vasco-Navarro"]);
    expect(lines.find((l) => l.id === "Q101")!.state).toBe("unknown");
  });
});

describe("geometry", () => {
  it("measures point-to-line distances in metres", () => {
    const seg: LonLat[] = [
      [-3, 40],
      [-2.9, 40],
    ];
    expect(distanceToLineM([-2.95, 40.01], seg)).toBeCloseTo(1106, -1);
    expect(distanceToLineM([-3.1, 40], seg)).toBeCloseTo(8528, -2);
  });
  it("simplifies collinear points and keeps both ends", () => {
    const pts: LonLat[] = [
      [0, 0],
      [1, 0.00001],
      [2, 0],
      [3, 1],
    ];
    expect(simplify(pts, 0.001)).toEqual([
      [0, 0],
      [2, 0],
      [3, 1],
    ]);
  });
});
