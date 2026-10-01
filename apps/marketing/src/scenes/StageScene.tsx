"use client";

// The one dark stage. As the section arrives, its pinned night plate opens from a square aperture
// to the full screen (clip-path in % of the viewport-sized plate, never of the long section) with the
// question on it; once pinned, the question clears and the switchboard walks through seven beats:
// each beat swaps the copy on the left and lights one region of the board; the rest dims to a
// readable half. v6: the aperture lives inside the pinned plate, so the shutter costs no extra scroll.
// Below 900px, under reduced motion and without JS: the beats as stacked cards with their facts
// (and, on wide screens, the whole board lit). Same words.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Opener } from "@axp/design-system/prospectus";
import { STAGE } from "@/data/copy";
import { Fit } from "./Fit";
import { BOARD_H, BOARD_W, Switchboard } from "./Switchboard";
import { io, sceneHeight, seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const ENTER = 0.32;
const HOLD = 0.17;
const EXIT = 0.2;
const N = STAGE.beats.length;
const T = ENTER + N * HOLD + EXIT;

export default function StageScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const [beat, setBeat] = useState(0);
  const [open, setOpen] = useState(1);
  const [curtain, setCurtain] = useState(1);

  // The aperture: the plate opens while the scene rises into view.
  const { scrollYProgress: enter } = useScroll({ target: sceneRef, offset: ["start end", "start start"] });
  const onEnter = (v: number) => {
    const t = io(seg(v, 0.15, 1));
    setOpen((o) => (Math.abs(o - t) < 0.003 ? o : t));
  };
  useMotionValueEvent(enter, "change", (v) => {
    if (pinned) onEnter(v);
  });

  const { scrollYProgress: q } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });
  const onScene = (v: number) => {
    const at = v * T;
    const c = 1 - seg(at, 0.08, 0.26);
    setCurtain((x) => (Math.abs(x - c) < 0.003 ? x : c));
    const b = Math.min(N - 1, Math.max(0, Math.floor((at - ENTER + HOLD * 0.3) / HOLD)));
    setBeat((x) => (x === b ? x : b));
  };
  useMotionValueEvent(q, "change", (v) => {
    if (pinned) onScene(v);
  });
  // Arriving mid-page (reload, anchor): set the plate from the current scroll, not only on change.
  useEffect(() => {
    if (!pinned) return;
    onEnter(enter.get());
    onScene(q.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  const inset = pinned ? (1 - open) * 40 : 0;
  return (
    <section id="how" className="px-section on-stage ss-section" data-tone="stage" data-header-tone={!pinned || open > 0.9 ? "stage" : undefined} aria-labelledby="how-q" data-pinned={pinned ? "" : undefined}>
      <div className="px-wrap">
        <div className="pg-stage-head">
          <Opener id="how-q" label={STAGE.label} question={STAGE.h2} lead={STAGE.lede} aside={<a className="pg-skip" href="#data">{STAGE.skip}</a>} />
        </div>
      </div>
      <div ref={sceneRef} className="ss" data-pinned={pinned ? "" : undefined} style={{ "--scene-h": sceneHeight(N, { hold: HOLD, enter: ENTER, exit: EXIT }) } as CSSProperties}>
        <div className="ss-pin" style={pinned ? { clipPath: `inset(${inset}% ${inset * 1.1}% ${inset}% ${inset * 1.1}%)` } : undefined}>
          {pinned ? (
            <div className="ss-curtain" aria-hidden style={{ transform: `translate3d(0, ${-io(1 - curtain) * 100}%, 0)`, visibility: curtain > 0.001 ? "visible" : "hidden" }}>
              <div className="ss-shutter-in" style={{ opacity: seg(open, 0.55, 1) }}>
                <span className="ss-shutter-label">{STAGE.label}</span>
                <span className="ss-shutter-q">{STAGE.h2}</span>
                <span className="ss-shutter-lede">{STAGE.lede}</span>
              </div>
            </div>
          ) : null}
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
      </div>
    </section>
  );
}
