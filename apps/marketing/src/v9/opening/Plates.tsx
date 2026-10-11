// Six layers behind one Sponsored card, drawn as pictures with very few words. Illustration only:
// fictional advertisers from the frozen story, no figures, no scores, nothing recorded.
// Drawn for crispness: every plate is laid out at its final pixel size, placed with a 2D matrix
// whose translation is rounded to whole pixels, and never promoted to its own layer (no
// will-change, no 3D), so its text is painted as live text at the screen's resolution in every
// frame. The geometry is pure functions, shared by the hero (scroll) and the stills.
import type { CSSProperties, ReactNode } from "react";
import { STACK } from "../copy";
import { ADVERTISER, PLACEMENT } from "../story";
import { IDENTITY, mixM, mul, rotate, scale, skewX, type M2 } from "@/motion/motion";
import s from "./plates.module.css";

export type PlateId = keyof typeof STACK.plates;
export const PLATE_IDS: PlateId[] = ["answer", "card", "auction", "agents", "evidence", "payment"];
export const PW = 480;
export const PH = 210;
/** Vertical distance between exploded plates, in plate pixels. */
export const GAP = 138;
/** Vertical distance between plates when the stack closes back into a deck. */
export const DECK = 11;

/** A sheet laid on the table, seen from the front right. */
export const PLATE_M7: M2 = mul(rotate(-3), mul(skewX(-26), scale(1, 0.6)));

/** Local wording for the plate pictures (proposals; listed in NOTES.md). */
const W = {
  fits: "Fits",
  out: "Sits out",
  placed: "Placed",
  limit: "its limit",
  advertiser: "Advertiser",
  app: "AI app",
  total: "Running total",
};
/** Who judged what, in words. HarborKey and KeyArc fit this question; the others sit out. */
const JUDGED: { name: string; fits: boolean }[] = [
  { name: ADVERTISER.name, fits: true },
  { name: "KeyArc", fits: true },
  { name: "ClearVault", fits: false },
  { name: "ColdNest", fits: false },
];
/** The two that fit, each bidding inside its own limit. Lengths are a drawing, not amounts. */
const BIDS: { name: string; bid: number; cap: number; win?: boolean }[] = [
  { name: ADVERTISER.name, bid: 68, cap: 82, win: true },
  { name: "KeyArc", bid: 46, cap: 58 },
];

const Tick = () => (
  <svg className={s.tick} viewBox="0 0 12 12" aria-hidden>
    <path d="M2.6 6.4l2.3 2.3 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Body({ id }: { id: PlateId }) {
  switch (id) {
    case "answer":
      return (
        <div className={s.answer}>
          <p className={s.q}>{PLACEMENT.moment.question}</p>
          <div className={s.lines} aria-hidden><i /><i /><i /></div>
        </div>
      );
    case "card":
      return (
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.sponsored}>Sponsored</span>
            <b>{ADVERTISER.name}</b>
          </div>
          <p>{ADVERTISER.creative}</p>
        </div>
      );
    case "auction":
      return (
        <div className={s.lanes}>
          {BIDS.map((b) => (
            <div key={b.name} className={s.lane} data-win={b.win ? "" : undefined}>
              <span className={s.laneName}>{b.name}</span>
              <span className={s.track} style={{ "--bid": `${b.bid}%`, "--cap": `${b.cap}%` } as CSSProperties}>
                <i className={s.fill} />
                <i className={s.cap} />
                {b.win ? <em className={s.capWord}>{W.limit}</em> : null}
              </span>
              <span className={s.laneEnd}>{b.win ? <span className={s.pill}>{W.placed}</span> : null}</span>
            </div>
          ))}
        </div>
      );
    case "agents":
      return (
        <div className={s.agents}>
          {JUDGED.map((a) => (
            <div key={a.name} className={s.agent} data-fits={a.fits ? "" : undefined}>
              <span className={s.mark}>{a.fits ? <Tick /> : <i className={s.dash} />}</span>
              <b>{a.name}</b>
              <span className={s.verdict}>{a.fits ? W.fits : W.out}</span>
            </div>
          ))}
        </div>
      );
    case "evidence":
      return (
        <div className={s.sides}>
          <div className={s.side}>
            <span className={s.sideK}>{W.advertiser}</span>
            <div className={s.chips}>
              {ADVERTISER.capabilities.map((c) => <span key={c} className={s.chip} data-tone="brand">{c}</span>)}
            </div>
          </div>
          <div className={s.side}>
            <span className={s.sideK}>{W.app}</span>
            <div className={s.chips}>
              <span className={s.chip}>{PLACEMENT.appRules.slots}</span>
            </div>
          </div>
        </div>
      );
    case "payment":
      return (
        <div className={s.pay}>
          <div className={s.beads} aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={s.bead} data-on={i < 6 ? "" : undefined}>{i < 6 ? <Tick /> : null}</span>
            ))}
          </div>
          <div className={s.sum} aria-hidden><i /></div>
          <span className={s.payRow}>{W.total}</span>
        </div>
      );
  }
}

export function Plate({ id, style, plateRef, n }: { id: PlateId; style?: CSSProperties; plateRef?: (el: HTMLDivElement | null) => void; n?: number }) {
  const p = STACK.plates[id];
  return (
    <div ref={plateRef} className={s.plate} data-id={id} style={n === undefined ? style : ({ ...style, "--n": n } as CSSProperties)}>
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

const N = PLATE_IDS.length;
/** Plate i's vertical offset from the stack centre: `explode` 0 stacked, 1 apart; `close` 0 apart,
 *  1 gathered into a deck resting where the last plate sits. Whole pixels. */
export function plateY(i: number, explode: number, close: number, k: number) {
  const open = (i - (N - 1) / 2) * GAP * k * explode;
  if (close <= 0) return Math.round(open);
  const deck = ((N - 1) / 2) * GAP * k - (N - 1 - i) * DECK * k;
  return Math.round(open + (deck - open) * close);
}

/** Plate i's matrix (in its own frame, origin at its centre). The caller adds the stack centre. */
export function plateMatrix(i: number, tilt: number, explode: number, k: number, close = 0): M2 {
  const base = mixM(IDENTITY, PLATE_M7, tilt);
  return mul([1, 0, 0, 1, 0, plateY(i, explode, close, k)], mul([k, 0, 0, k, 0, 0], base));
}

/** The exploded stack's projected size at scale k (for fitting it to a viewport). */
export function stackSize(k: number) {
  const w = (PW + PH * 0.6 * Math.tan((26 * Math.PI) / 180)) * k + 40;
  const h = ((N - 1) * GAP + PH * 0.6 + PW * Math.sin((3 * Math.PI) / 180)) * k + 30;
  return { w, h };
}

const css = (m: M2) => `matrix(${m.map((v, i) => (i >= 4 ? Math.round(v) : +v.toFixed(5))).join(",")})`;
export { css as plateCss };

/** A still exploded stack (motion off, wide screens): a fixed canvas, plates placed in it. */
export function StillStack({ k = 0.9, label }: { k?: number; label?: ReactNode }) {
  const { w, h } = stackSize(k);
  const Wd = Math.ceil(w);
  const H = Math.ceil(h);
  const cx = Math.round(Wd / 2);
  const cy = Math.round(H / 2);
  const span = Math.round((N - 1) * GAP * k);
  return (
    <div className={s.still} style={{ width: Wd, height: H }} aria-label={typeof label === "string" ? label : undefined}>
      <i className={s.route} style={{ left: cx, top: cy - Math.round(span / 2), height: span }} />
      {PLATE_IDS.map((id, i) => (
        <Plate key={id} id={id} style={{ left: cx - PW / 2, top: cy - PH / 2, transform: css(plateMatrix(i, 1, 1, k)), zIndex: N - i }} />
      ))}
    </div>
  );
}

/** Phones: the same six plates, upright and compact, tucked one under the other. They start as
 *  one closed deck and open downward when they enter the view. */
export function FlatStack({ seen = true }: { seen?: boolean }) {
  return (
    <div className={s.flat} data-in={seen ? "" : undefined}>
      {PLATE_IDS.map((id, i) => (
        <Plate key={id} id={id} n={i} />
      ))}
    </div>
  );
}
