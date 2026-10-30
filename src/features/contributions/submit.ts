/**
 * Sends a proposal from the browser to Web3Forms, which forwards it by e-mail to
 * the project owner (the site is static, so there is no server of its own).
 * The access key is public by design: it only lets someone send to that inbox.
 */
import { absoluteUrl } from "@/config/site";
import { CONTRIBUTION_KINDS, ContributionInput } from "@/domain/contribution";

const ENDPOINT = "https://api.web3forms.com/submit";
const MIN_FILL_MS = 4000;

export const PROPOSALS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY?.trim() || undefined;

export interface ContributionState {
  status: "idle" | "ok" | "error";
  message?: string;
  reference?: string;
  fieldErrors?: Record<string, string>;
}

export interface RecordOption {
  id: string;
  slug: string;
  name: string;
  group: string;
}

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export async function submitContribution(fd: FormData, records: RecordOption[]): Promise<ContributionState> {
  // Honeypot and minimum fill time: silently "accept" bots without sending anything.
  const startedAt = Number(fd.get("startedAt"));
  if (text(fd, "website") || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "ok", message: "Gracias. Tu propuesta se ha recibido." };
  }
  if (!PROPOSALS_KEY) return { status: "error", message: "El envío de propuestas no está disponible en este momento." };

  const parsed = ContributionInput.safeParse({
    kind: text(fd, "kind"),
    recordId: text(fd, "recordId"),
    elementName: text(fd, "elementName"),
    location: text(fd, "location"),
    field: text(fd, "field"),
    proposedValue: text(fd, "proposedValue"),
    description: text(fd, "description") ?? "",
    sources: text(fd, "sources"),
    photoLinks: text(fd, "photoLinks"),
    photoAuthor: text(fd, "photoAuthor"),
    photoTakenAt: text(fd, "photoTakenAt"),
    contactName: text(fd, "contactName"),
    contactEmail: text(fd, "contactEmail"),
    acceptLicense: fd.get("acceptLicense") === "on",
    acceptPrivacy: fd.get("acceptPrivacy") === "on",
  });
  // Zod skips refinements once another field has failed; check the kind-specific requirements
  // separately so the person sees every error at once.
  const conditional: Record<string, string> = {};
  const kind = text(fd, "kind");
  if (kind === "new-element" && !text(fd, "elementName")) conditional.elementName = "Indica el nombre del elemento.";
  if (kind && kind !== "new-element" && !text(fd, "recordId"))
    conditional.recordId = "Elige el elemento al que se refiere la propuesta.";
  if (kind === "photo" && !text(fd, "photoLinks")) conditional.photoLinks = "Pega al menos un enlace a las fotografías.";
  if (!parsed.success || Object.keys(conditional).length) {
    const fieldErrors: Record<string, string> = { ...conditional };
    for (const issue of parsed.error?.issues ?? []) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  const input = parsed.data;
  const record = input.recordId ? records.find((r) => r.id === input.recordId) : undefined;
  const reference = crypto.randomUUID().slice(0, 8);
  // Web3Forms lists every field in the e-mail under its key, so keys are human-readable labels.
  const fields: Record<string, string | undefined> = {
    Referencia: reference,
    Tipo: CONTRIBUTION_KINDS[input.kind],
    "Elemento del atlas": record
      ? `${record.name} (${record.id}) ${absoluteUrl(`/patrimonio/${record.slug}/`)}`
      : undefined,
    "Lugar propuesto": input.elementName,
    Localización: input.location,
    "Dato afectado": input.field,
    "Valor propuesto": input.proposedValue,
    Descripción: input.description,
    Fuentes: input.sources,
    "Enlaces a las fotografías": input.photoLinks,
    "Autoría de las fotos": input.photoAuthor,
    "Fecha de las fotos": input.photoTakenAt,
    Nombre: input.contactName,
    Correo: input.contactEmail,
    Declaración:
      "Declara ser autor del contenido o tener derecho a cederlo y acepta su publicación bajo CC BY-SA 4.0 si se incorpora al atlas.",
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: PROPOSALS_KEY,
        subject: `[España Industrial] ${CONTRIBUTION_KINDS[input.kind]}: ${record?.name ?? input.elementName ?? "sin nombre"} (${reference})`,
        from_name: "España Industrial",
        ...(input.contactEmail ? { replyto: input.contactEmail } : {}),
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v)),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    if (!res.ok || !data.success) throw new Error(`HTTP ${res.status}`);
  } catch {
    return { status: "error", message: "No se ha podido enviar la propuesta. Inténtalo de nuevo más tarde." };
  }
  return {
    status: "ok",
    reference,
    message: "Gracias. Tu propuesta se ha enviado y se revisará antes de incorporar ningún cambio al atlas.",
  };
}
