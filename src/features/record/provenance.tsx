import type { Attested, HeritageRecord, SourceRef } from "@/domain/schema";
import { SOURCE_TIER_LABELS } from "@/domain/labels";

const SHORT: Record<string, string> = {
  "ipce-map": "IPCE · mapa",
  "ipce-ficha": "IPCE · ficha",
  cartociudad: "CartoCiudad",
  wikidata: "Wikidata",
  editorial: "Revisión editorial",
};

const sourceShortLabel = (key: string) => SHORT[key] ?? (key.startsWith("commons") ? "Wikimedia Commons" : key);

/** Inline citation: "Fuente: IPCE · ficha". Links to the sources table. */
export function Cite({ src }: { src: string[] }) {
  return (
    <span className="ml-1.5 align-baseline text-xs whitespace-nowrap text-iron">
      [
      {src.map((s, i) => (
        <span key={s}>
          {i > 0 ? ", " : ""}
          <a href={`#fuente-${s}`} className="text-iron hover:text-ink">
            {sourceShortLabel(s)}
          </a>
        </span>
      ))}
      ]
    </span>
  );
}

/** Lists alternative values from other sources, so discrepancies are visible rather than hidden. */
export function Alternatives<T>({ claim, render }: { claim: Attested<T>; render: (v: T) => React.ReactNode }) {
  if (!claim.alternatives?.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-iron">
      {claim.alternatives.map((a, i) => (
        <li key={i}>
          Otra fuente: {render(a.value)}
          {a.note ? ` (${a.note})` : ""}
          <Cite src={a.src} />
        </li>
      ))}
    </ul>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

const REVIEW_LABELS: Record<SourceRef["review"], string> = {
  unreviewed: "Sin revisión editorial",
  "needs-review": "Pendiente de revisión",
  reviewed: "Revisado",
};

const METHOD_LABELS: Record<SourceRef["method"], string> = {
  kml: "Exportación KML del mapa",
  "pdf-text": "Extracción del texto del PDF",
  api: "Servicio web (API)",
  derived: "Regla derivada documentada",
  manual: "Edición manual",
};

/** Which fields cite each source key (computed from the record). */
function fieldsBySource(rec: HeritageRecord): Map<string, string[]> {
  const labels: Record<string, string> = {
    name: "nombre",
    altNames: "otras denominaciones",
    category: "categoría",
    activity: "actividad",
    summary: "resumen",
    history: "historia",
    typology: "descripción tipológica",
    constituentElements: "elementos constitutivos",
    authorship: "autoría",
    interventions: "actuaciones",
    bibliography: "bibliografía",
    chronology: "cronología",
    inception: "fecha de inicio",
    conservation: "estado de conservación",
    ownership: "propiedad",
    protection: "protección",
    location: "localización",
    images: "imágenes",
    documents: "documentos",
    visit: "visita",
  };
  const out = new Map<string, string[]>();
  const walk = (v: unknown, field: string) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, field));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "src" && Array.isArray(x))
          for (const s of x as string[]) out.set(s, [...new Set([...(out.get(s) ?? []), field])]);
        else walk(x, field);
      }
    }
  };
  for (const [k, v] of Object.entries(rec)) if (labels[k]) walk(v, labels[k]!);
  return out;
}

export function SourcesTable({ record }: { record: HeritageRecord }) {
  const usage = fieldsBySource(record);
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {Object.entries(record.sources).map(([key, s]) => (
        <li key={key} id={`fuente-${key}`} className="scroll-mt-24 py-4">
          <p className="signage text-iron">{SOURCE_TIER_LABELS[s.tier]}</p>
          <p className="mt-1 font-medium">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            ) : (
              s.title
            )}
          </p>
          {s.organization ? <p className="text-sm text-ink-soft">{s.organization}</p> : null}
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-[10rem_1fr]">
            <dt className="text-iron">Datos que aporta</dt>
            <dd>{usage.get(key)?.join(", ") ?? "—"}</dd>
            <dt className="text-iron">Consultada</dt>
            <dd>{formatDate(s.retrievedAt)} (fecha de descarga, no de verificación)</dd>
            <dt className="text-iron">Método</dt>
            <dd>{METHOD_LABELS[s.method]}</dd>
            <dt className="text-iron">Revisión</dt>
            <dd>{REVIEW_LABELS[s.review]}</dd>
            <dt className="text-iron">Licencia</dt>
            <dd>{s.license}</dd>
            {s.note ? (
              <>
                <dt className="text-iron">Nota</dt>
                <dd>{s.note}</dd>
              </>
            ) : null}
          </dl>
        </li>
      ))}
    </ol>
  );
}
