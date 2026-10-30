"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { basemapStyle } from "@/features/map/basemap-style";
import { loadMaplibre } from "@/features/map/load-maplibre";

interface LocatorPoint {
  lat: number;
  lon: number;
  label: string;
  color: string;
}

interface Props {
  points: LocatorPoint[];
  ariaLabel: string;
  /** Number markers and join them with a dashed straight line (routes). */
  sequence?: boolean;
  className?: string;
}

/** Small map initialised only when scrolled into view; cooperative gestures avoid hijacking page scroll. */
export function LocatorMap({
  points,
  ariaLabel,
  sequence = false,
  className = "aspect-[4/3] sm:aspect-[16/10]",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !points.length) return;
    let map: import("maplibre-gl").Map | undefined;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        try {
          const maplibre = await loadMaplibre();
          const first = points[0]!;
          map = new maplibre.Map({
            container: el,
            style: basemapStyle(),
            center: [first.lon, first.lat],
            zoom: 13,
            cooperativeGestures: true,
            attributionControl: { compact: true },
            dragRotate: false,
          });
          map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
          points.forEach((p, i) => {
            const dot = document.createElement("div");
            const size = sequence ? 26 : 18;
            dot.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${p.color};border:3px solid #f4f0e8;box-shadow:0 0 0 1px rgba(0,0,0,.35);color:#f4f0e8;font:600 12px/20px var(--font-archivo),sans-serif;text-align:center`;
            if (sequence) dot.textContent = String(i + 1);
            dot.title = p.label;
            dot.setAttribute("aria-hidden", "true");
            new maplibre.Marker({ element: dot }).setLngLat([p.lon, p.lat]).addTo(map!);
          });
          if (points.length > 1) {
            const lons = points.map((p) => p.lon);
            const lats = points.map((p) => p.lat);
            map.fitBounds(
              [
                [Math.min(...lons), Math.min(...lats)],
                [Math.max(...lons), Math.max(...lats)],
              ],
              { padding: 56, maxZoom: 15, duration: 0 },
            );
          }
          map.on("load", () => {
            if (!map || !sequence || points.length < 2) return;
            map.addSource("sequence", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: points.map((p) => [p.lon, p.lat]) },
              },
            });
            map.addLayer({
              id: "sequence",
              type: "line",
              source: "sequence",
              paint: { "line-color": "#a6441c", "line-width": 2, "line-dasharray": [2, 2] },
            });
          });
          map.on("error", (e) => {
            if ((e as { sourceId?: string }).sourceId === "omt" && !map?.loaded()) setFailed(true);
          });
        } catch {
          setFailed(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      map?.remove();
    };
  }, [points, sequence]);

  return (
    <div className={`relative w-full border border-rule bg-paper-deep ${className}`}>
      <div className="absolute inset-0">
        <div ref={ref} className="h-full w-full" role="region" aria-label={ariaLabel} />
      </div>
      {failed ? (
        <p className="absolute inset-x-3 top-3 border border-danger bg-card p-2 text-sm text-danger" role="alert">
          No se pudo cargar el mapa. Las coordenadas figuran en las fichas.
        </p>
      ) : null}
    </div>
  );
}
