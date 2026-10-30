import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/config/site";
import { getCatalog, getIndexItems, getPublishedRecords } from "@/data-access/catalog";
import { getCollections, getRoutes } from "@/data-access/editorial";
import { CATEGORIES } from "@/domain/categories";
import { computeStats } from "@/domain/stats";
import { getProvince } from "@/domain/territory";
import { CategoryGlyph } from "@/components/category";
import { RecordVisual } from "@/components/record-visual";
import { SearchBox } from "@/components/search-box";
import { DotMap } from "@/features/home/dot-map";
import { withBase } from "@/lib/base-path";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const QUICK_SEARCHES = ["Altos hornos", "Azucarera", "Riotinto", "Asturias"];

export default async function HomePage() {
  const [items, records, catalog, collections, routes] = await Promise.all([
    getIndexItems(),
    getPublishedRecords(),
    getCatalog(),
    getCollections(),
    getRoutes(),
  ]);
  const stats = computeStats(records);
  const byId = new Map(records.map((r) => [r.id, r]));

  // One photographed element per category, in category order: real photos only, deterministic.
  const featured = CATEGORIES.flatMap(
    (c) => items.find((i) => i.family === c.id && i.image && byId.get(i.id)?.summary) ?? [],
  ).slice(0, 5);
  const [lead, ...rest] = featured;
  const leadRecord = lead ? byId.get(lead.id) : undefined;
  const leadImage = leadRecord?.images?.find((i) => i.localPath);
  const updated = new Date(catalog.generatedAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-4 pt-6 pb-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:pt-6">
        <div>
          <h1 className="mt-4 font-display text-[length:var(--text-display)] leading-[0.98] font-medium tracking-tight text-balance">
            {site.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Fábricas, minas, centrales, estaciones, presas y colonias obreras, localizadas en el mapa y documentadas
            dato a dato con fuentes públicas que puedes comprobar.
          </p>
          <SearchBox
            id="home-search"
            variant="hero"
            label="Buscar un lugar del patrimonio industrial"
            placeholder="Altos hornos, Riotinto, azucarera, Zaragoza…"
            className="mt-5 max-w-lg"
          />
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-iron">
            <span className="mr-1">Prueba con</span>
            {QUICK_SEARCHES.map((q) => (
              <Link
                key={q}
                href={`/catalogo?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-rule-strong bg-card px-3 py-1 text-ink-soft no-underline hover:border-ink hover:text-ink"
              >
                {q}
              </Link>
            ))}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mapa"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-rust px-6 text-paper no-underline hover:bg-rust-deep"
            >
              Explorar el mapa <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex min-h-12 items-center rounded-full border border-ink px-6 text-ink no-underline hover:bg-paper-deep"
            >
              Ver el catálogo completo
            </Link>
          </div>
        </div>
        <DotMap items={items} />
      </section>

      <section aria-label="Cobertura del atlas" className="border-y border-rule bg-card">
        <dl className="mx-auto grid max-w-[1440px] grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            [stats.records, "elementos documentados"],
            [stats.byRegion.length, "comunidades y ciudades autónomas"],
            [stats.withPrimarySheet, "con ficha documental del IPCE"],
            [stats.withImages, "con fotografía de licencia libre"],
          ].map(([n, label]) => (
            <div key={label as string} className="py-6">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-4xl">{formatNumber(n as number)}</span>
                <span className="text-sm text-ink-soft">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto max-w-[1440px] px-4 pb-4 text-xs text-iron sm:px-6 lg:px-8">
          Cifras calculadas sobre el catálogo publicado el {updated}.{" "}
          <Link href="/fuentes">Ver cobertura y fuentes</Link>
        </p>
      </section>

      <section aria-labelledby="categorias" className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="categorias" className="font-display text-[length:var(--text-headline)] leading-tight">
            Siete familias de la cultura del trabajo
          </h2>
        </div>
        <ul className="mt-8 grid border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
          {stats.byFamily.map((f) => {
            const cat = CATEGORIES.find((c) => c.id === f.id)!;
            return (
              <li
                key={f.id}
                className="border-b border-rule sm:odd:border-r lg:border-r lg:[&:nth-child(4n)]:border-r-0"
              >
                <Link
                  href={`/categoria/${f.id}`}
                  className="group flex h-full flex-col gap-3 p-5 text-ink no-underline hover:bg-card"
                >
                  <span className="flex items-center justify-between">
                    <CategoryGlyph family={f.id} className="size-8 text-sm" />
                    <span className="font-mono text-sm text-iron">{formatNumber(f.count)}</span>
                  </span>
                  <span className="font-display text-2xl group-hover:underline">{cat.label}</span>
                  <span className="text-sm text-ink-soft">{cat.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {lead && leadRecord ? (
        <section aria-labelledby="destacados" className="mx-auto max-w-[1440px] px-4 pt-24 sm:px-6 lg:px-8">
          <h2 id="destacados" className="signage text-rust">
            Del archivo
          </h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <article className="group relative">
              <div className="relative aspect-[16/10] overflow-hidden bg-paper-deep">
                <Image
                  src={withBase(lead.image!.src)}
                  alt={lead.image!.alt}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
              <h3 className="mt-5 font-display text-[length:var(--text-headline)] leading-[1.05]">
                <Link
                  href={`/patrimonio/${lead.slug}`}
                  className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                >
                  {lead.name}
                </Link>
              </h3>
              <p className="mt-2 text-ink-soft">
                {[lead.municipality, lead.provinceCode ? getProvince(lead.provinceCode)?.name : undefined]
                  .filter(Boolean)
                  .join(", ")}
                {lead.chronology ? <span className="ml-3 font-mono text-sm text-iron">{lead.chronology}</span> : null}
              </p>
              {leadRecord.summary ? (
                <p className="mt-3 line-clamp-3 max-w-2xl text-ink-soft">{leadRecord.summary.value}</p>
              ) : null}
              {leadImage ? (
                <p className="relative z-10 mt-2 text-xs text-iron">
                  Foto: {leadImage.author} · {leadImage.license} ·{" "}
                  <a href={leadImage.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                    Wikimedia Commons
                  </a>
                </p>
              ) : null}
            </article>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 self-start">
              {rest.map((i) => {
                const img = byId.get(i.id)?.images?.find((x) => x.localPath);
                return (
                  <article key={i.id} className="group relative">
                    <RecordVisual
                      image={i.image}
                      family={i.family}
                      className="aspect-[4/3]"
                      sizes="(min-width: 1024px) 20vw, 50vw"
                    />
                    <h3 className="mt-3 font-display text-lg leading-snug">
                      <Link
                        href={`/patrimonio/${i.slug}`}
                        className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                      >
                        {i.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-ink-soft">{i.municipality}</p>
                    {img ? (
                      <p className="text-[0.7rem] text-iron">
                        Foto: {img.author} · {img.license}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="colecciones-home" className="mx-auto max-w-[1440px] px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
          <div>
            <h2 id="colecciones-home" className="font-display text-3xl">
              Colecciones
            </h2>
            <ul className="mt-5 divide-y divide-rule border-y border-rule">
              {collections.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/colecciones/${c.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-3.5 text-ink no-underline"
                  >
                    <span className="font-display text-xl group-hover:underline">{c.title}</span>
                    <span className="font-mono text-sm text-iron">{formatNumber(c.records.length)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/colecciones"
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rule-strong px-4 text-sm text-ink no-underline hover:border-ink"
            >
              Todas las colecciones ({formatNumber(collections.length)}){" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div>
            <h2 className="font-display text-3xl">Rutas propuestas</h2>
            <ul className="mt-5 divide-y divide-rule border-y border-rule">
              {routes.slice(0, 6).map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/rutas/${r.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-3.5 text-ink no-underline"
                  >
                    <span className="font-display text-xl group-hover:underline">{r.title}</span>
                    <span className="shrink-0 font-mono text-sm whitespace-nowrap text-iron">
                      {formatNumber(r.resolvedStops.length)} paradas
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/rutas"
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rule-strong px-4 text-sm text-ink no-underline hover:border-ink"
            >
              Todas las rutas ({formatNumber(routes.length)}) <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="territorios" className="mx-auto max-w-[1440px] px-4 pt-24 sm:px-6 lg:px-8">
        <h2 id="territorios" className="font-display text-3xl">
          Por territorio
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
          {stats.byRegion.map((r) => (
            <li key={r.code} className="border-b border-rule">
              <Link
                href={`/territorio/${r.slug}`}
                className="flex items-baseline justify-between gap-2 py-2.5 text-ink no-underline hover:text-rust"
              >
                <span>{r.name}</span>
                <span className="font-mono text-xs text-iron">{formatNumber(r.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
