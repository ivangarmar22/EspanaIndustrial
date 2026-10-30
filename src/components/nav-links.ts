export const MAIN_NAV = [
  { href: "/mapa", label: "Mapa" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/ferrocarril", label: "Ferrocarril" },
  { href: "/cronologia", label: "Cronología" },
  { href: "/rutas", label: "Rutas" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "/colabora", label: "Colabora" },
] as const;

/** Secondary links for the mobile menu. */
export const FOOTER_NAV = [
  { href: "/metodologia", label: "Metodología y calidad" },
  { href: "/fuentes", label: "Fuentes, licencias y cobertura" },
  { href: "/colabora#proponer", label: "Proponer un lugar o una corrección" },
  { href: "/favoritos", label: "Mis lugares guardados" },
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
] as const;

/** Footer link groups (the main sections are already in the header). */
export const FOOTER_GROUPS = [
  {
    title: "Proyecto",
    links: [
      { href: "/colabora#proyecto", label: "Qué es España Industrial" },
      { href: "/colabora#apoya", label: "Apoya el proyecto" },
      { href: "/colabora#proponer", label: "Proponer un lugar o una corrección" },
    ],
  },
  {
    title: "Datos",
    links: [
      { href: "/metodologia", label: "Metodología y calidad" },
      { href: "/fuentes", label: "Fuentes, licencias y cobertura" },
      { href: "/ferrocarril#fuentes-ferrocarril", label: "Datos del ferrocarril" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/aviso-legal", label: "Aviso legal" },
      { href: "/privacidad", label: "Privacidad" },
    ],
  },
] as const;
