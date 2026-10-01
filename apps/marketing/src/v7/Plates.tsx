// v7 exploded card: the six plates behind one Sponsored card, as small real specimens from the
// recorded run. Drawn for crispness: every plate is laid out at its final pixel size, placed with a
// 2D matrix whose translation is rounded to whole pixels, and never promoted to its own layer
// (no will-change, no 3D), so its text is painted as live text at the screen's resolution in
// every frame. The geometry is one pure function, shared by the hero (scroll), the reduced-motion
// still and /design.
import type { CSSProperties, ReactNode } from "react";
import { CACHED, CV, CV_CHANNEL, HELPFUL_EXCERPT, KF, LG, RUN, usdc } from "@/data/run";
import { STACK } from "@/data/copy";
import { IDENTITY, mixM, mul, rotate, scale, skewX, type M2 } from "@/motion/motion";
import s from "./plates.module.css";

export type PlateId = keyof typeof STACK.plates;
export const PLATE_IDS: PlateId[] = ["answer", "card", "auction", "agents", "evidence", "payment"];
export const PW = 480;
export const PH = 210;
/** Vertical distance between exploded plates, in plate pixels. */
export const GAP = 138;

const cut = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}…`);
const winner = CACHED.winner;
/** The v7 plate: a sheet laid on the table, seen from the front right. Flatter than v4 (0.6) so
 *  six plates fit a laptop screen with only a hairline of overlap. */
export const PLATE_M7: M2 = mul(rotate(-3), mul(skewX(-26), scale(1, 0.6)));

function Body({ id }: { id: PlateId }) {
  switch (id) {
    case "answer":
      return (
        <>
          <p className={s.q}>{CACHED.question}</p>
          <p className={s.lines}>{cut(HELPFUL_EXCERPT, 118)}</p>
        </>
      );
    case "card":
      return (
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.sponsored}>Sponsored</span>
            <b>{CV.name}</b>
          </div>
          <p>{cut(CV.approvedText ?? "", 92)}</p>
        </div>
      );
    case "auction":
      return (
        <div className={s.rows}>
          {CACHED.bids.map((b) => (
            <div key={b.campaign} className={s.row} data-win={b.campaign === winner ? "" : undefined}>
              <span>{b.name}</span>
              <span className={s.num}>{usdc(b.amount)} USDC</span>
            </div>
          ))}
          <div className={s.row} data-quiet="">
            <span>{STACK.price}</span>
          </div>
        </div>
      );
    case "agents":
      return (
        <div className={s.agents}>
          <div className={s.agent}>
            <b>{CV.name}</b>
            <span className={s.pill}>Bid</span>
          </div>
          <div className={s.agent}>
            <b>{KF.name}</b>
            <span className={s.pill}>Bid</span>
          </div>
          <div className={s.agent} data-out="">
            <b>{LG.name}</b>
            <span className={s.pill} data-out="">{STACK.ruledOut}</span>
          </div>
        </div>
      );
    case "evidence":
      return (
        <div className={s.evi}>
          <div>
            <span className={s.eviK}>Prompt</span>
            <span>{RUN.evidence.observedPrompt}</span>
          </div>
          <div>
            <span className={s.eviK}>Audience</span>
            <span>{cut(RUN.evidence.hintText, 78)}</span>
          </div>
        </div>
      );
    case "payment": {
      const dep = Number(CV_CHANNEL.deposit);
      const vs = CV_CHANNEL.vouchers;
      return (
        <div className={s.pay}>
          <div className={s.payTrack}>
            {vs.map((v, k) => {
              const prev = k === 0 ? 0 : Number(vs[k - 1]!.cumulative);
              return <i key={k} style={{ left: `${(prev / dep) * 100}%`, width: `${((Number(v.cumulative) - prev) / dep) * 100}%` } as CSSProperties} />;
            })}
          </div>
          <div className={s.payRow}>
            <span>
              {vs.map((v) => usdc(v.cumulative)).join(", then ")} <span className={s.dim}>of {usdc(CV_CHANNEL.deposit)}</span>
            </span>
            <span className={s.dim}>one close</span>
          </div>
        </div>
      );
    }
  }
}

export function Plate({ id, style, plateRef }: { id: PlateId; style?: CSSProperties; plateRef?: (el: HTMLDivElement | null) => void }) {
  const p = STACK.plates[id];
  return (
    <div ref={plateRef} className={s.plate} data-id={id} style={style}>
      <div className={s.bar}>
        <span className={s.name}>{p.name}</span>
        <span className={s.note}>{p.note}</span>
      </div>
      <div className={s.body}>
        <Body id={id} />
      </div>
    </div>
  );
}

/** Plate i's matrix (in its own frame, origin at its centre): tilt 0 flat, 1 laid on the table;
 *  explode 0 stacked, 1 apart. The caller adds the stack centre. Translation rounded. */
export function plateMatrix(i: number, tilt: number, explode: number, k: number): M2 {
  const base = mixM(IDENTITY, PLATE_M7, tilt);
  const y = (i - (PLATE_IDS.length - 1) / 2) * GAP * k * explode;
  const m = mul([1, 0, 0, 1, 0, Math.round(y)], mul([k, 0, 0, k, 0, 0], base));
  return m;
}

/** The exploded stack's projected size at scale k (for fitting it to a viewport). */
export function stackSize(k: number) {
  // A laid plate's bounding box: width plus the skew run of its height, height squashed.
  const w = (PW + PH * 0.6 * Math.tan((26 * Math.PI) / 180)) * k + 40;
  const h = ((PLATE_IDS.length - 1) * GAP + PH * 0.6 + PW * Math.sin((3 * Math.PI) / 180)) * k + 30;
  return { w, h };
}

const css = (m: M2) => `matrix(${m.map((v, i) => (i >= 4 ? Math.round(v) : +v.toFixed(5))).join(",")})`;

/** A still exploded stack, for reduced motion and /design: a fixed canvas, plates placed in it. */
export function StillStack({ k = 0.9, label }: { k?: number; label?: ReactNode }) {
  const { w, h } = stackSize(k);
  const W = Math.ceil(w);
  const H = Math.ceil(h);
  const cx = Math.round(W / 2);
  const cy = Math.round(H / 2);
  return (
    <div className={s.still} style={{ width: W, height: H }} aria-label={typeof label === "string" ? label : undefined}>
      <i className={s.route} style={{ left: cx, top: cy - Math.round(((PLATE_IDS.length - 1) / 2) * GAP * k), height: Math.round((PLATE_IDS.length - 1) * GAP * k) }} />
      {PLATE_IDS.map((id, i) => (
        <Plate key={id} id={id} style={{ left: cx - PW / 2, top: cy - PH / 2, transform: css(plateMatrix(i, 1, 1, k)), zIndex: PLATE_IDS.length - i }} />
      ))}
    </div>
  );
}

export { css as plateCss };

/** Phones: the same plates, flat, in flow. */
export function FlatStack() {
  return (
    <div className={s.flat}>
      {PLATE_IDS.map((id) => (
        <Plate key={id} id={id} />
      ))}
    </div>
  );
}
