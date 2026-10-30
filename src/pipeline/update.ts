/**
 * Orchestration of `npm run data:update`:
 * fetch → stage → build → validate → diff → report → publish (atomic).
 */
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { Decisions, Registry, RecordOverride, emptyDecisions } from "@/domain/editorial";
import { Catalog, HeritageRecord } from "@/domain/schema";
import { buildCatalog, type BuildIssue } from "./build";
import type { Connector, ConnectorOptions, ConnectorOutcome } from "./connector";
import { diffCatalogs, type CatalogDiff } from "./diff";
import { findDuplicateCandidates, type DuplicateCandidate } from "./duplicates";
import { readJson, sha256, withDataLock, writeFileAtomic, writeJsonAtomic } from "./fs";
import { HttpClient } from "./http";
import { paths } from "./paths";
import { cartociudad } from "./sources/cartociudad";
import { commons } from "./sources/commons";
import { ministerioCultura } from "./sources/ministerio-cultura";
import { wikidata } from "./sources/wikidata";
import type { CartoCiudadStaging, CommonsStaging, McStaging, StagingFile, WikidataStaging } from "./staging";

/** Execution order matters: enrichers read the staging of earlier connectors. */
export const CONNECTORS: Connector[] = [ministerioCultura, cartociudad, wikidata, commons];

export interface UpdateOptions extends ConnectorOptions {
  /** Skip network fetches and rebuild from existing staging files. */
  noFetch?: boolean;
  /** Only refresh staging files; do not build or publish. */
  fetchOnly?: boolean;
  /** Restrict fetching to these connector ids. */
  only?: string[];
  /** Publish even if the diff contains changes that need review (explicit human approval). */
  approve?: boolean;
  log?: (msg: string) => void;
}

export interface UpdateReport {
  startedAt: string;
  finishedAt: string;
  outcome: "published" | "pending-review" | "no-changes" | "failed";
  message: string;
  connectors: ConnectorOutcome[];
  diff?: CatalogDiff;
  issues: BuildIssue[];
  duplicates: DuplicateCandidate[];
  counts?: { records: number; published: number };
}

const mediaPathFor = (file: string): string | undefined => {
  const base = sha256(file).slice(0, 16);
  for (const ext of ["jpg", "png", "webp"]) {
    if (existsSync(path.join(paths.mediaDir(), "commons", `${base}.${ext}`))) return `/media/commons/${base}.${ext}`;
  }
  return undefined;
};

export async function loadEditorialLayer() {
  const registry = Registry.parse((await readJson(paths.registry())) ?? { nextNumber: 1, entries: {} });
  const decisions = Decisions.parse((await readJson(paths.decisions())) ?? emptyDecisions());
  const overrides = new Map<string, RecordOverride>();
  const dir = paths.overridesDir();
  if (existsSync(dir)) {
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      const ov = RecordOverride.parse(await readJson(path.join(dir, file)));
      overrides.set(ov.recordId, ov);
    }
  }
  return { registry, decisions, overrides };
}

export async function loadPublishedCatalog(): Promise<Catalog | undefined> {
  const raw = await readJson(paths.catalog());
  return raw ? Catalog.parse(raw) : undefined;
}

/** Keeps records whose source element disappeared, flagged for review instead of deleted. */
function carryOverMissing(
  built: HeritageRecord[],
  previous: HeritageRecord[],
  checkedAt: string,
  issues: BuildIssue[],
): HeritageRecord[] {
  const ids = new Set(built.map((r) => r.id));
  const carried = previous
    .filter((r) => !ids.has(r.id))
    .map((r) => {
      issues.push({
        level: "warning",
        recordId: r.id,
        message: `«${r.name.value}» ya no figura en la fuente; se conserva hasta que se decida retirarlo en data/review/decisions.json`,
      });
      const note = `El elemento ya no aparece en el mapa del IPCE consultado el ${checkedAt.slice(0, 10)}.`;
      const discrepancies = (r.discrepancies ?? []).filter((d) => d.field !== "source");
      return HeritageRecord.parse({
        ...r,
        discrepancies: [...discrepancies, { field: "source", note, status: "open" }],
      });
    });
  return [...built, ...carried].sort((a, b) => a.id.localeCompare(b.id));
}

function reportMarkdown(r: UpdateReport): string {
  const lines = [
    `# Informe de actualización de datos`,
    "",
    `- Inicio: ${r.startedAt}`,
    `- Fin: ${r.finishedAt}`,
    `- Resultado: **${r.outcome}** — ${r.message}`,
    "",
  ];
  lines.push("## Fuentes", "", "| Fuente | Estado | Detalle |", "|---|---|---|");
  for (const c of r.connectors)
    lines.push(`| ${c.sourceId} | ${c.status} | ${(c.message ?? "").replace(/\|/g, "/")} |`);
  if (r.counts) lines.push("", `Registros: ${r.counts.records} (publicados: ${r.counts.published})`);
  if (r.diff) {
    lines.push(
      "",
      "## Cambios",
      "",
      `Altas: ${r.diff.added.length} · Bajas: ${r.diff.removed.length} · Modificaciones: ${r.diff.modified.length}`,
    );
    for (const m of r.diff.modified.filter((x) => x.important.length).slice(0, 200))
      lines.push(`- ${m.id} ${m.name}: ${m.important.join("; ")}`);
  }
  const errors = r.issues.filter((i) => i.level === "error");
  const warnings = r.issues.filter((i) => i.level === "warning");
  if (errors.length)
    lines.push(
      "",
      "## Errores de validación",
      "",
      ...errors.map((i) => `- ${i.recordId ?? i.code ?? ""}: ${i.message}`),
    );
  if (warnings.length)
    lines.push("", "## Avisos", "", ...warnings.map((i) => `- ${i.recordId ?? i.code ?? ""}: ${i.message}`));
  if (r.duplicates.length)
    lines.push(
      "",
      "## Posibles duplicados (revisión manual)",
      "",
      ...r.duplicates.map((d) => `- ${d.a.id} «${d.a.name}» ↔ ${d.b.id} «${d.b.name}»: ${d.reasons.join("; ")}`),
    );
  const connectorWarnings = r.connectors.flatMap((c) => c.warnings.map((w) => `- ${c.sourceId}: ${w}`));
  if (connectorWarnings.length) lines.push("", "## Avisos de extracción", "", ...connectorWarnings);
  return `${lines.join("\n")}\n`;
}

async function writeReport(report: UpdateReport) {
  await writeJsonAtomic(path.join(paths.reportsDir(), "latest.json"), report);
  await writeFileAtomic(path.join(paths.reportsDir(), "latest.md"), reportMarkdown(report));
  await writeJsonAtomic(
    path.join(paths.reportsDir(), "history", `${report.startedAt.replace(/[:.]/g, "-")}.json`),
    report,
  );
}

interface PublishInputs {
  catalog: Catalog;
  registry: Registry;
}

/** Atomically publishes a validated catalogue together with the registry and manifest. */
async function publishCatalog({ catalog, registry }: PublishInputs, connectors: ConnectorOutcome[] = []) {
  const json = `${JSON.stringify(catalog, null, 2)}\n`;
  await writeFileAtomic(paths.catalog(), json);
  await writeJsonAtomic(paths.registry(), registry);
  await rm(paths.pendingCatalog(), { force: true });
  const stagingInfo: Record<string, { retrievedAt?: string; contentHash?: string; lastStatus?: string }> = {};
  for (const c of CONNECTORS) {
    const s = await readJson<StagingFile<unknown>>(paths.staging(c.id));
    stagingInfo[c.id] = {
      retrievedAt: s?.retrievedAt,
      contentHash: s?.contentHash,
      lastStatus: connectors.find((o) => o.sourceId === c.id)?.status,
    };
  }
  await writeJsonAtomic(paths.manifest(), {
    schemaVersion: catalog.schemaVersion,
    generatedAt: catalog.generatedAt,
    records: catalog.records.length,
    published: catalog.records.filter((r) => r.editorial.published).length,
    catalogSha256: sha256(json),
    sources: stagingInfo,
  });
}

export async function runUpdate(opts: UpdateOptions = {}): Promise<UpdateReport> {
  const log = opts.log ?? (() => {});
  return withDataLock(async () => {
    const startedAt = new Date().toISOString();
    const connectors: ConnectorOutcome[] = [];
    const http = new HttpClient({ minIntervalMs: 1100 });

    if (!opts.noFetch) {
      for (const connector of CONNECTORS) {
        if (opts.only && !opts.only.includes(connector.id)) continue;
        log(`→ ${connector.id}`);
        try {
          const outcome = await connector.run({ http, options: opts, log });
          connectors.push(outcome);
          log(`  ${outcome.status}${outcome.message ? `: ${outcome.message}` : ""}`);
        } catch (err) {
          connectors.push({
            sourceId: connector.id,
            status: "rejected",
            message: `Error inesperado: ${(err as Error).message}`,
            warnings: [],
          });
          log(`  error: ${(err as Error).message}`);
        }
      }
    }

    const ministerio = await readJson<StagingFile<McStaging>>(paths.staging("ministerio-cultura"));
    const finish = async (outcome: UpdateReport["outcome"], message: string, extra: Partial<UpdateReport> = {}) => {
      const report: UpdateReport = {
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome,
        message,
        connectors,
        issues: [],
        duplicates: [],
        ...extra,
      };
      await writeReport(report);
      return report;
    };
    if (opts.fetchOnly) return finish("no-changes", "Solo descarga: staging actualizado, catálogo sin tocar.");
    if (!ministerio)
      return finish(
        "failed",
        "No existe staging del Ministerio: la fuente principal nunca se ha importado correctamente.",
      );

    const { registry, decisions, overrides } = await loadEditorialLayer();
    const published = await loadPublishedCatalog();
    const previousRecords = published?.records ?? [];
    const now = new Date().toISOString();

    const result = buildCatalog({
      ministerio,
      cartociudad: await readJson<StagingFile<CartoCiudadStaging>>(paths.staging("cartociudad")),
      wikidata: await readJson<StagingFile<WikidataStaging>>(paths.staging("wikidata")),
      commons: await readJson<StagingFile<CommonsStaging>>(paths.staging("wikimedia-commons")),
      registry,
      decisions,
      overrides,
      previous: new Map(previousRecords.map((r) => [r.id, r])),
      mediaPathFor,
      now,
    });
    const issues = result.issues;
    const records = carryOverMissing(result.records, previousRecords, ministerio.retrievedAt, issues);
    const duplicates = findDuplicateCandidates(records, decisions);
    const counts = { records: records.length, published: records.filter((r) => r.editorial.published).length };

    if (issues.some((i) => i.level === "error")) {
      return finish("failed", "Hay registros que no cumplen el esquema; no se publica nada.", {
        issues,
        duplicates,
        counts,
      });
    }

    const catalog = Catalog.parse({ schemaVersion: 1, generatedAt: now, records });
    const diff = diffCatalogs(previousRecords, records);
    const nothingChanged = published && !diff.added.length && !diff.removed.length && !diff.modified.length;
    if (nothingChanged)
      return finish("no-changes", "El catálogo publicado ya está al día.", { diff, issues, duplicates, counts });

    if (diff.requiresReview && !opts.approve) {
      await writeJsonAtomic(paths.pendingCatalog(), { catalog, registry: result.registry });
      return finish(
        "pending-review",
        "Hay cambios importantes: revísalos con npm run data:diff y ejecuta de nuevo con --approve.",
        { diff, issues, duplicates, counts },
      );
    }

    await publishCatalog({ catalog, registry: result.registry }, connectors);
    return finish("published", `${counts.published} registros publicados.`, { diff, issues, duplicates, counts });
  });
}
