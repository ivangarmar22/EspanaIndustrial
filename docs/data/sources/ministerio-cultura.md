# Conector `ministerio-cultura`

## Entrada

1. KML del Google My Maps enlazado desde la página del Plan Nacional (`src/pipeline/sources/ministerio-cultura/constants.ts`).
2. Fichas PDF de Google Drive enlazadas en la descripción de cada marcador (descarga directa `uc?export=download`). Se reutilizan si tienen menos de 30 días (`--refresh` fuerza la descarga).

## Marcadores (`kml.ts`)

- Carpeta `LEYENDA` excluida: no son bienes.
- Código: `An-01`, `CAT-05-A`, `Mad-06A`, `CyL-18/A`, `PV_07`… → `AN-01` (+ parte `A`/`B`). Varias partes = un bien con varios puntos.
- Mismo código, fichas distintas: son bienes distintos (el mapa usa CAT-07 para Cal Miralda y para la bodega del Pinell de Brai). El segundo se registra como `CAT-07/2`; el código mostrado sigue siendo CAT-07.
- Uso: código de icono del estilo (`icon-1565-…` = «Fábrica»), según la leyenda del propio mapa. Iconos fuera de la leyenda → categoría provisional y aviso.
- Cabecera de la descripción: «Actividad, cronología».

## Fichas (`ficha.ts`)

| Campo | Regla |
|---|---|
| Valores vacíos | `--`, `No consta`, `--/--/----` = sin dato |
| Valores truncados | terminados en guion, coma o preposición → descartados con aviso |
| Etiquetas filtradas | un valor que contiene otra etiqueta (`TITULARIDAD:`) → descartado |
| Referencia catastral | 7–20 alfanuméricos con ≥ 5 dígitos; «sin», «No», «(Múltiple)» se descartan |
| Cronología | debe parecer una fecha (no `dd/mm/aaaa`) |
| Protección | tipo literal + nivel normalizado; fechas tal como están impresas; enlace al boletín solo si no está partido o es un PDF del BOE reconstruible |
| Secciones de la página 2 | se cortan por encabezados en cualquier orden; se eliminan pies de foto y elementos de maquetación |
| Superficies y casillas | nunca se importan |

Al cambiar estas reglas, incrementa `PARSER_VERSION` en `index.ts` para que la siguiente ejecución vuelva a generar el staging.

## Salvaguardas

- KML con menos del 80 % de los elementos anteriores → respuesta rechazada; se conserva el staging anterior.
- Fallo al descargar una ficha → se reutiliza la extracción anterior marcada como desactualizada.
