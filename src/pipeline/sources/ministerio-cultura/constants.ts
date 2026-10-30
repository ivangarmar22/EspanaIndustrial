export const SOURCE_ID = "ministerio-cultura";
const MAP_ID = "1Rd3x2Zf0u2c7lUR7FFsT2jNe7LevHJRm";
export const KML_URL = `https://www.google.com/maps/d/kml?mid=${MAP_ID}&forcekml=1`;
export const LISTING_URL =
  "https://www.cultura.gob.es/planes-nacionales/planes-nacionales/patrimonio-industrial/actuaciones/mapa-interactivo.html";

/** IPCE code as printed on the map ("CAT-07/2" → "CAT-07"). */
export const printedCode = (code: string) => code.split("/")[0]!;
