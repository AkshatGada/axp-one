"use client";

// The Exploded Card: six plates on a dashed steel route, drawn with 2D plate matrices (no
// preserve-3d). A pure function of four progress values, so the hero (scroll), the closing
// (reversed) and the showcase (a scrubber) all drive the same drawing:
//   tilt     0 flat sheet -> 1 plate laid on the table
//   explode  0 one stack  -> 1 six plates apart on the route
//   callouts 0 hidden     -> 1 leader lines and labels drawn
//   marker   0 at Card    -> 1 at Payment (Illustrative)
import { Provenance } from "@axp/design-system/foundation";
import { CALLOUTS, PLATES, PlateSheet } from "./plates";
import { IDENTITY, PLATE_M, css, mixM, mul, translate, type M2 } from "@/motion/motion";

export const STACK_W = 1320;
export const STACK_H = 1040;
const PW = 520;
const PH = 270;
const GAP = 150;
const CX = STACK_W / 2;
const CY = STACK_H / 2 + 10;

const apply = (m: M2, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] as const;

export function plateY(i: number, explode: number) {
  return (i - (PLATES.length - 1) / 2) * GAP * explode;
}

export function PlateStack({ tilt = 1, explode = 1, callouts = 1, marker = -1, scale = 1, lift = 0 }: { tilt?: number; explode?: number; callouts?: number; marker?: number; scale?: number; lift?: number }) {
  const base = mixM(IDENTITY, PLATE_M, tilt);
  const n = PLATES.length;
  const ys = PLATES.map((_, i) => plateY(i, explode) * scale + lift);
  const y1 = ys[1]!;
  const y5 = ys[n - 1]!;
  return (
    <div className="sc-stack" aria-hidden>
      {/* The route runs through every plate's centre. */}
      <i className="sc-route mh-route" style={{ left: CX, top: CY + ys[0]!, height: Math.max(0, ys[n - 1]! - ys[0]!), opacity: explode > 0.05 ? 1 : 0 }} />
      {PLATES.map((p, i) => {
        const m = mul(translate(0, ys[i]!), mul([scale, 0, 0, scale, 0, 0], base));
        return (
          <div key={p.id} className="sc-plate" style={{ left: CX - PW / 2, top: CY - PH / 2, transform: css(m), zIndex: n - i }}>
            <PlateSheet p={p} />
          </div>
        );
      })}
      {CALLOUTS.map((c, i) => {
        const side = i % 2 === 0 ? "right" : "left";
        const m = mul(translate(0, ys[i]!), mul([scale, 0, 0, scale, 0, 0], base));
        const [ex, ey] = apply(m, side === "right" ? PW / 2 : -PW / 2, 0);
        const ax = CX + ex;
        const ay = CY + ey;
        const tx = side === "right" ? CX + 400 : CX - 400;
        const local = Math.min(1, Math.max(0, callouts * (n + 1) - i));
        const len = Math.max(0, Math.abs(tx - ax) - 14);
        return (
          <div key={c.id} style={{ opacity: local, transition: "opacity .2s linear" }}>
            <i className="sc-leader" data-side={side} style={{ left: side === "right" ? ax : tx + 14, top: ay, width: len, transform: `scaleX(${local})`, transformOrigin: side === "right" ? "0 0" : "100% 0" }} />
            <div className="sc-callout" data-side={side} style={{ left: side === "right" ? tx + 18 : tx - 18 - 270, top: ay - 16 }}>
              <span className="px-marks">
                {c.kinds.map((k) => (
                  <Provenance key={k} kind={k} />
                ))}
              </span>
              <span className="sc-callout-title">{c.title}</span>
              <p className="sc-callout-body">{c.body}</p>
            </div>
          </div>
        );
      })}
      {marker >= 0 ? (
        <i className="sc-marker mh-glyph" style={{ left: CX, top: CY + y1 + (y5 - y1) * marker, zIndex: n + 1 }}>
          <span className="sc-marker-tag">
            <Provenance kind="illustrative" />
          </span>
        </i>
      ) : null}
    </div>
  );
}

/** Static sequence: the same plates and callout words, flat, for small screens and reduced motion. */
export function PlateStackStatic() {
  return (
    <div className="sc-stack-static">
      {PLATES.map((p, i) => (
        <div key={p.id} className="sc-row">
          <PlateSheet p={p} />
          <div className="sc-callout" style={{ position: "static", width: "auto" }}>
            <span className="sc-callout-title">{CALLOUTS[i]!.title}</span>
            <p className="sc-callout-body">{CALLOUTS[i]!.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
