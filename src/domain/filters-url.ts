/** URL <-> filter state, shared by the catalogue (server) and the map (client) so links are interchangeable. */
import { CATEGORY_FAMILIES, isValidCategory, type CategoryFamilyId } from "./categories";
import type { CatalogFilters, SortKey } from "./index-item";
import { ConservationRating, ProtectionLevel } from "./schema";
import { PROVINCES, REGIONS } from "./territory";

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

const get = (p: Params, key: string): string | undefined => {
  const v = p instanceof URLSearchParams ? p.get(key) : p[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
};

const year = (s: string | undefined) => (s && /^-?\d{1,4}$/.test(s) ? Number(s) : undefined);

export function parseFilters(p: Params): CatalogFilters {
  const f: CatalogFilters = {};
  const q = get(p, "q");
  if (q) f.q = q.slice(0, 100);
  const fam = get(p, "categoria");
  if (fam && (CATEGORY_FAMILIES as readonly string[]).includes(fam)) {
    f.family = fam as CategoryFamilyId;
    const sub = get(p, "tipo");
    if (sub && isValidCategory(fam, sub)) f.sub = sub;
  }
  const region = REGIONS.find((r) => r.slug === get(p, "comunidad"));
  if (region) f.region = region.code;
  const province = PROVINCES.find((x) => x.slug === get(p, "provincia"));
  if (province) f.province = province.code;
  const from = year(get(p, "desde"));
  const to = year(get(p, "hasta"));
  if (from !== undefined) f.from = from;
  if (to !== undefined) f.to = to;
  const prot = get(p, "proteccion");
  if (prot === "cualquiera") f.protection = "any";
  else if (prot && ProtectionLevel.safeParse(prot).success) f.protection = prot as CatalogFilters["protection"];
  const cons = get(p, "conservacion");
  if (cons && ConservationRating.safeParse(cons).success) f.conservation = cons as CatalogFilters["conservation"];
  if (get(p, "foto") === "1") f.withImage = true;
  return f;
}

export function filtersToParams(f: CatalogFilters, extra: Record<string, string | undefined> = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.family) p.set("categoria", f.family);
  if (f.sub) p.set("tipo", f.sub);
  if (f.region) p.set("comunidad", REGIONS.find((r) => r.code === f.region)!.slug);
  if (f.province) p.set("provincia", PROVINCES.find((x) => x.code === f.province)!.slug);
  if (f.from !== undefined) p.set("desde", String(f.from));
  if (f.to !== undefined) p.set("hasta", String(f.to));
  if (f.protection) p.set("proteccion", f.protection === "any" ? "cualquiera" : f.protection);
  if (f.conservation) p.set("conservacion", f.conservation);
  if (f.withImage) p.set("foto", "1");
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p;
}

export function parseSort(p: Params): SortKey {
  const s = get(p, "orden");
  return s === "antiguos" ? "oldest" : s === "recientes" ? "newest" : "name";
}

export const SORT_PARAM: Record<SortKey, string | undefined> = {
  name: undefined,
  oldest: "antiguos",
  newest: "recientes",
};
