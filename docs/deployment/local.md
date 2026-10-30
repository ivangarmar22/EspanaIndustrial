# Publicación, ejecución local y actualizaciones

## Publicación en GitHub Pages

La web es una exportación estática de Next.js (`output: "export"`). Cada push a `main` ejecuta `.github/workflows/pages.yml`, que descarga las fotografías de Commons (con caché), construye la web con el prefijo `/EspanaIndustrial` y la publica en https://ivangarmar22.github.io/EspanaIndustrial/.

Los valores públicos se configuran como **variables del repositorio** (Settings → Secrets and variables → Actions → Variables):

| Variable                                         | Uso                                                            |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `WEB3FORMS_KEY`                                  | Clave de acceso de Web3Forms para el formulario de propuestas. |
| `DONATE_PAYPAL` · `DONATE_BIZUM` · `DONATE_KOFI` | Canales de donación de «Colabora».                             |

## Vista previa local

```bash
npm run dev                  # desarrollo: http://127.0.0.1:3000
npm run build && npm start   # la exportación estática (out/) servida como en GitHub Pages
```

La web no escribe en disco: los datos se actualizan con el pipeline y editando `data/`, y después se vuelve a construir.

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
