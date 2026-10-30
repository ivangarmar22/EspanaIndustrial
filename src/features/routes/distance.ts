import type { HeritageRecord } from "@/domain/schema";
import { distanceMeters } from "@/lib/geo";

/** Straight-line legs between consecutive stops, in km. Not a walkable or drivable distance. */
export function routeLegsKm(records: HeritageRecord[]): number[] {
  const legs: number[] = [];
  for (let i = 1; i < records.length; i++) {
    const a = records[i - 1]!.location.point?.value;
    const b = records[i]!.location.point?.value;
    legs.push(a && b ? distanceMeters(a, b) / 1000 : NaN);
  }
  return legs;
}

export const routeDistanceKm = (records: HeritageRecord[]) =>
  routeLegsKm(records).reduce((s, d) => s + (Number.isFinite(d) ? d : 0), 0);
