/** Hand-written editorial content (data/editorial/*.json): collections and routes. */
import { z } from "zod";
import { CATEGORY_FAMILIES } from "./categories";
import { SLUG_PATTERN } from "./schema";

const Reference = z.strictObject({ title: z.string().min(1), url: z.url() });

export const Collection = z.strictObject({
  slug: z.string().regex(SLUG_PATTERN),
  title: z.string().min(1),
  intro: z.array(z.string().min(1)).min(1),
  /** Records are selected by criteria over the live catalogue, never listed with invented data. */
  criteria: z.strictObject({
    family: z.enum(CATEGORY_FAMILIES).optional(),
    subs: z.array(z.string()).optional(),
    regions: z.array(z.string().regex(/^\d{2}$/)).optional(),
    yearTo: z.int().optional(),
    codes: z.array(z.string()).optional(),
  }),
  references: z.array(Reference).min(1),
});
export type Collection = z.infer<typeof Collection>;

const RouteStop = z.strictObject({ code: z.string().min(1), note: z.string().optional() });

export const IndustrialRoute = z.strictObject({
  slug: z.string().regex(SLUG_PATTERN),
  title: z.string().min(1),
  theme: z.enum([
    "minera",
    "ferroviaria",
    "hidraulica",
    "textil",
    "energetica",
    "agroindustrial",
    "portuaria",
    "colonias",
    "urbana",
    "provincial",
  ]),
  /** "propuesta": suggested by this project; "oficial": published by a public body (must cite it). */
  kind: z.enum(["propuesta", "oficial"]),
  territory: z.string().min(1),
  intro: z.array(z.string().min(1)).min(1),
  stops: z.array(RouteStop).min(2),
  references: z.array(Reference).min(1),
});
export type IndustrialRoute = z.infer<typeof IndustrialRoute>;

export const MIN_COLLECTION_SIZE = 3;
