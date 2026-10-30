# Plan de adquisición de datos

## Principios

- **Pocos registros fiables antes que muchos dudosos.** La cobertura crece fuente a fuente.
- Cada fuente nueva pasa por: evaluación de licencia → muestra inspeccionada → mapeo de campos y tipologías → conector con pruebas → informe de cambios revisado → publicación.
- Ninguna fuente colaborativa (Wikidata, OSM) crea registros publicados por sí sola: solo enriquece registros existentes o genera candidatos para revisión.

## Fase 1 — Catálogo inicial (v1)

| Orden | Fuente                                                 | Conector                             | Rol                                                        | Frecuencia                      | Revisión                                                                                       |
| ----- | ------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1     | Plan Nacional de Patrimonio Industrial: KML de My Maps | `ministerio-cultura`                 | Crea los registros base (177 bienes)                       | Mensual                         | Altas, bajas y cambios de coordenadas requieren revisión                                       |
| 2     | Fichas PDF del IPCE (Google Drive)                     | `ministerio-cultura` (submódulo PDF) | Campos documentales por ficha                              | Mensual, solo si cambia el hash | Extracción automática marcada `needs-review`                                                   |
| 3     | CartoCiudad (geocodificador inverso)                   | `cartociudad`                        | Municipio, código INE, provincia, comunidad                | Al crear o mover un registro    | Automática (fuente oficial)                                                                    |
| 4     | Wikidata                                               | `wikidata`                           | Q-id, códigos BIC/IAPH/IPAC, fechas, imagen P18, artículos | Semanal                         | La coincidencia de Q-id se acepta solo con criterios fuertes (§ abajo); el resto va a revisión |
| 5     | Wikimedia Commons                                      | `wikimedia-commons`                  | Metadatos y licencia de las imágenes P18                   | Semanal                         | Licencias fuera de la lista admitida → revisión                                                |

### Criterios para asociar un Q-id de Wikidata a un bien

Aceptación automática solo si se cumplen **todas**:

1. Distancia ≤ 500 m entre las coordenadas del IPCE y P625.
2. Similitud de nombre normalizado ≥ 0,6 (trigramas, sin tildes ni artículos), o coincidencia de la referencia catastral o del código BIC con la ficha.
3. El municipio (P131, resuelto a código INE cuando exista P772) coincide, o no hay datos contradictorios.

Si solo se cumplen 1 y 3, o la distancia está entre 500 m y 2 km, se genera un **candidato** en el informe de revisión.

## Fase 2 — Inventarios autonómicos estructurados

Orden propuesto por disponibilidad verificada de datos descargables:

1. Comunitat Valenciana: IGPCV (CSV, BIC y BRL) + P2473.
2. Castilla-La Mancha: catálogo de patrimonio cultural (CSV/JSON).
3. Comunidad de Madrid: patrimonio protegido (CSV/JSON).
4. País Vasco: WMS y datasets de patrimonio cultural.
5. Andalucía: Guía Digital del IAPH (vía P3318) y localizador cartográfico.

Para cada uno: verificar licencia en el portal de origen, filtrar tipologías
industriales con una tabla de correspondencias revisada a mano y deduplicar contra
el catálogo existente.

## Fase 3 — Descubrimiento asistido

- Wikidata: elementos de clases industriales verificadas en España con P1435 (estatus patrimonial), como **candidatos**, no como registros publicados.
- OSM (extracto Geofabrik, nunca Overpass masivo): elementos `historic=*` industriales como pistas para revisión, sin copiar sus datos al catálogo (ver ODbL en `data-rights.md`).
- Catálogo de presas anteriores a 1926 y otras publicaciones del Plan Nacional.

## Limitaciones conocidas

- El KML depende de Google My Maps: si el Ministerio cambia o retira el mapa, el conector fallará. En ese caso se conserva el último catálogo publicado y el fallo queda en el informe.
- La extracción de PDF es heurística. Los campos con casillas no son recuperables desde el texto.
- La API de datos.gob.es no expone la licencia: hay que verificarla en cada portal.
- Wikidata limita las consultas pesadas: el conector usa lotes por Q-id (`wbgetentities`, máx. 50 por petición) en lugar de SPARQL amplio.
