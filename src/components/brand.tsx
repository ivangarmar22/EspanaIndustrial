import Link from "next/link";
import { site } from "@/config/site";

/** Headframe: tower with cross-bracing, sheave wheel on top and the inclined back leg. */
const HEADFRAME = "M17.6 17.5 L13 37 M24.4 17.5 L29 37 M16.6 17.5 H25.4 M15.4 27 H26.6 M25.4 13.8 L36 37 M11 37 H37";
const BRACING = "M17.6 17.5 L26.6 27 M24.4 17.5 L15.4 27 M15.4 27 L29 37 M26.6 27 L13 37";
const RIVETS: Array<[number, number]> = [
  [9, 9],
  [39, 9],
  [9, 39],
  [39, 39],
];

/**
 * Brand mark: a cast-iron maker’s plate with a mine headframe (castillete) in
 * relief. Plain SVG with fixed colours, so the same drawing serves the site and
 * the favicons. `id` keeps gradient ids unique when the mark appears twice on a page.
 */
export function PlateMark({ id = "plate", className, size }: { id?: string; className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#bd5a2c" />
          <stop offset="0.55" stopColor="#9e4320" />
          <stop offset="1" stopColor="#7a3216" />
        </linearGradient>
        <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d9c3" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#f6d9c3" stopOpacity="0.15" />
          <stop offset="1" stopColor="#3b1709" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="10" fill={`url(#${id}-face)`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx="9.5" fill="none" stroke="#5c240e" strokeOpacity="0.55" />
      <rect x="4.5" y="4.5" width="39" height="39" rx="7" fill="none" stroke={`url(#${id}-bevel)`} strokeWidth="1.3" />
      {RIVETS.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy + 0.5} r="1.45" fill="#3b1709" fillOpacity="0.45" />
          <circle cx={cx} cy={cy} r="1.35" fill="#e9b48f" />
          <circle cx={cx - 0.4} cy={cy - 0.4} r="0.5" fill="#fff4ea" />
        </g>
      ))}
      {/* Relief: a dark copy offset downwards, then the raised drawing on top. */}
      <g
        fill="none"
        stroke="#3b1709"
        strokeOpacity="0.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 0.9)"
      >
        <circle cx="21" cy="12.5" r="4.6" strokeWidth="2.4" />
        <path d={HEADFRAME} strokeWidth="2.4" />
        <path d={BRACING} strokeWidth="1.4" />
      </g>
      <g fill="none" stroke="#fbf3e8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="21" cy="12.5" r="4.6" strokeWidth="2.2" />
        <path d={HEADFRAME} strokeWidth="2.2" />
        <path d={BRACING} strokeWidth="1.3" />
      </g>
      <circle cx="21" cy="12.5" r="1.5" fill="#fbf3e8" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 text-ink no-underline"
      aria-label={`${site.name}, inicio`}
    >
      <PlateMark
        id="mark-header"
        className="size-10 shrink-0 drop-shadow-[0_2px_3px_rgba(60,24,8,0.3)] transition-transform group-hover:-rotate-3"
      />
      {/* Without the subtitle (below sm) the cap height sits 2px high against the plate; nudge it down. */}
      <span className="flex flex-col leading-none max-sm:translate-y-0.5">
        <span className="font-display text-[1.15rem] font-semibold tracking-tight whitespace-nowrap xs:text-[1.35rem]">
          España <span className="font-medium text-rust italic">Industrial</span>
        </span>
        <span className="signage mt-1 hidden text-[0.6rem] whitespace-nowrap text-iron sm:block">
          Atlas del patrimonio industrial
        </span>
      </span>
    </Link>
  );
}
