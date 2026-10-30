"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, ExternalLink, Map as MapIcon, Share2 } from "lucide-react";
import { usePlaces } from "@/features/favorites/store";

interface Props {
  id: string;
  slug: string;
  name: string;
  point?: { lat: number; lon: number };
}

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rule-strong bg-card px-4 text-sm text-ink transition-colors hover:border-ink disabled:opacity-50";

export function RecordActions({ id, slug, name, point }: Props) {
  const places = usePlaces();
  const saved = places.isSaved(id);
  const visited = places.isVisited(id);
  const [shared, setShared] = useState<"idle" | "copied" | "error">("idle");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared("copied");
        setTimeout(() => setShared("idle"), 2500);
      }
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") setShared("error");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <button type="button" className={btn} aria-pressed={saved} onClick={() => places.toggleSaved({ id, slug, name })}>
        {saved ? (
          <BookmarkCheck className="size-4 text-rust" aria-hidden="true" />
        ) : (
          <Bookmark className="size-4" aria-hidden="true" />
        )}
        {saved ? "Guardado" : "Guardar"}
      </button>
      <button type="button" className={btn} aria-pressed={visited} onClick={() => places.toggleVisited(id)}>
        <Check className={`size-4 ${visited ? "text-green" : "text-iron"}`} aria-hidden="true" />
        {visited ? (
          "Visitado"
        ) : (
          <>
            <span className="sm:hidden">Lo he visitado</span>
            <span className="hidden sm:inline">Marcar como visitado</span>
          </>
        )}
      </button>
      <button type="button" className={btn} onClick={share}>
        <Share2 className="size-4" aria-hidden="true" />
        Compartir
      </button>
      {point ? (
        <>
          <Link href={`/mapa?sel=${slug}`} className={`${btn} no-underline`}>
            <MapIcon className="size-4" aria-hidden="true" />
            Ver en el mapa
          </Link>
          <a
            href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=17/${point.lat}/${point.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} no-underline`}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            OpenStreetMap
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        </>
      ) : null}
      <p role="status" aria-live="polite" className="w-full text-sm text-iron">
        {shared === "copied"
          ? "Enlace copiado al portapapeles."
          : shared === "error"
            ? "No se pudo compartir; copia la dirección de la barra del navegador."
            : ""}
      </p>
    </div>
  );
}
