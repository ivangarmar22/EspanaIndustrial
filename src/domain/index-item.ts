/**
 * Lightweight projection of a record used by the map, search and listings, plus
 * the shared filter logic (same semantics on server and client).
 */
import type { CategoryFamilyId } from "./categories";
import { getFamily, getSubcategory } from "./categories";
import { yearSpan } from "./dates";
import type { ConservationRating, HeritageRecord, ProtectionLevel, ValidationLevel } from "./schema";
import { getProvince, getRegion } from "./territory";
import { normalizeText } from "@/lib/text";

export interface IndexItem {
  id: string;
  slug: string;
  name: string;
  family: CategoryFamilyId;
  sub: string;
  lat: number;
  lon: number;
  regionCode?: string;
  provinceCode?: string;
  municipality?: string;
  chronology?: string;
  yearFrom?: number;
  yearTo?: number;
  protection: ProtectionLevel[];
  conservation?: ConservationRating;
  image?: { src: string; width: number; height: number; alt: string };
  validation: ValidationLevel;
  /** Pre-normalised text for search (name, variants, place, category). */
  search: string;
}

export function toIndexItem(r: HeritageRecord): IndexItem | undefined {
  const point = r.location.point?.value;
  if (!point) return undefined;
  const from = r.chronology?.value.from ?? r.inception?.value;
  const to = r.chronology?.value.to;
  const img = r.images?.find((i) => i.localPath);
  const family = getFamily(r.category.family);
  const region = r.location.regionCode ? getRegion(r.location.regionCode) : undefined;
  const province = r.location.provinceCode ? getProvince(r.location.provinceCode) : undefined;
  const item: IndexItem = {
    id: r.id,
    slug: r.slug,
    name: r.name.value,
    family: r.category.family,
    sub: r.category.sub,
    lat: point.lat,
    lon: point.lon,
    protection: (r.protection ?? []).map((p) => p.value.level),
    validation: r.editorial.validation,
    search: normalizeText(
      [
        r.name.value,
        ...(r.altNames ?? []).map((a) => a.value),
        r.location.municipality?.value.name,
        province?.name,
        region?.name,
        family.label,
        getSubcategory(r.category.family, r.category.sub)?.label,
        r.activity?.value,
        r.externalIds.ipce,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  };
  if (r.location.regionCode) item.regionCode = r.location.regionCode;
  if (r.location.provinceCode) item.provinceCode = r.location.provinceCode;
  if (r.location.municipality) item.municipality = r.location.municipality.value.name;
  if (r.chronology) item.chronology = r.chronology.value.label;
  if (from) item.yearFrom = yearSpan(from)[0];
  if (to) item.yearTo = yearSpan(to)[1];
  else if (from) item.yearTo = yearSpan(from)[1];
  if (r.conservation?.value.rating) item.conservation = r.conservation.value.rating;
  if (img?.localPath) item.image = { src: img.localPath, width: img.width, height: img.height, alt: img.alt };
  return item;
}

export interface CatalogFilters {
  q?: string;
  family?: CategoryFamilyId;
  sub?: string;
  region?: string;
  province?: string;
  /** Inclusive year window: items whose documented span intersects it. */
  from?: number;
  to?: number;
  protection?: ProtectionLevel | "any";
  conservation?: ConservationRating;
  withImage?: boolean;
}

export function matchesQuery(item: Pick<IndexItem, "search">, q: string): boolean {
  const tokens = normalizeText(q).split(" ").filter(Boolean);
  return tokens.every((t) => item.search.includes(t));
}

/** "Municipio, Provincia" for listings; empty when the place is unknown. */
export function itemPlace(i: Pick<IndexItem, "municipality" | "provinceCode">): string {
  return [i.municipality, i.provinceCode ? getProvince(i.provinceCode)?.name : undefined].filter(Boolean).join(", ");
}

/** Matching items ordered by relevance: name prefix, then a word of the name, then any indexed text. */
export function searchItems<T extends Pick<IndexItem, "name" | "search">>(items: T[], q: string, limit: number): T[] {
  const needle = normalizeText(q);
  const rank = (i: T) => {
    const name = normalizeText(i.name);
    return name.startsWith(needle) ? 0 : name.includes(` ${needle}`) ? 1 : name.includes(needle) ? 2 : 3;
  };
  return items
    .filter((i) => matchesQuery(i, q))
    .map((i) => ({ i, r: rank(i) }))
    .sort((a, b) => a.r - b.r || a.i.name.localeCompare(b.i.name, "es"))
    .slice(0, limit)
    .map(({ i }) => i);
}

export function applyFilters<T extends IndexItem>(items: T[], f: CatalogFilters): T[] {
  return items.filter((i) => {
    if (f.q && !matchesQuery(i, f.q)) return false;
    if (f.family && i.family !== f.family) return false;
    if (f.sub && i.sub !== f.sub) return false;
    if (f.region && i.regionCode !== f.region) return false;
    if (f.province && i.provinceCode !== f.province) return false;
    if (f.from !== undefined || f.to !== undefined) {
      // Items without documented dates are excluded from date filtering, never assumed to match.
      if (i.yearFrom === undefined) return false;
      const lo = f.from ?? -Infinity;
      const hi = f.to ?? Infinity;
      if ((i.yearTo ?? i.yearFrom) < lo || i.yearFrom > hi) return false;
    }
    if (f.protection === "any" && i.protection.length === 0) return false;
    if (f.protection && f.protection !== "any" && !i.protection.includes(f.protection)) return false;
    if (f.conservation && i.conservation !== f.conservation) return false;
    if (f.withImage && !i.image) return false;
    return true;
  });
}

export const SORTS = {
  name: (a: IndexItem, b: IndexItem) => a.name.localeCompare(b.name, "es"),
  oldest: (a: IndexItem, b: IndexItem) =>
    (a.yearFrom ?? 9999) - (b.yearFrom ?? 9999) || a.name.localeCompare(b.name, "es"),
  newest: (a: IndexItem, b: IndexItem) =>
    (b.yearFrom ?? -9999) - (a.yearFrom ?? -9999) || a.name.localeCompare(b.name, "es"),
} as const;
export type SortKey = keyof typeof SORTS;
