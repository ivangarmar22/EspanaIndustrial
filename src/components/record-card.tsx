import Link from "next/link";
import type { IndexItem } from "@/domain/index-item";
import { getProvince } from "@/domain/territory";
import { PROTECTION_SHORT } from "@/domain/labels";
import { CategoryBadge } from "./category";
import { RecordVisual } from "./record-visual";

const place = (i: IndexItem) =>
  [i.municipality, i.provinceCode ? getProvince(i.provinceCode)?.name : undefined].filter(Boolean).join(", ");

export function RecordCard({ item, priority }: { item: IndexItem; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col border border-rule bg-card transition-colors hover:border-rule-strong">
      <RecordVisual
        image={item.image}
        family={item.family}
        point={item}
        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
        priority={priority}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <CategoryBadge family={item.family} compact />
        <h3 className="font-display text-xl leading-snug text-ink">
          <Link
            href={`/patrimonio/${item.slug}`}
            className="no-underline after:absolute after:inset-0 group-hover:underline"
          >
            {item.name}
          </Link>
        </h3>
        <p className="text-sm text-ink-soft">{place(item) || "Ubicación sin municipio asignado"}</p>
        <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 font-mono text-xs text-iron">
          {item.chronology ? <span>{item.chronology}</span> : null}
          {item.protection.map((p) => (
            <span key={p}>{PROTECTION_SHORT[p]}</span>
          ))}
        </p>
      </div>
    </article>
  );
}

export function RecordRow({ item }: { item: IndexItem }) {
  return (
    <article className="group relative grid grid-cols-[4.5rem_1fr] gap-4 border-b border-rule py-4 sm:grid-cols-[7rem_1fr]">
      <RecordVisual image={item.image} family={item.family} className="aspect-square" sizes="112px" />
      <div className="min-w-0">
        <CategoryBadge family={item.family} sub={item.sub} />
        <h3 className="mt-1 font-display text-lg leading-snug sm:text-xl">
          <Link
            href={`/patrimonio/${item.slug}`}
            className="text-ink no-underline after:absolute after:inset-0 group-hover:underline"
          >
            {item.name}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          {place(item)}
          {item.chronology ? <span className="ml-2 font-mono text-xs text-iron">{item.chronology}</span> : null}
        </p>
      </div>
    </article>
  );
}
