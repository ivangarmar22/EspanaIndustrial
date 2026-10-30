import path from "node:path";

/** Root of the data directory. Overridable so tests can run against a temporary copy. */
const dataRoot = () => process.env.EI_DATA_DIR ?? path.join(process.cwd(), "data");

export const paths = {
  snapshots: (sourceId: string) => path.join(dataRoot(), "snapshots", sourceId),
  staging: (sourceId: string) => path.join(dataRoot(), "staging", `${sourceId}.json`),
  registry: () => path.join(dataRoot(), "registry.json"),
  overridesDir: () => path.join(dataRoot(), "overrides"),
  override: (recordId: string) => path.join(dataRoot(), "overrides", `${recordId}.json`),
  decisions: () => path.join(dataRoot(), "review", "decisions.json"),
  catalog: () => path.join(dataRoot(), "catalog", "catalog.json"),
  pendingCatalog: () => path.join(dataRoot(), "review", "pending-catalog.json"),
  manifest: () => path.join(dataRoot(), "manifests", "catalog.json"),
  reportsDir: () => path.join(dataRoot(), "reports"),
  editorialDir: () => path.join(dataRoot(), "editorial"),
  rail: () => path.join(dataRoot(), "rail", "rail.json"),
  railTracks: () => path.join(process.cwd(), "public", "data", "rail-tracks.geojson"),
  schemasDir: () => path.join(dataRoot(), "schemas"),
  lock: () => path.join(dataRoot(), ".lock"),
  mediaDir: () => path.join(process.cwd(), "public", "media"),
};
