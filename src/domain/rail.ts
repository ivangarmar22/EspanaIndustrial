/**
 * Closed railway stations (Wikidata) and former railway alignments and
 * greenways (OpenStreetMap). A separate dataset from the heritage catalogue:
 * different sources, different licence (ODbL, because it is derived from OSM).
 */
import { z } from "zod";

/** Wikidata P5817 (state of use) values counted as "no longer a working station". */
export const STATION_STATUS = {
  closed: { qid: "Q11639308", label: "Cerrada", description: "Sin servicio de viajeros según Wikidata." },
  "out-of-service": {
    qid: "Q56651571",
    label: "Fuera de servicio",
    description: "Fuera de servicio según Wikidata; puede reabrirse.",
  },
  abandoned: { qid: "Q63065035", label: "Abandonada", description: "Marcada como abandonada en Wikidata." },
  demolished: { qid: "Q56556915", label: "Derribada", description: "El edificio ya no existe según Wikidata." },
} as const;
export type StationStatus = keyof typeof STATION_STATUS;
export const STATION_STATUSES = Object.keys(STATION_STATUS) as StationStatus[];

/** State of the line as recorded in Wikidata (unreliable for partially closed lines; always shown as such). */
export const LINE_STATE_LABELS = {
  active: "En servicio (al menos en parte)",
  closed: "Clausurada",
  unknown: "Sin dato",
} as const;
export type LineState = keyof typeof LINE_STATE_LABELS;

/** Kinds of OSM alignment drawn on the map. */
export const TRACK_KINDS = {
  greenway: { label: "Vía Verde", description: "Antiguo trazado acondicionado para caminar y pedalear." },
  trail: {
    label: "Camino sobre el antiguo trazado",
    description: "Hay un camino o pista según OSM, no señalizado como Vía Verde.",
  },
  abandoned: {
    label: "Trazado abandonado",
    description: "Sin carriles ni camino documentado. Puede ser propiedad privada.",
  },
  disused: { label: "Vía sin servicio", description: "Conserva los carriles. No se debe caminar por ella." },
} as const;
export type TrackKind = keyof typeof TRACK_KINDS;

/** Greenway within this distance of a station counts as "nearby". */
export const GREENWAY_NEAR_M = 1500;

export const RailStation = z.object({
  id: z.string().regex(/^Q\d+$/),
  name: z.string().min(1),
  lat: z.number().min(27).max(44.5),
  lon: z.number().min(-18.5).max(4.6),
  status: z.enum(STATION_STATUSES as [StationStatus, ...StationStatus[]]),
  lines: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  openedYear: z.number().int().optional(),
  closedYear: z.number().int().optional(),
  municipality: z.string().optional(),
  provinceCode: z.string().length(2).optional(),
  regionCode: z.string().length(2).optional(),
  /** Commons file name of the Wikidata image (P18); linked, never hotlinked or copied. */
  commonsFile: z.string().optional(),
  greenway: z.object({ name: z.string(), distanceM: z.number().int() }).optional(),
  /** Distance to the nearest former alignment mapped in OSM, when close enough to be the station's own line. */
  trackbedM: z.number().int().optional(),
});
export type RailStation = z.infer<typeof RailStation>;

export const RailLine = z.object({
  id: z.string().regex(/^Q\d+$/),
  slug: z.string(),
  name: z.string(),
  state: z.enum(["active", "closed", "unknown"]),
  closedYear: z.number().int().optional(),
  stationCount: z.number().int(),
  regionCodes: z.array(z.string()),
  greenways: z.array(z.string()),
});
export type RailLine = z.infer<typeof RailLine>;

export const RailDataset = z.object({
  generatedAt: z.string(),
  license: z.literal("ODbL-1.0"),
  sources: z.array(
    z.object({ id: z.string(), name: z.string(), url: z.string(), license: z.string(), fetchedAt: z.string() }),
  ),
  stats: z.object({
    stations: z.number().int(),
    stationsWithoutCoordinates: z.number().int(),
    lines: z.number().int(),
    trackKm: z.record(z.string(), z.number()),
  }),
  stations: z.array(RailStation),
  lines: z.array(RailLine),
});
export type RailDataset = z.infer<typeof RailDataset>;

/** Lines with enough closed stations to deserve their own page. */
export const LINE_PAGE_MIN_STATIONS = 3;

export const commonsFileUrl = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;
