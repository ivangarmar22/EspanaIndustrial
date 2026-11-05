/**
 * npm run media:optimize (also before dev/build): makes the copies described in
 * src/lib/media.ts. Only missing files are converted, so later runs are instant.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_WIDTHS, SOCIAL_IMAGE_WIDTH } from "@/lib/media";

const dir = path.resolve("public/media/commons");
const originals = (await readdir(dir).catch(() => [])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

const jobs = originals.flatMap((file) => {
  const src = path.join(dir, file);
  const name = path.parse(file).name;
  return [
    ...IMAGE_WIDTHS.map((width) => ({ src, width, dest: path.join(dir, String(width), `${name}.webp`) })),
    { src, width: SOCIAL_IMAGE_WIDTH, dest: path.join(dir, "og", `${name}.jpg`) },
  ];
});

let created = 0;
async function run({ src, dest, width }: (typeof jobs)[number]) {
  if (await stat(dest).catch(() => undefined)) return;
  await mkdir(path.dirname(dest), { recursive: true });
  const img = sharp(src).rotate().resize({ width, withoutEnlargement: true });
  await (dest.endsWith(".jpg") ? img.jpeg({ quality: 80, mozjpeg: true }) : img.webp({ quality: 74 })).toFile(dest);
  created++;
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: Math.min(availableParallelism(), 8) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await run(job);
  }),
);
if (created) console.log(`Imágenes optimizadas: ${created} nuevas (${originals.length} fotografías).`);
