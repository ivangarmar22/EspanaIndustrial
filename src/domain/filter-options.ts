/** Options offered by the filter UIs (map and catalogue), derived from real data where it matters. */
import { CATEGORIES } from "./categories";
import type { IndexItem } from "./index-item";
import { CONSERVATION_LABELS, PROTECTION_LABELS } from "./labels";
import { PROVINCES, REGIONS } from "./territory";

/** Historical periods for quick date filtering. Boundaries are conventional, inclusive. */
export const PERIODS = [
  { id: "pre-1850", label: "Antes de 1850", from: undefined, to: 1849 },
  { id: "1850-1899", label: "1850–1899", from: 1850, to: 1899 },
  { id: "1900-1935", label: "1900–1935", from: 1900, to: 1935 },
  { id: "1936-1975", label: "1936–1975", from: 1936, to: 1975 },
  { id: "post-1975", label: "Desde 1976", from: 1976, to: undefined },
] as const;

export interface FilterOptions {
  families: Array<{
    id: string;
    label: string;
    count: number;
    subs: Array<{ id: string; label: string; count: number }>;
  }>;
  regions: Array<{ code: string; slug: string; name: string; count: number }>;
  provinces: Array<{ code: string; slug: string; name: string; regionCode: string; count: number }>;
  protections: Array<{ id: string; label: string; count: number }>;
  conservations: Array<{ id: string; label: string; count: number }>;
}

/** Only options that exist in the data are offered, with real counts. */
export function buildFilterOptions(items: IndexItem[]): FilterOptions {
  const count = <K>(pick: (i: IndexItem) => K[] | K | undefined) => {
    const m = new Map<K, number>();
    for (const i of items) {
      const v = pick(i);
      for (const k of Array.isArray(v) ? v : v === undefined ? [] : [v]) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const fam = count((i) => i.family);
  const sub = count((i) => `${i.family}/${i.sub}`);
  const reg = count((i) => i.regionCode);
  const prov = count((i) => i.provinceCode);
  const prot = count((i) => i.protection);
  const cons = count((i) => i.conservation);
  return {
    families: CATEGORIES.filter((c) => fam.has(c.id)).map((c) => ({
      id: c.id,
      label: c.label,
      count: fam.get(c.id)!,
      subs: c.subcategories
        .filter((s) => sub.has(`${c.id}/${s.id}`))
        .map((s) => ({ id: s.id, label: s.label, count: sub.get(`${c.id}/${s.id}`)! })),
    })),
    regions: REGIONS.filter((r) => reg.has(r.code)).map((r) => ({ ...r, count: reg.get(r.code)! })),
    provinces: PROVINCES.filter((p) => prov.has(p.code))
      .map((p) => ({ ...p, count: prov.get(p.code)! }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
    protections: Object.entries(PROTECTION_LABELS)
      .filter(([k]) => prot.has(k as never))
      .map(([id, label]) => ({ id, label, count: prot.get(id as never)! })),
    conservations: Object.entries(CONSERVATION_LABELS)
      .filter(([k]) => cons.has(k as never))
      .map(([id, label]) => ({ id, label, count: cons.get(id as never)! })),
  };
}
