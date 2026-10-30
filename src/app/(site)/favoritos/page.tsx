import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SavedPlaces } from "@/features/favorites/saved-places";

export const metadata: Metadata = {
  title: "Mis lugares guardados",
  robots: { index: false },
  alternates: { canonical: "/favoritos" },
};

export default function FavoritesPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Mis lugares" }]}
        title="Mis lugares guardados"
        lead={
          <p>
            Se guardan solo en este navegador: no se envían a ningún servidor ni se sincronizan con otros dispositivos.
          </p>
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SavedPlaces />
      </div>
    </>
  );
}
