/**
 * CartoCiudad (IGN) reverse geocoding → municipality, INE code, province,
 * region and nearest cadastral reference. Results are cached per point and only
 * new or moved points are queried.
 */
import type { Point } from "@/domain/schema";
import type { Connector, ConnectorContext, ConnectorOutcome } from "../connector";
import { readJson, sha256, writeJsonAtomic } from "../fs";
import { InvalidResponseError, SourceUnavailableError } from "../http";
import { paths } from "../paths";
import type { CartoCiudadPlace, CartoCiudadStaging, McStaging, StagingFile } from "../staging";

const SOURCE_ID = "cartociudad";
const ENDPOINT = "https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode";
const ADMIN_UNITS_WMS = "https://www.ign.es/wms-inspire/unidades-administrativas";

/**
 * Fallback for rural points where CartoCiudad finds no address (HTTP 204): the
 * IGN administrative-units WMS answers which municipality contains the point.
 * National codes look like 34 CC PP MMMMM (country, region, province, INE municipality).
 */
export function parseAdminUnits(
  text: string,
): Pick<CartoCiudadPlace, "municipality" | "ineCode" | "provinceCode" | "regionCode"> | undefined {
  const blocks = [...text.matchAll(/nationalcode = (\d{11})\s+nameunit = ([^\n]+)/g)];
  const muni = blocks.find((b) => !b[1]!.endsWith("00000") && /^34\d{9}$/.test(b[1]!));
  if (!muni) return undefined;
  const code = muni[1]!;
  return {
    municipality: muni[2]!.trim(),
    ineCode: code.slice(6),
    provinceCode: code.slice(4, 6),
    regionCode: code.slice(2, 4),
  };
}

function adminUnitsUrl(p: Point): string {
  const d = 0.001;
  const q = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetFeatureInfo",
    LAYERS: "AU.AdministrativeUnit",
    QUERY_LAYERS: "AU.AdministrativeUnit",
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: [p.lat - d, p.lon - d, p.lat + d, p.lon + d].join(","),
    WIDTH: "101",
    HEIGHT: "101",
    I: "50",
    J: "50",
    INFO_FORMAT: "text/plain",
    FEATURE_COUNT: "10",
  });
  return `${ADMIN_UNITS_WMS}?${q.toString()}`;
}

export const pointKey = (p: Point) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

interface ReverseGeocodeResponse {
  muni?: string;
  muniCode?: string;
  provinceCode?: string;
  comunidadAutonomaCode?: string;
  refCatastral?: string | null;
}

export function toPlace(point: Point, res: ReverseGeocodeResponse, retrievedAt: string): CartoCiudadPlace {
  const place: CartoCiudadPlace = { point, retrievedAt };
  if (res.muni) place.municipality = res.muni;
  if (res.muniCode && /^\d{5}$/.test(res.muniCode)) place.ineCode = res.muniCode;
  if (res.provinceCode && /^\d{2}$/.test(res.provinceCode)) place.provinceCode = res.provinceCode;
  if (res.comunidadAutonomaCode && /^\d{2}$/.test(res.comunidadAutonomaCode))
    place.regionCode = res.comunidadAutonomaCode;
  if (res.refCatastral) place.cadastralRef = res.refCatastral;
  return place;
}

async function run(ctx: ConnectorContext): Promise<ConnectorOutcome> {
  const warnings: string[] = [];
  const mc = await readJson<StagingFile<McStaging>>(paths.staging("ministerio-cultura"));
  if (!mc)
    return { sourceId: SOURCE_ID, status: "unavailable", message: "No hay staging del Ministerio todavía", warnings };

  const file = paths.staging(SOURCE_ID);
  const previous = await readJson<StagingFile<CartoCiudadStaging>>(file);
  const cache: CartoCiudadStaging = { ...previous?.data };
  const wanted = mc.data.items.flatMap((i) => i.points.map((p) => p.point));
  const missing = wanted.filter((p) => !cache[pointKey(p)]);

  let failures = 0;
  let successes = 0;
  if (!ctx.options.offline) {
    for (const point of missing) {
      const url = `${ENDPOINT}?lon=${point.lon}&lat=${point.lat}`;
      try {
        const body = await ctx.http.getText(url);
        const now = new Date().toISOString();
        if (body.trim()) {
          cache[pointKey(point)] = toPlace(point, JSON.parse(body) as ReverseGeocodeResponse, now);
        } else {
          // 204 No Content: no address nearby. Ask the administrative-units service instead.
          const units = parseAdminUnits(await ctx.http.getText(adminUnitsUrl(point)));
          if (!units) throw new InvalidResponseError("Sin dirección ni unidad administrativa para el punto", url);
          cache[pointKey(point)] = { point, ...units, retrievedAt: now };
        }
        successes++;
      } catch (err) {
        if (!(err instanceof SourceUnavailableError || err instanceof InvalidResponseError)) throw err;
        failures++;
        warnings.push(`CartoCiudad ${pointKey(point)}: ${err.message}`);
        if (failures >= 5 && successes === 0) break; // service is down: stop hammering it
      }
    }
  }

  // Drop cache entries for points that no longer exist in the source.
  const live = new Set(wanted.map(pointKey));
  for (const key of Object.keys(cache)) if (!live.has(key)) delete cache[key];

  const contentHash = sha256(JSON.stringify(Object.keys(cache).sort()));
  if (missing.length > 0 && successes === 0 && !ctx.options.offline) {
    return { sourceId: SOURCE_ID, status: "unavailable", message: `${failures} consultas fallidas`, warnings };
  }
  if (previous && previous.contentHash === contentHash) return { sourceId: SOURCE_ID, status: "unchanged", warnings };
  await writeJsonAtomic(file, { sourceId: SOURCE_ID, retrievedAt: new Date().toISOString(), contentHash, data: cache });
  return { sourceId: SOURCE_ID, status: "updated", message: `${successes} puntos nuevos geocodificados`, warnings };
}

export const cartociudad: Connector = { id: SOURCE_ID, run };
