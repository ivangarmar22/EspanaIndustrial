/**
 * Downloads for the railway dataset: closed stations and their lines from the
 * Wikidata Query Service (CC0), and former alignments and greenways from the
 * Overpass API (OpenStreetMap, ODbL).
 */
import { STATION_STATUS } from "@/domain/rail";
import { type HttpClient, SourceUnavailableError } from "../http";

export type SparqlRow = Record<string, { value: string } | undefined>;
interface SparqlResponse {
  results: { bindings: SparqlRow[] };
}

export interface OsmElement {
  type: "way" | "relation" | "node";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{ type: string; ref: number; role: string; geometry?: Array<{ lat: number; lon: number }> }>;
}
export interface OsmResponse {
  osm3s?: { timestamp_osm_base?: string };
  elements: OsmElement[];
}

const SPARQL = "https://query.wikidata.org/sparql";
/** Public Overpass instances, tried in order: the main one is often at capacity. */
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const sparql = (http: HttpClient, query: string) =>
  http
    .getJson<SparqlResponse>(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`, {
      accept: "application/sparql-results+json",
    })
    .then((r) => r.results.bindings);

export function fetchStationRows(http: HttpClient): Promise<SparqlRow[]> {
  const states = Object.values(STATION_STATUS)
    .map((s) => `wd:${s.qid}`)
    .join(" ");
  return sparql(
    http,
    `SELECT ?s ?sLabel ?coord ?state ?line ?lineLabel ?closed ?opened ?image ?ine ?mLabel WHERE {
  VALUES ?state { ${states} }
  ?s wdt:P17 wd:Q29; wdt:P5817 ?state; wdt:P31/wdt:P279* wd:Q55488 .
  FILTER NOT EXISTS { ?s wdt:P31 wd:Q928830 }  # metro stations are not part of the railway network
  OPTIONAL { ?s wdt:P625 ?coord }
  OPTIONAL { ?s wdt:P81 ?line }
  OPTIONAL { ?s wdt:P3999 ?closed }
  OPTIONAL { ?s wdt:P1619 ?opened }
  OPTIONAL { ?s wdt:P18 ?image }
  OPTIONAL { ?s wdt:P131 ?m . ?m wdt:P772 ?ine }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,ca,eu,gl,en". }
}`,
  );
}

export function fetchLineRows(http: HttpClient, lineIds: string[]): Promise<SparqlRow[]> {
  if (!lineIds.length) return Promise.resolve([]);
  return sparql(
    http,
    `SELECT ?line ?state ?dissolved ?closing WHERE {
  VALUES ?line { ${lineIds.map((id) => `wd:${id}`).join(" ")} }
  OPTIONAL { ?line wdt:P5817 ?state }
  OPTIONAL { ?line wdt:P576 ?dissolved }
  OPTIONAL { ?line wdt:P3999 ?closing }
}`,
  );
}

const OSM_QUERIES = {
  tracks: `way["railway"~"^(abandoned|disused)$"](area.es);`,
  greenways: `(relation["route"]["name"~"^V[ií]a Verde",i](area.es);way["highway"]["name"~"^V[ií]a Verde",i](area.es););`,
};

export async function fetchOsm(http: HttpClient, which: keyof typeof OSM_QUERIES): Promise<OsmResponse> {
  const query = `[out:json][timeout:300];area["ISO3166-1"="ES"][admin_level=2]->.es;${OSM_QUERIES[which]}out geom tags;`;
  let lastError: unknown;
  for (const endpoint of OVERPASS) {
    try {
      const res = await http.getJson<OsmResponse>(`${endpoint}?data=${encodeURIComponent(query)}`, {
        minBytes: 10_000,
      });
      if (!Array.isArray(res.elements) || !res.elements.length)
        throw new SourceUnavailableError("Empty result", endpoint);
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
