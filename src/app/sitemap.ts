import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { getPublishedRecords } from "@/data-access/catalog";
import { getCollections, getRoutes } from "@/data-access/editorial";
import { getRailDataset } from "@/data-access/rail";
import { CATEGORIES } from "@/domain/categories";
import { LINE_PAGE_MIN_STATIONS } from "@/domain/rail";
import { REGIONS } from "@/domain/territory";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [records, collections, routes, rail] = await Promise.all([
    getPublishedRecords(),
    getCollections(),
    getRoutes(),
    getRailDataset(),
  ]);
  const regions = [...new Set(records.flatMap((r) => (r.location.regionCode ? [r.location.regionCode] : [])))];
  const families = new Set(records.map((r) => r.category.family));
  const staticPaths = [
    "/",
    "/mapa",
    "/catalogo",
    "/rutas",
    "/cronologia",
    "/colecciones",
    "/ferrocarril",
    "/colabora",
    "/metodologia",
    "/fuentes",
    "/aviso-legal",
    "/privacidad",
  ];
  return [
    ...staticPaths.map((p) => ({ url: absoluteUrl(p) })),
    ...records.map((r) => ({ url: absoluteUrl(`/patrimonio/${r.slug}`), lastModified: r.editorial.updatedAt })),
    ...REGIONS.filter((r) => regions.includes(r.code)).map((r) => ({ url: absoluteUrl(`/territorio/${r.slug}`) })),
    ...CATEGORIES.filter((c) => families.has(c.id)).map((c) => ({ url: absoluteUrl(`/categoria/${c.id}`) })),
    ...collections.map((c) => ({ url: absoluteUrl(`/colecciones/${c.slug}`) })),
    ...routes.map((r) => ({ url: absoluteUrl(`/rutas/${r.slug}`) })),
    ...(rail?.lines ?? [])
      .filter((l) => l.stationCount >= LINE_PAGE_MIN_STATIONS)
      .map((l) => ({ url: absoluteUrl(`/ferrocarril/lineas/${l.slug}`) })),
  ];
}
