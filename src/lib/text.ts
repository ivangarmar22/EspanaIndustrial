/** Lower-case, strip diacritics and collapse whitespace. "Fábrica  de Vidrio" → "fabrica de vidrio". */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function slugify(input: string, maxLength = 80): string {
  const slug = normalizeText(input).replace(/\s+/g, "-");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  return cut.slice(0, cut.lastIndexOf("-") > 20 ? cut.lastIndexOf("-") : maxLength).replace(/-+$/, "");
}

const NAME_STOPWORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "i", "e", "a", "en", "antigua", "antiguo"]);

/** Normalised name used for duplicate matching: no accents, no stopwords. */
function matchKey(name: string): string {
  return normalizeText(name)
    .split(" ")
    .filter((w) => w && !NAME_STOPWORDS.has(w))
    .join(" ");
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

/** Jaccard similarity of character trigrams over `matchKey` (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = trigrams(matchKey(a));
  const tb = trigrams(matchKey(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** Collapse runs of whitespace and join hyphenated line breaks produced by PDF text extraction. */
export function cleanExtractedText(input: string): string {
  return input
    .replace(/(\p{Letter})-\n(\p{Lower})/gu, "$1$2")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Spanish title case for ALL-CAPS strings coming from sources ("FÁBRICA DE GAS" → "Fábrica de gas"). */
export function sentenceCaseIfShouting(input: string): string {
  const letters = input.replace(/[^\p{Letter}]/gu, "");
  if (!letters || letters !== letters.toUpperCase()) return input;
  const lower = input.toLocaleLowerCase("es");
  return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
}
