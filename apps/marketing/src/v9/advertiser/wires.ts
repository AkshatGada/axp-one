// Geometry for the drawn connections. Positions are measured in the stage's own coordinates from
// layout offsets (not client rects), so entry transforms never skew them. Coordinates are snapped
// to half pixels so 2px strokes sit crisp at 1x and 2x.
//
// The picture: every capability chip has a short stub into one trunk that runs down a clear lane
// beside the chips. From the trunk one branch runs to each question that depends on what is
// listed, entering the tile on its left edge at mid height. A stub is dotted while its capability
// is not listed; a branch is dotted while something the question needs is missing, and ends in a
// stop mark on the tile's edge where the question rules a listed capability out.
import type { CapId, Decision, Gate } from "./local";

export type Box = { x: number; y: number; w: number; h: number };
export type Geo = { chips: Partial<Record<CapId, Box>>; tiles: Record<string, Box>; card: Box | null };
export type LineState = "on" | "off" | "clash" | "soft";
export type Seg = { id: string; d: string; state: LineState; part: "stub" | "trunk" | "branch" | "words"; cap?: CapId; tile?: string };
export type Route = { id: string; d: string; cap: CapId; tile: string; drawn: boolean };
export type Plug = { id: string; x: number; y: number; state: LineState; tile: string };

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
const LANE = 40; // least width of the lane for the trunk to be drawn
const R = 9; // corner radius

/** An orthogonal path through the given points, with rounded corners. */
function ortho(pts: [number, number][]): string {
  let d = `M${r(pts[0]![0])} ${r(pts[0]![1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    const next = pts[i + 1];
    if (!next) {
      d += ` L${r(x)} ${r(y)}`;
      break;
    }
    const [px, py] = pts[i - 1]!;
    const inLen = Math.hypot(x - px, y - py);
    const outLen = Math.hypot(next[0] - x, next[1] - y);
    const k = Math.min(R, inLen / 2, outLen / 2);
    if (k < 1) continue;
    const ax = x - ((x - px) / inLen) * k;
    const ay = y - ((y - py) / inLen) * k;
    const bx = x + ((next[0] - x) / outLen) * k;
    const by = y + ((next[1] - y) / outLen) * k;
    d += ` L${r(ax)} ${r(ay)} Q${r(x)} ${r(y)} ${r(bx)} ${r(by)}`;
  }
  return d;
}

/** Stubs, trunk and branches, the routes a pulse can take, and where lines meet the tiles. */
export function capNet(geo: Geo, decisions: Decision[], has: Set<CapId>): { segs: Seg[]; routes: Route[]; plugs: Plug[] } {
  const chips = Object.entries(geo.chips) as [CapId, Box][];
  const tiles = decisions.map((dec) => ({ dec, t: geo.tiles[dec.id] })).filter((x): x is { dec: Decision; t: Box } => !!x.t);
  if (!chips.length || !tiles.length) return { segs: [], routes: [], plugs: [] };
  const right = Math.max(...chips.map(([, c]) => c.x + c.w));
  const left = Math.min(...tiles.map(({ t }) => t.x));
  const lane = left - right;
  const drawn = lane >= LANE;
  const bus = r(right + Math.min(34, Math.max(18, lane * 0.4)));
  const segs: Seg[] = [];
  const routes: Route[] = [];
  const plugs: Plug[] = [];
  const mid = (b: Box) => r(b.y + b.h / 2);
  const branches = tiles.filter(({ dec }) => dec.branch);

  if (drawn) {
    const ys = [...chips.filter(([id]) => has.has(id)).map(([, c]) => mid(c)), ...branches.map(({ t }) => mid(t))];
    const top = Math.min(...ys);
    const bot = Math.max(...ys);
    // The trunk, with its two ends turned into whatever joins it there.
    segs.push({ id: "trunk", part: "trunk", state: "on", d: `M${bus} ${r(top + R)} L${bus} ${r(bot - R)}` });
    const turn = (y: number) => (y === top ? r(y + R) : y === bot ? r(y - R) : y);
    for (const [id, c] of chips) {
      const y = mid(c);
      const sx = r(c.x + c.w);
      const on = has.has(id);
      const end = on && (y === top || y === bot);
      segs.push({ id: `stub-${id}`, part: "stub", cap: id, state: on ? "on" : "off", d: end ? `M${sx} ${y} L${r(bus - R)} ${y} Q${bus} ${y} ${bus} ${turn(y)}` : `M${sx} ${y} L${r(bus - (on ? 0 : 5))} ${y}` });
    }
    for (const { dec, t } of branches) {
      const y = mid(t);
      const tx = r(t.x);
      const end = y === top || y === bot;
      segs.push({ id: `branch-${dec.id}`, part: "branch", tile: dec.id, state: dec.branch!, d: end ? `M${bus} ${turn(y)} Q${bus} ${y} ${r(bus + R)} ${y} L${tx} ${y}` : `M${bus} ${y} L${tx} ${y}` });
      plugs.push({ id: `plug-${dec.id}`, x: tx, y, state: dec.branch!, tile: dec.id });
    }
  }
  for (const { dec, t } of branches) {
    for (const cap of dec.caps) {
      const c = geo.chips[cap];
      if (!c) continue;
      const d = drawn
        ? ortho([[c.x + c.w, mid(c)], [bus, mid(c)], [bus, mid(t)], [t.x, mid(t)]])
        : `M${r(c.x + c.w / 2)} ${r(c.y + c.h)} L${r(t.x + t.w / 2)} ${r(t.y + 6)}`;
      routes.push({ id: `${cap}-${dec.id}`, cap, tile: dec.id, d, drawn });
    }
  }
  return { segs, routes, plugs };
}

/** Lines from the approved card to the slots where it appears (or would). */
export function wordNet(geo: Geo, decisions: Decision[], gate: Gate): { segs: Seg[]; plugs: Plug[]; paths: string[] } {
  const card = geo.card;
  const segs: Seg[] = [];
  const plugs: Plug[] = [];
  const paths: string[] = [];
  if (!card) return { segs, plugs, paths };
  const targets = decisions.filter((d) => d.eligible);
  targets.forEach((dec, i) => {
    const t = geo.tiles[dec.id];
    if (!t) return;
    const state: LineState = gate !== "running" ? "off" : dec.verdict === "joined" ? "on" : "soft";
    const ex = r(t.x + t.w);
    const ey = r(t.y + t.h - 31); // the slot's centre line
    const id = `words-${dec.id}`;
    if (card.x - ex >= LANE) {
      const cx = r(card.x);
      const sy = r(Math.min(card.y + card.h - 20, Math.max(card.y + 20, card.y + card.h / 2 + (i - (targets.length - 1) / 2) * 22)));
      const mx = r((cx + ex) / 2 + (i - (targets.length - 1) / 2) * 10);
      const d = ortho([[cx, sy], [mx, sy], [mx, ey], [ex, ey]]);
      segs.push({ id, part: "words", tile: dec.id, state, d });
      plugs.push({ id: `plug-${id}`, x: ex, y: ey, state, tile: dec.id });
      paths.push(d);
      return;
    }
    // Stacked: the card sits under the field. A short riser from the card's top edge to the tile
    // directly above it; otherwise only a pulse travels.
    const below = card.y >= t.y + t.h;
    const vx = r(t.x + t.w * (0.66 + 0.18 * i));
    const by = r(t.y + t.h);
    if (below && vx > card.x + 12 && vx < card.x + card.w - 12 && card.y - by < 260) {
      const d = `M${vx} ${r(card.y)} L${vx} ${by}`;
      segs.push({ id, part: "words", tile: dec.id, state, d });
      plugs.push({ id: `plug-${id}`, x: vx, y: by, state, tile: dec.id });
      paths.push(d);
      return;
    }
    paths.push(`M${r(card.x + card.w / 2)} ${r(below ? card.y : card.y + card.h)} L${r(t.x + t.w / 2)} ${r(below ? t.y + t.h - 6 : t.y + 6)}`);
  });
  return { segs, plugs, paths };
}
