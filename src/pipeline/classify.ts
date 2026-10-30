/**
 * Category assignment for IPCE elements. The official "uso" (map legend)
 * decides which families are allowed; name keywords only refine the
 * subcategory inside those families. Every decision records the rule used.
 */
import type { CategoryFamilyId } from "@/domain/categories";
import { normalizeText } from "@/lib/text";

export interface Classification {
  family: CategoryFamilyId;
  sub: string;
  rule: "uso" | "keyword" | "fallback";
  keyword?: string;
}

interface UsoRule {
  allowed: CategoryFamilyId[];
  default: [CategoryFamilyId, string];
}

const USO_RULES: Record<string, UsoRule> = {
  Fábrica: { allowed: ["industria", "energia", "agroindustria"], default: ["industria", "otras-manufacturas"] },
  Minería: { allowed: ["mineria", "paisaje"], default: ["mineria", "mina"] },
  // The spec groups sugar, flour, beer and canning under manufacturing.
  Agroalimentario: { allowed: ["industria", "agroindustria"], default: ["agroindustria", "otras-agroindustria"] },
  Ferroviario: { allowed: ["transporte", "mineria", "paisaje"], default: ["transporte", "otras-transporte"] },
  Energía: { allowed: ["energia", "agua"], default: ["energia", "otras-energia"] },
  "Taller, Forja, Carpintería": { allowed: ["industria", "transporte"], default: ["industria", "talleres"] },
  Bodega: { allowed: ["agroindustria", "industria"], default: ["agroindustria", "bodega"] },
  "Fundición, Alto horno": { allowed: ["industria"], default: ["industria", "siderurgia"] },
  Puente: { allowed: ["transporte"], default: ["transporte", "puente"] },
  "Hidráulico, redes": { allowed: ["agua", "energia"], default: ["agua", "sistema-hidraulico"] },
  "Poblado industrial": { allowed: ["paisaje"], default: ["paisaje", "poblado"] },
  Química: { allowed: ["industria"], default: ["industria", "quimica"] },
  Automoción: { allowed: ["industria"], default: ["industria", "automocion"] },
  Aviación: { allowed: ["transporte"], default: ["transporte", "aviacion"] },
};

/** Ordered: the first match wins, so multi-word and more specific patterns come first. */
const KEYWORDS: Array<[RegExp, CategoryFamilyId, string]> = [
  [/\bpaisaje minero\b/, "mineria", "paisaje-minero"],
  [
    /\b(ferrocarril|linea ferrea|via ferrea|ffcc)\b.*\bminer|\bminer\w*\b.*\b(ferrocarril|ffcc)\b/,
    "mineria",
    "ferrocarril-minero",
  ],
  [/\bcable ingles\b|\bcargadero\b/, "mineria", "cargadero"],
  [/\blavadero\b/, "mineria", "lavadero"],
  [/\bpozo\b|\bcastillete\b/, "mineria", "pozo"],
  [/\bpoblado\b|\bbarrio obrero\b/, "paisaje", "poblado"],
  [/\bminas?\b|\bminer[oa]s?\b|\bcerco\b/, "mineria", "mina"],
  [/\bazucar\w*|\bingenio\b/, "industria", "azucarera"],
  [/\bharin\w*/, "industria", "harinera"],
  [/\bcervez\w*/, "industria", "cerveza"],
  [/\bvidrio\b|\bcristaler\w*/, "industria", "vidrio"],
  [/\bpapel\w*/, "industria", "papel"],
  [
    /\btextil\w*|\btejid\w*|\bhilatura\b|\bhilad\w*|\blana\b|\balgodon\w*|\bseda\b|\bpanos\b|\btapic\w*|\bboinas?\b|\bcotoner\w*/,
    "industria",
    "textil",
  ],
  [/\bcement\w*|\bceramic\w*|\bladrill\w*|\btejer\w*|\bazulej\w*/, "industria", "ceramica-construccion"],
  [
    /\baltos? hornos?\b|\bfundicion\b|\bsiderurg\w*|\bferreri\w*|\bferreteri\w*|\bmetalurg\w*/,
    "industria",
    "siderurgia",
  ],
  [/\barmas\b|\bartilleri\w*|\bpolvora\b|\barmamento\b/, "industria", "armamento"],
  [/\bquimic\w*|\bexplosiv\w*|\babonos?\b/, "industria", "quimica"],
  [/\btabac\w*/, "industria", "tabaco"],
  [/\bconserv\w*|\bsalazon\w*|\bballener\w*/, "industria", "conservera"],
  [/\bmaterial electrico\b/, "industria", "material-electrico"],
  [/\bautomovil\w*|\bautomocion\b/, "industria", "automocion"],
  [/\bcolonia\b/, "paisaje", "colonia"],
  [/\bconjunto industrial\b|\bcomplejo industrial\b/, "paisaje", "conjunto"],
  [/\bpaisaje\b/, "paisaje", "paisaje-productivo"],
  [/\bhidroelectric\w*|\bsalto\b/, "energia", "hidroelectrica"],
  [/\btermica\b/, "energia", "termica"],
  [/\bfabrica de gas\b|\bgas\b/, "energia", "gas"],
  [/\bpresa\b|\bembalse\b|\bpantano\b|\bcontrapresa\b/, "agua", "presa"],
  [/\bcanal\b|\bacueducto\b|\bacequia\b/, "agua", "canal"],
  [/\bmolinos?\b|\bacena\b/, "agua", "molino"],
  [/\babastecimiento\b|\bdeposito de aguas?\b/, "agua", "abastecimiento"],
  [/\bastillero\w*/, "transporte", "astillero"],
  [/\bpuerto\b|\bmuelle\b|\bfaro\b/, "transporte", "puerto"],
  [/\bpuente\b|\bviaducto\b/, "transporte", "puente"],
  [/\btunel\b/, "transporte", "tunel"],
  [/\btaller\w*|\bcocheras?\b|\bdeposito de locomotoras\b|\brotonda\b/, "transporte", "taller-ferroviario"],
  [/\bestacion\b|\bapeadero\b/, "transporte", "estacion"],
  [/\blinea\b|\bferrocarril\b|\bffcc\b/, "transporte", "linea"],
  [/\baviacion\b|\baeropuerto\b|\baerodromo\b|\bhangar\w*|\bavion\w*/, "transporte", "aviacion"],
  [/\bbodega\w*|\blagar\w*|\bcava\b|\bvinos?\b/, "agroindustria", "bodega"],
  [/\balmazara\w*|\baceite\w*/, "agroindustria", "almazara"],
  [/\bsalinas?\b/, "agroindustria", "salina"],
  [/\bsecadero\w*/, "agroindustria", "secadero"],
  [/\bsidra\b|\balcohol\w*|\blicor\w*|\bdestiler\w*|\banis\b/, "agroindustria", "sidra-licores"],
];

export function classify(uso: string | undefined, texts: string[]): Classification {
  const rule = uso ? USO_RULES[uso] : undefined;
  const haystack = normalizeText(texts.join(" · "));
  for (const [re, family, sub] of KEYWORDS) {
    if (rule && !rule.allowed.includes(family)) continue;
    const m = haystack.match(re);
    if (m) return { family, sub, rule: "keyword", keyword: m[0] };
  }
  if (rule) return { family: rule.default[0], sub: rule.default[1], rule: "uso" };
  return { family: "industria", sub: "otras-manufacturas", rule: "fallback" };
}
