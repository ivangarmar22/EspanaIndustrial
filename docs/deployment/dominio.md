# Dominio propio (IONOS) y publicación

La web se sigue alojando gratis en **GitHub Pages**; en IONOS solo se compra el dominio y se apuntan sus DNS a GitHub. No hace falta contratar alojamiento en IONOS ni cambiar nada del código: el workflow `.github/workflows/pages.yml` construye la web para el dominio que indique la variable `SITE_URL`.

El dominio es **españaindustrial.es**. Como lleva «ñ», internamente se escribe en su forma técnica (punycode) **`xn--espaaindustrial-1qb.es`**: úsala en GitHub y en cualquier campo que no acepte la «ñ». En los textos de la web se muestra siempre con «ñ».

## 1. Verificar el dominio en GitHub (evita que otra cuenta lo use)

1. GitHub → foto de perfil → **Settings → Pages → Add a domain** y escribe `xn--espaaindustrial-1qb.es`.
2. GitHub muestra un registro **TXT** (`_github-pages-challenge-ivangarmar22`). Créalo en IONOS (paso 2) y vuelve para pulsar **Verify**.

## 2. Registros DNS en IONOS

IONOS → **Dominios y SSL** → el dominio → **DNS**. Borra los registros `A` y `AAAA` de `@` y el `CNAME`/`A` de `www` que IONOS crea por defecto (apuntan a su página de aparcamiento) y añade:

| Tipo  | Nombre (host)                          | Valor                                                                                         |
| ----- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| A     | `@`                                    | `185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153` (cuatro)        |
| AAAA  | `@`                                    | `2606:50c0:8000::153` · `2606:50c0:8001::153` · `2606:50c0:8002::153` · `2606:50c0:8003::153` |
| CNAME | `www`                                  | `ivangarmar22.github.io`                                                                      |
| TXT   | `_github-pages-challenge-ivangarmar22` | el código que dio GitHub en el paso 1                                                         |

No toques los registros `MX` si usas el correo de IONOS. Los cambios tardan de minutos a unas horas en propagarse.

## 3. Activar el dominio en el repositorio

1. Repositorio → **Settings → Pages → Custom domain**: `xn--espaaindustrial-1qb.es` → **Save**. Espera a que la comprobación DNS salga en verde.
2. Marca **Enforce HTTPS** en cuanto GitHub lo permita (emite el certificado gratis; puede tardar hasta una hora).
3. Repositorio → **Settings → Secrets and variables → Actions → Variables** → crea `SITE_URL` = `https://españaindustrial.es` (también vale la forma punycode).
4. **Actions → Pages → Run workflow** (o cualquier push a `main`) para reconstruir la web con el nuevo dominio.

Desde ese momento:

- Las URL canónicas, el `sitemap.xml`, `robots.txt` y las vistas previas al compartir usan `https://xn--espaaindustrial-1qb.es`, que navegadores y buscadores muestran como `españaindustrial.es`.
- La web deja de servirse bajo `/EspanaIndustrial` y la antigua dirección de github.io redirige sola al dominio.
- `www.españaindustrial.es` redirige a `españaindustrial.es`.

> Configura `SITE_URL` a la vez que el dominio del paso 3.1, no antes: con la variable puesta, la web se construye para la raíz del dominio y no funcionaría bajo `github.io/EspanaIndustrial`.

## 4. Variables del repositorio

Settings → Secrets and variables → Actions → **Variables**. Son valores públicos (acaban en el HTML), por eso no son secretos.

| Variable                                         | Uso                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `SITE_URL`                                       | Dirección pública con `https://` y sin barra final. Sin ella se usa la de github.io.       |
| `OWNER_NAME` · `CONTACT_EMAIL`                   | Responsable y correo de contacto del aviso legal y la política de privacidad (LSSI, RGPD). |
| `WEB3FORMS_KEY`                                  | Clave de Web3Forms del formulario de propuestas.                                           |
| `DONATE_PAYPAL` · `DONATE_BIZUM` · `DONATE_KOFI` | Canales de donación de «Colabora»; solo se muestran los configurados.                      |

Si el dominio incluye buzón de correo en IONOS, puedes usarlo para `CONTACT_EMAIL` y como destino de Web3Forms. Ten en cuenta que muchos servicios de correo aún no admiten direcciones con «ñ»: escribe la dirección en su forma punycode (`contacto@xn--espaaindustrial-1qb.es`) o usa otro buzón.

## 5. Después de publicar

- **Google Search Console**: añade la propiedad de dominio (otro registro TXT en IONOS) y envía `https://xn--espaaindustrial-1qb.es/sitemap.xml`.
- Comprueba una ficha al compartirla (por ejemplo, en WhatsApp o con el [depurador de Facebook](https://developers.facebook.com/tools/debug/)): debe salir la foto o la imagen de portada.
- Renovación: el dominio se renueva en IONOS; el certificado HTTPS lo renueva GitHub automáticamente.
