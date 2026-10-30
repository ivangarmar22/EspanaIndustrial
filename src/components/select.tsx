"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeText } from "@/lib/text";
import { formatNumber } from "@/lib/format";

export interface SelectOption {
  value: string;
  label: string;
  /** Shown right-aligned in the list (e.g. how many records match). */
  count?: number;
  group?: string;
}

interface Props {
  id: string;
  options: SelectOption[];
  /** Form field name: a hidden input carries the value, so plain GET/POST forms keep working. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Adds a filter box at the top of the list (for long lists). */
  searchable?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const noop = () => () => {};
const optionText = (o: SelectOption) => (o.count === undefined ? o.label : `${o.label} (${formatNumber(o.count)})`);

/**
 * Select-only combobox (WAI-ARIA APG pattern) styled like the rest of the
 * controls. Before hydration it renders a native <select> with the same
 * options, so forms work without JavaScript.
 */
export function Select({
  id,
  options,
  name,
  value,
  defaultValue = "",
  onChange,
  searchable = false,
  className = "",
  ...aria
}: Props) {
  // false on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const typeahead = useRef({ text: "", at: 0 });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const filter = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const visible = useMemo(() => {
    const q = normalizeText(query);
    return q ? options.filter((o) => normalizeText(o.label).includes(q)) : options;
  }, [options, query]);
  const selected = options.find((o) => o.value === current) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    // Open upwards when the list would not fit below the control.
    setUpward(!!rect && window.innerHeight - rect.bottom < 300 && rect.top > window.innerHeight - rect.bottom);
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === current),
      ),
    );
    setOpen(true);
    if (searchable) requestAnimationFrame(() => filter.current?.focus());
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (o: SelectOption | undefined) => {
    if (!o) return;
    if (value === undefined) setInner(o.value);
    if (o.value !== current) onChange?.(o.value);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const last = visible.length - 1;
    if (e.key === "ArrowDown") setActive((a) => Math.min(last, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || (e.key === " " && !searchable)) choose(visible[active]);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") return close(false);
    else if (!searchable && e.key.length === 1) {
      // Type-to-select, as in a native list.
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at < 600 ? t.text + e.key : e.key;
      t.at = now;
      const hit = visible.findIndex((o) => normalizeText(o.label).startsWith(normalizeText(t.text)));
      if (hit >= 0) setActive(hit);
      return;
    } else return;
    e.preventDefault();
  };

  if (!mounted) {
    return (
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={`ctl select-native ${className}`}
        {...aria}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {optionText(o)}
          </option>
        ))}
      </select>
    );
  }

  const activeId = open && visible[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={root} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={searchable ? undefined : activeId}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className="ctl flex items-center gap-2 text-left"
        {...aria}
      >
        <span className={`min-w-0 flex-1 truncate ${current ? "text-ink" : "text-ink-soft"}`}>
          {selected?.label}
          {selected?.count !== undefined ? (
            <span className="ml-1.5 font-mono text-xs text-iron">{formatNumber(selected.count)}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-iron transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          className={`select-pop absolute inset-x-0 z-40 min-w-[14rem] overflow-hidden rounded-2xl border border-ink bg-card shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] ${upward ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
        >
          {searchable ? (
            <div className="relative border-b border-rule p-2">
              <Search
                className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-iron"
                aria-hidden="true"
              />
              <input
                ref={filter}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-label="Filtrar opciones"
                placeholder="Filtrar…"
                className="search-input h-10 w-full rounded-full bg-paper pr-3 pl-9 text-sm placeholder:text-iron focus:outline-none"
              />
            </div>
          ) : null}
          <ul ref={list} id={listId} role="listbox" aria-labelledby={id} className="max-h-72 overflow-y-auto py-1.5">
            {visible.map((o, n) => {
              const header = o.group && o.group !== visible[n - 1]?.group ? o.group : undefined;
              const isSelected = o.value === current;
              return [
                header ? (
                  <li key={`g-${header}`} role="presentation" className="signage px-4 pt-3 pb-1 text-iron first:pt-1.5">
                    {header}
                  </li>
                ) : null,
                <li
                  key={o.value}
                  id={`${listId}-${n}`}
                  data-index={n}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseMove={() => setActive(n)}
                  className={`mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.95rem] ${n === active ? "bg-paper-deep" : ""} ${isSelected ? "font-medium text-ink" : "text-ink-soft"}`}
                >
                  <Check className={`size-4 shrink-0 ${isSelected ? "text-rust" : "invisible"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {o.count !== undefined ? (
                    <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-xs text-iron">
                      {formatNumber(o.count)}
                    </span>
                  ) : null}
                </li>,
              ];
            })}
            {visible.length === 0 ? <li className="px-4 py-3 text-sm text-iron">Sin coincidencias</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
