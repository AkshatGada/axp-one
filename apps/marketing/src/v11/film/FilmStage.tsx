"use client";

// 02 One question: the film. A framed screen holds one continuous world: the Tidewater
// conversation, beside it the agent that fits, and the receipt. The reader's scroll is the only
// clock: nothing here can be pressed. timeline.ts turns progress into every value of the picture
// (written to custom properties on the frame, drawn by CSS with transforms and opacity only);
// camera.ts turns the same progress into a framing of the world. Both are pure, so any progress
// value is a finished frame.
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MotionValue } from "motion/react";
import { Ad, Split, Stage } from "../kit";
import { FILM } from "../copy";
import { ADVERTISER, ANSWER, QUESTION } from "../story";
import { AnswerMark, Bar, Composer, Others, Reader, SendMark } from "./parts";
import { camera, keys, type Box, type Key } from "./camera";
import { END, frame } from "./timeline";
import s from "./film.module.css";

// Four beats over 2.1 screens of travel.
const LENGTH = 3.1;
const COMPACT = "(max-width: 999px)";
const vars = (o: Record<string, string>) => o as CSSProperties;

export default function FilmStage() {
  return <Stage length={LENGTH} pinned={(progress) => <Pinned progress={progress} />} flow={<Stills />} />;
}

function Pinned({ progress }: { progress: MotionValue<number> }) {
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const q1 = useRef<HTMLDivElement>(null);
  const a1 = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const others = useRef<HTMLUListElement>(null);
  const receipt = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(() => frame(progress.get()).beat);

  useLayoutEffect(() => {
    const el = root.current;
    const wd = world.current;
    const sc = screen.current;
    if (!el || !wd || !sc) return;
    const mq = window.matchMedia(COMPACT);
    const last: Record<string, string> = {};
    let now = -1;
    let ks: Key[] = [];
    let size = { w: 1, h: 1 };
    const put = (k: string, val: string) => {
      if (last[k] === val) return;
      last[k] = val;
      el.style.setProperty(k, val);
    };
    const paint = (p: number) => {
      const f = frame(p);
      for (const k in f.vars) put(k, f.vars[k]!.toFixed(4));
      if (ks.length) {
        const c = camera(ks, p * END);
        const t = `translate(${(size.w / 2 - c.cx * c.s).toFixed(2)}px, ${(size.h / 2 - c.cy * c.s).toFixed(2)}px) scale(${c.s.toFixed(4)})`;
        if (last.cam !== t) {
          last.cam = t;
          wd.style.transform = t;
        }
      }
      if (f.beat !== now) {
        now = f.beat;
        setBeat(f.beat);
      }
    };
    // The world's boxes, measured with every transform switched off (so they are pure layout).
    const measure = () => {
      el.dataset.measure = "";
      const compact = mq.matches;
      const box = (n: Element | null): Box => {
        const o = wd.getBoundingClientRect();
        const r = n?.getBoundingClientRect();
        return r ? { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height } : { x: 0, y: 0, w: 1, h: 1 };
      };
      const em = parseFloat(getComputedStyle(sc).fontSize) || 16;
      // Wide: the receipt's place is beside the answer: its top level with the answer's, its foot
      // with the plate's. Narrow: it is directly under the plate, so the card and its receipt can
      // be seen together.
      const a = box(a1.current);
      const q = box(q1.current);
      put("--rz-top", `${(compact ? box(plate.current).h + 1.6 * em : a.y).toFixed(1)}px`);
      put("--rz-h", `${(box(plate.current).h - a.y).toFixed(1)}px`);
      // The line from the question to the agent.
      put("--qy", `${(q.y + q.h / 2).toFixed(1)}px`);
      // The question is typed at the left of its line, then moves to its place on the right.
      put("--send-x", `${(a.x - q.x).toFixed(1)}px`);
      put("--q-h", `${q.h.toFixed(1)}px`);
      const b = {
        em,
        plate: box(plate.current),
        q1: q,
        a1: a,
        slot1: box(fly.current),
        sheet: box(sheet.current),
        others: box(others.current),
        receipt: box(receipt.current),
      };
      size = { w: sc.clientWidth, h: sc.clientHeight };
      delete el.dataset.measure;
      ks = keys({ screen: size, ...b }, compact);
      paint(progress.get());
    };
    measure();
    const off = progress.on("change", paint);
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    void document.fonts?.ready.then(measure);
    mq.addEventListener("change", measure);
    return () => {
      off();
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, [progress]);

  return (
    <div ref={root} className={s.frame} data-beat={beat}>
      <div className={`x-wrap ${s.inner}`}>
        <ol className={s.caps}>
          <li className={s.cap} aria-hidden>
            <Split className={`x-h2 ${s.capTitle}`} text={FILM.h} />
          </li>
          {FILM.beats.map((b, k) => (
            <li key={b.k} className={s.cap} style={vars({ "--e": `var(--e${k})`, "--x": `var(--x${k})` })}>
              <Split className={s.capLine} text={b.line} />
            </li>
          ))}
        </ol>

        <div className={s.screen} ref={screen}>
          <div className={s.world} ref={world}>
            {/* The plate: Tidewater, drawn in the page's own materials. */}
            <div className={s.plate} ref={plate}>
              <div className={s.sheet}>
                <Bar />
                <div className={s.threads}>
                  <div className={s.tall} aria-hidden><SendMark /></div>
                  <div className={s.thread}>
                    <div className={s.qWrap} data-q="1" ref={q1}>
                      <Split as="p" className={s.q} text={QUESTION} />
                    </div>
                    <div className={s.a} ref={a1}>
                      <AnswerMark />
                      <Split as="p" className={s.aText} text={ANSWER} />
                    </div>
                    <div className={s.slot}>
                      <div className={s.fly} ref={fly}>
                        <Ad className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} />
                      </div>
                    </div>
                  </div>
                </div>
                <Composer />
              </div>
            </div>

            {/* Beside the conversation, never in it: the agent that fits, and the receipt. */}
            <div className={s.readers}>
              <i className={s.trunk} aria-hidden />
              <div className={s.col}>
                <div className={s.readerSlot} ref={sheet}>
                  <Reader />
                </div>
                <Others innerRef={others} />
              </div>
            </div>
          </div>
        </div>

        {/* A plain progress mark: four steps that fill as the film plays. Not a control. */}
        <div className={s.steps} aria-hidden>
          {FILM.beats.map((b, k) => (
            <span key={b.k} className={s.step} style={vars({ "--s": `var(--s${k})` })} data-now={beat === k ? "" : undefined}>
              <i />
              <span>{b.k}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Motion off, and the server render: the same story as four composed stills in normal flow. */
function Stills() {
  const cap = (k: number) => (
    <div className={s.stillCap}>
      <p className={s.capK}>{FILM.beats[k]!.k}</p>
      <p className={s.stillLine}>{FILM.beats[k]!.line}</p>
    </div>
  );
  const question = <div className={s.qWrap}><p className={s.q}>{QUESTION}</p></div>;
  const answer = (
    <div className={s.a}>
      <AnswerMark />
      <p className={s.aText}>{ANSWER}</p>
    </div>
  );
  return (
    <div className={`x-wrap ${s.stills}`}>
      <ol className={s.stillList}>
        <li className={s.still}>
          {cap(0)}
          <div className={s.stillPlate}>
            <div className={s.sheet}>
              <Bar />
              <div className={s.threads}><div className={s.thread}>{question}</div></div>
              <Composer />
            </div>
          </div>
        </li>
        <li className={s.still}>
          {cap(1)}
          <div className={s.stillPlate}>
            <div className={s.sheet}>
              <Bar />
              <div className={s.threads}><div className={s.thread}>{question}{answer}</div></div>
            </div>
          </div>
        </li>
        <li className={s.still}>
          {cap(2)}
          <div className={s.stillPlate}>
            <div className={s.stillSide}>
              <Reader />
              <Others />
            </div>
          </div>
        </li>
        <li className={s.still}>
          {cap(3)}
          <div className={s.stillPlate}>
            <div className={s.sheet}>
              <Bar />
              <div className={s.threads}>
                <div className={s.thread}>
                  {question}
                  {answer}
                  <div className={s.slot}><Ad className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} /></div>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}
