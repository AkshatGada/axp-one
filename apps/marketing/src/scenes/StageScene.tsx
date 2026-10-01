"use client";

// The one dark stage. A square aperture opens onto the ultramarine night as the section arrives
// (the Shutter), then the switchboard pins and walks through seven beats: each beat swaps the
// copy on the left and lights one region of the board; the rest dims. Progress ticks, no step
// numbers, a skip link. Below 900px, under reduced motion and without JS: the beats as a list
// and the whole board lit, same words.
import { useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Figure, Opener } from "@axp/design-system/prospectus";
import { STAGE } from "@/data/copy";
import { Fit } from "./Fit";
import { BOARD_H, BOARD_W, Switchboard } from "./Switchboard";
import { sceneHeight, seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const ENTER = 0.25;
const HOLD = 0.72;
const EXIT = 0.4;
const N = STAGE.beats.length;
const T = ENTER + N * HOLD + EXIT;

export default function StageScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const [beat, setBeat] = useState(0);
  const [open, setOpen] = useState(1);

  // The Shutter: a square aperture from 40% inset to the full section as it scrolls into view.
  const { scrollYProgress: enter } = useScroll({ target: sectionRef, offset: ["start end", "start 10%"] });
  useMotionValueEvent(enter, "change", (v) => {
    if (!pinned) return;
    const t = seg(v, 0.05, 1);
    setOpen((o) => (Math.abs(o - t) < 0.004 ? o : t));
  });

  const { scrollYProgress: q } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });
  useMotionValueEvent(q, "change", (v) => {
    if (!pinned) return;
    const b = Math.min(N - 1, Math.max(0, Math.floor((v * T - ENTER + HOLD * 0.3) / HOLD)));
    setBeat((x) => (x === b ? x : b));
  });

  const inset = pinned ? (1 - open) * 38 : 0;
  const shutter: CSSProperties | undefined = pinned && inset > 0.05 ? { clipPath: `inset(${inset}% ${inset * 1.15}% ${inset}% ${inset * 1.15}%)` } : undefined;

  return (
    <section ref={sectionRef} id="how" className="px-section on-stage ss-section" data-tone="stage" data-header-tone="stage" aria-labelledby="how-q" style={shutter}>
      <div className="px-wrap">
        <div className="pg-stage-head">
          <Opener id="how-q" label={STAGE.label} question={STAGE.h2} lead={STAGE.lede} aside={<a className="pg-skip" href="#payments">{STAGE.skip}</a>} />
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
                </li>
              ))}
            </ol>
          </div>
          <div className={`ss-board${pinned ? "" : " only-wide"}`}>
            <Figure title="The exchange for one opportunity" kinds={["actual", "policy", "settled"]} caption="Values are actual, from the cached question. The wiring and motion are illustrative." onStage>
              <Fit w={BOARD_W} h={BOARD_H} maxH={pinned ? "66vh" : undefined}>
                <Switchboard beat={pinned ? beat : -1} />
              </Fit>
            </Figure>
          </div>
        </div>
      </div>
    </section>
  );
}
