import type { Point } from "@/domain/schema";

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. */
export function distanceMeters(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Round coordinates to ~1 m to avoid noisy diffs between imports. */
export function roundPoint(p: Point, decimals = 6): Point {
  const f = 10 ** decimals;
  return { lat: Math.round(p.lat * f) / f, lon: Math.round(p.lon * f) / f };
}

export function formatCoordinates(p: Point): string {
  const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
  return `${fmt(p.lat, "N", "S")}, ${fmt(p.lon, "E", "O")}`;
}
