/**
 * npm run data:links — checks external links (documents and sources) of the
 * published catalogue with polite, rate-limited requests. Writes
 * data/reports/links.json. Broken links are reported, never removed.
 */
import path from "node:path";
import { userAgent } from "@/pipeline/http";
import { writeJsonAtomic } from "@/pipeline/fs";
import { paths } from "@/pipeline/paths";
import { loadPublishedCatalog } from "@/pipeline/update";

const catalog = await loadPublishedCatalog();
if (!catalog) process.exit(1);

const urls = new Map<string, string[]>();
for (const r of catalog.records) {
  for (const u of [...(r.documents ?? []).map((d) => d.url), ...Object.values(r.sources).flatMap((s) => (s.url ? [s.url] : []))]) {
    urls.set(u, [...(urls.get(u) ?? []), r.id]);
  }
}

const lastByHost = new Map<string, number>();
const results: Array<{ url: string; status: number | string; records: string[] }> = [];
for (const [url, records] of urls) {
  const host = new URL(url).host;
  const wait = (lastByHost.get(host) ?? 0) + 1500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastByHost.set(host, Date.now());
  let status: number | string;
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(20_000) });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(20_000) });
    status = res.status;
  } catch (err) {
    status = (err as Error).name;
  }
  results.push({ url, status, records });
  if (status !== 200) console.log(`${status}  ${url}`);
}
await writeJsonAtomic(path.join(paths.reportsDir(), "links.json"), { checkedAt: new Date().toISOString(), results });
const broken = results.filter((r) => r.status !== 200);
console.log(`\n${results.length} enlaces comprobados · ${broken.length} con respuesta distinta de 200 (data/reports/links.json)`);
