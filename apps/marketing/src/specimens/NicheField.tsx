// The ContextHint library as a field of niche squares: one square per niche, filled when it has
// ads, outlined when it has none. The layout is illustrative; the counts are actual.
import type { CSSProperties } from "react";
import { LIBRARY } from "@/data/library";

export const FIELD_COLS = 46;
const CELL = 14;
const GAP = 4;
/** Where the run's niche sits in the (illustrative) layout. */
export const HIT_INDEX = 612;

export function fieldCell(i: number) {
  const c = i % FIELD_COLS;
  const r = Math.floor(i / FIELD_COLS);
  return { x: c * (CELL + GAP), y: r * (CELL + GAP), c, r };
}

/** A fixed, even spread of the niches that have no ads (deterministic, illustrative). */
function emptySet(total: number, empty: number) {
  const s = new Set<number>();
  for (let k = 0; k < empty; k++) s.add(Math.floor(((k + 0.5) * total) / empty + ((k * 37) % 23)) % total);
  s.delete(HIT_INDEX);
  return s;
}

export function NicheField({ highlight = true, reveal = true, className, style }: { highlight?: boolean; reveal?: boolean; className?: string; style?: CSSProperties }) {
  const total = LIBRARY.niches;
  const empty = emptySet(total, LIBRARY.niches - LIBRARY.nichesWithAds);
  const rows = Math.ceil(total / FIELD_COLS);
  const w = FIELD_COLS * (CELL + GAP) - GAP;
  const h = rows * (CELL + GAP) - GAP;
  const hit = fieldCell(HIT_INDEX);
  const byRow: number[][] = Array.from({ length: rows }, () => []);
  for (let i = 0; i < total; i++) byRow[Math.floor(i / FIELD_COLS)]!.push(i);
  return (
    <div className={`sp-field${className ? ` ${className}` : ""}`} data-reveal={reveal ? "" : undefined} style={style}>
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} role="img" aria-label={`${total} niche squares, ${LIBRARY.nichesWithAds} with ads`}>
        {byRow.map((cells, r) => (
          <g key={r} className="row" style={{ "--r": r } as CSSProperties}>
            {cells.map((i) => {
              const { x, y } = fieldCell(i);
              const cls = highlight && i === HIT_INDEX ? "hit" : empty.has(i) ? "o" : "f";
              return <rect key={i} className={cls} x={cls === "o" ? x + 0.5 : x} y={cls === "o" ? y + 0.5 : y} width={cls === "o" ? CELL - 1 : CELL} height={cls === "o" ? CELL - 1 : CELL} data-niche={i === HIT_INDEX ? "run" : undefined} />;
            })}
          </g>
        ))}
        {highlight ? <rect className="ring" x={hit.x - 4} y={hit.y - 4} width={CELL + 8} height={CELL + 8} /> : null}
      </svg>
      <div className="sp-field-legend">
        <span>
          <i style={{ background: "var(--silver)" }} />
          Niche with ads
        </span>
        <span>
          <i style={{ border: "1px solid var(--steel)" }} />
          No ads recorded
        </span>
        {highlight ? (
          <span>
            <i style={{ background: "var(--ink)" }} />
            The niche in our run
          </span>
        ) : null}
      </div>
    </div>
  );
}
