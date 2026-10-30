/** npm run data:diff — shows the difference between the pending update and the published catalogue. */
import { Catalog } from "@/domain/schema";
import { diffCatalogs } from "@/pipeline/diff";
import { readJson } from "@/pipeline/fs";
import { paths } from "@/pipeline/paths";
import { loadPublishedCatalog } from "@/pipeline/update";

const pending = await readJson<{ catalog: unknown }>(paths.pendingCatalog());
if (!pending) {
  console.log("No hay ninguna actualización pendiente de aprobación.");
  process.exit(0);
}
const published = await loadPublishedCatalog();
const diff = diffCatalogs(published?.records ?? [], Catalog.parse(pending.catalog).records);
for (const c of diff.added) console.log(`+ ${c.id} ${c.name}`);
for (const c of diff.removed) console.log(`- ${c.id} ${c.name}`);
for (const c of diff.modified) console.log(`~ ${c.id} ${c.name}: ${c.important.length ? c.important.join("; ") : c.fields.join(", ")}`);
console.log(`\nAltas ${diff.added.length} · bajas ${diff.removed.length} · modificaciones ${diff.modified.length}`);
