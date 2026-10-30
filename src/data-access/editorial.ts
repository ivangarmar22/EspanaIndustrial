import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Collection, IndustrialRoute, MIN_COLLECTION_SIZE } from "@/domain/editorial-content";
import { yearSpan } from "@/domain/dates";
import type { HeritageRecord } from "@/domain/schema";
import { getPublishedRecords, getRecordsByExternalCodes } from "./catalog";

const dir = () => path.join(process.env.EI_DATA_DIR ?? path.join(process.cwd(), "data"), "editorial");

async function readList<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T>[]> {
  try {
    return z.array(schema).parse(JSON.parse(await readFile(path.join(dir(), file), "utf8")));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

function matchesCollection(r: HeritageRecord, c: Collection): boolean {
  const k = c.criteria;
  if (k.codes) return !!r.externalIds.ipce && k.codes.includes(r.externalIds.ipce);
  if (k.family && r.category.family !== k.family) return false;
  if (k.subs && !k.subs.includes(r.category.sub)) return false;
  if (k.regions && (!r.location.regionCode || !k.regions.includes(r.location.regionCode))) return false;
  if (k.yearTo !== undefined) {
    const from = r.chronology?.value.from;
    if (!from || yearSpan(from)[0] > k.yearTo) return false;
  }
  return true;
}

export interface ResolvedCollection extends Collection {
  records: HeritageRecord[];
}

/** Collections with their records resolved; collections below the minimum size are not published. */
export async function getCollections(): Promise<ResolvedCollection[]> {
  const [list, records] = await Promise.all([readList("collections.json", Collection), getPublishedRecords()]);
  return list
    .map((c) => ({
      ...c,
      records: records
        .filter((r) => matchesCollection(r, c))
        .sort((a, b) => a.name.value.localeCompare(b.name.value, "es")),
    }))
    .filter((c) => c.records.length >= MIN_COLLECTION_SIZE);
}

export interface ResolvedRoute extends IndustrialRoute {
  resolvedStops: Array<{ record: HeritageRecord; note?: string }>;
}

/** Routes whose stops all exist in the published catalogue. */
export async function getRoutes(): Promise<ResolvedRoute[]> {
  const list = await readList("routes.json", IndustrialRoute);
  const out: ResolvedRoute[] = [];
  for (const route of list) {
    const records = await getRecordsByExternalCodes(route.stops.map((s) => s.code));
    if (records.length !== route.stops.length) continue;
    out.push({
      ...route,
      resolvedStops: route.stops.map((s, i) => ({ record: records[i]!, ...(s.note ? { note: s.note } : {}) })),
    });
  }
  return out;
}
