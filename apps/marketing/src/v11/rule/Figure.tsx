"use client";

// The figure: one Sponsored card, held by three things. Two are rules (rigid ink holds with square
// heads, which snap) and one is a judgment (a soft ultramarine hold with a round head, which
// settles). Beneath it, the receipt: an accepted charge and an accrual, in words. It plays once as
// it enters view (the three come to hold the card, the receipt is written) and rests. There is
// nothing to operate: the only focusable thing is the proof link.
import { Ad, Arrow, Fig } from "../kit";
import { PROOF, RULE } from "../copy";
import { ADVERTISER, RECEIPT } from "../story";
import { keep } from "./keep";
import { useEntry } from "./useEntry";
import s from "./rule.module.css";

export default function Figure() {
  const [ref, entry] = useEntry<HTMLDivElement>(0.42);
  return (
    <div className={s.figure}>
      <Fig className={s.fig}>
        <div ref={ref} className={s.board} data-entry={entry}>
          <ul className={s.holds}>
            {RULE.agree.map((a) => (
              <li key={a.k} className={s.hold} data-kind={a.kind}>
                <span className={s.holdText}>
                  <span className={s.holdK}>{a.k}</span>
                  <span className={s.holdState}><i aria-hidden />{a.state}</span>
                </span>
                <span className={s.track} aria-hidden><span className={s.bolt} /></span>
              </li>
            ))}
          </ul>

          <div className={s.slot}>
            <div className={s.cardBox}>
              <Ad name={ADVERTISER.name} text={keep(ADVERTISER.creative)} domain={ADVERTISER.domain} size="l" className={s.ad} />
            </div>
          </div>

          <div className={s.receipt}>
            <div className={s.rHead}>
              <p className={s.rTitle}>{RECEIPT.title}</p>
              <p className={s.rConfirms}>{RECEIPT.confirms}</p>
              {PROOF.href ? (
                <a className={s.proof} href={PROOF.href} target="_blank" rel="noopener noreferrer">
                  <span className={s.proofText}><span>{PROOF.text}</span><Arrow width={20} /></span>
                  {" "}
                  <span className={s.proofLabel}>{PROOF.label}</span>
                </a>
              ) : null}
            </div>
            <div className={s.rSides}>
              {[RECEIPT.advertiser, RECEIPT.app].map((side) => (
                <div key={side.label} className={s.rSide}>
                  <p className={s.rLabel}>{side.label}</p>
                  <p className={s.rState}><i aria-hidden />{side.state}</p>
                </div>
              ))}
            </div>
            <div className={s.rFoot}>
              <p>{RECEIPT.later}</p>
              <p>{RECEIPT.limit}</p>
            </div>
          </div>
        </div>
      </Fig>
    </div>
  );
}
