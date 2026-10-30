import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacidad", alternates: { canonical: "/privacidad" } };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Inicio" }, { label: "Privacidad" }]} title="Privacidad" />
      <div className="prose-ei mx-auto max-w-[1440px] space-y-5 px-4 sm:px-6 lg:px-8">
        <p>{site.name} no utiliza analítica, publicidad ni cookies de terceros, y no crea cuentas de usuario.</p>
        <h2 className="pt-4 font-display text-2xl text-ink">Lugares guardados y visitados</h2>
        <p>
          Se guardan únicamente en el almacenamiento local de tu navegador. No se envían a ningún servidor ni se
          sincronizan entre dispositivos. Puedes borrarlos en cualquier momento desde «Mis lugares» o eliminando los
          datos del sitio en tu navegador.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Ubicación</h2>
        <p>
          Tu ubicación solo se solicita si pulsas el botón de localización del mapa, y se usa en tu dispositivo para
          centrar el mapa. No se transmite ni se almacena.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Propuestas y correcciones</h2>
        <p>
          Al enviar una propuesta, su contenido (y la fotografía, si la adjuntas) se envía por correo electrónico al
          responsable del proyecto; la web no lo guarda. El nombre y el correo son opcionales, solo se usan para
          responder sobre esa propuesta y nunca se publican. Puedes pedir que se borre tu correo respondiendo a ese
          mensaje.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ink">Servicios externos</h2>
        <p>
          Al ver el mapa, tu navegador descarga teselas de OpenFreeMap y del Instituto Geográfico Nacional, que reciben
          la dirección IP como en cualquier petición web. No se envía ningún otro dato.
        </p>
      </div>
    </>
  );
}
