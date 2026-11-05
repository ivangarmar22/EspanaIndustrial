"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

/**
 * "Prueba con" shortcuts on a single line: suggestions that do not fit are hidden
 * entirely (not just clipped), so they cannot be reached by keyboard either.
 * Before hydration the fixed height already keeps them out of sight.
 */
export function QuickSearches({ terms }: { terms: string[] }) {
  const row = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const fit = () => {
      const chips = [...el.querySelectorAll<HTMLElement>("[data-chip]")];
      chips.forEach((c) => (c.hidden = false));
      chips.forEach((c) => (c.hidden = c.offsetTop > 4));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <p ref={row} className="relative mt-3 flex h-8 flex-wrap items-center gap-1.5 overflow-hidden text-sm text-iron">
      <span className="mr-1">Prueba con</span>
      {terms.map((q) => (
        <Link
          key={q}
          data-chip
          href={`/catalogo?q=${encodeURIComponent(q)}`}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-rule-strong bg-card px-3 text-ink-soft no-underline hover:border-ink hover:text-ink"
        >
          {q}
        </Link>
      ))}
    </p>
  );
}
