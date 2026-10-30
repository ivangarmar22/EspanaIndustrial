import type { Metadata } from "next";
import Link from "next/link";
import { getCollections } from "@/data-access/editorial";
import { toIndexItem } from "@/domain/index-item";
import { PageHeader } from "@/components/page-header";
import { RecordVisual } from "@/components/record-visual";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Colecciones temáticas",
  description:
    "Selecciones editoriales del patrimonio industrial español: paisajes mineros, Reales Fábricas, textiles, harineras, ferrocarril y más.",
  alternates: { canonical: "/colecciones" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Colecciones" }]}
        eyebrow="Colecciones"
        title="Colecciones temáticas"
        lead={
          <p>
            Cada colección se calcula sobre el catálogo publicado con un criterio explícito; solo se muestran las que
            reúnen al menos tres elementos documentados.
          </p>
        }
      />
      <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {collections.map((c) => {
          const cover = c.records.map((r) => toIndexItem(r)).find((i) => i?.image) ?? toIndexItem(c.records[0]!);
          return (
            <article key={c.slug} className="group relative">
              {cover ? (
                <RecordVisual
                  image={cover.image}
                  family={cover.family}
                  point={cover}
                  className="aspect-[3/2]"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              ) : null}
              <p className="signage mt-4 text-iron">{formatNumber(c.records.length)} elementos</p>
              <h2 className="mt-1 font-display text-2xl leading-snug">
                <Link
                  href={`/colecciones/${c.slug}`}
                  className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                >
                  {c.title}
                </Link>
              </h2>
              <p className="mt-2 line-clamp-3 text-ink-soft">{c.intro[0]}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
