/**
 * Read access to the published catalogue (server-only: uses node:fs).
 * Pages and route handlers depend on this module, never on file paths, so the
 * JSON store can later be replaced by PostgreSQL/PostGIS behind the same API.
 */
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { toIndexItem, type IndexItem } from "@/domain/index-item";
import { Catalog, type HeritageRecord } from "@/domain/schema";

const catalogFile = () =>
  path.join(process.env.EI_DATA_DIR ?? path.join(process.cwd(), "data"), "catalog", "catalog.json");

let cache: { mtimeMs: number; catalog: Catalog } | undefined;

/** Loads and validates the catalogue; reloads automatically when the file changes (`data:update`). */
export async function getCatalog(): Promise<Catalog> {
  const file = catalogFile();
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    return { schemaVersion: 1, generatedAt: new Date(0).toISOString(), records: [] };
  }
  if (cache?.mtimeMs === mtimeMs) return cache.catalog;
  const catalog = withAvailableMedia(Catalog.parse(JSON.parse(await readFile(file, "utf8"))));
  cache = { mtimeMs, catalog };
  return catalog;
}

/**
 * Downloaded photos live in public/media, which is not versioned (`npm run data:media`).
 * On a fresh clone, drop local paths whose file is missing so pages fall back to the
 * blueprint placeholder instead of showing broken images.
 */
function withAvailableMedia(catalog: Catalog): Catalog {
  const publicDir = path.join(process.cwd(), "public");
  for (const r of catalog.records) {
    for (const img of r.images ?? []) {
      if (img.localPath && !existsSync(path.join(publicDir, img.localPath))) delete img.localPath;
    }
  }
  return catalog;
}

export async function getPublishedRecords(): Promise<HeritageRecord[]> {
  return (await getCatalog()).records.filter((r) => r.editorial.published);
}

export async function getIndexItems(): Promise<IndexItem[]> {
  return (await getPublishedRecords()).flatMap((r) => toIndexItem(r) ?? []);
}

export async function getRecordBySlug(
  slug: string,
): Promise<{ record: HeritageRecord; redirectTo?: string } | undefined> {
  const records = await getPublishedRecords();
  const record = records.find((r) => r.slug === slug);
  if (record) return { record };
  const moved = records.find((r) => r.previousSlugs?.includes(slug));
  return moved ? { record: moved, redirectTo: moved.slug } : undefined;
}

export async function getRecordById(id: string): Promise<HeritageRecord | undefined> {
  return (await getCatalog()).records.find((r) => r.id === id);
}

export async function getRecordsByExternalCodes(codes: string[]): Promise<HeritageRecord[]> {
  const byCode = new Map((await getPublishedRecords()).map((r) => [r.externalIds.ipce, r]));
  return codes.flatMap((c) => (byCode.has(c) ? [byCode.get(c)!] : []));
}
