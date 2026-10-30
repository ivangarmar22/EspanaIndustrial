import { getFamily, getSubcategory, type CategoryFamilyId } from "@/domain/categories";

/** Static class names per family (Tailwind needs literal strings). */
export const FAMILY_CLASSES: Record<CategoryFamilyId, { bg: string; text: string; border: string }> = {
  industria: { bg: "bg-cat-industria", text: "text-cat-industria", border: "border-cat-industria" },
  mineria: { bg: "bg-cat-mineria", text: "text-cat-mineria", border: "border-cat-mineria" },
  energia: { bg: "bg-cat-energia", text: "text-cat-energia", border: "border-cat-energia" },
  transporte: { bg: "bg-cat-transporte", text: "text-cat-transporte", border: "border-cat-transporte" },
  agua: { bg: "bg-cat-agua", text: "text-cat-agua", border: "border-cat-agua" },
  agroindustria: { bg: "bg-cat-agroindustria", text: "text-cat-agroindustria", border: "border-cat-agroindustria" },
  paisaje: { bg: "bg-cat-paisaje", text: "text-cat-paisaje", border: "border-cat-paisaje" },
};

/** Hex values mirrored from globals.css for MapLibre paint expressions. */
export const FAMILY_HEX: Record<CategoryFamilyId, string> = {
  industria: "#a6441c",
  mineria: "#33312e",
  transporte: "#2e63a6",
  energia: "#a37b10",
  agua: "#008aa6",
  paisaje: "#a23a63",
  agroindustria: "#6d7d1c",
};

export function CategoryGlyph({
  family,
  className = "size-5 text-[0.7rem]",
}: {
  family: CategoryFamilyId;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-semibold text-paper ${FAMILY_CLASSES[family].bg} ${className}`}
    >
      {getFamily(family).glyph}
    </span>
  );
}

export function CategoryBadge({
  family,
  sub,
  compact = false,
}: {
  family: CategoryFamilyId;
  sub?: string;
  compact?: boolean;
}) {
  const fam = getFamily(family);
  const subLabel = sub ? getSubcategory(family, sub)?.label : undefined;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CategoryGlyph family={family} />
      <span className="signage text-ink-soft">
        {compact ? fam.shortLabel : fam.label}
        {subLabel && !compact ? <span className="text-iron"> · {subLabel}</span> : null}
      </span>
    </span>
  );
}
