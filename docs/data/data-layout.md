# Organización de `data/`

| Ruta | Tipo | En git | Quién lo escribe |
|---|---|---|---|
| `snapshots/<fuente>/` | Originales descargados (KML, PDF, texto extraído) | No | Conectores |
| `staging/<fuente>.json` | Última importación normalizada correcta | Sí | Conectores |
| `registry.json` | Identificadores (`ei-00001`) y slugs estables por código de origen | Sí | Pipeline (solo añade) |
| `overrides/<id>.json` | Correcciones manuales por campo, con su fuente | Sí | Edición manual |
| `review/decisions.json` | Decisiones: Wikidata, duplicados, imágenes, retiradas, discrepancias explicadas | Sí | Edición manual |
| `review/pending-catalog.json` | Catálogo candidato a la espera de aprobación | Sí, mientras exista | Pipeline |
| `editorial/collections.json`, `routes.json` | Contenido editorial escrito a mano | Sí | Editor |
| `catalog/catalog.json` | Catálogo publicado (lo que lee la web) | Sí | Pipeline (atómico) |
| `manifests/catalog.json` | Hash, recuentos y estado de cada fuente de la última publicación | Sí | Pipeline |
| `reports/latest.{json,md}` | Informe de la última ejecución | Sí | Pipeline |
| `reports/history/` | Informes anteriores | No | Pipeline |
| `rail/rail.json` | Conjunto ferroviario: estaciones cerradas (Wikidata) y líneas, con la Vía Verde más próxima (ODbL) | Sí | `data:rail` |
| `snapshots/rail/` | Respuestas de Wikidata y Overpass del último `data:rail` | No | `data:rail` |
| `schemas/catalog.schema.json` | JSON Schema del catálogo | Sí | `data:validate` |

Fuentes de verdad: `staging/` (datos importados), `registry.json`, `overrides/`, `review/decisions.json` y `editorial/`. Todo lo demás se puede regenerar.

`public/data/rail-tracks.geojson` contiene los trazados simplificados (~15 m) que carga el mapa ferroviario (ODbL, versionado; lo genera `data:rail`).

`public/media/` contiene las miniaturas descargadas de Commons (no versionadas; `npm run data:media`).

## Identificadores

- `id`: `ei-` + número secuencial asignado una sola vez por código de origen (`ministerio-cultura:AN-01`). Nunca se reutiliza.
- `slug`: se genera del nombre al crear el registro y no cambia con renombrados posteriores. Si se cambiase, el anterior quedaría en `previousSlugs` y redirige con 308.
