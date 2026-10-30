import type { HeritageRecord } from "@/domain/schema";
import { distanceMeters } from "@/lib/geo";

interface RecordChange {
  id: string;
  name: string;
  fields: string[];
  /** Changes that need human review before publication. */
  important: string[];
}

export interface CatalogDiff {
  added: RecordChange[];
  removed: RecordChange[];
  modified: RecordChange[];
  requiresReview: boolean;
}

const MOVE_THRESHOLD_M = 100;
const IGNORED_FIELDS = new Set(["editorial", "sources"]);

const comparable = (v: unknown) => JSON.stringify(v, (k, val) => (k === "retrievedAt" ? undefined : val));

export function diffCatalogs(previous: HeritageRecord[], next: HeritageRecord[]): CatalogDiff {
  const before = new Map(previous.map((r) => [r.id, r]));
  const after = new Map(next.map((r) => [r.id, r]));
  const added: RecordChange[] = [];
  const removed: RecordChange[] = [];
  const modified: RecordChange[] = [];

  for (const rec of next) {
    const old = before.get(rec.id);
    if (!old) {
      added.push({ id: rec.id, name: rec.name.value, fields: [], important: ["alta"] });
      continue;
    }
    const keys = new Set([...Object.keys(old), ...Object.keys(rec)].filter((k) => !IGNORED_FIELDS.has(k)));
    const fields = [...keys].filter(
      (k) => comparable(old[k as keyof HeritageRecord]) !== comparable(rec[k as keyof HeritageRecord]),
    );
    // Source metadata (download dates) changes on every run; only a different set of cited sources counts.
    if (Object.keys(old.sources).sort().join() !== Object.keys(rec.sources).sort().join()) fields.push("sources");
    const important: string[] = [];
    if (old.name.value !== rec.name.value) important.push(`nombre: «${old.name.value}» → «${rec.name.value}»`);
    if (old.category.family !== rec.category.family || old.category.sub !== rec.category.sub) {
      important.push(
        `categoría: ${old.category.family}/${old.category.sub} → ${rec.category.family}/${rec.category.sub}`,
      );
    }
    const p0 = old.location.point?.value;
    const p1 = rec.location.point?.value;
    if (p0 && p1 && distanceMeters(p0, p1) > MOVE_THRESHOLD_M)
      important.push(`ubicación desplazada ${Math.round(distanceMeters(p0, p1))} m`);
    if (comparable(old.protection) !== comparable(rec.protection)) important.push("protección");
    const licenses = (r: HeritageRecord) =>
      (r.images ?? [])
        .map((i) => `${i.id}:${i.license}`)
        .sort()
        .join(",");
    if (licenses(old) !== licenses(rec)) important.push("imágenes o licencias");
    if (old.editorial.published !== rec.editorial.published)
      important.push(rec.editorial.published ? "republicado" : "retirado");
    if (fields.length || important.length) modified.push({ id: rec.id, name: rec.name.value, fields, important });
  }
  for (const old of previous) {
    if (!after.has(old.id)) removed.push({ id: old.id, name: old.name.value, fields: [], important: ["baja"] });
  }
  return {
    added,
    removed,
    modified,
    requiresReview: added.length + removed.length + modified.filter((m) => m.important.length).length > 0,
  };
}
