"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Map as MapIcon, Share2 } from "lucide-react";

interface Props {
  slug: string;
  name: string;
  point?: { lat: number; lon: number };
}

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rule-strong bg-card px-4 text-sm text-ink no-underline transition-colors hover:border-ink";

export function RecordActions({ slug, name, point }: Props) {
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
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} onClick={share}>
        <Share2 className="size-4" aria-hidden="true" />
        Compartir
      </button>
      {point ? (
        <>
          <Link href={`/mapa?sel=${slug}`} className={btn}>
            <MapIcon className="size-4" aria-hidden="true" />
            Ver en el mapa
          </Link>
          <a
            href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=17/${point.lat}/${point.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className={btn}
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
