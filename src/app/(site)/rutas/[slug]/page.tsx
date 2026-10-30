import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getRoutes } from "@/data-access/editorial";
import { toIndexItem } from "@/domain/index-item";
import { PageHeader } from "@/components/page-header";
import { CategoryBadge } from "@/components/category";
import { RecordVisual } from "@/components/record-visual";
import { routeDistanceKm, routeLegsKm } from "@/features/routes/distance";
import { RouteMap } from "@/features/routes/route-map";
import { formatKm } from "@/lib/format";

export async function generateStaticParams() {
  return (await getRoutes()).map((r) => ({ slug: r.slug }));
}

async function find(slug: string) {
  return (await getRoutes()).find((r) => r.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/rutas/[slug]">): Promise<Metadata> {
  const r = await find((await params).slug);
  if (!r) return {};
  return { title: r.title, description: r.intro[0]!.slice(0, 158), alternates: { canonical: `/rutas/${r.slug}` } };
}

export default async function RoutePage({ params }: PageProps<"/rutas/[slug]">) {
  const route = await find((await params).slug);
  if (!route) notFound();
  const records = route.resolvedStops.map((s) => s.record);
  const legs = routeLegsKm(records);
  const stops = records.flatMap((r) => {
    const p = r.location.point?.value;
    return p ? [{ lat: p.lat, lon: p.lon, name: r.name.value, family: r.category.family }] : [];
  });

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { href: "/rutas", label: "Rutas" }, { label: route.title }]}
        eyebrow={route.kind === "oficial" ? "Itinerario oficial" : "Ruta propuesta por España Industrial"}
        title={route.title}
        lead={route.intro.map((p, i) => (
          <p key={i} className={i ? "mt-3" : undefined}>
            {p}
          </p>
        ))}
      >
        <p className="mt-5 font-mono text-sm text-iron">
          {route.territory} · {records.length} paradas · {formatKm(routeDistanceKm(records))} sumando distancias en
          línea recta
        </p>
      </PageHeader>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_minmax(0,32rem)] lg:px-8">
        <ol className="space-y-0">
          {records.map((r, i) => {
            const item = toIndexItem(r);
            return (
              <li key={r.id}>
                <article className="group relative grid grid-cols-[2.5rem_5rem_1fr] gap-4 border-t border-rule py-5 sm:grid-cols-[3rem_7rem_1fr]">
                  <span className="font-display text-3xl text-rust" aria-label={`Parada ${i + 1}`}>
                    {i + 1}
                  </span>
                  <RecordVisual
                    image={item?.image}
                    family={r.category.family}
                    className="aspect-square"
                    sizes="112px"
                  />
                  <div>
                    <CategoryBadge family={r.category.family} compact />
                    <h2 className="mt-1 font-display text-xl">
                      <Link
                        href={`/patrimonio/${r.slug}`}
                        className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                      >
                        {r.name.value}
                      </Link>
                    </h2>
                    <p className="text-sm text-ink-soft">
                      {r.location.address?.value ?? r.location.municipality?.value.name}
                    </p>
                    {route.resolvedStops[i]?.note ? (
                      <p className="mt-1 text-sm">{route.resolvedStops[i]!.note}</p>
                    ) : null}
                  </div>
                </article>
                {i < legs.length ? (
                  <p className="pl-[3.5rem] pb-1 font-mono text-xs text-iron sm:pl-[4rem]">
                    ↓ {Number.isFinite(legs[i]) ? `${formatKm(legs[i]!)} en línea recta` : "distancia no calculable"}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <RouteMap stops={stops} title={route.title} />
          <div className="border-l-4 border-warning bg-card p-4 text-sm text-ink-soft">
            <p className="flex items-center gap-2 font-medium text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" /> Antes de salir
            </p>
            <p className="mt-2">
              La línea del mapa une las paradas en línea recta: no es un camino. Comprueba horarios, accesos y estado de
              cada lugar en fuentes oficiales y no entres en propiedades privadas ni en instalaciones cerradas o
              abandonadas.
            </p>
          </div>
          <div className="text-sm">
            <h2 className="signage text-iron">Fuentes</h2>
            <ul className="mt-2 space-y-1">
              {route.references.map((ref) => (
                <li key={ref.url}>
                  <a href={ref.url} target="_blank" rel="noopener noreferrer">
                    {ref.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
