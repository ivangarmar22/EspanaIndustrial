/** Lazy-loads MapLibre and points it at the worker copied to public/vendor (see scripts/maintenance/copy-maplibre-worker.mjs). */
export async function loadMaplibre() {
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  return maplibre;
}
