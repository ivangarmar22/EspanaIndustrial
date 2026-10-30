"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CONTRIBUTION_KINDS, MAX_PHOTOS, type ContributionKind } from "@/domain/contribution";
import { Select } from "@/components/select";
import { PhotoPicker } from "./photo-picker";
import { submitContribution, type ContributionState } from "./actions";

export interface RecordOption {
  id: string;
  name: string;
  group: string;
}

const field = "ctl text-base";
const labelCls = "mb-1.5 block font-medium";
const hint = "mt-1 text-sm text-iron";

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1 text-sm text-danger">
      {error}
    </p>
  ) : null;
}

function Fieldset({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-ink pt-6">
      <legend className="flex items-baseline gap-3 pr-3">
        <span className="font-display text-3xl text-rust">{n}</span>
        <span className="font-display text-2xl">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

export function ContributionForm({ records, preselected }: { records: RecordOption[]; preselected?: string }) {
  const [state, action, pending] = useActionState<ContributionState, FormData>(submitContribution, { status: "idle" });
  const [kind, setKind] = useState<ContributionKind>("correction");
  // Mount time feeds the anti-bot minimum fill time; set in an effect to keep SSR and hydration identical.
  const mountedAt = useRef(0);
  const startedInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const err = state.fieldErrors ?? {};
  const showPhotos = kind === "photo" || kind === "new-element";
  const groups = [...new Set(records.map((r) => r.group))];

  if (state.status === "ok") {
    return (
      <div className="border-l-4 border-ok bg-card p-6" role="status">
        <p className="font-display text-2xl">Propuesta recibida</p>
        <p className="mt-2 text-ink-soft">{state.message}</p>
        {state.reference ? <p className="mt-2 font-mono text-sm">Referencia: {state.reference}</p> : null}
        <p className="mt-4">
          <Link href="/catalogo">Volver al catálogo</Link>
        </p>
      </div>
    );
  }

  const describe = (name: string, extra?: string) =>
    [err[name] ? `${name}-error` : undefined, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form
      action={action}
      onSubmit={() => {
        if (startedInput.current) startedInput.current.value = String(mountedAt.current);
      }}
      className="grid gap-12"
      noValidate
    >
      <input ref={startedInput} type="hidden" name="startedAt" defaultValue="0" />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">No rellenes este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" && state.message ? (
        <p className="border-l-4 border-danger bg-card p-4 text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <Fieldset n={1} title="Qué quieres proponer">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.entries(CONTRIBUTION_KINDS) as Array<[ContributionKind, string]>).map(([k, label]) => (
            <label
              key={k}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-full border px-4 transition-colors ${kind === k ? "border-ink bg-paper-deep shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-rule-strong bg-card hover:border-iron"}`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="accent-rust"
              />
              {label}
            </label>
          ))}
        </div>
      </Fieldset>

      <Fieldset n={2} title={kind === "new-element" ? "El lugar que quieres añadir" : "El elemento"}>
        {kind === "new-element" ? (
          <>
            <div>
              <label htmlFor="elementName" className={labelCls}>
                Nombre del elemento *
              </label>
              <input
                id="elementName"
                name="elementName"
                required
                className={field}
                aria-invalid={!!err.elementName}
                aria-describedby={describe("elementName")}
              />
              <FieldError id="elementName-error" error={err.elementName} />
            </div>
            <div>
              <label htmlFor="location" className={labelCls}>
                Localización
              </label>
              <input id="location" name="location" className={field} placeholder="Municipio, dirección o coordenadas" />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="recordId" className={labelCls}>
              Elemento del atlas *
            </label>
            <Select
              id="recordId"
              name="recordId"
              defaultValue={preselected ?? ""}
              searchable
              aria-invalid={!!err.recordId}
              aria-describedby={describe("recordId")}
              options={[
                { value: "", label: "Elige un elemento…" },
                ...groups.flatMap((g) =>
                  records.filter((r) => r.group === g).map((r) => ({ value: r.id, label: r.name, group: g })),
                ),
              ]}
            />
            <FieldError id="recordId-error" error={err.recordId} />
          </div>
        )}
        {kind === "correction" || kind === "status" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="field" className={labelCls}>
                Dato afectado
              </label>
              <input id="field" name="field" className={field} placeholder="Ej.: cronología, estado de conservación" />
            </div>
            <div>
              <label htmlFor="proposedValue" className={labelCls}>
                Valor propuesto
              </label>
              <input id="proposedValue" name="proposedValue" className={field} />
            </div>
          </div>
        ) : null}
      </Fieldset>

      <Fieldset n={3} title="Explicación y fuentes">
        <div>
          <label htmlFor="description" className={labelCls}>
            Descripción *
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            required
            minLength={20}
            className={field}
            aria-invalid={!!err.description}
            aria-describedby={describe("description", "description-hint")}
          />
          <p id="description-hint" className={hint}>
            Explica qué es incorrecto o qué falta y cómo lo sabes. Mínimo 20 caracteres.
          </p>
          <FieldError id="description-error" error={err.description} />
        </div>
        <div>
          <label htmlFor="sources" className={labelCls}>
            Fuentes que lo respaldan
          </label>
          <textarea id="sources" name="sources" rows={3} className={field} aria-describedby="sources-hint" />
          <p id="sources-hint" className={hint}>
            Enlaces o referencias (boletín oficial, inventario, publicación…). Las propuestas con fuente se revisan
            antes.
          </p>
        </div>
      </Fieldset>

      {showPhotos ? (
        <Fieldset n={4} title={kind === "photo" ? "Fotografías" : "Fotografías (opcional)"}>
          <div>
            <label htmlFor="photo" className={labelCls}>
              Archivos
            </label>
            <PhotoPicker
              id="photo"
              name="photo"
              max={MAX_PHOTOS}
              invalid={!!err.photo}
              describedBy={describe("photo")}
            />
            <FieldError id="photo-error" error={err.photo} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="photoAuthor" className={labelCls}>
                Autoría {kind === "photo" ? "*" : "(si adjuntas fotos)"}
              </label>
              <input
                id="photoAuthor"
                name="photoAuthor"
                className={field}
                aria-invalid={!!err.photoAuthor}
                aria-describedby={describe("photoAuthor")}
              />
              <FieldError id="photoAuthor-error" error={err.photoAuthor} />
            </div>
            <div>
              <label htmlFor="photoTakenAt" className={labelCls}>
                Fecha de la foto
              </label>
              <input id="photoTakenAt" name="photoTakenAt" className={field} placeholder="Año o fecha aproximada" />
            </div>
          </div>
        </Fieldset>
      ) : null}

      <Fieldset n={showPhotos ? 5 : 4} title="Contacto (opcional)">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contactName" className={labelCls}>
              Nombre o alias
            </label>
            <input id="contactName" name="contactName" className={field} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="contactEmail" className={labelCls}>
              Correo electrónico
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              className={field}
              autoComplete="email"
              aria-invalid={!!err.contactEmail}
              aria-describedby={describe("contactEmail", "email-hint")}
            />
            <p id="email-hint" className={hint}>
              Solo para preguntarte sobre esta propuesta. No se publica.
            </p>
            <FieldError id="contactEmail-error" error={err.contactEmail} />
          </div>
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptLicense"
            className="mt-1 size-4 accent-rust"
            aria-invalid={!!err.acceptLicense}
            aria-describedby={describe("acceptLicense")}
          />
          <span>
            Declaro que el texto y, en su caso, las fotografías son míos o tengo derecho a cederlos, y acepto que se
            publiquen bajo licencia CC BY-SA 4.0 si se incorporan al atlas.
          </span>
        </label>
        <FieldError id="acceptLicense-error" error={err.acceptLicense} />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptPrivacy"
            className="mt-1 size-4 accent-rust"
            aria-invalid={!!err.acceptPrivacy}
            aria-describedby={describe("acceptPrivacy")}
          />
          <span>
            He leído la <Link href="/privacidad">política de privacidad</Link>.
          </span>
        </label>
        <FieldError id="acceptPrivacy-error" error={err.acceptPrivacy} />
      </Fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-rust px-7 text-paper hover:bg-rust-deep disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar propuesta"}
        </button>
        <p className="text-sm text-iron">Nada se publica sin revisión previa.</p>
      </div>
    </form>
  );
}
