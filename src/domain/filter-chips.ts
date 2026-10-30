import { getFamily, getSubcategory } from "./categories";
import type { CatalogFilters } from "./index-item";
import { CONSERVATION_LABELS, PROTECTION_LABELS } from "./labels";
import { getProvince, getRegion } from "./territory";

export function activeFilterChips(f: CatalogFilters): Array<{ key: keyof CatalogFilters; label: string }> {
  const chips: Array<{ key: keyof CatalogFilters; label: string }> = [];
  if (f.q) chips.push({ key: "q", label: `«${f.q}»` });
  if (f.family) chips.push({ key: "family", label: getFamily(f.family).shortLabel });
  if (f.family && f.sub) chips.push({ key: "sub", label: getSubcategory(f.family, f.sub)?.label ?? f.sub });
  if (f.region) chips.push({ key: "region", label: getRegion(f.region)?.name ?? f.region });
  if (f.province) chips.push({ key: "province", label: getProvince(f.province)?.name ?? f.province });
  if (f.from !== undefined) chips.push({ key: "from", label: `Desde ${f.from}` });
  if (f.to !== undefined) chips.push({ key: "to", label: `Hasta ${f.to}` });
  if (f.protection)
    chips.push({
      key: "protection",
      label: f.protection === "any" ? "Con protección" : PROTECTION_LABELS[f.protection],
    });
  if (f.conservation)
    chips.push({ key: "conservation", label: `Conservación: ${CONSERVATION_LABELS[f.conservation]}` });
  if (f.withImage) chips.push({ key: "withImage", label: "Con fotografía" });
  return chips;
}

export function removeFilter(f: CatalogFilters, key: keyof CatalogFilters): CatalogFilters {
  const next = { ...f };
  delete next[key];
  if (key === "family") delete next.sub;
  if (key === "region") delete next.province;
  return next;
}
