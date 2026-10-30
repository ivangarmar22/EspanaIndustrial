import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedRecords } from "@/data-access/catalog";
import type { CategoryFamilyId } from "@/domain/categories";
import { formatHistoricalDate } from "@/domain/dates";
import { PERIODS } from "@/domain/filter-options";
import { CategoryGlyph } from "@/components/category";
import { PageHeader } from "@/components/page-header";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Historia y cronología",
  description:
    "Cronología de los elementos del patrimonio industrial documentados en el atlas, por décadas y periodos.",
  alternates: { canonical: "/cronologia" },
};

interface Dated {
  id: string;
  slug: string;
  name: string;
  family: CategoryFamilyId;
  start: number;
  precise: boolean;
  label: string;
  original: string;
}

export default async function ChronologyPage() {
  const records = await getPublishedRecords();
  const dated: Dated[] = [];
  let undated = 0;
  for (const r of records) {
    const from = r.chronology?.value.from;
    if (!from) {
      undated++;
      continue;
    }
    const start =
      from.kind === "year" || from.kind === "circa"
        ? from.year
        : from.kind === "range"
          ? from.from
          : (from.century - 1) * 100 + 1;
    dated.push({
      id: r.id,
      slug: r.slug,
      name: r.name.value,
      family: r.category.family,
      start,
      precise: from.kind === "year" || from.kind === "circa",
      label: formatHistoricalDate(from),
      original: r.chronology!.value.label,
    });
  }
  dated.sort((a, b) => a.start - b.start);

  const precise = dated.filter((d) => d.precise && d.start >= 1500);
  const minDecade = Math.floor(Math.min(...precise.map((d) => d.start)) / 10) * 10;
  const maxDecade = Math.floor(Math.max(...precise.map((d) => d.start)) / 10) * 10;
  const decades: Array<{ decade: number; count: number }> = [];
  for (let d = minDecade; d <= maxDecade; d += 10)
    decades.push({ decade: d, count: precise.filter((x) => x.start >= d && x.start < d + 10).length });
  const peak = Math.max(...decades.map((d) => d.count), 1);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Cronología" }]}
        eyebrow="Historia"
        title="Cronología de la industrialización documentada"
        lead={
          <p>
            Fecha de inicio que recogen las fuentes para {formatNumber(dated.length)} de los{" "}
            {formatNumber(records.length)} elementos del atlas. {undated} no tienen una cronología interpretable y no
            aparecen aquí. No es todavía una cronología general de la industrialización española: solo refleja los
            elementos documentados.
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <figure aria-labelledby="hist-title">
          <h2 id="hist-title" className="font-display text-2xl">
            Elementos según la década de inicio
          </h2>
          <p className="mt-1 text-sm text-iron">
            {formatNumber(precise.length)} elementos con año exacto o aproximado. Las fechas expresadas solo como siglo
            no se representan para no situarlas en una década concreta.
          </p>
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="relative h-56 min-w-[640px] border-b border-ink">
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {decades.map((d) => (
                  <Link
                    key={d.decade}
                    href={`/catalogo?desde=${d.decade}&hasta=${d.decade + 9}&orden=antiguos`}
                    className="group relative flex h-full flex-1 items-end no-underline focus-visible:outline-offset-0"
                    aria-label={`${d.decade}–${d.decade + 9}: ${d.count} ${d.count === 1 ? "elemento" : "elementos"}`}
                  >
                    <span
                      className="block w-full rounded-t-[4px] bg-rust transition-colors group-hover:bg-rust-deep group-focus-visible:bg-rust-deep"
                      style={{ height: d.count ? `${(d.count / peak) * 100}%` : "0" }}
                    />
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border border-rule-strong bg-card px-2 py-1 text-xs whitespace-nowrap text-ink shadow-sm group-hover:block group-focus-visible:block"
                    >
                      {d.decade}–{d.decade + 9}: <strong>{formatNumber(d.count)}</strong>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex min-w-[640px] justify-between pt-1 font-mono text-xs text-iron" aria-hidden="true">
              {decades
                .filter((d) => d.decade % 50 === 0)
                .map((d) => (
                  <span key={d.decade}>{d.decade}</span>
                ))}
            </div>
          </div>
          <figcaption className="mt-2 text-sm text-ink-soft">
            Pulsa una barra para ver esos elementos en el catálogo. La lista de abajo contiene los mismos datos en forma
            de tabla.
          </figcaption>
        </figure>

        <div className="mt-16 space-y-12">
          {PERIODS.map((p) => {
            const list = dated.filter(
              (d) => (p.from === undefined || d.start >= p.from) && (p.to === undefined || d.start <= p.to),
            );
            if (!list.length) return null;
            return (
              <section key={p.id} aria-labelledby={`p-${p.id}`}>
                <h2 id={`p-${p.id}`} className="font-display text-3xl">
                  {p.label} <span className="font-mono text-base text-iron">{list.length}</span>
                </h2>
                <ol className="mt-4 divide-y divide-rule border-y border-rule">
                  {list.map((d) => (
                    <li
                      key={d.id}
                      className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 py-2.5 sm:grid-cols-[7rem_1fr_auto]"
                    >
                      <span className="font-mono text-sm text-ink">{d.label}</span>
                      <span className="flex items-center gap-2">
                        <CategoryGlyph family={d.family} />
                        <Link href={`/patrimonio/${d.slug}`}>{d.name}</Link>
                      </span>
                      <span className="col-start-2 text-xs text-iron sm:col-start-auto">Fuente: «{d.original}»</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
