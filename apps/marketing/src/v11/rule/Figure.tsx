"use client";

// The figure: one line of events, read left to right (top to bottom on phones).
//   Decide   the question, in plain language. A keyword match (rigid ink frames) catches only a bare
//            word or two; the agent's reading (a soft ultramarine wash) takes in the whole sentence,
//            and resolves into a soft round mark: the judgment.
//   Deliver  the kit's Sponsored card arrives below the app's answer.
//   Pay      a two-sided receipt (a charge accepted, earnings accrued) and, straight beneath it, the
//            charge joining a running total. The total sits on an ink rail between two ink bounds:
//            a bracket the width of the most a placement may cost, and a wall at the total budget.
//   Settle   later, the total is closed with a bookkeeper's double rule (a caption under the rail).
// The principle is set down the left as a matched pair, each half beside what it describes and
// carrying its reason: the judgment (soft, ultramarine) beside the reading, the rule (rigid, ink)
// beside the bounds. Several deliveries follow the first, each one a small block under the bracket, with nobody
// approving them. Nothing moves toward the app: its side is an accrual, in words. It plays once as
// it enters view (about three and a half seconds) and rests. It is a picture with one-word labels:
// nothing to operate, nothing focusable.
import { useEffect, useState, type CSSProperties } from "react";
import { Ad } from "../kit";
import { PAY } from "../copy";
import { ADVERTISER, AGENTS, QUESTION, SHIFT } from "../story";
import { useEntry } from "./useEntry";
import s from "./rule.module.css";

// Earlier charges already on the rail: relative widths only (no amount is implied or shown).
const EARLIER = [1, 0.6, 1.2, 0.8, 1.1, 0.5, 0.95, 1.25, 0.7, 1.05, 0.55, 1.15, 0.75, 1, 0.6, 1.2, 0.9, 0.5, 1.1, 0.8, 1.25, 0.65, 1.0, 0.85];
// The deliveries the figure plays: each narrower than the bracket (28 units).
const PLAYED = [20, 16, 22, 18];
const w = (n: number) => ({ "--w": n }) as CSSProperties;

const [decide, deliver, pay, settle] = PAY.steps;
const agent = AGENTS[0];
// The question, cut at the only words a keyword list would catch.
const CAUGHT = new RegExp(`(${SHIFT.keywords.join("|")})`, "i");
const PARTS = QUESTION.split(CAUGHT);

function Half({ n, kind }: { n: 0 | 1; kind: "soft" | "hard" }) {
  const why = PAY.why[n];
  return (
    <div className={s.half} data-kind={kind}>
      <p className={s.say}>{PAY.principle[n]}</p>
      {why && kind === "soft" ? <p className={s.why}>{why.short}</p> : null}
    </div>
  );
}

function Cap({ step }: { step: { k: string; line: string } | undefined }) {
  if (!step) return null;
  return (
    <h3 className={s.cap}>{step.k}</h3>
  );
}

export default function Figure() {
  const [ref, entry] = useEntry<HTMLDivElement>(0.34, 1800);
  // On phones the column is long: the receipt and the rail wait for their own arrival, so they do
  // not finish before they are scrolled to. On laptops everything is one performance.
  const [railRef, railEntry] = useEntry<HTMLDivElement>(0.7);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return (
    <figure className={s.figure}>
      <div ref={ref} className={s.board} data-entry={entry} data-late={phone ? railEntry : entry}>
        <Half n={0} kind="soft" />
        <ol className={s.steps}>
          <li className={s.step} data-k="decide">
            <Cap step={decide} />
            <div className={s.pic}>
              <p className={s.q}>
                <span className={s.qWash} aria-hidden><span>{PARTS.map((part, n) => (n % 2 ? <span key={n} className={s.gap}>{part}</span> : part))}</span></span>
                <span className={s.qText}>
                  {PARTS.map((part, n) => (n % 2 ? <span key={n} className={s.caught}>{part}</span> : part))}
                </span>
              </p>
              <span className={s.orb} aria-hidden><i className={s.ring} /><i className={s.halo} /><i className={s.core} /></span>
              {agent ? (
                <p className={s.verdict}><span>{agent.name}</span> <b>{agent.verdict}</b></p>
              ) : null}
              <span className={s.thread} data-seg="a" aria-hidden><i className={s.run} /></span>
            </div>
          </li>

          <li className={s.step} data-k="deliver">
            <Cap step={deliver} />
            <div className={s.pic}>
              <span className={s.thread} data-seg="b" aria-hidden><i className={s.run} /></span>
              <div className={s.chat}>
                <span className={s.answer} aria-hidden><i /><i /><i /></span>
                <div className={s.cardBox}>
                  <Ad name={ADVERTISER.name} text={ADVERTISER.creative} size="m" className={s.ad} />
                </div>
              </div>
            </div>
          </li>

          <li className={s.step} data-k="pay">
            <Cap step={pay} />
            <div className={s.pic}>
              <div ref={railRef} className={s.receipt}>
                {PAY.sides.map((side, n) => (
                  <p key={side.who} className={s.rSide} data-side={n ? "app" : "advertiser"}>
                    <span className={s.rState}><i aria-hidden />{side.state}</span>
                  </p>
                ))}
              </div>
            </div>
          </li>

          <li className={s.step} data-k="settle">
            <div className={s.rail}>
              <div className={s.track}>
                <div className={s.total}>
                  <span className={s.earlier} aria-hidden>
                    {EARLIER.map((n, i) => <i key={i} style={w(n)} />)}
                  </span>
                  {PLAYED.map((n, i) => <i key={i} className={s.charge} style={w(n)} aria-hidden />)}
                  <span className={s.gate}>
                    <i className={s.drop} aria-hidden />
                    <span className={s.gateLabel}>{ADVERTISER.limits[0]}</span>
                  </span>
                  <i className={s.closed} aria-hidden />
                  {settle ? <h3 className={`${s.cap} ${s.settle}`}>{settle.k}</h3> : null}
                </div>
                <i className={s.wall} aria-hidden />
                <span className={s.wallLabel}>{ADVERTISER.limits[1]}</span>
              </div>
            </div>
          </li>
        </ol>

        <Half n={1} kind="hard" />

      </div>
    </figure>
  );
}
