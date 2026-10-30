/**
 * "Papel y hierro": a custom MapLibre style over OpenFreeMap's OpenMapTiles
 * vector tiles. Muted paper tones keep heritage markers legible; railways and
 * industrial land use are deliberately emphasised as historical context.
 */
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

const PAPER = "#f1ece2";
const WATER = "#c9d6d8";
const INK_SOFT = "#5f5a52";
const ROAD = "#ffffff";
const ROAD_CASE = "#d8cfbf";
const RAIL = "#6a5f55";

const OSM_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> Datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© colaboradores de OpenStreetMap</a>';

const IGN_ATTRIBUTION =
  'PNOA y cartografía cedidos por © <a href="https://www.ign.es" target="_blank" rel="noopener">Instituto Geográfico Nacional</a> (CC BY 4.0)';

const name: ExpressionSpecification = ["coalesce", ["get", "name:es"], ["get", "name"]];

export function basemapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: OSM_ATTRIBUTION },
      "ign-pnoa": {
        type: "raster",
        tiles: [
          "https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: IGN_ATTRIBUTION,
      },
      "ign-mtn": {
        type: "raster",
        tiles: [
          "https://www.ign.es/wmts/mapa-raster?layer=MTN&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: IGN_ATTRIBUTION,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": PAPER } },
      { id: "ign-pnoa", type: "raster", source: "ign-pnoa", layout: { visibility: "none" } },
      {
        id: "ign-mtn",
        type: "raster",
        source: "ign-mtn",
        layout: { visibility: "none" },
        paint: { "raster-saturation": -0.35 },
      },
      {
        id: "landcover-wood",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": "#e2e2cf", "fill-opacity": 0.7 },
      },
      {
        id: "landuse-residential",
        type: "fill",
        source: "omt",
        "source-layer": "landuse",
        filter: ["match", ["get", "class"], ["residential", "suburb", "neighbourhood"], true, false],
        paint: { "fill-color": "#e8e1d4" },
      },
      {
        id: "landuse-industrial",
        type: "fill",
        source: "omt",
        "source-layer": "landuse",
        filter: ["match", ["get", "class"], ["industrial", "quarry", "railway"], true, false],
        paint: { "fill-color": "#e0d6c8", "fill-outline-color": "#cfc2b0" },
      },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": "#dfe3cf", "fill-opacity": 0.6 },
      },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": WATER } },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        paint: { "line-color": WATER, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 2] },
      },
      {
        id: "building",
        type: "fill",
        source: "omt",
        "source-layer": "building",
        minzoom: 14,
        paint: { "fill-color": "#ddd3c3", "fill-outline-color": "#c9bca8" },
      },
      {
        id: "road-case",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ROAD_CASE,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 10, 2.4, 16, 12],
        },
      },
      {
        id: "road",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: [
          "match",
          ["get", "class"],
          ["motorway", "trunk", "primary", "secondary", "tertiary", "minor"],
          true,
          false,
        ],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ROAD,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            ["match", ["get", "class"], ["motorway", "trunk"], 0.8, 0],
            10,
            ["match", ["get", "class"], ["motorway", "trunk", "primary"], 1.6, 0.4],
            16,
            ["match", ["get", "class"], ["minor", "tertiary"], 6, 9],
          ],
        },
      },
      {
        id: "railway",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["match", ["get", "class"], ["rail", "transit"], true, false],
        paint: { "line-color": RAIL, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 12, 1.2, 16, 2] },
      },
      {
        id: "railway-ties",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 11,
        filter: ["==", ["get", "class"], "rail"],
        paint: {
          "line-color": RAIL,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 6],
          "line-dasharray": [0.15, 3],
        },
      },
      {
        id: "boundary-country",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": "#8b8174", "line-width": 1.2 },
      },
      {
        id: "boundary-region",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": "#a99f90", "line-width": 0.8, "line-dasharray": [3, 2] },
      },
      {
        id: "water-name",
        type: "symbol",
        source: "omt",
        "source-layer": "water_name",
        layout: { "text-field": name, "text-font": ["Noto Sans Italic"], "text-size": 11 },
        paint: { "text-color": "#5d7a80" },
      },
      {
        id: "place-minor",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 9,
        filter: ["match", ["get", "class"], ["village", "town", "suburb"], true, false],
        layout: {
          "text-field": name,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 13],
        },
        paint: { "text-color": INK_SOFT, "text-halo-color": PAPER, "text-halo-width": 1.4 },
      },
      {
        id: "place-city",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "city"],
        layout: {
          "text-field": name,
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 10, 15],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.08,
        },
        paint: { "text-color": "#3f3b35", "text-halo-color": PAPER, "text-halo-width": 1.6 },
      },
    ],
  };
}

export type BaseLayer = "papel" | "ortofoto" | "topografico";

/** Visibility of raster layers per base layer choice; vector layers are dimmed under rasters. */
export const RASTER_FOR_BASE: Record<BaseLayer, string | undefined> = {
  papel: undefined,
  ortofoto: "ign-pnoa",
  topografico: "ign-mtn",
};
