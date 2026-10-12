// The four small figures. Server-rendered and complete as written: the entry performance is CSS
// only (advertiser.module.css), armed by the part's [data-entry]. Nothing here can be pressed.
import type { CSSProperties } from "react";
import { Ad } from "../kit";
import { ADVERTISER, AGENTS } from "../story";
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

/** Limit: the page's figure for money, small. Deliveries add up along an ink baseline; an ink
 *  bracket over the newest is the most one placement may cost; an ink wall is the total budget,
 *  and the row stops short of it. Two ink bars mark the pause. A mark, not a control. */
const ROW = [8, 5, 9.5, 6.5, 9, 5];
export function Limit() {
  const [each, total] = ADVERTISER.limits;
  return (
    <div className={c.limit}>
      <div className={c.track}>
        <div className={c.row} aria-hidden>
          {ROW.map((w, i) => (
            <i key={i} className={c.block} style={{ "--w": w, "--t": i } as CSSProperties} />
          ))}
          <i className={c.block} data-new style={{ "--t": ROW.length } as CSSProperties} />
          <i className={c.gate} />
          <span className={c.pause}><i /><i /></span>
        </div>
        <span className={c.gateLabel}>{each}</span>
        <i className={c.wall} aria-hidden />
        <span className={c.wallLabel}>{total}</span>
      </div>
    </div>
  );
}

/** See why: one placement (a card below an answer), its outcome and its reasons, in the film's words. */
export function See() {
  const a = AGENTS[0];
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
        <p className={c.out}>Fits</p>
        <p className={c.why}>{a?.why}</p>
      </div>
    </div>
  );
}
