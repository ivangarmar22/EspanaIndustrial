import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollections } from "@/data-access/editorial";
import { SORTS, toIndexItem } from "@/domain/index-item";
import { PageHeader } from "@/components/page-header";
import { RecordCard } from "@/components/record-card";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

async function find(slug: string) {
  return (await getCollections()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/colecciones/[slug]">): Promise<Metadata> {
  const c = await find((await params).slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.intro[0]!.slice(0, 158),
    alternates: { canonical: `/colecciones/${c.slug}` },
  };
}

export default async function CollectionPage({ params }: PageProps<"/colecciones/[slug]">) {
  const c = await find((await params).slug);
  if (!c) notFound();
  const items = c.records.flatMap((r) => toIndexItem(r) ?? []).sort(SORTS.oldest);
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { href: "/colecciones", label: "Colecciones" }, { label: c.title }]}
        eyebrow={`Colección · ${items.length} elementos`}
        title={c.title}
        lead={c.intro.map((p, i) => (
          <p key={i} className={i ? "mt-3" : undefined}>
            {p}
          </p>
        ))}
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((i, idx) => (
            <RecordCard key={i.id} item={i} priority={idx < 4} />
          ))}
        </div>
        <section className="mt-12 border-t border-rule pt-6 text-sm text-ink-soft" aria-labelledby="refs">
          <h2 id="refs" className="signage text-iron">
            Fuentes de la colección
          </h2>
          <ul className="mt-2 space-y-1">
            {c.references.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Ordenados por la fecha de inicio que recogen sus fuentes; los elementos sin fecha aparecen al final.
          </p>
        </section>
      </div>
    </>
  );
}
