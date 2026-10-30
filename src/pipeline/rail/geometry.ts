/** Small planar helpers for line work at Spanish latitudes (equirectangular metres, < 0.5 % error at these scales). */

export type LonLat = [number, number];

const M_PER_DEG_LAT = 110_574;
const mPerDegLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

export function lineLengthM(coords: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1]!;
    const [x2, y2] = coords[i]!;
    total += Math.hypot((x2 - x1) * mPerDegLon((y1 + y2) / 2), (y2 - y1) * M_PER_DEG_LAT);
  }
  return total;
}

/** Distance in metres from a point to a polyline. */
export function distanceToLineM(p: LonLat, coords: LonLat[]): number {
  const kx = mPerDegLon(p[1]);
  let best = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const ax = (coords[i - 1]![0] - p[0]) * kx;
    const ay = (coords[i - 1]![1] - p[1]) * M_PER_DEG_LAT;
    const bx = (coords[i]![0] - p[0]) * kx;
    const by = (coords[i]![1] - p[1]) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** Douglas–Peucker simplification with a tolerance in degrees, keeping both ends. */
export function simplify(coords: LonLat[], tolerance: number): LonLat[] {
  if (coords.length <= 2) return coords;
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, coords.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = coords[first]!;
    const [bx, by] = coords[last]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let maxD = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = coords[i]!;
      const d = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (d > maxD) {
        maxD = d;
        index = i;
      }
    }
    if (maxD > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bbox(coords: LonLat[]): BBox {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of coords) {
    b.minX = Math.min(b.minX, x);
    b.maxX = Math.max(b.maxX, x);
    b.minY = Math.min(b.minY, y);
    b.maxY = Math.max(b.maxY, y);
  }
  return b;
}

/** Whether a point lies within `marginDeg` of a bounding box (cheap prefilter before exact distances). */
export const nearBBox = (p: LonLat, b: BBox, marginDeg: number) =>
  p[0] >= b.minX - marginDeg && p[0] <= b.maxX + marginDeg && p[1] >= b.minY - marginDeg && p[1] <= b.maxY + marginDeg;
