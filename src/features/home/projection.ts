/**
 * Projection shared by the home dot map and the outline generator:
 * equirectangular, scaled by cos(lat) at the frame's centre. The Canary Islands
 * are drawn in an inset in the lower-left corner.
 */
export const MAIN = { minLon: -9.6, maxLon: 4.5, minLat: 35.1, maxLat: 44 } as const;
export const CANARY = { minLon: -18.3, maxLon: -13.3, minLat: 27.5, maxLat: 29.5 } as const;

export const W = 600;
const K = Math.cos((39.5 * Math.PI) / 180);
export const H = Math.round(((MAIN.maxLat - MAIN.minLat) / ((MAIN.maxLon - MAIN.minLon) * K)) * W);
const INSET_W = 190;
const INSET_H = Math.round(
  INSET_W * ((CANARY.maxLat - CANARY.minLat) / ((CANARY.maxLon - CANARY.minLon) * Math.cos((28.5 * Math.PI) / 180))),
);
export const INSET = { x: 12, y: H - INSET_H - 12, w: INSET_W, h: INSET_H } as const;

export const project = (lon: number, lat: number) => ({
  x: ((lon - MAIN.minLon) / (MAIN.maxLon - MAIN.minLon)) * W,
  y: ((MAIN.maxLat - lat) / (MAIN.maxLat - MAIN.minLat)) * H,
});

export const projectCanary = (lon: number, lat: number) => ({
  x: INSET.x + ((lon - CANARY.minLon) / (CANARY.maxLon - CANARY.minLon)) * INSET.w,
  y: INSET.y + ((CANARY.maxLat - lat) / (CANARY.maxLat - CANARY.minLat)) * INSET.h,
});

export const isCanary = (lat: number, lon: number) => lat < 30 && lon < -12;
