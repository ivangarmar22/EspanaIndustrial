import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, Footprints } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getRailDataset } from "@/data-access/rail";
import { GREENWAY_NEAR_M, LINE_PAGE_MIN_STATIONS, LINE_STATE_LABELS, TRACK_KINDS, type TrackKind } from "@/domain/rail";
import { RailExplorer } from "@/features/rail/rail-explorer";
import { SafetyNotice } from "@/features/rail/safety-notice";
import { formatKm, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Estaciones de tren cerradas y Vías Verdes",
  description:
    "Mapa de las estaciones de ferrocarril cerradas de España, los antiguos trazados abandonados y las Vías Verdes que hoy se pueden recorrer a pie o en bicicleta.",
  alternates: { canonical: "/ferrocarril" },
};

export default async function RailPage() {
  const rail = await getRailDataset();
  if (!rail) notFound();
  const nearGreenway = rail.stations.filter((s) => s.greenway).length;
  const linePages = rail.lines.filter((l) => l.stationCount >= LINE_PAGE_MIN_STATIONS);
  const fetched = new Date(rail.sources[0]!.fetchedAt).toLocaleDateString("es-ES", { dateStyle: "long" });

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Ferrocarril" }]}
        eyebrow="Ferrocarril"
        title="Estaciones cerradas y antiguos trazados"
        lead={
          <p>
            El cierre de líneas a partir de los años sesenta dejó en España más de un millar de estaciones sin trenes.
            Este mapa reúne las que Wikidata registra como cerradas, los trazados abandonados que recoge OpenStreetMap y
            las Vías Verdes: antiguos ferrocarriles convertidos en caminos para andar y pedalear.
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
          {[
            [formatNumber(rail.stats.stations), "estaciones cerradas con ubicación"],
            [
              formatNumber(nearGreenway),
              `a menos de ${formatKm(GREENWAY_NEAR_M / 1000).replace(",0", "")} de una Vía Verde`,
            ],
            [`${formatNumber(rail.stats.trackKm.greenway ?? 0)} km`, "de Vías Verdes cartografiadas"],
            [
              `${formatNumber((rail.stats.trackKm.abandoned ?? 0) + (rail.stats.trackKm.disused ?? 0) + (rail.stats.trackKm.trail ?? 0))} km`,
              "de otros trazados sin trenes",
            ],
          ].map(([value, label]) => (
            <div key={label} className="bg-card p-4 sm:p-5">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-3xl sm:text-4xl">{value}</span>
                <span className="mt-1 block text-sm text-ink-soft">{label}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <Suspense fallback={<div className="blueprint h-[78vh] min-h-[520px] border border-rule-strong" />}>
            <RailExplorer stations={rail.stations} lines={rail.lines} />
          </Suspense>
          <p className="mt-2 text-xs text-iron">
            Datos consultados el {fetched}. Las estaciones sin coordenadas en Wikidata (
            {formatNumber(rail.stats.stationsWithoutCoordinates)}) no aparecen en el mapa.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <section aria-labelledby="caminar">
            <h2 id="caminar" className="flex items-center gap-2 font-display text-3xl">
              <Footprints className="size-7 text-greenway" aria-hidden="true" /> ¿Se puede caminar por ellas?
            </h2>
            <div className="prose-ei mt-4">
              <p>
                Solo las <strong>Vías Verdes</strong> están acondicionadas para recorrerse a pie o en bicicleta: tienen
                firme adaptado, señalización y, en muchos casos, túneles iluminados y antiguas estaciones reconvertidas
                en albergues o cafeterías. El programa lo coordina la Fundación de los Ferrocarriles Españoles, que
                publica el estado y las características de cada una en{" "}
                <a href="https://www.viasverdes.com/" className="inline-flex items-center gap-1">
                  viasverdes.com <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
                .
              </p>
              <p>
                En el mapa, las Vías Verdes son las que figuran con ese nombre en OpenStreetMap; la cobertura es amplia
                pero no completa, y algún tramo puede tener otro nombre local. Consulta siempre la información oficial
                antes de salir.
              </p>
              <dl className="mt-4 grid gap-3">
                {(Object.keys(TRACK_KINDS) as TrackKind[]).map((k) => (
                  <div key={k}>
                    <dt className="font-semibold text-ink">{TRACK_KINDS[k].label}</dt>
                    <dd>{TRACK_KINDS[k].description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <SafetyNotice />
        </div>

        <section aria-labelledby="lineas" className="mt-14">
          <h2 id="lineas" className="font-display text-3xl">
            Líneas con estaciones cerradas
          </h2>
          <p className="mt-2 max-w-3xl text-ink-soft">
            {formatNumber(linePages.length)} líneas con al menos {LINE_PAGE_MIN_STATIONS} estaciones cerradas
            documentadas. El estado de la línea es el que indica Wikidata y puede no reflejar cierres parciales.
          </p>
          <ul className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {linePages.map((l) => (
              <li key={l.id} className="group relative bg-card p-4 hover:bg-paper">
                <h3 className="font-display text-xl leading-snug">
                  <Link
                    href={`/ferrocarril/lineas/${l.slug}`}
                    className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
                  >
                    {l.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  <span className="font-mono">{formatNumber(l.stationCount)}</span> estaciones ·{" "}
                  {LINE_STATE_LABELS[l.state]}
                  {l.state === "closed" && l.closedYear ? ` en ${l.closedYear}` : ""}
                </p>
                {l.greenways.length ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm text-greenway">
                    <Footprints className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {l.greenways.slice(0, 2).join(" · ")}
                    {l.greenways.length > 2 ? ` y ${l.greenways.length - 2} más` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fuentes-ferrocarril" className="prose-ei mt-14">
          <h2 id="fuentes-ferrocarril" className="font-display text-3xl text-ink">
            De dónde salen estos datos
          </h2>
          <p className="mt-4">
            Las estaciones son los elementos de Wikidata situados en España cuyo estado de uso es «clausurado», «fuera
            de servicio», «abandonado» o «derribado», con su línea, fechas, municipio y fotografía cuando constan. Se
            llaman «cerradas» porque es lo que indica la fuente: no significa que el edificio esté en ruinas. Los
            trazados proceden de OpenStreetMap (vías marcadas como abandonadas o sin servicio, y caminos con nombre de
            Vía Verde).
          </p>
          <p>
            Este conjunto de datos se publica bajo licencia{" "}
            <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> por derivar de OpenStreetMap (©
            colaboradores de OpenStreetMap). Los datos de Wikidata son CC0. Si falta una estación o un dato es
            incorrecto, lo más útil es corregirlo en Wikidata u OpenStreetMap; también puedes{" "}
            <Link href="/colabora#proponer">avisarnos</Link>.
          </p>
          <ul className="mt-4 list-disc pl-5 text-sm">
            {rail.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url}>{s.name}</a> · {s.license} · consultado el{" "}
                {new Date(s.fetchedAt).toLocaleDateString("es-ES", { dateStyle: "long" })}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
