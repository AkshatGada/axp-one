// The camera. The stage is one continuous world (the conversation, the readers beside it, the
// receipt below them) laid out once at its closest size. Each beat has its own framing of that
// world; the camera travels between framings as the reader scrolls. Framings are fitted to the
// measured boxes of the things they show, so they hold at any screen size. The world is only ever
// drawn at its laid-out size or smaller: text is never enlarged.
import { io } from "./timeline";

/** A box in world pixels (the world at scale 1). */
export type Box = { x: number; y: number; w: number; h: number };
/** What the camera looks at: the world point at the centre of the screen, and the scale. */
export type Shot = { cx: number; cy: number; s: number };
export type Key = { p: number; shot: Shot; ease: "io" | "lin" };

export type World = {
  screen: { w: number; h: number };
  plate: Box;
  /** The question, in its place at the top of the conversation. */
  q1: Box;
  /** The answer (its small mark and its text). */
  a1: Box;
  /** The slot below the answer, where the card lands. */
  slot1: Box;
  /** The coda's slot. */
  slot2: Box;
  /** The readers, by AGENTS index. */
  readers: Box[];
  /** The height of the line above the row of readers (one unit of the world's furniture). */
  rail: number;
  /** The receipt. */
  receipt: Box;
  /** The coda's empty outline where a receipt would be. */
  none: Box;
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
  const all = union(...w.readers);
  const fitsOne = w.readers[0]!;
  const k = (p: number, shot: Shot, ease: Key["ease"] = "io"): Key => ({ p, shot, ease });

  if (!compact) {
    // Wide. Close on the question; back for the answer; across to the readers; in on the slot;
    // down to the receipt; and one wide look at the whole world for the coda.
    const asked = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.q1)), scr, 40, 30, "top");
    const answered = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.a1)), scr, 40, 26, "top");
    // The readers stand in a row beside the conversation; the camera travels across to them.
    const judged = fit(span(all.x - w.rail * 0.6, all.y - w.rail * 1.6, right(all), bottom(all)), scr, 30, 26);
    // In on the slot. The frame starts just above the answer, clear of the question's last line.
    const plc = fit(span(w.plate.x, w.a1.y, fitsOne.x - w.rail * 0.4, bottom(w.slot1) + 30), scr, 34, 24);
    // Centred on the plate, but never so wide that a reader's sheet is cut by the edge.
    const placed = { cx: Math.min(w.plate.x + w.plate.w / 2, fitsOne.x - w.rail * 0.5 - scr.w / (2 * plc.s)), cy: w.a1.y - 24 / plc.s + scr.h / (2 * plc.s), s: plc.s };
    // The receipt's frame starts below the answer's last line, so no line of it is cut by the edge.
    // The card and its receipt, side by side.
    const recTop = Math.max(bottom(w.a1), bottom(all)) + 8;
    const rec = fit(span(w.slot1.x - w.rail, recTop, right(w.receipt) + w.rail, bottom(w.receipt) + 26), scr, 26, 0);
    const recorded = { ...rec, cy: recTop + scr.h / (2 * rec.s) };
    // The coda: the readers again, then the conversation with the nearest reader and no receipt.
    const cod = fit(span(w.plate.x, w.plate.y, right(fitsOne) + w.rail * 0.3, Math.max(bottom(w.slot2), bottom(w.none)) + 24), scr, 30, 22);
    const coda = { ...cod, cx: Math.min(cod.cx, right(fitsOne) + w.rail * 0.36 - scr.w / (2 * cod.s)) };
    return [
      k(0, nudge(asked, 0.95)),
      k(0.05, asked, "lin"),
      k(0.122, nudge(asked, 1, 0, scr.h * 0.02), "lin"),
      k(0.2, nudge(answered, 1.05)),
      k(0.292, answered, "lin"),
      k(0.372, judged),
      k(0.496, nudge(judged, 1.03, scr.w * 0.012), "lin"),
      k(0.566, placed),
      k(0.676, placed),
      k(0.738, recorded),
      k(0.838, nudge(recorded, 1.02), "lin"),
      k(0.88, judged),
      k(0.926, nudge(judged, 1.02), "lin"),
      k(0.966, coda),
      k(1, nudge(coda, 0.985), "lin"),
    ];
  }

  // Narrow: the same world and the same moves in a tall frame, one subject at a time.
  // Close on the question: the plate fills the screen from edge to edge, the question at its heart.
  const qs = Math.min(1, scr.w / (w.plate.w * 0.95));
  const qc = { cx: w.plate.x + w.plate.w / 2, cy: w.plate.y - 10 / qs + scr.h / (2 * qs), s: qs };
  const answered = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.a1)), scr, 10, 12, "top");
  const judged = fit(all, scr, 12, 12);
  const leaving = { cx: fitsOne.x + fitsOne.w / 2, cy: bottom(fitsOne) + (scr.h * 0.04) / judged.s, s: judged.s };
  const placed = fit(span(w.plate.x, w.a1.y - 12, right(w.plate), bottom(w.slot1) + 30), scr, 10, 12);
  const rec = fit(span(w.receipt.x, fitsOne.y, right(w.receipt), bottom(w.receipt)), scr, 12, 14);
  const recorded = { ...rec, cy: fitsOne.y - 12 / rec.s + scr.h / (2 * rec.s) };
  const codaReaders = fit(union(all, w.none), scr, 12, 12);
  const coda = fit(span(w.plate.x, w.plate.y, right(w.plate), bottom(w.slot2) + 30), scr, 10, 12, "top");
  return [
    k(0, nudge(qc, 0.95)),
    k(0.05, qc, "lin"),
    k(0.122, nudge(qc, 1, 0, scr.h * 0.015), "lin"),
    k(0.2, nudge(answered, 1.04)),
    k(0.292, answered, "lin"),
    k(0.366, judged),
    k(0.5, nudge(judged, 1.02), "lin"),
    k(0.538, leaving),
    k(0.606, placed),
    k(0.676, placed),
    k(0.734, recorded),
    k(0.838, nudge(recorded, 1.02), "lin"),
    k(0.878, codaReaders),
    k(0.926, nudge(codaReaders, 1.02), "lin"),
    k(0.966, coda),
    k(1, nudge(coda, 0.985), "lin"),
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
