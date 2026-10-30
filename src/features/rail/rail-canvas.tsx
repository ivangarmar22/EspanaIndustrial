"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { RailStation, TrackKind } from "@/domain/rail";
import { basemapStyle } from "@/features/map/basemap-style";
import { loadMaplibre } from "@/features/map/load-maplibre";

/** Colours validated with the dataviz checker; dash patterns are the secondary encoding. */
export const TRACK_STYLE: Record<TrackKind, { color: string; width: number; dash?: [number, number] }> = {
  greenway: { color: "#1f7a4a", width: 3.5 },
  trail: { color: "#1f7a4a", width: 2, dash: [1.2, 1] },
  abandoned: { color: "#9c3d7a", width: 2, dash: [2, 1.5] },
  disused: { color: "#6b6760", width: 2, dash: [3, 1.5] },
};
export const STATION_COLOR = "#2e63a6";
export const STATION_NEAR_GREENWAY_COLOR = "#1f7a4a";

const PENINSULA_BOUNDS: [[number, number], [number, number]] = [
  [-9.4, 35.9],
  [4.4, 43.8],
];

function toGeoJSON(stations: RailStation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { id: s.id, name: s.name, gw: s.greenway ? 1 : 0 },
    })),
  };
}

interface Props {
  stations: RailStation[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  kinds: Record<TrackKind, boolean>;
  /** Changing the key re-frames the map on the given stations (e.g. a line filter). */
  frame?: { key: string; stations: RailStation[] };
  ariaLabel: string;
}

export function RailCanvas({ stations, selectedId, onSelect, kinds, frame, ariaLabel }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | undefined;
    (async () => {
      const maplibre = await loadMaplibre();
      if (cancelled || !container.current) return;
      map = new maplibre.Map({
        container: container.current,
        style: basemapStyle(),
        bounds: PENINSULA_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        minZoom: 3,
        maxZoom: 18,
        attributionControl: {
          compact: true,
          customAttribution: "Trazados © colaboradores de OpenStreetMap (ODbL) · Estaciones: Wikidata (CC0)",
        },
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");
      map.touchZoomRotate.disableRotation();
      map.on("error", (e) => {
        if (!map?.isStyleLoaded() || (e as { sourceId?: string }).sourceId === "omt")
          setError("No se pudo cargar la cartografía. La lista de líneas sigue disponible más abajo.");
      });

      map.on("load", () => {
        if (!map) return;
        map.addSource("tracks", { type: "geojson", data: "/data/rail-tracks.geojson" });
        for (const [kind, s] of Object.entries(TRACK_STYLE)) {
          map.addLayer({
            id: `track-${kind}`,
            type: "line",
            source: "tracks",
            filter: ["==", ["get", "k"], kind],
            layout: { "line-cap": s.dash ? "butt" : "round", "line-join": "round" },
            paint: {
              "line-color": s.color,
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, Math.max(1.6, s.width * 0.7), 12, s.width * 1.4],
              ...(s.dash ? { "line-dasharray": s.dash } : {}),
            },
          });
        }
        map.addSource("stations", { type: "geojson", data: toGeoJSON([]) });
        map.addLayer({
          id: "stations",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 6, 14, 8],
            "circle-color": "#fbf9f4",
            "circle-stroke-color": ["case", ["==", ["get", "gw"], 1], STATION_NEAR_GREENWAY_COLOR, STATION_COLOR],
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 10, 2.5],
          },
        });
        map.addLayer({
          id: "stations-selected",
          type: "circle",
          source: "stations",
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-radius": 13,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": "#9e4320",
            "circle-stroke-width": 3,
          },
        });
        map.addLayer({
          id: "stations-label",
          type: "symbol",
          source: "stations",
          minzoom: 10,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
            "text-offset": [0, 1.1],
            "text-anchor": "top",
            "text-max-width": 9,
          },
          paint: { "text-color": "#1c1b19", "text-halo-color": "#fbf9f4", "text-halo-width": 1.5 },
        });
        map.on("click", "stations", (e) => {
          const id = e.features?.[0]?.properties.id as string | undefined;
          if (id) onSelectRef.current(id);
        });
        map.on("click", (e) => {
          if (!map?.queryRenderedFeatures(e.point, { layers: ["stations"] }).length) onSelectRef.current(undefined);
        });
        map.on("mouseenter", "stations", () => map && (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "stations", () => map && (map.getCanvas().style.cursor = ""));
        setReady(true);
      });
    })().catch(() => setError("El mapa no está disponible en este navegador. La lista de líneas sigue disponible."));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) (mapRef.current?.getSource("stations") as GeoJSONSource | undefined)?.setData(toGeoJSON(stations));
  }, [stations, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const kind of Object.keys(TRACK_STYLE) as TrackKind[])
      map.setLayoutProperty(`track-${kind}`, "visibility", kinds[kind] ? "visible" : "none");
  }, [kinds, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("stations-selected", ["==", ["get", "id"], selectedId ?? ""]);
    const s = selectedId ? stations.find((x) => x.id === selectedId) : undefined;
    if (s && !map.getBounds().contains([s.lon, s.lat]))
      map.easeTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 10) });
  }, [selectedId, stations, ready]);

  const frameKey = frame?.key;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !frame?.stations.length) return;
    const lons = frame.stations.map((s) => s.lon);
    const lats = frame.stations.map((s) => s.lat);
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 12 },
    );
    // Only a new frame key should move the map, not every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, ready]);

  return (
    <div className="absolute inset-0">
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
