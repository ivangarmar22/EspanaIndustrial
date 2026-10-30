"use client";

import { useId, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { getFamily, type CategoryFamilyId } from "@/domain/categories";
import { activeFilterChips, removeFilter } from "@/domain/filter-chips";
import { PERIODS, type FilterOptions } from "@/domain/filter-options";
import { itemPlace, searchItems, type CatalogFilters, type IndexItem } from "@/domain/index-item";
import { CategoryGlyph, FAMILY_CLASSES } from "@/components/category";
import { Select } from "@/components/select";
import { formatNumber } from "@/lib/format";

interface Props {
  filters: CatalogFilters;
  options: FilterOptions;
  onChange: (f: CatalogFilters) => void;
  idPrefix: string;
}

const labelCls = "mb-1.5 block text-sm font-medium text-ink-soft";

export function ActiveFilters({
  filters,
  onChange,
}: {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
}) {
  const chips = activeFilterChips(filters);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(removeFilter(filters, c.key))}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ink bg-ink py-0.5 pr-2 pl-3 text-xs text-paper hover:bg-ink-soft"
        >
          {c.label}
          <X className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(quitar filtro)</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Search box that filters the map and offers the first matches as a listbox,
 * so a place can be located without a results list (ARIA combobox pattern).
 */
export function MapSearch({
  value,
  onChange,
  items,
  onPick,
  id,
}: {
  value: string;
  onChange: (q: string | undefined) => void;
  items: IndexItem[];
  onPick: (item: IndexItem) => void;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const q = value.trim();
  const matches = q.length >= 2 ? searchItems(items, q, 6) : [];
  const expanded = open && matches.length > 0;
  const pick = (item: IndexItem) => {
    onPick(item);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Buscar en el mapa
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-[1.15rem] -translate-y-1/2 text-iron"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value || undefined);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!expanded) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + step + matches.length) % matches.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(matches[active]!);
          }
        }}
        placeholder="Nombre, municipio, tipo…"
        className="ctl search-input h-12 pr-11 pl-10 text-base"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-iron hover:bg-paper-deep hover:text-ink"
          aria-label="Borrar búsqueda"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <ul
        id={listId}
        role="listbox"
        aria-label="Coincidencias"
        hidden={!expanded}
        className="select-pop absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-ink bg-card py-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)]"
      >
        {matches.map((m, n) => (
          <li
            key={m.id}
            id={`${listId}-${n}`}
            role="option"
            aria-selected={n === active}
            // mousedown keeps focus in the input so blur does not close the list before the click lands.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(m);
            }}
            className={`mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 ${n === active ? "bg-paper-deep" : "hover:bg-paper-deep"}`}
          >
            <CategoryGlyph family={m.family} className="size-6 rounded-full text-[0.7rem]" />
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] leading-snug">{m.name}</span>
              <span className="block truncate text-xs text-iron">{itemPlace(m)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  active,
  defaultOpen,
  children,
}: {
  title: string;
  active: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-t border-rule" open={defaultOpen || active > 0}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{title}</span>
        {active ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-rust text-[0.7rem] text-paper">
            {active}
            <span className="sr-only"> filtros activos</span>
          </span>
        ) : null}
        <ChevronDown className="size-4 text-iron transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="grid gap-4 pb-5">{children}</div>
    </details>
  );
}

export function FilterPanel({ filters, options, onChange, idPrefix }: Props) {
  const set = (patch: Partial<CatalogFilters>) => {
    const next = { ...filters, ...patch };
    for (const k of Object.keys(next) as Array<keyof CatalogFilters>)
      if (next[k] === undefined || next[k] === "") delete next[k];
    onChange(next);
  };
  const family = filters.family ? options.families.find((f) => f.id === filters.family) : undefined;
  const provinces = options.provinces.filter((p) => !filters.region || p.regionCode === filters.region);
  const activePeriod = PERIODS.find((p) => p.from === filters.from && p.to === filters.to);
  const maxCount = Math.max(...options.families.map((f) => f.count));
  const count = (...keys: Array<keyof CatalogFilters>) => keys.filter((k) => filters[k] !== undefined).length;

  return (
    <div className="grid">
      <fieldset className="pb-5">
        <legend className="mb-2.5 font-medium">Categoría</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {options.families.map((f) => {
            const id = f.id as CategoryFamilyId;
            const active = filters.family === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => set({ family: active ? undefined : id, sub: undefined })}
                className={`relative flex min-h-14 flex-col justify-between gap-1 overflow-hidden border px-2.5 pt-2 pb-2.5 text-left transition-colors ${
                  active
                    ? "border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]"
                    : "border-rule bg-card/60 hover:border-rule-strong hover:bg-card"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CategoryGlyph family={id} className="size-5 rounded-full text-[0.65rem]" />
                  <span className="min-w-0 flex-1 truncate text-sm leading-tight">{getFamily(id).shortLabel}</span>
                  <span className="font-mono text-xs text-iron">{formatNumber(f.count)}</span>
                </span>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-rule/60">
                  <span
                    className={`block h-full ${FAMILY_CLASSES[id].bg}`}
                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
        {family && family.subs.length > 1 ? (
          <div className="mt-3">
            <label htmlFor={`${idPrefix}-sub`} className={labelCls}>
              Tipo de {getFamily(family.id as CategoryFamilyId).shortLabel.toLowerCase()}
            </label>
            <Select
              id={`${idPrefix}-sub`}
              value={filters.sub ?? ""}
              onChange={(v) => set({ sub: v || undefined })}
              options={[
                { value: "", label: "Todos", count: family.count },
                ...family.subs.map((s) => ({ value: s.id, label: s.label, count: s.count })),
              ]}
            />
          </div>
        ) : null}
      </fieldset>

      <Section title="Territorio" active={count("region", "province")}>
        <div>
          <label htmlFor={`${idPrefix}-region`} className={labelCls}>
            Comunidad autónoma
          </label>
          <Select
            id={`${idPrefix}-region`}
            value={filters.region ?? ""}
            onChange={(v) => set({ region: v || undefined, province: undefined })}
            options={[
              { value: "", label: "Todas" },
              ...options.regions.map((r) => ({ value: r.code, label: r.name, count: r.count })),
            ]}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-province`} className={labelCls}>
            Provincia
          </label>
          <Select
            id={`${idPrefix}-province`}
            value={filters.province ?? ""}
            onChange={(v) => set({ province: v || undefined })}
            searchable={provinces.length > 12}
            options={[
              { value: "", label: "Todas" },
              ...provinces.map((p) => ({ value: p.code, label: p.name, count: p.count })),
            ]}
          />
        </div>
      </Section>

      <Section title="Periodo documentado" active={activePeriod || filters.from || filters.to ? 1 : 0}>
        <fieldset>
          <legend className="sr-only">Periodo documentado</legend>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => {
              const active = activePeriod?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set(active ? { from: undefined, to: undefined } : { from: p.from, to: p.to })}
                  className={`min-h-9 rounded-full border px-3 text-sm ${active ? "border-ink bg-ink text-paper" : "border-rule-strong bg-card hover:border-ink"}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-iron">
            Los elementos sin fechas documentadas no aparecen al filtrar por periodo.
          </p>
        </fieldset>
      </Section>

      <Section title="Protección y estado" active={count("protection", "conservation")}>
        <div>
          <label htmlFor={`${idPrefix}-prot`} className={labelCls}>
            Protección
          </label>
          <Select
            id={`${idPrefix}-prot`}
            value={filters.protection ?? ""}
            onChange={(v) => set({ protection: (v || undefined) as CatalogFilters["protection"] })}
            options={[
              { value: "", label: "Cualquiera o sin datos" },
              { value: "any", label: "Con alguna protección documentada" },
              ...options.protections.map((p) => ({ value: p.id, label: p.label, count: p.count })),
            ]}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-cons`} className={labelCls}>
            Estado de conservación (según la ficha)
          </label>
          <Select
            id={`${idPrefix}-cons`}
            value={filters.conservation ?? ""}
            onChange={(v) => set({ conservation: (v || undefined) as CatalogFilters["conservation"] })}
            options={[
              { value: "", label: "Cualquiera o sin datos" },
              ...options.conservations.map((c) => ({ value: c.id, label: c.label, count: c.count })),
            ]}
          />
        </div>
      </Section>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-rule py-2">
        <span className="flex-1 font-medium">Solo con fotografía</span>
        <input
          type="checkbox"
          role="switch"
          checked={!!filters.withImage}
          onChange={(e) => set({ withImage: e.target.checked || undefined })}
          className="switch"
        />
      </label>
    </div>
  );
}
