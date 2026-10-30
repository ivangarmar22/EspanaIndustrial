import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { absoluteUrl, site } from "@/config/site";
import { getIndexItems, getPublishedRecords, getRecordBySlug } from "@/data-access/catalog";
import { getFamily, getSubcategory } from "@/domain/categories";
import { formatHistoricalDate } from "@/domain/dates";
import { CONSERVATION_LABELS, PHYSICAL_STATE_LABELS, PROTECTION_LABELS, VALIDATION_LABELS } from "@/domain/labels";
import type { HeritageRecord, Period } from "@/domain/schema";
import { getProvince, getRegion } from "@/domain/territory";
import { distanceMeters, formatCoordinates } from "@/lib/geo";
import { BreadcrumbJsonLd } from "@/components/page-header";
import { CategoryBadge, FAMILY_HEX } from "@/components/category";
import { RecordCard } from "@/components/record-card";
import { RecordVisual } from "@/components/record-visual";
import { HistoricalCompare } from "@/features/record/historical-compare";
import { LocatorMap } from "@/features/record/locator-map";
import { Alternatives, Cite, SourcesTable } from "@/features/record/provenance";
import { RecordActions } from "@/features/record/record-actions";
import { formatKm, formatNumber } from "@/lib/format";

export async function generateStaticParams() {
  return (await getPublishedRecords()).map((r) => ({ slug: r.slug }));
}

const periodText = (p: Period) =>
  p.from && p.to
    ? `${formatHistoricalDate(p.from)}–${formatHistoricalDate(p.to)}`
    : p.from
      ? `desde ${formatHistoricalDate(p.from)}`
      : p.label;

function placeLine(r: HeritageRecord) {
  const muni = r.location.municipality?.value.name;
  const prov = r.location.provinceCode ? getProvince(r.location.provinceCode)?.name : undefined;
  const reg = r.location.regionCode ? getRegion(r.location.regionCode)?.name : undefined;
  return [muni, prov !== muni ? prov : undefined, reg !== prov ? reg : undefined].filter(Boolean).join(" · ");
}

export async function generateMetadata({ params }: PageProps<"/patrimonio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getRecordBySlug(slug);
  if (!found) return { title: "Elemento no encontrado" };
  const r = found.record;
  const fam = getFamily(r.category.family);
  const description = (r.summary?.value ?? `${fam.label} en ${placeLine(r)}.`).slice(0, 158);
  const img = r.images?.find((i) => i.localPath);
  return {
    title: `${r.name.value}${r.location.municipality ? ` (${r.location.municipality.value.name})` : ""}`,
    description,
    alternates: { canonical: `/patrimonio/${r.slug}` },
    openGraph: {
      title: r.name.value,
      description,
      url: `/patrimonio/${r.slug}`,
      type: "article",
      ...(img?.localPath
        ? { images: [{ url: img.localPath, width: img.width, height: img.height, alt: img.alt }] }
        : {}),
    },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-rule pt-8">
      <h2 id={id} className="font-display text-2xl font-medium sm:text-[1.7rem]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Prose({ text, src, note }: { text: string; src: string[]; note?: string }) {
  return (
    <div className="prose-ei">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <p className="!mt-3 text-sm text-iron">
        {note ?? "Texto de la fuente; solo se han unido palabras partidas por la maquetación."}
        <Cite src={src} />
      </p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule py-2.5 text-sm last:border-b-0">
      <dt className="signage text-[0.66rem] text-iron">{label}</dt>
      <dd className="mt-1 min-w-0 text-ink">{children}</dd>
    </div>
  );
}

export default async function RecordPage({ params }: PageProps<"/patrimonio/[slug]">) {
  const { slug } = await params;
  const found = await getRecordBySlug(slug);
  if (!found) notFound();
  if (found.redirectTo) permanentRedirect(`/patrimonio/${found.redirectTo}`);
  const r = found.record;

  const family = getFamily(r.category.family);
  const sub = getSubcategory(r.category.family, r.category.sub);
  const region = r.location.regionCode ? getRegion(r.location.regionCode) : undefined;
  const province = r.location.provinceCode ? getProvince(r.location.provinceCode) : undefined;
  const point = r.location.point?.value;
  const image = r.images?.find((i) => i.localPath);
  const fichaFromIpce = r.sources["ipce-ficha"];
  const validation = VALIDATION_LABELS[r.editorial.validation];
  const openDiscrepancies = r.discrepancies ?? [];

  const items = await getIndexItems();
  const nearby = point
    ? items
        .filter((i) => i.id !== r.id)
        .map((i) => ({ i, d: distanceMeters(point, i) }))
        .filter((x) => x.d < 60_000)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
    : [];
  const sameType = items
    .filter(
      (i) =>
        i.id !== r.id &&
        i.family === r.category.family &&
        i.sub === r.category.sub &&
        !nearby.some((n) => n.i.id === i.id),
    )
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LandmarksOrHistoricalBuildings",
    name: r.name.value,
    ...(r.altNames?.length ? { alternateName: r.altNames.map((a) => a.value) } : {}),
    ...(r.summary ? { description: r.summary.value.slice(0, 500) } : {}),
    url: absoluteUrl(`/patrimonio/${r.slug}`),
    ...(point ? { geo: { "@type": "GeoCoordinates", latitude: point.lat, longitude: point.lon } } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "ES",
      ...(r.location.municipality ? { addressLocality: r.location.municipality.value.name } : {}),
      ...(province ? { addressRegion: province.name } : {}),
    },
    ...(image?.localPath ? { image: absoluteUrl(image.localPath) } : {}),
    ...(r.externalIds.wikidata ? { sameAs: [`https://www.wikidata.org/wiki/${r.externalIds.wikidata}`] } : {}),
  };

  const color = FAMILY_HEX[r.category.family];
  const allPoints = point
    ? [
        { ...point, label: r.name.value, color },
        ...(r.location.extraPoints ?? []).map((e) => ({ ...e.point.value, label: e.label, color })),
      ]
    : [];

  return (
    <article className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <BreadcrumbJsonLd
        items={[
          { href: "/", label: "Inicio" },
          { href: "/catalogo", label: "Catálogo" },
          ...(region ? [{ href: `/territorio/${region.slug}`, label: region.name }] : []),
          { label: r.name.value },
        ]}
      />

      <header className="mt-4 grid gap-8 lg:grid-cols-[1fr_minmax(0,34rem)] lg:items-end">
        <div>
          <CategoryBadge family={r.category.family} sub={r.category.sub} />
          <h1 className="mt-4 font-display text-[length:var(--text-headline)] leading-[1.04] font-medium tracking-tight text-balance">
            {r.name.value}
          </h1>
          {r.altNames?.length ? (
            <p className="mt-3 text-ink-soft">
              También: {r.altNames.map((a) => a.value).join(" · ")}
              <Cite src={[...new Set(r.altNames.flatMap((a) => a.src))]} />
            </p>
          ) : null}
          <p className="mt-4 text-lg text-ink-soft">{placeLine(r) || "Localización pendiente de normalizar"}</p>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm text-iron">
            {r.chronology ? <span>{r.chronology.value.label}</span> : null}
            {r.externalIds.ipce ? <span>IPCE {r.externalIds.ipce}</span> : null}
            {r.protection?.map((p) => (
              <span key={p.value.original}>{p.value.level}</span>
            ))}
          </p>
          <div className="mt-6">
            <RecordActions id={r.id} slug={r.slug} name={r.name.value} point={point} />
          </div>
        </div>
        <figure>
          <RecordVisual
            image={
              image ? { src: image.localPath!, width: image.width, height: image.height, alt: image.alt } : undefined
            }
            family={r.category.family}
            point={point}
            className="aspect-[4/3] lg:aspect-[3/2]"
            sizes="(min-width: 1024px) 34rem, 100vw"
            priority
          />
          {image ? (
            <figcaption className="mt-2 text-xs text-iron">
              {image.caption ? `${image.caption}. ` : ""}Foto: {image.author} ·{" "}
              {image.licenseUrl ? (
                <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer license">
                  {image.license}
                </a>
              ) : (
                image.license
              )}{" "}
              ·{" "}
              <a href={image.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                Wikimedia Commons
              </a>
              {image.review !== "reviewed" ? " · Asociación procedente de Wikidata, sin revisión editorial" : ""}
            </figcaption>
          ) : (
            <figcaption className="mt-2 text-xs text-iron">
              No hay ninguna fotografía con licencia libre verificada para este elemento.
            </figcaption>
          )}
        </figure>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0 space-y-12">
          {openDiscrepancies.length ? (
            <aside className="border-l-4 border-warning bg-card p-4" aria-label="Discrepancias entre fuentes">
              <p className="flex items-center gap-2 font-medium text-warning">
                <AlertTriangle className="size-4" aria-hidden="true" /> Las fuentes no coinciden en algún dato
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {openDiscrepancies.map((d, i) => (
                  <li key={i}>
                    {d.note} {d.status === "open" ? <span className="text-iron">(pendiente de revisión)</span> : null}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          {/* The map summary condenses the sheet's history: show it only when there is no fuller text. */}
          {r.summary && !r.history ? (
            <Section id="resumen" title="Resumen">
              <Prose
                text={r.summary.value}
                src={r.summary.src}
                note="Descripción publicada en el mapa del Plan Nacional de Patrimonio Industrial."
              />
            </Section>
          ) : null}
          {r.history ? (
            <Section id="historia" title="Historia">
              <Prose
                text={r.history.value}
                src={r.history.src}
                note={
                  fichaFromIpce
                    ? "Texto extraído automáticamente de la ficha documental del IPCE; puede contener cortes de maquetación."
                    : undefined
                }
              />
            </Section>
          ) : null}
          {r.typology || r.constituentElements ? (
            <Section id="caracteristicas" title="Características arquitectónicas y técnicas">
              {r.typology ? (
                <Prose
                  text={r.typology.value}
                  src={r.typology.src}
                  note="Descripción tipológica de la ficha del IPCE (extracción automática)."
                />
              ) : null}
              {r.constituentElements ? (
                <div className="mt-6">
                  <h3 className="signage text-iron">Elementos constitutivos</h3>
                  <Prose text={r.constituentElements.value} src={r.constituentElements.src} />
                </div>
              ) : null}
              {r.authorship ? (
                <p className="mt-6 text-ink-soft">
                  <span className="signage mr-2 text-iron">Autoría</span>
                  {r.authorship.value}
                  <Cite src={r.authorship.src} />
                </p>
              ) : null}
            </Section>
          ) : null}
          {r.conservation || r.interventions || r.currentUse || r.physicalState ? (
            <Section id="estado" title="Estado documentado">
              {r.conservation ? (
                <div>
                  {r.conservation.value.rating ? (
                    <p className="mb-3">
                      <span className="signage mr-2 text-iron">Valoración en la ficha</span>
                      <strong>{CONSERVATION_LABELS[r.conservation.value.rating]}</strong>
                    </p>
                  ) : null}
                  <Prose
                    text={r.conservation.value.original}
                    src={r.conservation.src}
                    note="Estado descrito por la fuente en la fecha de la ficha; puede no reflejar la situación actual."
                  />
                </div>
              ) : null}
              {r.physicalState ? (
                <p className="mt-4">
                  Estado físico: {PHYSICAL_STATE_LABELS[r.physicalState.value]}
                  <Cite src={r.physicalState.src} />
                </p>
              ) : null}
              {r.currentUse ? (
                <p className="mt-2">
                  Uso actual: {r.currentUse.value}
                  <Cite src={r.currentUse.src} />
                </p>
              ) : null}
              {r.interventions ? (
                <div className="mt-6">
                  <h3 className="signage text-iron">Actuaciones</h3>
                  <Prose text={r.interventions.value} src={r.interventions.src} />
                </div>
              ) : null}
            </Section>
          ) : null}

          {point ? (
            <Section id="localizacion" title="Localización">
              <LocatorMap points={allPoints} ariaLabel={`Mapa de localización de ${r.name.value}`} />
              {r.location.extraPoints?.length ? (
                <p className="mt-3 text-sm text-ink-soft">
                  Este elemento abarca {formatNumber(allPoints.length)} puntos del mapa del IPCE:{" "}
                  {allPoints.map((p) => p.label).join(" · ")}.
                </p>
              ) : null}
              <p className="mt-3 text-sm text-iron">
                Accede solo a espacios públicos o visitables. Muchos elementos industriales son propiedad privada o
                presentan riesgos; este atlas no recomienda entrar en instalaciones cerradas o abandonadas.
              </p>
            </Section>
          ) : null}

          {point ? (
            <Section id="evolucion" title="Evolución del lugar">
              <HistoricalCompare point={point} name={r.name.value} />
            </Section>
          ) : null}

          {r.bibliography || r.documents?.length ? (
            <Section id="documentacion" title="Documentación y bibliografía">
              {r.documents?.length ? (
                <ul className="space-y-2">
                  {r.documents.map((d) => (
                    <li key={d.url}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        {d.title}
                        <span className="sr-only"> (se abre en una pestaña nueva)</span>
                      </a>
                      <Cite src={d.src} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {r.bibliography ? (
                <>
                  <h3 className="signage mt-6 text-iron">Bibliografía y referencias citadas en la ficha del IPCE</h3>
                  <ul className="mt-2 space-y-1.5 text-sm break-words text-ink-soft">
                    {r.bibliography.value.map((b, i) => (
                      <li key={i}>
                        {/^https?:\/\//.test(b) ? (
                          <a href={b} target="_blank" rel="noopener noreferrer nofollow">
                            {b}
                          </a>
                        ) : (
                          b
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-iron">
                    Lista extraída automáticamente; algunas referencias pueden aparecer partidas.
                    <Cite src={r.bibliography.src} />
                  </p>
                </>
              ) : null}
            </Section>
          ) : null}

          <Section id="fuentes" title="Fuentes de esta ficha">
            <p className="mb-4 text-sm text-ink-soft">
              Cada dato indica entre corchetes la fuente de la que procede. Origen de los datos principales: Ministerio
              de Cultura. {site.name} no está afiliado al Ministerio.
            </p>
            <SourcesTable record={r} />
          </Section>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="Ficha técnica">
          <div className="border border-rule bg-card p-5">
            <h2 className="signage text-rust">Ficha técnica</h2>
            <dl className="mt-3">
              <Fact label="Categoría">
                {family.label}
                {sub ? <span className="text-ink-soft"> · {sub.label}</span> : null}
                {r.category.original ? (
                  <span className="block text-xs text-iron">Uso en el mapa del IPCE: {r.category.original}</span>
                ) : null}
              </Fact>
              {r.activity ? (
                <Fact label="Actividad">
                  {r.activity.value}
                  <Cite src={r.activity.src} />
                </Fact>
              ) : null}
              {r.chronology ? (
                <Fact label="Cronología">
                  {periodText(r.chronology.value)}
                  {r.chronology.value.from ? null : (
                    <span className="block text-xs text-iron">
                      Formato de fecha no normalizable; se muestra el texto original.
                    </span>
                  )}
                  <Cite src={r.chronology.src} />
                  <Alternatives claim={r.chronology} render={(v) => v.label} />
                </Fact>
              ) : null}
              {r.inception ? (
                <Fact label="Inicio (Wikidata)">
                  {formatHistoricalDate(r.inception.value)}
                  <Cite src={r.inception.src} />
                </Fact>
              ) : null}
              {r.location.municipality ? (
                <Fact label="Municipio">
                  {r.location.municipality.value.name}
                  {r.location.municipality.value.ineCode ? (
                    <span className="ml-1 font-mono text-xs text-iron">
                      INE {r.location.municipality.value.ineCode}
                    </span>
                  ) : null}
                  <Cite src={r.location.municipality.src} />
                </Fact>
              ) : null}
              {province ? <Fact label="Provincia">{province.name}</Fact> : null}
              {region ? (
                <Fact label="Comunidad">
                  <Link href={`/territorio/${region.slug}`}>{region.name}</Link>
                </Fact>
              ) : null}
              {r.location.address ? (
                <Fact label="Dirección">
                  {r.location.address.value}
                  <Cite src={r.location.address.src} />
                </Fact>
              ) : null}
              {r.location.point ? (
                <Fact label="Coordenadas">
                  <span className="font-mono text-xs">{formatCoordinates(r.location.point.value)}</span>
                  {r.location.precision === "approximate" ? (
                    <span className="block text-xs text-iron">
                      Punto representativo de un conjunto o paisaje extenso.
                    </span>
                  ) : null}
                  <Cite src={r.location.point.src} />
                  <Alternatives
                    claim={r.location.point}
                    render={(v) => <span className="font-mono">{formatCoordinates(v)}</span>}
                  />
                </Fact>
              ) : null}
              {r.location.cadastralRef ? (
                <Fact label="Ref. catastral">
                  <span className="font-mono text-xs">{r.location.cadastralRef.value}</span>
                  <Cite src={r.location.cadastralRef.src} />
                  <Alternatives
                    claim={r.location.cadastralRef}
                    render={(v) => <span className="font-mono">{v}</span>}
                  />
                </Fact>
              ) : null}
              {r.ownership ? (
                <Fact label="Propiedad">
                  {r.ownership.value}
                  <Cite src={r.ownership.src} />
                </Fact>
              ) : null}
              {r.protection?.map((p) => (
                <Fact key={p.value.original} label="Protección">
                  {PROTECTION_LABELS[p.value.level]}
                  <span className="block text-xs text-ink-soft">Según la fuente: «{p.value.original}»</span>
                  {p.value.datesAsPrinted?.length ? (
                    <span className="block text-xs text-iron">
                      Fechas que figuran en la ficha: {p.value.datesAsPrinted.join(", ")}
                    </span>
                  ) : null}
                  <Cite src={p.src} />
                </Fact>
              ))}
              {r.visit?.visitable ? (
                <Fact label="Visitable">
                  {r.visit.visitable.value === "yes"
                    ? "Sí"
                    : r.visit.visitable.value === "partial"
                      ? "Parcialmente"
                      : "No"}
                  <Cite src={r.visit.visitable.src} />
                </Fact>
              ) : null}
              {r.visit?.website ? (
                <Fact label="Web oficial">
                  <a href={r.visit.website.value} target="_blank" rel="noopener noreferrer" className="break-all">
                    {new URL(r.visit.website.value).hostname}
                  </a>
                  <Cite src={r.visit.website.src} />
                </Fact>
              ) : null}
              {r.externalIds.wikidata ? (
                <Fact label="Wikidata">
                  <a
                    href={`https://www.wikidata.org/wiki/${r.externalIds.wikidata}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs"
                  >
                    {r.externalIds.wikidata}
                  </a>
                </Fact>
              ) : null}
              {r.externalIds.bic ? (
                <Fact label="Código BIC">
                  <span className="font-mono text-xs">{r.externalIds.bic}</span>
                </Fact>
              ) : null}
            </dl>
          </div>

          <div className="border border-rule p-5 text-sm">
            <h2 className="signage text-iron">Estado documental</h2>
            <p className="mt-2 font-medium">{validation.label}</p>
            <p className="mt-1 text-ink-soft">{validation.description}</p>
            <p className="mt-3 text-iron">
              Registro actualizado el {new Date(r.editorial.updatedAt).toLocaleDateString("es-ES")}.{" "}
              {r.editorial.lastVerifiedAt
                ? `Verificado editorialmente el ${new Date(r.editorial.lastVerifiedAt).toLocaleDateString("es-ES")}.`
                : "Sin verificación editorial todavía."}
            </p>
            <p className="mt-3">
              <Link href={`/colabora?elemento=${r.slug}#proponer`}>¿Has visto un error? Propón una corrección</Link>
            </p>
          </div>
        </aside>
      </div>

      {nearby.length || sameType.length ? (
        <section aria-labelledby="relacionados" className="mt-20">
          <h2 id="relacionados" className="font-display text-3xl">
            Seguir explorando
          </h2>
          {nearby.length ? (
            <>
              <h3 className="signage mt-6 text-iron">Cerca de aquí</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {nearby.map(({ i, d }) => (
                  <div key={i.id}>
                    <RecordCard item={i} />
                    <p className="mt-1 font-mono text-xs text-iron">
                      a {d < 1000 ? `${Math.round(d)} m` : formatKm(d / 1000)} en línea recta
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {sameType.length ? (
            <>
              <h3 className="signage mt-10 text-iron">Del mismo tipo: {sub?.label ?? family.label}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {sameType.map((i) => (
                  <RecordCard key={i.id} item={i} />
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
