"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers, List, MapPin, SlidersHorizontal, X, ZoomIn } from "lucide-react";
import { CATEGORIES } from "@/domain/categories";
import { buildFilterOptions } from "@/domain/filter-options";
import { activeFilterChips } from "@/domain/filter-chips";
import { filtersToParams, parseFilters } from "@/domain/filters-url";
import { applyFilters, itemPlace, type CatalogFilters, type IndexItem } from "@/domain/index-item";
import { PROTECTION_SHORT } from "@/domain/labels";
import { CategoryBadge, CategoryGlyph } from "@/components/category";
import { RecordVisual } from "@/components/record-visual";
import type { BaseLayer } from "./basemap-style";
import { ActiveFilters, FilterPanel, MapSearch } from "./filter-panel";
import { MapCanvas, type MapView } from "./map-canvas";
import { formatNumber } from "@/lib/format";

const BASES: Array<{ id: BaseLayer; label: string; ign: boolean }> = [
  { id: "papel", label: "Mapa", ign: false },
  { id: "ortofoto", label: "Ortofoto", ign: true },
  { id: "topografico", label: "Topográfico", ign: true },
];
const CANARIAS: MapView = { lat: 28.35, lon: -15.8, zoom: 6.6 };

function parseView(v: string | null): MapView | undefined {
  const m = v?.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)$/);
  return m ? { lat: Number(m[1]), lon: Number(m[2]), zoom: Number(m[3]) } : undefined;
}

/** Floating detail of the selected place, kept over the map so the filters stay put. */
function PlaceCard({ item, onClose, onZoom }: { item: IndexItem; onClose: () => void; onZoom: () => void }) {
  return (
    <article
      className="relative overflow-hidden border border-ink bg-card shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
      aria-label={`Elemento seleccionado: ${item.name}`}
      aria-live="polite"
    >
      <RecordVisual
        image={item.image}
        family={item.family}
        className="aspect-[16/9] max-md:aspect-[3/1]"
        sizes="(min-width: 768px) 360px, 100vw"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-full bg-card/90 shadow-sm hover:bg-card"
        aria-label="Cerrar selección"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
      <div className="p-4">
        <CategoryBadge family={item.family} compact />
        <h2 className="mt-1.5 font-display text-[1.45rem] leading-tight">{item.name}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
          <MapPin className="mt-0.5 size-4 shrink-0 text-iron" aria-hidden="true" />
          {itemPlace(item) || "Localización sin municipio asignado"}
        </p>
        {item.chronology || item.protection.length ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.chronology ? <span className="font-mono text-xs text-iron">{item.chronology}</span> : null}
            {item.protection.map((p) => (
              <span key={p} className="border border-rule-strong px-1.5 py-0.5 text-[0.7rem] text-ink-soft">
                {PROTECTION_SHORT[p]}
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/patrimonio/${item.slug}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-rust px-4 text-paper no-underline hover:bg-rust-deep"
          >
            Abrir la ficha <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onZoom}
            className="inline-flex min-h-11 items-center gap-1.5 border border-rule-strong px-3 text-sm hover:border-ink"
          >
            <ZoomIn className="size-4" aria-hidden="true" /> Acercar
          </button>
        </div>
      </div>
    </article>
  );
}

function Legend() {
  return (
    <details className="group border border-rule-strong bg-card/95 text-sm shadow-sm">
      <summary className="signage flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 text-ink-soft">
        <Layers className="size-4" aria-hidden="true" /> Leyenda
      </summary>
      <ul className="grid gap-1.5 px-3 pb-3">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <CategoryGlyph family={c.id} className="size-5 rounded-full text-[0.65rem]" />
            {c.shortLabel}
          </li>
        ))}
        <li className="mt-1 flex items-center gap-2 text-iron">
          <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-ink bg-card text-[0.6rem] font-semibold text-ink">
            12
          </span>
          Grupo de elementos
        </li>
      </ul>
    </details>
  );
}

function Counter({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="flex items-baseline gap-2" role="status" aria-live="polite">
      <strong className="font-display text-3xl leading-none font-normal">{formatNumber(shown)}</strong>
      <span className="text-sm text-ink-soft">
        {shown === total ? "elementos en el mapa" : `de ${formatNumber(total)} elementos`}
      </span>
    </p>
  );
}

export function MapExplorer({ items: allItems }: { items: IndexItem[] }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters>(() => parseFilters(searchParams));
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => allItems.find((i) => i.slug === searchParams.get("sel"))?.id,
  );
  const [base, setBase] = useState<BaseLayer>("papel");
  const [view, setView] = useState<MapView | undefined>(() => parseView(searchParams.get("v")));
  const [initialView] = useState<MapView | undefined>(() => {
    const v = parseView(searchParams.get("v"));
    const sel = allItems.find((i) => i.slug === searchParams.get("sel"));
    return v ?? (sel ? { lat: sel.lat, lon: sel.lon, zoom: 12 } : undefined);
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<(MapView & { key: number }) | undefined>();

  const options = useMemo(() => buildFilterOptions(allItems), [allItems]);
  const items = useMemo(() => applyFilters(allItems, filters), [allItems, filters]);
  const selected = selectedId ? allItems.find((i) => i.id === selectedId) : undefined;
  const activeCount = activeFilterChips(filters).length;

  useEffect(() => {
    const params = filtersToParams(filters, {
      sel: selected?.slug,
      v: view ? `${view.lat.toFixed(4)},${view.lon.toFixed(4)},${view.zoom.toFixed(1)}` : undefined,
    });
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters, selected, view]);

  const onSelect = useCallback((id: string | undefined) => setSelectedId(id), []);
  const pick = (item: IndexItem) => {
    setSelectedId(item.id);
    setSheetOpen(false);
  };
  const zoomTo = (item: IndexItem) => setFlyTo({ lat: item.lat, lon: item.lon, zoom: 15, key: Date.now() });
  const listHref = `/catalogo?${filtersToParams(filters).toString()}`;

  const search = (id: string) => (
    <MapSearch
      id={id}
      value={filters.q ?? ""}
      onChange={(q) =>
        setFilters((f) => {
          const next = { ...f, q };
          if (!q) delete next.q;
          return next;
        })
      }
      items={items}
      onPick={pick}
    />
  );
  const footer = (
    <div className="flex items-center gap-2 border-t border-rule bg-paper px-4 py-3">
      <Link
        href={listHref}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-ink text-sm no-underline hover:bg-paper-deep"
      >
        <List className="size-4" aria-hidden="true" /> Ver como lista
      </Link>
      {activeCount ? (
        <button
          type="button"
          onClick={() => setFilters({})}
          className="min-h-11 px-3 text-sm text-rust underline underline-offset-2"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="absolute inset-0 lg:grid lg:grid-cols-[360px_1fr]">
      {/* Desktop sidebar: filters only; the selected place floats over the map. */}
      <aside className="hidden min-h-0 flex-col border-r border-rule bg-paper lg:flex" aria-label="Filtros del mapa">
        <div className="space-y-4 px-5 pt-5 pb-4">
          <div>
            <p className="signage text-rust">Atlas</p>
            <h1 className="font-display text-[1.9rem] leading-tight">Explorar el mapa</h1>
          </div>
          {search("d-q")}
          <Counter shown={items.length} total={allItems.length} />
          <ActiveFilters filters={filters} onChange={setFilters} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1">
          <FilterPanel filters={filters} options={options} onChange={setFilters} idPrefix="d" />
        </div>
        {footer}
      </aside>

      <div className="relative h-full min-h-0">
        <MapCanvas
          items={items}
          selectedId={selectedId}
          onSelect={onSelect}
          base={base}
          initialView={initialView}
          onViewChange={setView}
          flyTo={flyTo}
          ariaLabel={`Mapa interactivo con ${items.length} elementos del patrimonio industrial`}
        />

        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <fieldset className="flex border border-rule-strong bg-card text-sm shadow-sm">
              <legend className="sr-only">Mapa base</legend>
              {BASES.map((b) => (
                <label
                  key={b.id}
                  className={`cursor-pointer px-2.5 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rust ${base === b.id ? "bg-ink text-paper" : "hover:bg-paper-deep"}`}
                >
                  <input
                    type="radio"
                    name="base"
                    value={b.id}
                    checked={base === b.id}
                    onChange={() => setBase(b.id)}
                    className="sr-only"
                  />
                  {b.label}
                  {b.ign ? <span className="hidden sm:inline"> IGN</span> : null}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={() => setFlyTo({ ...CANARIAS, key: Date.now() })}
              className="border border-rule-strong bg-card px-2.5 py-2 text-sm shadow-sm hover:border-ink"
            >
              Canarias
            </button>
          </div>
          {selected ? (
            <div className="hidden w-[360px] md:block">
              <PlaceCard item={selected} onClose={() => setSelectedId(undefined)} onZoom={() => zoomTo(selected)} />
            </div>
          ) : null}
        </div>
        <div className="absolute right-3 bottom-20 z-10 hidden max-w-[12rem] md:block lg:bottom-8">
          <Legend />
        </div>

        {/* Below lg: filters live in a sheet (phone) or drawer (tablet), opened from a bottom bar. */}
        <div className="lg:hidden">
          {selected && !sheetOpen ? (
            <div className="absolute inset-x-3 bottom-[4.75rem] z-20 md:hidden">
              <PlaceCard item={selected} onClose={() => setSelectedId(undefined)} onZoom={() => zoomTo(selected)} />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 z-20 flex h-16 items-center gap-2 border-t border-rule bg-paper px-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              aria-controls="map-filters-sheet"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-ink px-3 text-sm text-paper"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Buscar y filtrar
              {activeCount ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-rust text-[0.7rem]">
                  {activeCount}
                </span>
              ) : null}
            </button>
            <span className="px-1 text-sm text-ink-soft" aria-hidden="true">
              <strong className="text-ink">{items.length}</strong> en el mapa
            </span>
            <Link
              href={listHref}
              className="inline-flex size-11 items-center justify-center border border-rule-strong bg-card"
              aria-label="Ver como lista"
            >
              <List className="size-5" aria-hidden="true" />
            </Link>
          </div>
          {sheetOpen ? (
            <section
              id="map-filters-sheet"
              aria-label="Buscar y filtrar"
              className="absolute inset-0 z-30 flex flex-col bg-paper md:right-auto md:w-[380px] md:border-r md:border-rule md:shadow-xl"
              onKeyDown={(e) => e.key === "Escape" && setSheetOpen(false)}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
                <h1 className="font-display text-xl">Explorar el mapa</h1>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex size-11 items-center justify-center"
                  aria-label="Cerrar filtros"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4">
                {search("m-q")}
                <Counter shown={items.length} total={allItems.length} />
                <ActiveFilters filters={filters} onChange={setFilters} />
                <FilterPanel filters={filters} options={options} onChange={setFilters} idPrefix="m" />
              </div>
              <div className="flex items-center gap-2 border-t border-rule px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="min-h-12 flex-1 bg-rust text-paper hover:bg-rust-deep"
                >
                  Ver {formatNumber(items.length)} en el mapa
                </button>
                {activeCount ? (
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="min-h-12 px-3 text-sm text-rust underline underline-offset-2"
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
