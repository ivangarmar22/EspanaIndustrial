import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { VALIDATION_LABELS } from "@/domain/labels";

export const metadata: Metadata = {
  title: "Metodología y política de calidad",
  description:
    "Cómo se obtienen, normalizan, validan y publican los datos de España Industrial, y cómo se distingue lo verificado de lo pendiente.",
  alternates: { canonical: "/metodologia" },
};

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-12 font-display text-3xl">{children}</h2>;

export default function MethodologyPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Inicio" }, { label: "Metodología" }]}
        eyebrow="Metodología"
        title="Cómo se construye el atlas"
        lead={
          <p>
            Ningún dato de este atlas se escribe a mano sin fuente. Esta página explica de dónde procede cada dato, cómo
            se procesa y qué significa cada nivel de verificación.
          </p>
        }
      />
      <div className="prose-ei mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <H2>Principios</H2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>
            Los datos desconocidos se dejan en blanco: no se rellenan fechas, coordenadas ni estados por aproximación.
          </li>
          <li>
            Cada dato conserva la fuente de la que procede, la fecha de descarga, el método de obtención y su licencia.
          </li>
          <li>Cuando dos fuentes no coinciden, se muestran ambas y se señala la discrepancia.</li>
          <li>Las fuentes colaborativas (Wikidata, Wikimedia Commons) nunca se presentan como oficiales.</li>
          <li>
            El estado de conservación no se deduce de fotografías ni de etiquetas de mapas: solo se muestra lo que dice
            una fuente.
          </li>
        </ul>

        <H2>Flujo de datos</H2>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>
            <strong>Extracción.</strong> Un proceso automático descarga el mapa del Plan Nacional de Patrimonio
            Industrial (exportación KML pública) y las fichas documentales en PDF enlazadas desde él, respetando pausas
            entre peticiones.
          </li>
          <li>
            <strong>Conservación del original.</strong> Los documentos descargados se guardan sin modificar para poder
            auditar cualquier dato.
          </li>
          <li>
            <strong>Normalización.</strong> Se interpretan códigos, nombres, cronologías y campos de las fichas. Los
            valores truncados por la maquetación del PDF o los marcadores de plantilla se descartan.
          </li>
          <li>
            <strong>Enriquecimiento.</strong> CartoCiudad (IGN) asigna municipio, código INE, provincia y comunidad.
            Wikidata se asocia solo cuando la distancia es inferior a 500 m y los nombres coinciden claramente; los
            casos dudosos quedan para revisión manual.
          </li>
          <li>
            <strong>Validación.</strong> Cada registro se valida contra un esquema estricto (identificadores únicos,
            coordenadas dentro de España, fuentes referenciadas).
          </li>
          <li>
            <strong>Comparación y revisión.</strong> Se calcula la diferencia con la versión publicada. Las altas,
            bajas, cambios de nombre, de categoría, de protección o desplazamientos de más de 100 m quedan pendientes de
            aprobación.
          </li>
          <li>
            <strong>Publicación.</strong> El catálogo validado se publica de forma atómica. Si una fuente no responde,
            se conservan los últimos datos correctos; un elemento que desaparece de la fuente no se borra, se marca para
            revisión.
          </li>
        </ol>

        <H2>Niveles de verificación</H2>
        <dl className="mt-4 space-y-4">
          {Object.entries(VALIDATION_LABELS).map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-ink">{v.label}</dt>
              <dd>{v.description}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          No se muestra ninguna puntuación numérica de fiabilidad: los niveles anteriores describen hechos comprobables
          sobre el origen de los datos.
        </p>

        <H2>Categorías</H2>
        <p className="mt-4">
          Cada elemento tiene una categoría principal. El «uso» que el IPCE asigna en su mapa determina la familia (por
          ejemplo, Minería o Energía); el nombre del elemento solo afina el tipo dentro de las familias compatibles con
          ese uso. Azucareras, harineras y fábricas de cerveza, que el IPCE agrupa como agroalimentarias, se clasifican
          como industria manufacturera. La regla aplicada queda registrada y puede corregirse editorialmente.
        </p>

        <H2>Fechas</H2>
        <p className="mt-4">
          Se distingue entre año exacto, fecha aproximada («h. 1900»), intervalo y siglo. Las cronologías que no pueden
          interpretarse sin ambigüedad se muestran con el texto literal de la fuente. «1914-actual» se interpreta solo
          como fecha de inicio: no implica que la actividad continúe.
        </p>

        <H2>Correcciones</H2>
        <p className="mt-4">
          Las correcciones editoriales se guardan aparte de los datos importados, con la fuente que las justifica, y la
          sincronización nunca las sobrescribe; si la fuente cambia un dato corregido, el informe de actualización lo
          advierte. Cualquier persona puede{" "}
          <Link href="/colabora#proponer">proponer una corrección o un lugar nuevo</Link>, que no se publica sin
          revisión.
        </p>
      </div>
    </>
  );
}
