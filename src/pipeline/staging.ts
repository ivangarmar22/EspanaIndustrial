/**
 * Shapes of the per-source staging files (data/staging/<source>.json). A
 * staging file is the last *successful* normalised import of a source; when a
 * fetch fails the previous file is kept untouched.
 */
import type { Point } from "@/domain/schema";
import type { FichaFields } from "./sources/ministerio-cultura/ficha";
import type { McPoint } from "./sources/ministerio-cultura/kml";

export interface StagingFile<T> {
  sourceId: string;
  retrievedAt: string;
  /** Hash of the raw input(s); unchanged hash ⇒ unchanged source. */
  contentHash: string;
  data: T;
}

export interface McFicha {
  driveFileId: string;
  url: string;
  sha256: string;
  retrievedAt: string;
  fields: FichaFields;
  /** True when this run could not download the PDF and the previous extraction was reused. */
  stale?: boolean;
}

export interface McItem {
  code: string;
  points: McPoint[];
  ficha?: McFicha;
}

export interface McStaging {
  kmlUrl: string;
  items: McItem[];
}

export interface CartoCiudadPlace {
  point: Point;
  municipality?: string;
  ineCode?: string;
  provinceCode?: string;
  regionCode?: string;
  cadastralRef?: string;
  retrievedAt: string;
}

/** Keyed by "lat,lon" of the queried point. */
export type CartoCiudadStaging = Record<string, CartoCiudadPlace>;

export interface WikidataCandidate {
  qid: string;
  label: string;
  distanceM: number;
  similarity: number;
}

export interface WikidataEntity {
  qid: string;
  label?: string;
  description?: string;
  point?: Point;
  inception?: { time: string; precision: number };
  heritageStatus: string[];
  bic?: string;
  iaph?: string;
  ipac?: string;
  igpcv?: string;
  image?: string;
  eswiki?: string;
  retrievedAt: string;
}

export interface WikidataMatch {
  /** Point used for the proximity query; a moved point triggers a new query. */
  queriedPoint: string;
  decision: "auto" | "candidate" | "none";
  qid?: string;
  candidates: WikidataCandidate[];
  entity?: WikidataEntity;
  /** Entity data for a different candidate accepted in data/review/decisions.json. */
  acceptedEntity?: WikidataEntity;
}

/** Keyed by IPCE code. */
export type WikidataStaging = Record<string, WikidataMatch>;

export interface CommonsImage {
  file: string;
  pageUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  license: string;
  licenseUrl?: string;
  author: string;
  attributionRequired: boolean;
  description?: string;
  takenAt?: string;
  accepted: boolean;
  rejectionReason?: string;
  retrievedAt: string;
}

/** Keyed by Commons file name. */
export type CommonsStaging = Record<string, CommonsImage>;
