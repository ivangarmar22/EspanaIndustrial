import type { Metadata } from "next";
import Link from "next/link";
import { getRoutes } from "@/data-access/editorial";
import { PageHeader } from "@/components/page-header";
import { routeDistanceKm } from "@/features/routes/distance";
import { formatKm, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Rutas industriales",
  description: "Itinerarios propuestos por el patrimonio industrial español, con paradas documentadas y fuentes.",
  alternates: { canonical: "/rutas" },
};

const THEME_LABELS: Record<string, string> = {
  minera: "Minera",
  ferroviaria: "Ferroviaria",
  hidraulica: "Hidráulica",
  textil: "Textil",
  energetica: "Energética",
  agroindustrial: "Agroindustrial",
  portuaria: "Portuaria",
  colonias: "Colonias industriales",
  urbana: "Urbana",
  provincial: "Provincial",
};

export default async function RoutesPage() {
  const routes = await getRoutes();
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Rutas" }]}
        eyebrow="Rutas"
        title="Rutas industriales"
        lead={
          <p>
            Itinerarios que conectan elementos documentados del atlas. Se indica siempre si una ruta es una propuesta de
            este proyecto o un itinerario oficial. Las distancias se miden en línea recta entre paradas: no son trazados
            transitables comprobados ni permiten estimar duraciones.
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ul className="divide-y divide-rule border-y border-rule">
          {routes.map((r) => (
            <li key={r.slug} className="group relative grid gap-2 py-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="signage text-iron">
                  {THEME_LABELS[r.theme]} ·{" "}
                  {r.kind === "oficial" ? "Itinerario oficial" : "Propuesta de España Industrial"} · {r.territory}
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">
                  <Link
                    href={`/rutas/${r.slug}`}
                    className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                  >
                    {r.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-3xl text-ink-soft">{r.intro[0]}</p>
              </div>
              <p className="font-mono text-sm text-iron md:text-right">
                {formatNumber(r.resolvedStops.length)} paradas
                <br />
                {formatKm(routeDistanceKm(r.resolvedStops.map((s) => s.record)))} en línea recta
              </p>
            </li>
          ))}
        </ul>
        {routes.length === 0 ? <p className="py-10 text-ink-soft">Todavía no hay rutas publicadas.</p> : null}
      </div>
    </>
  );
}
