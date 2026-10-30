import type { CategoryFamilyId } from "@/domain/categories";
import { FAMILY_HEX } from "@/components/category";
import { LocatorMap } from "@/features/record/locator-map";

export function RouteMap({
  stops,
  title,
}: {
  stops: Array<{ lat: number; lon: number; name: string; family: CategoryFamilyId }>;
  title: string;
}) {
  return (
    <LocatorMap
      points={stops.map((s) => ({ lat: s.lat, lon: s.lon, label: s.name, color: FAMILY_HEX[s.family] }))}
      sequence
      ariaLabel={`Mapa de las paradas de la ruta ${title}`}
      className="aspect-square"
    />
  );
}
