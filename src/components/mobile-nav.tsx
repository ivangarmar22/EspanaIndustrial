"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Search, X } from "lucide-react";
import { FOOTER_GROUPS, MAIN_NAV } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the menu after navigation (state adjustment during render, no effect needed).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    panelRef.current?.querySelector<HTMLElement>("a, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      button?.focus();
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-10 items-center justify-center"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
      </button>
      {open &&
        // Portalled to <body>: the header's backdrop-filter would otherwise clip this fixed panel to the header box.
        createPortal(
          <div
            ref={panelRef}
            id="mobile-menu"
            className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto border-t border-rule bg-paper"
          >
            <Form action="/catalogo" role="search" className="border-b border-rule p-4" onSubmit={() => setOpen(false)}>
              <label htmlFor="mobile-search" className="signage mb-2 block text-iron">
                Buscar en el catálogo
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-[1.1rem] -translate-y-1/2 text-iron"
                  aria-hidden="true"
                />
                <input
                  id="mobile-search"
                  name="q"
                  type="search"
                  placeholder="Lugar, municipio, tipo…"
                  className="ctl search-input h-12 pl-11 text-base"
                />
              </div>
            </Form>
            <nav aria-label="Principal (móvil)">
              <ul>
                {MAIN_NAV.map((item) => (
                  <li key={item.href} className="border-b border-rule">
                    <Link
                      href={item.href}
                      className="block px-4 py-4 font-display text-2xl text-ink no-underline"
                      aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="grid gap-1 p-4">
                {FOOTER_GROUPS.flatMap((g) => [...g.links]).map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block py-2 text-ink-soft" onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
