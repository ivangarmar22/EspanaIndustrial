/**
 * End-to-end pipeline behaviour over a temporary data directory.
 * All records here are artificial TEST data, not real heritage assets.
 */
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Catalog } from "@/domain/schema";
import type { McItem, McStaging, StagingFile } from "@/pipeline/staging";
import { runUpdate } from "@/pipeline/update";

let dir: string;

const point = (code: string, name: string, lat: number, lon: number) => ({
  rawCode: code,
  code,
  folder: "TEST",
  mapLabel: name.toUpperCase(),
  nameLine: name,
  addressLine: "Dirección de prueba",
  placeText: `${name} · Dirección de prueba`,
  activity: "Fábrica de prueba",
  chronologyLabel: "1880-1950",
  chronology: {
    from: { kind: "year" as const, year: 1880 },
    to: { kind: "year" as const, year: 1950 },
    label: "1880-1950",
  },
  description: "Descripción de prueba para un elemento artificial usado en tests automatizados.",
  point: { lat, lon },
  iconCode: "1565",
  uso: "Fábrica",
});

async function writeStaging(items: McItem[]) {
  const staging: StagingFile<McStaging> = {
    sourceId: "ministerio-cultura",
    retrievedAt: "2026-10-25T10:00:00.000Z",
    contentHash: String(Math.random()),
    data: { kmlUrl: "https://example.test/map.kml", items },
  };
  await mkdir(path.join(dir, "staging"), { recursive: true });
  await writeFile(path.join(dir, "staging", "ministerio-cultura.json"), JSON.stringify(staging));
}

const readCatalog = async () =>
  Catalog.parse(JSON.parse(await readFile(path.join(dir, "catalog", "catalog.json"), "utf8")));

const baseItems = (): McItem[] => [
  { code: "TEST-01", points: [point("TEST-01", "Fábrica textil de prueba", 40.4, -3.7)] },
  { code: "TEST-02", points: [point("TEST-02", "Harinera de prueba", 41.6, -0.9)] },
];

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "ei-test-"));
  process.env.EI_DATA_DIR = dir;
  await writeStaging(baseItems());
});

afterEach(async () => {
  delete process.env.EI_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("data:update", () => {
  it("holds an initial import for review, then publishes on approval, then is idempotent", async () => {
    const first = await runUpdate({ noFetch: true });
    expect(first.outcome).toBe("pending-review");
    expect(first.diff?.added).toHaveLength(2);

    const approved = await runUpdate({ noFetch: true, approve: true });
    expect(approved.outcome).toBe("published");
    const catalog = await readCatalog();
    expect(catalog.records.map((r) => r.slug)).toEqual(["fabrica-textil-de-prueba", "harinera-de-prueba"]);
    expect(catalog.records[0]!.category).toMatchObject({ family: "industria", sub: "textil" });

    expect((await runUpdate({ noFetch: true })).outcome).toBe("no-changes");
  });

  it("keeps manual corrections when the source changes, and warns about it", async () => {
    await runUpdate({ noFetch: true, approve: true });
    const id = (await readCatalog()).records[0]!.id;
    const { sha256 } = await import("@/pipeline/fs");
    await mkdir(path.join(dir, "overrides"), { recursive: true });
    await writeFile(
      path.join(dir, "overrides", `${id}.json`),
      JSON.stringify({
        recordId: id,
        fields: {
          name: {
            value: "Nombre corregido de prueba",
            editedAt: "2026-10-25T11:00:00.000Z",
            baseHash: sha256(JSON.stringify("Fábrica textil de prueba")),
          },
        },
        updatedAt: "2026-10-25T11:00:00.000Z",
      }),
    );
    expect((await runUpdate({ noFetch: true, approve: true })).outcome).toBe("published");

    const changed = baseItems();
    changed[0]!.points[0]!.nameLine = "Nombre nuevo en la fuente";
    await writeStaging(changed);
    const report = await runUpdate({ noFetch: true, approve: true });
    const rec = (await readCatalog()).records.find((r) => r.id === id)!;
    expect(rec.name.value).toBe("Nombre corregido de prueba");
    expect(rec.name.src).toEqual(["editorial"]);
    expect(rec.editorial.state).toBe("edited");
    expect(report.issues.some((i) => i.level === "warning" && i.message.includes("corrección manual"))).toBe(true);
  });

  it("does not delete a record that disappears from the source; it flags it for review", async () => {
    await runUpdate({ noFetch: true, approve: true });
    await writeStaging(baseItems().slice(0, 1));
    const report = await runUpdate({ noFetch: true, approve: true });
    const catalog = await readCatalog();
    expect(catalog.records).toHaveLength(2);
    expect(catalog.records[1]!.discrepancies?.some((d) => d.field === "source")).toBe(true);
    expect(report.diff?.removed).toHaveLength(0);
  });

  it("publishes nothing when a record fails validation", async () => {
    await runUpdate({ noFetch: true, approve: true });
    const before = await readFile(path.join(dir, "catalog", "catalog.json"), "utf8");
    const broken = baseItems();
    broken[0]!.points[0]!.point = { lat: 10, lon: 10 }; // outside Spain
    await writeStaging(broken);
    const report = await runUpdate({ noFetch: true, approve: true });
    expect(report.outcome).toBe("failed");
    expect(await readFile(path.join(dir, "catalog", "catalog.json"), "utf8")).toBe(before);
  });

  it("keeps the last published catalogue when the main source was never imported", async () => {
    await rm(path.join(dir, "staging"), { recursive: true });
    const report = await runUpdate({ noFetch: true });
    expect(report.outcome).toBe("failed");
  });

  it("withdraws records only through an explicit decision", async () => {
    await runUpdate({ noFetch: true, approve: true });
    const id = (await readCatalog()).records[1]!.id;
    await mkdir(path.join(dir, "review"), { recursive: true });
    await writeFile(
      path.join(dir, "review", "decisions.json"),
      JSON.stringify({
        wikidata: {},
        duplicates: {},
        images: {},
        discrepancies: {},
        withdrawn: { [id]: { reason: "Prueba de retirada", decidedAt: "2026-10-25T12:00:00.000Z" } },
      }),
    );
    await runUpdate({ noFetch: true, approve: true });
    const rec = (await readCatalog()).records.find((r) => r.id === id)!;
    expect(rec.editorial.published).toBe(false);
  });
});
