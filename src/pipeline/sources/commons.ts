/**
 * Wikimedia Commons metadata for images linked from matched Wikidata items
 * (P18). Only licences in ACCEPTED_IMAGE_LICENSES are accepted; everything else
 * is kept with a rejection reason for review. Images are downloaded separately
 * by `data:media`, never hotlinked.
 */
import { ACCEPTED_IMAGE_LICENSES } from "@/domain/schema";
import type { Connector, ConnectorContext, ConnectorOutcome } from "../connector";
import { readJson, sha256, writeJsonAtomic } from "../fs";
import { InvalidResponseError, SourceUnavailableError } from "../http";
import { paths } from "../paths";
import type { CommonsImage, CommonsStaging, StagingFile, WikidataStaging } from "../staging";

const SOURCE_ID = "wikimedia-commons";
const API = "https://commons.wikimedia.org/w/api.php";
const THUMB_WIDTH = 1600;

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Maps Commons `LicenseShortName` variants to an accepted canonical name, or undefined. */
export function normalizeLicense(shortName: string): (typeof ACCEPTED_IMAGE_LICENSES)[number] | undefined {
  const s = shortName.trim().toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  if (s === "CC0" || s === "CC0 1.0" || s === "CC ZERO") return "CC0";
  if (s === "PUBLIC DOMAIN" || s.startsWith("PD ") || s === "PD") return "Public domain";
  const m = s.match(/^CC (BY(?: SA)?) (\d\.\d)$/);
  if (!m) return undefined;
  const candidate = `CC ${m[1]!.replace(" ", "-")} ${m[2]}`;
  return (ACCEPTED_IMAGE_LICENSES as readonly string[]).includes(candidate)
    ? (candidate as (typeof ACCEPTED_IMAGE_LICENSES)[number])
    : undefined;
}

interface ImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        missing?: string;
        imageinfo?: Array<{
          thumburl?: string;
          thumbwidth?: number;
          thumbheight?: number;
          descriptionurl: string;
          extmetadata?: Record<string, { value: string } | undefined>;
        }>;
      }
    >;
  };
}

function toCommonsImage(
  file: string,
  page: NonNullable<NonNullable<ImageInfoResponse["query"]>["pages"]>[string],
  now: string,
): CommonsImage | undefined {
  const info = page.imageinfo?.[0];
  if (page.missing !== undefined || !info?.thumburl || !info.thumbwidth || !info.thumbheight) return undefined;
  const meta = info.extmetadata ?? {};
  const v = (k: string) => (meta[k]?.value ? stripHtml(meta[k]!.value) : undefined);
  const shortName = v("LicenseShortName") ?? "";
  const license = normalizeLicense(shortName);
  const author = v("Artist");
  const image: CommonsImage = {
    file,
    pageUrl: info.descriptionurl,
    downloadUrl: info.thumburl,
    width: info.thumbwidth,
    height: info.thumbheight,
    license: license ?? shortName,
    author: author ?? "",
    attributionRequired: v("AttributionRequired") !== "false",
    accepted: !!license && !!author,
    retrievedAt: now,
  };
  const licenseUrl = v("LicenseUrl");
  if (licenseUrl) image.licenseUrl = licenseUrl;
  const description = v("ImageDescription");
  if (description) image.description = description.slice(0, 300);
  const taken = v("DateTimeOriginal");
  if (taken) image.takenAt = taken.slice(0, 40);
  if (!license) image.rejectionReason = `Licencia no admitida automáticamente: "${shortName || "desconocida"}"`;
  else if (!author) image.rejectionReason = "Autor no declarado en los metadatos";
  return image;
}

async function run(ctx: ConnectorContext): Promise<ConnectorOutcome> {
  const warnings: string[] = [];
  const wd = await readJson<StagingFile<WikidataStaging>>(paths.staging("wikidata"));
  if (!wd)
    return { sourceId: SOURCE_ID, status: "unavailable", message: "No hay staging de Wikidata todavía", warnings };
  if (ctx.options.offline) return { sourceId: SOURCE_ID, status: "unchanged", message: "offline", warnings };

  const file = paths.staging(SOURCE_ID);
  const previous = await readJson<StagingFile<CommonsStaging>>(file);
  const files = [
    ...new Set(
      Object.values(wd.data).flatMap((m) => [m.entity?.image, m.acceptedEntity?.image].filter((f): f is string => !!f)),
    ),
  ];
  const out: CommonsStaging = {};

  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const titles = batch.map((f) => `File:${f}`).join("|");
    const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${THUMB_WIDTH}&titles=${encodeURIComponent(titles)}`;
    try {
      const res = await ctx.http.getJson<ImageInfoResponse>(url);
      const now = new Date().toISOString();
      for (const page of Object.values(res.query?.pages ?? {})) {
        const name = page.title.replace(/^File:/, "");
        const image = toCommonsImage(name, page, now);
        if (image) out[name] = image;
        else warnings.push(`Commons: "${name}" no existe o no tiene miniatura`);
      }
    } catch (err) {
      if (!(err instanceof SourceUnavailableError || err instanceof InvalidResponseError)) throw err;
      warnings.push(`Commons: ${err.message}; se conservan los metadatos anteriores del lote`);
      for (const f of batch) if (previous?.data[f]) out[f] = previous.data[f]!;
    }
  }

  const contentHash = sha256(JSON.stringify(out, (k, v) => (k === "retrievedAt" ? undefined : v)));
  if (previous && previous.contentHash === contentHash) return { sourceId: SOURCE_ID, status: "unchanged", warnings };
  await writeJsonAtomic(file, { sourceId: SOURCE_ID, retrievedAt: new Date().toISOString(), contentHash, data: out });
  const accepted = Object.values(out).filter((i) => i.accepted).length;
  return {
    sourceId: SOURCE_ID,
    status: "updated",
    message: `${accepted} imágenes con licencia admitida de ${Object.keys(out).length}`,
    warnings,
  };
}

export const commons: Connector = { id: SOURCE_ID, run };
