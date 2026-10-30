/** Editable project identity. Changing these values updates headers, metadata and footer. */
export const site = {
  name: "España Industrial",
  tagline: "El mapa vivo de la industrialización de España",
  description:
    "Atlas digital del patrimonio industrial español: fábricas, minas, centrales, estaciones y colonias documentadas con fuentes públicas y trazables.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, ""),
  repository: "https://github.com/ivangarmar22/EspanaIndustrial",
  locale: "es_ES",
} as const;

const httpsUrl = (v: string | undefined, hosts: RegExp) => {
  try {
    const u = new URL(v ?? "");
    return u.protocol === "https:" && hosts.test(u.hostname) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Donation channels, configured in .env.local. A channel only appears on the site
 * when it is configured, so no button ever points nowhere.
 */
export const donations = {
  paypal: httpsUrl(process.env.NEXT_PUBLIC_DONATE_PAYPAL, /(^|\.)paypal\.(me|com)$/),
  kofi: httpsUrl(process.env.NEXT_PUBLIC_DONATE_KOFI, /(^|\.)ko-fi\.com$/),
  bizum: process.env.NEXT_PUBLIC_DONATE_BIZUM?.trim() || undefined,
};

export const absoluteUrl = (pathname: string) => `${site.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
