/**
 * Builds catalogue records from staged sources + editorial layer. Pure with
 * respect to its inputs (no I/O), so it is fully unit-testable.
 */
import { parseChronologyLabel } from "@/domain/dates";
import type { Decisions, OverridableField, Registry, RecordOverride } from "@/domain/editorial";
import {
  HeritageRecord,
  collectSourceKeys,
  type Attested,
  type Claim,
  type Discrepancy,
  type DocumentLink,
  type HistoricalDate,
  type ImageAsset,
  type Protection,
  type SourceRef,
} from "@/domain/schema";
import { getProvince } from "@/domain/territory";
import { distanceMeters } from "@/lib/geo";
import { normalizeText, sentenceCaseIfShouting, slugify } from "@/lib/text";
import { classify } from "./classify";
import {
  joinLayoutHyphens,
  looksLikeAddress,
  nameFromPlaceText,
  restoreCase,
  stripLocationSuffix,
  tidyName,
  vocabularyOf,
} from "./naming";
import { LISTING_URL, printedCode } from "./sources/ministerio-cultura/constants";
import type {
  CartoCiudadStaging,
  CommonsStaging,
  McItem,
  McStaging,
  StagingFile,
  WikidataMatch,
  WikidataStaging,
} from "./staging";
import { pointKey } from "./sources/cartociudad";
import { sha256 } from "./fs";

export interface BuildInputs {
  ministerio: StagingFile<McStaging>;
  cartociudad?: StagingFile<CartoCiudadStaging>;
  wikidata?: StagingFile<WikidataStaging>;
  commons?: StagingFile<CommonsStaging>;
  registry: Registry;
  decisions: Decisions;
  overrides: Map<string, RecordOverride>;
  previous: Map<string, HeritageRecord>;
  /** Local media path for a Commons file if it has been downloaded. */
  mediaPathFor: (file: string) => string | undefined;
  now: string;
}

export interface BuildIssue {
  level: "error" | "warning";
  code?: string;
  recordId?: string;
  message: string;
}

export interface BuildResult {
  records: HeritageRecord[];
  registry: Registry;
  issues: BuildIssue[];
}

const MC_LICENSE = "Licencia general de reutilización (RD 1495/2011). Origen de los datos: Ministerio de Cultura";
const POINT_DISCREPANCY_M = 250;
const WIKIDATA_POINT_DISCREPANCY_M = 500;

const claim = <T>(value: T, src: string[], note?: string): Attested<T> =>
  note ? { value, src, note } : { value, src };

const registryKey = (code: string) => `ministerio-cultura:${code}`;

function assignIdentity(
  registry: Registry,
  code: string,
  name: string,
  municipality: string | undefined,
  now: string,
  taken: Set<string>,
): Registry["entries"][string] {
  const existing = registry.entries[registryKey(code)];
  if (existing) {
    taken.add(existing.slug);
    return existing;
  }
  const base = slugify(name);
  const options = [
    base,
    municipality ? `${base}-${slugify(municipality, 30)}` : undefined,
    `${base}-${code.toLowerCase()}`,
  ].filter((s): s is string => !!s);
  const usedSlugs = new Set([
    ...Object.values(registry.entries).flatMap((e) => [e.slug, ...(e.previousSlugs ?? [])]),
    ...taken,
  ]);
  const slug = options.find((s) => !usedSlugs.has(s)) ?? `${base}-${registry.nextNumber}`;
  const entry = { id: `ei-${String(registry.nextNumber).padStart(5, "0")}`, slug, createdAt: now };
  registry.nextNumber++;
  registry.entries[registryKey(code)] = entry;
  taken.add(slug);
  return entry;
}

function wikidataDate(inception: { time: string; precision: number }): HistoricalDate | undefined {
  const m = inception.time.match(/^([+-])(\d{1,4})-/);
  if (!m) return undefined;
  const year = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  if (inception.precision >= 9) return { kind: "year", year };
  if (inception.precision === 8)
    return { kind: "range", from: Math.floor(year / 10) * 10, to: Math.floor(year / 10) * 10 + 9 };
  if (inception.precision === 7) return { kind: "century", century: Math.floor((year - 1) / 100) + 1 };
  return undefined;
}

const conservationRating = (text: string) => {
  const first = normalizeText(text).split(" ")[0];
  if (first === "bueno" || first === "buena") return "good" as const;
  if (first === "regular") return "fair" as const;
  if (first === "malo" || first === "mala" || first === "deficiente") return "poor" as const;
  if (first === "ruina" || first === "ruinoso") return "very-poor" as const;
  return undefined;
};

function resolveWikidata(code: string, match: WikidataMatch | undefined, decisions: Decisions) {
  if (!match) return undefined;
  const decision = decisions.wikidata[code];
  if (decision?.action === "accept") {
    const entity = decision.qid === match.qid ? match.entity : match.acceptedEntity;
    return entity?.qid === decision.qid ? { entity, reviewed: true } : undefined;
  }
  if (!match.entity || (decision?.action === "reject" && decision.qid === match.qid)) return undefined;
  return match.decision === "auto" ? { entity: match.entity, reviewed: false } : undefined;
}

function primaryName(
  item: McItem,
  municipality: string | undefined,
): { name: Attested<string>; alts: Attested<string>[] } {
  const f = item.ficha?.fields;
  const first = item.points[0]!;
  // Running prose only: map titles are often mis-cased and would mislead the case restoration.
  // The official municipality name teaches how its words are written ("Villafranca de los Barros").
  const corpus = [
    ...item.points.map((p) => p.description),
    f?.history,
    f?.typology,
    f?.constituentElements,
    f?.conservation,
    f?.interventions,
    municipality ? `Situado en ${municipality}.` : undefined,
  ].filter((t): t is string => !!t);
  const strip = (s: string) => stripLocationSuffix(tidyName(s), municipality);

  const candidates: Array<{ value: string; src: string }> = [];
  if (f?.officialName) candidates.push({ value: strip(restoreCase(f.officialName, corpus)), src: "ipce-ficha" });
  for (const p of item.points) {
    if (p.nameLine && !looksLikeAddress(p.nameLine)) candidates.push({ value: strip(p.nameLine), src: "ipce-map" });
  }
  if (!candidates.length && first.placeText) {
    const fromLabel = nameFromPlaceText(first.placeText);
    if (fromLabel) candidates.push({ value: strip(fromLabel), src: "ipce-map" });
  }
  candidates.push({ value: restoreCase(first.mapLabel, corpus), src: "ipce-map" });

  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const k = normalizeText(c.value);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const [main, ...rest] = unique;
  return {
    name: claim(sentenceCaseIfShouting(main!.value), [main!.src]),
    alts: [
      ...rest.map((c) => claim(c.value, [c.src])),
      ...(f?.otherNames ?? []).map((n) => claim(restoreCase(n, corpus), ["ipce-ficha"])),
    ],
  };
}

function applyOverrides(
  rec: Record<string, unknown> & { sources: Record<string, SourceRef> },
  ov: RecordOverride,
  issues: BuildIssue[],
  baseValues: Partial<Record<OverridableField, unknown>>,
) {
  rec.sources.editorial = {
    sourceId: "editorial",
    tier: "editorial",
    title: "Revisión editorial de España Industrial",
    retrievedAt: ov.updatedAt,
    license: "CC BY 4.0",
    method: "manual",
    review: "reviewed",
  };
  const loc = rec.location as Record<string, unknown>;
  const visit = (rec.visit ??= {}) as Record<string, unknown>;
  const put = (target: Record<string, unknown>, key: string, value: unknown, note?: string) => {
    if (value === null) {
      delete target[key];
      return;
    }
    const previous = target[key] as Attested<unknown> | undefined;
    const next: Attested<unknown> = claim(value, ["editorial"], note);
    if (previous && JSON.stringify(previous.value) !== JSON.stringify(value))
      next.alternatives = [{ value: previous.value, src: previous.src }];
    target[key] = next;
  };

  for (const [field, o] of Object.entries(ov.fields)) {
    const f = field as OverridableField;
    if (o.baseHash && baseValues[f] !== undefined && sha256(JSON.stringify(baseValues[f])) !== o.baseHash) {
      issues.push({
        level: "warning",
        recordId: ov.recordId,
        message: `La fuente cambió el campo "${f}", que tiene una corrección manual. Revisa si la corrección sigue siendo válida.`,
      });
    }
    switch (f) {
      case "category": {
        const v = o.value as { family: string; sub: string };
        rec.category = { family: v.family, sub: v.sub, src: ["editorial"] };
        break;
      }
      case "conservationRating": {
        const prev = rec.conservation as Attested<{ rating?: string; original: string }> | undefined;
        if (o.value === null) {
          if (prev) delete prev.value.rating;
        } else
          rec.conservation = claim(
            { ...(prev?.value ?? { original: "Valoración editorial" }), rating: o.value },
            ["editorial", ...(prev?.src ?? [])],
            o.note,
          );
        break;
      }
      case "point":
      case "address":
        put(loc, f, o.value, o.note);
        break;
      case "cadastralRef": {
        put(loc, f, o.value, o.note);
        const ids = rec.externalIds as Record<string, string | undefined>;
        if (o.value === null) delete ids.catastro;
        else ids.catastro = o.value as string;
        break;
      }
      case "chronology":
        put(
          rec,
          f,
          o.value === null ? null : (parseChronologyLabel(o.value as string) ?? { label: o.value as string }),
          o.note,
        );
        break;
      case "precision":
        if (o.value === null) delete loc.precision;
        else loc.precision = o.value;
        break;
      case "visitable":
      case "website":
      case "accessibilityNote":
        put(visit, f, o.value, o.note);
        break;
      default:
        put(rec, f, o.value, o.note);
    }
  }
  if (Object.keys(visit).length === 0) delete rec.visit;
}

export function buildCatalog(input: BuildInputs): BuildResult {
  const issues: BuildIssue[] = [];
  const registry: Registry = structuredClone(input.registry);
  const takenSlugs = new Set<string>();
  const records: HeritageRecord[] = [];
  const mc = input.ministerio;
  const vocabulary = vocabularyOf(
    mc.data.items.flatMap((i) => {
      const f = i.ficha?.fields;
      return [
        ...i.points.map((p) => p.description),
        f?.history,
        f?.typology,
        f?.constituentElements,
        f?.conservation,
        f?.interventions,
      ].filter((t): t is string => !!t);
    }),
  );
  const prose = (t: string) => joinLayoutHyphens(t, vocabulary);

  for (const item of mc.data.items) {
    const first = item.points[0]!;
    const ficha = item.ficha;
    const f = ficha?.fields;
    const place = input.cartociudad?.data[pointKey(first.point)];
    const wd = resolveWikidata(item.code, input.wikidata?.data[item.code], input.decisions);

    const sources: Record<string, SourceRef> = {
      "ipce-map": {
        sourceId: "ministerio-cultura",
        tier: "primary",
        title: "Mapa interactivo del Plan Nacional de Patrimonio Industrial",
        organization: "Ministerio de Cultura — Instituto del Patrimonio Cultural de España",
        url: LISTING_URL,
        externalId: printedCode(item.code),
        retrievedAt: mc.retrievedAt,
        license: MC_LICENSE,
        method: "kml",
        review: "unreviewed",
      },
    };
    if (ficha) {
      sources["ipce-ficha"] = {
        sourceId: "ministerio-cultura",
        tier: "primary",
        title: `Ficha documental ${printedCode(item.code)} del Plan Nacional de Patrimonio Industrial`,
        organization: "Ministerio de Cultura — Instituto del Patrimonio Cultural de España",
        url: ficha.url,
        externalId: printedCode(item.code),
        retrievedAt: ficha.retrievedAt,
        license: MC_LICENSE,
        method: "pdf-text",
        review: "needs-review",
        note: ficha.stale
          ? "La última descarga falló; se muestra la extracción anterior."
          : "Extracción automática del texto del PDF; pendiente de revisión editorial.",
      };
    }
    if (place) {
      sources.cartociudad = {
        sourceId: "cartociudad",
        tier: "official-secondary",
        title: "CartoCiudad — geocodificación inversa",
        organization: "Instituto Geográfico Nacional",
        url: "https://www.cartociudad.es/",
        retrievedAt: place.retrievedAt,
        license: "CC BY 4.0 — CartoCiudad © IGN",
        method: "api",
        review: "unreviewed",
      };
    }
    if (wd) {
      sources.wikidata = {
        sourceId: "wikidata",
        tier: "collaborative",
        title: `Wikidata ${wd.entity.qid}${wd.entity.label ? ` — ${wd.entity.label}` : ""}`,
        url: `https://www.wikidata.org/wiki/${wd.entity.qid}`,
        externalId: wd.entity.qid,
        retrievedAt: wd.entity.retrievedAt,
        license: "CC0 1.0",
        method: "api",
        review: wd.reviewed ? "reviewed" : "unreviewed",
        note: wd.reviewed
          ? "Coincidencia confirmada por revisión editorial."
          : "Coincidencia automática por proximidad y nombre.",
      };
    }

    const { name, alts } = primaryName(item, place?.municipality);
    const identity = assignIdentity(registry, item.code, name.value, place?.municipality, input.now, takenSlugs);
    const discrepancies: Discrepancy[] = [];
    const flag = (field: string, note: string) => {
      const explained = input.decisions.discrepancies[`${identity.id}:${field}`];
      discrepancies.push({
        field,
        note: explained ? `${note} ${explained.note}` : note,
        status: explained ? "explained" : "open",
      });
    };

    // Category
    const cls = classify(first.uso, [name.value, ...alts.map((a) => a.value), first.activity ?? "", first.mapLabel]);
    if (cls.rule === "fallback")
      issues.push({
        level: "warning",
        code: item.code,
        recordId: identity.id,
        message: `Sin uso en la leyenda del mapa (icono ${first.iconCode}); categoría provisional`,
      });

    // Location
    const point: Attested<{ lat: number; lon: number }> = claim(first.point, ["ipce-map"]);
    const alternatives: Claim<{ lat: number; lon: number }>[] = [];
    if (f?.point) {
      const d = distanceMeters(first.point, f.point);
      if (d > 10)
        alternatives.push({ value: f.point, src: ["ipce-ficha"], note: `A ${Math.round(d)} m del punto del mapa` });
      if (d > POINT_DISCREPANCY_M)
        flag("location.point", `Las coordenadas del mapa y de la ficha del IPCE difieren ${Math.round(d)} m.`);
    }
    if (wd?.entity.point) {
      const d = distanceMeters(first.point, wd.entity.point);
      if (d > 10)
        alternatives.push({
          value: { lat: wd.entity.point.lat, lon: wd.entity.point.lon },
          src: ["wikidata"],
          note: `A ${Math.round(d)} m del punto del mapa`,
        });
      if (d > WIKIDATA_POINT_DISCREPANCY_M)
        flag("location.point", `Wikidata sitúa el elemento a ${Math.round(d)} m del punto del IPCE.`);
    }
    if (alternatives.length) point.alternatives = alternatives;

    const isExtensive = item.points.length > 1 || /^(paisaje|l[ií]nea|conjunto|complejo)\b/i.test(name.value);
    const location: HeritageRecord["location"] = { point };
    if (isExtensive) location.precision = "approximate";
    if (item.points.length > 1) {
      location.extraPoints = item.points.slice(1).map((p) => ({
        label: p.nameLine ?? sentenceCaseIfShouting(p.mapLabel),
        point: claim(p.point, ["ipce-map"]),
      }));
    }
    const address = f?.postalAddress
      ? claim(f.postalAddress, ["ipce-ficha"])
      : first.addressLine
        ? claim(first.addressLine, ["ipce-map"])
        : undefined;
    if (address) location.address = address;
    if (place?.municipality) {
      location.municipality = claim(
        { name: place.municipality, ...(place.ineCode ? { ineCode: place.ineCode } : {}) },
        ["cartociudad"],
      );
    }
    if (place?.provinceCode) location.provinceCode = place.provinceCode;
    if (place?.regionCode) location.regionCode = place.regionCode;
    else if (place?.provinceCode) location.regionCode = getProvince(place.provinceCode)?.regionCode;
    if (f?.cadastralRef) {
      location.cadastralRef = claim(f.cadastralRef, ["ipce-ficha"]);
      if (place?.cadastralRef && place.cadastralRef !== f.cadastralRef) {
        location.cadastralRef.alternatives = [
          { value: place.cadastralRef, src: ["cartociudad"], note: "Parcela más cercana al punto del mapa" },
        ];
      }
    }
    if (!location.regionCode)
      issues.push({
        level: "warning",
        code: item.code,
        recordId: identity.id,
        message: "Sin comunidad autónoma (CartoCiudad no disponible para este punto)",
      });

    // Chronology & dates
    let chronology: Attested<NonNullable<ReturnType<typeof parseChronologyLabel>>> | undefined;
    const mapLabel = first.chronologyLabel;
    const fichaLabel = f?.chronologyLabel;
    if (mapLabel) chronology = claim(parseChronologyLabel(mapLabel) ?? { label: mapLabel }, ["ipce-map"]);
    if (fichaLabel && normalizeText(fichaLabel) !== normalizeText(mapLabel ?? "")) {
      const value = parseChronologyLabel(fichaLabel) ?? { label: fichaLabel };
      if (chronology) chronology.alternatives = [{ value, src: ["ipce-ficha"] }];
      else chronology = claim(value, ["ipce-ficha"]);
    }
    const inceptionDate = wd?.entity.inception ? wikidataDate(wd.entity.inception) : undefined;
    const inception = inceptionDate ? claim(inceptionDate, ["wikidata"]) : undefined;
    const chronoStart = chronology?.value.from;
    if (
      inceptionDate?.kind === "year" &&
      chronoStart?.kind === "year" &&
      Math.abs(inceptionDate.year - chronoStart.year) > 2
    ) {
      flag("inception", `El IPCE fecha el inicio en ${chronoStart.year} y Wikidata indica ${inceptionDate.year}.`);
    }

    // Protection
    const protection: Attested<Protection>[] = [];
    if (f?.protection) {
      const p: Protection = { level: f.protection.level, original: f.protection.original };
      if (f.protection.datesAsPrinted.length) p.datesAsPrinted = f.protection.datesAsPrinted;
      if (f.protection.bulletinUrl) p.bulletinUrl = f.protection.bulletinUrl;
      protection.push(claim(p, ["ipce-ficha"]));
    } else if (wd?.entity.heritageStatus.includes("Q23712")) {
      protection.push(
        claim({ level: "BIC", original: "Bien de Interés Cultural (según Wikidata)" } satisfies Protection, [
          "wikidata",
        ]),
      );
    }

    // Images
    const images: ImageAsset[] = [];
    const file = wd?.entity.image;
    const img = file ? input.commons?.data[file] : undefined;
    if (file && img?.accepted && input.decisions.images[file]?.action !== "reject") {
      const key = `commons-1`;
      sources[key] = {
        sourceId: "wikimedia-commons",
        tier: "collaborative",
        title: `Wikimedia Commons — ${file}`,
        url: img.pageUrl,
        retrievedAt: img.retrievedAt,
        license: img.license,
        method: "api",
        review: input.decisions.images[file]?.action === "approve" ? "reviewed" : "unreviewed",
        note: "Imagen vinculada al elemento de Wikidata (P18).",
      };
      const localPath = input.mediaPathFor(file);
      images.push({
        id: sha256(file).slice(0, 16),
        ...(localPath ? { localPath } : {}),
        width: img.width,
        height: img.height,
        alt: `Fotografía de ${name.value}${img.description ? `: ${img.description}` : ""}`.slice(0, 300),
        ...(img.description ? { caption: img.description } : {}),
        author: img.author,
        license: img.license,
        ...(img.licenseUrl ? { licenseUrl: img.licenseUrl } : {}),
        attributionRequired: img.attributionRequired,
        sourcePageUrl: img.pageUrl,
        downloadUrl: img.downloadUrl,
        ...(img.takenAt ? { takenAt: img.takenAt } : {}),
        src: [key, "wikidata"],
        review: input.decisions.images[file]?.action === "approve" ? "reviewed" : "unreviewed",
      });
    }

    // Documents
    const documents: DocumentLink[] = [];
    if (ficha)
      documents.push({ title: "Ficha documental del IPCE (PDF)", url: ficha.url, kind: "pdf", src: ["ipce-map"] });
    if (f?.protection?.bulletinUrl)
      documents.push({
        title: "Disposición de protección en el boletín oficial",
        url: f.protection.bulletinUrl,
        kind: "bulletin",
        src: ["ipce-ficha"],
      });
    if (wd?.entity.eswiki) {
      documents.push({
        title: "Artículo en Wikipedia",
        url: `https://es.wikipedia.org/wiki/${encodeURIComponent(wd.entity.eswiki.replace(/ /g, "_"))}`,
        kind: "article",
        src: ["wikidata"],
      });
    }

    const rating = f?.conservation ? conservationRating(f.conservation) : undefined;
    const rec: Record<string, unknown> & { sources: Record<string, SourceRef> } = {
      id: identity.id,
      slug: identity.slug,
      ...(identity.previousSlugs?.length ? { previousSlugs: identity.previousSlugs } : {}),
      name,
      ...(alts.length ? { altNames: alts } : {}),
      category: { family: cls.family, sub: cls.sub, src: ["ipce-map"], ...(first.uso ? { original: first.uso } : {}) },
      ...(first.activity ? { activity: claim(first.activity, ["ipce-map"]) } : {}),
      ...(first.description ? { summary: claim(prose(first.description), ["ipce-map"]) } : {}),
      ...(f?.history ? { history: claim(prose(f.history), ["ipce-ficha"]) } : {}),
      ...(f?.typology ? { typology: claim(prose(f.typology), ["ipce-ficha"]) } : {}),
      ...(f?.constituentElements ? { constituentElements: claim(prose(f.constituentElements), ["ipce-ficha"]) } : {}),
      ...(f?.authorship ? { authorship: claim(f.authorship, ["ipce-ficha"]) } : {}),
      ...(f?.interventions ? { interventions: claim(prose(f.interventions), ["ipce-ficha"]) } : {}),
      ...(f?.bibliography ? { bibliography: claim(f.bibliography, ["ipce-ficha"]) } : {}),
      ...(chronology ? { chronology } : {}),
      ...(inception ? { inception } : {}),
      ...(f?.conservation
        ? { conservation: claim({ ...(rating ? { rating } : {}), original: prose(f.conservation) }, ["ipce-ficha"]) }
        : {}),
      ...(f?.owner ? { ownership: claim(f.owner, ["ipce-ficha"]) } : {}),
      ...(protection.length ? { protection } : {}),
      location,
      ...(images.length ? { images } : {}),
      ...(documents.length ? { documents } : {}),
      externalIds: {
        ipce: printedCode(item.code),
        ...(wd ? { wikidata: wd.entity.qid } : {}),
        ...(wd?.entity.bic ? { bic: wd.entity.bic } : {}),
        ...(wd?.entity.iaph ? { iaph: wd.entity.iaph } : {}),
        ...(wd?.entity.ipac ? { ipac: wd.entity.ipac } : {}),
        ...(wd?.entity.igpcv ? { igpcv: wd.entity.igpcv } : {}),
        ...(f?.cadastralRef ? { catastro: f.cadastralRef } : {}),
      },
      sources,
    };

    const ov = input.overrides.get(identity.id);
    if (ov) {
      const base: Partial<Record<OverridableField, unknown>> = {
        name: name.value,
        summary: first.description,
        history: f?.history,
        typology: f?.typology,
        activity: first.activity,
        address: address?.value,
        cadastralRef: f?.cadastralRef,
        chronology: chronology?.value.label,
        point: first.point,
        category: { family: cls.family, sub: cls.sub },
      };
      applyOverrides(rec, ov, issues, base);
    }
    if (discrepancies.length) rec.discrepancies = discrepancies;
    // A matched source that ended up contributing no field is not cited.
    const cited = collectSourceKeys(rec);
    for (const key of Object.keys(sources)) if (!cited.has(key)) delete sources[key];

    // Validation level (docs/data/quality-policy.md)
    const crossChecked = !!f?.cadastralRef && !!place?.cadastralRef && f.cadastralRef === place.cadastralRef;
    const validation = ov?.verifiedAt
      ? "primary-verified"
      : !ficha
        ? "pending"
        : crossChecked
          ? "cross-checked"
          : "partial";
    const withdrawn = input.decisions.withdrawn[identity.id];
    const previous = input.previous.get(identity.id);
    const contentHash = sha256(JSON.stringify(rec, (k, v) => (k === "retrievedAt" ? undefined : v)));
    const previousHash = previous
      ? sha256(JSON.stringify(stripEditorial(previous), (k, v) => (k === "retrievedAt" ? undefined : v)))
      : undefined;

    rec.editorial = {
      state: ov?.verifiedAt ? "verified" : ov ? "edited" : "imported",
      validation,
      published: !withdrawn,
      ...(withdrawn ? { withdrawnReason: withdrawn.reason } : {}),
      createdAt: identity.createdAt,
      updatedAt: previous && previousHash === contentHash ? previous.editorial.updatedAt : input.now,
      ...(ov?.verifiedAt ? { lastVerifiedAt: ov.verifiedAt } : {}),
    };

    const parsed = HeritageRecord.safeParse(rec);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          level: "error",
          code: item.code,
          recordId: identity.id,
          message: `${issue.path.join(".")}: ${issue.message}`,
        });
      }
      continue;
    }
    records.push(parsed.data);
  }

  records.sort((a, b) => a.id.localeCompare(b.id));
  return { records, registry, issues };
}

function stripEditorial(rec: HeritageRecord): Omit<HeritageRecord, "editorial"> {
  const { editorial: _editorial, ...rest } = rec;
  return rest;
}
