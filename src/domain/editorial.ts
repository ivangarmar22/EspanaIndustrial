/**
 * Editorial layer applied by the data pipeline (files edited by hand, see docs/data/data-layout.md):
 * stable identifiers, manual overrides and review decisions. These files are
 * the source of truth for human work and are never rewritten by imports.
 */
import { z } from "zod";
import { CATEGORY_FAMILIES } from "./categories";
import {
  ActivityState,
  ConservationRating,
  LocationPrecision,
  PhysicalState,
  Point,
  RECORD_ID_PATTERN,
  SLUG_PATTERN,
} from "./schema";

const isoDateTime = z.iso.datetime({ offset: true });
const recordId = z.string().regex(RECORD_ID_PATTERN);

// ─── Registry: stable ids and slugs ─────────────────────────────────────────

const RegistryEntry = z.strictObject({
  id: recordId,
  slug: z.string().regex(SLUG_PATTERN),
  previousSlugs: z.array(z.string().regex(SLUG_PATTERN)).optional(),
  createdAt: isoDateTime,
});
export const Registry = z.strictObject({
  nextNumber: z.int().positive(),
  /** Keyed by "<sourceId>:<externalId>", e.g. "ministerio-cultura:AN-01". */
  entries: z.record(z.string(), RegistryEntry),
});
export type Registry = z.infer<typeof Registry>;

// ─── Overrides: manual corrections that imports never overwrite ─────────────

/** Fields an editor may override, with the schema of their value. `null` hides an imported value. */
const OVERRIDABLE_FIELDS = {
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  history: z.string().min(1).max(20000),
  typology: z.string().min(1).max(20000),
  activity: z.string().min(1).max(200),
  currentUse: z.string().min(1).max(500),
  ownership: z.string().min(1).max(300),
  address: z.string().min(1).max(300),
  /** Chronology as worded by a verified source, e.g. "1826-1884"; it is parsed like imported labels. */
  chronology: z.string().min(1).max(120),
  cadastralRef: z.string().regex(/^[0-9A-Z]{7,20}$/, "Referencia catastral no válida"),
  category: z.strictObject({ family: z.enum(CATEGORY_FAMILIES), sub: z.string().min(1) }),
  physicalState: PhysicalState,
  activityState: ActivityState,
  conservationRating: ConservationRating,
  visitable: z.enum(["yes", "partial", "no"]),
  website: z.url().refine((u) => /^https?:\/\//.test(u), "Solo se admiten URLs http(s)"),
  accessibilityNote: z.string().min(1).max(1000),
  point: Point,
  precision: LocationPrecision,
} as const;
export type OverridableField = keyof typeof OVERRIDABLE_FIELDS;

const FieldOverride = z.strictObject({
  value: z.unknown(),
  note: z.string().max(1000).optional(),
  editedAt: isoDateTime,
  /** Hash of the imported value the editor saw; lets the pipeline warn when the source changes underneath. */
  baseHash: z.string().optional(),
});

export const RecordOverride = z
  .strictObject({
    recordId,
    fields: z.record(z.string(), FieldOverride),
    /** Set when an editor confirmed the record's key facts against the primary source. */
    verifiedAt: z.iso.date().optional(),
    updatedAt: isoDateTime,
  })
  .superRefine((o, ctx) => {
    for (const [field, ov] of Object.entries(o.fields)) {
      const schema = OVERRIDABLE_FIELDS[field as OverridableField];
      if (!schema) {
        ctx.addIssue({ code: "custom", path: ["fields", field], message: `Campo no editable: ${field}` });
        continue;
      }
      if (ov.value === null) continue;
      const parsed = schema.safeParse(ov.value);
      if (!parsed.success)
        ctx.addIssue({
          code: "custom",
          path: ["fields", field],
          message: parsed.error.issues[0]?.message ?? "Valor no válido",
        });
    }
  });
export type RecordOverride = z.infer<typeof RecordOverride>;

// ─── Review decisions ───────────────────────────────────────────────────────

const decidedAt = isoDateTime;

export const Decisions = z.strictObject({
  /** Wikidata match decisions, keyed by IPCE code. */
  wikidata: z.record(
    z.string(),
    z.strictObject({ action: z.enum(["accept", "reject"]), qid: z.string().regex(/^Q\d+$/), decidedAt }),
  ),
  /** Duplicate-candidate verdicts, keyed by "<idA>|<idB>" (ids sorted). */
  duplicates: z.record(
    z.string(),
    z.strictObject({ verdict: z.enum(["distinct", "same"]), note: z.string().optional(), decidedAt }),
  ),
  /** Image decisions, keyed by Commons file name. */
  images: z.record(
    z.string(),
    z.strictObject({ action: z.enum(["approve", "reject"]), reason: z.string().optional(), decidedAt }),
  ),
  /** Records hidden from the public catalogue. */
  withdrawn: z.record(recordId, z.strictObject({ reason: z.string().min(1), decidedAt })),
  /** Explained discrepancies, keyed by "<recordId>:<field>". */
  discrepancies: z.record(z.string(), z.strictObject({ note: z.string().min(1), decidedAt })),
});
export type Decisions = z.infer<typeof Decisions>;

export const emptyDecisions = (): Decisions => ({
  wikidata: {},
  duplicates: {},
  images: {},
  withdrawn: {},
  discrepancies: {},
});

export const duplicatePairKey = (a: string, b: string) => [a, b].sort().join("|");
