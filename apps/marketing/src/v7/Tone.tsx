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
/** Blend in OKLCH along the shorter hue path, so a seam passes through vivid colour, not mud. */
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  t <= 0 ? `rgb(${a.join(",")})` : t >= 1 ? `rgb(${b.join(",")})` : `color-mix(in oklch shorter hue, rgb(${a.join(",")}) ${((1 - t) * 100).toFixed(1)}%, rgb(${b.join(",")}))`;
const smooth = (t: number) => t * t * (3 - 2 * t);
type Step = "ch" | "jev" | "sol" | null;

export default function Tone() {
  const layer = useRef<HTMLDivElement>(null);
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
        return { w: el.dataset.world!, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
      });
      // A seam the reference line can never fully cross (the first and the last) is pulled inwards,
      // so the page's top and bottom always rest on their own world's colour.
      const maxMid = document.documentElement.scrollHeight - vh * 0.5;
      const S0 = vh * 0.26;
      for (let k = 0; k < secs.length - 1; k++) {
        const b = Math.min(secs[k]!.bottom, maxMid - S0 - 1);
        secs[k]!.bottom = b;
        secs[k + 1]!.top = b;
      }
      const i = Math.max(0, secs.findIndex((x) => mid >= x.top && mid < x.bottom));
      const stepEl = Array.from(document.querySelectorAll<HTMLElement>("[data-step]")).find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= vh * 0.5 && r.bottom > vh * 0.5;
      });
      const cur = secs[i];
      if (!cur) return;
      const S = vh * 0.26;
      const here = WORLDS[cur.w] ?? WORLDS.paper!;
      const next = secs[i + 1];
      const prev = secs[i - 1];
      let bg = mix(here, here, 0);
      if (next && cur.bottom - mid < S) bg = mix(here, WORLDS[next.w] ?? here, smooth(0.5 - (cur.bottom - mid) / (2 * S)));
      else if (prev && mid - cur.top < S) bg = mix(WORLDS[prev.w] ?? here, here, smooth(0.5 + (mid - cur.top) / (2 * S)));
      if (layer.current) layer.current.style.background = bg;
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
      <div className={s.token} data-step={step ?? undefined} data-visual="" aria-hidden>
        <span className={s.q}>{CACHED.question}</span>
        <span className={s.state}>
          <i>{st?.n ?? ""}</i>
          {st?.state ?? ""}
        </span>
      </div>
    </>
  );
}
