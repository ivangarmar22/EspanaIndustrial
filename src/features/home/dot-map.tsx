import Link from "next/link";
import { CATEGORIES } from "@/domain/categories";
import type { IndexItem } from "@/domain/index-item";
import { FAMILY_HEX } from "@/components/category";
import {
  CANARY_PATH,
  NEIGHBOURS_PATH,
  PROVINCE_BORDERS_PATH,
  REGION_BORDERS_PATH,
  RIVERS_PATH,
  SPAIN_PATH,
} from "./outline.generated";
import { H, INSET, MAIN, W, isCanary, project, projectCanary } from "./projection";

/** Cartographic palette: paper land on a pale sea, in the site's tones. */
const SEA = "#dde4e1";
const SEA_LINE = "#b9c8c4";
const LAND = "#fbf9f4";
const NEIGHBOUR = "#ece7dc";
const RIVER = "#86aab0";

/** Kilometres represented by the scale bar, and its length in map units at 39.5° N. */
const SCALE_KM = 200;
const SCALE_PX = (SCALE_KM / (111.32 * Math.cos((39.5 * Math.PI) / 180) * (MAIN.maxLon - MAIN.minLon))) * W;

const LABELS: Array<{ text: string; lon: number; lat: number; sea?: boolean; vertical?: boolean }> = [
  { text: "PORTUGAL", lon: -8.05, lat: 39.75 },
  { text: "FRANCIA", lon: 1.0, lat: 43.62 },
  { text: "Mar Cantábrico", lon: -5.1, lat: 43.68, sea: true },
  { text: "Océano Atlántico", lon: -9.33, lat: 37.85, sea: true, vertical: true },
  { text: "Mar Mediterráneo", lon: 1.25, lat: 40.25, sea: true },
];

/** Coastline drawn twice under the land, wider and fainter, as in engraved maps. */
function Waterlines({ d }: { d: string }) {
  return (
    <g fill="none" stroke={SEA_LINE} strokeLinejoin="round">
      <path d={d} strokeWidth="9" strokeOpacity="0.25" />
      <path d={d} strokeWidth="4.5" strokeOpacity="0.45" />
    </g>
  );
}

/**
 * Static, server-rendered map of every catalogued point over Natural Earth
 * 1:10m cartography (coast, autonomous communities, provinces, main rivers).
 * No tiles: fast first paint.
 */
export function DotMap({ items }: { items: IndexItem[] }) {
  const lons = [-8, -6, -4, -2, 0, 2, 4];
  const lats = [36, 38, 40, 42];
  const counts = new Map(CATEGORIES.map((c) => [c.id, items.filter((i) => i.family === c.id).length]));
  const scaleX = W - 24 - SCALE_PX;
  return (
    <figure>
      <Link
        href="/mapa"
        className="group block overflow-hidden rounded-2xl border border-rule-strong bg-card no-underline shadow-[0_24px_50px_-30px_rgba(28,27,25,0.45)] transition-shadow hover:shadow-[0_28px_60px_-28px_rgba(28,27,25,0.55)]"
        aria-label={`Abrir el mapa interactivo con ${items.length} elementos`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
          <defs>
            <filter id="land-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#1c1b19" floodOpacity="0.22" />
            </filter>
            <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodColor="#1c1b19" floodOpacity="0.35" />
            </filter>
          </defs>

          <rect width={W} height={H} fill={SEA} />
          <Waterlines d={NEIGHBOURS_PATH} />
          <Waterlines d={SPAIN_PATH} />
          <path d={NEIGHBOURS_PATH} fill={NEIGHBOUR} stroke="#b7ad9b" strokeWidth="0.5" />
          <path d={SPAIN_PATH} fill={LAND} filter="url(#land-shadow)" />
          <path d={PROVINCE_BORDERS_PATH} fill="none" stroke="#d3cbbb" strokeWidth="0.45" strokeDasharray="1.6 1.4" />
          <path d={REGION_BORDERS_PATH} fill="none" stroke="#a69d8c" strokeWidth="0.75" strokeLinejoin="round" />
          <path
            d={RIVERS_PATH}
            fill="none"
            stroke={RIVER}
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={SPAIN_PATH} fill="none" stroke="#46433e" strokeWidth="0.8" strokeLinejoin="round" />

          {lons.map((lon) => {
            const { x } = project(lon, 40);
            return (
              <g key={`lon${lon}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={H}
                  stroke="#a69d8c"
                  strokeOpacity="0.45"
                  strokeWidth="0.5"
                  strokeDasharray="1 4"
                />
                <text x={x + 3} y={11} fontSize="8.5" className="fill-iron font-mono">
                  {Math.abs(lon)}°{lon < 0 ? "O" : lon > 0 ? "E" : ""}
                </text>
              </g>
            );
          })}
          {lats.map((lat) => {
            const { y } = project(0, lat);
            return (
              <g key={`lat${lat}`}>
                <line
                  x1={0}
                  x2={W}
                  y1={y}
                  y2={y}
                  stroke="#a69d8c"
                  strokeOpacity="0.45"
                  strokeWidth="0.5"
                  strokeDasharray="1 4"
                />
                <text x={W - 5} y={y - 3} fontSize="8.5" textAnchor="end" className="fill-iron font-mono">
                  {lat}°N
                </text>
              </g>
            );
          })}

          {LABELS.map((l) => {
            const { x, y } = project(l.lon, l.lat);
            return (
              <text
                key={l.text}
                x={x}
                y={y}
                textAnchor="middle"
                transform={l.vertical ? `rotate(-90 ${x} ${y})` : undefined}
                fontSize={l.sea ? 10 : 8}
                letterSpacing={l.sea ? 0.4 : 2}
                fill={l.sea ? "#6f8f95" : "#8a8172"}
                className={l.sea ? "font-display italic" : "font-sans"}
              >
                {l.text}
              </text>
            );
          })}

          <rect
            x={INSET.x}
            y={INSET.y}
            width={INSET.w}
            height={INSET.h}
            rx="8"
            fill={SEA}
            stroke="#a69d8c"
            strokeWidth="0.8"
          />
          <Waterlines d={CANARY_PATH} />
          <path d={CANARY_PATH} fill={LAND} stroke="#46433e" strokeWidth="0.8" strokeLinejoin="round" />
          <text x={INSET.x + 8} y={INSET.y + 14} fontSize="8" letterSpacing="2" fill="#8a8172" className="font-sans">
            CANARIAS
          </text>

          <g transform={`translate(${scaleX} ${H - 22})`} className="font-mono" fontSize="8">
            <rect width={SCALE_PX / 2} height="4" fill="#46433e" />
            <rect x={SCALE_PX / 2} width={SCALE_PX / 2} height="4" fill={LAND} stroke="#46433e" strokeWidth="0.6" />
            <text y="-4" className="fill-iron">
              0
            </text>
            <text x={SCALE_PX} y="-4" textAnchor="end" className="fill-iron">
              {SCALE_KM} km
            </text>
          </g>
          <g transform={`translate(${scaleX - 22} ${H - 16})`}>
            <path d="M0 -14 L5 4 L0 0 L-5 4 Z" fill="#46433e" />
            <text y="16" textAnchor="middle" fontSize="8.5" className="fill-ink-soft font-sans font-semibold">
              N
            </text>
          </g>

          {items.map((i) => {
            const p = isCanary(i.lat, i.lon) ? projectCanary(i.lon, i.lat) : project(i.lon, i.lat);
            return (
              <circle
                key={i.id}
                cx={p.x}
                cy={p.y}
                r={3.8}
                fill={FAMILY_HEX[i.family]}
                stroke={LAND}
                strokeWidth="1.2"
                filter="url(#dot-shadow)"
              />
            );
          })}
        </svg>
      </Link>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-ink-soft" aria-label="Leyenda">
          {CATEGORIES.filter((c) => counts.get(c.id)).map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full ring-1 ring-card"
                style={{ backgroundColor: FAMILY_HEX[c.id] }}
                aria-hidden="true"
              />
              {c.shortLabel}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
