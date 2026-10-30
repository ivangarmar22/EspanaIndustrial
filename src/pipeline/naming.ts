import { PROVINCES, REGIONS } from "@/domain/territory";
import { normalizeText } from "@/lib/text";

const isShouting = (s: string) => {
  const letters = s.replace(/[^\p{Letter}]/gu, "");
  return letters.length > 3 && letters === letters.toUpperCase();
};

/**
 * Learns how words are written in mixed-case texts of the same source:
 * a word counts as a proper noun when it appears capitalised mid-sentence
 * more often than in lower case.
 */
interface Votes {
  upper: number;
  lower: number;
  /** Written entirely in capitals (acronyms such as "CAF", "EC-BZO"). */
  caps: number;
}

function caseVotes(corpus: string[]): Map<string, Votes> {
  const votes = new Map<string, Votes>();
  for (const text of corpus) {
    if (isShouting(text)) continue;
    let sentenceStart = true;
    for (const tok of text.split(/\s+/)) {
      for (const word of tok.split(/[-/]/).map((w) => w.replace(/^[^\p{Letter}\d]+|[^\p{Letter}\d]+$/gu, ""))) {
        if (word.length > 1 && !sentenceStart) {
          const key = normalizeText(word);
          const v = votes.get(key) ?? { upper: 0, lower: 0, caps: 0 };
          if (/^\p{Lu}+$/u.test(word.replace(/\d/g, "")) && /\p{Lu}{2}/u.test(word)) v.caps++;
          else if (/^\p{Lu}/u.test(word)) v.upper++;
          else v.lower++;
          votes.set(key, v);
        }
      }
      sentenceStart = /[.!?:]["»”)]*$/.test(tok);
    }
  }
  return votes;
}

/**
 * "PUENTE COLGANTE DE JÁNOVAS" + corpus → "Puente colgante de Jánovas".
 * The corpus should be running prose (descriptions), not titles. Tokens with
 * digits (model or registration codes) keep their original capitals.
 * Non-shouting input is returned unchanged.
 */
export function restoreCase(name: string, corpus: string[]): string {
  if (!isShouting(name)) return name;
  const votes = caseVotes(corpus);
  let first = true;
  const word = (w: string) => {
    if (!/\p{Letter}/u.test(w)) return w;
    const v = votes.get(normalizeText(w));
    const lower = w.toLocaleLowerCase("es");
    let out = lower;
    if (v && v.caps > v.upper + v.lower) out = w;
    else if (first || (v !== undefined && v.upper > v.lower))
      out = lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
    first = false;
    return out;
  };
  return name
    .split(/(\s+|[(/])/)
    .map((tok) => {
      // Codes such as "CV-990" or "141-F-2346" keep their capitals as printed.
      if (/\d/.test(tok)) {
        first = false;
        return tok;
      }
      return tok.split(/(-)/).map(word).join("");
    })
    .join("");
}

/** Lower-case words written without hyphen anywhere in the given texts. */
export function vocabularyOf(texts: string[]): Set<string> {
  return new Set(texts.flatMap((t) => t.toLowerCase().split(/[^\p{Letter}-]+/u)).filter((w) => w && !w.includes("-")));
}

/**
 * Joins words split by the PDF layout ("coloniza-ción" → "colonización") only when
 * the joined form is attested elsewhere in the source texts; real compounds stay.
 */
export function joinLayoutHyphens(text: string, vocabulary: Set<string>): string {
  return text.replace(/(\p{Ll}{2,})-\s?(\p{Ll}{2,})/gu, (m, a: string, b: string) =>
    vocabulary.has((a + b).toLowerCase()) ? a + b : m,
  );
}

/** Collapses whitespace and stray spaces around hyphens: "Riotinto- Nerva" → "Riotinto-Nerva". */
export const tidyName = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/([\p{Letter})])-\s+(\p{Letter})/gu, "$1-$2")
    .replace(/(\p{Letter})\s+-(\p{Letter})/gu, "$1-$2")
    .trim();

const ADDRESS_RE =
  /^(c\/|calle|cra\.?|ctra\.?|carretera|avda\.?|avenida|plaza|pza\.?|paseo|barrio|camino|pol[ií]gono|n-\d)|\bkm\b|\bs\/n\b|\bdirecciones\b/i;

export const looksLikeAddress = (s: string) => ADDRESS_RE.test(s.trim());

/** Takes the name part of a map label that mixes name and address ("Azucarera X.Ctra. de Málaga 172"). */
export function nameFromPlaceText(text: string): string | undefined {
  const head = text.split(/\.(?=\s|\p{Lu})|:\s|\s·\s/u)[0]!;
  const parts = head.split(",").map((p) => p.trim());
  const kept: string[] = [];
  for (const p of parts) {
    if (looksLikeAddress(p) || (kept.length && PLACE_NAMES.has(normalizeText(p.replace(/\s*\(.*\)$/, ""))))) break;
    kept.push(p);
  }
  const name = kept.join(", ").trim();
  return name.length >= 4 && !looksLikeAddress(name) ? name : undefined;
}

const PLACE_NAMES = new Set(
  [
    ...PROVINCES.flatMap((p) => p.name.split("/")),
    ...REGIONS.map((r) => r.name),
    "Guipúzcoa",
    "Vizcaya",
    "Álava",
    "Gerona",
    "Lérida",
    "Orense",
    "La Coruña",
    "Baleares",
    "Asturias",
    "Navarra",
    "Cantabria",
    "Guipuzkoa",
    "Bizkaia",
    "Gran Canaria",
    "Tenerife",
    "Lanzarote",
    "Fuerteventura",
    "La Palma",
    "Mallorca",
    "Menorca",
    "Ibiza",
    "Eivissa",
    "BCN",
  ].map(normalizeText),
);

/**
 * Removes a trailing location the IPCE appends to official names:
 * "Colonia Sedó. Esparraguera (Barcelona)" → "Colonia Sedó";
 * "Fábrica de tabacos de Donostia-San Sebastián (Guipúzcoa)" → "Fábrica de tabacos de Donostia-San Sebastián".
 */
export function stripLocationSuffix(name: string, municipality?: string): string {
  const isPlace = (p: string) =>
    PLACE_NAMES.has(normalizeText(p)) || (!!municipality && normalizeText(p) === normalizeText(municipality));
  const once = (input: string): string => {
    const s = input
      .trim()
      .replace(/[.,;]+$/, "")
      .trim();
    // "Colonia Sedó. Esparraguera (Barcelona)" / "Estación La Concordia, Bilbao (Vizcaya)"
    const withTown = s.match(/^(.{6,}?)[.,]\s+[^.,()]+\(([^)]+)\)$/);
    if (withTown && isPlace(withTown[2]!)) return withTown[1]!;
    // "Noria de Jinámar (Gran Canaria)"
    const paren = s.match(/^(.{6,}?)\s*\(([^)]+)\)$/);
    if (paren && isPlace(paren[2]!)) return paren[1]!;
    // "Fábrica de cervezas El Águila. Madrid" / "Coto minero de Irugurutzeta, Irún"
    const tail = s.match(/^(.{6,}?)[.,]\s+([^.,]+)$/);
    if (tail && isPlace(tail[2]!)) return tail[1]!;
    return s;
  };
  // Suffixes can stack ("…, Irún, (Guipúzcoa)"): strip until stable.
  let current = name;
  for (let i = 0; i < 4; i++) {
    const next = once(current);
    if (next === current) break;
    current = next;
  }
  return current.trim();
}
