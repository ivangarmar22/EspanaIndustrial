/** Read access to the railway dataset (server-only). Built by `npm run data:rail`. */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { RailDataset, type RailLine } from "@/domain/rail";

const railFile = () => path.join(process.env.EI_DATA_DIR ?? path.join(process.cwd(), "data"), "rail", "rail.json");

let cache: { mtimeMs: number; data: RailDataset } | undefined;

export async function getRailDataset(): Promise<RailDataset | undefined> {
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(railFile())).mtimeMs;
  } catch {
    return undefined;
  }
  if (cache?.mtimeMs === mtimeMs) return cache.data;
  const data = RailDataset.parse(JSON.parse(await readFile(railFile(), "utf8")));
  cache = { mtimeMs, data };
  return data;
}

export async function getRailLine(slug: string): Promise<RailLine | undefined> {
  return (await getRailDataset())?.lines.find((l) => l.slug === slug);
}
