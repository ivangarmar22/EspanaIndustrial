/**
 * npm run maintenance:favicon — writes src/app/favicon.ico. Small sizes need their own
 * drawings: 16 and 24 px use the pixel-aligned, simplified marks in ./favicon/, and
 * 32–64 px from favicon-32.svg. Larger icons (apple-touch-icon, manifest) use the full mark.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("scripts/maintenance/favicon");
const frames: Array<[size: number, svg: string, grid: number]> = [
  [16, path.join(dir, "favicon-16.svg"), 16],
  [24, path.join(dir, "favicon-24.svg"), 24],
  [32, path.join(dir, "favicon-32.svg"), 32],
  [48, path.join(dir, "favicon-32.svg"), 32],
  [64, path.join(dir, "favicon-32.svg"), 32],
];

const pngs = await Promise.all(
  frames.map(async ([size, file, grid]) =>
    sharp(await readFile(file), { density: (72 * size) / grid })
      .resize(size, size)
      .png()
      .toBuffer(),
  ),
);

// ICO container: 6-byte header, one 16-byte entry per image, then the PNG data.
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + 16 * i;
  const size = frames[i]![0];
  header.writeUInt8(size, e);
  header.writeUInt8(size, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...pngs]));
console.log(`favicon.ico: ${frames.map(([s]) => s).join(", ")} px`);
