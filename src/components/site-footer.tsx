import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { site } from "@/config/site";
import { PlateMark } from "./brand";
import { FOOTER_GROUPS } from "./nav-links";

const linkCls = "text-paper/80 no-underline hover:text-paper hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-carbon text-paper/80">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:gap-20 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5 text-paper">
            <PlateMark id="mark-footer" className="size-9" />
            <span className="font-display text-xl">{site.name}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed">
            Atlas gratuito y sin ánimo de lucro del patrimonio industrial español. Proyecto independiente: no está
            afiliado al Ministerio de Cultura ni a ninguna administración. Origen de los datos principales: Ministerio
            de Cultura (IPCE, Plan Nacional de Patrimonio Industrial).
          </p>
          <Link
            href="/colabora#apoya"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-rust px-5 text-sm text-paper no-underline hover:bg-rust-deep"
          >
            <HeartHandshake className="size-4" aria-hidden="true" /> Apoya el proyecto
          </Link>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {FOOTER_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="signage text-copper-light">{g.title}</h2>
              <ul className="mt-4 grid gap-3 text-sm">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={linkCls}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-5 text-xs text-paper/60 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            Cartografía: OpenFreeMap © OpenMapTiles, datos © colaboradores de OpenStreetMap; capas del Instituto
            Geográfico Nacional (CC BY 4.0).
          </p>
          <p className="shrink-0">Código MIT · Catálogo CC BY 4.0 · Ferrocarril ODbL</p>
        </div>
      </div>
    </footer>
  );
}
