import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Footprints } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getRailDataset, getRailLine } from "@/data-access/rail";
import { LINE_PAGE_MIN_STATIONS, LINE_STATE_LABELS, STATION_STATUS } from "@/domain/rail";
import { getProvince, getRegion } from "@/domain/territory";
import { RailExplorer } from "@/features/rail/rail-explorer";
import { SafetyNotice } from "@/features/rail/safety-notice";
import { formatNumber } from "@/lib/format";

export async function generateStaticParams() {
  const rail = await getRailDataset();
  return (rail?.lines ?? []).filter((l) => l.stationCount >= LINE_PAGE_MIN_STATIONS).map((l) => ({ slug: l.slug }));
}

async function find(slug: string) {
  const line = await getRailLine(slug);
  return line && line.stationCount >= LINE_PAGE_MIN_STATIONS ? line : undefined;
}

export async function generateMetadata({ params }: PageProps<"/ferrocarril/lineas/[slug]">): Promise<Metadata> {
  const line = await find((await params).slug);
  if (!line) return {};
  return {
    title: `${line.name}: estaciones cerradas`,
    description: `Las ${line.stationCount} estaciones cerradas de la ${line.name.toLowerCase()} documentadas en Wikidata, con su ubicación y las Vías Verdes cercanas.`,
    alternates: { canonical: `/ferrocarril/lineas/${line.slug}` },
  };
}

export default async function RailLinePage({ params }: PageProps<"/ferrocarril/lineas/[slug]">) {
  const line = await find((await params).slug);
  const rail = await getRailDataset();
  if (!line || !rail) notFound();
  const stations = rail.stations.filter((s) => s.lines.some((l) => l.id === line.id));
  const regions = line.regionCodes.flatMap((c) => getRegion(c)?.name ?? []);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { href: "/ferrocarril", label: "Ferrocarril" }, { label: line.name }]}
        eyebrow="Línea de ferrocarril"
        title={line.name}
        lead={
          <p>
            {formatNumber(stations.length)} estaciones cerradas documentadas
            {regions.length ? ` en ${regions.join(", ")}` : ""}. Estado de la línea según Wikidata:{" "}
            <strong className="font-semibold text-ink">
              {LINE_STATE_LABELS[line.state].toLowerCase()}
              {line.state === "closed" && line.closedYear ? ` en ${line.closedYear}` : ""}
            </strong>
            .
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {line.greenways.length ? (
          <p className="mb-6 flex max-w-3xl items-start gap-2 border-l-4 border-greenway bg-card p-4">
            <Footprints className="mt-0.5 size-5 shrink-0 text-greenway" aria-hidden="true" />
            <span>
              Hay Vías Verdes junto a estaciones de esta línea. En OpenStreetMap figuran como{" "}
              <strong className="font-semibold">{line.greenways.join(", ")}</strong>. Consulta su estado oficial en{" "}
              <a href="https://www.viasverdes.com/">viasverdes.com</a>.
            </span>
          </p>
        ) : null}

        <Suspense fallback={<div className="blueprint h-[78vh] min-h-[520px] border border-rule-strong" />}>
          <RailExplorer stations={stations} lines={rail.lines} fixedLine={line.id} syncUrl={false} />
        </Suspense>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <section aria-labelledby="estaciones" className="min-w-0">
            <h2 id="estaciones" className="font-display text-3xl">
              Estaciones
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Estación
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Municipio
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Cierre
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      Vía Verde cercana
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s) => (
                    <tr key={s.id} className="border-b border-rule align-top">
                      <th scope="row" className="py-2 pr-3 font-normal">
                        <a href={`https://www.wikidata.org/wiki/${s.id}`}>{s.name}</a>
                      </th>
                      <td className="py-2 pr-3 text-ink-soft">
                        {[s.municipality, s.provinceCode ? getProvince(s.provinceCode)?.name : undefined]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="py-2 pr-3">{STATION_STATUS[s.status].label}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{s.closedYear ?? "—"}</td>
                      <td className="py-2 text-greenway">
                        {s.greenway ? s.greenway.name : <span className="text-iron">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-iron">
              Fuente: Wikidata (CC0). Vías Verdes y trazados: © colaboradores de OpenStreetMap (ODbL).{" "}
              <Link href="/ferrocarril#fuentes-ferrocarril">Más sobre los datos</Link>.
            </p>
          </section>
          <SafetyNotice />
        </div>
      </div>
    </>
  );
}
