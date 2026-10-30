/**
 * Wikidata enrichment. Wikidata never creates records: it is matched against
 * IPCE elements by proximity + name similarity and, when accepted, contributes
 * identifiers, an inception date, heritage status and an image (secondary,
 * collaborative source).
 *
 * Matching policy (docs/research/data-acquisition-plan.md):
 * - auto:      distance ≤ 500 m and name similarity ≥ 0.6
 * - candidate: distance ≤ 2 km and similarity ≥ 0.35 → manual review
 */
import type { Point } from "@/domain/schema";
import { nameSimilarity } from "@/lib/text";
import type { Connector, ConnectorContext, ConnectorOutcome } from "../connector";
import { readJson, sha256, writeJsonAtomic } from "../fs";
import { InvalidResponseError, SourceUnavailableError } from "../http";
import { paths } from "../paths";
import { Decisions, emptyDecisions } from "@/domain/editorial";
import type {
  McItem,
  McStaging,
  StagingFile,
  WikidataCandidate,
  WikidataEntity,
  WikidataMatch,
  WikidataStaging,
} from "../staging";
import { pointKey } from "./cartociudad";

const SOURCE_ID = "wikidata";
const SPARQL = "https://query.wikidata.org/sparql";
const API = "https://www.wikidata.org/w/api.php";
const SEARCH_RADIUS_KM = 2;

const AUTO_MAX_DISTANCE_M = 500;
const AUTO_MIN_SIMILARITY = 0.6;
const CANDIDATE_MAX_DISTANCE_M = 2000;
const CANDIDATE_MIN_SIMILARITY = 0.35;

function namesForMatching(item: McItem): string[] {
  const names = new Set<string>();
  const f = item.ficha?.fields;
  if (f?.officialName) names.add(f.officialName);
  f?.otherNames?.forEach((n) => names.add(n));
  for (const p of item.points) {
    if (p.nameLine) names.add(p.nameLine);
    if (p.mapLabel) names.add(p.mapLabel);
    if (!p.nameLine && p.placeText) names.add(p.placeText);
  }
  return [...names];
}

export function decideMatch(
  names: string[],
  raw: Array<{ qid: string; label: string; distanceM: number }>,
): Omit<WikidataMatch, "queriedPoint"> {
  const candidates: WikidataCandidate[] = raw
    .map((c) => ({ ...c, similarity: Math.max(0, ...names.map((n) => nameSimilarity(n, c.label))) }))
    .map((c) => ({ ...c, similarity: Math.round(c.similarity * 100) / 100, distanceM: Math.round(c.distanceM) }))
    .filter((c) => c.distanceM <= CANDIDATE_MAX_DISTANCE_M && c.similarity >= CANDIDATE_MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity || a.distanceM - b.distanceM)
    .slice(0, 5);
  const best = candidates[0];
  if (!best) return { decision: "none", candidates: [] };
  const runnerUp = candidates[1];
  const isAuto =
    best.distanceM <= AUTO_MAX_DISTANCE_M &&
    best.similarity >= AUTO_MIN_SIMILARITY &&
    // Two near-identical candidates are ambiguous: let a human choose.
    !(runnerUp && runnerUp.similarity >= best.similarity - 0.05 && runnerUp.distanceM <= AUTO_MAX_DISTANCE_M);
  return { decision: isAuto ? "auto" : "candidate", qid: best.qid, candidates };
}

interface SparqlResponse {
  results: { bindings: Array<Record<string, { value: string } | undefined>> };
}

async function nearby(ctx: ConnectorContext, point: Point) {
  const query = `SELECT ?item ?itemLabel ?dist WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${point.lon} ${point.lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${SEARCH_RADIUS_KM}" .
    bd:serviceParam wikibase:distance ?dist .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,ca,eu,gl,en". }
} ORDER BY ?dist LIMIT 60`;
  const res = await ctx.http.getJson<SparqlResponse>(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`, {
    accept: "application/sparql-results+json",
  });
  return res.results.bindings.flatMap((b) => {
    const qid = b.item?.value.split("/").pop();
    const label = b.itemLabel?.value;
    const dist = Number(b.dist?.value);
    // Unlabelled items come back with the Q-id as label: useless for name matching.
    return qid && label && label !== qid && Number.isFinite(dist) ? [{ qid, label, distanceM: dist * 1000 }] : [];
  });
}

type Claims = Record<string, Array<{ mainsnak: { datavalue?: { value: unknown } } }>>;

const claimValues = (claims: Claims, prop: string) =>
  (claims[prop] ?? []).map((c) => c.mainsnak.datavalue?.value).filter((v) => v !== undefined);

function parseEntity(qid: string, entity: Record<string, unknown>, retrievedAt: string): WikidataEntity {
  const claims = (entity.claims ?? {}) as Claims;
  const labels = entity.labels as Record<string, { value: string }> | undefined;
  const descriptions = entity.descriptions as Record<string, { value: string }> | undefined;
  const sitelinks = entity.sitelinks as Record<string, { title: string }> | undefined;
  const str = (p: string) => claimValues(claims, p).find((v): v is string => typeof v === "string");
  const coord = claimValues(claims, "P625")[0] as { latitude: number; longitude: number } | undefined;
  const inception = claimValues(claims, "P571")[0] as { time: string; precision: number } | undefined;

  const out: WikidataEntity = {
    qid,
    heritageStatus: claimValues(claims, "P1435").map((v) => (v as { id: string }).id),
    retrievedAt,
  };
  const label = labels?.es?.value ?? labels?.ca?.value ?? labels?.en?.value;
  if (label) out.label = label;
  if (descriptions?.es?.value) out.description = descriptions.es.value;
  if (coord) out.point = { lat: coord.latitude, lon: coord.longitude };
  if (inception) out.inception = { time: inception.time, precision: inception.precision };
  const bic = str("P808"),
    iaph = str("P3318"),
    ipac = str("P1600"),
    igpcv = str("P2473"),
    image = str("P18");
  if (bic) out.bic = bic;
  if (iaph) out.iaph = iaph;
  if (ipac) out.ipac = ipac;
  if (igpcv) out.igpcv = igpcv;
  if (image) out.image = image;
  if (sitelinks?.eswiki?.title) out.eswiki = sitelinks.eswiki.title;
  return out;
}

async function fetchEntities(ctx: ConnectorContext, qids: string[]): Promise<Map<string, WikidataEntity>> {
  const out = new Map<string, WikidataEntity>();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url = `${API}?action=wbgetentities&format=json&props=labels|descriptions|claims|sitelinks&languages=es|ca|en&sitefilter=eswiki&ids=${batch.join("|")}`;
    const res = await ctx.http.getJson<{ entities: Record<string, Record<string, unknown>> }>(url);
    const now = new Date().toISOString();
    for (const qid of batch) if (res.entities[qid]) out.set(qid, parseEntity(qid, res.entities[qid], now));
  }
  return out;
}

async function run(ctx: ConnectorContext): Promise<ConnectorOutcome> {
  const warnings: string[] = [];
  const mc = await readJson<StagingFile<McStaging>>(paths.staging("ministerio-cultura"));
  if (!mc)
    return { sourceId: SOURCE_ID, status: "unavailable", message: "No hay staging del Ministerio todavía", warnings };
  if (ctx.options.offline) return { sourceId: SOURCE_ID, status: "unchanged", message: "offline", warnings };

  const file = paths.staging(SOURCE_ID);
  const previous = await readJson<StagingFile<WikidataStaging>>(file);
  const matches: WikidataStaging = {};
  let queried = 0;
  let failures = 0;

  for (const item of mc.data.items) {
    const point = item.points[0]!.point;
    const key = pointKey(point);
    const cached = previous?.data[item.code];
    if (cached && cached.queriedPoint === key && !ctx.options.refresh) {
      matches[item.code] = cached;
      continue;
    }
    try {
      const raw = await nearby(ctx, point);
      matches[item.code] = { queriedPoint: key, ...decideMatch(namesForMatching(item), raw) };
      queried++;
    } catch (err) {
      if (!(err instanceof SourceUnavailableError || err instanceof InvalidResponseError)) throw err;
      failures++;
      warnings.push(`Wikidata ${item.code}: ${err.message}`);
      if (cached) matches[item.code] = cached;
      if (failures >= 5 && queried === 0) {
        return { sourceId: SOURCE_ID, status: "unavailable", message: "WDQS no responde", warnings };
      }
    }
  }

  // Refresh entity data for every match that may be used: the best candidate and,
  // when the editor accepted another candidate, that one too.
  const decisions = Decisions.parse((await readJson(paths.decisions())) ?? emptyDecisions());
  const acceptedOther = (code: string) => {
    const d = decisions.wikidata[code];
    return d?.action === "accept" && d.qid !== matches[code]?.qid ? d.qid : undefined;
  };
  const qids = [
    ...new Set(
      Object.entries(matches).flatMap(([code, m]) => [m.qid, acceptedOther(code)].filter((q): q is string => !!q)),
    ),
  ];
  try {
    const entities = await fetchEntities(ctx, qids);
    for (const [code, m] of Object.entries(matches)) {
      if (m.qid && entities.has(m.qid)) m.entity = entities.get(m.qid);
      const other = acceptedOther(code);
      if (other && entities.has(other)) m.acceptedEntity = entities.get(other);
      else delete m.acceptedEntity;
    }
  } catch (err) {
    if (!(err instanceof SourceUnavailableError || err instanceof InvalidResponseError)) throw err;
    warnings.push(`Wikidata API: ${err.message}; se conservan los datos de entidad anteriores`);
  }

  const contentHash = sha256(JSON.stringify(matches, (k, v) => (k === "retrievedAt" ? undefined : v)));
  if (previous && previous.contentHash === contentHash) return { sourceId: SOURCE_ID, status: "unchanged", warnings };
  await writeJsonAtomic(file, {
    sourceId: SOURCE_ID,
    retrievedAt: new Date().toISOString(),
    contentHash,
    data: matches,
  });
  const counts = Object.values(matches).reduce<Record<string, number>>(
    (acc, m) => ({ ...acc, [m.decision]: (acc[m.decision] ?? 0) + 1 }),
    {},
  );
  return {
    sourceId: SOURCE_ID,
    status: "updated",
    message: `auto ${counts.auto ?? 0}, candidatos ${counts.candidate ?? 0}, sin coincidencia ${counts.none ?? 0}`,
    warnings,
  };
}

export const wikidata: Connector = { id: SOURCE_ID, run };
