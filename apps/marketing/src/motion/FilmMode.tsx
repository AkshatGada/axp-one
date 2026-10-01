"use client";

// ?film=1 scrolls the page through a fixed cue list so a screen recording is repeatable:
// hidden cursor, no hover tilt, the hero intro at t0. &from=<cue> starts at a named cue
// (hero, how, data, jev, solana, mvp, proof, close). ?still=1 (MotionRoot) renders every scene still instead.
import { useEffect } from "react";

type Cue = { name?: string; sel: string; at?: number; offset?: number; dur: number; hold: number; linear?: boolean };

const CUES: Cue[] = [
  { name: "hero", sel: "#top", dur: 0, hold: 3.6 },
  { sel: "#top", at: 1, dur: 10, hold: 2.4, linear: true },
  { name: "how", sel: "#how", dur: 2.4, hold: 0.6 },
  { sel: "#how", at: 1, dur: 5, hold: 2, linear: true },
  { name: "data", sel: "#data", dur: 2.6, hold: 4 },
  { name: "jev", sel: "#jev", dur: 2.6, hold: 4 },
  { name: "solana", sel: "#solana", dur: 2.6, hold: 0.6 },
  { sel: "#solana", at: 0.62, dur: 6, hold: 2, linear: true },
  { sel: "#solana", at: 1, dur: 2.4, hold: 3 },
  { name: "mvp", sel: "#mvp", dur: 2.6, hold: 3.4 },
  { name: "proof", sel: "#proof", dur: 2.6, hold: 3.4 },
  { name: "close", sel: "#close-title", offset: -260, dur: 3, hold: 5 },
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function targetY(c: Cue) {
  const el = document.querySelector<HTMLElement>(c.sel);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(0, el.offsetHeight - window.innerHeight);
  return top + (c.at ?? 0) * span + (c.offset ?? 0);
}

function glide(y: number, dur: number, linear = false) {
  const curve = linear ? (t: number) => t : ease;
  return new Promise<void>((resolve) => {
    if (dur <= 0) {
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      resolve();
      return;
    }
    if (window.__lenis) {
      window.__lenis.scrollTo(y, { duration: dur, easing: curve, force: true, lock: true, onComplete: () => resolve() });
      return;
    }
    const y0 = window.scrollY;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / (dur * 1000));
      window.scrollTo(0, y0 + (y - y0) * curve(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export default function FilmMode() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (!q.has("film")) return;
    document.documentElement.dataset.pxFilm = "1";
    let stop = false;
    const from = q.get("from");
    const start = Math.max(0, from ? CUES.findIndex((c) => c.name === from) : 0);
    void (async () => {
      await sleep(0.4);
      for (let i = start; i < CUES.length && !stop; i++) {
        const c = CUES[i]!;
        const y = targetY(c);
        if (y === null) continue;
        await glide(y, i === start ? 0 : c.dur, c.linear);
        await sleep(c.hold);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);
  return null;
}
