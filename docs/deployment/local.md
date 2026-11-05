# Publicación, ejecución local y actualizaciones

## Publicación en GitHub Pages

La web es una exportación estática de Next.js (`output: "export"`). Cada push a `main` ejecuta `.github/workflows/pages.yml`, que descarga las fotografías de Commons (con caché), genera sus copias optimizadas, construye la web y la publica. Su dirección es https://españaindustrial.es (dominio de IONOS); mientras no esté configurado, se sirve en https://ivangarmar22.github.io/EspanaIndustrial/. Los pasos y las variables del repositorio están en [dominio.md](dominio.md).

## Vista previa local

```bash
npm run dev                  # desarrollo: http://127.0.0.1:3000
npm run build && npm start   # la exportación estática (out/) servida como en GitHub Pages
```

La web no escribe en disco: los datos se actualizan con el pipeline y editando `data/`, y después se vuelve a construir.

Las fotografías originales de Commons (hasta 5 MB) no se sirven tal cual: antes de `dev` y `build`, `npm run media:optimize` crea copias WebP de 320, 640, 1080 y 1600 px y una JPEG de 1200 px para las vistas previas al compartir. Solo convierte lo que falta.

El formulario de «Colabora» envía las propuestas a Web3Forms, que las reenvía por correo. Para obtener la clave basta con indicar el correo de destino en https://web3forms.com/ (sin contraseña ni cuenta); el plan gratuito admite 250 envíos al mes.

## Actualizar los datos

```bash
npm run data:update            # descarga y publica si no hay cambios importantes
npm run data:diff              # revisa lo pendiente
npm run data:update -- --no-fetch --approve   # aprueba tras revisar el diff
npm run data:media             # si hay imágenes nuevas
npm run data:update -- --no-fetch
```

Frecuencias recomendadas:

| Fuente                | Frecuencia               | Motivo                                                                    |
| --------------------- | ------------------------ | ------------------------------------------------------------------------- |
| Ministerio de Cultura | Mensual                  | Listado estable; las fichas PDF se reutilizan 30 días                     |
| CartoCiudad           | Al añadir o mover puntos | Solo consulta puntos nuevos                                               |
| Wikidata / Commons    | Mensual                  | Solo consulta puntos nuevos o movidos; las entidades se refrescan en lote |

## Automatización (preparada, no activada)

`.github/workflows/data-update.yml` ejecuta el pipeline **bajo demanda** (`workflow_dispatch`) y abre un Pull Request con los cambios, sin aprobar nada automáticamente: los cambios importantes quedan en `data/review/pending-catalog.json` para revisión. Para programarlo, descomenta el bloque `schedule` del workflow. No depende de ningún ordenador personal encendido.
