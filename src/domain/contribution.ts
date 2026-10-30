import { z } from "zod";
import { RECORD_ID_PATTERN } from "./schema";

export const CONTRIBUTION_KINDS = {
  correction: "Corregir un dato",
  "new-element": "Añadir un lugar nuevo",
  reference: "Aportar una fuente o referencia",
  photo: "Enviar fotografías",
  status: "Avisar de un cambio (conservación, uso, visitas)",
} as const;
export type ContributionKind = keyof typeof CONTRIBUTION_KINDS;

/** Public form input (after FormData parsing). */
export const ContributionInput = z
  .strictObject({
    kind: z.enum(Object.keys(CONTRIBUTION_KINDS) as [ContributionKind, ...ContributionKind[]]),
    recordId: z.string().regex(RECORD_ID_PATTERN).optional(),
    elementName: z.string().trim().max(200).optional(),
    location: z.string().trim().max(300).optional(),
    field: z.string().trim().max(120).optional(),
    proposedValue: z.string().trim().max(4000).optional(),
    description: z.string().trim().min(20, "Describe la propuesta con al menos 20 caracteres.").max(8000),
    sources: z.string().trim().max(4000).optional(),
    /** Public links to the photos (Drive, Google Fotos, WeTransfer, Commons…), one per line. */
    photoLinks: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (v) => v.split(/\s+/).every((u) => /^https?:\/\/\S+\.\S+/.test(u)),
        "Pega enlaces completos que empiecen por https://, uno por línea.",
      )
      .optional(),
    photoAuthor: z.string().trim().max(200).optional(),
    photoTakenAt: z.string().trim().max(60).optional(),
    contactName: z.string().trim().max(120).optional(),
    contactEmail: z.email("El correo no parece válido.").max(200).optional(),
    acceptLicense: z.literal(true, { error: "Debes aceptar las condiciones de publicación." }),
    acceptPrivacy: z.literal(true, { error: "Debes aceptar la política de privacidad." }),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "new-element" && !v.elementName)
      ctx.addIssue({ code: "custom", path: ["elementName"], message: "Indica el nombre del elemento." });
    if (v.kind === "photo" && !v.photoLinks)
      ctx.addIssue({ code: "custom", path: ["photoLinks"], message: "Pega al menos un enlace a las fotografías." });
    if (v.photoLinks && !v.photoAuthor)
      ctx.addIssue({ code: "custom", path: ["photoAuthor"], message: "Indica quién hizo las fotografías." });
    if (v.kind !== "new-element" && !v.recordId)
      ctx.addIssue({
        code: "custom",
        path: ["recordId"],
        message: "Elige el elemento al que se refiere la propuesta.",
      });
  });
export type ContributionInput = z.infer<typeof ContributionInput>;
