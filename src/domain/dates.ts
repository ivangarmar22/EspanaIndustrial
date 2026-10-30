import type { HistoricalDate, Period } from "./schema";

const ROMAN: Record<string, number> = {
  XV: 15,
  XVI: 16,
  XVII: 17,
  XVIII: 18,
  XIX: 19,
  XX: 20,
  XXI: 21,
};

/**
 * Parses chronology labels as worded by the sources. Returns `undefined`
 * whenever the label cannot be read unambiguously — the caller keeps the
 * original text instead of guessing.
 *
 * Supported: "1856", "c. 1856", "h. 1856", "1720-1916", "1720 – 1916",
 * "1953-59", "1914-actual", "1913-presente", "s. XIX", "siglo XIX",
 * "finales del s. XIX". An open end ("actual") only sets `from`: it says
 * nothing verifiable about whether the activity continues.
 */
export function parseChronologyLabel(raw: string): Period | undefined {
  const label = raw.trim().replace(/\s+/g, " ").replace(/\.$/, "");
  if (!label) return undefined;
  const parsed = parseCore(stripNotes(label));
  return parsed ? { ...parsed, label } : undefined;
}

/** Removes editorial notes around a date: "1912-1975 (Hoy: museo)", "1902-1990. Hoy parque". */
function stripNotes(label: string): string {
  return label
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[.;]\s*(?:hoy|en mapa)\b.*$/i, "")
    .trim()
    .replace(/\.$/, "");
}

const CENTURY_TOKEN = String.raw`(?:(principios|mediados|finales|fines)\s+(?:del?\s+)?)?s\.?\s*-?\s*([XVI]+)`;

function centuryFrom(partWord: string | undefined, roman: string): HistoricalDate | undefined {
  const century = ROMAN[roman.toUpperCase()];
  if (!century) return undefined;
  const w = partWord?.toLowerCase();
  const part =
    w === "principios" ? "early" : w === "mediados" ? "mid" : w === "finales" || w === "fines" ? "late" : undefined;
  return part ? { kind: "century", century, part } : { kind: "century", century };
}

function parseCore(label: string): Omit<Period, "label"> | undefined {
  const openEnded = label.match(/^(.+?)\s+(?:y posteriores|y posterior|en adelante)$/i);
  if (openEnded) {
    const from = parseHistoricalDate(openEnded[1]!);
    return from ? { from } : undefined;
  }

  const single = parseHistoricalDate(label);
  if (single) return { from: single };

  // Split on the first single dash/slash that separates two endpoints.
  const m = label.match(/^(.+?)\s*(?<![-–—])[-–—/](?![-–—])\s*(.+)$/);
  if (!m) return undefined;
  const from = parseHistoricalDate(m[1]!);
  if (!from) return undefined;
  const right = m[2]!.trim();

  if (/^(?:actual|presente|actualidad)\b/i.test(right)) return { from };
  let to: HistoricalDate | undefined;
  if (/^\d{2}$/.test(right) && from.kind === "year")
    to = { kind: "year", year: Number(String(from.year).slice(0, 2) + right) };
  else if (/^[XVI]+$/i.test(right) && from.kind === "century") to = centuryFrom(undefined, right);
  else to = parseHistoricalDate(right);
  if (!to || yearSpan(to)[1] < yearSpan(from)[0]) return undefined;
  return { from, to };
}

function parseHistoricalDate(raw: string): HistoricalDate | undefined {
  const s = raw.trim();
  let m = s.match(/^(\d{4})$/);
  if (m) return { kind: "year", year: Number(m[1]) };
  m = s.match(/^(?:c\.|ca\.?|h\.|hacia|circa)\s*-?\s*(\d{4})$/i);
  if (m) return { kind: "circa", year: Number(m[1]) };
  m =
    s.match(new RegExp(`^${CENTURY_TOKEN}$`, "i")) ??
    s.match(/^(?:(principios|mediados|finales|fines)\s+del?\s+)?siglo\s+([XVI]+)$/i);
  if (m) return centuryFrom(m[1], m[2]!);
  return undefined;
}

const toRoman = (n: number) => Object.entries(ROMAN).find(([, v]) => v === n)?.[0] ?? String(n);

export function formatHistoricalDate(d: HistoricalDate): string {
  switch (d.kind) {
    case "year":
      return String(d.year);
    case "circa":
      return `h. ${d.year}`;
    case "range":
      return `${d.from}–${d.to}`;
    case "century": {
      const prefix =
        d.part === "early"
          ? "principios del "
          : d.part === "mid"
            ? "mediados del "
            : d.part === "late"
              ? "finales del "
              : "";
      return `${prefix}s. ${toRoman(d.century)}`;
    }
  }
}

/** Inclusive year span covered by a date, used for timeline filtering. */
export function yearSpan(d: HistoricalDate): [number, number] {
  switch (d.kind) {
    case "year":
      return [d.year, d.year];
    case "circa":
      return [d.year - 5, d.year + 5];
    case "range":
      return [d.from, d.to];
    case "century": {
      const start = (d.century - 1) * 100 + 1;
      if (d.part === "early") return [start, start + 32];
      if (d.part === "mid") return [start + 33, start + 66];
      if (d.part === "late") return [start + 67, start + 99];
      return [start, start + 99];
    }
  }
}
