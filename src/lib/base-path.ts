/**
 * Sub-path the site is served from (GitHub Pages: "/EspanaIndustrial"; empty locally).
 * Next adds it to <Link> and router navigation, but not to plain asset URLs such as
 * image sources, fetches or the MapLibre worker: those go through `withBase`.
 */
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export const withBase = (path: string) => `${BASE_PATH}${path}`;
