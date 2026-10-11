"use client";

// Where they meet: the advertiser's limits arrive from the left, the app's rules from the right,
// the fit from above, and the card exists only where all three hold. The two fixed rules are drawn
// (never captioned)
// as ruled plates joined by solid ink lines; the judgment is a soft ultramarine shape joined by a
// dotted line. Below the card hangs the receipt, a small slip with two sides. Each agreement is a
// native switch (Tab, Space); releasing any one removes the card and voids the receipt. Local
// state only. Server-rendered complete, in the agreed state.
import { useState, type ReactNode } from "react";
import { ADVERTISER, RECEIPT } from "../story";
import { MEET } from "../copy";
import { Illustration, SponsoredCard, useInView } from "../kit";
import { KEYS, LOCAL, type Key } from "./local";
import s from "./meet.module.css";

const KIND: Record<Key, "rule" | "judgment"> = { adv: "rule", app: "rule", fit: "judgment" };

export default function Agreement({ rule, notes }: { rule: ReactNode; notes: ReactNode }) {
  const [on, setOn] = useState<Record<Key, boolean>>({ adv: true, app: true, fit: true });
  const [ref, seen] = useInView<HTMLDivElement>();
  const card = on.adv && on.app && on.fit;
  const off = KEYS.filter((k) => !on[k]);
  const yes = (v: boolean) => (v ? "" : undefined);

  return (
    <div ref={ref} className={s.spec} data-seen={yes(seen)} data-card={yes(card)}>
      <div className={s.label}>
        <Illustration />
        <p className={s.hint}>{LOCAL.hint}</p>
      </div>

      {KEYS.map((k, i) => {
        const a = MEET.agree[i]!;
        return (
          <label key={k} className={s.node} data-key={k} data-kind={KIND[k]} data-on={yes(on[k])}>
            <span className={`v8-h3 ${s.k}`}>{a.k}</span>
            <span id={`meet-${k}-v`} className={s.sr}>{a.v}</span>
            <span className={s.ctl}>
              <input type="checkbox" role="switch" aria-label={a.k} aria-describedby={`meet-${k}-v`} checked={on[k]} onChange={(e) => setOn((p) => ({ ...p, [k]: e.target.checked }))} />
              <span className={s.sw} aria-hidden />
              <span className={s.st}>{LOCAL.state[k][on[k] ? 0 : 1]}</span>
            </span>
          </label>
        );
      })}

      {KEYS.map((k) => (
        <i key={k} className={s.link} data-key={k} data-kind={KIND[k]} data-on={yes(on[k])} aria-hidden />
      ))}

      <div className={s.mid}>
        <i className={s.link} data-key="fit" data-in="" data-kind="judgment" data-on={yes(on.fit)} aria-hidden />
        <div className={s.slot}>
          <SponsoredCard name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} className={s.card} />
          <div className={s.none} aria-hidden={card}>
            <span className={s.noneH}>{LOCAL.none}</span>
            {off.map((k) => (
              <span key={k}>{LOCAL.reason[k]}</span>
            ))}
          </div>
        </div>
        <i className={s.drop} aria-hidden />
      </div>

      <div className={s.rcpt}>
        <div className={s.rIn} aria-hidden={!card}>
          <div className={s.rHead}>
            <span className={s.rTitle}>{RECEIPT.title}</span>
            <p className={s.rConf}>{RECEIPT.confirms}</p>
          </div>
          <i className={s.perf} aria-hidden />
          <dl className={s.sides}>
            {[RECEIPT.advertiser, RECEIPT.app].map((side) => (
              <div key={side.label} className={s.side}>
                <dt>{side.label}</dt>
                <dd className={s.sState}>{side.state}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className={s.void} aria-hidden={card}>
          <span className={s.noneH}>{LOCAL.noReceipt}</span>
        </p>
      </div>

      <p className={s.sr} aria-live="polite">
        {card ? LOCAL.agreed : `${LOCAL.none} ${off.map((k) => LOCAL.reason[k]).join(" ")} ${LOCAL.noReceipt}`}
      </p>

      <div className={s.rule}>{rule}</div>
      <div className={s.notes}>{notes}</div>
    </div>
  );
}
