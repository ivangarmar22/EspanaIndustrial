import { getCatalog } from "@/data-access/catalog";

export const dynamic = "force-static";

/** Public JSON download of the published catalogue (withdrawn records excluded), written as a static file. */
export async function GET() {
  const catalog = await getCatalog();
  const body = {
    ...catalog,
    license: "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Las imágenes conservan su licencia individual.",
    attribution:
      "Origen de los datos: Ministerio de Cultura (IPCE, Plan Nacional de Patrimonio Industrial); CartoCiudad © IGN (CC BY 4.0); Wikidata (CC0). Imágenes: licencia individual indicada en cada una.",
    records: catalog.records.filter((r) => r.editorial.published),
  };
  return Response.json(body);
}
