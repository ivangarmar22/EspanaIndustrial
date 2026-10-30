import Link from "next/link";
import { Search } from "lucide-react";
import { Wordmark } from "./brand";
import { SearchBox } from "./search-box";
import { MobileNav } from "./mobile-nav";
import { MAIN_NAV } from "./nav-links";
import { NavLink } from "./nav-link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />
        <nav aria-label="Principal" className="ml-6 hidden xl:block">
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <SearchBox
          id="header-search"
          label="Buscar en el catálogo"
          placeholder="Buscar en el atlas…"
          className="ml-auto hidden md:block"
        />
        <Link
          href="/catalogo"
          className="ml-auto inline-flex size-10 items-center justify-center md:hidden"
          aria-label="Buscar en el catálogo"
        >
          <Search className="size-5" aria-hidden="true" />
        </Link>
        <MobileNav />
      </div>
    </header>
  );
}
