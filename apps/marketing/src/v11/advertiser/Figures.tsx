// The four small figures. Server-rendered and complete as written: the entry performance is CSS
// only (advertiser.module.css), armed by the part's [data-seen]. Nothing here can be pressed.
import type { CSSProperties } from "react";
import { Ad } from "../kit";
import { ADVERTISER, MOMENTS } from "../story";
import c from "./advertiser.module.css";

/** Describe: the offer as written, and the listed things settling out of it. */
export function Describe() {
  return (
    <div className={c.describe}>
      <p className={c.offer}>{ADVERTISER.offer}</p>
      <ul className={c.tokens}>
        {ADVERTISER.listed.map((t, i) => (
          <li key={t} className={c.token} style={{ "--t": i } as CSSProperties}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/** Approve: the exact Sponsored words, with an ink seal on them. */
export function Approve() {
  return (
    <div className={c.approve}>
      <Ad size="s" name={ADVERTISER.name} text={ADVERTISER.creative} className={c.card} />
      <span className={c.seal} role="img" aria-label="Approved">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
          <path d="M1.5 6.2l4.3 4.1L14.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
        </svg>
      </span>
    </div>
  );
}

/** Limit: two named ink bounds. Something soft meets each and does not pass. */
export function Limit() {
  const [each, total] = ADVERTISER.limits;
  return (
    <div className={c.limit}>
      <p className={c.bound}>{each}</p>
      <div className={c.room} aria-hidden>
        <i className={c.rise} />
        <i className={c.reach} />
      </div>
      <p className={c.bound} data-side>{total}</p>
    </div>
  );
}

/** See why: one placement (a card below an answer) and its reason. */
export function See() {
  const m = MOMENTS.find((x) => x.outcome === "appears");
  return (
    <div className={c.see}>
      <div className={c.thumb} aria-hidden>
        <i className={c.ask} />
        <i className={c.bar} />
        <i className={c.bar} />
        <i className={c.bar} />
        <span className={c.mini}><i /><i /></span>
      </div>
      <div className={c.reason}>
        <p className={c.out}>Appears</p>
        <p className={c.why}>{m?.why}</p>
      </div>
    </div>
  );
}
