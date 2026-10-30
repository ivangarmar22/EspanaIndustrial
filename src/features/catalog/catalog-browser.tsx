"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Map as MapIcon, X } from "lucide-react";
import { activeFilterChips, removeFilter } from "@/domain/filter-chips";
import type { FilterOptions } from "@/domain/filter-options";
import { SORT_PARAM, filtersToParams, parseFilters, parseSort } from "@/domain/filters-url";
import { SORTS, applyFilters, type CatalogFilters, type IndexItem } from "@/domain/index-item";
import { RecordCard, RecordRow } from "@/components/record-card";
import { formatNumber } from "@/lib/format";
import { CatalogFiltersForm } from "./catalog-filters-form";
import { FiltersDisclosure } from "./filters-disclosure";

const PER_PAGE = 24;

/** Filters, sorting and pagination read from the URL and applied in the browser (the site is static). */
export function CatalogBrowser({ all, options }: { all: IndexItem[]; options: FilterOptions }) {
  const sp = useSearchParams();
  const filters = parseFilters(sp);
  const sort = parseSort(sp);
  const view = sp.get("vista") === "cuadricula" ? "cuadricula" : "lista";
  const results = applyFilters(all, filters).sort(SORTS[sort]);
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(sp.get("pagina")) || 1), pages);
  const shown = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const extra = { vista: view === "cuadricula" ? view : undefined, orden: SORT_PARAM[sort] };
  const hrefWith = (f: CatalogFilters, more: Record<string, string | undefined> = {}) => {
    const qs = filtersToParams(f, { ...extra, ...more }).toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  };
  const chips = activeFilterChips(filters);

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
      <aside aria-label="Filtros">
        <FiltersDisclosure activeCount={chips.length}>
          <CatalogFiltersForm
            key={sp.toString()}
            filters={filters}
            options={options}
            view={extra.vista}
            sort={extra.orden}
          />
        </FiltersDisclosure>
      </aside>

      <section aria-labelledby="resultados" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
          <h2 id="resultados" className="text-sm" aria-live="polite">
            <strong className="font-semibold">{formatNumber(results.length)}</strong>{" "}
            {results.length === 1 ? "elemento" : "elementos"}
            {pages > 1 ? ` · página ${formatNumber(page)} de ${formatNumber(pages)}` : ""}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-iron">Ordenar:</span>
            {(
              [
                ["name", "A–Z"],
                ["oldest", "Más antiguos"],
                ["newest", "Más recientes"],
              ] as const
            ).map(([k, label]) => (
              <Link
                key={k}
                href={hrefWith(filters, { orden: SORT_PARAM[k] })}
                aria-current={sort === k ? "true" : undefined}
                className={sort === k ? "font-semibold text-ink no-underline" : "text-ink-soft"}
              >
                {label}
              </Link>
            ))}
            <span className="mx-1 h-5 w-px bg-rule" aria-hidden="true" />
            <Link
              href={hrefWith(filters, { vista: undefined })}
              aria-label="Vista de lista"
              aria-current={view === "lista" ? "true" : undefined}
              className={`inline-flex size-9 items-center justify-center border ${view === "lista" ? "border-ink" : "border-transparent"}`}
            >
              <List className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={hrefWith(filters, { vista: "cuadricula" })}
              aria-label="Vista de cuadrícula"
              aria-current={view === "cuadricula" ? "true" : undefined}
              className={`inline-flex size-9 items-center justify-center border ${view === "cuadricula" ? "border-ink" : "border-transparent"}`}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/mapa?${filtersToParams(filters).toString()}`}
              className="inline-flex min-h-9 items-center gap-1.5 border border-rule-strong px-2.5 text-ink no-underline"
            >
              <MapIcon className="size-4" aria-hidden="true" /> Ver en el mapa
            </Link>
          </div>
        </div>

        {chips.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
            {chips.map((c) => (
              <Link
                key={c.key}
                href={hrefWith(removeFilter(filters, c.key))}
                className="inline-flex min-h-8 items-center gap-1 border border-ink bg-ink px-2 text-xs text-paper no-underline"
              >
                {c.label} <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(quitar filtro)</span>
              </Link>
            ))}
            <Link href="/catalogo" className="px-2 text-xs text-rust">
              Quitar todos
            </Link>
          </div>
        ) : null}

        {shown.length === 0 ? (
          <div className="blueprint mt-6 p-10 text-center">
            <p className="font-display text-2xl">Ningún elemento cumple estos filtros</p>
            <p className="mt-2 text-ink-soft">
              Prueba a quitar algún filtro o a buscar con otras palabras. Recuerda que al filtrar por periodo se
              excluyen los elementos sin fechas documentadas.
            </p>
            <Link href="/catalogo" className="mt-4 inline-block">
              Ver todo el catálogo
            </Link>
          </div>
        ) : view === "cuadricula" ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((i, idx) => (
              <RecordCard key={i.id} item={i} priority={idx < 3} />
            ))}
          </div>
        ) : (
          <div className="mt-2">
            {shown.map((i) => (
              <RecordRow key={i.id} item={i} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <nav aria-label="Paginación" className="mt-10 flex flex-wrap items-center gap-1.5">
            {page > 1 ? (
              <Link
                href={hrefWith(filters, { pagina: String(page - 1) })}
                rel="prev"
                className="min-h-10 border border-rule-strong px-3 py-2 text-sm no-underline"
              >
                ← Anterior
              </Link>
            ) : null}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={hrefWith(filters, { pagina: n > 1 ? String(n) : undefined })}
                aria-current={n === page ? "page" : undefined}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center border text-sm no-underline ${n === page ? "border-ink bg-ink text-paper" : "border-rule-strong text-ink"}`}
              >
                {n}
              </Link>
            ))}
            {page < pages ? (
              <Link
                href={hrefWith(filters, { pagina: String(page + 1) })}
                rel="next"
                className="min-h-10 border border-rule-strong px-3 py-2 text-sm no-underline"
              >
                Siguiente →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
