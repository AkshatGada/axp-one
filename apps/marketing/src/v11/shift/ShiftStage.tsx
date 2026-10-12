"use client";

// 01 The shift, as a scroll-driven stage. One number drives everything: the stage's progress is
// written to --p on the frame, and the stylesheet derives every position from it, so any progress
// value from 0 to 1 is a complete picture (arriving abruptly, or from below, is always valid).
// The keywords are not copies: the words in the field ARE the words of the sentence, set at their
// final size and scaled down into the field, then released.
import { Fragment, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { Arrow, Split, Stage } from "../kit";
import { SHIFT_COPY } from "../copy";
import { SHIFT } from "../story";
import { BREAK_NARROW, BREAK_WIDE, CLOCK, IMPLIED, MARK, MARK_ORDER, NOTE_NARROW, NOTE_WIDE, TERMS, WORDS, type Place, type Word } from "./model";
import s from "./shift.module.css";

/** Total stage length in viewport heights (budget: 2.2). */
export const LENGTH = 2.2;

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const css = (o: Record<string, string | number>) => o as CSSProperties;
const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const r4 = (n: number) => +n.toFixed(4);

/** The clock, handed to the stylesheet once. */
const CLOCK_VARS = css({
  "--chrome-a": CLOCK.chrome[0], "--chrome-d": CLOCK.chrome[1],
  "--strike-a": CLOCK.strike[0], "--strike-d": CLOCK.strike[1],
  "--drop-a": CLOCK.drop[0], "--drop-d": CLOCK.drop[1],
  "--open-a": CLOCK.travel[0], "--open-d": CLOCK.travel[1],
  "--out-a": CLOCK.headOut[0], "--out-d": CLOCK.headOut[1],
  "--in-a": CLOCK.headIn[0], "--in-d": CLOCK.headIn[1],
  "--shrink-a": CLOCK.shrink[0], "--shrink-d": CLOCK.shrink[1],
  "--says-a": CLOCK.says, "--says-s": CLOCK.saysStep, "--says-r": CLOCK.saysRamp,
  "--close-a": CLOCK.close[0], "--close-d": CLOCK.close[1], "--close-s": CLOCK.closeStep,
});

/** When phrase `n` lights: a left to right wipe across its words, at the start of its beat. */
const sayVars = (n: number, at = 0, of = 1) => {
  const len = CLOCK.light / of;
  return { "--sa": r4(CLOCK.says + n * CLOCK.saysStep + at * len), "--sd": r4(len) };
};

function QWord({ w }: { w: Word }) {
  const says = w.says != null ? sayVars(w.says, w.sayAt, w.sayOf) : {};
  const time = w.travels
    ? { "--a": CLOCK.travel[0], "--d": CLOCK.travel[1] }
    : { "--a": r4(CLOCK.arrive[0] + w.order * CLOCK.arriveStep), "--d": CLOCK.arrive[1] };
  const first = w.text.charAt(0);
  const capital = w.travels && first !== first.toLowerCase();
  return (
    <span
      className={cx(s.w, w.travels ? s.trav : s.rise, w.says != null && s.say)}
      style={css({ ...time, ...says })}
      data-key={w.travels ? key(w.text) : undefined}
      data-pair={w.paired ? "" : undefined}
      data-says={w.says}
      data-end={w.sayEnd ? "" : undefined}
      data-eolw={BREAK_WIDE.has(w.i) ? "" : undefined}
      data-eoln={BREAK_NARROW.has(w.i) ? "" : undefined}
    >
      {capital ? (
        <>
          <span className={s.cap}>
            <span className={s.capU}>{first}</span>
            <span className={s.capL} aria-hidden>{first.toLowerCase()}</span>
          </span>
          {w.text.slice(1)}
        </>
      ) : (
        w.text
      )}
    </span>
  );
}

/** The question, word by word. Real text in reading order; the breaks are per width. */
function Question() {
  const implied = IMPLIED < 0 ? 0 : IMPLIED;
  return (
    <p className={s.q}>
      {WORDS.map((w, idx) => {
        const last = idx === WORDS.length - 1;
        return (
          <Fragment key={w.i}>
            {last ? (
              <span className={s.tie}>
                <QWord w={w} />
                <span
                  className={cx(s.w, s.rise, s.say, s.mark)}
                  data-says={implied}
                  style={css({ "--a": r4(CLOCK.arrive[0] + MARK_ORDER * CLOCK.arriveStep), "--d": CLOCK.arrive[1], ...sayVars(implied, 1, 2) })}
                >
                  {MARK}
                </span>
              </span>
            ) : (
              <QWord w={w} />
            )}
            {last ? null : " "}
            {BREAK_WIDE.has(idx) ? <br className={s.brW} /> : null}
            {BREAK_NARROW.has(idx) ? <br className={s.brN} /> : null}
          </Fragment>
        );
      })}
    </p>
  );
}

const placeVars = (p: Place | undefined, suffix: string) => (p && p !== "below" ? { [`--row-${suffix}`]: p.row, [`--x-${suffix}`]: p.x } : {});

/** The marginal notes: what the question says, each set beside the words that say it. The one
 *  thing said by the form of the question, not by a phrase, shows the two marks that say it. */
function Notes() {
  return (
    <ul className={s.notes}>
      {SHIFT.says.map((t, n) => {
        const wide = NOTE_WIDE[n];
        const narrow = NOTE_NARROW[n];
        return (
          <li
            key={t}
            className={s.note}
            data-below-w={wide === "below" ? "" : undefined}
            data-below-n={narrow === "below" ? "" : undefined}
            style={css({ "--a": r4(CLOCK.says + n * CLOCK.saysStep + 0.008), "--d": 0.05, ...placeVars(wide, "w"), ...placeVars(narrow, "n") })}
          >
            {n === IMPLIED ? (
              <span className={s.echo} aria-hidden>
                {WORDS[0]?.text} … {MARK}
              </span>
            ) : null}
            <span className={s.noteText}>{t}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The search field. Live (on the stage) it holds invisible markers where the sentence's own
 *  words rest, plus the one keyword that never becomes part of the question. Still, it is simply
 *  a drawn field with its three keywords. */
function Field({ live }: { live?: boolean }) {
  return (
    <div className={s.field} data-live={live ? "" : undefined} aria-hidden={live || undefined}>
      {live ? <span className={s.sides} /> : null}
      <svg className={s.lens} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.25" />
        <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
      </svg>
      <span className={s.terms}>
        {TERMS.map((t) => (
          <span key={t.text} className={s.term} data-dropped={t.dropped ? "" : undefined}>
            {t.words.map((word, j) => (
              <Fragment key={word}>
                {j ? " " : null}
                <span className={s.kw} data-ph={t.dropped ? undefined : key(word)}>{word}</span>
              </Fragment>
            ))}
          </span>
        ))}
        <span className={s.caret}><i /></span>
      </span>
      <span className={s.go} aria-hidden><Arrow width={24} /></span>
    </div>
  );
}

function Plate({ live }: { live?: boolean }) {
  return (
    <div className={s.plate}>
      <span className={s.lineT} />
      <span className={s.lineB} />
      {live ? <Field live /> : null}
      <Question />
      <Notes />
    </div>
  );
}

function Pinned({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionValueEvent(progress, "change", (v) => {
    ref.current?.style.setProperty("--p", v.toFixed(4));
  });
  useIso(() => {
    const root = ref.current;
    if (!root) return;
    root.style.setProperty("--p", progress.get().toFixed(4));
    // Where each travelling word rests in the field, relative to where it ends in the sentence.
    // Measured with the stage momentarily at its end (every word at home, untransformed), inside
    // one synchronous pass, so nothing is painted in between and sub-pixel positions are exact.
    const measure = () => {
      const p = root.style.getPropertyValue("--p");
      root.style.setProperty("--p", "1");
      const moves: [HTMLElement, number, number][] = [];
      root.querySelectorAll<HTMLElement>("[data-key]").forEach((w) => {
        const ph = root.querySelector<HTMLElement>(`[data-ph="${w.dataset.key}"]`);
        if (!ph) return;
        const a = ph.getBoundingClientRect();
        const b = w.getBoundingClientRect();
        moves.push([w, a.left - b.left, a.top - b.top]);
      });
      for (const [w, dx, dy] of moves) {
        w.style.setProperty("--dx", dx.toFixed(2));
        w.style.setProperty("--dy", dy.toFixed(2));
      }
      root.style.setProperty("--p", p || "0");
      root.dataset.ready = "";
      // The empty paper under the closing line (the frame is a whole screen; the picture is not
      // always). The next movement is pulled up by this much, so it follows the line directly.
      const close = root.querySelector<HTMLElement>(`.${s.close}`);
      const slack = close ? Math.max(0, Math.floor(root.getBoundingClientRect().bottom - close.getBoundingClientRect().bottom - 12)) : 0;
      document.documentElement.style.setProperty("--shift-slack", `${slack}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) measure(); });
    return () => { live = false; ro.disconnect(); document.documentElement.style.removeProperty("--shift-slack"); };
  }, [progress]);

  return (
    <div ref={ref} className={cx("x-wrap", s.inner, s.pinned)} style={CLOCK_VARS}>
      <div className={s.body}>
        <div className={s.heads}>
          <Split as="h2" id="shift-h" text={SHIFT_COPY.before} className={cx(s.head, s.headOut)} />
          <Split as="p" text={SHIFT_COPY.after} className={cx(s.head, s.headIn)} />
        </div>
        <Plate live />
        <Split as="p" text={SHIFT_COPY.close} className={s.close} />
      </div>
    </div>
  );
}

/** Motion off: the same story as two still frames in normal flow. */
function Flow() {
  return (
    <div className={cx("x-wrap", s.inner, s.flow)} style={CLOCK_VARS}>
      <div className={s.still}>
        <h2 id="shift-h" className={s.head}>{SHIFT_COPY.before}</h2>
        <Field />
      </div>
      <div className={s.still}>
        <p className={s.head}>{SHIFT_COPY.after}</p>
        <Plate />
        <Split as="p" text={SHIFT_COPY.close} className={s.close} />
      </div>
    </div>
  );
}

export default function ShiftStage() {
  return <Stage length={LENGTH} frameClassName={s.frame} pinned={(progress) => <Pinned progress={progress} />} flow={<Flow />} />;
}
