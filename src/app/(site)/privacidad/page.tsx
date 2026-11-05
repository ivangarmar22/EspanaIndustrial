import type { Metadata } from "next";
import Link from "next/link";
import { DocBody, DocSection } from "@/components/doc-section";
import { PageHeader } from "@/components/page-header";
import { LEGAL_UPDATED, owner, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacidad",
  description: `Qué datos personales trata ${site.name}, para qué, durante cuánto tiempo y cómo ejercer tus derechos.`,
  alternates: { canonical: "/privacidad" },
};

const Term = ({ children }: { children: React.ReactNode }) => (
  <strong className="font-semibold text-ink">{children}</strong>
);

export default function PrivacyPage() {
  const contact = owner.email ? (
    <a href={`mailto:${owner.email}`}>{owner.email}</a>
  ) : (
    <Link href="/colabora#proponer">el formulario de contacto</Link>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Privacidad" }]}
        eyebrow="Información legal"
        title="Política de privacidad"
        lead={
          <p>
            {site.name} no utiliza cookies, analítica ni publicidad, y no crea cuentas de usuario. Solo trata datos
            personales si envías una propuesta. Última actualización: {LEGAL_UPDATED}.
          </p>
        }
      />
      <DocBody>
        <DocSection id="responsable" title="Responsable">
          <div className="prose-ei space-y-4">
            <p>
              Responsable del tratamiento: {owner.name ?? `el titular de ${site.name}`}. Contacto: {contact}.
            </p>
            <p>
              Esta política se ajusta al Reglamento (UE) 2016/679, General de Protección de Datos (RGPD), y a la Ley
              Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
            </p>
          </div>
        </DocSection>

        <DocSection id="propuestas" title="Propuestas y correcciones">
          <div className="prose-ei space-y-4">
            <p>
              Cuando envías el formulario de <Link href="/colabora#proponer">Colabora</Link>, su contenido llega por
              correo electrónico al responsable a través del servicio Web3Forms. Esta web no guarda ninguna copia.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <Term>Datos:</Term> el contenido de la propuesta, los enlaces a fotografías y su autoría si los añades
                y, de forma opcional, tu nombre o alias y tu correo electrónico.
              </li>
              <li>
                <Term>Finalidad:</Term> estudiar la propuesta, incorporarla al atlas si procede y, si nos has dejado tu
                correo, responderte sobre ella.
              </li>
              <li>
                <Term>Base jurídica:</Term> tu consentimiento (art. 6.1.a del RGPD), que das al marcar la casilla del
                formulario. Puedes retirarlo en cualquier momento escribiendo a {contact}, sin que afecte a lo tratado
                antes.
              </li>
              <li>
                <Term>Conservación:</Term> el mensaje se borra cuando la propuesta queda resuelta y, como máximo, a los
                doce meses de recibirlo.
              </li>
              <li>
                <Term>Publicación:</Term> si la propuesta se incorpora, se publica el dato con su fuente, nunca tu
                nombre ni tu correo. Si aportas fotografías, se publica la autoría que indiques junto a ellas, porque
                así lo exigen sus licencias.
              </li>
            </ul>
            <p>No envíes datos de otras personas ni información sensible en el formulario.</p>
          </div>
        </DocSection>

        <DocSection id="navegacion" title="Navegación, cookies y ubicación">
          <div className="prose-ei space-y-4">
            <p>
              El sitio no instala cookies ni guarda datos personales en tu navegador. El mapa puede conservar en la
              caché del navegador las teselas cartográficas ya descargadas para cargar más rápido; no contienen
              información sobre ti.
            </p>
            <p>
              Tu ubicación solo se solicita si pulsas el botón de localización del mapa. Se usa en tu dispositivo para
              centrar el mapa y no se transmite ni se almacena.
            </p>
          </div>
        </DocSection>

        <DocSection id="proveedores" title="Proveedores">
          <div className="prose-ei space-y-4">
            <p>Los datos no se venden ni se ceden a terceros. Intervienen únicamente estos proveedores técnicos:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <Term>GitHub Pages</Term> (GitHub, Inc.): aloja la web y, como cualquier servidor, registra la dirección
                IP de las visitas por motivos de seguridad.
              </li>
              <li>
                <Term>Web3Forms</Term>: reenvía por correo las propuestas del formulario.
              </li>
              <li>
                <Term>OpenFreeMap</Term> e <Term>Instituto Geográfico Nacional</Term>: sirven las teselas del mapa y
                reciben la dirección IP como en cualquier petición web.
              </li>
            </ul>
            <p>
              Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo; en ese caso lo hacen
              con las garantías previstas en el RGPD. Las tipografías y las fotografías se sirven desde la propia web.
            </p>
          </div>
        </DocSection>

        <DocSection id="derechos" title="Tus derechos">
          <div className="prose-ei space-y-4">
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
              portabilidad escribiendo a {contact}, indicando qué derecho ejerces.
            </p>
            <p>
              Si consideras que no se han atendido correctamente, puedes presentar una reclamación ante la{" "}
              <a href="https://www.aepd.es/" target="_blank" rel="noopener noreferrer">
                Agencia Española de Protección de Datos
              </a>
              .
            </p>
          </div>
        </DocSection>

        <DocSection id="menores" title="Menores de edad">
          <div className="prose-ei space-y-4">
            <p>
              Si tienes menos de 14 años, no envíes tus datos de contacto en el formulario sin el consentimiento de tus
              padres o tutores.
            </p>
          </div>
        </DocSection>
      </DocBody>
    </>
  );
}
