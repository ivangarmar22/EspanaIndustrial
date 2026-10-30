/**
 * Extraction of labelled fields from the text layer of IPCE heritage sheets.
 * The two-column layout often cuts values at the column edge, so anything that
 * looks empty, truncated or out of format is discarded rather than guessed.
 * Full rule set: docs/data/sources/ministerio-cultura.md.
 */
import type { Point, ProtectionLevel } from "@/domain/schema";
import { isInsideSpainBounds } from "@/domain/territory";
import { cleanExtractedText } from "@/lib/text";

interface FichaProtection {
  level: ProtectionLevel;
  original: string;
  datesAsPrinted: string[];
  bulletinUrl?: string;
}

export interface FichaFields {
  officialName?: string;
  otherNames?: string[];
  postalAddress?: string;
  point?: Point;
  cadastralRef?: string;
  owner?: string;
  chronologyLabel?: string;
  constituentElements?: string;
  authorship?: string;
  protection?: FichaProtection;
  typology?: string;
  history?: string;
  interventions?: string;
  conservation?: string;
  bibliography?: string[];
  /** Human-readable notes about values that were found but discarded. */
  warnings: string[];
}

const EMPTY_RE = /^(?:-{1,}|no consta|n\/?d|-+\/-+\/-+|sin datos)?\.?$/i;
// `u` flag + explicit letter lookbehind: plain \b treats "ñ" as a non-word char ("Cataluña" ≠ "… a").
const TRUNCATED_RE = /(?:-|(?<!\p{Letter})(?:de|del|la|las|el|los|y|e|en|a|al|con|por|para)|,)$/iu;
/** Another form label leaking into a value ("TITULARIDAD: Pública…"). */
const LEAKED_LABEL_RE = /\p{Lu}{4,}\s*:/u;
const DATE_RE = /(?<!\d)(\d{2}\/\d{2}\/\d{4})(?!\d)/g;

const isEmpty = (v: string | undefined): boolean => v === undefined || EMPTY_RE.test(v.trim());

function acceptValue(
  label: string,
  value: string | undefined,
  warnings: string[],
  isPlausible: (v: string) => boolean = () => true,
): string | undefined {
  if (isEmpty(value)) return undefined;
  const v = value!.trim();
  if (TRUNCATED_RE.test(v)) {
    warnings.push(`${label}: valor descartado por parecer truncado ("${v}")`);
    return undefined;
  }
  if (LEAKED_LABEL_RE.test(v) || !isPlausible(v)) {
    warnings.push(`${label}: valor descartado por no tener el formato esperado ("${v}")`);
    return undefined;
  }
  return v;
}

const looksLikeChronology = (v: string) => /\d{3,4}|s\.\s*[XVI]|siglo/i.test(v) && !/^\d{2}\/\d{2}\/\d{4}$/.test(v);

function lineAfter(text: string, labelRe: RegExp): string | undefined {
  const m = text.match(new RegExp(`${labelRe.source}\\s*:?[ \\t]*([^\\n]*)`, labelRe.flags.replace("g", "")));
  return m?.[1]?.trim();
}

function nextLineAfter(text: string, labelRe: RegExp): string | undefined {
  const m = text.match(new RegExp(`${labelRe.source}[^\\n]*\\n([^\\n]*)`, labelRe.flags.replace("g", "")));
  return m?.[1]?.trim();
}

const PROTECTION_LEVELS: Array<[RegExp, ProtectionLevel]> = [
  [/\bBIC\b|bien de inter[eé]s cultural|\bBCIN\b|bien cultural de inter[eé]s nacional/i, "BIC"],
  [/inter[eé]s local|\bBCIL\b|relevancia local|\bBRL\b|catalogad/i, "BRL"],
  [/\bBIP\b|inter[eé]s patrimonial/i, "BIP"],
  [/inventariad|inventario/i, "inventario"],
];

export function classifyProtection(original: string): ProtectionLevel | undefined {
  if (isEmpty(original)) return undefined;
  for (const [re, level] of PROTECTION_LEVELS) if (re.test(original)) return level;
  return "other";
}

/** Joins words split by a hyphen at line end: "monu-\nmento" → "monumento". */
const joinWrapped = (s: string) => s.replace(/(\p{Letter})-\s*\n\s*(\p{Lower})/gu, "$1$2").replace(/\s*\n\s*/g, " ");

function parseProtection(p1: string, warnings: string[]): FichaProtection | undefined {
  const block = p1.match(/PROTECCI[OÓ]N\s*\n([\s\S]*?)(?:\nCATEGOR[IÍ]A|\nINFORMACION PATRIMONIAL|\nAUTOR[IÍ]A)/)?.[1];
  if (!block) return undefined;
  const typeRaw = block.match(/Tipo:\s*([\s\S]*?)\s*(?:\n?Declarado:|$)/)?.[1];
  const original = typeRaw ? joinWrapped(typeRaw).trim() : undefined;
  if (!original || isEmpty(original)) return undefined;
  const level = classifyProtection(original);
  if (!level) return undefined;

  const datesAsPrinted = [...block.matchAll(DATE_RE)].map((m) => m[1]!);
  let bulletinUrl: string | undefined;
  const urlMatch = block.match(/Publicado:?\s*([\s\S]*?)(\s*)enlace:/);
  const url = urlMatch?.[1]?.match(/https?:\/\/\S[\s\S]*/)?.[0]?.trim();
  if (url && urlMatch?.[2] === "") {
    // "…/2019/06/26/enlace:" — the URL runs into the next label, so it was cut at the column edge.
    warnings.push(`Protección: enlace al boletín truncado, no guardado ("${url}")`);
  } else if (url) {
    if (!/\n/.test(url) && /^https?:\/\/[^\s]+$/.test(url)) bulletinUrl = url;
    else {
      const boe = url.replace(/\s*\n\s*/g, "");
      if (/^https:\/\/www\.boe\.es\/boe\/dias\/\d{4}\/\d{2}\/\d{2}\/pdfs\/A\d+-\d+\.pdf$/.test(boe)) bulletinUrl = boe;
      else
        warnings.push(
          `Protección: enlace al boletín partido en varias líneas, no reconstruido ("${url.replace(/\n/g, "⏎")}")`,
        );
    }
  }
  return { level, original, datesAsPrinted, ...(bulletinUrl ? { bulletinUrl } : {}) };
}

const SECTION_HEADINGS: Array<[keyof FichaFields | "valoracion", RegExp]> = [
  ["typology", /^DESCRIPCI[OÓ]N TIPOL[OÓ]GICA\.?$/m],
  ["history", /^DESCRIPCI[OÓ]N HIST[OÓ]RICA\.?$/m],
  ["interventions", /^ACTUACIONES\.?$/m],
  // "VALORACION ESTADO DE CONSERVACIÓN" may share one line; `[ \t]` (not `\s`) keeps the match on that line.
  ["conservation", /^(?:VALORACI[OÓ]N[ \t]+)?ESTADO DE CONSERVACI[OÓ]N\.?$/m],
  ["valoracion", /^VALORACI[OÓ]N\.?$/m],
  ["bibliography", /^BIBLIOGRAF[IÍ]A,?\s*REFERENCIAS\.?$/m],
];

/** Lines that belong to the sheet's chrome, not to the section text. */
function isNoiseLine(line: string): boolean {
  const l = line.trim();
  if (!l) return true;
  if (/^(documentación|valoración|información|fotografías?)$/i.test(l)) return true;
  if (/^[A-Z][a-z]{0,2}$/.test(l)) return true; // region code fragments: "An", "CyL"
  const letters = l.replace(/[^\p{Letter}]/gu, "");
  if (letters.length >= 3 && letters === letters.toUpperCase() && !/[.,;:]$/.test(l)) return true;
  if (/^\d+(?:\s*(?:,|y|-)\s*\d+)*\s*[.:]\s+\S/.test(l) || /©/.test(l)) return true; // photo captions
  return false;
}

function sectionTexts(p2: string): Partial<Record<string, string>> {
  const marks: Array<{ key: string; start: number; end: number }> = [];
  for (const [key, re] of SECTION_HEADINGS) {
    const m = re.exec(p2);
    if (m) marks.push({ key, start: m.index, end: m.index + m[0].length });
  }
  // Two headings starting at the same offset: keep the longer (more specific) one.
  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  const unique = marks.filter((m, i) => i === 0 || m.start !== marks[i - 1]!.start);
  const out: Partial<Record<string, string>> = {};
  unique.forEach((mark, i) => {
    out[mark.key] = p2.slice(mark.end, unique[i + 1]?.start ?? p2.length);
  });
  return out;
}

function proseFrom(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const lines = body.split("\n").filter((l) => !isNoiseLine(l));
  const text = cleanExtractedText(lines.join("\n"));
  return text.length >= 20 ? text : undefined;
}

function bibliographyFrom(body: string | undefined): string[] | undefined {
  if (!body) return undefined;
  const entries: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (isNoiseLine(line)) continue;
    const prev = entries[entries.length - 1];
    if (prev === undefined || !(prev.endsWith("-") || /^\p{Lower}/u.test(line))) {
      entries.push(line.replace(/^[-•]\s*/, ""));
    } else if (prev.endsWith("-")) {
      // URLs keep the hyphen (it may be part of the address); prose drops the line-break hyphen.
      entries[entries.length - 1] = /^https?:/.test(prev) ? prev + line : prev.slice(0, -1) + line;
    } else {
      entries[entries.length - 1] = `${prev} ${line}`;
    }
  }
  const cleaned = entries
    .flatMap((e) => e.split(/\s+(?=https?:\/\/)/))
    .map((e) => e.replace(/\s+d$/, "").trim())
    // Short leftovers are page chrome (region headers such as "Madrid"), not references.
    .filter((e) => e.length >= 12);
  return cleaned.length ? cleaned : undefined;
}

function authorshipFrom(p1: string): string | undefined {
  const lines = p1.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^(Ingenier[oa]s?|Arquitect[oa]s?|Autor(?:es|ía)?|Proyectistas?)\s*:/i.test(lines[i]!.trim())) continue;
    let entry = lines[i]!.trim();
    const unclosed = (s: string) => (s.match(/\(/g)?.length ?? 0) > (s.match(/\)/g)?.length ?? 0);
    while (i + 1 < lines.length && (/-$/.test(entry) || unclosed(entry) || /^\p{Lower}/u.test(lines[i + 1]!.trim()))) {
      entry = entry.replace(/-$/, "") + (entry.endsWith("-") ? "" : " ") + lines[++i]!.trim();
    }
    out.push(entry);
  }
  return out.length ? out.join(" ") : undefined;
}

export function parseFicha(pages: string[]): FichaFields {
  const warnings: string[] = [];
  const p1 = pages[0] ?? "";
  const p2 = pages[1] ?? "";
  const fields: FichaFields = { warnings };

  fields.officialName = acceptValue("Nombre oficial", lineAfter(p1, /NOMBRE OFICIAL/), warnings);
  const other = acceptValue("Otros nombres", lineAfter(p1, /OTROS NOMBRES/), warnings);
  if (other) fields.otherNames = other.split(/\s*[;/]\s*/).filter(Boolean);
  fields.postalAddress = acceptValue("Localización postal", nextLineAfter(p1, /LOCALIZACI[OÓ]N POSTAL/), warnings);
  // Spanish cadastral references are 14 or 20 alphanumerics; foral cadastres (País Vasco, Navarra) use numeric ids.
  // Placeholders such as "sin", "No" or "(Múltiple)" are rejected.
  fields.cadastralRef = acceptValue(
    "Referencia catastral",
    lineAfter(p1, /REFERENCIA CATASTRAL/)?.split(/\s+/)[0],
    warnings,
    (v) => /^(?=(?:\D*\d){5})[0-9A-Z]{7,20}$/.test(v),
  );
  fields.owner = acceptValue("Propiedad", lineAfter(p1, /PROPIEDAD\s*/), warnings);

  const chrono = lineAfter(p1, /CRONOLOG[IÍ]A\s*/)?.replace(/\s*ELEMENTOS\s*$/, "");
  fields.chronologyLabel = acceptValue("Cronología", chrono, warnings, looksLikeChronology);

  const coordLine = nextLineAfter(p1, /COORDENADAS WGS84/);
  const cm = coordLine?.match(/(-?\d{1,2}\.\d+)\s*º?\s*,\s*(-?\d{1,3}\.\d+)/);
  if (cm) {
    const point = { lat: Number(cm[1]), lon: Number(cm[2]) };
    if (isInsideSpainBounds(point.lat, point.lon)) fields.point = point;
    else warnings.push(`Coordenadas fuera de España descartadas ("${coordLine}")`);
  }

  const elements = p1.match(/CONSTITUTIVOS\s*:\s*\n([\s\S]*?)\nCLASIFICACI[OÓ]N/)?.[1];
  if (elements && !/[A-ZÁÉÍÓÚ]{4,}\s*:/.test(elements)) fields.constituentElements = proseFrom(elements);

  fields.authorship = authorshipFrom(p1);
  fields.protection = parseProtection(p1, warnings);

  const sections = sectionTexts(p2);
  fields.typology = proseFrom(sections.typology);
  fields.history = proseFrom(sections.history);
  fields.interventions = proseFrom(sections.interventions);
  fields.conservation = proseFrom(sections.conservation);
  fields.bibliography = bibliographyFrom(sections.bibliography);

  for (const key of Object.keys(fields) as Array<keyof FichaFields>) if (fields[key] === undefined) delete fields[key];
  return fields;
}
