"use client";

// The one dark stage. The Shutter: a viewport-sized night plate, pinned for a moment, opens from
// a square aperture to the full screen as it arrives (clip-path in % of the viewport, never of
// the long section). Then the switchboard pins and walks through seven beats: each beat swaps
// the copy on the left and lights one region of the board; the rest dims to a readable half.
// Below 900px, under reduced motion and without JS: the beats as stacked cards with their facts
// (and, on wide screens, the whole board lit). Same words.
import { useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Opener } from "@axp/design-system/prospectus";
import { STAGE } from "@/data/copy";
import { Fit } from "./Fit";
import { BOARD_H, BOARD_W, Switchboard } from "./Switchboard";
import { io, sceneHeight, seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const ENTER = 0.15;
const HOLD = 0.18;
const EXIT = 0.22;
const N = STAGE.beats.length;
const T = ENTER + N * HOLD + EXIT;

export default function StageScene() {
  const shutterRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const [beat, setBeat] = useState(0);
  const [open, setOpen] = useState(0);

  const { scrollYProgress: enter } = useScroll({ target: shutterRef, offset: ["start end", "start start"] });
  useMotionValueEvent(enter, "change", (v) => {
    if (!pinned) return;
    const t = io(seg(v, 0.15, 1));
    setOpen((o) => (Math.abs(o - t) < 0.003 ? o : t));
  });

  const { scrollYProgress: q } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });
  useMotionValueEvent(q, "change", (v) => {
    if (!pinned) return;
    const b = Math.min(N - 1, Math.max(0, Math.floor((v * T - ENTER + HOLD * 0.3) / HOLD)));
    setBeat((x) => (x === b ? x : b));
  });

  const inset = (1 - open) * 40;
  return (
    <>
      {pinned ? (
        <div ref={shutterRef} className="ss-shutter" aria-hidden data-header-tone={open > 0.9 ? "stage" : undefined}>
          <div className="ss-shutter-plate" style={{ clipPath: `inset(${inset}% ${inset * 1.1}% ${inset}% ${inset * 1.1}%)` }}>
            <div className="ss-shutter-in" style={{ opacity: seg(open, 0.55, 1) }}>
              <span className="ss-shutter-label">{STAGE.label}</span>
              <span className="ss-shutter-q">{STAGE.h2}</span>
              <span className="ss-shutter-lede">{STAGE.lede}</span>
            </div>
          </div>
        </div>
      ) : (
        <div ref={shutterRef} hidden />
      )}
      <section id="how" className="px-section on-stage ss-section" data-tone="stage" data-header-tone="stage" aria-labelledby="how-q" data-pinned={pinned ? "" : undefined}>
        <div className="px-wrap">
          <div className="pg-stage-head">
            <Opener id="how-q" label={STAGE.label} question={STAGE.h2} lead={STAGE.lede} aside={<a className="pg-skip" href="#rule">{STAGE.skip}</a>} />
          </div>
        </div>
        <div ref={sceneRef} className="ss" data-pinned={pinned ? "" : undefined} style={{ "--scene-h": sceneHeight(N, { hold: HOLD, enter: ENTER, exit: EXIT }) } as CSSProperties}>
          <div className="ss-stage px-wrap">
            <div className="ss-copy">
              <div className="sc-ticks ss-ticks" aria-hidden>
                {STAGE.beats.map((b, i) => (
                  <i key={b.title} data-on={i <= beat ? "" : undefined} />
                ))}
              </div>
              <ol className="pg-beats">
                {STAGE.beats.map((b, i) => (
                  <li key={b.title} data-on={!pinned || i === beat ? "" : undefined} aria-current={pinned && i === beat ? "step" : undefined}>
                    <b>{b.title}</b>
                    <p>{b.body}</p>
                    {i === 2 ? (
                      <a className="ss-data-link" href="#data">
                        {STAGE.dataLink}
                      </a>
                    ) : null}
                    <ul className="ss-facts">
                      {b.facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
            <div className={`ss-board${pinned ? "" : " only-wide"}`}>
              <Fit w={BOARD_W} h={BOARD_H} maxH={pinned ? "84vh" : undefined}>
                <Switchboard beat={pinned ? beat : -1} />
              </Fit>
              <p className="ss-source">{STAGE.source}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
