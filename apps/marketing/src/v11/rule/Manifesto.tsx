"use client";

// The manifesto. Two sentences that look and move differently, because that difference is the idea.
// "Agents judge fit." is a judgment: light, wide, ultramarine, with a round stop. Its words rise
// softly. "Fixed rules decide money." is a rule: heavy, ink, under a ruled line, with a square
// stop. Its words are set with hard cuts. It plays once as it enters view, and rests.
import { Fragment, type CSSProperties } from "react";
import { RULE } from "../copy";
import { useEntry } from "./useEntry";
import s from "./rule.module.css";

const LABEL = RULE.lines.join(" ");
const words = (t: string) => t.replace(/\.$/, "").split(" ");
const J_WORDS = words(RULE.lines[0] ?? ""); // Agents, judge, fit
const R_WORDS = words(RULE.lines[1] ?? ""); // Fixed, rules, decide, money
const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default function Manifesto() {
  const [ref, entry] = useEntry<HTMLHeadingElement>(0.55);
  const jLast = J_WORDS.length - 1;
  const rLast = R_WORDS.length - 1;
  const rHalf = Math.ceil(R_WORDS.length / 2);
  return (
    <h2 ref={ref} id="rule-h" className={s.manifesto} data-entry={entry} aria-label={LABEL}>
      <span className={s.judge} aria-hidden>
        {J_WORDS.map((w, n) => (
          <Fragment key={n}>
            <span className={s.jw} style={i(n)}>
              {w}
              {n === jLast ? (
                <>
                  <span className={s.stopRound} />
                  <span className={s.stopChar}>.</span>
                </>
              ) : " "}
            </span>
            {n === 0 ? <br className={s.brNarrow} /> : null}
          </Fragment>
        ))}
      </span>
      <span className={s.hard} aria-hidden />
      <span className={s.fixed} aria-hidden>
        {R_WORDS.map((w, n) => (
          <Fragment key={n}>
            <span className={s.rw} style={i(n)}>
              {w}
              {n === rLast ? (
                <>
                  <span className={s.stopSquare} />
                  <span className={s.stopChar}>.</span>
                </>
              ) : " "}
            </span>
            {n === rHalf - 1 ? <br className={s.brNarrow} /> : null}
          </Fragment>
        ))}
      </span>
    </h2>
  );
}
