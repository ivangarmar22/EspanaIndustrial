# Catálogo de fuentes

Investigación realizada el **25 de octubre de 2026**. Cada fila indica qué se ha
verificado realmente (petición HTTP ejecutada y respuesta inspeccionada) y qué
queda pendiente. «Pendiente» significa que no se ha podido comprobar, no que la
fuente carezca de valor.

Leyenda del estado de investigación:

- **Verificado**: endpoint consultado, formato y contenido inspeccionados.
- **Parcial**: existe y responde, pero falta evaluar licencia, cobertura o calidad.
- **Pendiente**: solo se conoce la página de entrada o no se ha podido consultar.
- **Descartado**: evaluado y no pertinente para el atlas.

## 1. Ministerio de Cultura — Plan Nacional de Patrimonio Industrial (IPCE)

| Aspecto                    | Resultado                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página oficial             | <https://www.cultura.gob.es/planes-nacionales/planes-nacionales/patrimonio-industrial/actuaciones/mapa-interactivo.html>                                                                                                                                                                                                                                                                                               |
| Listado                    | 177 bienes, enumerados en HTML por comunidad autónoma (p. ej. «ANDALUCÍA (17)», «ARAGÓN (19)»).                                                                                                                                                                                                                                                                                                                        |
| Mapa interactivo           | **No es una aplicación propia ni existe API JSON.** Es un Google My Maps: `mid=1Rd3x2Zf0u2c7lUR7FFsT2jNe7LevHJRm`.                                                                                                                                                                                                                                                                                                     |
| Exportación estructurada   | `https://www.google.com/maps/d/kml?mid=1Rd3x2Zf0u2c7lUR7FFsT2jNe7LevHJRm&forcekml=1` → **200, KML 2.2, ~720 KB**.                                                                                                                                                                                                                                                                                                      |
| Contenido del KML          | 9 carpetas: 8 agrupaciones territoriales (182 marcadores tipo `Point`) + `LEYENDA` (34 puntos que no son bienes: códigos de comunidad y 14 «usos»).                                                                                                                                                                                                                                                                    |
| Por marcador               | Código (`An-01`, `Ar-07`…), tipología abreviada, nombre, dirección, cronología resumida, texto descriptivo, coordenadas WGS84, estilo de icono (codifica el «uso»), imágenes alojadas en `mymaps.usercontent.google.com` y enlace a la **ficha PDF en Google Drive** (178 de 182).                                                                                                                                     |
| Irregularidades detectadas | Códigos con formatos distintos (`CyL_23`, `PV_07`, envueltos en CDATA); 5 códigos repetidos (`Mad-06`, `CyL-18`, `CAT-05`, `CAT-07`, `PV-10`) que corresponden a bienes con varios puntos. 173 códigos únicos + 4 irregulares = 177.                                                                                                                                                                                   |
| Fichas PDF                 | Descarga directa `https://drive.google.com/uc?export=download&id=<id>` → 200, PDF 1.5, ~0,5 MB, 3 páginas. **Texto extraíble** (no escaneado).                                                                                                                                                                                                                                                                         |
| Campos útiles del PDF      | Nombre oficial, otros nombres, dirección postal, coordenadas UTM y WGS84, referencia catastral, propiedad, cronología, elementos constitutivos, protección (tipo, fecha de declaración, publicación, enlace al BOE), autoría, descripción tipológica, descripción histórica, actuaciones, estado de conservación, créditos fotográficos.                                                                               |
| Trampas del PDF            | (1) Valores de plantilla sin rellenar: «SUPERFICIE: 123.456.789 m2» **no es un dato**. (2) Las casillas (sector, titularidad, clasificación, categoría) se extraen como lista de todas las opciones: el texto no indica cuál está marcada → no se importan. (3) Coordenadas del PDF y del KML difieren decenas de metros → se conservan ambas con procedencia. (4) Fotografías con créditos de terceros (p. ej. IAPH). |
| Detección de cambios       | No hay fecha de actualización publicada. Se detectan cambios por hash del KML y del texto de cada PDF.                                                                                                                                                                                                                                                                                                                 |
| Licencia                   | Aviso legal del Ministerio: licencia general de reutilización (RD 1495/2011) con atribución. Ver [data-rights.md](data-rights.md).                                                                                                                                                                                                                                                                                     |
| Integración                | Conector `ministerio-cultura` (KML + PDF). **Fuente primaria del catálogo inicial.**                                                                                                                                                                                                                                                                                                                                   |
| Estado                     | **Verificado**                                                                                                                                                                                                                                                                                                                                                                                                         |

Páginas relacionadas (enlazadas, no integradas como datos): definición, categorías,
«100 elementos del Patrimonio Industrial», catálogo de presas anteriores a 1926,
catálogo de faros, estudio de la Vega de Granada. Son candidatas a fase 2.

## 2. Cartografía y servicios del IGN / CNIG

Todos los `GetCapabilities` consultados declaran `AccessConstraints: CC BY 4.0 scne.es` y `Fees: no conditions apply`.

| Servicio                               | Endpoint                                                                    | Uso                                                         | Estado     |
| -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| IGN Base (WMTS)                        | `https://www.ign.es/wmts/ign-base`                                          | Capa base oficial opcional                                  | Verificado |
| PNOA máxima actualidad (WMTS)          | `https://www.ign.es/wmts/pnoa-ma`                                           | Ortofoto actual                                             | Verificado |
| Mapa raster MTN (WMTS)                 | `https://www.ign.es/wmts/mapa-raster`                                       | Cartografía topográfica                                     | Verificado |
| PNOA histórico (WMS)                   | `https://www.ign.es/wms/pnoa-historico`                                     | Comparador histórico                                        | Verificado |
| Unidades administrativas (WMS INSPIRE) | `https://www.ign.es/wms-inspire/unidades-administrativas`                   | Límites (capa visual)                                       | Verificado |
| CartoCiudad geocodificador inverso     | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lon=&lat=` | Municipio, código INE, provincia, comunidad, ref. catastral | Verificado |

Capas del WMS de PNOA histórico (37). Las más relevantes para el atlas, con su
**intervalo real** (no un año exacto):

- `AMS_1956-1957`: Vuelo Americano, Serie B (1956–1957).
- `Interministerial_1973-1986`: Vuelo Interministerial (1973–1986).
- `Nacional_1981-1986`: Vuelo Nacional (1981–1986).
- `OLISTAT` (1997–1998) y `SIGPAC` (1997–2003).
- `PNOA2004` … `PNOA2024`: coberturas anuales (la cobertura de cada año es parcial por bloques).

Prueba de CartoCiudad sobre la Real Fábrica de Artillería (Sevilla): devolvió
municipio Sevilla (INE 41091), provincia 41, Andalucía y referencia catastral
`6118001TG3461N`, **idéntica a la de la ficha PDF del IPCE**.

Pendiente: Nomenclátor Geográfico (NGBE) y modelos de elevación. No son necesarios en la v1.

## 3. Cartografía base vectorial

| Fuente                           | Resultado                                                                                                                                         | Estado                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| OpenFreeMap                      | `https://tiles.openfreemap.org/styles/liberty` y `/positron` → 200 JSON. Sin clave. Datos OSM (ODbL) + esquema OpenMapTiles; requiere atribución. | Verificado (respuesta); términos según su web |
| Servidores de teselas de la OSMF | No se usan: su política prohíbe el uso intensivo en producción.                                                                                   | Descartado                                    |

## 4. Wikidata y Wikimedia Commons

| Aspecto                                    | Resultado                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                                     | WDQS `https://query.wikidata.org/sparql` y API `wbgetentities` / `wbgetclaims`.                                                                                                                                                                                                             |
| Rendimiento                                | Una consulta con `P31/P279*` sobre 15 clases y `P17=Q29` **agotó el tiempo** (_upstream request timeout_). El conector usa consultas acotadas por clase y paginadas.                                                                                                                        |
| Recuento P31 directo con país España (Q29) | estación de ferrocarril (Q55488) 3158 · molino hidráulico (Q185187) 2028 · mina (Q820477) 688 · fábrica (Q83405) 598 · central hidroeléctrica (Q15911738) 177 · represa (Q12323) 167 · central eléctrica (Q159719) 71. Son recuentos de elementos tipados, **no de patrimonio verificado**. |
| Q-ids incorrectos detectados               | En la primera consulta se incluyeron por error Q16970 (iglesia), Q131596 (granja), Q1076486 (instalación deportiva) y Q4895508 (campo de batalla). La lista de clases del conector es **curada y verificada**.                                                                              |
| Propiedades útiles                         | P808 (código BIC, 13 801 elementos), P3318 (Guía Digital del IAPH), P1600 (IPAC Cataluña), P1586 (BCIN), P2473 (IGPCV), P1435 (estatus patrimonial), P625, P571, P18, P131.                                                                                                                 |
| Ejemplo verificado                         | Real Fábrica de Artillería = Q12201032: P808 `RI-51-0008189`, P3318 `i19287`, P1435 BIC, P571 **1796** (precisión: año). El IPCE da «1720-1916» y la ficha narra una fundación en 1565 → **discrepancia documentada**.                                                                      |
| Commons                                    | `imageinfo` + `extmetadata` devuelve licencia, URL de licencia, autor, crédito, `AttributionRequired`, fecha original y miniatura del tamaño pedido. Ejemplo: «Fábrica de artillería 2024An773.jpg», CC BY-SA 4.0, autor «Anual», 2024-12-14.                                               |
| Licencia                                   | Datos de Wikidata: CC0. Imágenes de Commons: licencia **individual** por archivo.                                                                                                                                                                                                           |
| Integración                                | Conector `wikidata` (enriquecimiento por coincidencia) y `wikimedia-commons` (metadatos de imagen).                                                                                                                                                                                         |
| Estado                                     | **Verificado**                                                                                                                                                                                                                                                                              |

## 5. OpenStreetMap

| Aspecto              | Resultado                                                                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Licencia             | ODbL 1.0. Atribución obligatoria; una base de datos derivada que se distribuya públicamente debe ofrecerse bajo ODbL.                                                                                                                                                                                                                  |
| Overpass API pública | Uso razonable limitado; no apta para extracciones masivas recurrentes.                                                                                                                                                                                                                                                                 |
| Extractos            | Geofabrik publica extractos diarios de España (PBF). Vía adecuada para volumen.                                                                                                                                                                                                                                                        |
| Etiquetas candidatas | `historic=mine`, `historic=mine_shaft`, `historic=industrial`, `historic=mill`, `man_made=works`, `man_made=chimney`, `man_made=mineshaft`, `man_made=watermill`, `man_made=windmill`, `railway=station` con `historic=*`, `power=plant`, `landuse=industrial` (solo contexto).                                                        |
| Decisión v1          | **No se importa OSM como fuente de registros** en la v1: la mezcla con ODbL afectaría a la licencia de la base de datos publicada y no aporta documentación histórica. Se usa solo como cartografía base, a través de OpenFreeMap. Fase posterior: descubrimiento de candidatos para revisión manual, sin publicarlos automáticamente. |
| Estado               | Parcial (no se ha descargado ningún extracto)                                                                                                                                                                                                                                                                                          |

## 6. datos.gob.es y portales autonómicos

Búsqueda en la API `https://datos.gob.es/apidata/catalog/dataset/title/{texto}`.
La respuesta de la API **no incluye el campo de licencia**: cada licencia debe
verificarse en el portal de origen antes de integrar la fuente.

| Territorio                                                                                                                                            | Organismo                | Recurso                                                            | Formato                    | Coordenadas   | Actualización | Licencia  | Integración recomendada                                                                   | Estado                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------ | -------------------------- | ------------- | ------------- | --------- | ----------------------------------------------------------------------------------------- | ------------------------ |
| Andalucía                                                                                                                                             | IAPH                     | Localizador Cartográfico del Patrimonio Cultural Andaluz           | CSV (4717 filas)           | Sí (lon/lat)  | 2024-04-15    | Pendiente | Contraste de coordenadas vía P3318; **sin tipología, no importar como industrial**        | Parcial                  |
| Castilla-La Mancha                                                                                                                                    | JCCM                     | Catálogo del patrimonio cultural + bienes protegidos BIC/BIP/EIP   | CSV, XLSX, JSON, ODS       | Pendiente     | 2026-04-16    | Pendiente | Filtrar por tipología industrial tras inspección                                          | Parcial                  |
| Comunitat Valenciana                                                                                                                                  | GVA                      | Bienes inmuebles del IGPCV (BIC y BRL)                             | CSV                        | Pendiente     | 2026-10-09    | Pendiente | Enlace con P2473; filtrar por tipología                                                   | Parcial                  |
| Comunidad de Madrid                                                                                                                                   | CAM                      | Patrimonio cultural protegido (BIC y BIP inmuebles)                | CSV, JSON                  | Pendiente     | 2026-05-06    | Pendiente | Filtrar por tipología                                                                     | Parcial                  |
| País Vasco                                                                                                                                            | Gobierno Vasco           | Kultura ondarea (recursos turísticos) + WMS de patrimonio cultural | GeoJSON, XML, XLSX, WMS    | Sí            | 2026-10-15    | Pendiente | El dataset turístico no es un inventario; evaluar el WMS de patrimonio                    | Parcial                  |
| Gipuzkoa                                                                                                                                              | Diputación               | Patrimonio de la Diputación                                        | XLSX                       | No verificado | 2026-03-05    | Pendiente | Es inventario de bienes y derechos de la Diputación, **no de patrimonio cultural**        | Descartado (provisional) |
| Cantabria                                                                                                                                             | ICANE                    | Patrimonio cultural (series estadísticas)                          | JSON, XLS                  | No            | 2026-10-24    | Pendiente | Estadística, no inventario                                                                | Descartado               |
| Cantabria                                                                                                                                             | Universidad de Cantabria | «Patrimonio Industrial, científico y técnico»                      | CSV (612 filas), JSON, XML | No            | 2025-10-31    | Pendiente | **Bienes muebles** de la colección universitaria (ancla, reloj, vagoneta): no son lugares | Descartado               |
| València (municipio)                                                                                                                                  | Ayuntamiento             | Ruta del Patrimonio Industrial del Grao                            | GeoJSON (ArcGIS REST)      | Sí            | 2026-02-25    | Pendiente | Candidata a ruta oficial municipal                                                        | Parcial                  |
| Barcelona (provincia)                                                                                                                                 | Diputació                | Mapes de Patrimoni Cultural                                        | HTML                       | Pendiente     | —             | Pendiente | Solo web; evaluar                                                                         | Pendiente                |
| Cataluña                                                                                                                                              | Generalitat              | Inventari del Patrimoni Arquitectònic (IPAC)                       | —                          | —             | —             | —         | La API de catálogo de Socrata no devolvió resultados utilizables; enlazar mediante P1600  | Pendiente                |
| Castilla y León                                                                                                                                       | JCyL                     | Portal de datos abiertos                                           | —                          | —             | —             | —         | La API de catálogo no devolvió resultados utilizables                                     | Pendiente                |
| Asturias, Aragón (SIPCA), Galicia, Navarra, Murcia, La Rioja, Extremadura, Illes Balears, Canarias, Cantabria (inventario autonómico), Ceuta, Melilla | —                        | —                                                                  | —                          | —             | —             | —         | No investigado aún                                                                        | Pendiente                |

## 7. Otras fuentes

| Fuente                                                    | Resultado                                                                              | Estado                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| IGME (inventarios mineros, patrimonio geológico y minero) | No investigado en esta fase                                                            | Pendiente              |
| Fundación de los Ferrocarriles Españoles / Vías Verdes    | No investigado en esta fase                                                            | Pendiente              |
| IPCE — Fototeca y planoteca (en datos.gob.es)             | Existen como catálogos web (XHTML); reutilización de imágenes por evaluar caso a caso  | Pendiente              |
| BOE (declaraciones BIC)                                   | Las fichas del IPCE enlazan las disposiciones; el BOE es fuente primaria de protección | Enlace, sin extracción |
| TICCIH-España, INCUNA, asociaciones                       | Fuentes documentales; uso solo como referencia bibliográfica salvo licencia expresa    | Pendiente              |

## 8. Resumen de decisiones

1. **Catálogo inicial**: los 177 bienes del Plan Nacional (KML + fichas PDF).
2. **Enriquecimiento territorial**: CartoCiudad (código INE, provincia, comunidad).
3. **Enriquecimiento de identificadores, fechas e imágenes**: Wikidata + Commons, siempre como fuente secundaria y con procedencia por campo.
4. **Cartografía**: OpenFreeMap (base vectorial) + IGN/PNOA (capas oficiales e históricas).
5. **OSM**: solo cartografía en la v1.
6. **Inventarios autonómicos**: fase 2, uno a uno, tras verificar licencia y tipologías.
