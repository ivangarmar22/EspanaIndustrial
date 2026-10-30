/**
 * Runtime schemas (Zod) and TypeScript types for the heritage catalogue.
 *
 * Core ideas:
 * - Unknown data is *absent*, never filled with a placeholder.
 * - Every documentary field is an `Attested<T>`: a value plus the keys of the
 *   sources that support it (`record.sources[key]`).
 * - Conflicting values are kept in `alternatives` and summarised in
 *   `record.discrepancies` instead of being silently resolved.
 */
import { z } from "zod";
import { CATEGORY_FAMILIES, isValidCategory } from "./categories";
import { isInsideSpainBounds } from "./territory";

// ─── Sources & provenance ────────────────────────────────────────────────────

const SOURCE_IDS = [
  "ministerio-cultura",
  "cartociudad",
  "wikidata",
  "wikimedia-commons",
  "editorial",
  "contribution",
] as const;
const SourceId = z.enum(SOURCE_IDS);

/** Reliability tier of a source. Never presented as a numeric score. */
export const SourceTier = z.enum([
  "primary", // official body responsible for the inventory (IPCE, BOE…)
  "official-secondary", // official but not the heritage authority (IGN/CartoCiudad)
  "collaborative", // Wikidata, Commons, OSM
  "editorial", // reviewed by the project editor
]);
export type SourceTier = z.infer<typeof SourceTier>;

const ExtractionMethod = z.enum([
  "kml",
  "pdf-text",
  "api",
  "derived", // deterministic rule over another source (documented in code)
  "manual",
]);

const ReviewState = z.enum(["unreviewed", "needs-review", "reviewed"]);

const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date();

export const SourceRef = z.strictObject({
  sourceId: SourceId,
  tier: SourceTier,
  title: z.string().min(1),
  organization: z.string().min(1).optional(),
  url: z.url().optional(),
  externalId: z.string().min(1).optional(),
  /** When the document was downloaded. NOT a verification date. */
  retrievedAt: isoDateTime,
  /** Publication / update date declared by the source, if any. */
  publishedAt: isoDate.optional(),
  locator: z.string().min(1).optional(),
  license: z.string().min(1),
  method: ExtractionMethod,
  review: ReviewState,
  note: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

function attested<T extends z.ZodType>(value: T) {
  const claim = z.strictObject({
    value,
    src: z.array(z.string().min(1)).min(1),
    note: z.string().optional(),
  });
  return claim.extend({ alternatives: z.array(claim).optional() });
}
export interface Claim<T> {
  value: T;
  src: string[];
  note?: string;
}
export interface Attested<T> extends Claim<T> {
  alternatives?: Claim<T>[];
}

// ─── Historical dates ────────────────────────────────────────────────────────

const year = z.int().min(-3000).max(2100);

export const HistoricalDate = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("year"), year }),
  z.strictObject({ kind: z.literal("circa"), year }),
  z.strictObject({ kind: z.literal("range"), from: year, to: year }),
  z.strictObject({
    kind: z.literal("century"),
    century: z.int().min(1).max(21),
    part: z.enum(["early", "mid", "late"]).optional(),
  }),
]);
export type HistoricalDate = z.infer<typeof HistoricalDate>;

export const Period = z.strictObject({
  from: HistoricalDate.optional(),
  to: HistoricalDate.optional(),
  /** Original wording of the source, e.g. "1720-1916". */
  label: z.string().min(1),
});
export type Period = z.infer<typeof Period>;

// ─── Status & protection ────────────────────────────────────────────────────

/** Physical state. Independent from activity and current use. */
export const PhysicalState = z.enum(["conserved", "partially-conserved", "ruins", "disappeared"]);
export type PhysicalState = z.infer<typeof PhysicalState>;

/** Conservation rating as worded by the IPCE sheets (Bueno / Regular / Malo…). */
export const ConservationRating = z.enum(["good", "fair", "poor", "very-poor"]);
export type ConservationRating = z.infer<typeof ConservationRating>;

export const ActivityState = z.enum(["active", "inactive"]);

const Conservation = z.strictObject({
  rating: ConservationRating.optional(),
  /** Literal text from the source (kept verbatim). */
  original: z.string().min(1),
});

export const ProtectionLevel = z.enum([
  "BIC", // Bien de Interés Cultural (and regional equivalents: BCIN…)
  "BRL", // Bien de Relevancia Local / Bien Catalogado / BIL
  "BIP", // Bien de Interés Patrimonial and similar
  "inventario", // included in a regional inventory without declaration
  "planeamiento", // protected through municipal planning
  "unesco", // part of a World Heritage property
  "other",
]);
export type ProtectionLevel = z.infer<typeof ProtectionLevel>;

export const Protection = z.strictObject({
  level: ProtectionLevel,
  /** Literal protection type as worded by the source, e.g. "BIC (Grado I)". */
  original: z.string().min(1),
  /**
   * Dates exactly as printed by the source. They are NOT mapped to
   * declaration/publication because the IPCE sheets are ambiguous about which is which.
   */
  datesAsPrinted: z.array(z.string().min(1)).optional(),
  declaredAt: isoDate.optional(),
  publishedAt: isoDate.optional(),
  bulletinUrl: z.url().optional(),
});
export type Protection = z.infer<typeof Protection>;

// ─── Location ───────────────────────────────────────────────────────────────

export const Point = z
  .strictObject({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
  .refine((p) => isInsideSpainBounds(p.lat, p.lon), "Coordinates fall outside Spain's bounding box");
export type Point = z.infer<typeof Point>;

export const LocationPrecision = z.enum(["exact", "approximate", "municipality"]);

const Municipality = z.strictObject({
  name: z.string().min(1),
  ineCode: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
});

const Location = z.strictObject({
  point: attested(Point).optional(),
  precision: LocationPrecision.optional(),
  /** Extra points for ensembles that span several sites. */
  extraPoints: z.array(z.strictObject({ label: z.string().min(1), point: attested(Point) })).optional(),
  address: attested(z.string().min(1)).optional(),
  municipality: attested(Municipality).optional(),
  provinceCode: z
    .string()
    .regex(/^\d{2}$/)
    .optional(),
  regionCode: z
    .string()
    .regex(/^\d{2}$/)
    .optional(),
  cadastralRef: attested(z.string().min(1)).optional(),
});

// ─── Media & documents ──────────────────────────────────────────────────────

export const ACCEPTED_IMAGE_LICENSES = [
  "CC0",
  "Public domain",
  "CC BY 2.0",
  "CC BY 2.5",
  "CC BY 3.0",
  "CC BY 4.0",
  "CC BY-SA 2.0",
  "CC BY-SA 2.5",
  "CC BY-SA 3.0",
  "CC BY-SA 4.0",
] as const;

export const ImageAsset = z.strictObject({
  id: z.string().min(1),
  /** Local path under /media (downloaded by `data:media`). Absent until downloaded. */
  localPath: z.string().startsWith("/media/").optional(),
  width: z.int().positive(),
  height: z.int().positive(),
  alt: z.string().min(1),
  caption: z.string().optional(),
  author: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.url().optional(),
  attributionRequired: z.boolean(),
  /** Page describing the file at its origin (e.g. Commons file page). */
  sourcePageUrl: z.url(),
  /** URL the image was / will be downloaded from (thumbnail of an agreed width). */
  downloadUrl: z.url(),
  takenAt: z.string().optional(),
  src: z.array(z.string().min(1)).min(1),
  review: ReviewState,
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const DocumentLink = z.strictObject({
  title: z.string().min(1),
  url: z.url(),
  kind: z.enum(["pdf", "web", "bulletin", "article"]),
  src: z.array(z.string().min(1)).min(1),
});
export type DocumentLink = z.infer<typeof DocumentLink>;

// ─── Editorial state ────────────────────────────────────────────────────────

/**
 * Documentary validation policy (see docs/data/quality-policy.md):
 * - primary-verified: key facts come from the primary source and were reviewed.
 * - cross-checked: primary source plus at least one independent source agree.
 * - partial: primary source exists but relevant fields are missing or unreviewed.
 * - secondary: only collaborative/secondary sources.
 * - pending: not yet reviewed.
 */
export const ValidationLevel = z.enum(["primary-verified", "cross-checked", "partial", "secondary", "pending"]);
export type ValidationLevel = z.infer<typeof ValidationLevel>;

const Editorial = z.strictObject({
  /** imported → edited (manual override applied) → verified (editorially checked). */
  state: z.enum(["imported", "edited", "verified"]),
  validation: ValidationLevel,
  published: z.boolean(),
  withdrawnReason: z.string().optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  /** Date an editor confirmed the data still holds. Absent until it happens. */
  lastVerifiedAt: isoDate.optional(),
});

export const Discrepancy = z.strictObject({
  field: z.string().min(1),
  note: z.string().min(1),
  status: z.enum(["open", "explained"]),
});
export type Discrepancy = z.infer<typeof Discrepancy>;

const ExternalIds = z.strictObject({
  ipce: z.string().optional(),
  wikidata: z
    .string()
    .regex(/^Q\d+$/)
    .optional(),
  bic: z.string().optional(),
  iaph: z.string().optional(),
  ipac: z.string().optional(),
  igpcv: z.string().optional(),
  catastro: z.string().optional(),
});

// ─── Record ─────────────────────────────────────────────────────────────────

export const RECORD_ID_PATTERN = /^ei-\d{5}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const HeritageRecord = z
  .strictObject({
    id: z.string().regex(RECORD_ID_PATTERN),
    slug: z.string().regex(SLUG_PATTERN).max(120),
    previousSlugs: z.array(z.string().regex(SLUG_PATTERN)).optional(),

    name: attested(z.string().min(1)),
    altNames: z.array(attested(z.string().min(1))).optional(),

    category: z.strictObject({
      family: z.enum(CATEGORY_FAMILIES),
      sub: z.string().min(1),
      src: z.array(z.string().min(1)).min(1),
      /** Original typology wording of the source, e.g. IPCE legend "Fundición, Alto horno". */
      original: z.string().optional(),
    }),
    tags: z.array(z.string().min(1)).optional(),
    activity: attested(z.string().min(1)).optional(),

    summary: attested(z.string().min(1)).optional(),
    history: attested(z.string().min(1)).optional(),
    typology: attested(z.string().min(1)).optional(),
    constituentElements: attested(z.string().min(1)).optional(),
    authorship: attested(z.string().min(1)).optional(),
    interventions: attested(z.string().min(1)).optional(),
    /** Bibliographic references as listed by the source (verbatim lines). */
    bibliography: attested(z.array(z.string().min(1)).min(1)).optional(),

    chronology: attested(Period).optional(),
    inception: attested(HistoricalDate).optional(),
    activityEnd: attested(HistoricalDate).optional(),

    conservation: attested(Conservation).optional(),
    physicalState: attested(PhysicalState).optional(),
    activityState: attested(ActivityState).optional(),
    currentUse: attested(z.string().min(1)).optional(),
    ownership: attested(z.string().min(1)).optional(),
    protection: z.array(attested(Protection)).optional(),

    location: Location,

    visit: z
      .strictObject({
        visitable: attested(z.enum(["yes", "partial", "no"])).optional(),
        website: attested(z.url()).optional(),
        accessibilityNote: attested(z.string().min(1)).optional(),
      })
      .optional(),

    images: z.array(ImageAsset).optional(),
    documents: z.array(DocumentLink).optional(),
    externalIds: ExternalIds,
    related: z.array(z.string().regex(RECORD_ID_PATTERN)).optional(),

    sources: z.record(z.string().min(1), SourceRef),
    discrepancies: z.array(Discrepancy).optional(),
    editorial: Editorial,
  })
  .superRefine((rec, ctx) => {
    if (!isValidCategory(rec.category.family, rec.category.sub)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: `Invalid subcategory ${rec.category.sub}` });
    }
    // Every source key referenced anywhere must exist in `sources`.
    const known = new Set(Object.keys(rec.sources));
    for (const key of collectSourceKeys(rec)) {
      if (!known.has(key)) ctx.addIssue({ code: "custom", path: ["sources"], message: `Unknown source key: ${key}` });
    }
  });
export type HeritageRecord = z.infer<typeof HeritageRecord>;

/** Walks a record and returns every source key referenced in `src` arrays. */
export function collectSourceKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) collectSourceKeys(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "sources") continue;
      if (k === "src" && Array.isArray(v)) v.forEach((s) => typeof s === "string" && out.add(s));
      else collectSourceKeys(v, out);
    }
  }
  return out;
}

export const Catalog = z.strictObject({
  schemaVersion: z.literal(1),
  generatedAt: isoDateTime,
  records: z.array(HeritageRecord),
});
export type Catalog = z.infer<typeof Catalog>;
