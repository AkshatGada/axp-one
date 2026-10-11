"use client";

// The closing wall: the page's opening image, come back quiet inside the ultramarine panel.
// Columns sway very slowly. One tile is fully lit: the page's own placement, back in its place.
// Now and then another tile resolves (its slot fills, it brightens, it fades back), so the field
// reads as a living network and not a pattern. Everything is still with motion off, and the
// sway and the resolving stop while the panel is out of view. Decorative: hidden from assistive
// technology.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ADVERTISER, PLACEMENT } from "../story";
import { EmptySlot, SponsoredCard, Tile } from "../kit";
import { WALL_QUESTIONS } from "./local";
import s from "./doors.module.css";

const COLS = 5;
const PER = 4;
/** Where the page's own placement sits in the wall: [column, row]. */
const LIT: [number, number] = [2, 1];
/** Sway per column: rest offset, travel and period. */
const SWAY = [
  { y: -64, amp: 34, dur: 19 },
  { y: 38, amp: -28, dur: 23 },
  { y: -22, amp: 14, dur: 27 },
  { y: 54, amp: -36, dur: 21 },
  { y: -40, amp: 30, dur: 25 },
];
/** The order in which other tiles resolve: [column, row], chosen to stay in the visible field. */
const ORDER: [number, number][] = [[3, 1], [1, 2], [4, 2], [2, 2], [3, 0], [1, 1], [4, 1], [3, 2]];

export default function Wall() {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [res, setRes] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    const io = new IntersectionObserver(([e]) => setLive(!!e?.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    let n = 0;
    let out = 0;
    const next = () => {
      const [c, r] = ORDER[n++ % ORDER.length]!;
      setRes(`${c}-${r}`);
      out = window.setTimeout(() => setRes(null), 2600);
    };
    const first = window.setTimeout(next, 2400);
    const every = window.setInterval(next, 4400);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(out);
      window.clearInterval(every);
      setRes(null);
    };
  }, [live]);

  return (
    <div ref={ref} className={s.wall} data-live={live ? "" : undefined} aria-hidden>
      <div className={s.plane}>
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} className={s.col} style={{ "--y": `${SWAY[c]!.y}px`, "--amp": `${SWAY[c]!.amp}px`, "--dur": `${SWAY[c]!.dur}s` } as CSSProperties}>
            {Array.from({ length: PER }, (_, r) =>
              c === LIT[0] && r === LIT[1] ? (
                <Tile key={r} className={s.lit} question={PLACEMENT.moment.question} slot={<SponsoredCard size="s" name={ADVERTISER.name} text={ADVERTISER.creative} />} />
              ) : (
                <div key={r} className={s.dimWrap} data-res={res === `${c}-${r}` ? "" : undefined}>
                  <Tile
                    className={s.dim}
                    question={WALL_QUESTIONS[(c * PER + r) % WALL_QUESTIONS.length]!}
                    slot={
                      <span className={s.sl}>
                        <EmptySlot />
                        <i className={s.fill}><b /><em /><em /></i>
                      </span>
                    }
                  />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
