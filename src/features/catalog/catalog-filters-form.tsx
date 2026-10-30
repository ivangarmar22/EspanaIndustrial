import Link from "next/link";
import { Search } from "lucide-react";
import { Select } from "@/components/select";
import { PERIODS, type FilterOptions } from "@/domain/filter-options";
import { filtersToParams } from "@/domain/filters-url";
import type { CatalogFilters } from "@/domain/index-item";
import { PROVINCES, REGIONS } from "@/domain/territory";

const labelCls = "mb-1.5 block text-sm font-medium text-ink-soft";

/**
 * Plain GET form: works without JavaScript and produces shareable URLs.
 * Options and counts come from the real catalogue.
 */
export function CatalogFiltersForm({
  filters,
  options,
  view,
  sort,
}: {
  filters: CatalogFilters;
  options: FilterOptions;
  view?: string;
  sort?: string;
}) {
  const regionSlug = REGIONS.find((r) => r.code === filters.region)?.slug;
  const provinceSlug = PROVINCES.find((p) => p.code === filters.province)?.slug;
  const family = options.families.find((f) => f.id === filters.family);
  const period = PERIODS.find((p) => p.from === filters.from && p.to === filters.to);

  return (
    <form action="/catalogo" method="get" className="grid gap-5" aria-label="Filtrar el catálogo">
      {view ? <input type="hidden" name="vista" value={view} /> : null}
      {sort ? <input type="hidden" name="orden" value={sort} /> : null}
      <div>
        <label htmlFor="cf-q" className={labelCls}>
          Buscar
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-[1.1rem] -translate-y-1/2 text-iron"
            aria-hidden="true"
          />
          <input
            id="cf-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Nombre, municipio, tipo…"
            className="ctl search-input pl-10"
          />
        </div>
      </div>
      <div>
        <label htmlFor="cf-cat" className={labelCls}>
          Categoría
        </label>
        <Select
          id="cf-cat"
          name="categoria"
          defaultValue={filters.family ?? ""}
          options={[
            { value: "", label: "Todas" },
            ...options.families.map((f) => ({ value: f.id, label: f.label, count: f.count })),
          ]}
        />
      </div>
      {family && family.subs.length > 1 ? (
        <div>
          <label htmlFor="cf-sub" className={labelCls}>
            Tipo
          </label>
          <Select
            id="cf-sub"
            name="tipo"
            defaultValue={filters.sub ?? ""}
            options={[
              { value: "", label: "Todos" },
              ...family.subs.map((s) => ({ value: s.id, label: s.label, count: s.count })),
            ]}
          />
        </div>
      ) : null}
      <div>
        <label htmlFor="cf-reg" className={labelCls}>
          Comunidad autónoma
        </label>
        <Select
          id="cf-reg"
          name="comunidad"
          defaultValue={regionSlug ?? ""}
          options={[
            { value: "", label: "Todas" },
            ...options.regions.map((r) => ({ value: r.slug, label: r.name, count: r.count })),
          ]}
        />
      </div>
      <div>
        <label htmlFor="cf-prov" className={labelCls}>
          Provincia
        </label>
        <Select
          id="cf-prov"
          name="provincia"
          defaultValue={provinceSlug ?? ""}
          searchable
          options={[
            { value: "", label: "Todas" },
            ...options.provinces
              .filter((p) => !filters.region || p.regionCode === filters.region)
              .map((p) => ({ value: p.slug, label: p.name, count: p.count })),
          ]}
        />
      </div>
      <fieldset>
        <legend className={labelCls}>Periodo documentado</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="cf-from" className="text-xs text-iron">
              Desde (año)
            </label>
            <input
              id="cf-from"
              name="desde"
              type="number"
              inputMode="numeric"
              min={-3000}
              max={2100}
              defaultValue={filters.from}
              className="ctl"
            />
          </div>
          <div>
            <label htmlFor="cf-to" className="text-xs text-iron">
              Hasta (año)
            </label>
            <input
              id="cf-to"
              name="hasta"
              type="number"
              inputMode="numeric"
              min={-3000}
              max={2100}
              defaultValue={filters.to}
              className="ctl"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/catalogo?${filtersToParams({ ...filters, from: p.from, to: p.to }, { vista: view, orden: sort }).toString()}`}
              aria-current={period?.id === p.id ? "true" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm no-underline ${period?.id === p.id ? "border-ink bg-ink text-paper" : "border-rule-strong bg-card text-ink"}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="cf-prot" className={labelCls}>
          Protección
        </label>
        <Select
          id="cf-prot"
          name="proteccion"
          defaultValue={filters.protection === "any" ? "cualquiera" : (filters.protection ?? "")}
          options={[
            { value: "", label: "Cualquiera o sin datos" },
            { value: "cualquiera", label: "Con alguna protección documentada" },
            ...options.protections.map((p) => ({ value: p.id, label: p.label, count: p.count })),
          ]}
        />
      </div>
      <div>
        <label htmlFor="cf-cons" className={labelCls}>
          Conservación (según la ficha)
        </label>
        <Select
          id="cf-cons"
          name="conservacion"
          defaultValue={filters.conservation ?? ""}
          options={[
            { value: "", label: "Cualquiera o sin datos" },
            ...options.conservations.map((c) => ({ value: c.id, label: c.label, count: c.count })),
          ]}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-rule pt-3">
        <span className="flex-1 text-[0.95rem]">Solo con fotografía con licencia</span>
        <input
          type="checkbox"
          role="switch"
          name="foto"
          value="1"
          defaultChecked={filters.withImage}
          className="switch"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="min-h-11 flex-1 rounded-full bg-ink px-4 text-paper hover:bg-ink-soft">
          Aplicar filtros
        </button>
        <Link href="/catalogo" className="inline-flex min-h-11 items-center px-3 text-sm text-ink-soft">
          Limpiar
        </Link>
      </div>
    </form>
  );
}
