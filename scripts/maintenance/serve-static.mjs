/**
 * Serves the static export (out/) the way GitHub Pages does, under the same base
 * path, for local previews and the end-to-end tests: `npm start` after `npm run build`.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("out");
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const port = Number(process.env.PORT ?? 3000);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function resolve(urlPath) {
  const file = path.join(root, decodeURIComponent(urlPath));
  if (!file.startsWith(root)) return undefined;
  const s = await stat(file).catch(() => undefined);
  if (s?.isFile()) return file;
  if (s?.isDirectory())
    return (await stat(path.join(file, "index.html")).catch(() => undefined))
      ? path.join(file, "index.html")
      : undefined;
  return undefined;
}

createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url ?? "/", "http://localhost");
  if (base && pathname === base) return res.writeHead(301, { Location: `${base}/${search}` }).end();
  if (base && !pathname.startsWith(`${base}/`)) return res.writeHead(404).end();
  const rel = pathname.slice(base.length);
  // Like GitHub Pages: /ruta redirects to /ruta/ when that directory exists.
  if (!rel.endsWith("/") && !path.extname(rel) && (await resolve(`${rel}/`)))
    return res.writeHead(301, { Location: `${pathname}/${search}` }).end();
  const file = await resolve(rel);
  const target = file ?? path.join(root, "404.html");
  res.writeHead(file ? 200 : 404, { "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream" });
  createReadStream(target).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}${base}/`));
