/** npm run data:duplicates — lists undecided duplicate candidates in the published catalogue. */
import { findDuplicateCandidates } from "@/pipeline/duplicates";
import { loadEditorialLayer, loadPublishedCatalog } from "@/pipeline/update";

const catalog = await loadPublishedCatalog();
if (!catalog) {
  console.error("No hay catálogo publicado.");
  process.exit(1);
}
const { decisions } = await loadEditorialLayer();
const candidates = findDuplicateCandidates(catalog.records, decisions);
for (const c of candidates) console.log(`${c.a.id} «${c.a.name}» ↔ ${c.b.id} «${c.b.name}»\n   ${c.reasons.join("; ")}`);
console.log(`\n${candidates.length} pares pendientes de decisión (resuélvelos en /admin/duplicados).`);
