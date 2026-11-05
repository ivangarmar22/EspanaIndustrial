import type { Metadata } from "next";
import Link from "next/link";
import { DocBody, DocSection } from "@/components/doc-section";
import { PageHeader } from "@/components/page-header";
import { LEGAL_UPDATED, owner, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: `Titularidad, condiciones de uso, responsabilidad y licencias de ${site.name}.`,
  alternates: { canonical: "/aviso-legal" },
};

export default function LegalPage() {
  const contact = owner.email ? (
    <a href={`mailto:${owner.email}`}>{owner.email}</a>
  ) : (
    <Link href="/colabora#proponer">formulario de contacto</Link>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Aviso legal" }]}
        eyebrow="Información legal"
        title="Aviso legal"
        lead={<p>Última actualización: {LEGAL_UPDATED}.</p>}
      />
      <DocBody>
        <DocSection id="titular" title="Titular del sitio">
          <div className="prose-ei space-y-4">
            <p>
              En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de
              comercio electrónico (LSSI), se informa de que el sitio web {site.domain} es un proyecto personal,
              independiente y sin ánimo de lucro.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {owner.name ? (
                <li>
                  <strong className="font-semibold text-ink">Titular:</strong> {owner.name}
                </li>
              ) : null}
              <li>
                <strong className="font-semibold text-ink">Contacto:</strong> {contact}
              </li>
              <li>
                <strong className="font-semibold text-ink">Actividad:</strong> divulgación cultural del patrimonio
                industrial español. El sitio no vende productos ni servicios ni contiene publicidad.
              </li>
            </ul>
            <p>
              Las aportaciones económicas son donaciones voluntarias destinadas a cubrir los costes del proyecto; no dan
              derecho a ninguna contraprestación.
            </p>
          </div>
        </DocSection>

        <DocSection id="uso" title="Condiciones de uso">
          <div className="prose-ei space-y-4">
            <p>
              El acceso a {site.name} es libre y gratuito y no requiere registro. Al navegar por el sitio aceptas este
              aviso legal. Te comprometes a hacer un uso lícito del sitio y a no emplear el formulario de propuestas
              para enviar contenidos ilícitos, ofensivos, publicitarios o que vulneren derechos de terceros.
            </p>
          </div>
        </DocSection>

        <DocSection id="responsabilidad" title="Alcance de la información">
          <div className="prose-ei space-y-4">
            <p>
              La información se ofrece con fines culturales y educativos, tal como figura en las fuentes citadas en cada
              ficha, que se indican siempre junto a cada dato. No sustituye a los registros oficiales de protección del
              patrimonio ni constituye información administrativa vinculante.
            </p>
            <p>
              Aunque se revisa con cuidado, el contenido puede contener errores u omisiones y no se garantiza que esté
              completo ni actualizado. El titular no responde de las decisiones que se tomen a partir de él ni de las
              interrupciones del servicio.
            </p>
          </div>
        </DocSection>

        <DocSection id="visitas" title="Seguridad en las visitas">
          <div className="prose-ei space-y-4">
            <p>
              Que un elemento figure en el atlas no implica que sea visitable ni accesible. Muchos lugares son propiedad
              privada, están cerrados o presentan riesgos. Respeta siempre la señalización y no accedas a instalaciones
              cerradas, abandonadas o en ruinas.
            </p>
          </div>
        </DocSection>

        <DocSection id="licencias" title="Propiedad intelectual y licencias">
          <div className="prose-ei space-y-4">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Textos y datos propios del catálogo:{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/deed.es"
                  rel="license noopener noreferrer"
                  target="_blank"
                >
                  Creative Commons Reconocimiento 4.0 (CC BY 4.0)
                </a>
                .
              </li>
              <li>
                Conjunto de datos del ferrocarril:{" "}
                <a
                  href="https://opendatacommons.org/licenses/odbl/1-0/"
                  rel="license noopener noreferrer"
                  target="_blank"
                >
                  ODbL 1.0
                </a>
                , por derivar de OpenStreetMap.
              </li>
              <li>
                Código fuente:{" "}
                <a href={site.repository} target="_blank" rel="noopener noreferrer">
                  licencia MIT
                </a>
                .
              </li>
              <li>
                Fotografías: cada una conserva la licencia de su autor, indicada junto a ella con un enlace a su página
                de origen.
              </li>
            </ul>
            <p>
              Al reutilizar estos contenidos, cita «{site.name}» y las fuentes originales que se indican en cada caso.
              El nombre y el logotipo de {site.name} no están incluidos en estas licencias.
            </p>
          </div>
        </DocSection>

        <DocSection id="sector-publico" title="Información del sector público">
          <div className="prose-ei space-y-4">
            <p>
              Los datos del Plan Nacional de Patrimonio Industrial se reutilizan conforme a la licencia general del
              Ministerio de Cultura (Real Decreto 1495/2011). Origen de los datos: Ministerio de Cultura. El Ministerio
              no participa, patrocina ni apoya este proyecto. La cartografía y los datos geográficos del Instituto
              Geográfico Nacional se utilizan bajo licencia CC BY 4.0. Más detalles en{" "}
              <Link href="/fuentes">fuentes y licencias</Link>.
            </p>
          </div>
        </DocSection>

        <DocSection id="enlaces" title="Enlaces externos">
          <div className="prose-ei space-y-4">
            <p>
              Las fichas enlazan a fuentes y sitios de terceros para que puedas comprobar cada dato. El titular no
              controla esos sitios y no responde de su contenido, disponibilidad ni políticas de privacidad.
            </p>
          </div>
        </DocSection>

        <DocSection id="reclamaciones" title="Errores y retirada de contenidos">
          <div className="prose-ei space-y-4">
            <p>
              Si detectas un error o consideras que algún contenido vulnera tus derechos, comunícalo a través del{" "}
              <Link href="/colabora#proponer">formulario de propuestas</Link>
              {owner.email ? (
                <>
                  {" "}
                  o escribiendo a <a href={`mailto:${owner.email}`}>{owner.email}</a>
                </>
              ) : null}
              . Se revisará y, si procede, se corregirá o retirará con la mayor brevedad.
            </p>
          </div>
        </DocSection>

        <DocSection id="legislacion" title="Legislación aplicable">
          <div className="prose-ei space-y-4">
            <p>
              Este aviso legal se rige por la legislación española. Cualquier controversia se someterá a los juzgados y
              tribunales que correspondan conforme a la normativa aplicable.
            </p>
          </div>
        </DocSection>
      </DocBody>
    </>
  );
}
