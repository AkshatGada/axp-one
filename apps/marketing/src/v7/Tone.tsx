"use client";

// v7: one continuous story. The page has a single fixed background layer whose colour follows the
// scroll: each section names its world (data-world) and, across every seam, the colour blends from
// one world into the next over about 60vh (no slab edges). Sections drop their own backgrounds once
// this runs (html[data-px-tone="on"]); without JS each section keeps its own colour.
//
// It also carries the story's one persistent object through the three pillar chapters: the live
// run's question, as a small token at the top right, whose state and tint change as it crosses
// each world: ContextHint finds its evidence, Jev judges it, Solana settles it.
import { useEffect, useRef, useState } from "react";
import { CACHED } from "@/data/run";
import { SPINE } from "@/data/copy";
import s from "./tone.module.css";

const WORLDS: Record<string, [number, number, number]> = {
  paper: [244, 242, 236],
  paper2: [236, 235, 228],
  stage: [10, 14, 42],
  ch: [246, 90, 32],
  brand: [43, 59, 255],
  sol: [153, 69, 255],
};
/** Each world's own type colour: ink on the light worlds, white on the deep ones. */
const INK: Record<string, [number, number, number]> = { paper: [14, 18, 32], paper2: [14, 18, 32], ch: [14, 18, 32], stage: [255, 255, 255], brand: [255, 255, 255], sol: [255, 255, 255] };
/* Readability at the seams. The layer's colour is the browser's OKLCH mix; the same mix is computed
   here (sRGB to OKLab/OKLCH and back) to read the contrast between each world's type and the colour
   actually behind it. Copy marked [data-tone-text] fades while that contrast is too low (under about
   2.3:1) and is fully shown from about 3.5:1, so a headline never sits on the wrong world's colour. */
const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function oklch([r, g, b]: [number, number, number]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
  return [L, Math.hypot(A, Bb), Math.atan2(Bb, A)] as const;
}
/** Relative luminance of the OKLCH mix of a and b at t (shorter hue), clipped to sRGB. */
function mixY(a: [number, number, number], b: [number, number, number], t: number) {
  const [L1, C1, h1] = oklch(a);
  const [L2, C2, h2] = oklch(b);
  let dh = h2 - h1;
  if (dh > Math.PI) dh -= 2 * Math.PI;
  if (dh < -Math.PI) dh += 2 * Math.PI;
  const L = L1 + (L2 - L1) * t, C = C1 + (C2 - C1) * t, h = h1 + dh * t;
  const A = C * Math.cos(h), Bb = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * Bb) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * Bb) ** 3;
  const q = (L - 0.0894841775 * A - 1.291485548 * Bb) ** 3;
  const k = (x: number) => Math.min(1, Math.max(0, x));
  return 0.2126 * k(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q) + 0.7152 * k(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q) + 0.0722 * k(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q);
}
const lum = ([r, g, b]: [number, number, number]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (y1: number, y2: number) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
/** Blend in OKLCH along the shorter hue path, so a seam passes through vivid colour, not mud. */
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  t <= 0 ? `rgb(${a.join(",")})` : t >= 1 ? `rgb(${b.join(",")})` : `color-mix(in oklch shorter hue, rgb(${a.join(",")}) ${((1 - t) * 100).toFixed(1)}%, rgb(${b.join(",")}))`;
const smooth = (t: number) => t * t * (3 - 2 * t);
type Step = "ch" | "jev" | "sol" | null;

export default function Tone() {
  const layer = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(null);
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.pxTone = "on";
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const mid = window.scrollY + vh * 0.5;
      const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-world]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, w: el.dataset.world!, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
      });
      // A seam the reference line can never fully cross (the first and the last) is pulled inwards,
      // so the page's top and bottom always rest on their own world's colour.
      const maxMid = document.documentElement.scrollHeight - vh * 0.5;
      // The closing is the last world: the footer keeps its own paper (with a blend at the closing's
      // foot), so the closing keeps its colour to the end of the page.
      const Sk = (_k: number) => vh * 0.26;
      for (let k = 0; k < secs.length - 1; k++) {
        const b = Math.min(secs[k]!.bottom, maxMid - Sk(k) - 1);
        secs[k]!.bottom = b;
        secs[k + 1]!.top = b;
      }
      let i = secs.findIndex((x) => mid >= x.top && mid < x.bottom);
      if (i < 0) i = secs.length && mid >= secs[secs.length - 1]!.bottom ? secs.length - 1 : 0;
      const stepEl = Array.from(document.querySelectorAll<HTMLElement>("[data-step]")).find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= vh * 0.5 && r.bottom > vh * 0.5;
      });
      const cur = secs[i];
      if (!cur) return;
      const S = Sk(Math.min(i, secs.length - 2));
      const Sp = Sk(Math.max(0, i - 1));
      const here = WORLDS[cur.w] ?? WORLDS.paper!;
      const next = secs[i + 1];
      const prev = secs[i - 1];
      let bg = mix(here, here, 0);
      let Y = lum(here);
      if (next && cur.bottom - mid < S) {
        const t = smooth(0.5 - (cur.bottom - mid) / (2 * S));
        bg = mix(here, WORLDS[next.w] ?? here, t);
        Y = mixY(here, WORLDS[next.w] ?? here, t);
      } else if (prev && mid - cur.top < Sp) {
        const t = smooth(0.5 + (mid - cur.top) / (2 * Sp));
        bg = mix(WORLDS[prev.w] ?? here, here, t);
        Y = mixY(WORLDS[prev.w] ?? here, here, t);
      }
      if (layer.current) layer.current.style.background = bg;
      for (const x of secs) {
        const ink = INK[x.w] ?? INK.paper!;
        const o = Math.min(1, Math.max(0, (contrast(lum(ink), Y) - 2.3) / 1.2));
        const v = o > 0.99 ? "1" : o.toFixed(2);
        if (x.el.style.getPropertyValue("--tone-o") !== v) x.el.style.setProperty("--tone-o", v);
      }
      // The question token steps aside wherever a chapter's visual sits under it.
      const tk = token.current;
      if (tk) {
        const tr = tk.getBoundingClientRect();
        const hit = tr.width > 0 && Array.from(document.querySelectorAll<HTMLElement>("[data-visual], [data-token-avoid]")).some((el) => {
          if (el === tk || tk.contains(el)) return false;
          const r = el.getBoundingClientRect();
          return r.left < tr.right + 8 && r.right > tr.left - 8 && r.top < tr.bottom + 8 && r.bottom > tr.top - 8;
        });
        if (hit !== (tk.dataset.hide === "1")) tk.dataset.hide = hit ? "1" : "";
      }
      const st = (stepEl?.dataset.step as Step) ?? null;
      setStep((c) => (c === st ? c : st));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
      delete html.dataset.pxTone;
    };
  }, []);
  const st = step ? SPINE[step] : null;
  return (
    <>
      <div ref={layer} className={s.layer} aria-hidden />
      <div ref={token} className={s.token} data-step={step ?? undefined} aria-hidden>
        <span className={s.q}>{CACHED.question}</span>
        <span className={s.state}>
          <i>{st?.n ?? ""}</i>
          {st?.state ?? ""}
        </span>
      </div>
    </>
  );
}
