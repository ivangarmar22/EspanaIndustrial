# España Industrial

_El mapa vivo de la industrialización de España._

Atlas digital del patrimonio industrial español: fábricas, minas, centrales, estaciones, presas y colonias obreras, localizadas en un mapa interactivo y documentadas dato a dato con fuentes públicas trazables.

> Proyecto independiente. No está afiliado al Ministerio de Cultura ni a ninguna administración. Origen de los datos principales: Ministerio de Cultura (IPCE, Plan Nacional de Patrimonio Industrial), reutilizados conforme a su licencia general.

## Estado actual

| Área       | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catálogo   | 178 registros que corresponden a los 177 bienes del listado del Plan Nacional de Patrimonio Industrial (182 puntos): el mapa del IPCE usa el código CAT-07 para dos bienes distintos y se han separado. 173 fichas documentales extraídas, municipio/INE de CartoCiudad·IGN en todos, 156 enlazados con Wikidata y 107 con fotografía de Wikimedia Commons con licencia libre. Erratas, duplicados y discrepancias revisados y verificados (ver [docs/data/review-2026-10.md](docs/data/review-2026-10.md)). |
| Web        | Inicio, mapa interactivo, catálogo con filtros, fichas, territorios, categorías, colecciones, rutas propuestas, cronología, fuentes y metodología, sección de ferrocarril (estaciones cerradas, trazados abandonados y Vías Verdes, con páginas por línea), favoritos locales y página «Colabora» (proyecto, donaciones y formulario de propuestas que llega por correo).                                                                                                                                    |
| Despliegue | Solo local por decisión del propietario. El flujo de actualización automática está preparado pero sin programar.                                                                                                                                                                                                                                                                                                                                                                                             |

Las cifras reales y actualizadas están en la página `/fuentes` de la propia web, calculadas a partir del catálogo publicado.

## Requisitos

- Node.js ≥ 22.12 (probado con 24.21). Ver `.nvmrc`.
- npm ≥ 10.
- Conexión a internet para descargar datos, tipografías (en el build) y teselas del mapa.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local          # y rellénalo (ver abajo)
npm run data:media                  # descarga las fotografías con licencia (≈ 70 MB, no se versionan)
npm run data:update -- --no-fetch   # enlaza las fotos descargadas en el catálogo
npm run dev                         # http://127.0.0.1:3000
```

El catálogo publicado (`data/catalog/catalog.json`) y los datos intermedios (`data/staging/`) están versionados, así que la web funciona sin volver a descargar las fuentes. Para actualizarlas: `npm run data:update`.

### Variables de entorno (`.env.local`)

| Variable                                                                             | Uso                                                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                               | URL base para enlaces canónicos, sitemap y Open Graph.                                                   |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS`                                | Cuenta SMTP que envía las propuestas del formulario. Sin ella el formulario no se muestra.               |
| `CONTACT_TO` · `CONTACT_FROM`                                                        | Correo que recibe las propuestas y remitente opcional.                                                   |
| `NEXT_PUBLIC_DONATE_PAYPAL` · `NEXT_PUBLIC_DONATE_KOFI` · `NEXT_PUBLIC_DONATE_BIZUM` | Canales de donación de «Colabora»; solo se muestran los configurados.                                    |
| `DATA_CONTACT`                                                                       | Contacto incluido en el User-Agent de las peticiones del pipeline (por defecto, la URL del repositorio). |

Los secretos nunca se versionan (`.env*` está en `.gitignore`).

## Comandos

| Comando                                 | Qué hace                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Desarrollo, build de producción y servidor de producción (escuchan en 127.0.0.1).                                                                                                                         |
| `npm run check`                         | Type checking, lint, pruebas y validación de datos.                                                                                                                                                       |
| `npm run typecheck` · `lint` · `format` | Calidad de código.                                                                                                                                                                                        |
| `npm test`                              | Pruebas unitarias y de integración (Vitest).                                                                                                                                                              |
| `npm run test:e2e`                      | Pruebas end-to-end y de accesibilidad (Playwright + axe). Construye y arranca la app en el puerto 3100.                                                                                                   |
| `npm run data:update`                   | Pipeline completo: descarga → staging → construcción → validación → diff → informe → publicación atómica. Opciones: `--approve`, `--no-fetch`, `--fetch-only`, `--offline`, `--refresh`, `--source <id>`. |
| `npm run data:fetch`                    | Solo descarga y actualiza el staging.                                                                                                                                                                     |
| `npm run data:import -- <id>`           | Descarga una sola fuente y reconstruye (`ministerio-cultura`, `cartociudad`, `wikidata`, `wikimedia-commons`).                                                                                            |
| `npm run data:validate`                 | Comprueba la integridad del catálogo y de la capa editorial y exporta el JSON Schema.                                                                                                                     |
| `npm run data:diff`                     | Muestra la actualización pendiente de aprobación frente a lo publicado.                                                                                                                                   |
| `npm run data:duplicates`               | Lista los posibles duplicados sin decidir.                                                                                                                                                                |
| `npm run data:media`                    | Descarga las miniaturas de Commons (nunca se enlazan en caliente).                                                                                                                                        |
| `npm run data:rail`                     | Conjunto ferroviario: estaciones cerradas (Wikidata) y trazados y Vías Verdes (OpenStreetMap). `--keep-osm` reutiliza la última descarga de Overpass; `--offline` no usa la red.                          |
| `npm run data:links`                    | Comprueba los enlaces externos con peticiones espaciadas.                                                                                                                                                 |

## Cómo funcionan los datos

```
Fuente → extracción → original (snapshots/) → normalización → staging/ → construcción
       → validación (Zod) → deduplicación → diff con lo publicado → informe (reports/)
       → publicación atómica (catalog/) ─ o ─ revisión pendiente (review/) si hay cambios importantes
```

- Si una fuente no responde, se conserva su último staging correcto; el catálogo nunca se vacía.
- Un elemento que desaparece de la fuente no se borra: se conserva y se marca hasta que se decida retirarlo (`data/review/decisions.json`).
- Altas, bajas, cambios de nombre, categoría, protección, ubicación (> 100 m) o licencias quedan pendientes de aprobación (`npm run data:diff` y después `--approve`).
- Las correcciones editoriales viven en `data/overrides/`, con su fuente, y la sincronización nunca las sobrescribe.
- Las propuestas del público llegan por correo y se incorporan a mano editando esos ficheros: la web no tiene panel de administración ni guarda nada.

Más detalle en [docs/architecture/overview.md](docs/architecture/overview.md), [docs/data/data-layout.md](docs/data/data-layout.md) y [docs/data/quality-policy.md](docs/data/quality-policy.md).

## Estructura

```
src/app/           Rutas (App Router): (site) web editorial, (map) mapa a pantalla completa
src/components/    Componentes de presentación compartidos
src/features/      Funcionalidades: map, record, catalog, routes, home, favorites, contributions
src/domain/        Esquemas Zod, tipos, vocabularios, territorios, fechas, filtros (sin E/S)
src/data-access/   Lectura del catálogo y del contenido editorial (punto de migración a PostgreSQL)
src/pipeline/      Conectores, construcción, diff, duplicados, publicación
src/server/        Envío de propuestas por correo y limitador de frecuencia (solo servidor)
scripts/           CLI de datos y mantenimiento
data/              Catálogo publicado, staging, capa editorial, informes (ver docs/data)
docs/              Investigación de fuentes, arquitectura, datos y despliegue
tests/             unit, integration, e2e y fixtures con procedencia documentada
```

## Documentación

- Investigación: [catálogo de fuentes](docs/research/source-catalog.md), [derechos de reutilización](docs/research/data-rights.md), [plan de adquisición](docs/research/data-acquisition-plan.md).
- [Arquitectura](docs/architecture/overview.md) · [Datos](docs/data/data-layout.md) · [Calidad](docs/data/quality-policy.md) · [Fuente del Ministerio](docs/data/sources/ministerio-cultura.md) · [Despliegue y actualizaciones](docs/deployment/local.md).

## Limitaciones conocidas

- El catálogo cubre el listado del Plan Nacional (177 bienes), no todo el patrimonio industrial de España. Los inventarios autonómicos están investigados pero no integrados.
- La extracción de las fichas PDF es automática y heurística: los textos se marcan «pendientes de revisión» y algunos campos se descartan cuando la maquetación los corta.
- Ningún registro está marcado todavía como «verificado» editorialmente en su conjunto; las correcciones puntuales (39 registros) están documentadas con su fuente.
- Las fotografías de las fichas del IPCE no se reutilizan (créditos de terceros); solo se muestran fotos de Commons con licencia libre.
- Las rutas son propuestas del proyecto: las distancias son en línea recta y no se calculan duraciones.
- Las métricas de Core Web Vitals no se han medido en condiciones de campo.

## Licencias

- Código: [MIT](LICENSE).
- Datos del catálogo y textos propios: [CC BY 4.0](LICENSE-DATA.md), conservando las condiciones de cada fuente (citar «Origen de los datos: Ministerio de Cultura», CartoCiudad © IGN, Wikidata CC0).
- Imágenes: licencia individual indicada en cada una; no se relicencian.
- Cartografía: OpenFreeMap © OpenMapTiles, datos © colaboradores de OpenStreetMap (ODbL); capas del IGN (CC BY 4.0).
- Tipografías: Newsreader, Archivo e IBM Plex Mono (SIL Open Font License).
