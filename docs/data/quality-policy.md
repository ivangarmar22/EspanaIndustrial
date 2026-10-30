# Política de calidad y procedencia

## Procedencia por campo

Cada dato documental es un `Attested<T>`: `{ value, src: [claves de fuente], alternatives? }`. Las claves remiten a `record.sources`, donde constan título, organismo, URL, identificador externo, fecha de descarga (`retrievedAt`, que **no** es fecha de verificación), licencia, método de extracción y estado de revisión.

Cuando otra fuente da un valor distinto, se guarda en `alternatives` y la ficha lo muestra. Si la diferencia es relevante, se añade una discrepancia:

| Regla | Umbral |
|---|---|
| Coordenadas del mapa frente a las de la ficha del IPCE | > 250 m |
| Coordenadas del IPCE frente a las de Wikidata | > 500 m |
| Año de inicio del IPCE frente a la fecha de creación de Wikidata (ambos con precisión de año) | > 2 años |
| Elemento que ya no figura en la fuente | siempre |

Una discrepancia puede explicarse en `data/review/decisions.json` (la explicación se publica) o corregir el dato.

## Niveles de verificación

| Nivel | Condición |
|---|---|
| Verificado | El registro se marcó como verificado contra la fuente primaria en la capa editorial. |
| Contrastado | La ficha del IPCE y una fuente oficial independiente coinciden: la referencia catastral de la ficha es la de la parcela que CartoCiudad devuelve para el punto. |
| Documentación parcial | Hay ficha del IPCE, extraída automáticamente y sin revisar. |
| Fuentes secundarias | Solo fuentes colaborativas (reservado para fases futuras). |
| Pendiente de revisión | Solo datos del mapa del IPCE, sin ficha. |

No se muestra ninguna puntuación numérica de fiabilidad.

## Fuentes colaborativas

- Wikidata se asocia automáticamente solo con distancia ≤ 500 m y similitud de nombre ≥ 0,6, sin dos candidatos casi iguales. Entre 0,35 y 0,6 o hasta 2 km queda como candidato para revisión.
- Las imágenes de Commons solo se publican con licencias CC0, dominio público, CC BY o CC BY-SA, y con autor declarado.
- Lo colaborativo nunca se presenta como oficial: la ficha distingue «Fuente primaria oficial», «Fuente oficial complementaria», «Fuente colaborativa» y «Revisión editorial».

## Guiones de maquetación

Los textos copiados de los PDF contienen palabras partidas («coloniza-ción»). Solo se unen cuando la forma unida aparece escrita en otro texto del catálogo; los compuestos legítimos («minero-metalúrgico») se mantienen.

## Lo que nunca se infiere

- El estado de conservación a partir de fotografías o de etiquetas de mapas.
- La actividad actual a partir de «1914-actual».
- Fechas exactas a partir de siglos o intervalos.
- Valores de campos de casilla de las fichas PDF.
- Superficies (las plantillas contienen marcadores falsos).

## Revisión antes de publicar

Requieren aprobación: altas, bajas, cambio de nombre, de categoría, de protección, desplazamiento > 100 m, cambios de imágenes o licencias y cambios de publicación. El resto (textos, fechas de consulta) se publica directamente si la validación pasa. Las correcciones de `data/overrides/` se aplican siempre y nunca se sobrescriben.
