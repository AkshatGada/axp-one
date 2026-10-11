// Geometry for the drawn connections. Positions are measured in the stage's own coordinates from
// layout offsets (not client rects), so entry transforms never skew them.
import type { CapId, Decision, Gate } from "./local";

export type Box = { x: number; y: number; w: number; h: number };
export type Geo = { chips: Partial<Record<CapId, Box>>; tiles: Record<string, Box>; card: Box | null };
export type Wire = {
  id: string;
  d: string;
  /** Drawn at rest (there is room for a line), or only used as the path of a travelling pulse. */
  drawn: boolean;
  state: "on" | "off" | "clash" | "soft";
  cap?: CapId;
  tile: string;
  end: { x: number; y: number };
};

export function boxOf(el: HTMLElement, stage: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== stage) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const r = (n: number) => Math.round(n * 10) / 10;
const ROOM = 28; // least horizontal room for a drawn line

/** Lines from capability chips to the questions that ask for them (or rule them out). */
export function capWires(geo: Geo, decisions: Decision[]): Wire[] {
  const boxes = Object.values(geo.tiles);
  if (!boxes.length) return [];
  const left = Math.min(...boxes.map((b) => b.x));
  const near = boxes.filter((b) => b.x < left + 8).sort((a, b) => a.y - b.y); // the column beside the brief
  const out: Wire[] = [];
  for (const dec of decisions) {
    const t = geo.tiles[dec.id];
    if (!t) continue;
    dec.links.forEach((ln, k) => {
      const c = geo.chips[ln.cap];
      if (!c) return;
      const id = `${ln.cap}-${dec.id}`;
      const state = ln.clash ? "clash" : ln.met ? "on" : "off";
      const sx = c.x + c.w;
      const sy = c.y + c.h / 2;
      if (t.x - sx < ROOM) {
        // Stacked layout: no room for a line at rest; a pulse still travels from chip to tile.
        const ex = t.x + t.w / 2;
        const ey = t.y + 6;
        out.push({ id, d: `M${r(c.x + c.w / 2)} ${r(c.y + c.h)} L${r(ex)} ${r(ey)}`, drawn: false, state, cap: ln.cap, tile: dec.id, end: { x: ex, y: ey } });
        return;
      }
      const n = dec.links.length;
      if (t.x < left + 8) {
        const ey = t.y + (t.h * (k + 1)) / (n + 1);
        const dx = (t.x - sx) * 0.5;
        out.push({ id, d: `M${r(sx)} ${r(sy)} C${r(sx + dx)} ${r(sy)} ${r(t.x - dx)} ${r(ey)} ${r(t.x)} ${r(ey)}`, drawn: true, state, cap: ln.cap, tile: dec.id, end: { x: t.x, y: ey } });
        return;
      }
      // A tile in the far column: run through the lane between (or below) the near column's tiles.
      const lanes: number[] = [];
      near.forEach((b, i) => {
        const next = near[i + 1];
        lanes.push(next ? (b.y + b.h + next.y) / 2 : b.y + b.h + 10);
      });
      const mid = t.y + t.h / 2;
      const lane = lanes.reduce((best, y) => (Math.abs(y - mid) < Math.abs(best - mid) ? y : best), lanes[0] ?? mid);
      const ey = Math.min(t.y + t.h - 12, Math.max(t.y + 12, lane + (k - (n - 1) / 2) * 3.5));
      const ax = left - 10;
      const dx = (ax - sx) * 0.55;
      out.push({ id, d: `M${r(sx)} ${r(sy)} C${r(sx + dx)} ${r(sy)} ${r(ax - dx)} ${r(ey)} ${r(ax)} ${r(ey)} L${r(t.x)} ${r(ey)}`, drawn: true, state, cap: ln.cap, tile: dec.id, end: { x: t.x, y: ey } });
    });
  }
  return out;
}

/** Lines from the approved card to the slots where it may appear. */
export function wordWires(geo: Geo, decisions: Decision[], gate: Gate): Wire[] {
  const card = geo.card;
  if (!card) return [];
  const targets = decisions.filter((d) => d.eligible);
  return targets.flatMap((dec, i) => {
    const t = geo.tiles[dec.id];
    if (!t) return [];
    const id = `words-${dec.id}`;
    const state = gate !== "running" ? "off" : dec.verdict === "joined" ? "on" : "soft";
    const ex = t.x + t.w;
    const ey = t.y + t.h - 33; // the slot's centre line
    if (card.x - ex < ROOM) {
      const sx = card.x + card.w / 2;
      const up = card.y > t.y;
      return [{ id, d: `M${r(sx)} ${r(up ? card.y : card.y + card.h)} L${r(t.x + t.w / 2)} ${r(up ? t.y + t.h - 6 : t.y + 6)}`, drawn: false, state, tile: dec.id, end: { x: ex, y: ey } } as Wire];
    }
    const sy = Math.min(card.y + card.h - 16, Math.max(card.y + 16, card.y + card.h / 2 + (i - (targets.length - 1) / 2) * 18));
    const dx = (card.x - ex) * 0.5;
    return [{ id, d: `M${r(card.x)} ${r(sy)} C${r(card.x - dx)} ${r(sy)} ${r(ex + dx)} ${r(ey)} ${r(ex)} ${r(ey)}`, drawn: true, state, tile: dec.id, end: { x: ex, y: ey } } as Wire];
  });
}
