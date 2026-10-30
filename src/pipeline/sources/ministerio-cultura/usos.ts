/**
 * The IPCE map encodes each asset's "uso" in the icon of its style
 * (`icon-<iconCode>-<colour>`); the colour encodes the region. Mapping read
 * from the map's own "LEYENDA" folder on 2026-10-25. Icon codes that are not
 * in the legend (seen: 1598, 1517, 1564, 1622) stay unmapped and go to review.
 */
const IPCE_USOS: Readonly<Record<string, string>> = {
  "1565": "Fábrica",
  "1627": "Minería",
  "1587": "Agroalimentario",
  "1717": "Ferroviario",
  "1660": "Energía",
  "1551": "Taller, Forja, Carpintería",
  "1798": "Bodega",
  "1693": "Fundición, Alto horno",
  "1528": "Puente",
  "1703": "Hidráulico, redes",
  "1566": "Poblado industrial",
  "1544": "Química",
  "1538": "Automoción",
  "1504": "Aviación",
};

export function usoForIconCode(iconCode: string): string | undefined {
  return IPCE_USOS[iconCode];
}
