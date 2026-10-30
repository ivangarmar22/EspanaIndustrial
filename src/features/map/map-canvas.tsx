"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap, MapGeoJSONFeature } from "maplibre-gl";
import { CATEGORIES } from "@/domain/categories";
import type { IndexItem } from "@/domain/index-item";
import { FAMILY_HEX } from "@/components/category";
import { RASTER_FOR_BASE, basemapStyle, type BaseLayer } from "./basemap-style";
import { loadMaplibre } from "./load-maplibre";

export interface MapView {
  lat: number;
  lon: number;
  zoom: number;
}

interface Props {
  items: IndexItem[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  base: BaseLayer;
  initialView?: MapView;
  onViewChange?: (v: MapView) => void;
  /** Change this value to fly to a point (e.g. "Canarias" shortcut). */
  flyTo?: MapView & { key: number };
  ariaLabel: string;
}

const SPAIN_VIEW: MapView = { lat: 40.1, lon: -3.6, zoom: 5.2 };
const PENINSULA_BOUNDS: [[number, number], [number, number]] = [
  [-9.4, 35.9],
  [4.4, 43.8],
];
const VECTOR_FILLS = ["landcover-wood", "landuse-residential", "landuse-industrial", "park", "building"];

function toGeoJSON(items: IndexItem[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((i) => ({
      type: "Feature",
      id: Number(i.id.slice(3)),
      geometry: { type: "Point", coordinates: [i.lon, i.lat] },
      properties: { id: i.id, family: i.family, glyph: CATEGORIES.find((c) => c.id === i.family)!.glyph, name: i.name },
    })),
  };
}

// A ["match", input, label, value, …, fallback] expression; TS cannot type a spread-built tuple.
const familyColor = [
  "match",
  ["get", "family"],
  ...Object.entries(FAMILY_HEX).flat(),
  "#555",
] as unknown as ExpressionSpecification;

export function MapCanvas({ items, selectedId, onSelect, base, initialView, onViewChange, flyTo, ariaLabel }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const handlers = useRef({ onSelect, onViewChange });
  useEffect(() => {
    handlers.current = { onSelect, onViewChange };
  });

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | undefined;
    (async () => {
      const maplibre = await loadMaplibre();
      if (cancelled || !container.current) return;
      const view = initialView ?? SPAIN_VIEW;
      map = new maplibre.Map({
        container: container.current,
        style: basemapStyle(),
        center: [view.lon, view.lat],
        zoom: view.zoom,
        minZoom: 3,
        maxZoom: 18,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;
      // Without a shared view, frame the Peninsula and the Balearics whatever the screen width.
      if (!initialView) map.fitBounds(PENINSULA_BOUNDS, { padding: 24, duration: 0 });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(
        new maplibre.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: true }),
        "top-right",
      );
      map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");
      map.touchZoomRotate.disableRotation();

      map.on("error", (e) => {
        // Tile errors are common and transient; only surface a failure to load the style/source itself.
        if (!map?.isStyleLoaded() || (e as { sourceId?: string }).sourceId === "omt")
          setError("No se pudo cargar la cartografía base. El catálogo sigue disponible en modo lista.");
      });

      map.on("load", () => {
        if (!map) return;
        map.addSource("items", {
          type: "geojson",
          data: toGeoJSON([]),
          cluster: true,
          clusterRadius: 42,
          clusterMaxZoom: 11,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "items",
          filter: ["has", "point_count"],
          // Clusters are paper rings with ink numbers so they never read as a (charcoal) mining marker.
          paint: {
            "circle-color": "#fbf9f4",
            "circle-opacity": 0.95,
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 40, 24],
            "circle-stroke-color": "#1c1b19",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "items",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#1c1b19" },
        });
        map.addLayer({
          id: "points-selected",
          type: "circle",
          source: "items",
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-radius": 17,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": "#9e4320",
            "circle-stroke-width": 3,
          },
        });
        map.addLayer({
          id: "points",
          type: "circle",
          source: "items",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": familyColor,
            "circle-radius": 10,
            "circle-stroke-color": "#f4f0e8",
            "circle-stroke-width": 1.5,
          },
        });
        map.addLayer({
          id: "points-glyph",
          type: "symbol",
          source: "items",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "glyph"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 11,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: { "text-color": "#f4f0e8" },
        });

        map.on("click", "clusters", async (e) => {
          const f = e.features?.[0] as MapGeoJSONFeature | undefined;
          if (!f || !map) return;
          const zoom = await (map.getSource("items") as GeoJSONSource).getClusterExpansionZoom(
            f.properties.cluster_id as number,
          );
          map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom });
        });
        map.on("click", "points", (e) => {
          const id = e.features?.[0]?.properties.id as string | undefined;
          if (id) handlers.current.onSelect(id);
        });
        map.on("click", (e) => {
          if (!map?.queryRenderedFeatures(e.point, { layers: ["points", "clusters"] }).length)
            handlers.current.onSelect(undefined);
        });
        for (const layer of ["clusters", "points"]) {
          map.on("mouseenter", layer, () => map && (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => map && (map.getCanvas().style.cursor = ""));
        }
        map.on("moveend", () => {
          if (!map) return;
          const c = map.getCenter();
          handlers.current.onViewChange?.({ lat: c.lat, lon: c.lng, zoom: map.getZoom() });
        });
        setReady(true);
      });
    })().catch(() => setError("El mapa no está disponible en este navegador. Usa el catálogo en modo lista."));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("items") as GeoJSONSource | undefined)?.setData(toGeoJSON(items));
  }, [items, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("points-selected", ["==", ["get", "id"], selectedId ?? ""]);
    const item = selectedId ? items.find((i) => i.id === selectedId) : undefined;
    if (item && !map.getBounds().contains([item.lon, item.lat]))
      map.easeTo({ center: [item.lon, item.lat], zoom: Math.max(map.getZoom(), 9) });
  }, [selectedId, items, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const raster = RASTER_FOR_BASE[base];
    for (const id of ["ign-pnoa", "ign-mtn"])
      map.setLayoutProperty(id, "visibility", id === raster ? "visible" : "none");
    for (const id of VECTOR_FILLS) map.setLayoutProperty(id, "visibility", raster ? "none" : "visible");
  }, [base, ready]);

  useEffect(() => {
    if (ready && flyTo) mapRef.current?.flyTo({ center: [flyTo.lon, flyTo.lat], zoom: flyTo.zoom });
  }, [flyTo, ready]);

  return (
    <div className="absolute inset-0">
      {/* MapLibre sets `position: relative` on its container, so the container fills a positioned wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" role="region" aria-label={ariaLabel} />
      </div>
      {!ready && !error ? (
        <div className="blueprint absolute inset-0 flex items-center justify-center" role="status">
          <span className="signage bg-card px-3 py-2 text-ink-soft">Cargando cartografía…</span>
        </div>
      ) : null}
      {error ? (
        <div
          className="absolute inset-x-4 top-4 z-10 border border-danger bg-card p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
