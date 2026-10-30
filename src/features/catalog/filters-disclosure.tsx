"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

/** Filters are always visible on desktop; on smaller screens a button reveals them. */
export function FiltersDisclosure({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="catalog-filters"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rule-strong bg-card text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] lg:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {open ? "Ocultar filtros" : "Mostrar filtros"}
        {activeCount ? ` (${activeCount} activos)` : ""}
      </button>
      <div id="catalog-filters" className={`${open ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
