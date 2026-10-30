import type { NextRequest } from "next/server";
import { getIndexItems } from "@/data-access/catalog";
import type { CategoryFamilyId } from "@/domain/categories";
import { itemPlace, searchItems } from "@/domain/index-item";

export interface SearchSuggestion {
  slug: string;
  name: string;
  family: CategoryFamilyId;
  place: string;
}

/** Quick suggestions for the header search box: a handful of ranked matches. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const results: SearchSuggestion[] =
    q.length < 2
      ? []
      : searchItems(await getIndexItems(), q, 6).map((i) => ({
          slug: i.slug,
          name: i.name,
          family: i.family,
          place: itemPlace(i),
        }));
  return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=300" } });
}
