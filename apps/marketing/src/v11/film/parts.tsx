// The film's props: Tidewater's furniture, a reader (an advertiser's agent), the receipt. Shared by
// the pinned film and by the still sequence, so both draw the same objects.
import type { CSSProperties, ReactNode, Ref } from "react";
import { AGENTS, APP, MOMENTS, NO_AD, QUESTION, RECEIPT } from "../story";
import s from "./film.module.css";

/** Why every agent sits the second question out (the story's own words for that moment). */
export const CODA_WHY = MOMENTS.find((m) => m.id === "learn")?.why ?? "";
export const SITS_OUT = "Sits out";

/** The words of the question each reader's reason rests on. For the fit, one phrase per reason, in
 *  the order of its reasons; for the others, the phrase that rules them out. See NOTES.md. */
const CARES: Record<string, string[]> = {
  HarborKey: ["hardware wallet", "keys offline", "Solana"],
  ClearVault: ["hardware wallet"],
  ColdNest: ["Solana"],
};

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
      <span className={s.barKind}>{APP.kind}</span>
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
      <span className={s.placeholder}>Ask anything</span>
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

/** One advertiser's agent, as a reader: its name, the question it is reading (the words it cares
 *  about marked), its judgment (round, ultramarine when it fits) and its verdict in words.
 *  `second` adds the coda's question and verdict as a second layer. */
export function Reader({ index, on, second, style, innerRef }: { index: number; on?: boolean; second?: boolean; style?: CSSProperties; innerRef?: Ref<HTMLDivElement> }) {
  const a = AGENTS[index]!;
  const fits = a.verdict === "fits";
  const phrases = CARES[a.name] ?? [];
  const reasons = fits ? a.why.split(", ") : [a.why];
  return (
    <div className={s.reader} data-fit={fits ? "" : undefined} style={{ ...style, ...vars({ "--nh": phrases.length }) }} ref={innerRef}>
      <div className={s.rdHead}>
        <span className={s.rdName}>{a.name}</span>
        <span className={`x-sw ${s.rdSw}`} data-kind="judgment" data-on={on ? "" : undefined} aria-hidden />
      </div>
      <div className={s.rdQs}>
        <p className={s.rdQ} data-layer="1"><Marked text={QUESTION} phrases={phrases} /></p>
        {second ? <p className={s.rdQ} data-layer="2">{NO_AD.question}</p> : null}
        <i className={s.beam} aria-hidden />
      </div>
      <div className={s.rdOuts}>
        <p className={s.rdOut} data-layer="1">
          <b>{cap(a.verdict)}</b>
          {reasons.map((r, k) => (
            <span key={r} className={s.reason} style={vars({ "--k": k })}>{r}</span>
          ))}
        </p>
        {second ? (
          <p className={s.rdOut} data-layer="2">
            <b>{SITS_OUT}</b>
            <span className={s.reason}>{CODA_WHY}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The receipt: it confirms the insertion; on one side an accepted charge, on the other an accrual,
 *  in the story's exact words. Two statements side by side. Never a payment. */
export function Receipt({ r0 = true, r1 = true }: { r0?: boolean; r1?: boolean }) {
  return (
    <div className={s.receipt}>
      <p className={s.rTitle}>{RECEIPT.title}</p>
      <p className={s.rConfirms}>{RECEIPT.confirms}</p>
      <dl className={s.rSides}>
        <div className={s.rSide}>
          <dt>{RECEIPT.advertiser.label}</dt>
          <dd>
            <i className={s.latch} data-on={r0 ? "" : undefined} aria-hidden />
            {RECEIPT.advertiser.state}
          </dd>
        </div>
        <div className={s.rSide}>
          <dt>{RECEIPT.app.label}</dt>
          <dd>
            <i className={s.latch} data-on={r1 ? "" : undefined} aria-hidden />
            {RECEIPT.app.state}
          </dd>
        </div>
      </dl>
      <p className={s.rLater}>{RECEIPT.later}</p>
    </div>
  );
}
