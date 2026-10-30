/**
 * Spanish territorial units with INE codes. Autonomous communities use the INE
 * CCAA code (01–19), which is also what CartoCiudad returns as
 * `comunidadAutonomaCode`.
 */

export interface Region {
  code: string;
  slug: string;
  name: string;
}

export interface Province {
  code: string;
  slug: string;
  name: string;
  regionCode: string;
}

export const REGIONS: readonly Region[] = [
  { code: "01", slug: "andalucia", name: "Andalucía" },
  { code: "02", slug: "aragon", name: "Aragón" },
  { code: "03", slug: "asturias", name: "Principado de Asturias" },
  { code: "04", slug: "illes-balears", name: "Illes Balears" },
  { code: "05", slug: "canarias", name: "Canarias" },
  { code: "06", slug: "cantabria", name: "Cantabria" },
  { code: "07", slug: "castilla-y-leon", name: "Castilla y León" },
  { code: "08", slug: "castilla-la-mancha", name: "Castilla-La Mancha" },
  { code: "09", slug: "cataluna", name: "Cataluña" },
  { code: "10", slug: "comunitat-valenciana", name: "Comunitat Valenciana" },
  { code: "11", slug: "extremadura", name: "Extremadura" },
  { code: "12", slug: "galicia", name: "Galicia" },
  { code: "13", slug: "madrid", name: "Comunidad de Madrid" },
  { code: "14", slug: "murcia", name: "Región de Murcia" },
  { code: "15", slug: "navarra", name: "Comunidad Foral de Navarra" },
  { code: "16", slug: "pais-vasco", name: "País Vasco" },
  { code: "17", slug: "la-rioja", name: "La Rioja" },
  { code: "18", slug: "ceuta", name: "Ceuta" },
  { code: "19", slug: "melilla", name: "Melilla" },
];

export const PROVINCES: readonly Province[] = [
  { code: "01", slug: "araba-alava", name: "Araba/Álava", regionCode: "16" },
  { code: "02", slug: "albacete", name: "Albacete", regionCode: "08" },
  { code: "03", slug: "alicante", name: "Alicante/Alacant", regionCode: "10" },
  { code: "04", slug: "almeria", name: "Almería", regionCode: "01" },
  { code: "05", slug: "avila", name: "Ávila", regionCode: "07" },
  { code: "06", slug: "badajoz", name: "Badajoz", regionCode: "11" },
  { code: "07", slug: "illes-balears", name: "Illes Balears", regionCode: "04" },
  { code: "08", slug: "barcelona", name: "Barcelona", regionCode: "09" },
  { code: "09", slug: "burgos", name: "Burgos", regionCode: "07" },
  { code: "10", slug: "caceres", name: "Cáceres", regionCode: "11" },
  { code: "11", slug: "cadiz", name: "Cádiz", regionCode: "01" },
  { code: "12", slug: "castellon", name: "Castellón/Castelló", regionCode: "10" },
  { code: "13", slug: "ciudad-real", name: "Ciudad Real", regionCode: "08" },
  { code: "14", slug: "cordoba", name: "Córdoba", regionCode: "01" },
  { code: "15", slug: "a-coruna", name: "A Coruña", regionCode: "12" },
  { code: "16", slug: "cuenca", name: "Cuenca", regionCode: "08" },
  { code: "17", slug: "girona", name: "Girona", regionCode: "09" },
  { code: "18", slug: "granada", name: "Granada", regionCode: "01" },
  { code: "19", slug: "guadalajara", name: "Guadalajara", regionCode: "08" },
  { code: "20", slug: "gipuzkoa", name: "Gipuzkoa", regionCode: "16" },
  { code: "21", slug: "huelva", name: "Huelva", regionCode: "01" },
  { code: "22", slug: "huesca", name: "Huesca", regionCode: "02" },
  { code: "23", slug: "jaen", name: "Jaén", regionCode: "01" },
  { code: "24", slug: "leon", name: "León", regionCode: "07" },
  { code: "25", slug: "lleida", name: "Lleida", regionCode: "09" },
  { code: "26", slug: "la-rioja", name: "La Rioja", regionCode: "17" },
  { code: "27", slug: "lugo", name: "Lugo", regionCode: "12" },
  { code: "28", slug: "madrid", name: "Madrid", regionCode: "13" },
  { code: "29", slug: "malaga", name: "Málaga", regionCode: "01" },
  { code: "30", slug: "murcia", name: "Murcia", regionCode: "14" },
  { code: "31", slug: "navarra", name: "Navarra", regionCode: "15" },
  { code: "32", slug: "ourense", name: "Ourense", regionCode: "12" },
  { code: "33", slug: "asturias", name: "Asturias", regionCode: "03" },
  { code: "34", slug: "palencia", name: "Palencia", regionCode: "07" },
  { code: "35", slug: "las-palmas", name: "Las Palmas", regionCode: "05" },
  { code: "36", slug: "pontevedra", name: "Pontevedra", regionCode: "12" },
  { code: "37", slug: "salamanca", name: "Salamanca", regionCode: "07" },
  { code: "38", slug: "santa-cruz-de-tenerife", name: "Santa Cruz de Tenerife", regionCode: "05" },
  { code: "39", slug: "cantabria", name: "Cantabria", regionCode: "06" },
  { code: "40", slug: "segovia", name: "Segovia", regionCode: "07" },
  { code: "41", slug: "sevilla", name: "Sevilla", regionCode: "01" },
  { code: "42", slug: "soria", name: "Soria", regionCode: "07" },
  { code: "43", slug: "tarragona", name: "Tarragona", regionCode: "09" },
  { code: "44", slug: "teruel", name: "Teruel", regionCode: "02" },
  { code: "45", slug: "toledo", name: "Toledo", regionCode: "08" },
  { code: "46", slug: "valencia", name: "Valencia/València", regionCode: "10" },
  { code: "47", slug: "valladolid", name: "Valladolid", regionCode: "07" },
  { code: "48", slug: "bizkaia", name: "Bizkaia", regionCode: "16" },
  { code: "49", slug: "zamora", name: "Zamora", regionCode: "07" },
  { code: "50", slug: "zaragoza", name: "Zaragoza", regionCode: "02" },
  { code: "51", slug: "ceuta", name: "Ceuta", regionCode: "18" },
  { code: "52", slug: "melilla", name: "Melilla", regionCode: "19" },
];

const regionByCode = new Map(REGIONS.map((r) => [r.code, r]));
const regionBySlug = new Map(REGIONS.map((r) => [r.slug, r]));
const provinceByCode = new Map(PROVINCES.map((p) => [p.code, p]));

export const getRegion = (code: string) => regionByCode.get(code);
export const getRegionBySlug = (slug: string) => regionBySlug.get(slug);
export const getProvince = (code: string) => provinceByCode.get(code);

/** Spain's bounding box including the Canary Islands, used for coordinate sanity checks. */
const SPAIN_BOUNDS = { minLon: -18.5, minLat: 27.4, maxLon: 4.6, maxLat: 44.0 } as const;

export function isInsideSpainBounds(lat: number, lon: number): boolean {
  const b = SPAIN_BOUNDS;
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}
