/**
 * IGN orthophoto layers used by the historical comparison. Coverage boxes come
 * from the services' GetCapabilities (checked 2026-10-25). Dates are the
 * flight's documented interval — never presented as a single exact year.
 */
export interface OrthoLayer {
  id: string;
  label: string;
  dates: string;
  service: string;
  layer: string;
  bbox: [minLon: number, minLat: number, maxLon: number, maxLat: number];
  note: string;
}

export const CURRENT_ORTHO: OrthoLayer = {
  id: "pnoa-ma",
  label: "PNOA máxima actualidad",
  dates: "Vuelo más reciente disponible en cada zona",
  service: "https://www.ign.es/wms-inspire/pnoa-ma",
  layer: "OI.OrthoimageCoverage",
  bbox: [-21.1, 27.4, 4.9, 44],
  note: "Ortofoto actual del Plan Nacional de Ortofotografía Aérea.",
};

export const HISTORICAL_ORTHOS: OrthoLayer[] = [
  {
    id: "ams-1956",
    label: "Vuelo Americano, serie B",
    dates: "1956–1957",
    service: "https://www.ign.es/wms/pnoa-historico",
    layer: "AMS_1956-1957",
    bbox: [-9.5, 36, 4.5, 44],
    note: "Fotografía en blanco y negro de resolución muy inferior a la actual; la fecha exacta del fotograma varía dentro del intervalo.",
  },
  {
    id: "interministerial",
    label: "Vuelo Interministerial",
    dates: "1973–1986",
    service: "https://www.ign.es/wms/pnoa-historico",
    layer: "Interministerial_1973-1986",
    bbox: [-8.87, 36.01, 3.29, 43.84],
    note: "Cobertura realizada a lo largo de varios años; la fecha exacta depende de la zona.",
  },
];

export const ORTHO_ATTRIBUTION = "Ortofotos: PNOA cedido por © Instituto Geográfico Nacional (CC BY 4.0)";

export const covers = (l: OrthoLayer, p: { lat: number; lon: number }) =>
  p.lon >= l.bbox[0] && p.lat >= l.bbox[1] && p.lon <= l.bbox[2] && p.lat <= l.bbox[3];

/** WMS 1.3.0 GetMap URL for a ~1.2 km × 0.9 km window around a point (CRS:84 = lon,lat axis order). */
export function getMapUrl(l: OrthoLayer, p: { lat: number; lon: number }, width = 960, height = 720): string {
  const halfW = 600 / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  const halfH = 450 / 110_540;
  const bbox = [p.lon - halfW, p.lat - halfH, p.lon + halfW, p.lat + halfH].map((n) => n.toFixed(6)).join(",");
  const q = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: l.layer,
    STYLES: "",
    CRS: "CRS:84",
    BBOX: bbox,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: "image/jpeg",
  });
  return `${l.service}?${q.toString()}`;
}
