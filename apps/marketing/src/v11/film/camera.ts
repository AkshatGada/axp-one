// The camera. The stage is one continuous world (the conversation; on one side of it the agent that
// fits, on the other the receipt) laid out once at its closest size. Each beat has its own framing of
// that world; the camera travels between framings as the reader scrolls, and each framing is held
// while its object arrives. Framings are fitted to the measured boxes of the things they show, so
// they hold at any screen size. The world is only ever drawn at its laid-out size or smaller: text
// is never enlarged.
import { io } from "./timeline";

/** A box in world pixels (the world at scale 1). */
export type Box = { x: number; y: number; w: number; h: number };
/** What the camera looks at: the world point at the centre of the screen, and the scale. */
export type Shot = { cx: number; cy: number; s: number };
export type Key = { p: number; shot: Shot; ease: "io" | "lin" };

export type World = {
  screen: { w: number; h: number };
  /** One em of the world, in world pixels. */
  em: number;
  plate: Box;
  /** The question, in its place at the top of the conversation. */
  q1: Box;
  /** The answer (its small mark and its text). */
  a1: Box;
  /** The slot below the answer, where the card arrives. */
  slot1: Box;
  /** The sheet of the agent that fits. */
  sheet: Box;
  /** The quiet line under it: the others sit out. */
  others: Box;
  /** The receipt. */
  receipt: Box;
};

const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const union = (...bs: Box[]): Box => {
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map(right)) - x, h: Math.max(...bs.map(bottom)) - y };
};
const span = (x0: number, y0: number, x1: number, y1: number): Box => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

/** Fit a box in the screen with padding (screen pixels), never closer than scale 1. */
function fit(b: Box, scr: { w: number; h: number }, padX: number, padY: number, align: "centre" | "top" = "centre"): Shot {
  const s = Math.min(1, (scr.w - 2 * padX) / b.w, (scr.h - 2 * padY) / b.h);
  const cy = align === "top" ? b.y - padY / s + scr.h / (2 * s) : b.y + b.h / 2;
  return { cx: b.x + b.w / 2, cy, s };
}
const nudge = (f: Shot, k: number, dx = 0, dy = 0): Shot => ({ cx: f.cx + dx, cy: f.cy + dy, s: Math.min(1, f.s * k) });

/** The film's framings, as keys on the same progress the timeline uses. */
export function keys(w: World, compact: boolean): Key[] {
  const scr = w.screen;
  const k = (p: number, shot: Shot, ease: Key["ease"] = "io"): Key => ({ p, shot, ease });

  if (!compact) {
    // Wide. Close on the question; back for the answer; back again to take in the agent beside the
    // conversation; in on the place below the answer; then the conversation and its receipt.
    const asked = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.q1)), scr, 40, 30, "top");
    const answered = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.a1)), scr, 40, 26, "top");
    // The conversation on the left, the agent reading it on the right.
    const judged = fit(union(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.a1) + w.em), w.sheet, w.others), scr, 30, 24);
    // In on the slot. The frame starts just above the answer, clear of the question's last line,
    // and stops short of the agent's column, so nothing is cut by the edge.
    const plc = fit(span(w.plate.x, w.a1.y, w.sheet.x - w.em * 0.6, bottom(w.slot1) + 30), scr, 34, 24);
    const placed = { cx: Math.min(w.plate.x + w.plate.w / 2, w.sheet.x - w.em * 0.7 - scr.w / (2 * plc.s)), cy: w.a1.y - 24 / plc.s + scr.h / (2 * plc.s), s: plc.s };
    // The pair: the receipt, and beside it the answer with its card; top and foot level. The frame
    // starts in the gap under the question, so no line of it is cut, and ends at the plate's edge.
    const recorded = fit(union(span(w.plate.x, w.a1.y - w.em * 0.5, right(w.plate), bottom(w.plate) + w.em * 0.4), w.receipt), scr, 18, 12, "top");
    return [
      k(0, nudge(asked, 0.97)),
      k(0.06, asked, "lin"),
      k(0.145, nudge(asked, 1, 0, scr.h * 0.02), "lin"),
      k(0.238, nudge(answered, 1.03)),
      k(0.348, answered, "lin"),
      k(0.443, judged),
      k(0.595, nudge(judged, 1.015), "lin"),
      k(0.674, placed),
      k(0.795, placed),
      k(0.866, recorded),
      k(1, nudge(recorded, 1.012), "lin"),
    ];
  }

  // Narrow: the same world in one column (the agent above the conversation, the receipt below it),
  // so the camera only travels up and down. One subject at a time. The world is
  // laid out so that every one of these framings is drawn at its laid-out size (scale 1) on a
  // phone: what is set at 13.5px or more is read at 13.5px or more.
  const pad = Math.max(8, (scr.w - w.plate.w) / 2);
  const top = (b: Box, s: number, gap: number): Shot => ({ cx: b.x + b.w / 2, cy: b.y - gap / s + scr.h / (2 * s), s });
  const wide = Math.min(1, (scr.w - 2 * pad) / w.plate.w);
  const mid = w.plate.x + w.plate.w / 2;
  // The question sits just above the middle of the screen, where the eye lands; never so low that
  // the plate's head leaves a wide band of paper above it.
  const asked = { cx: mid, cy: Math.min(w.q1.y + w.q1.h / 2 + (scr.h * 0.1) / wide, w.plate.y - (scr.h * 0.16) / wide + scr.h / (2 * wide)), s: wide };
  // The answer: from the top of the plate if it fits; otherwise from the question down.
  const whole = span(w.plate.x, w.plate.y, right(w.plate), bottom(w.a1) + pad);
  const answered = whole.h + pad <= scr.h / wide ? top(w.plate, wide, pad) : { cx: mid, cy: bottom(w.a1) + (pad * 2) / wide - scr.h / (2 * wide), s: wide };
  // The agent's sheet, and under it the question it is reading (the head of the plate). The frame
  // ends in the white just under the question, so no line of the answer is cut by its edge.
  const reading = span(w.plate.x, w.sheet.y - 14, right(w.plate), bottom(w.q1) + 9);
  const judged = reading.h <= scr.h / wide ? { cx: mid, cy: bottom(reading) - scr.h / (2 * wide), s: wide } : fit(union(w.sheet, w.others), scr, pad, 12);
  // The slot, with the whole conversation above it when the screen has the room (so the question
  // is not cut by the frame's edge); otherwise from the answer down.
  const convo = span(w.plate.x, w.q1.y - 12, right(w.plate), bottom(w.plate) + 6);
  const placed = convo.h + pad <= scr.h / wide ? top(convo, wide, 0) : fit(span(w.plate.x, w.a1.y - 12, right(w.plate), bottom(w.slot1) + 24), scr, pad, pad);
  // The card and, directly under the plate, its receipt, when the screen has the room for both;
  // otherwise the receipt alone.
  const pair = span(w.plate.x, w.slot1.y - 12, right(w.plate), bottom(w.receipt));
  const recorded = pair.h + 14 <= scr.h / wide ? top(pair, wide, 0) : fit(w.receipt, scr, pad, 14);
  return [
    k(0, nudge(asked, 0.97)),
    k(0.06, asked, "lin"),
    k(0.145, nudge(asked, 1, 0, scr.h * 0.015), "lin"),
    k(0.238, answered),
    k(0.348, nudge(answered, 1, 0, scr.h * 0.01), "lin"),
    k(0.44, judged),
    k(0.595, nudge(judged, 1, 0, scr.h * 0.01), "lin"),
    k(0.676, placed),
    k(0.795, placed),
    k(0.866, recorded),
    k(1, nudge(recorded, 1, 0, scr.h * 0.006), "lin"),
  ];
}

/** The framing at a given progress. */
export function camera(ks: Key[], p: number): Shot {
  if (p <= ks[0]!.p) return ks[0]!.shot;
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i]!;
    if (p > b.p) continue;
    const a = ks[i - 1]!;
    const raw = (p - a.p) / (b.p - a.p || 1);
    const t = b.ease === "io" ? io(raw) : raw;
    return {
      cx: a.shot.cx + (b.shot.cx - a.shot.cx) * t,
      cy: a.shot.cy + (b.shot.cy - a.shot.cy) * t,
      s: a.shot.s * Math.pow(b.shot.s / a.shot.s, t),
    };
  }
  return ks[ks.length - 1]!.shot;
}
