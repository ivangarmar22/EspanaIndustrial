import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Factory, HeartHandshake, MapPinPlus } from "lucide-react";
import { donations, site } from "@/config/site";
import { getPublishedRecords } from "@/data-access/catalog";
import { getRegion } from "@/domain/territory";
import { PageHeader } from "@/components/page-header";
import { ContributionForm } from "@/features/contributions/contribution-form";
import { CopyButton } from "@/features/contributions/copy-button";

export const metadata: Metadata = {
  title: "Colabora",
  description: `${site.name} es un proyecto gratuito y sin ánimo de lucro. Descubre cómo apoyarlo, proponer lugares o corregir datos.`,
  alternates: { canonical: "/colabora" },
};

const PAYPAL_QR = "/donate/paypal-qr.png";
const hasPaypalQr = existsSync(path.join(process.cwd(), "public", PAYPAL_QR));

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-ink pt-8">
      <h2 id={`${id}-t`} className="flex items-center gap-4 font-display text-3xl">
        {/* Same cast-iron plate finish as the brand mark. */}
        <span
          className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#c25d2d,#9e4320_55%,#7a3216)] text-[#fdf6ec] shadow-[inset_0_1px_0_rgba(255,236,220,0.45),inset_0_-2px_0_rgba(59,23,9,0.35),0_6px_14px_-6px_rgba(122,50,22,0.6)] ring-1 ring-[#5c240e]/50 [&_svg]:drop-shadow-[0_1px_0_rgba(59,23,9,0.55)]"
          aria-hidden="true"
        >
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function CollaboratePage({ searchParams }: PageProps<"/colabora">) {
  const sp = await searchParams;
  const records = await getPublishedRecords();
  const options = records
    .map((r) => ({
      id: r.id,
      name: r.name.value,
      group: (r.location.regionCode && getRegion(r.location.regionCode)?.name) || "Sin comunidad",
    }))
    .sort((a, b) => a.group.localeCompare(b.group, "es") || a.name.localeCompare(b.name, "es"));
  const preselected = typeof sp.elemento === "string" ? records.find((r) => r.slug === sp.elemento)?.id : undefined;
  const anyDonation = donations.paypal || donations.kofi || donations.bizum;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Colabora" }]}
        eyebrow="Colabora"
        title="Un atlas abierto, gratuito y sin ánimo de lucro"
        lead={
          <p>
            {site.name} reúne y documenta los lugares de la industrialización de España con datos que cualquiera puede
            comprobar. No tiene publicidad, no vende datos y no pide registrarse. Si te resulta útil, puedes ayudar a
            que siga creciendo.
          </p>
        }
      >
        <nav aria-label="En esta página" className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            ["#proyecto", "El proyecto"],
            ["#apoya", "Apoya el proyecto"],
            ["#proponer", "Propón un lugar o una corrección"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-10 items-center rounded-full border border-rule-strong bg-card px-4 text-ink no-underline hover:border-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <div className="mx-auto max-w-4xl space-y-16 px-4 sm:px-6">
        <Section id="proyecto" icon={<Factory className="size-6" strokeWidth={1.8} />} title="El proyecto">
          <div className="prose-ei space-y-4">
            <blockquote className="border-l-2 border-rust pl-5 font-display text-xl text-ink italic">
              «Se entiende por patrimonio industrial el conjunto de los bienes muebles, inmuebles y sistemas de
              sociabilidad relacionados con la cultura del trabajo que han sido generados por las actividades de
              extracción, de transformación, de transporte, de distribución y gestión generadas por el sistema económico
              surgido de la revolución industrial.»
              <footer className="mt-2 font-sans text-sm text-iron not-italic">
                —{" "}
                <a
                  href="https://www.cultura.gob.es/planes-nacionales/planes-nacionales/patrimonio-industrial/definicion.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Plan Nacional de Patrimonio Industrial, Ministerio de Cultura
                </a>
              </footer>
            </blockquote>
            <p>
              El atlas parte del listado del Plan Nacional de Patrimonio Industrial y lo enriquece con fuentes oficiales
              y colaborativas, indicando siempre de dónde sale cada dato. No pretende ser completo: crece fuente a
              fuente, prefiriendo pocos datos fiables a muchos dudosos. Consulta la{" "}
              <Link href="/metodologia">metodología</Link> y las <Link href="/fuentes">fuentes y licencias</Link>.
            </p>
            <p>
              Es un proyecto independiente: no está afiliado al Ministerio de Cultura ni a ninguna administración. El
              código es abierto (licencia MIT) y los datos se publican bajo CC BY 4.0 para que cualquiera pueda
              reutilizarlos.
            </p>
          </div>
        </Section>

        <Section id="apoya" icon={<HeartHandshake className="size-6" strokeWidth={1.8} />} title="Apoya el proyecto">
          <p className="prose-ei">
            Mantener el atlas tiene costes de alojamiento, dominio y, sobre todo, muchas horas de investigación y
            revisión. El acceso será siempre gratuito; las aportaciones voluntarias ayudan a dedicarle más tiempo.
          </p>
          {anyDonation ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {donations.paypal ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-ink bg-card p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="signage text-rust">PayPal</span>
                    <span className="font-display text-2xl">Donar con PayPal</span>
                    <a
                      href={donations.paypal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-rust px-5 text-paper no-underline hover:bg-rust-deep"
                    >
                      Abrir PayPal <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                  {hasPaypalQr ? (
                    <Image
                      src={PAYPAL_QR}
                      alt="Código QR para donar con PayPal"
                      width={136}
                      height={136}
                      className="hidden rounded-xl border border-rule bg-white p-2 sm:block"
                    />
                  ) : null}
                </div>
              ) : null}
              {donations.kofi ? (
                <a
                  href={donations.kofi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 rounded-2xl border border-ink bg-card p-5 text-ink no-underline hover:bg-paper-deep"
                >
                  <span className="signage text-rust">Ko-fi</span>
                  <span className="font-display text-2xl">Invítanos a un café</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                    Abre Ko-fi en una pestaña nueva <ExternalLink className="size-3.5" aria-hidden="true" />
                  </span>
                </a>
              ) : null}
              {donations.bizum ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-ink bg-card p-5">
                  <span className="signage text-rust">Bizum</span>
                  <span className="font-display text-2xl">Envía un Bizum</span>
                  <span className="font-mono text-xl tracking-wide">
                    {donations.bizum.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")}
                  </span>
                  <span className="text-sm text-ink-soft">Indica «España Industrial» en el concepto.</span>
                  <div>
                    <CopyButton value={donations.bizum.replace(/\s+/g, "")} label="Copiar número" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 border-l-4 border-rule-strong bg-card p-4 text-ink-soft">
              Las formas de donar se publicarán aquí próximamente. Mientras tanto, puedes ayudar proponiendo lugares o
              difundiendo el proyecto.
            </p>
          )}
        </Section>

        <Section
          id="proponer"
          icon={<MapPinPlus className="size-6" strokeWidth={1.8} />}
          title="Propón un lugar o una corrección"
        >
          <p className="prose-ei mb-8">
            ¿Falta un lugar, has visto un error o tienes una fuente mejor? Rellena el formulario. La propuesta llega por
            correo al responsable del proyecto, que la contrasta antes de incorporarla al atlas citando la fuente. No se
            guarda nada en esta web.
          </p>
          <ContributionForm records={options} preselected={preselected} />
        </Section>
      </div>
    </>
  );
}
