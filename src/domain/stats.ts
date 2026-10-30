import { CATEGORIES, type CategoryFamilyId } from "./categories";
import type { HeritageRecord, ValidationLevel } from "./schema";
import { REGIONS } from "./territory";

export interface CoverageStats {
  records: number;
  mapPoints: number;
  ensembles: number;
  withCoordinates: number;
  withImages: number;
  withPrimarySheet: number;
  withWikidata: number;
  withProtection: number;
  openDiscrepancies: number;
  byValidation: Record<ValidationLevel, number>;
  byFamily: Array<{ id: CategoryFamilyId; label: string; count: number }>;
  byRegion: Array<{ code: string; slug: string; name: string; count: number }>;
}

/** Statistics computed from the published records only — never hard-coded. */
export function computeStats(records: HeritageRecord[]): CoverageStats {
  const byValidation: Record<ValidationLevel, number> = {
    "primary-verified": 0,
    "cross-checked": 0,
    partial: 0,
    secondary: 0,
    pending: 0,
  };
  for (const r of records) byValidation[r.editorial.validation]++;
  const familyCount = new Map<string, number>();
  const regionCount = new Map<string, number>();
  for (const r of records) {
    familyCount.set(r.category.family, (familyCount.get(r.category.family) ?? 0) + 1);
    if (r.location.regionCode)
      regionCount.set(r.location.regionCode, (regionCount.get(r.location.regionCode) ?? 0) + 1);
  }
  return {
    records: records.length,
    mapPoints: records.reduce((n, r) => n + (r.location.point ? 1 : 0) + (r.location.extraPoints?.length ?? 0), 0),
    ensembles: records.filter(
      (r) =>
        (r.location.extraPoints?.length ?? 0) > 0 ||
        r.category.family === "paisaje" ||
        r.category.sub === "paisaje-minero",
    ).length,
    withCoordinates: records.filter((r) => r.location.point).length,
    withImages: records.filter((r) => r.images?.some((i) => i.localPath)).length,
    withPrimarySheet: records.filter((r) => r.sources["ipce-ficha"]).length,
    withWikidata: records.filter((r) => r.externalIds.wikidata).length,
    withProtection: records.filter((r) => r.protection?.length).length,
    openDiscrepancies: records.filter((r) => r.discrepancies?.some((d) => d.status === "open")).length,
    byValidation,
    byFamily: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: familyCount.get(c.id) ?? 0 })).filter(
      (x) => x.count > 0,
    ),
    byRegion: REGIONS.map((r) => ({ ...r, count: regionCount.get(r.code) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count),
  };
}
