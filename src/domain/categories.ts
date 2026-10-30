/**
 * Category system. Every record has exactly one primary category (family +
 * subcategory) and may carry extra tags. Families map to marker styles in the
 * design system via `CategoryFamily.token`.
 */

export const CATEGORY_FAMILIES = [
  "industria",
  "mineria",
  "energia",
  "transporte",
  "agua",
  "agroindustria",
  "paisaje",
] as const;

export type CategoryFamilyId = (typeof CATEGORY_FAMILIES)[number];

export interface Subcategory {
  id: string;
  label: string;
}

export interface CategoryFamily {
  id: CategoryFamilyId;
  label: string;
  shortLabel: string;
  description: string;
  /** Single-letter glyph used inside map markers so category never relies on colour alone. */
  glyph: string;
  subcategories: readonly Subcategory[];
}

export const CATEGORIES: readonly CategoryFamily[] = [
  {
    id: "industria",
    label: "Industria y manufactura",
    shortLabel: "Industria",
    description: "Fábricas, fundiciones, altos hornos, talleres y otras instalaciones de transformación.",
    glyph: "I",
    subcategories: [
      { id: "textil", label: "Fábricas textiles" },
      { id: "azucarera", label: "Azucareras" },
      { id: "harinera", label: "Fábricas de harina" },
      { id: "vidrio", label: "Fábricas de vidrio" },
      { id: "papel", label: "Fábricas de papel" },
      { id: "cerveza", label: "Fábricas de cerveza" },
      { id: "ceramica-construccion", label: "Cerámica, cemento y materiales de construcción" },
      { id: "siderurgia", label: "Fundiciones y altos hornos" },
      { id: "armamento", label: "Fábricas de armamento" },
      { id: "quimica", label: "Industria química" },
      { id: "conservera", label: "Industrias conserveras" },
      { id: "tabaco", label: "Fábricas de tabaco" },
      { id: "material-electrico", label: "Material eléctrico y mecánico" },
      { id: "automocion", label: "Automoción" },
      { id: "talleres", label: "Talleres, forjas y carpinterías" },
      { id: "otras-manufacturas", label: "Otras manufacturas" },
    ],
  },
  {
    id: "mineria",
    label: "Minería",
    shortLabel: "Minería",
    description: "Minas, pozos, castilletes, lavaderos, cargaderos y paisajes mineros.",
    glyph: "M",
    subcategories: [
      { id: "mina", label: "Minas" },
      { id: "pozo", label: "Pozos mineros y castilletes" },
      { id: "lavadero", label: "Lavaderos" },
      { id: "cargadero", label: "Cargaderos" },
      { id: "ferrocarril-minero", label: "Ferrocarriles mineros" },
      { id: "paisaje-minero", label: "Paisajes mineros" },
    ],
  },
  {
    id: "energia",
    label: "Energía",
    shortLabel: "Energía",
    description: "Centrales hidroeléctricas y térmicas, fábricas de gas y otras infraestructuras energéticas.",
    glyph: "E",
    subcategories: [
      { id: "hidroelectrica", label: "Centrales hidroeléctricas" },
      { id: "termica", label: "Centrales térmicas" },
      { id: "gas", label: "Fábricas de gas" },
      { id: "otras-energia", label: "Otras instalaciones energéticas" },
    ],
  },
  {
    id: "transporte",
    label: "Ferrocarril y transporte",
    shortLabel: "Transporte",
    description: "Estaciones, talleres, puentes, viaductos, puertos, astilleros y aviación.",
    glyph: "T",
    subcategories: [
      { id: "estacion", label: "Estaciones y apeaderos" },
      { id: "taller-ferroviario", label: "Talleres y depósitos ferroviarios" },
      { id: "puente", label: "Puentes y viaductos" },
      { id: "tunel", label: "Túneles" },
      { id: "linea", label: "Líneas históricas" },
      { id: "puerto", label: "Instalaciones portuarias" },
      { id: "astillero", label: "Astilleros" },
      { id: "aviacion", label: "Aviación" },
      { id: "otras-transporte", label: "Otras instalaciones de transporte" },
    ],
  },
  {
    id: "agua",
    label: "Agua e ingeniería",
    shortLabel: "Agua",
    description: "Presas, canales, acueductos, molinos y sistemas hidráulicos ligados a la producción.",
    glyph: "A",
    subcategories: [
      { id: "presa", label: "Presas" },
      { id: "canal", label: "Canales y acueductos" },
      { id: "molino", label: "Molinos" },
      { id: "abastecimiento", label: "Infraestructuras de abastecimiento" },
      { id: "sistema-hidraulico", label: "Otros sistemas hidráulicos" },
    ],
  },
  {
    id: "agroindustria",
    label: "Agroindustria",
    shortLabel: "Agroindustria",
    description: "Bodegas, almazaras, salinas, secaderos y otras industrias agrarias.",
    glyph: "G",
    subcategories: [
      { id: "bodega", label: "Bodegas y lagares" },
      { id: "almazara", label: "Almazaras" },
      { id: "salina", label: "Salinas" },
      { id: "secadero", label: "Secaderos" },
      { id: "sidra-licores", label: "Sidrerías, alcoholeras y licores" },
      { id: "otras-agroindustria", label: "Otras industrias agroalimentarias" },
    ],
  },
  {
    id: "paisaje",
    label: "Paisaje y vida industrial",
    shortLabel: "Paisaje",
    description: "Colonias industriales, poblados obreros y conjuntos o paisajes productivos.",
    glyph: "P",
    subcategories: [
      { id: "colonia", label: "Colonias industriales" },
      { id: "poblado", label: "Poblados obreros, mineros y ferroviarios" },
      { id: "conjunto", label: "Conjuntos industriales" },
      { id: "paisaje-productivo", label: "Paisajes productivos" },
    ],
  },
];

const familyById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getFamily(id: CategoryFamilyId): CategoryFamily {
  const family = familyById.get(id);
  if (!family) throw new Error(`Unknown category family: ${id}`);
  return family;
}

export function getSubcategory(familyId: CategoryFamilyId, subId: string): Subcategory | undefined {
  return familyById.get(familyId)?.subcategories.find((s) => s.id === subId);
}

export function isValidCategory(familyId: string, subId: string): boolean {
  return familyById.has(familyId as CategoryFamilyId) && !!getSubcategory(familyId as CategoryFamilyId, subId);
}
