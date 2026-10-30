/**
 * npm run data:media — downloads the licensed Commons thumbnails referenced by
 * the published catalogue into public/media/commons (once; existing files are
 * skipped), so the site never hotlinks Wikimedia. Run `data:update -- --no-fetch`
 * afterwards so records pick up the local paths.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { HttpClient } from "@/pipeline/http";
import { exists, readJson, sha256, writeFileAtomic } from "@/pipeline/fs";
import { paths } from "@/pipeline/paths";
import type { CommonsStaging, StagingFile, WikidataStaging } from "@/pipeline/staging";
import { Decisions, emptyDecisions } from "@/domain/editorial";

const commons = await readJson<StagingFile<CommonsStaging>>(paths.staging("wikimedia-commons"));
const wikidata = await readJson<StagingFile<WikidataStaging>>(paths.staging("wikidata"));
const decisions = Decisions.parse((await readJson(paths.decisions())) ?? emptyDecisions());
if (!commons || !wikidata) {
  console.error("No hay staging de Commons/Wikidata. Ejecuta antes npm run data:update.");
  process.exit(1);
}

// Only images of matches that the build would actually use (auto or accepted), with an accepted licence.
const used = new Set(
  Object.entries(wikidata.data).flatMap(([code, m]) => {
    const d = decisions.wikidata[code];
    if (d?.action === "accept") {
      const entity = d.qid === m.qid ? m.entity : m.acceptedEntity;
      return entity?.image ? [entity.image] : [];
    }
    const usable = m.decision === "auto" && !(d?.action === "reject" && d.qid === m.qid);
    return usable && m.entity?.image ? [m.entity.image] : [];
  }),
);
const targets = Object.values(commons.data).filter((img) => img.accepted && used.has(img.file) && decisions.images[img.file]?.action !== "reject");

const dir = path.join(paths.mediaDir(), "commons");
await mkdir(dir, { recursive: true });
const http = new HttpClient({ minIntervalMs: 1000 });
let downloaded = 0;
let skipped = 0;
let failed = 0;
for (const img of targets) {
  const ext = /\.png($|\?)/i.test(img.downloadUrl) ? "png" : /\.webp($|\?)/i.test(img.downloadUrl) ? "webp" : "jpg";
  const file = path.join(dir, `${sha256(img.file).slice(0, 16)}.${ext}`);
  if (await exists(file)) {
    skipped++;
    continue;
  }
  try {
    const { body } = await http.getBytes(img.downloadUrl, { minBytes: 2_000, expectContentType: /^image\// });
    await writeFileAtomic(file, body);
    downloaded++;
    console.log(`✓ ${img.file}`);
  } catch (err) {
    failed++;
    console.warn(`✗ ${img.file}: ${(err as Error).message}`);
  }
}
console.log(`\nDescargadas ${downloaded} · ya existentes ${skipped} · fallidas ${failed}`);
console.log("Ahora ejecuta: npm run data:update -- --no-fetch");
