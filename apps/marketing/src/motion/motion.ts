// The landing page's motion maths (ported from the ContextHint home v4 craft, restyled for AXP).
// Every scene is scrubbed by scroll through these helpers; every pinned scene is paced in
// viewport heights: an enter, a hold per beat, an exit.

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Progress of `p` through [a, b], clamped to 0..1. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Ease-out cubic: entrances and camera settles. */
export const out = (t: number) => 1 - Math.pow(1 - t, 3);
/** Ease-in-out cubic: scene hand-offs and camera moves. */
export const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pinned-scene pacing, in viewport heights: enter + beats x hold + exit. */
export function sceneHeight(beats: number, { hold = 0.85, enter = 0.35, exit = 0.45 } = {}) {
  return `${Math.round((1 + enter + beats * hold + exit) * 100)}vh`;
}

/** A 2D affine matrix [a, b, c, d, e, f] as used by CSS matrix(). */
export type M2 = [number, number, number, number, number, number];
export const IDENTITY: M2 = [1, 0, 0, 1, 0, 0];
const rad = (d: number) => (d * Math.PI) / 180;
export function mul(m: M2, n: M2): M2 {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
export const rotate = (deg: number): M2 => [Math.cos(rad(deg)), Math.sin(rad(deg)), -Math.sin(rad(deg)), Math.cos(rad(deg)), 0, 0];
export const skewX = (deg: number): M2 => [1, 0, Math.tan(rad(deg)), 1, 0, 0];
export const scale = (x: number, y = x): M2 => [x, 0, 0, y, 0, 0];
export const translate = (x: number, y: number): M2 => [1, 0, 0, 1, x, y];
/** The isometric top-face plate: a flat sheet laid on a table seen from the corner. */
export const ISO: M2 = mul(scale(1, 0.86062), mul(skewX(-30), rotate(30)));
export const mixM = (a: M2, b: M2, t: number): M2 => a.map((v, i) => lerp(v, b[i]!, t)) as M2;
export const css = (m: M2) => `matrix(${m.map((v) => (Math.abs(v) < 1e-6 ? 0 : +v.toFixed(5))).join(",")})`;

/** The plate matrix used by the Exploded Card: a sheet laid on the table, seen from the front right.
 *  Squashed to 66% height, sheared 26 degrees and turned 4 degrees: text stays horizontal and legible. */
export const PLATE_M: M2 = mul(rotate(-4), mul(skewX(-26), scale(1, 0.66)));
