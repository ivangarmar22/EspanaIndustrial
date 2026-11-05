"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8">
        <p className="signage text-rust">Error</p>
        <h1 className="mt-3 font-display text-[length:var(--text-headline)] leading-tight">
          No se ha podido mostrar esta página
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          Se ha producido un error inesperado. Puedes volver a intentarlo o regresar al inicio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center rounded-full bg-rust px-6 text-paper hover:bg-rust-deep"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-full border border-ink px-6 text-ink no-underline hover:bg-paper-deep"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
