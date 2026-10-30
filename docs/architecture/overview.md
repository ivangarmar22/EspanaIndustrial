# Arquitectura

## Capas

| Capa             | Ubicación                                                                                | Responsabilidad                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuentes externas | —                                                                                        | IPCE (KML + PDF), CartoCiudad/IGN, Wikidata, Commons. Nunca se consultan durante una visita.                                                       |
| Conectores       | `src/pipeline/sources/*`                                                                 | Descarga cortés (User-Agent identificable, límite por host, reintentos, validación de respuesta), snapshot del original y normalización a staging. |
| Staging          | `data/staging/*.json`                                                                    | Última importación correcta de cada fuente. Si una fuente falla, el staging anterior sigue vigente.                                                |
| Capa editorial   | `data/registry.json`, `data/overrides/`, `data/review/decisions.json`, `data/editorial/` | Identificadores estables, correcciones manuales, decisiones de revisión, colecciones y rutas. Fuente de verdad del trabajo humano.                 |
| Construcción     | `src/pipeline/build.ts`                                                                  | Función pura: staging + capa editorial → registros con procedencia por campo, discrepancias y nivel de validación.                                 |
| Publicación      | `src/pipeline/update.ts`                                                                 | Validación Zod, diff, informe, bloqueo, escritura atómica o revisión pendiente.                                                                    |
| Acceso a datos   | `src/data-access/`                                                                       | Única puerta de la web a los datos. Recarga el catálogo cuando cambia el fichero.                                                                  |
| Dominio          | `src/domain/`                                                                            | Esquemas, tipos, vocabularios, territorios, fechas y filtros. Sin E/S; compartido por servidor y cliente.                                          |
| Web              | `src/app`, `src/features`, `src/components`                                              | Componentes de servidor por defecto; cliente solo para mapa, filtros, acciones y formularios.                                                      |
| Servidor         | `src/server/`                                                                            | Autenticación, contribuciones y escrituras editoriales.                                                                                            |

## Decisiones técnicas

| Decisión                              | Motivo                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16.4 (App Router), React 19.3 | Versiones estables actuales. Páginas de fichas, territorios, categorías, colecciones y rutas prerenderizadas (SSG); el catálogo filtrado y el panel se renderizan bajo demanda.                    |
| TypeScript 6.0.3 (no 7.0)             | TS 7 es la versión estable más reciente, pero `typescript-eslint` (incluido en `eslint-config-next`) solo admite `<6.1.0`.                                                                         |
| ESLint 9.39 (no 10)                   | Los plugins de `eslint-config-next` (`react`, `import`, `jsx-a11y`) declaran compatibilidad hasta ESLint 9.                                                                                        |
| Tailwind CSS 4.3                      | Tokens de diseño en `@theme` (`src/app/globals.css`).                                                                                                                                              |
| Zod 4.6                               | Validación en tiempo de ejecución de catálogo, capa editorial, formularios y acciones; exporta JSON Schema.                                                                                        |
| MapLibre GL 6.15                      | Motor cartográfico BSD. Su worker se sirve desde `public/vendor` (copiado antes de `dev`/`build`) porque MapLibre 6 lo resuelve respecto a su propio módulo, algo que no sobrevive al empaquetado. |
| OpenFreeMap + IGN                     | Teselas vectoriales sin clave y capas oficiales CC BY 4.0. Estilo cartográfico propio (`basemap-style.ts`).                                                                                        |
| Búsqueda propia (sin MiniSearch)      | Con cientos de registros basta una búsqueda por tokens normalizados; la misma función filtra en servidor (catálogo) y cliente (mapa).                                                              |
| JSON versionado, sin base de datos    | Decisión del propietario. Suficiente para miles de registros.                                                                                                                                      |
| Sin scripts de instalación aprobados  | npm 11 bloquea `postinstall` no aprobados; esbuild y unrs-resolver funcionan con sus binarios opcionales.                                                                                          |

## Migración futura a PostgreSQL/PostGIS

1. Implementar `src/data-access/catalog.ts` contra la base de datos manteniendo sus firmas.
2. Cargar `catalog.json` con el JSON Schema exportado (`data/schemas/catalog.schema.json`); `location.point` pasa a `geography(Point)`.
3. Mover `overrides` y `decisions` a tablas con historial.
4. `buildCatalog` no cambia: sigue siendo una función pura.

## Seguridad

- **Sin administración web**: no hay login, cookies de sesión ni escrituras desde la web. La capa editorial se edita en los ficheros de `data/` y se versiona en git.
- **Web estática**: se publica como exportación estática de Next.js en GitHub Pages; no hay servidor propio, Server Actions ni base de datos que atacar.
- **Propuestas**: el formulario valida con Zod en el navegador (campo trampa y tiempo mínimo de rellenado) y envía a [Web3Forms](https://web3forms.com/), que reenvía el correo al responsable. La clave de acceso es pública por diseño: solo permite enviar a ese buzón. Las fotos se aportan como enlaces, no como archivos.
- **Privacidad**: sin analítica ni cookies de terceros. Favoritos solo en `localStorage`.
