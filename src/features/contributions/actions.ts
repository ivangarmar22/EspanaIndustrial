"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { absoluteUrl } from "@/config/site";
import { CONTRIBUTION_KINDS, ContributionInput, MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/domain/contribution";
import { getRecordById } from "@/data-access/catalog";
import { sendProposalMail } from "@/server/mailer";
import { clientKey, rateLimit } from "@/server/rate-limit";

export interface ContributionState {
  status: "idle" | "ok" | "error";
  message?: string;
  reference?: string;
  fieldErrors?: Record<string, string>;
}

const MIN_FILL_MS = 4000;

/** Magic-byte sniffing: the declared type and file extension are not trusted. */
function sniffImage(b: Uint8Array): { mime: string; ext: string } | undefined {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return undefined;
}

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export async function submitContribution(_prev: ContributionState, fd: FormData): Promise<ContributionState> {
  // Honeypot and minimum fill time: silently accept bots without sending anything.
  const startedAt = Number(fd.get("startedAt"));
  if (text(fd, "website") || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "ok", message: "Gracias. Tu propuesta se ha recibido." };
  }

  const limit = rateLimit(`contrib:${clientKey(await headers())}`, 5, 60 * 60 * 1000);
  if (!limit.ok)
    return {
      status: "error",
      message: `Has enviado varias propuestas seguidas. Vuelve a intentarlo en ${Math.ceil(limit.retryAfterS / 60)} minutos.`,
    };

  const parsed = ContributionInput.safeParse({
    kind: text(fd, "kind"),
    recordId: text(fd, "recordId"),
    elementName: text(fd, "elementName"),
    location: text(fd, "location"),
    field: text(fd, "field"),
    proposedValue: text(fd, "proposedValue"),
    description: text(fd, "description") ?? "",
    sources: text(fd, "sources"),
    photoAuthor: text(fd, "photoAuthor"),
    photoTakenAt: text(fd, "photoTakenAt"),
    contactName: text(fd, "contactName"),
    contactEmail: text(fd, "contactEmail"),
    acceptLicense: fd.get("acceptLicense") === "on",
    acceptPrivacy: fd.get("acceptPrivacy") === "on",
  });
  // Zod skips object refinements when another field already failed; compute the kind-specific
  // requirements separately so the person sees every error at once.
  const conditional: Record<string, string> = {};
  const kind = text(fd, "kind");
  if (kind === "new-element" && !text(fd, "elementName")) conditional.elementName = "Indica el nombre del elemento.";
  if (kind && kind !== "new-element" && !text(fd, "recordId"))
    conditional.recordId = "Elige el elemento al que se refiere la propuesta.";
  if (!parsed.success || Object.keys(conditional).length) {
    const fieldErrors: Record<string, string> = { ...conditional };
    for (const issue of parsed.error?.issues ?? []) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }
  const input = parsed.data;
  if (input.recordId && !(await getRecordById(input.recordId))) {
    return {
      status: "error",
      message: "El elemento indicado no existe.",
      fieldErrors: { recordId: "Elemento no encontrado." },
    };
  }

  const files = fd.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS)
    return {
      status: "error",
      message: `Puedes adjuntar como máximo ${MAX_PHOTOS} fotografías.`,
      fieldErrors: { photo: `Máximo ${MAX_PHOTOS} archivos.` },
    };
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_PHOTO_BYTES)
    return {
      status: "error",
      message: "Las fotografías superan 8 MB en total.",
      fieldErrors: { photo: "Máximo 8 MB en total." },
    };
  const photos: Array<{ bytes: Uint8Array; ext: string; mime: string }> = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImage(bytes);
    if (!type)
      return {
        status: "error",
        message: "Formato de imagen no admitido.",
        fieldErrors: { photo: "Solo JPEG, PNG o WebP." },
      };
    photos.push({ bytes, ...type });
  }
  if (photos.length && !input.photoAuthor) {
    return {
      status: "error",
      message: "Indica la autoría de las fotografías.",
      fieldErrors: { photoAuthor: "Obligatorio con fotografías." },
    };
  }

  const reference = randomUUID().slice(0, 8);
  const record = input.recordId ? await getRecordById(input.recordId) : undefined;
  try {
    await sendProposalMail({
      subject: `[España Industrial] ${CONTRIBUTION_KINDS[input.kind]}: ${record?.name.value ?? input.elementName ?? "sin nombre"} (${reference})`,
      text: proposalText(
        input,
        reference,
        record ? { id: record.id, name: record.name.value, url: absoluteUrl(`/patrimonio/${record.slug}`) } : undefined,
      ),
      ...(input.contactEmail ? { replyTo: input.contactEmail } : {}),
      attachments: photos.map((p, i) => ({
        filename: `foto-${reference}-${i + 1}.${p.ext}`,
        content: p.bytes,
        contentType: p.mime,
      })),
    });
  } catch (err) {
    console.error("[colabora] No se pudo enviar la propuesta por correo:", err instanceof Error ? err.message : err);
    return { status: "error", message: "No se ha podido enviar la propuesta. Inténtalo de nuevo más tarde." };
  }
  return {
    status: "ok",
    reference,
    message: "Gracias. Tu propuesta se ha enviado y se revisará antes de incorporar ningún cambio al atlas.",
  };
}

/** Plain-text e-mail body: every field labelled, so the proposal can be checked and added by hand. */
function proposalText(
  input: ContributionInput,
  reference: string,
  record?: { id: string; name: string; url: string },
): string {
  const rows: Array<[string, string | undefined]> = [
    ["Referencia", reference],
    ["Tipo", CONTRIBUTION_KINDS[input.kind]],
    ["Elemento del atlas", record ? `${record.name} (${record.id}) ${record.url}` : undefined],
    ["Elemento propuesto", input.elementName],
    ["Localización", input.location],
    ["Dato afectado", input.field],
    ["Valor propuesto", input.proposedValue],
    ["Descripción", input.description],
    ["Fuentes", input.sources],
    ["Autoría de la foto", input.photoAuthor],
    ["Licencia de las fotos", input.photoAuthor ? "CC BY-SA 4.0 (declarada en el formulario)" : undefined],
    ["Fecha de la foto", input.photoTakenAt],
    ["Nombre", input.contactName],
    ["Correo", input.contactEmail],
  ];
  return [
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}:\n${v}\n`),
    "La persona ha declarado ser autora del contenido o tener derecho a cederlo, y acepta su publicación bajo CC BY-SA 4.0 (o la licencia indicada para la foto).",
  ].join("\n");
}
