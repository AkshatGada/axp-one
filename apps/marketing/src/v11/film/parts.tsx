// The film's props: Tidewater's furniture and the reader (the agent that fits). The receipt is its
// own file (Receipt.tsx), so the rest of the page can use the same one. Shared by
// the pinned film and by the still sequence, so both draw the same objects.
import type { CSSProperties, ReactNode, Ref } from "react";
import { AGENTS, APP, QUESTION } from "../story";
import s from "./film.module.css";

/** The agent that fits, and the words of the question its three reasons rest on (one phrase per
 *  reason, in the order of its reasons; see NOTES.md). */
export const FIT = AGENTS.find((a) => a.verdict === "fits") ?? AGENTS[0]!;
const PHRASES = ["hardware wallet", "keys offline", "Solana"];
/** The others: one muted line each (a name and its verdict). No sheets of their own, no reasons. */
export function Others({ className, innerRef }: { className?: string; innerRef?: Ref<HTMLUListElement> }) {
  return (
    <ul className={`${s.others}${className ? ` ${className}` : ""}`} ref={innerRef}>
      {AGENTS.filter((a) => a.verdict !== "fits").map((a) => (
        <li key={a.name}><b>{a.name}</b><span>{cap(a.verdict)}</span></li>
      ))}
    </ul>
  );
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const vars = (o: Record<string, string | number>) => o as CSSProperties;

/** Tidewater's mark: two lines of tide. */
export function Tide({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="1em" height="1em" fill="none" aria-hidden>
      <path d="M2 7.6c2.7-2.9 5.3-2.9 8 0s5.3 2.9 8 0M2 13.4c2.7-2.9 5.3-2.9 8 0s5.3 2.9 8 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** The top bar of the app. */
export function Bar() {
  return (
    <div className={s.bar}>
      <Tide className={s.barMark} />
      <span className={s.barName}>{APP.name}</span>
    </div>
  );
}

/** The small line that says who is answering. */
export function AnswerMark() {
  return (
    <p className={s.aMark}>
      <Tide />
      <span>{APP.name}</span>
    </p>
  );
}

export function SendMark() {
  return (
    <i className={s.send}>
      <svg viewBox="0 0 12 12" width=".6em" height=".6em" fill="none" aria-hidden>
        <path d="M6 10.5V1.8M2.2 5.4 6 1.6l3.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
      </svg>
    </i>
  );
}

/** The place where the reader types, at rest. */
export function Composer() {
  return (
    <div className={s.composer} aria-hidden>
      <SendMark />
    </div>
  );
}

/** The question with the phrases a reader cares about marked. */
function Marked({ text, phrases }: { text: string; phrases: string[] }) {
  const out: ReactNode[] = [];
  let rest = text;
  phrases.forEach((ph, k) => {
    const at = rest.indexOf(ph);
    if (at < 0) return;
    if (at > 0) out.push(rest.slice(0, at));
    out.push(<span key={ph} className={s.hit} style={vars({ "--k": k })}>{ph}</span>);
    rest = rest.slice(at + ph.length);
  });
  out.push(rest);
  return <>{out}</>;
}

/** The agent that fits, as a reader: its name, the question it is reading (the three phrases its
 *  judgment rests on marked), a round mark with the word Fits, and its three reasons. Every word is
 *  on the sheet whenever the sheet is; the film only lights what is already there. */
export function Reader() {
  const reasons = FIT.why.split(", ");
  return (
    <div className={s.reader} style={vars({ "--nh": PHRASES.length })}>
      <p className={s.rdName}>{FIT.name}</p>
      <div className={s.rdQs}>
        <p className={s.rdQ}><Marked text={QUESTION} phrases={PHRASES} /></p>
        <i className={s.beam} aria-hidden />
      </div>
      <div className={s.rdOuts}>
        <p className={s.rdVerdict}>
          <i className={s.mark} aria-hidden />
          <b>{cap(FIT.verdict)}</b>
        </p>
        <p className={s.rdWhy}>
          {reasons.map((r, k) => (
            <span key={r} className={s.reason} style={vars({ "--k": k })}>{r}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
