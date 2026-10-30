# Ejecución local y actualizaciones

## Modo actual: solo local

```bash
npm run build && npm start   # http://127.0.0.1:3000
```

El servidor escucha solo en `127.0.0.1`. La web no escribe en disco: los datos se actualizan con el pipeline y editando `data/`, y después se vuelve a construir.

El formulario de «Colabora» envía las propuestas por SMTP. Con Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, la dirección en `SMTP_USER` y una [contraseña de aplicación](https://myaccount.google.com/apppasswords) en `SMTP_PASS` (requiere verificación en dos pasos). `CONTACT_TO` es el buzón que recibe las propuestas.

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

## Despliegue futuro

Si se publica en internet:

Cualquier hosting de Next.js con Node sirve (VPS, contenedor o plataforma _serverless_), porque la web no escribe en disco. Hay que configurar `NEXT_PUBLIC_SITE_URL`, las variables SMTP y de donaciones, servir con HTTPS y, si hay varias instancias, sustituir el limitador de frecuencia en memoria por uno compartido.
