"use client";

import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { usePlaces } from "./store";
import { formatNumber } from "@/lib/format";

export function SavedPlaces() {
  const { saved, visited, toggleSaved, toggleVisited, clearAll } = usePlaces();

  if (!saved.length && !visited.length) {
    return (
      <div className="blueprint p-10 text-center">
        <p className="font-display text-2xl">Todavía no has guardado ningún lugar</p>
        <p className="mt-2 text-ink-soft">Usa el botón «Guardar» de cualquier ficha para tenerla a mano aquí.</p>
        <Link href="/mapa" className="mt-4 inline-block">
          Explorar el mapa
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        {formatNumber(saved.length)} guardados · {formatNumber(visited.length)} marcados como visitados
      </p>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {saved
          .slice()
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
          .map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <Link href={`/patrimonio/${p.slug}`} className="flex-1 font-display text-lg">
                {p.name}
              </Link>
              <button
                type="button"
                onClick={() => toggleVisited(p.id)}
                aria-pressed={visited.includes(p.id)}
                className="inline-flex min-h-10 items-center gap-1.5 border border-rule-strong px-3 text-sm"
              >
                <Check className={`size-4 ${visited.includes(p.id) ? "text-green" : "text-iron"}`} aria-hidden="true" />
                {visited.includes(p.id) ? "Visitado" : "Marcar visitado"}
              </button>
              <button
                type="button"
                onClick={() => toggleSaved(p)}
                className="inline-flex min-h-10 items-center gap-1.5 px-3 text-sm text-danger"
              >
                <Trash2 className="size-4" aria-hidden="true" /> Quitar
              </button>
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          if (window.confirm("¿Borrar todos los lugares guardados y visitados de este navegador?")) clearAll();
        }}
        className="mt-6 text-sm text-danger underline"
      >
        Borrar todos mis datos locales
      </button>
    </div>
  );
}
