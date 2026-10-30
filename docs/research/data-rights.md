# Derechos de reutilización de datos y contenidos

> Este documento recoge la interpretación técnica del proyecto, basada en los
> avisos legales consultados el 25 de octubre de 2026. **No es asesoramiento
> jurídico.** Los puntos marcados con ⚖️ requieren revisión legal antes de una
> publicación abierta.

## 1. Resumen por fuente

| Fuente                                          | Datos estructurados                           | Textos                                    | Imágenes                                             | Atribución obligatoria                                                                | Uso en el proyecto         |
| ----------------------------------------------- | --------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| Ministerio de Cultura / IPCE (KML + fichas PDF) | Reutilizables (licencia general RD 1495/2011) | Reutilizables con atribución; ⚖️ ver §2.3 | **No se reutilizan** en la v1 (créditos de terceros) | «Origen de los datos: Ministerio de Cultura» + fecha de consulta                      | Fuente primaria            |
| IGN / CNIG (WMTS, WMS)                          | —                                             | —                                         | Teselas CC BY 4.0                                    | «© Instituto Geográfico Nacional» / «PNOA cedido por © Instituto Geográfico Nacional» | Capas de mapa              |
| CartoCiudad                                     | CC BY 4.0                                     | —                                         | —                                                    | «CartoCiudad © IGN»                                                                   | Normalización territorial  |
| Wikidata                                        | CC0 1.0                                       | Descripciones CC0                         | —                                                    | No obligatoria (se cita como cortesía y trazabilidad)                                 | Enriquecimiento secundario |
| Wikimedia Commons                               | —                                             | —                                         | **Licencia individual por archivo**                  | Según licencia: autor, licencia y enlace                                              | Fotografías                |
| OpenStreetMap (vía OpenFreeMap)                 | ODbL 1.0                                      | —                                         | Teselas renderizadas                                 | «© OpenStreetMap contributors», «OpenFreeMap», «© OpenMapTiles»                       | Solo mapa base             |
| Inventarios autonómicos                         | Pendiente por fuente                          | Pendiente                                 | Pendiente                                            | Pendiente                                                                             | No integrados en la v1     |

## 2. Ministerio de Cultura

### 2.1. Licencia aplicable

El aviso legal del portal (<https://www.cultura.gob.es/comunes/aviso-legal.html>)
autoriza la reutilización de «textos, fotografías, imágenes, vídeos y demás
contenidos» cuya fuente original sea el Ministerio, conforme a los artículos 7 y 8
del Real Decreto 1495/2011. La autorización incluye copia, difusión, modificación,
adaptación, extracción, reordenación y combinación, con fines comerciales o no.

Respecto a obras de terceros publicadas en el portal, el aviso entiende que los
derechos han sido cedidos al Ministerio mediante el correspondiente contrato
(art. 308 de la Ley 9/2017), **salvo aviso específico en contrario**.

### 2.2. Condiciones que el proyecto cumple

1. **No desnaturalizar** la información: los textos se muestran literales y entrecomillados, o resumidos sin alterar su sentido, siempre con enlace a la ficha original.
2. **Citar la fuente**: «Origen de los datos: Ministerio de Cultura (IPCE, Plan Nacional de Patrimonio Industrial)».
3. **Fecha de última actualización**: el KML no la incluye; se muestra la **fecha de consulta** y se indica expresamente que no es una fecha de actualización oficial.
4. **No sugerir participación, patrocinio ni apoyo** del Ministerio: el pie y la página «Acerca de» declaran que España Industrial es un proyecto independiente. No se usan logotipos institucionales.
5. **Conservar metadatos** de condiciones de reutilización: se guardan en la procedencia de cada campo.

### 2.3. ⚖️ Zonas grises

- **Alojamiento externo.** El KML y los PDF están alojados en Google My Maps y Google Drive, enlazados desde el portal, no servidos por él. Interpretamos que son documentos del Ministerio (fichas encargadas por el IPCE) y que la licencia general les es aplicable, pero conviene confirmarlo.
- **Fotografías de las fichas.** Los créditos incluyen terceros (p. ej. «IAPH, Romera García J. 2006»). Aunque el aviso presume la cesión, una fotografía de otra institución puede tener condiciones propias. **Decisión v1: no copiar, no alojar y no enlazar en caliente estas imágenes**; la ficha enlaza al PDF original.
- **Textos extensos.** Se reutilizan la descripción histórica y la tipológica con atribución visible. Si una revisión legal lo desaconseja, el esquema permite ocultarlas cambiando la política de la fuente (`data/sources/ministerio-cultura.json`, campo `reuse.texts`).

## 3. Wikimedia Commons

- Cada imagen conserva: título del archivo, URL de la página de descripción, autor (`Artist`), crédito, licencia corta, URL de licencia, `AttributionRequired`, fecha original y descripción.
- **Licencias admitidas** automáticamente: CC0, dominio público (PD-*), CC BY 2.0/3.0/4.0 y CC BY-SA 2.0/3.0/4.0. Cualquier otra (GFDL sola, licencias no libres, _fair use_) se rechaza y queda en el informe para revisión manual.
- **CC BY-SA**: mostrar la imagen sin modificar, con autor, licencia y enlace, es compatible. Redimensionar no se considera adaptación a estos efectos. No se recortan ni se alteran colores; si en el futuro se hiciera, la imagen derivada debe publicarse bajo CC BY-SA.
- **Hotlinking**: las miniaturas elegidas se descargan una sola vez mediante `npm run data:media` y se sirven desde el propio sitio. Las imágenes no descargadas no se muestran.
- Una imagen solo se asocia a un bien si procede de su elemento de Wikidata (P18) o si se asigna en la revisión editorial (`data/review/decisions.json`). **Nunca se usa una fotografía genérica como si fuera de un bien concreto.**

## 4. OpenStreetMap y ODbL

- El mapa base usa teselas de OpenFreeMap generadas con datos OSM: se muestra la atribución en el control del mapa.
- **No se extraen registros de OSM al catálogo en la v1.** Si se hiciera, los datos derivados de OSM formarían una base de datos derivada sujeta a ODbL (_share-alike_ de la base de datos). Para evitar contaminar la licencia del catálogo, cualquier uso futuro de OSM irá en una capa separada con su propia licencia, o solo como pista para revisión manual sin copiar sus datos.

## 5. Licencia del catálogo publicado por España Industrial

Decisión del propietario (25/10/2026): el catálogo y los textos propios se publican bajo **CC BY 4.0** ([LICENSE-DATA.md](../../LICENSE-DATA.md)); el código, bajo MIT. La licencia cubre la compilación y elaboración del proyecto; los datos de origen mantienen sus condiciones (atribución al Ministerio de Cultura y prohibición de sugerir patrocinio, CC BY 4.0 del IGN, CC0 de Wikidata) y las imágenes conservan su licencia individual. Es compatible con todas las fuentes integradas porque ninguna impone _share-alike_ sobre la base de datos (los datos ODbL de OpenStreetMap no se incorporan al catálogo).

El conjunto ferroviario de `/ferrocarril` sí incorpora datos de OpenStreetMap (trazados `railway=abandoned|disused` y caminos con nombre de Vía Verde, descargados con la Overpass API). Por eso se mantiene como **base de datos separada bajo ODbL 1.0**, con la atribución «© colaboradores de OpenStreetMap» en el mapa y en la página, y no se mezcla con el catálogo CC BY 4.0. Las estaciones proceden de Wikidata (CC0). No se copian textos ni fichas de viasverdes.com (Fundación de los Ferrocarriles Españoles): solo se enlaza.

## 6. Contribuciones del público

- El formulario exige declarar que la persona es autora del texto o la fotografía, o que tiene derecho a cederlos, y aceptar su publicación bajo **CC BY-SA 4.0** (fotos y textos) si se incorpora al atlas.
- La propuesta se envía por correo al responsable y la web no la guarda. El correo de contacto es **opcional** y se usa solo para resolver la propuesta. Se informa en la política de privacidad.
- Ninguna contribución se publica sin revisión: el responsable la incorpora a mano, con su fuente, en la capa editorial.

## 7. Contenidos que no se copian

- Fotografías de las fichas del IPCE y de My Maps (ver §2.3).
- Logotipos y marcas del Ministerio, del IPCE o de cualquier institución.
- Textos de webs municipales, museos, asociaciones o publicaciones académicas sin licencia expresa: solo se enlazan o se citan como bibliografía.
- Datos de inventarios autonómicos cuya licencia no se haya verificado.
