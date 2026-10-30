"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  HandCoins,
  HeartHandshake,
  History,
  Info,
  Layers,
  LibraryBig,
  MapIcon,
  MapPinPlus,
  Menu,
  Route,
  Scale,
  Search,
  ShieldCheck,
  TrainFront,
  TrainTrack,
  X,
  type LucideIcon,
} from "lucide-react";
import { FOOTER_GROUPS, MAIN_NAV } from "./nav-links";

const ICONS: Record<string, LucideIcon> = {
  "/mapa": MapIcon,
  "/catalogo": LibraryBig,
  "/ferrocarril": TrainFront,
  "/cronologia": History,
  "/rutas": Route,
  "/colecciones": Layers,
  "/colabora": HeartHandshake,
  "/colabora#proyecto": Info,
  "/colabora#apoya": HandCoins,
  "/colabora#proponer": MapPinPlus,
  "/metodologia": ClipboardCheck,
  "/fuentes": BookOpen,
  "/ferrocarril#fuentes-ferrocarril": TrainTrack,
  "/aviso-legal": Scale,
  "/privacidad": ShieldCheck,
};

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
    // Focus the panel itself, not the search field, so touch keyboards stay closed.
    panelRef.current?.focus();
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

  const close = () => setOpen(false);

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
            tabIndex={-1}
            className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto overscroll-contain border-t border-rule bg-paper outline-none"
          >
            <div className="mx-auto max-w-2xl pb-8">
              <Form action="/catalogo" role="search" className="border-b border-rule p-4 md:hidden" onSubmit={close}>
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
                <ul className="grid gap-1 p-3 md:pt-6">
                  {MAIN_NAV.map((item) => {
                    const Icon = ICONS[item.href];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="group flex items-center gap-4 rounded-2xl px-2 py-2.5 font-display text-2xl text-ink no-underline hover:bg-paper-deep aria-[current=page]:bg-paper-deep aria-[current=page]:text-rust"
                          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                          onClick={close}
                        >
                          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-rule bg-card text-iron group-aria-[current=page]:border-rust group-aria-[current=page]:bg-rust group-aria-[current=page]:text-paper">
                            {Icon && <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="size-5 text-rule-strong" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="mx-4 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
                  {FOOTER_GROUPS.map((g) => (
                    <div key={g.title}>
                      <p className="signage mb-1 text-iron">{g.title}</p>
                      <ul>
                        {g.links.map((item) => {
                          const Icon = ICONS[item.href];
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="flex items-start gap-3 py-2 text-ink-soft no-underline hover:text-ink"
                                onClick={close}
                              >
                                {Icon && <Icon className="mt-1 size-4 shrink-0 text-iron" aria-hidden="true" />}
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
