// Copies MapLibre's self-contained worker into public/vendor. MapLibre 6 resolves
// its worker relative to its own module URL, which does not survive bundling, so
// the app points to this copy with setWorkerUrl(). Runs before `dev` and `build`.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const target = path.join(process.cwd(), "public", "vendor");
await mkdir(target, { recursive: true });
await copyFile(path.join(pkgDir, "dist", "maplibre-gl-worker.mjs"), path.join(target, "maplibre-gl-worker.mjs"));
