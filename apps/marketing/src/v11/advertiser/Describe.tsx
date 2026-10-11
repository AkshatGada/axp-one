"use client";

// Describe. Plain words are the whole input: the offer is written on a sheet, and the things the
// advertiser listed settle out of it as solid blocks on a ledge. One thing is not listed. Until the
// reader lists it, a question that needs it is left alone (truth rule 2). Pressing the block sends
// one mark from the block to the slot below the answer, and the moment turns.
import { useRef, useState, type CSSProperties } from "react";
import { Split, useInView } from "../kit";
import { ADVERTISER, MOMENTS } from "../story";
import c from "./advertiser.module.css";

const MOMENT = MOMENTS.find((m) => m.id === "bitcoin");
const THING = ADVERTISER.unlisted;

export default function Describe() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  const add = useRef<HTMLButtonElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const [listed, setListed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [flight, setFlight] = useState<{ n: number; x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [said, setSaid] = useState("");
  const question = MOMENT?.question ?? "";
  const at = question.indexOf(THING);

  const toggle = () => {
    const next = !listed;
    if (next && ref.current && add.current && slot.current) {
      const o = ref.current.getBoundingClientRect(), a = add.current.getBoundingClientRect(), s = slot.current.getBoundingClientRect();
      setFlight((f) => ({ n: (f?.n ?? 0) + 1, x0: a.left + a.width / 2 - o.left, y0: a.top + a.height / 2 - o.top, x1: s.left + Math.min(40, s.width / 2) - o.left, y1: s.top + s.height / 2 - o.top }));
    }
    setListed(next);
    setTouched(true);
    setSaid(next ? `${THING} listed. This question: can appear.` : `${THING} not listed. This question: left alone.`);
  };

  return (
    <div ref={ref} className={`x-grid ${c.describe}`} data-seen={seen ? "" : undefined} data-listed={listed ? "" : undefined} data-touched={touched ? "" : undefined} onPointerDown={() => setTouched(true)} onKeyDown={() => setTouched(true)}>
      <div className={c.desk}>
        <div className={c.sheet}>
          <Split as="p" text={ADVERTISER.offer} chars className={c.offer} />
        </div>
        <ul className={c.shelf} aria-label="Listed">
          {ADVERTISER.listed.map((t, i) => (
            <li key={t} className={c.token} style={{ "--t": i } as CSSProperties}>{t}</li>
          ))}
          <li className={c.tokenSlot} style={{ "--t": ADVERTISER.listed.length } as CSSProperties}>
            <button ref={add} type="button" className={c.add} aria-pressed={listed} aria-label={`List ${THING}`} onClick={toggle}>
              <span className={c.addFill} aria-hidden />
              <span className={c.plus} aria-hidden />
              <span className={c.addWord}>{THING}</span>
            </button>
          </li>
        </ul>
      </div>

      <div className={c.moment}>
        <p className={c.q}>
          {at < 0 ? question : (<>{question.slice(0, at)}<span className={c.qKey}>{THING}</span>{question.slice(at + THING.length)}</>)}
        </p>
        <div className={c.answer} aria-hidden><i /><i /><i /></div>
        <div ref={slot} className={c.slot}>
          <p className={c.slotState} aria-hidden={listed}>
            <span className={c.slotWord}>Left alone</span>
            <span className={c.slotWhy}>{MOMENT?.why}</span>
          </p>
          <p className={c.slotState} data-yes aria-hidden={!listed}>
            <span className={c.slotWord}>Can appear</span>
            <span className={c.slotWhy}>{THING} is listed</span>
          </p>
        </div>
      </div>
      {listed && flight ? (
        <span key={flight.n} className={c.spark} aria-hidden style={{ "--x0": `${flight.x0}px`, "--y0": `${flight.y0}px`, "--x1": `${flight.x1}px`, "--y1": `${flight.y1}px` } as CSSProperties}><i /></span>
      ) : null}
      <span className={c.sr} role="status">{said}</span>
    </div>
  );
}
