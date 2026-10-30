"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenido" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8">
      <p className="signage text-rust">Error</p>
      <h1 className="mt-3 font-display text-4xl">No se ha podido mostrar esta página</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Se ha producido un error inesperado. Puedes volver a intentarlo o regresar al inicio.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="min-h-11 bg-ink px-4 text-paper">
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center border border-rule-strong px-4 text-ink no-underline"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
