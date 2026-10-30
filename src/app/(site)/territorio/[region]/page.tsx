import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIndexItems } from "@/data-access/catalog";
import { CATEGORIES } from "@/domain/categories";
import { SORTS } from "@/domain/index-item";
import { PROVINCES, REGIONS, getRegionBySlug } from "@/domain/territory";
import { PageHeader } from "@/components/page-header";
import { RecordRow } from "@/components/record-card";
import { CategoryGlyph } from "@/components/category";
import { formatNumber } from "@/lib/format";

export async function generateStaticParams() {
  const items = await getIndexItems();
  const present = new Set(items.map((i) => i.regionCode));
  return REGIONS.filter((r) => present.has(r.code)).map((r) => ({ region: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/territorio/[region]">): Promise<Metadata> {
  const region = getRegionBySlug((await params).region);
  if (!region) return {};
  const n = (await getIndexItems()).filter((i) => i.regionCode === region.code).length;
  return {
    title: `Patrimonio industrial de ${region.name}`,
    description: `${formatNumber(n)} elementos del patrimonio industrial documentados en ${region.name}: fábricas, minas, centrales, estaciones y otros lugares de la industrialización.`,
    alternates: { canonical: `/territorio/${region.slug}` },
  };
}

export default async function RegionPage({ params }: PageProps<"/territorio/[region]">) {
  const region = getRegionBySlug((await params).region);
  if (!region) notFound();
  const items = (await getIndexItems()).filter((i) => i.regionCode === region.code).sort(SORTS.name);
  if (!items.length) notFound();

  const provinces = PROVINCES.filter((p) => p.regionCode === region.code)
    .map((p) => ({ ...p, items: items.filter((i) => i.provinceCode === p.code) }))
    .filter((p) => p.items.length);
  const families = CATEGORIES.map((c) => ({ c, n: items.filter((i) => i.family === c.id).length })).filter((x) => x.n);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { href: "/catalogo", label: "Catálogo" }, { label: region.name }]}
        eyebrow="Territorio"
        title={`Patrimonio industrial de ${region.name}`}
        lead={
          <p>
            {formatNumber(items.length)} {items.length === 1 ? "elemento documentado" : "elementos documentados"} en{" "}
            {provinces.length} {provinces.length === 1 ? "provincia" : "provincias"}. La cifra refleja la cobertura
            actual del atlas, no el total del patrimonio industrial de la comunidad.
          </p>
        }
      >
        <div className="mt-6 flex flex-wrap gap-2">
          {families.map(({ c, n }) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.id}&comunidad=${region.slug}`}
              className="inline-flex min-h-9 items-center gap-2 border border-rule-strong bg-card px-2.5 text-sm text-ink no-underline"
            >
              <CategoryGlyph family={c.id} /> {c.shortLabel}{" "}
              <span className="font-mono text-xs text-iron">{formatNumber(n)}</span>
            </Link>
          ))}
          <Link
            href={`/mapa?comunidad=${region.slug}`}
            className="inline-flex min-h-9 items-center bg-ink px-3 text-sm text-paper no-underline"
          >
            Ver en el mapa
          </Link>
        </div>
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-14 px-4 sm:px-6 lg:px-8">
        {provinces.map((p) => (
          <section key={p.code} aria-labelledby={`prov-${p.slug}`} id={p.slug} className="scroll-mt-24">
            <h2 id={`prov-${p.slug}`} className="font-display text-3xl">
              {p.name} <span className="font-mono text-base text-iron">{p.items.length}</span>
            </h2>
            <div className="mt-2 grid gap-x-10 md:grid-cols-2">
              {p.items.map((i) => (
                <RecordRow key={i.id} item={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
