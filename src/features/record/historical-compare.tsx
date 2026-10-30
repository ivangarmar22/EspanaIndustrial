"use client";

import { useId, useState } from "react";
import { CURRENT_ORTHO, HISTORICAL_ORTHOS, ORTHO_ATTRIBUTION, covers, getMapUrl } from "./orthophotos";

export function HistoricalCompare({ point, name }: { point: { lat: number; lon: number }; name: string }) {
  const available = HISTORICAL_ORTHOS.filter((l) => covers(l, point));
  const [layerId, setLayerId] = useState(available[0]?.id);
  const [pos, setPos] = useState(50);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const sliderId = useId();
  const layer = available.find((l) => l.id === layerId);

  if (!layer) {
    return (
      <p className="text-ink-soft">
        Los vuelos históricos del IGN disponibles en este atlas no cubren esta zona, por lo que no se muestra una
        comparación.
      </p>
    );
  }

  return (
    <figure>
      {available.length > 1 ? (
        <fieldset className="mb-3 flex flex-wrap gap-2">
          <legend className="sr-only">Vuelo histórico</legend>
          {available.map((l) => (
            <label
              key={l.id}
              className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm ${l.id === layerId ? "border-ink bg-ink text-paper" : "border-rule-strong bg-card"}`}
            >
              <input
                type="radio"
                name="ortho"
                value={l.id}
                checked={l.id === layerId}
                onChange={() => setLayerId(l.id)}
                className="sr-only"
              />
              {l.label} ({l.dates})
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="relative aspect-[4/3] w-full overflow-hidden border border-rule bg-paper-deep select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote WMS imagery; next/image cannot optimise OGC GetMap URLs */}
        <img
          src={getMapUrl(CURRENT_ORTHO, point)}
          alt={`Ortofoto actual del entorno de ${name}`}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img
            src={getMapUrl(layer, point)}
            alt={`Ortofoto histórica (${layer.dates}) del entorno de ${name}`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            onError={() => setFailed((f) => ({ ...f, [layer.id]: true }))}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${pos}%` }}
        />
        <span className="signage absolute top-2 left-2 bg-carbon/85 px-2 py-1 text-paper">{layer.dates}</span>
        <span className="signage absolute top-2 right-2 bg-carbon/85 px-2 py-1 text-paper">Actual</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-rust"
        >
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>
      <label htmlFor={sliderId} className="mt-3 block text-sm text-ink-soft">
        Desliza para comparar ({layer.dates} ↔ actual)
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full accent-rust"
      />
      <figcaption className="mt-2 text-sm text-iron">
        {failed[layer.id] ? "No se pudo cargar la imagen histórica desde el IGN. " : null}
        {layer.label} ({layer.dates}): {layer.note} El círculo marca el punto del IPCE. {ORTHO_ATTRIBUTION}.
      </figcaption>
    </figure>
  );
}
