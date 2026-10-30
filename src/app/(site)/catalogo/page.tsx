import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndexItems } from "@/data-access/catalog";
import { buildFilterOptions } from "@/domain/filter-options";
import { PageHeader } from "@/components/page-header";
import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Catálogo del patrimonio industrial",
  description:
    "Catálogo completo de los elementos documentados: busca y filtra por categoría, territorio, periodo, protección y conservación.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage() {
  const all = await getIndexItems();
  const options = buildFilterOptions(all);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Catálogo" }]}
        eyebrow="Catálogo"
        title="Todos los elementos documentados"
        lead={
          <p>
            {formatNumber(all.length)} elementos procedentes del listado del Plan Nacional de Patrimonio Industrial,
            enriquecidos con fuentes oficiales y colaborativas. El catálogo crece por fuentes verificadas: no representa
            todo el patrimonio industrial existente.
          </p>
        }
      />
      <Suspense fallback={<div className="mx-auto h-96 max-w-[1440px] px-4 sm:px-6 lg:px-8" />}>
        <CatalogBrowser all={all} options={options} />
      </Suspense>
    </>
  );
}
