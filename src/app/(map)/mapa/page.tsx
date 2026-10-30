import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndexItems } from "@/data-access/catalog";
import { MapExplorer } from "@/features/map/map-explorer";

export const metadata: Metadata = {
  title: "Explorar el mapa",
  description:
    "Mapa interactivo del patrimonio industrial español con filtros por categoría, territorio, periodo, protección y conservación.",
  alternates: { canonical: "/mapa" },
};

export default async function MapPage() {
  const items = await getIndexItems();
  return (
    <Suspense fallback={<div className="blueprint absolute inset-0" />}>
      <MapExplorer items={items} />
    </Suspense>
  );
}
