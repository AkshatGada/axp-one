// Geometry for the drawn connections. Positions are measured in the stage's own coordinates from
// layout offsets (not client rects), so entry transforms never skew them. Coordinates are snapped
// to half pixels so 2px strokes sit crisp at 1x and 2x.
import type { CapId, Decision, Gate } from "./local";

export type Box = { x: number; y: number; w: number; h: number };
export type Geo = { chips: Partial<Record<CapId, Box>>; tiles: Record<string, Box>; card: Box | null };
export type Pt = { x: number; y: number };
export type Wire = {
  id: string;
  d: string;
  /** Drawn at rest (there is room for a line), or only used as the path of a travelling pulse. */
  drawn: boolean;
  state: "on" | "off" | "clash" | "soft";
  cap?: CapId;
  tile: string;
  start: Pt;
  end: Pt;
  /** Direction the line arrives from, for the socket and the stop bar. */
  dir: "h" | "v";
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

const r = (n: number) => Math.round(n * 2) / 2;
const ROOM = 26; // least room for a drawn line
const STOP = 9; // a blocked line ends this far short of the tile

/** Lines from capability chips to the questions that ask for them (or rule them out). */
export function capWires(geo: Geo, decisions: Decision[]): Wire[] {
  const boxes = Object.values(geo.tiles);
  if (!boxes.length) return [];
  const left = Math.min(...boxes.map((b) => b.x));
  const near = boxes.filter((b) => b.x < left + 8).sort((a, b) => a.y - b.y); // the column beside the chips
  const out: Wire[] = [];
  for (const dec of decisions) {
    const t = geo.tiles[dec.id];
    if (!t) continue;
    dec.links.forEach((ln, k) => {
      const c = geo.chips[ln.cap];
      if (!c) return;
      const id = `${ln.cap}-${dec.id}`;
      const state = ln.clash ? "clash" : ln.met ? "on" : "off";
      const sx = r(c.x + c.w);
      const sy = r(c.y + c.h / 2);
      const base = { id, state, cap: ln.cap, tile: dec.id } as const;
      if (t.x - sx < ROOM) {
        const ex = r(t.x + t.w / 2);
        const ey = r(t.y + 6);
        out.push({ ...base, d: `M${r(c.x + c.w / 2)} ${r(c.y + c.h)} L${ex} ${ey}`, drawn: false, start: { x: sx, y: sy }, end: { x: ex, y: ey }, dir: "v" });
        return;
      }
      const n = dec.links.length;
      const tx = r(t.x - (ln.clash ? STOP : 0));
      if (t.x < left + 8) {
        // Spread arrivals down the tile's edge, a little inside its corners.
        const pad = Math.min(22, t.h / 4);
        const ey = r(n === 1 ? t.y + t.h / 2 : t.y + pad + ((t.h - 2 * pad) * k) / (n - 1));
        const dx = Math.max(14, (tx - sx) * 0.52);
        out.push({ ...base, d: `M${sx} ${sy} C${r(sx + dx)} ${sy} ${r(tx - dx)} ${ey} ${tx} ${ey}`, drawn: true, start: { x: sx, y: sy }, end: { x: tx, y: ey }, dir: "h" });
        return;
      }
      // A tile in the far column: run through the lane between (or below) the near column's tiles.
      const lanes: number[] = [];
      near.forEach((b, i) => {
        const next = near[i + 1];
        lanes.push(next ? (b.y + b.h + next.y) / 2 : b.y + b.h + 11);
      });
      const mid = t.y + t.h / 2;
      const lane = lanes.reduce((best, y) => (Math.abs(y - mid) < Math.abs(best - mid) ? y : best), lanes[0] ?? mid);
      const ly = r(lane + (k - (n - 1) / 2) * 4);
      // Past the near column the bundle opens out, so each line plugs into its own socket.
      const ey = r(Math.min(t.y + t.h - 16, Math.max(t.y + 16, lane + (k - (n - 1) / 2) * 12)));
      const ax = r(left - 6);
      const bx = r(Math.max(...near.map((b) => b.x + b.w)) + 1);
      const dx = (ax - sx) * 0.6;
      const fx = (tx - bx) * 0.5;
      out.push({ ...base, d: `M${sx} ${sy} C${r(sx + dx)} ${sy} ${r(ax - dx)} ${ly} ${ax} ${ly} L${bx} ${ly} C${r(bx + fx)} ${ly} ${r(tx - fx)} ${ey} ${tx} ${ey}`, drawn: true, start: { x: sx, y: sy }, end: { x: tx, y: ey }, dir: "h" });
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
    const base = { id: `words-${dec.id}`, state: gate !== "running" ? "off" : dec.verdict === "joined" ? "on" : "soft", tile: dec.id } as const;
    const ex = r(t.x + t.w);
    const ey = r(t.y + t.h - 33); // the slot's centre line
    if (card.x - ex >= ROOM) {
      const cx = r(card.x);
      const sy = r(Math.min(card.y + card.h - 18, Math.max(card.y + 18, card.y + card.h / 2 + (i - (targets.length - 1) / 2) * 20)));
      const dx = (cx - ex) * 0.5;
      return [{ ...base, d: `M${cx} ${sy} C${r(cx - dx)} ${sy} ${r(ex + dx)} ${ey} ${ex} ${ey}`, drawn: true, start: { x: cx, y: sy }, end: { x: ex, y: ey }, dir: "h" } as Wire];
    }
    // Stacked: the card sits under the field. A short riser from the card's top edge to the tile
    // above it, when the tile is over the card and close; otherwise only a pulse travels.
    const below = card.y >= t.y + t.h;
    const vx = r(t.x + t.w * (0.62 + 0.2 * i));
    const over = vx > card.x + 12 && vx < card.x + card.w - 12;
    const by = r(t.y + t.h);
    if (below && over && card.y - by < 260) {
      const cy = r(card.y);
      return [{ ...base, d: `M${vx} ${cy} L${vx} ${by}`, drawn: true, start: { x: vx, y: cy }, end: { x: vx, y: by }, dir: "v" } as Wire];
    }
    const sx = r(card.x + card.w / 2);
    return [{ ...base, d: `M${sx} ${r(below ? card.y : card.y + card.h)} L${r(t.x + t.w / 2)} ${r(below ? t.y + t.h - 6 : t.y + 6)}`, drawn: false, start: { x: sx, y: card.y }, end: { x: ex, y: ey }, dir: "v" } as Wire];
  });
}
