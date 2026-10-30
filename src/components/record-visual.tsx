import Image from "next/image";
import type { CategoryFamilyId } from "@/domain/categories";
import { getFamily } from "@/domain/categories";
import { formatCoordinates } from "@/lib/geo";
import { FAMILY_CLASSES } from "./category";

interface Props {
  image?: { src: string; width: number; height: number; alt: string };
  family: CategoryFamilyId;
  point?: { lat: number; lon: number };
  className?: string;
  sizes: string;
  priority?: boolean;
}

/**
 * A record's photo, or — when no licensed photo exists — a blueprint-style
 * composition with the category glyph and coordinates. Never a stock photo.
 */
export function RecordVisual({ image, family, point, className = "aspect-[4/3]", sizes, priority }: Props) {
  if (image) {
    return (
      <div className={`relative overflow-hidden bg-paper-deep ${className}`}>
        <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`blueprint relative flex items-end overflow-hidden ${className}`}
      role="img"
      aria-label={`Sin fotografía con licencia disponible. Categoría: ${getFamily(family).label}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-7xl opacity-25 ${FAMILY_CLASSES[family].text}`}
      >
        {getFamily(family).glyph}
      </span>
      {point ? (
        <span className="relative m-3 font-mono text-[0.68rem] text-iron">{formatCoordinates(point)}</span>
      ) : null}
    </div>
  );
}
