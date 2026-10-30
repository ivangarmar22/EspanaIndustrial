"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface Picked {
  name: string;
  size: number;
  url: string;
}

/**
 * File input dressed as a drop zone. The real <input type="file"> covers the
 * zone (transparent), so clicking, keyboard and native drag-and-drop all work
 * and the files travel with the form as usual.
 */
export function PhotoPicker({
  id,
  name,
  max,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  max: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [picked, setPicked] = useState<Picked[]>([]);
  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.url)), [picked]);

  return (
    <div>
      <div
        className={`relative flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-card px-4 py-5 text-center transition-colors focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-rust)_18%,transparent)] hover:border-iron ${invalid ? "border-danger" : "border-rule-strong"}`}
      >
        <ImagePlus className="size-7 text-rust" aria-hidden="true" />
        <p className="font-medium">
          {picked.length
            ? `${formatNumber(picked.length)} ${picked.length === 1 ? "fotografía elegida" : "fotografías elegidas"}`
            : "Elige fotografías o arrástralas aquí"}
        </p>
        <p className="text-sm text-iron">JPEG, PNG o WebP · hasta {max} fotos y 8 MB en total</p>
        <input
          id={id}
          name={name}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) =>
            setPicked(
              [...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size, url: URL.createObjectURL(f) })),
            )
          }
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
      {picked.length ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Fotografías elegidas">
          {picked.map((p) => (
            <li key={p.url} className="overflow-hidden rounded-xl border border-rule bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a site image */}
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <p className="truncate px-2 pt-1.5 text-xs">{p.name}</p>
              <p className="px-2 pb-1.5 font-mono text-[0.7rem] text-iron">
                {formatNumber(Math.max(1, Math.round(p.size / 1024)))} KB
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
