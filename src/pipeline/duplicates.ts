/**
 * Duplicate candidates. Similarity only *proposes* pairs for review; records
 * are never merged automatically.
 */
import { duplicatePairKey, type Decisions } from "@/domain/editorial";
import type { HeritageRecord } from "@/domain/schema";
import { distanceMeters } from "@/lib/geo";
import { nameSimilarity } from "@/lib/text";

export interface DuplicateCandidate {
  key: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  reasons: string[];
  distanceM?: number;
  similarity: number;
}

const NEAR_M = 300;
const MIN_SIMILARITY = 0.5;
const CELL_DEG = 0.01; // ~1 km cells: neighbours within NEAR_M are always in adjacent cells

export function findDuplicateCandidates(records: HeritageRecord[], decisions: Decisions): DuplicateCandidate[] {
  const pairs = new Map<string, DuplicateCandidate>();
  const add = (a: HeritageRecord, b: HeritageRecord, reason: string) => {
    const key = duplicatePairKey(a.id, b.id);
    if (decisions.duplicates[key]) return;
    const pa = a.location.point?.value;
    const pb = b.location.point?.value;
    const existing = pairs.get(key);
    if (existing) {
      existing.reasons.push(reason);
      return;
    }
    pairs.set(key, {
      key,
      a: { id: a.id, name: a.name.value },
      b: { id: b.id, name: b.name.value },
      reasons: [reason],
      ...(pa && pb ? { distanceM: Math.round(distanceMeters(pa, pb)) } : {}),
      similarity: Math.round(nameSimilarity(a.name.value, b.name.value) * 100) / 100,
    });
  };

  const byExternal = (pick: (r: HeritageRecord) => string | undefined, label: string) => {
    const groups = new Map<string, HeritageRecord[]>();
    for (const r of records) {
      const v = pick(r);
      if (v) groups.set(v, [...(groups.get(v) ?? []), r]);
    }
    for (const [value, group] of groups) {
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) add(group[i]!, group[j]!, `${label} (${value})`);
    }
  };
  byExternal((r) => r.externalIds.wikidata, "Mismo elemento de Wikidata");
  byExternal((r) => r.externalIds.catastro, "Misma referencia catastral");
  byExternal((r) => r.externalIds.bic, "Mismo código BIC");

  const grid = new Map<string, HeritageRecord[]>();
  const cell = (lat: number, lon: number) => `${Math.floor(lat / CELL_DEG)}:${Math.floor(lon / CELL_DEG)}`;
  for (const r of records) {
    const p = r.location.point?.value;
    if (p) grid.set(cell(p.lat, p.lon), [...(grid.get(cell(p.lat, p.lon)) ?? []), r]);
  }
  for (const r of records) {
    const p = r.location.point?.value;
    if (!p) continue;
    const [cy, cx] = cell(p.lat, p.lon).split(":").map(Number) as [number, number];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const other of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
          if (other.id <= r.id) continue;
          const q = other.location.point!.value;
          const d = distanceMeters(p, q);
          if (d <= NEAR_M && nameSimilarity(r.name.value, other.name.value) >= MIN_SIMILARITY)
            add(r, other, `A ${Math.round(d)} m con nombre similar`);
        }
      }
    }
  }
  return [...pairs.values()].sort((x, y) => x.key.localeCompare(y.key));
}
