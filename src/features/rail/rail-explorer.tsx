"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  ExternalLink,
  Footprints,
  MapPin,
  Search,
  SlidersHorizontal,
  TrainTrack,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  LINE_PAGE_MIN_STATIONS,
  STATION_STATUS,
  STATION_STATUSES,
  TRACK_KINDS,
  commonsFileUrl,
  type RailLine,
  type RailStation,
  type StationStatus,
  type TrackKind,
} from "@/domain/rail";
import { REGIONS, getProvince } from "@/domain/territory";
import { Select } from "@/components/select";
import { normalizeText } from "@/lib/text";
import { RailCanvas, STATION_COLOR, STATION_NEAR_GREENWAY_COLOR, TRACK_STYLE } from "./rail-canvas";
import { formatNumber } from "@/lib/format";

interface Filters {
  q?: string;
  status?: StationStatus;
  region?: string;
  line?: string;
  greenway?: boolean;
  photo?: boolean;
}

const labelCls = "mb-1.5 block text-sm font-medium text-ink-soft";

const ALL_KINDS: Record<TrackKind, boolean> = { greenway: true, trail: true, abandoned: true, disused: true };

function parseFilters(p: URLSearchParams, fixedLine?: string): Filters {
  const status = p.get("estado") as StationStatus | null;
  return {
    q: p.get("q") || undefined,
    status: status && STATION_STATUSES.includes(status) ? status : undefined,
    region: REGIONS.some((r) => r.code === p.get("comunidad")) ? p.get("comunidad")! : undefined,
    line: fixedLine ?? (p.get("linea") || undefined),
    greenway: p.get("viaverde") === "1" || undefined,
    photo: p.get("foto") === "1" || undefined,
  };
}

function TrackSwatch({ kind }: { kind: TrackKind }) {
  const s = TRACK_STYLE[kind];
  return (
    <svg viewBox="0 0 28 8" className="h-2 w-7 shrink-0" aria-hidden="true">
      <line
        x1="1"
        y1="4"
        x2="27"
        y2="4"
        stroke={s.color}
        strokeWidth={Math.min(s.width, 3)}
        strokeDasharray={s.dash ? s.dash.map((d) => d * 3).join(" ") : undefined}
        strokeLinecap={s.dash ? "butt" : "round"}
      />
    </svg>
  );
}

function StationCard({
  station,
  lines,
  onClose,
}: {
  station: RailStation;
  lines: Map<string, RailLine>;
  onClose: () => void;
}) {
  const province = station.provinceCode ? getProvince(station.provinceCode)?.name : undefined;
  const place = [station.municipality, province].filter(Boolean).join(", ");
  const activeLine = station.lines.find((l) => lines.get(l.id)?.state === "active");
  const years = [
    station.openedYear ? `abierta en ${station.openedYear}` : undefined,
    station.closedYear ? `cerrada en ${station.closedYear}` : undefined,
  ].filter(Boolean);
  return (
    <article
      className="relative max-h-full overflow-y-auto border border-ink bg-card p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
      aria-label={`Estación seleccionada: ${station.name}`}
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-full hover:bg-paper-deep"
        aria-label="Cerrar selección"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
      <p className="signage pr-10 text-cat-transporte">Estación · {STATION_STATUS[station.status].label}</p>
      <h3 className="mt-1 pr-8 font-display text-[1.45rem] leading-tight">{station.name}</h3>
      {place ? (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
          <MapPin className="mt-0.5 size-4 shrink-0 text-iron" aria-hidden="true" />
          {place}
        </p>
      ) : null}
      {years.length ? <p className="mt-1 font-mono text-xs text-iron">{years.join(" · ")}</p> : null}

      {station.lines.length ? (
        <div className="mt-3">
          <p className="text-xs text-iron">{station.lines.length > 1 ? "Líneas" : "Línea"}</p>
          <ul className="mt-0.5 text-sm">
            {station.lines.map((l) => {
              const line = lines.get(l.id);
              return (
                <li key={l.id}>
                  {line && line.stationCount >= LINE_PAGE_MIN_STATIONS ? (
                    <Link href={`/ferrocarril/lineas/${l.slug}`}>{l.name}</Link>
                  ) : (
                    l.name
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {activeLine ? (
        <p className="mt-3 flex gap-2 border-l-4 border-warning bg-paper-deep p-2.5 text-sm text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>Según Wikidata, la línea sigue en servicio al menos en parte: puede haber trenes circulando.</span>
        </p>
      ) : null}

      <ul className="mt-3 grid gap-1.5 text-sm">
        {station.greenway ? (
          <li className="flex gap-2">
            <Footprints className="mt-0.5 size-4 shrink-0 text-greenway" aria-hidden="true" />
            <span>
              {station.greenway.name} a{" "}
              {station.greenway.distanceM < 100
                ? "menos de 100 m"
                : `unos ${Math.round(station.greenway.distanceM / 50) * 50} m`}
            </span>
          </li>
        ) : null}
        {station.trackbedM !== undefined ? (
          <li className="flex gap-2 text-ink-soft">
            <TrainTrack className="mt-0.5 size-4 shrink-0 text-iron" aria-hidden="true" />
            Antiguo trazado cartografiado a {station.trackbedM < 50 ? "menos de 50 m" : `${station.trackbedM} m`}
          </li>
        ) : null}
      </ul>

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
        <a href={`https://www.wikidata.org/wiki/${station.id}`} className="inline-flex items-center gap-1">
          Wikidata <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        {station.commonsFile ? (
          <a href={commonsFileUrl(station.commonsFile)} className="inline-flex items-center gap-1">
            <Camera className="size-3.5" aria-hidden="true" /> Fotografía
          </a>
        ) : null}
        <a
          href={`https://www.openstreetmap.org/?mlat=${station.lat}&mlon=${station.lon}#map=16/${station.lat}/${station.lon}`}
          className="inline-flex items-center gap-1"
        >
          OpenStreetMap <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </p>
    </article>
  );
}

export function RailExplorer({
  stations: everyStation,
  lines,
  fixedLine,
  syncUrl = true,
}: {
  stations: RailStation[];
  lines: RailLine[];
  /** On a line page the line filter is fixed and hidden. */
  fixedLine?: string;
  syncUrl?: boolean;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => parseFilters(searchParams, fixedLine));
  const [kinds, setKinds] = useState(ALL_KINDS);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => searchParams.get("sel") ?? undefined);
  const [sheetOpen, setSheetOpen] = useState(false);

  // On a line page, counts and options refer to that line only.
  const allStations = useMemo(
    () => (fixedLine ? everyStation.filter((s) => s.lines.some((l) => l.id === fixedLine)) : everyStation),
    [everyStation, fixedLine],
  );
  const lineById = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);
  const lineOptions = useMemo(() => lines.filter((l) => l.stationCount >= 2), [lines]);
  const stations = useMemo(() => {
    const q = filters.q ? normalizeText(filters.q) : undefined;
    return allStations.filter(
      (s) =>
        (!q || normalizeText(`${s.name} ${s.municipality ?? ""}`).includes(q)) &&
        (!filters.status || s.status === filters.status) &&
        (!filters.region || s.regionCode === filters.region) &&
        (!filters.line || s.lines.some((l) => l.id === filters.line)) &&
        (!filters.greenway || s.greenway) &&
        (!filters.photo || s.commonsFile),
    );
  }, [allStations, filters]);
  const selected = selectedId ? allStations.find((s) => s.id === selectedId) : undefined;
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const activeCount = [
    filters.q,
    filters.status,
    filters.region,
    fixedLine ? undefined : filters.line,
    filters.greenway,
    filters.photo,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!syncUrl) return;
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.status) p.set("estado", filters.status);
    if (filters.region) p.set("comunidad", filters.region);
    if (filters.line && !fixedLine) p.set("linea", filters.line);
    if (filters.greenway) p.set("viaverde", "1");
    if (filters.photo) p.set("foto", "1");
    if (selectedId) p.set("sel", selectedId);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, [filters, selectedId, syncUrl, fixedLine]);

  const panel = (prefix: string) => (
    <div className="grid gap-5">
      <div className="relative">
        <label htmlFor={`${prefix}-q`} className="sr-only">
          Buscar estación o municipio
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-[1.1rem] -translate-y-1/2 text-iron"
          aria-hidden="true"
        />
        <input
          id={`${prefix}-q`}
          type="search"
          value={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          placeholder="Estación o municipio…"
          className="ctl search-input pl-10 text-base"
        />
      </div>
      <p className="flex items-baseline gap-2" role="status" aria-live="polite">
        <strong className="font-display text-3xl leading-none font-normal">{formatNumber(stations.length)}</strong>
        <span className="text-sm text-ink-soft">
          {stations.length === allStations.length ? "estaciones" : `de ${formatNumber(allStations.length)} estaciones`}
        </span>
      </p>
      <fieldset>
        <legend className={labelCls}>Estado según Wikidata</legend>
        <div className="flex flex-wrap gap-1.5">
          {STATION_STATUSES.map((s) => {
            const active = filters.status === s;
            const n = allStations.filter((x) => x.status === s).length;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => set({ status: active ? undefined : s })}
                className={`min-h-9 rounded-full border px-3 text-sm ${active ? "border-ink bg-ink text-paper" : "border-rule-strong bg-card hover:border-ink"}`}
              >
                {STATION_STATUS[s].label} <span className="font-mono text-xs opacity-70">{formatNumber(n)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${prefix}-region`} className={labelCls}>
          Comunidad autónoma
        </label>
        <Select
          id={`${prefix}-region`}
          value={filters.region ?? ""}
          onChange={(v) => set({ region: v || undefined })}
          options={[
            { value: "", label: "Todas" },
            ...REGIONS.flatMap((r) => {
              const n = allStations.filter((s) => s.regionCode === r.code).length;
              return n ? [{ value: r.code, label: r.name, count: n }] : [];
            }),
          ]}
        />
      </div>
      {fixedLine ? null : (
        <div>
          <label htmlFor={`${prefix}-line`} className={labelCls}>
            Línea
          </label>
          <Select
            id={`${prefix}-line`}
            value={filters.line ?? ""}
            onChange={(v) => set({ line: v || undefined })}
            searchable
            options={[
              { value: "", label: "Todas" },
              ...lineOptions.map((l) => ({ value: l.id, label: l.name, count: l.stationCount })),
            ]}
          />
        </div>
      )}
      <div className="grid gap-1 border-t border-rule pt-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <span className="flex-1 text-[0.95rem] whitespace-nowrap">Vía Verde a menos de 1,5 km</span>
          <input
            type="checkbox"
            role="switch"
            checked={!!filters.greenway}
            onChange={(e) => set({ greenway: e.target.checked || undefined })}
            className="switch"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <span className="flex-1 text-[0.95rem] whitespace-nowrap">Con fotografía en Commons</span>
          <input
            type="checkbox"
            role="switch"
            checked={!!filters.photo}
            onChange={(e) => set({ photo: e.target.checked || undefined })}
            className="switch"
          />
        </label>
      </div>
      <fieldset className="border-t border-rule pt-4">
        <legend className="sr-only">Capas del mapa</legend>
        <p className={labelCls} aria-hidden="true">
          Capas del mapa
        </p>
        <ul className="grid gap-1">
          <li className="flex min-h-9 items-center gap-2.5 text-sm">
            <span className="inline-flex w-7 justify-center" aria-hidden="true">
              <span className="size-3 rounded-full border-2 bg-card" style={{ borderColor: STATION_COLOR }} />
              <span
                className="-ml-0.5 size-3 rounded-full border-2 bg-card"
                style={{ borderColor: STATION_NEAR_GREENWAY_COLOR }}
              />
            </span>
            Estación (verde: junto a una Vía Verde)
          </li>
          {(Object.keys(TRACK_KINDS) as TrackKind[]).map((k) => (
            <li key={k}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={kinds[k]}
                  onChange={(e) => setKinds((v) => ({ ...v, [k]: e.target.checked }))}
                  className="size-4 accent-rust"
                />
                <TrackSwatch kind={k} />
                <span title={TRACK_KINDS[k].description}>{TRACK_KINDS[k].label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {activeCount ? (
        <button
          type="button"
          onClick={() => setFilters(fixedLine ? { line: fixedLine } : {})}
          className="justify-self-start text-sm text-rust underline underline-offset-2"
        >
          Quitar filtros
        </button>
      ) : null}
    </div>
  );

  const frameStations = filters.line ? stations : undefined;
  return (
    <div className="relative h-[78vh] min-h-[520px] border border-rule-strong lg:grid lg:grid-cols-[340px_1fr]">
      <aside
        className="hidden min-h-0 overflow-y-auto border-r border-rule bg-paper p-5 lg:block"
        aria-label="Filtros de estaciones"
      >
        {panel("rd")}
      </aside>
      <div className="relative h-full min-h-0">
        <RailCanvas
          stations={stations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          kinds={kinds}
          frame={frameStations ? { key: `${filters.line}`, stations: frameStations } : undefined}
          ariaLabel={`Mapa de ${stations.length} estaciones de ferrocarril cerradas y antiguos trazados`}
        />
        {selected ? (
          <div className="absolute inset-x-3 bottom-16 z-20 max-h-[60%] md:top-3 md:right-auto md:bottom-auto md:left-3 md:max-h-[calc(100%-1.5rem)] md:w-[340px] lg:bottom-auto">
            <StationCard station={selected} lines={lineById} onClose={() => setSelectedId(undefined)} />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute top-3 left-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm text-paper shadow-lg lg:hidden"
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filtros y capas
          {activeCount ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-rust text-[0.7rem]">
              {activeCount}
            </span>
          ) : null}
        </button>
        {sheetOpen ? (
          <section
            aria-label="Filtros y capas"
            className="absolute inset-0 z-30 flex flex-col bg-paper lg:hidden"
            onKeyDown={(e) => e.key === "Escape" && setSheetOpen(false)}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
              <p className="font-display text-xl">Filtros y capas</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="inline-flex size-11 items-center justify-center"
                aria-label="Cerrar filtros"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{panel("rm")}</div>
            <div className="border-t border-rule p-3">
              <button type="button" onClick={() => setSheetOpen(false)} className="min-h-12 w-full bg-rust text-paper">
                Ver {formatNumber(stations.length)} estaciones
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
