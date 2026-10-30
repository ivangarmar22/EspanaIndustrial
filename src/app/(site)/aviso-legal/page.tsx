import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Aviso legal",
  alternates: { canonical: "/aviso-legal" },
  robots: { index: true, follow: true },
};

export default function LegalPage() {
  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Inicio" }, { label: "Aviso legal" }]} title="Aviso legal" />
      <div className="prose-ei mx-auto max-w-[1440px] space-y-5 px-4 sm:px-6 lg:px-8">
        <p>
          {site.name} es un proyecto independiente de divulgación del patrimonio industrial. La información se ofrece
          con fines culturales y educativos, tal como figura en las fuentes citadas en cada ficha. No sustituye a los
          registros oficiales de protección patrimonial ni constituye información administrativa vinculante.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Reutilización de información del sector público</h2>
        <p>
          Los datos del Plan Nacional de Patrimonio Industrial se reutilizan conforme a la licencia general del
          Ministerio de Cultura (Real Decreto 1495/2011). Origen de los datos: Ministerio de Cultura. El Ministerio no
          participa, patrocina ni apoya este proyecto. La cartografía y los datos geográficos del Instituto Geográfico
          Nacional se utilizan bajo licencia CC BY 4.0.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Imágenes</h2>
        <p>
          Cada fotografía indica su autor, su licencia y su página de origen. Las licencias de las imágenes son
          independientes de la del resto del contenido.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Seguridad en las visitas</h2>
        <p>
          La inclusión de un elemento en el atlas no implica que sea visitable ni accesible. Muchos lugares son
          propiedad privada, están cerrados o presentan riesgos. Respeta siempre la señalización y no accedas a
          instalaciones abandonadas o en ruinas.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Errores y reclamaciones</h2>
        <p>
          Si detectas un error o consideras que algún contenido vulnera tus derechos, puedes comunicarlo mediante el{" "}
          <Link href="/colabora#proponer">formulario de propuestas</Link>.
        </p>
      </div>
    </>
  );
}
