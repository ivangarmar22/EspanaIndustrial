import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import type { Connector, ConnectorContext, ConnectorOutcome } from "../../connector";
import { exists, readJson, sha256, writeFileAtomic, writeJsonAtomic } from "../../fs";
import { InvalidResponseError, SourceUnavailableError } from "../../http";
import { paths } from "../../paths";
import type { McFicha, McItem, McStaging, StagingFile } from "../../staging";
import { parseFicha } from "./ficha";
import { LEGEND_FOLDER, parseKml, parsePlacemark, type McPoint } from "./kml";

import { KML_URL, SOURCE_ID, printedCode } from "./constants";

const PDF_MAX_AGE_DAYS = 30;
/** Bump when kml.ts / ficha.ts change, so unchanged sources are re-staged with the new rules. */
const PARSER_VERSION = "4";
/** A KML with far fewer elements than last time is treated as a broken response, not as mass removal. */
const MIN_ITEM_RATIO = 0.8;

const driveDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const doc = await getDocumentProxy(bytes);
  const { text } = await extractText(doc, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}

async function loadFicha(
  ctx: ConnectorContext,
  driveFileId: string,
  previous: McFicha | undefined,
  warnings: string[],
): Promise<McFicha | undefined> {
  const dir = path.join(paths.snapshots(SOURCE_ID), "pdf");
  const pdfFile = path.join(dir, `${driveFileId}.pdf`);
  let bytes: Uint8Array | undefined;
  let retrievedAt: string | undefined;

  if (await exists(pdfFile)) {
    const info = await stat(pdfFile);
    const ageDays = (Date.now() - info.mtimeMs) / 86_400_000;
    if (ctx.options.offline || (!ctx.options.refresh && ageDays < PDF_MAX_AGE_DAYS)) {
      bytes = new Uint8Array(await readFile(pdfFile));
      retrievedAt = previous?.driveFileId === driveFileId ? previous.retrievedAt : info.mtime.toISOString();
    }
  }

  if (!bytes && !ctx.options.offline) {
    try {
      const res = await ctx.http.getBytes(driveDownloadUrl(driveFileId), { minBytes: 10_000 });
      if (new TextDecoder().decode(res.body.slice(0, 5)) !== "%PDF-") {
        throw new InvalidResponseError("Downloaded file is not a PDF", driveDownloadUrl(driveFileId));
      }
      bytes = res.body;
      retrievedAt = new Date().toISOString();
      await writeFileAtomic(pdfFile, bytes);
    } catch (err) {
      warnings.push(`Ficha ${driveFileId}: no descargada (${(err as Error).message})`);
    }
  }

  if (!bytes) return previous ? { ...previous, stale: true } : undefined;

  const pages = await pdfPages(bytes);
  await writeFileAtomic(path.join(dir, `${driveFileId}.txt`), pages.join("\n\f\n"));
  return {
    driveFileId,
    url: `https://drive.google.com/file/d/${driveFileId}/view`,
    sha256: sha256(bytes),
    retrievedAt: retrievedAt!,
    fields: parseFicha(pages),
  };
}

/**
 * Groups points by element. Sub-points of one element share a ficha (CAT-05-A/B);
 * points that reuse a code but link *different* fichas are different assets
 * (the map labels both Cal Miralda and the Pinell de Brai winery "CAT-07"), so
 * each extra ficha becomes its own element: "CAT-07", "CAT-07/2"…
 */
export function groupPoints(points: McPoint[]): Map<string, McPoint[]> {
  const byCode = new Map<string, McPoint[]>();
  for (const p of points) byCode.set(p.code, [...(byCode.get(p.code) ?? []), p]);
  const groups = new Map<string, McPoint[]>();
  for (const [code, pts] of byCode) {
    const fichas = [...new Set(pts.map((p) => p.driveFileId).filter((x): x is string => !!x))];
    fichas.forEach((id, i) => {
      const own = pts.filter((p) => p.driveFileId === id || (i === 0 && !p.driveFileId));
      groups.set(i === 0 ? code : `${code}/${i + 1}`, own);
    });
    if (!fichas.length) groups.set(code, pts);
  }
  for (const list of groups.values()) list.sort((a, b) => (a.part ?? "").localeCompare(b.part ?? ""));
  return groups;
}

async function run(ctx: ConnectorContext): Promise<ConnectorOutcome> {
  const warnings: string[] = [];
  const stagingFile = paths.staging(SOURCE_ID);
  const previous = await readJson<StagingFile<McStaging>>(stagingFile);
  const kmlSnapshot = path.join(paths.snapshots(SOURCE_ID), "map.kml");

  let kml: string;
  try {
    if (ctx.options.offline) {
      if (!(await exists(kmlSnapshot)))
        return { sourceId: SOURCE_ID, status: "unavailable", message: "No cached KML (offline mode)", warnings };
      kml = await readFile(kmlSnapshot, "utf8");
    } else {
      kml = await ctx.http.getText(KML_URL, { minBytes: 50_000, expectContentType: /xml|kml/ });
      await writeFileAtomic(kmlSnapshot, kml);
    }
  } catch (err) {
    if (err instanceof SourceUnavailableError || err instanceof InvalidResponseError) {
      return { sourceId: SOURCE_ID, status: "unavailable", message: err.message, warnings };
    }
    throw err;
  }

  let placemarks;
  try {
    placemarks = parseKml(kml).filter((p) => p.folder !== LEGEND_FOLDER);
  } catch (err) {
    return { sourceId: SOURCE_ID, status: "rejected", message: (err as Error).message, warnings };
  }

  const points: McPoint[] = [];
  for (const pm of placemarks) {
    const parsed = parsePlacemark(pm);
    if ("error" in parsed) warnings.push(`Marcador no interpretado (${parsed.error}): ${parsed.raw}`);
    else points.push(parsed);
  }
  const groups = groupPoints(points);

  const previousCount = previous?.data.items.length ?? 0;
  if (previousCount > 0 && groups.size < previousCount * MIN_ITEM_RATIO) {
    return {
      sourceId: SOURCE_ID,
      status: "rejected",
      message: `KML has ${groups.size} elements vs ${previousCount} previously; refusing to stage a probably incomplete response`,
      warnings,
    };
  }

  const previousByCode = new Map(previous?.data.items.map((i) => [i.code, i]));
  const items: McItem[] = [];
  let index = 0;
  for (const [code, pts] of groups) {
    index++;
    if (code.includes("/"))
      warnings.push(
        `${printedCode(code)}: el mapa usa el mismo código para bienes con fichas distintas; se separan como ${code}`,
      );
    const driveFileId = pts.find((p) => p.driveFileId)?.driveFileId;
    let ficha: McFicha | undefined;
    if (driveFileId) {
      ctx.log(`  [${index}/${groups.size}] ${code} ficha ${driveFileId}`);
      ficha = await loadFicha(ctx, driveFileId, previousByCode.get(code)?.ficha, warnings);
    }
    items.push({ code, points: pts, ...(ficha ? { ficha } : {}) });
  }
  items.sort((a, b) => a.code.localeCompare(b.code));

  const contentHash = sha256(PARSER_VERSION + kml + items.map((i) => i.ficha?.sha256 ?? "").join(""));
  if (previous && previous.contentHash === contentHash) {
    return { sourceId: SOURCE_ID, status: "unchanged", warnings };
  }
  const staging: StagingFile<McStaging> = {
    sourceId: SOURCE_ID,
    retrievedAt: new Date().toISOString(),
    contentHash,
    data: { kmlUrl: KML_URL, items },
  };
  await writeJsonAtomic(stagingFile, staging);
  return {
    sourceId: SOURCE_ID,
    status: "updated",
    message: `${items.length} elementos, ${points.length} puntos`,
    warnings,
  };
}

export const ministerioCultura: Connector = { id: SOURCE_ID, run };
