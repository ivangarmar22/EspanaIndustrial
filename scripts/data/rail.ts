/**
 * npm run data:rail — builds the railway dataset (closed stations, former
 * alignments and greenways). Downloads go to data/snapshots/rail (not
 * versioned); `--offline` rebuilds from those snapshots without network and
 * `--keep-osm` refreshes Wikidata but reuses the last (slow) Overpass download.
 *
 * Outputs: data/rail/rail.json (stations and lines, read by the site) and
 * public/data/rail-tracks.geojson (alignments, loaded by the map on demand).
 * Both are ODbL because they derive from OpenStreetMap.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { RailDataset } from "@/domain/rail";
import { HttpClient } from "@/pipeline/http";
import { readJson, writeFileAtomic, writeJsonAtomic } from "@/pipeline/fs";
import { paths } from "@/pipeline/paths";
import { buildRail, buildTracks, trackKm, tracksToGeoJSON } from "@/pipeline/rail/build";
import { fetchLineRows, fetchOsm, fetchStationRows, type OsmResponse, type SparqlRow } from "@/pipeline/rail/sources";

const offline = process.argv.includes("--offline");
const keepOsm = process.argv.includes("--keep-osm");
const dir = paths.snapshots("rail");
await mkdir(dir, { recursive: true });

interface Snapshot<T> {
  fetchedAt: string;
  data: T;
}

async function cached<T>(name: string, fetcher: () => Promise<T>, reuse = offline): Promise<Snapshot<T>> {
  const file = path.join(dir, `${name}.json`);
  if (reuse) {
    const snap = await readJson<Snapshot<T>>(file);
    if (!snap) throw new Error(`Falta ${file}: ejecuta npm run data:rail sin --offline.`);
    return snap;
  }
  console.log(`Descargando ${name}…`);
  const snap = { fetchedAt: new Date().toISOString(), data: await fetcher() };
  await writeJsonAtomic(file, snap);
  return snap;
}

const http = new HttpClient({ minIntervalMs: 2000, retries: 2, timeoutMs: 330_000 });
const stationRows = await cached<SparqlRow[]>("wikidata-stations", () => fetchStationRows(http));
const lineIds = [...new Set(stationRows.data.flatMap((r) => r.line?.value.split("/").pop() ?? []))];
const lineRows = await cached<SparqlRow[]>("wikidata-lines", () => fetchLineRows(http, lineIds));
const osmTracks = await cached<OsmResponse>("osm-tracks", () => fetchOsm(http, "tracks"), offline || keepOsm);
const osmGreenways = await cached<OsmResponse>("osm-greenways", () => fetchOsm(http, "greenways"), offline || keepOsm);

const tracks = buildTracks(osmTracks.data, osmGreenways.data);
const { stations, lines, skipped } = buildRail(stationRows.data, lineRows.data, tracks);

const dataset = RailDataset.parse({
  generatedAt: new Date().toISOString(),
  license: "ODbL-1.0",
  sources: [
    {
      id: "wikidata",
      name: "Wikidata (estaciones y líneas)",
      url: "https://www.wikidata.org/",
      license: "CC0 1.0",
      fetchedAt: stationRows.fetchedAt,
    },
    {
      id: "openstreetmap",
      name: "OpenStreetMap (trazados abandonados y Vías Verdes, vía Overpass API)",
      url: "https://www.openstreetmap.org/copyright",
      license: "ODbL 1.0",
      fetchedAt: osmTracks.fetchedAt,
    },
  ],
  stats: {
    stations: stations.length,
    stationsWithoutCoordinates: skipped.withoutCoordinates,
    lines: lines.length,
    trackKm: trackKm(tracks),
  },
  stations,
  lines,
});

await writeJsonAtomic(paths.rail(), dataset);
await writeFileAtomic(paths.railTracks(), JSON.stringify(tracksToGeoJSON(tracks)));

console.log(
  `Estaciones: ${stations.length} (sin coordenadas: ${skipped.withoutCoordinates}, sin nombre: ${skipped.withoutLabel}) · líneas: ${lines.length}`,
);
console.log(`Trazados (km): ${JSON.stringify(dataset.stats.trackKm)} · tramos: ${tracks.length}`);
