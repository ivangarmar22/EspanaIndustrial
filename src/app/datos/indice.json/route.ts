import { getIndexItems } from "@/data-access/catalog";
import { itemPlace } from "@/domain/index-item";
import type { SearchEntry } from "@/components/search-box";

export const dynamic = "force-static";

/** Compact search index for the header and home search boxes, written as a static file at build time. */
export async function GET() {
  const entries: SearchEntry[] = (await getIndexItems()).map((i) => ({
    slug: i.slug,
    name: i.name,
    family: i.family,
    place: itemPlace(i),
    search: i.search,
  }));
  return Response.json(entries);
}
