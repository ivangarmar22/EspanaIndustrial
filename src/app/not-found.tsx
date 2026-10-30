import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8">
        <p className="signage text-rust">Error 404</p>
        <h1 className="mt-3 font-display text-[length:var(--text-headline)] leading-tight">
          Este lugar no figura en el atlas
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          Puede que la dirección esté mal escrita o que el elemento se haya retirado del catálogo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/catalogo" className="inline-flex min-h-11 items-center bg-ink px-4 text-paper no-underline">
            Buscar en el catálogo
          </Link>
          <Link
            href="/mapa"
            className="inline-flex min-h-11 items-center border border-rule-strong px-4 text-ink no-underline"
          >
            Explorar el mapa
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
