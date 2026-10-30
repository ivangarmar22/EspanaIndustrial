"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { SearchSuggestion } from "@/app/api/buscar/route";
import { CategoryGlyph } from "./category";

const VARIANTS = {
  header: {
    box: "h-10 border-rule-strong shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)]",
    icon: "ml-1 size-8 bg-paper-deep text-ink-soft group-focus-within:bg-rust group-focus-within:text-paper",
    iconSize: "size-4",
    input: "w-48 px-2.5 text-sm lg:w-60 xl:w-72",
    list: "right-0 w-[min(26rem,calc(100vw-2rem))]",
  },
  hero: {
    box: "h-14 border-ink pr-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)]",
    icon: "ml-1.5 size-10 bg-rust text-paper",
    iconSize: "size-5",
    input: "min-w-0 flex-1 px-3 text-base",
    list: "inset-x-0",
  },
} as const;

/**
 * Catalogue search box: submits to the catalogue, and while typing offers the
 * best matches from /api/buscar to jump straight to a record (ARIA combobox).
 */
export function SearchBox({
  id,
  label,
  placeholder,
  variant = "header",
  className = "",
}: {
  id: string;
  label: string;
  placeholder: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const term = q.trim();
  // Last option is always "see every result in the catalogue".
  const options = results.length ? [...results.map((r) => `/patrimonio/${r.slug}`), catalogHref(term)] : [];
  const expanded = open && term.length >= 2 && results.length > 0;

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/buscar?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: SearchSuggestion[] }) => {
          setResults(d.results);
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(href);
  };

  return (
    <form
      action="/catalogo"
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        if (expanded && active >= 0) {
          e.preventDefault();
          go(options[active]!);
        }
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`group flex items-center rounded-full border bg-card ${v.box} transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-rust)_18%,transparent)]`}
      >
        <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${v.icon}`}>
          <Search className={v.iconSize} aria-hidden="true" />
        </span>
        <input
          ref={input}
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!expanded || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + step + options.length) % options.length);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`search-input h-full bg-transparent placeholder:text-iron focus:outline-none ${v.input}`}
        />
        {variant === "hero" ? (
          <button type="submit" className="h-11 shrink-0 rounded-full bg-ink px-5 text-sm text-paper hover:bg-ink-soft">
            Buscar
          </button>
        ) : null}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Sugerencias"
        hidden={!expanded}
        className={`select-pop absolute top-full z-50 mt-2 ${v.list} overflow-hidden rounded-2xl border border-ink bg-card py-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)]`}
      >
        {results.map((r, n) => (
          <li
            key={r.slug}
            id={`${listId}-${n}`}
            role="option"
            aria-selected={n === active}
            // mousedown keeps focus in the input so blur does not close the list before the click lands.
            onMouseDown={(e) => {
              e.preventDefault();
              go(options[n]!);
            }}
            className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${n === active ? "bg-paper-deep" : "hover:bg-paper-deep"}`}
          >
            <CategoryGlyph family={r.family} className="size-7 rounded-full text-xs" />
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] leading-snug">{r.name}</span>
              {r.place ? <span className="block truncate text-xs text-iron">{r.place}</span> : null}
            </span>
          </li>
        ))}
        <li
          id={`${listId}-${results.length}`}
          role="option"
          aria-selected={active === results.length}
          onMouseDown={(e) => {
            e.preventDefault();
            go(catalogHref(term));
          }}
          className={`mx-1.5 mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-lg border-t border-rule px-2.5 py-2.5 text-sm text-rust ${active === results.length ? "bg-paper-deep" : "hover:bg-paper-deep"}`}
        >
          Ver todos los resultados de «{term}»
          <ArrowRight className="size-4" aria-hidden="true" />
        </li>
      </ul>
    </form>
  );
}

const catalogHref = (q: string) => `/catalogo?q=${encodeURIComponent(q)}`;
