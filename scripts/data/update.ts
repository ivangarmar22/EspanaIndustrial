/**
 * npm run data:update [-- options]
 *   --approve        publish even if there are changes that need review
 *   --no-fetch       rebuild from existing staging files (no network)
 *   --fetch-only     refresh staging files only
 *   --offline        connectors use cached snapshots only
 *   --refresh        re-download cached documents (PDFs) even if recent
 *   --source <id>    fetch only this connector (repeatable)
 */
import { CONNECTORS, runUpdate } from "@/pipeline/update";

const args = process.argv.slice(2);
const only: string[] = [];
for (let i = 0; i < args.length; i++) if (args[i] === "--source" && args[i + 1]) only.push(args[++i]!);
const unknown = only.filter((id) => !CONNECTORS.some((c) => c.id === id));
if (unknown.length) {
  console.error(`Fuente desconocida: ${unknown.join(", ")}. Disponibles: ${CONNECTORS.map((c) => c.id).join(", ")}`);
  process.exit(2);
}

const report = await runUpdate({
  approve: args.includes("--approve"),
  noFetch: args.includes("--no-fetch"),
  fetchOnly: args.includes("--fetch-only"),
  offline: args.includes("--offline"),
  refresh: args.includes("--refresh"),
  ...(only.length ? { only } : {}),
  log: (m) => console.log(m),
});

console.log(`\n${report.outcome.toUpperCase()}: ${report.message}`);
if (report.diff) console.log(`Altas ${report.diff.added.length} · bajas ${report.diff.removed.length} · modificaciones ${report.diff.modified.length}`);
const errors = report.issues.filter((i) => i.level === "error").length;
const warnings = report.issues.filter((i) => i.level === "warning").length;
console.log(`Errores ${errors} · avisos ${warnings} · posibles duplicados ${report.duplicates.length}`);
console.log("Informe completo: data/reports/latest.md");
process.exit(report.outcome === "failed" ? 1 : 0);
