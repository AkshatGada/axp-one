"use client";

// ClearVault's payment channel from the recorded run, as two lanes: on Solana (one open, one close)
// and off chain (a signed voucher per delivery, each a running total). Below, the channel itself,
// scaled to its deposit: it fills 0.004, then 0.007, then the close pays the AI app and refunds the
// rest. Scrubbed by scroll, and complete by the time the figure's centre reaches 60% of the
// viewport, so it is finished where people read it. Below 900px, under reduced motion and without
// JS: the finished channel. Amounts are real; the fill itself is illustrative.
import { useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { SOLANA } from "@/data/copy";
import { CV_CHANNEL, usdc } from "@/data/run";
import { seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const dep = Number(CV_CHANNEL.deposit);
const cum = CV_CHANNEL.vouchers.map((v) => Number(v.cumulative));
const paid = Number(CV_CHANNEL.settled);
const n = cum.length;
// Timeline (0..1): open, then each voucher in its own window, then the close.
const OPEN: [number, number] = [0, 0.14];
const V = cum.map((_, k): [number, number] => [0.2 + (k * 0.48) / n, 0.2 + ((k + 1) * 0.48) / n - 0.06]);
const CLOSE: [number, number] = [0.74, 0.9];

export default function SolanaChannel() {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const [t, setT] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 96%", "center 60%"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!pinned) return;
    setT((x) => (Math.abs(x - v) < 0.004 ? x : v));
  });
  const p = pinned ? t : 1;

  let filled = 0;
  cum.forEach((c, k) => {
    const prev = k ? cum[k - 1]! : 0;
    if (p >= V[k]![0]) filled = prev + (c - prev) * seg(p, V[k]![0], V[k]![1]);
  });
  const closed = seg(p, CLOSE[0], CLOSE[1]);
  const on = (w: [number, number]) => (p >= w[0] + (w[1] - w[0]) * 0.35 ? "" : undefined);
  const s = SOLANA;

  return (
    <div ref={ref} className="sc2" style={{ "--f": filled / dep, "--x": closed, "--paid": paid / dep } as CSSProperties} data-closed={closed > 0.5 ? "" : undefined}>
      <div className="sc2-grid">
        <span className="sc2-lk" data-row="on">
          {s.onChain}
        </span>
        <span className="sc2-lk" data-row="off">
          {s.offChain}
        </span>
        <div className="sc2-step" data-row="on" data-col="1" data-on={on(OPEN)}>
          <span className="sc2-k">{s.open.k}</span>
          <b className="sc2-v">{s.open.v}</b>
          <span className="sc2-s">{s.open.sub}</span>
        </div>
        <div className="sc2-rail" aria-hidden data-on={on(OPEN)}>
          <span>No transaction for each ad</span>
        </div>
        {s.vouchers.map((v, k) => (
          <div key={v.k} className="sc2-step" data-row="off" data-col={k + 2} data-on={on(V[k]!)}>
            <span className="sc2-k">{v.k}</span>
            <b className="sc2-v">{v.v}</b>
            <span className="sc2-s">{v.sub}</span>
          </div>
        ))}
        <div className="sc2-step" data-row="on" data-col={n + 2} data-on={on(CLOSE)} data-close="">
          <span className="sc2-k">{s.close.k}</span>
          <b className="sc2-v">{s.close.v}</b>
          <span className="sc2-s">{s.close.sub}</span>
        </div>
      </div>
      <div className="sc2-meter">
        <div className="sc2-meter-top">
          <span>{s.meterTitle}</span>
          <span>Deposit {usdc(CV_CHANNEL.deposit)} USDC</span>
        </div>
        <div className="sc2-track" role="img" aria-label={`Deposit ${usdc(CV_CHANNEL.deposit)}, vouchers ${cum.map((c) => usdc(c)).join(" then ")}, paid ${usdc(CV_CHANNEL.settled)} to the AI app, ${usdc(CV_CHANNEL.refund)} refunded, USDC`}>
          <i className="sc2-fill" />
          <i className="sc2-paid" />
          <span className="sc2-paid-l">Paid {usdc(CV_CHANNEL.settled)} to the AI app</span>
          <span className="sc2-refund-l">Refunded {usdc(CV_CHANNEL.refund)}</span>
          {cum.map((c, k) => (
            <span key={c} className="sc2-tick" style={{ left: `${(c / dep) * 100}%`, opacity: p >= V[k]![1] - 0.02 ? 1 : 0 }}>
              {usdc(c)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
