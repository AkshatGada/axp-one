"use client";

// 02 One question: the film. A framed screen holds one continuous world: the Tidewater
// conversation, the three readers beside it, the receipt below them. The reader's scroll is the
// clock. timeline.ts turns progress into every value of the picture (written to custom properties
// on the frame, drawn by CSS with transforms and opacity only); camera.ts turns the same progress
// into a framing of the world. Both are pure, so any progress value is a finished frame.
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MotionValue } from "motion/react";
import { Ad, Fig, Split, Stage } from "../kit";
import { FILM } from "../copy";
import { ADVERTISER, AGENTS, ANSWER, NO_AD, QUESTION } from "../story";
import { AnswerMark, Bar, CODA_WHY, Composer, Reader, Receipt, SendMark, SITS_OUT } from "./parts";
import { camera, keys, type Box, type Key } from "./camera";
import { frame, ORDER, POSES, type Flags } from "./timeline";
import s from "./film.module.css";

const LENGTH = 4.6;
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
  const slot2 = useRef<HTMLDivElement>(null);
  const readers = useRef<(HTMLDivElement | null)[]>([]);
  const row0 = useRef<HTMLDivElement>(null);
  const receipt = useRef<HTMLDivElement>(null);
  const none = useRef<HTMLParagraphElement>(null);
  const [flags, setFlags] = useState<Flags>(() => frame(progress.get(), false).flags);

  useLayoutEffect(() => {
    const el = root.current;
    const wd = world.current;
    const sc = screen.current;
    if (!el || !wd || !sc) return;
    const mq = window.matchMedia(COMPACT);
    const last: Record<string, string> = {};
    let key = "";
    let ks: Key[] = [];
    let size = { w: 1, h: 1 };
    const put = (k: string, val: string) => {
      if (last[k] === val) return;
      last[k] = val;
      el.style.setProperty(k, val);
    };
    const paint = (p: number) => {
      const f = frame(p, mq.matches);
      for (const k in f.vars) put(k, f.vars[k]!.toFixed(4));
      if (ks.length) {
        const c = camera(ks, p);
        const t = `translate(${(size.w / 2 - c.cx * c.s).toFixed(2)}px, ${(size.h / 2 - c.cy * c.s).toFixed(2)}px) scale(${c.s.toFixed(4)})`;
        if (last.cam !== t) {
          last.cam = t;
          wd.style.transform = t;
        }
      }
      if (f.key !== key) {
        key = f.key;
        setFlags(f.flags);
      }
    };
    // The world's boxes, measured with every transform switched off (so they are pure layout).
    const measure = () => {
      el.dataset.measure = "";
      const compact = mq.matches;
      const o = wd.getBoundingClientRect();
      const box = (n: Element | null): Box => {
        const r = n?.getBoundingClientRect();
        return r ? { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height } : { x: 0, y: 0, w: 1, h: 1 };
      };
      const em = parseFloat(getComputedStyle(sc).fontSize) || 16;
      // Wide: the row of readers stands with its foot level with the end of the answer, and the
      // receipt's place is level with the slot. (Narrow frames stack them; CSS ignores these.)
      const row = box(row0.current);
      put("--rd-top", `${(box(a1.current).y + box(a1.current).h - row.h).toFixed(1)}px`);
      put("--rz-top", `${box(fly.current).y.toFixed(1)}px`);
      const b = {
        plate: box(plate.current),
        q1: box(q1.current),
        a1: box(a1.current),
        slot1: box(fly.current),
        slot2: box(slot2.current),
        readers: AGENTS.map((_, i) => box(readers.current[i] ?? null)),
        rail: em * 1.4,
        receipt: box(receipt.current),
        none: box(none.current),
      };
      size = { w: sc.clientWidth, h: sc.clientHeight };
      delete el.dataset.measure;
      // The question is typed at the left of its line, then moves to its place on the right.
      put("--send-x", `${(b.a1.x - b.q1.x).toFixed(1)}px`);
      put("--q-h", `${b.q1.h.toFixed(1)}px`);
      // The card starts hidden behind the reader that fits, comes out below it, then crosses.
      const from = b.readers[0]!;
      const k = b.slot1;
      const small = k.h * 0.55;
      put("--card-x", `${(from.x + from.w * 0.42 - (k.x + k.w / 2)).toFixed(1)}px`);
      put("--card-y0", `${(from.y + from.h - small / 2 - 12 - (k.y + k.h / 2)).toFixed(1)}px`);
      // Wide: it comes straight down to the slot's level, then across. Narrow: just clear of the sheet.
      put("--card-y1", compact ? `${(from.y + from.h + small / 2 + 18 - (k.y + k.h / 2)).toFixed(1)}px` : "0px");
      // The line from the question to the readers.
      const ys = b.readers.map((r) => r.y + r.h / 2);
      const top = Math.min(...b.readers.map((r) => r.y));
      const qy = b.q1.y + b.q1.h / 2;
      put("--qy", `${(qy - top).toFixed(1)}px`);
      put("--tr-top", `${(Math.min(qy, ...ys) - top).toFixed(1)}px`);
      put("--tr-h", `${(Math.max(qy, ...ys) - Math.min(qy, ...ys)).toFixed(1)}px`);
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

  // A step is also a button: it takes the reader to that beat's composed frame.
  const go = useCallback((k: number) => {
    const stage = root.current?.closest<HTMLElement>("[data-stage]");
    if (!stage) return;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const y = top + (stage.offsetHeight - window.innerHeight) * POSES[k]!;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  return (
    <div ref={root} className={s.frame} data-beat={flags.beat}>
      <div className={`x-wrap ${s.inner}`}>
        <ol className={s.caps}>
          <li className={s.cap} aria-hidden>
            <Split className={`${s.capLine} ${s.capTitle}`} text={FILM.h} />
          </li>
          {FILM.beats.map((b, k) => (
            <li key={b.k} className={s.cap} style={vars({ "--e": `var(--e${k})`, "--x": `var(--x${k})` })}>
              <Split className={s.capLine} text={b.line} />
            </li>
          ))}
          <li className={s.cap} style={vars({ "--e": "var(--e5)", "--x": "var(--x5)" })}>
            <Split className={s.capLine} text={FILM.coda} />
          </li>
        </ol>

        <div className={s.screen} ref={screen}>
          <div className={s.world} ref={world}>
            {/* The plate: Tidewater, drawn in the page's own materials. */}
            <div className={s.plate} ref={plate}>
              <div className={s.sheet}>
                <Bar />
                <div className={s.threads}>
                  <div className={s.tall} aria-hidden><SendMark /></div>
                  <div className={s.thread} data-t="1">
                    <div className={s.qWrap} data-q="1" ref={q1}>
                      <Split as="p" className={s.q} text={QUESTION} />
                    </div>
                    <div className={s.a} ref={a1}>
                      <AnswerMark />
                      <Split as="p" className={s.aText} text={ANSWER} />
                    </div>
                    <div className={s.slot}>
                      <i className={s.slotLine} aria-hidden />
                      <div className={s.fly} ref={fly}>
                        <i className={s.flyShadow} aria-hidden />
                        <Ad className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} />
                        <i className={s.ring} aria-hidden />
                      </div>
                    </div>
                  </div>
                  <div className={s.thread} data-t="2">
                    <div className={s.qWrap} data-q="2">
                      <p className={s.q}>{NO_AD.question}</p>
                    </div>
                    <div className={s.a}>
                      <AnswerMark />
                      <Split as="p" className={s.aText} text={NO_AD.answer} />
                    </div>
                    <div className={s.slot} data-empty ref={slot2}>
                      <i className={s.slotLine} aria-hidden />
                      <p className={s.noAd}>{NO_AD.line}</p>
                    </div>
                  </div>
                </div>
                <Composer />
              </div>
            </div>

            {/* Beside the conversation, never in it: the readers, and below them the receipt. */}
            <div className={s.readers}>
              <i className={s.trunk} aria-hidden />
              <div className={s.row} ref={row0}>
              {ORDER.map((i) => (
                <div key={i} className={s.readerSlot} data-fit={i === 0 ? "" : undefined} ref={(n) => { readers.current[i] = n; }} style={vars({ "--g": `var(--g${i})`, "--rd": `var(--rd${i})`, "--bo": `var(--bo${i})`, "--h": `var(--h${i})`, "--v": `var(--v${i})`, "--w": `var(--w${i})`, "--o": `var(--o${i})` })}>
                  <Reader index={i} on={i === 0 && flags.fit} second />
                </div>
              ))}
              </div>
              <div className={s.rz}>
                <div className={s.rPrint} ref={receipt}>
                  <i className={s.printSlot} aria-hidden />
                  <div className={s.rClip}>
                    <Receipt r0={flags.r0} r1={flags.r1} />
                  </div>
                </div>
                <p className={s.noRc} ref={none}>{NO_AD.receipt}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={s.strip}>
          <ol className={s.steps} aria-label="The five beats">
            {FILM.beats.map((b, k) => (
              <li key={b.k}>
                <button type="button" className={s.step} style={vars({ "--s": `var(--s${k})` })} data-now={flags.now === k ? "" : undefined} aria-current={flags.beat === k ? "step" : undefined} onClick={() => go(k)}>
                  <i aria-hidden />
                  <b>{k + 1}</b>
                  <span>{b.k}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className={s.note}>Illustration</p>
        </div>
      </div>
    </div>
  );
}

/** Motion off, and the server render: the same story as six composed stills in normal flow. */
function Stills() {
  const cap = (k: number) => (
    <div className={s.stillCap}>
      {k < 5 ? <p className={s.capK}><b>{k + 1}</b>{FILM.beats[k]!.k}</p> : null}
      <p className={s.stillLine}>{k < 5 ? FILM.beats[k]!.line : FILM.coda}</p>
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
    <Fig className={`x-wrap ${s.stills}`}>
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
            <div className={s.stillRow}>
              {ORDER.map((i) => (
                <div key={i} className={s.readerSlot}>
                  <Reader index={i} on={i === 0} />
                </div>
              ))}
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
        <li className={s.still}>
          {cap(4)}
          <div className={s.stillPlate}>
            <div className={s.stillReaders}>
              <Receipt />
            </div>
          </div>
        </li>
        <li className={s.still}>
          {cap(5)}
          <div className={s.stillPlate}>
            <div className={s.sheet}>
              <Bar />
              <div className={s.threads}>
                <div className={s.thread}>
                  <div className={s.qWrap}><p className={s.q}>{NO_AD.question}</p></div>
                  <div className={s.a}>
                    <AnswerMark />
                    <p className={s.aText}>{NO_AD.answer}</p>
                  </div>
                  <div className={s.slot} data-empty>
                    <i className={s.slotLine} aria-hidden />
                    <p className={s.noAd}>{NO_AD.line}</p>
                  </div>
                </div>
              </div>
            </div>
            <ul className={s.sitOuts}>
              {AGENTS.map((a) => (
                <li key={a.name}><b>{a.name}</b><span>{SITS_OUT}</span></li>
              ))}
              <li className={s.sitWhy}>{CODA_WHY}. {NO_AD.receipt}</li>
            </ul>
          </div>
        </li>
      </ol>
    </Fig>
  );
}
