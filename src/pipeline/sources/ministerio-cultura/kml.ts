/**
 * Parsing of the Google My Maps KML that backs the IPCE "mapa interactivo".
 * Verified structure (2026-10-25): Document > Folder[] > Placemark[], one
 * folder per territorial group plus a "LEYENDA" folder whose placemarks are
 * legend entries, not heritage assets.
 */
import { XMLParser } from "fast-xml-parser";
import { parseChronologyLabel } from "@/domain/dates";
import type { Period, Point } from "@/domain/schema";
import { isInsideSpainBounds } from "@/domain/territory";
import { roundPoint } from "@/lib/geo";
import { cleanExtractedText } from "@/lib/text";
import { usoForIconCode } from "./usos";

export interface RawPlacemark {
  folder: string;
  name: string;
  description: string;
  styleUrl: string;
  coordinates: string;
}

export const LEGEND_FOLDER = "LEYENDA";

export function parseKml(xml: string): RawPlacemark[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    isArray: (tagName) => tagName === "Folder" || tagName === "Placemark",
    trimValues: false,
    parseTagValue: false,
  });
  const doc = parser.parse(xml) as {
    kml?: { Document?: { Folder?: Array<{ name?: string; Placemark?: Array<Record<string, unknown>> }> } };
  };
  const folders = doc.kml?.Document?.Folder;
  if (!folders?.length) throw new Error("KML has no folders: structure changed or response is not the expected map");

  const out: RawPlacemark[] = [];
  for (const folder of folders) {
    const folderName = String(folder.name ?? "").trim();
    for (const pm of folder.Placemark ?? []) {
      const point = pm.Point as { coordinates?: string } | undefined;
      out.push({
        folder: folderName,
        name: String(pm.name ?? ""),
        description: String(pm.description ?? ""),
        styleUrl: String(pm.styleUrl ?? ""),
        coordinates: String(point?.coordinates ?? ""),
      });
    }
  }
  return out;
}

export interface McPoint {
  /** Code as printed, e.g. "CAT-05-A". */
  rawCode: string;
  /** Normalised element code, e.g. "CAT-05". Several points may share it. */
  code: string;
  /** Sub-point letter for multi-site elements ("A", "B"), if any. */
  part?: string;
  folder: string;
  /** Short upper-case label of the map ("FÁBRICA ARTILLERÍA"). */
  mapLabel: string;
  /** Remaining name/address text as printed, line breaks preserved as " · ". */
  placeText?: string;
  nameLine?: string;
  addressLine?: string;
  activity?: string;
  chronologyLabel?: string;
  chronology?: Period;
  description?: string;
  fichaUrl?: string;
  driveFileId?: string;
  point: Point;
  iconCode?: string;
  uso?: string;
}

// Sub-point letter may come before the slash ("CAT-05-A/", "Mad-06A/") or right after it ("CyL-18/A").
const CODE_RE = /^\s*([A-Za-z]{2,3})[-_\s]?(\d{1,2})\s*[-_]?\s*([A-Z])?\s*\/(?:\s*([A-Z])(?=\s))?\s*/;

function normalizeCode(prefix: string, num: string): string {
  return `${prefix.toUpperCase()}-${num.padStart(2, "0")}`;
}

function stripHtml(html: string): string[] {
  return html
    .replace(/<img[^>]*>/gi, "")
    .split(/<br\s*\/?>/i)
    .map((l) =>
      l
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim(),
    );
}

/** Splits "FÁBRICA ARTILLERÍA Real Fábrica…" into the caps label and the rest. */
function splitCapsLabel(line: string): [string, string] {
  const words = line.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length) {
    const letters = words[i]!.replace(/[^\p{Letter}]/gu, "");
    if (letters.length > 1 && letters !== letters.toUpperCase()) break;
    i++;
  }
  // A capitalised word right before the first mixed-case word belongs to the name ("Línea" vs "LÍNEA").
  return [words.slice(0, i).join(" ").replace(/[:.]$/, ""), words.slice(i).join(" ")];
}

export function parsePlacemark(pm: RawPlacemark): McPoint | { error: string; raw: string } {
  const name = pm.name.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
  const codeMatch = name.match(CODE_RE);
  if (!codeMatch) return { error: "No IPCE code in placemark name", raw: name.slice(0, 120) };

  const rawCode = codeMatch[0].replace(/\s+/g, "").replace(/\/$/, "");
  const code = normalizeCode(codeMatch[1]!, codeMatch[2]!);
  const part = codeMatch[3] ?? codeMatch[4];

  const afterCode = name.slice(codeMatch[0].length);
  const lines = afterCode
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const [mapLabel, firstRest] = splitCapsLabel(lines[0] ?? "");
  const restLines = [firstRest, ...lines.slice(1)].map((l) => l.trim()).filter(Boolean);

  const [lonStr, latStr] = pm.coordinates.trim().split(",");
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isInsideSpainBounds(lat, lon)) {
    return { error: `Invalid coordinates "${pm.coordinates.trim()}"`, raw: rawCode };
  }

  const descLines = stripHtml(pm.description.replace(/^<!\[CDATA\[|\]\]>$/g, ""));
  const nonEmpty = descLines.filter(Boolean);
  const header = nonEmpty[0] && !/^\.{5,}$/.test(nonEmpty[0]) ? nonEmpty[0] : undefined;

  let activity: string | undefined;
  let chronologyLabel: string | undefined;
  if (header) {
    const idx = header.lastIndexOf(",");
    const tail =
      idx >= 0
        ? header
            .slice(idx + 1)
            .trim()
            .replace(/\.$/, "")
        : "";
    if (idx >= 0 && /\d{4}|s\.\s*[XVI]+|siglo/i.test(tail)) {
      activity = header.slice(0, idx).trim();
      chronologyLabel = tail;
    } else {
      activity = header.replace(/,\s*$/, "").trim();
    }
    activity = activity.replace(/\s+/g, " ").replace(/\s+,/g, ",") || undefined;
  }

  const sepIndex = nonEmpty.findIndex((l) => /^\.{5,}$/.test(l));
  const fichaIndex = nonEmpty.findIndex((l) => /^FICHA:?$/i.test(l));
  const bodyLines = sepIndex >= 0 ? nonEmpty.slice(sepIndex + 1, fichaIndex >= 0 ? fichaIndex : undefined) : [];
  const description = bodyLines.length ? cleanExtractedText(bodyLines.join("\n")) : undefined;

  const driveMatch = pm.description.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)[^\s<"]*/);
  const icon = pm.styleUrl.match(/icon-(\d+)-/)?.[1];

  return {
    rawCode,
    code,
    part,
    folder: pm.folder,
    mapLabel,
    placeText: restLines.length ? restLines.join(" · ") : undefined,
    nameLine: restLines.length >= 2 ? restLines[0] : undefined,
    addressLine: restLines.length >= 2 ? restLines.slice(1).join(", ") : undefined,
    activity,
    chronologyLabel,
    chronology: chronologyLabel ? parseChronologyLabel(chronologyLabel) : undefined,
    description,
    fichaUrl: driveMatch ? `https://drive.google.com/file/d/${driveMatch[1]}/view` : undefined,
    driveFileId: driveMatch?.[1],
    point: roundPoint({ lat, lon }),
    iconCode: icon,
    uso: icon ? usoForIconCode(icon) : undefined,
  };
}
