"use client";

// The closing wall: the page's opening image, come back quiet inside the ultramarine panel. One
// tile is fully lit: the page's own placement, with its Sponsored card below the answer. The
// columns drift very slowly while the panel is in view, and are still off screen and with motion
// off. Decorative: hidden from assistive technology. The tiles are drawn here (V5 has no kit tile).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Ad } from "../kit";
import { ADVERTISER, QUESTION } from "../story";
import { keep } from "../rule/keep";
import { WALL_QUESTIONS } from "./local";
import s from "./doors.module.css";

const COLS = 5;
const PER = 4;
/** Where the page's own placement sits in the wall: [column, row]. */
const LIT: [number, number] = [2, 1];
/** Drift per column: rest offset, travel and period. */
const DRIFT = [
  { y: -64, amp: 34, dur: 38 },
  { y: 38, amp: -28, dur: 46 },
  { y: -22, amp: 14, dur: 54 },
  { y: 54, amp: -36, dur: 42 },
  { y: -40, amp: 30, dur: 50 },
];

function Tile({ question, className, children }: { question: string; className?: string; children?: ReactNode }) {
  return (
    <div className={`${s.tile}${className ? ` ${className}` : ""}`}>
      <p className={s.tq}>{question}</p>
      <div className={s.ans}><i /><i /><i /></div>
      {children}
    </div>
  );
}

export default function Wall() {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    const io = new IntersectionObserver(([e]) => setLive(!!e?.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={s.wall} data-live={live ? "" : undefined} aria-hidden>
      <div className={s.plane}>
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} className={s.col} style={{ "--y": `${DRIFT[c]!.y}px`, "--amp": `${DRIFT[c]!.amp}px`, "--dur": `${DRIFT[c]!.dur}s` } as CSSProperties}>
            {Array.from({ length: PER }, (_, r) =>
              c === LIT[0] && r === LIT[1] ? (
                <Tile key={r} className={s.lit} question={QUESTION}>
                  <Ad size="m" name={ADVERTISER.name} text={keep(ADVERTISER.creative)} className={s.litAd} />
                </Tile>
              ) : (
                <div key={r} className={s.dimWrap}>
                  <Tile className={s.dim} question={WALL_QUESTIONS[(c * PER + r) % WALL_QUESTIONS.length]!}>
                    <div className={s.more}><i /><i /></div>
                  </Tile>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
