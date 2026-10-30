/**
 * npm run data:validate — integrity checks over the published catalogue and the
 * editorial layer, and export of the catalogue JSON Schema. Exit code 1 on error.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Collection, IndustrialRoute } from "@/domain/editorial-content";
import { Catalog, collectSourceKeys } from "@/domain/schema";
import { getProvince } from "@/domain/territory";
import { exists, readJson, writeJsonAtomic } from "@/pipeline/fs";
import { paths } from "@/pipeline/paths";
import { loadEditorialLayer } from "@/pipeline/update";

const errors: string[] = [];
const warnings: string[] = [];

const raw = await readJson(paths.catalog());
if (!raw) {
  console.error("No existe data/catalog/catalog.json. Ejecuta npm run data:update.");
  process.exit(1);
}
const parsed = Catalog.safeParse(raw);
if (!parsed.success) {
  for (const i of parsed.error.issues.slice(0, 50)) errors.push(`Esquema: ${i.path.join(".")}: ${i.message}`);
} else {
  const records = parsed.data.records;
  const seen = { id: new Set<string>(), slug: new Set<string>() };
  for (const r of records) {
    if (seen.id.has(r.id)) errors.push(`Id duplicado: ${r.id}`);
    seen.id.add(r.id);
    for (const s of [r.slug, ...(r.previousSlugs ?? [])]) {
      if (seen.slug.has(s)) errors.push(`Slug duplicado: ${s}`);
      seen.slug.add(s);
    }
    const unknown = [...collectSourceKeys(r)].filter((k) => !r.sources[k]);
    if (unknown.length) errors.push(`${r.id}: fuentes no declaradas ${unknown.join(", ")}`);
    const unused = Object.keys(r.sources).filter((k) => !collectSourceKeys(r).has(k));
    if (unused.length) warnings.push(`${r.id}: fuentes declaradas sin uso ${unused.join(", ")}`);
    if (r.location.provinceCode && r.location.regionCode && getProvince(r.location.provinceCode)?.regionCode !== r.location.regionCode) {
      errors.push(`${r.id}: la provincia ${r.location.provinceCode} no pertenece a la comunidad ${r.location.regionCode}`);
    }
    const ine = r.location.municipality?.value.ineCode;
    if (ine && r.location.provinceCode && !ine.startsWith(r.location.provinceCode)) errors.push(`${r.id}: el código INE ${ine} no corresponde a la provincia ${r.location.provinceCode}`);
    for (const img of r.images ?? []) {
      if (img.localPath && !(await exists(path.join(paths.mediaDir(), img.localPath.replace(/^\/media\//, ""))))) warnings.push(`${r.id}: falta el archivo ${img.localPath} (ejecuta npm run data:media)`);
    }
  }
  console.log(`Catálogo: ${records.length} registros, esquema válido.`);
}

try {
  const { overrides, registry } = await loadEditorialLayer();
  const ids = new Set(Object.values(registry.entries).map((e) => e.id));
  for (const id of overrides.keys()) if (!ids.has(id)) errors.push(`Override para un registro inexistente: ${id}`);
} catch (err) {
  errors.push(`Capa editorial: ${(err as Error).message}`);
}

for (const [file, schema] of [
  ["collections.json", Collection],
  ["routes.json", IndustrialRoute],
] as const) {
  const data = await readJson(path.join(paths.editorialDir(), file));
  if (data !== undefined) {
    const r = z.array(schema).safeParse(data);
    if (!r.success) errors.push(`${file}: ${r.error.issues[0]?.path.join(".")}: ${r.error.issues[0]?.message}`);
  }
}
if (await exists(paths.overridesDir())) console.log(`Overrides: ${(await readdir(paths.overridesDir())).filter((f) => f.endsWith(".json")).length}`);

await writeJsonAtomic(path.join(paths.schemasDir(), "catalog.schema.json"), z.toJSONSchema(Catalog, { unrepresentable: "any" }));

for (const w of warnings) console.warn(`aviso: ${w}`);
for (const e of errors) console.error(`ERROR: ${e}`);
console.log(`\n${errors.length} errores · ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
