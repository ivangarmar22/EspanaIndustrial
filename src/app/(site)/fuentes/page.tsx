import type { Metadata } from "next";
import { getCatalog, getPublishedRecords } from "@/data-access/catalog";
import { VALIDATION_LABELS } from "@/domain/labels";
import { computeStats } from "@/domain/stats";
import { PageHeader } from "@/components/page-header";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fuentes, licencias y cobertura",
  description:
    "Fuentes de datos de España Industrial, condiciones de reutilización y estadísticas de cobertura calculadas a partir del catálogo.",
  alternates: { canonical: "/fuentes" },
};

const SOURCES = [
  {
    name: "Plan Nacional de Patrimonio Industrial — Ministerio de Cultura (IPCE)",
    role: "Fuente primaria: listado de bienes, mapa y fichas documentales.",
    license: "Licencia general de reutilización (Real Decreto 1495/2011). Origen de los datos: Ministerio de Cultura.",
    url: "https://www.cultura.gob.es/planes-nacionales/planes-nacionales/patrimonio-industrial/actuaciones/mapa-interactivo.html",
    note: "Las fotografías de las fichas incluyen créditos de terceros y no se reproducen; se enlaza la ficha original.",
  },
  {
    name: "CartoCiudad — Instituto Geográfico Nacional",
    role: "Municipio, código INE, provincia y comunidad autónoma de cada punto.",
    license: "CC BY 4.0",
    url: "https://www.cartociudad.es/",
  },
  {
    name: "Ortofotos y cartografía del IGN (PNOA, PNOA histórico, MTN)",
    role: "Capas del mapa y comparador histórico.",
    license: "CC BY 4.0 — PNOA cedido por © Instituto Geográfico Nacional",
    url: "https://pnoa.ign.es/",
  },
  {
    name: "Wikidata",
    role: "Fuente colaborativa secundaria: identificadores (Wikidata, código BIC, IAPH…), fecha de inicio, enlace a imagen y a Wikipedia. También las estaciones de ferrocarril cerradas y sus líneas.",
    license: "CC0 1.0",
    url: "https://www.wikidata.org/",
  },
  {
    name: "Wikimedia Commons",
    role: "Fotografías vinculadas desde Wikidata. Cada imagen muestra su autor y licencia.",
    license: "Licencia individual de cada archivo (solo CC0, dominio público, CC BY y CC BY-SA)",
    url: "https://commons.wikimedia.org/",
  },
  {
    name: "OpenFreeMap · OpenMapTiles · OpenStreetMap",
    role: "Cartografía base vectorial. Los datos de OpenStreetMap no se incorporan al catálogo.",
    license: "Datos ODbL © colaboradores de OpenStreetMap",
    url: "https://openfreemap.org/",
  },
  {
    name: "OpenStreetMap (Overpass API) — sección de ferrocarril",
    role: "Trazados ferroviarios abandonados o sin servicio y caminos con nombre de Vía Verde, en la sección de ferrocarril.",
    license: "ODbL 1.0 © colaboradores de OpenStreetMap. El conjunto ferroviario se publica también bajo ODbL.",
    url: "https://www.openstreetmap.org/copyright",
    note: "Base de datos separada del catálogo, que sigue bajo CC BY 4.0.",
  },
];

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border-t border-ink pt-3">
      <p className="font-display text-4xl">{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="mt-1 text-sm text-ink-soft">{label}</p>
    </div>
  );
}

export default async function SourcesPage() {
  const [records, catalog] = await Promise.all([getPublishedRecords(), getCatalog()]);
  const s = computeStats(records);
  const updated = records.length
    ? new Date(catalog.generatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Fuentes y cobertura" }]}
        eyebrow="Transparencia"
        title="Fuentes, licencias y cobertura"
        lead={
          <p>
            Las cifras de esta página se calculan en cada publicación a partir del propio catálogo. Reflejan lo que el
            atlas documenta hoy, no el total del patrimonio industrial existente en España.
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <section aria-labelledby="cobertura">
          <h2 id="cobertura" className="font-display text-3xl">
            Cobertura actual
          </h2>
          <p className="mt-2 text-sm text-iron">Última publicación del catálogo: {updated}</p>
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat value={s.records} label="registros publicados (bienes o conjuntos del listado del IPCE)" />
            <Stat value={s.mapPoints} label="puntos en el mapa (algunos conjuntos abarcan varios)" />
            <Stat value={s.withPrimarySheet} label="con ficha documental del IPCE" />
            <Stat value={s.withProtection} label="con protección patrimonial documentada" />
            <Stat value={s.withCoordinates} label="con coordenadas" />
            <Stat value={s.withImages} label="con fotografía de licencia libre" />
            <Stat value={s.withWikidata} label="enlazados con Wikidata" />
            <Stat value={s.openDiscrepancies} label="con discrepancias entre fuentes pendientes" />
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="signage text-iron">Por nivel de verificación</h3>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {Object.entries(s.byValidation).map(([k, n]) => (
                  <li key={k} className="flex justify-between py-2 text-sm">
                    <span>{VALIDATION_LABELS[k as keyof typeof VALIDATION_LABELS].label}</span>
                    <span className="font-mono">{formatNumber(n)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="signage text-iron">Por comunidad autónoma</h3>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {s.byRegion.map((r) => (
                  <li key={r.code} className="flex justify-between py-2 text-sm">
                    <a href={`/territorio/${r.slug}`}>{r.name}</a>
                    <span className="font-mono">{formatNumber(r.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="lista-fuentes" className="mt-16">
          <h2 id="lista-fuentes" className="font-display text-3xl">
            Fuentes y licencias
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {SOURCES.map((src) => (
              <li key={src.name} className="border border-rule bg-card p-5">
                <h3 className="font-display text-xl">
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.name}
                  </a>
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{src.role}</p>
                <p className="mt-2 text-sm">
                  <span className="signage mr-1.5 text-iron">Licencia</span>
                  {src.license}
                </p>
                {src.note ? <p className="mt-2 text-sm text-iron">{src.note}</p> : null}
              </li>
            ))}
          </ul>
          <p className="prose-ei mt-8">
            España Industrial es un proyecto independiente y no está afiliado al Ministerio de Cultura, al IGN ni a la
            Fundación Wikimedia. La reutilización de la información del sector público no implica que el organismo
            titular participe, patrocine o apoye este proyecto. Los datos del catálogo pueden descargarse en formato
            JSON desde el pie de página bajo licencia{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.es"
              rel="license noopener noreferrer"
              target="_blank"
            >
              CC BY 4.0
            </a>
            , respetando las condiciones de cada fuente; las imágenes conservan siempre su licencia original.
          </p>
        </section>
      </div>
    </>
  );
}
