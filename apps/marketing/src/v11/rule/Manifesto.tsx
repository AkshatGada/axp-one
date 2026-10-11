"use client";

// The manifesto. Two sentences that look and move differently, because that difference is the idea.
// "Agents judge fit." is a judgment: light, wide, round. Its words bloom on springs as the sheet
// rises, and its full stop is a round mark that keeps breathing.
// "Fixed rules decide money." is a rule: heavy, square. It waits as unset type and is set one word
// per notch of scroll, each with a hard cut, under a hairline; its full stop is a square latch.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, motionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ChapterMark, useStageMode } from "../kit";
import { RULE } from "../copy";
import s from "./rule.module.css";

const LABEL = RULE.lines.join(" ");
const strip = (t: string) => t.replace(/\.$/, "");
const J_WORDS = strip(RULE.lines[0] ?? "").split(" "); // Agents, judge, fit
const R_WORDS = strip(RULE.lines[1] ?? "").split(" "); // Fixed, rules, decide, money

/** Where on the way in each soft word blooms (entry progress), then the round stop. */
const J_AT = [0.3, 0.42, 0.54, 0.64];
/** Where each hard piece is set: the hairline and the first two words late in the rise (entry
 *  progress), the last two words and the square latch during the short hold (stage progress). */
const R_ENTRY = [0.7, 0.8, 0.92];
const R_HOLD = [0.12, 0.45, 0.8];
const R_ALL = R_ENTRY.length + R_HOLD.length;
// A motion value that never changes, so the still version can call the same hook.
const STILL = motionValue(1);
const setCount = (e: number, p: number) => R_ENTRY.filter((a) => e >= a).length + R_HOLD.filter((a) => p >= a).length;

function Soft({ entry, at, className, children }: { entry: MotionValue<number>; at: number; className?: string; children: ReactNode }) {
  const target = useTransform(entry, (v): number => (v >= at ? 1 : 0));
  const sp = useSpring(target, { stiffness: 58, damping: 10.5, mass: 1 });
  const y = useTransform(sp, (v) => `${((1 - v) * 0.46).toFixed(4)}em`);
  const opacity = useTransform(sp, [0, 0.55], [0, 1]);
  const rotate = useTransform(sp, (v) => (1 - v) * 5);
  return <motion.span className={className} style={{ y, opacity, rotate }}>{children}</motion.span>;
}

function SoftDot({ entry, at }: { entry: MotionValue<number>; at: number }) {
  const target = useTransform(entry, (v): number => (v >= at ? 1 : 0));
  const scale = useSpring(target, { stiffness: 70, damping: 8, mass: 1 });
  return (
    <motion.span className={s.stopWrap} style={{ scale }}>
      <span className={s.stopRound} /><span className={s.stopChar}>.</span>
    </motion.span>
  );
}

function Lines({ entry, progress }: { entry?: MotionValue<number>; progress?: MotionValue<number> }) {
  const live = !!(entry && progress);
  const [n, setN] = useState(R_ALL);
  const read = () => {
    if (!entry || !progress) return;
    const c = setCount(entry.get(), progress.get());
    setN((prev) => (prev === c ? prev : c));
  };
  useMotionValueEvent(entry ?? STILL, "change", read);
  useMotionValueEvent(progress ?? STILL, "change", read);
  // The first reading can arrive before the hold has been measured: read again once it has.
  useEffect(() => {
    if (!live) return;
    const ids = [0, 120, 400].map((ms) => window.setTimeout(read, ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  const set = (i: number) => (n > i ? "" : undefined);
  const soft = (i: number, word: string, last: boolean) => {
    const body = (
      <>
        {word}
        {last ? null : " "}
      </>
    );
    return entry ? <Soft key={i} entry={entry} at={J_AT[i] ?? 0.5} className={s.w}>{body}</Soft> : <span key={i} className={s.w}>{body}</span>;
  };
  const jLast = J_WORDS.length - 1;
  return (
    <h2 id="rule-h" className={s.mega} aria-label={LABEL}>
      <span className={s.judge} aria-hidden>
        <span className={s.row}>
          {soft(0, J_WORDS[0] ?? "", false)}
          <br className={s.brNarrow} />
          {J_WORDS.slice(1).map((w, i) => soft(i + 1, w, i + 1 === jLast))}
          {entry ? (
            <SoftDot entry={entry} at={J_AT[3] ?? 0.64} />
          ) : (
            <span className={s.stopWrap}><span className={s.stopRound} /><span className={s.stopChar}>.</span></span>
          )}
        </span>
      </span>
      <span className={s.ruleBlock} aria-hidden>
      <span className={s.hard} data-set={set(0)} />
      <span className={s.fixed}>
        <span className={s.row}>
          <span className={s.rw} data-set={set(1)}>{R_WORDS[0]} </span>
          <span className={s.rw} data-set={set(2)}>{R_WORDS[1]} </span>
        </span>
        <span className={s.row}>
          <span className={s.rw} data-set={set(3)}>{R_WORDS[2]} </span>
          <span className={s.rw} data-set={set(4)}>
            {R_WORDS[3]}
            <span className={s.stopSquare} data-set={set(5)} /><span className={s.stopChar}>.</span>
          </span>
        </span>
      </span>
      </span>
    </h2>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className={`x-wrap ${s.frame}`}>
      <ChapterMark no={RULE.no} title={RULE.title} className={s.mark} />
      {children}
    </div>
  );
}

/** The hold. Same behaviour as the kit Stage (a tall block whose frame sticks while scroll drives
 *  it; a still in normal flow when motion is off), but the measured element is always mounted, so
 *  the scroll reading can never be taken from an unattached ref (see NOTES.md). */
export default function Manifesto({ entry }: { entry: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useStageMode() === "pinned";
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} className={s.manifesto} data-stage={pinned ? "pinned" : "flow"}>
      <div className={s.stick}>
        <Frame>
          {pinned ? <Lines key="live" entry={entry} progress={scrollYProgress} /> : <Lines key="still" />}
        </Frame>
      </div>
    </div>
  );
}
