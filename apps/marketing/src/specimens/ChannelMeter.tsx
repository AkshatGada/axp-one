// A payment channel, scaled to its deposit. `t` runs 0..1: the deposit, the first accepted voucher,
// the running total, then the close (spent part turns ink, the rest is refunded). Real values only;
// the fill animation itself is illustrative.
import { MoneyStateMark } from "@axp/design-system/foundation";
import type { Channel } from "@/data/run";
import { usdc } from "@/data/run";
import { seg } from "@/motion/motion";

export function ChannelMeter({ ch, t = 1, onStage, compact, title }: { ch: Channel; t?: number; onStage?: boolean; compact?: boolean; title?: string }) {
  const dep = Number(ch.deposit);
  const vs = ch.vouchers;
  const n = vs.length;
  // Phases: voucher k fills over its own window; the close happens in the last 22%.
  const fillEnd = 0.78;
  let filled = 0;
  vs.forEach((v, k) => {
    const a = 0.12 + (k * (fillEnd - 0.12)) / n;
    const b = 0.12 + ((k + 1) * (fillEnd - 0.12)) / n;
    const prev = k === 0 ? 0 : Number(vs[k - 1]!.cumulative);
    if (t >= a) filled = prev + (Number(v.cumulative) - prev) * seg(t, a, b - 0.04);
  });
  const closed = seg(t, 0.86, 0.96);
  const share = filled / dep;
  const shownVoucher = vs.reduce((acc, v, k) => (t >= 0.12 + ((k + 0.5) * (fillEnd - 0.12)) / n ? k : acc), -1);
  return (
    <div className={`sp-meter${onStage ? " on-stage" : ""}`}>
      <div className="sp-meter-top">
        <span className="sp-meter-name">{title ?? `${ch.name} channel`}</span>
        <span className="sp-meter-dep">
          Deposit <span className="px-num">{usdc(ch.deposit)}</span> USDC
        </span>
      </div>
      <div className="sp-meter-track" role="img" aria-label={`${ch.name}: deposit ${usdc(ch.deposit)}, paid ${usdc(ch.settled)}, refunded ${usdc(ch.refund)} USDC`}>
        <i className="sp-meter-seg" data-state="accepted" style={{ width: "100%", transform: `scaleX(${share})`, opacity: 1 - closed }} />
        <i className="sp-meter-seg" data-state="settled" style={{ width: "100%", transform: `scaleX(${share})`, opacity: closed }} />
        <span className="sp-meter-refund" style={{ width: `${(1 - Number(ch.settled) / dep) * 100}%`, opacity: closed }}>
          <svg width="30" height="10" viewBox="0 0 30 10" fill="none" aria-hidden>
            <path d="M29 5H2M6 1L2 5l4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          Refunded <span className="px-num">{usdc(ch.refund)}</span>
        </span>
      </div>
      {compact ? null : (
        <div className="sp-meter-ticks" aria-hidden>
          {vs.map((v, k) => (
            <span key={v.sequence} className="sp-meter-tick" style={{ left: `${(Number(v.cumulative) / dep) * 100}%`, opacity: k <= shownVoucher ? 1 : 0 }}>
              <span>Voucher {v.sequence}</span>
              <span className="px-num">{usdc(v.cumulative)}</span>
            </span>
          ))}
          <span className="sp-meter-tick" data-end="" style={{ left: "100%" }}>
            <span>Deposit</span>
            <span className="px-num">{usdc(ch.deposit)}</span>
          </span>
        </div>
      )}
      {compact ? null : (
        <div className="sp-meter-legend">
          <span>
            <MoneyStateMark state="accepted" label="Accepted, running total" />
          </span>
          <span>
            <MoneyStateMark state="settled" label="Paid out" /> <span className="px-num">{usdc(ch.settled)}</span>
          </span>
          <span>
            <MoneyStateMark state="refunded" label="Refunded" /> <span className="px-num">{usdc(ch.refund)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
