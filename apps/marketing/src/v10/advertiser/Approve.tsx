"use client";

// Approve. The approved Sponsored words lie on a proof with crop marks, held by a seal. What runs
// is those words, character for character. Change a word and the card comes off its marks, is
// struck through, and the seal breaks: nothing runs. Press the seal (or the control) and it is
// stamped again, on the words now on the card.
import { useState, type ReactNode } from "react";
import { Ad, useInView } from "../kit";
import { ADVERTISER } from "../story";
import c from "./advertiser.module.css";

/** The one word this illustration changes, and what it becomes. Local state only. */
const WORD = "offline", OTHER = "safe";
const [BEFORE, AFTER] = ADVERTISER.creative.split(WORD);

// A scalloped disc, like pressed wax. Rounded so server and client agree.
const DISC = (() => {
  const n = 20, r = 53, R = 60;
  const p = (rad: number, a: number) => `${(60 + rad * Math.cos(a)).toFixed(2)} ${(60 + rad * Math.sin(a)).toFixed(2)}`;
  let d = `M${p(r, 0)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    d += `Q${p(R, (a0 + a1) / 2)} ${p(r, a1)}`;
  }
  return `${d}Z`;
})();

function Wax() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden focusable="false">
      <path d={DISC} fill="currentColor" />
      <circle cx="60" cy="60" r="41" fill="none" stroke="var(--x-paper)" strokeOpacity=".38" strokeWidth="1.25" />
      <path d="M41 61.5l13 13 26-29" fill="none" stroke="var(--x-paper)" strokeWidth="5.5" strokeLinecap="square" />
    </svg>
  );
}

export default function Approve() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const [sealed, setSealed] = useState(true);
  const [again, setAgain] = useState(false);
  const [other, setOther] = useState(false);
  const [said, setSaid] = useState("");

  const change = () => { setSealed(false); setAgain(true); setOther((o) => !o); setSaid("A word changed. The seal is broken. Nothing runs until you approve again."); };
  const approve = () => { setSealed(true); setSaid("Approved. These exact words run."); };
  const text: ReactNode = AFTER === undefined ? ADVERTISER.creative : (<>{BEFORE}<span className={c.edit} data-fresh={sealed ? undefined : ""}>{other ? OTHER : WORD}</span>{AFTER}</>);

  return (
    <div ref={ref} className={`x-grid ${c.approve}`} data-seen={seen ? "" : undefined} data-sealed={sealed ? "" : undefined} data-again={again ? "" : undefined}>
      <div className={c.proof}>
        <div className={c.adWrap}>
          <span className={c.crop} data-c="tl" aria-hidden /><span className={c.crop} data-c="tr" aria-hidden />
          <span className={c.crop} data-c="bl" aria-hidden /><span className={c.crop} data-c="br" aria-hidden />
          <div className={c.card}>
            <Ad size="l" name={ADVERTISER.name} text={text} className={c.ad} />
            <span className={c.void} aria-hidden />
          </div>
        </div>
        <button type="button" className={c.seal} onClick={sealed ? undefined : approve} aria-disabled={sealed} aria-label={sealed ? "Approved" : "Approve these words"}>
          <span className={c.sealRing} aria-hidden />
          <span className={c.half} data-h="l"><Wax /></span>
          <span className={c.half} data-h="r"><Wax /></span>
        </button>
      </div>

      <div className={c.bench}>
        <p className={c.verdict}>
          <span aria-hidden={!sealed} data-on={sealed ? "" : undefined}>Approved.</span>
          <span aria-hidden={sealed} data-on={sealed ? undefined : ""}>Changed. Nothing runs.</span>
        </p>
        <button type="button" className={c.key} data-solid={sealed ? undefined : ""} onClick={sealed ? change : approve}>
          {sealed ? "Change a word" : "Approve again"}
        </button>
      </div>
      <span className={c.sr} role="status">{said}</span>
    </div>
  );
}
