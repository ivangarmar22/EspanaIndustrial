import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIndexItems } from "@/data-access/catalog";
import { CATEGORIES, type CategoryFamilyId } from "@/domain/categories";
import { SORTS } from "@/domain/index-item";
import { PageHeader } from "@/components/page-header";
import { RecordCard } from "@/components/record-card";
import { formatNumber } from "@/lib/format";

const findFamily = (id: string) => CATEGORIES.find((c) => c.id === id);

export async function generateStaticParams() {
  const present = new Set((await getIndexItems()).map((i) => i.family));
  return CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ family: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[family]">): Promise<Metadata> {
  const fam = findFamily((await params).family);
  if (!fam) return {};
  return {
    title: fam.label,
    description: `${fam.description} Elementos documentados en España Industrial.`,
    alternates: { canonical: `/categoria/${fam.id}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/categoria/[family]">) {
  const fam = findFamily((await params).family);
  if (!fam) notFound();
  const items = (await getIndexItems()).filter((i) => i.family === (fam.id as CategoryFamilyId)).sort(SORTS.oldest);
  if (!items.length) notFound();
  const subs = fam.subcategories
    .map((s) => ({ s, items: items.filter((i) => i.sub === s.id) }))
    .filter((x) => x.items.length);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { href: "/catalogo", label: "Catálogo" }, { label: fam.label }]}
        eyebrow="Categoría"
        title={fam.label}
        lead={
          <p>
            {fam.description} {formatNumber(items.length)} elementos documentados, ordenados por la fecha más antigua
            que recogen sus fuentes.
          </p>
        }
      >
        <p className="mt-6">
          <Link href={`/mapa?categoria=${fam.id}`}>Ver todos en el mapa</Link>
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-14 px-4 sm:px-6 lg:px-8">
        {subs.map(({ s, items: list }) => (
          <section key={s.id} aria-labelledby={`sub-${s.id}`}>
            <h2 id={`sub-${s.id}`} className="font-display text-3xl">
              {s.label} <span className="font-mono text-base text-iron">{list.length}</span>
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((i) => (
                <RecordCard key={i.id} item={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
