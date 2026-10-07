"use client";

// Verified 7 October payment-channel evidence: cumulative vouchers, one close.
// Values and Explorer links come from the sanitized, independently checked native record.
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Arrow } from "@axp/design-system/prospectus";
import { usdc } from "@/data/run";
import proof from "@/data/settlement.latest.json";
import { SOLANA } from "@/data/copy";
import { usePinned } from "@/motion/useReduced";
import s from "./sol.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const sample = proof.channels[0]!;
const dep = Number(sample.deposit);
const pct = (v: string | number) => `${(Number(v) / dep) * 100}%`;

function Btn({ href, children }: { href: string | null | undefined; children: string }) {
  if (!href) return null;
  return (
    <a className={s.btn} href={href} {...ext}>
      <span>{children}</span>
      <Arrow width={16} />
    </a>
  );
}

export default function Solana() {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const [step, setStep] = useState(4);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const stepOf = (v: number) => (v < 0.08 ? 0 : v < 0.3 ? 1 : v < 0.5 ? 2 : v < 0.7 ? 3 : 4);
  useMotionValueEvent(p, "change", (v) => {
    if (!pinnedRef.current) return;
    const st = stepOf(v);
    setStep((c) => (c === st ? c : st));
  });
  // The step follows the scroll position from the start: above the pin the progress is 0 and no
  // "change" fires, so without this the finished diagram showed while scrolling in, then reset.
  useEffect(() => {
    if (pinned) setStep(stepOf(p.get()));
  }, [pinned, p]);
  const shown = pinned ? step : 4;
  const vs = [sample.vouchers[0]!, sample.vouchers[1]!, sample.vouchers.at(-1)!];
  const fill = shown >= 3 ? vs.at(-1)!.cumulative : shown >= 2 ? vs[0]!.cumulative : "0";

  return (
    <section id="solana" data-world="sol" className={s.sol} data-header-tone="sol" aria-labelledby="sol-title">
      <div className={s.pin} ref={ref} data-step="sol" data-pinned={pinned ? "" : undefined}>
        <div className={s.stage} data-step={shown}>
          <div className={`px-wrap ${s.in}`}>
            <div className={s.head} data-tone-text="">
              <div className={s.pills}>
                <span className={s.label}>
                  {SOLANA.label}
                </span>
                <span className={s.live}>{sample.voucherCount} vouchers → one settlement</span>
              </div>
              <h2 id="sol-title" className={s.h2}>
                {SOLANA.h2}
              </h2>
              <p className={s.lede}>Each delivery updates a signed voucher. One settlement pays the publisher and returns the rest.</p>
            </div>

            <div className={s.lanes} data-visual="" aria-label={`A verified channel: ${sample.voucherCount} cumulative vouchers, ${usdc(sample.paid)} paid, ${usdc(sample.refunded)} refunded`}>
              <div className={s.lane} data-lane="chain">
                <span className={s.laneK}>{SOLANA.onChain}</span>
                <div className={s.block} data-b="open">
                  <b>{SOLANA.open}</b>
                  <span>{usdc(sample.deposit)} test USDC</span>
                </div>
                <div className={s.meter}>
                  <div className={s.track}>
                    <i className={s.fill} style={{ transform: `scaleX(${Number(fill) / dep})` }} />
                    <i className={s.refund} style={{ left: pct(sample.paid) }} />
                  </div>
                  <div className={s.marks}>
                    <span style={{ left: pct(sample.paid) }}>{usdc(sample.paid)}</span>
                    <span style={{ left: "100%" }}>{usdc(sample.deposit)}</span>
                  </div>
                </div>
                <div className={s.block} data-b="close">
                  <b>{SOLANA.close}</b>
                  <span>{usdc(sample.paid)} paid</span>
                  <span className={s.dim}>{usdc(sample.refunded)} refunded</span>
                </div>
              </div>
              <div className={s.lane} data-lane="off">
                <span className={s.laneK}>{SOLANA.offChain}</span>
                <div className={s.vouchers}>
                  {vs.map((v, i) => (
                    <div key={v.sequence} className={s.voucher} data-v={i} style={{ "--x": pct(v.cumulative) } as React.CSSProperties}>
                      <span>
                        {i === 2 ? "… Voucher" : "Voucher"} {v.sequence}
                      </span>
                      <b>{usdc(v.cumulative)}</b>
                      {i > 0 ? <span className={s.dim}>{SOLANA.total}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`px-wrap ${s.proof}`} data-reveal="fade">
        <h3 className={s.h3} data-tone-text="">Finalized today. Follow the money.</h3>
        <div className={s.channels} data-tone-text="" data-token-avoid="">
          {proof.channels.map((ch) =>
            ch ? (
              <div key={ch.id} className={s.channel}>
                <div className={s.chTop}>
                  <b>{ch.name}</b>
                  <span>
                    {usdc(ch.paid)} paid, {usdc(ch.refunded)} back
                  </span>
                </div>
                <div className={s.btns}>
                  <Btn href={ch.openUrl}>{SOLANA.openTx}</Btn>
                  <Btn href={ch.closeUrl}>{SOLANA.closeTx}</Btn>
                  <Btn href={ch.channelUrl}>{SOLANA.channel}</Btn>
                </div>
              </div>
            ) : null,
          )}
          <div className={s.channel} data-total="">
            <div className={s.chTop}>
              <b>{usdc(proof.totals.settledBaseUnits)} USDC</b>
              <span>to the app, {usdc(proof.totals.refundBaseUnits)} back</span>
            </div>
            <div className={s.btns}>
              <Btn href={proof.programUrl}>{SOLANA.program}</Btn>
              {proof.mintUrl ? <Btn href={proof.mintUrl}>{SOLANA.token}</Btn> : null}
            </div>
          </div>
        </div>
        <p className={s.note} data-tone-text="">{proof.date} · Solana Devnet · test USDC</p>
      </div>
    </section>
  );
}
