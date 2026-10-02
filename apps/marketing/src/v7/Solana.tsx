"use client";

// v7 Solana chapter: a whole page in Solana purple. The payment channel told in four steps on two
// lanes (on Solana / off chain, signed): a deposit opens the channel, each accepted delivery adds a
// signed voucher off chain (0.004, then 0.007 in total), one close on Solana pays the AI app and
// refunds the rest. Pinned at >= 900px with motion on, each step arrives as you scroll; still, all
// four are shown. Then the proof: the live run's own transactions on Solana Devnet, on Explorer.
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Arrow } from "@axp/design-system/prospectus";
import { CV, CV_CHANNEL, RUN, usdc } from "@/data/run";
import { SOLANA } from "@/data/copy";
import { usePinned } from "@/motion/useReduced";
import s from "./sol.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const dep = Number(CV_CHANNEL.deposit);
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
  const vs = CV_CHANNEL.vouchers;
  const fill = shown >= 3 ? vs[1]?.cumulative ?? vs[0]!.cumulative : shown >= 2 ? vs[0]!.cumulative : "0";

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
                <span className={s.live}>{SOLANA.live}</span>
              </div>
              <h2 id="sol-title" className={s.h2}>
                {SOLANA.h2}
              </h2>
              <p className={s.lede}>{SOLANA.lede}</p>
            </div>

            <div className={s.lanes} data-visual="" aria-label={`${CV.name}'s channel: ${SOLANA.deposit}, vouchers ${SOLANA.vouchers.join(" then ")}, ${SOLANA.paid}, ${SOLANA.refund}`}>
              <div className={s.lane} data-lane="chain">
                <span className={s.laneK}>{SOLANA.onChain}</span>
                <div className={s.block} data-b="open">
                  <b>{SOLANA.open}</b>
                  <span>{SOLANA.deposit}</span>
                </div>
                <div className={s.meter}>
                  <div className={s.track}>
                    <i className={s.fill} style={{ transform: `scaleX(${Number(fill) / dep})` }} />
                    <i className={s.refund} style={{ left: pct(CV_CHANNEL.settled) }} />
                  </div>
                  <div className={s.marks}>
                    <span style={{ left: pct(vs[0]!.cumulative) }}>{usdc(vs[0]!.cumulative)}</span>
                    {vs[1] ? <span style={{ left: pct(vs[1].cumulative) }}>{usdc(vs[1].cumulative)}</span> : null}
                    <span style={{ left: "100%" }}>{usdc(CV_CHANNEL.deposit)}</span>
                  </div>
                </div>
                <div className={s.block} data-b="close">
                  <b>{SOLANA.close}</b>
                  <span>{SOLANA.paid}</span>
                  <span className={s.dim}>{SOLANA.refund}</span>
                </div>
              </div>
              <div className={s.lane} data-lane="off">
                <span className={s.laneK}>{SOLANA.offChain}</span>
                <div className={s.vouchers}>
                  {vs.map((v, i) => (
                    <div key={v.sequence} className={s.voucher} data-v={i} style={{ "--x": pct(v.cumulative) } as React.CSSProperties}>
                      <span>
                        {SOLANA.voucher} {v.sequence}
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
        <h3 className={s.h3} data-tone-text="">{SOLANA.devnetH}</h3>
        <div className={s.channels} data-tone-text="" data-token-avoid="">
          {SOLANA.explorerChannels.map(({ name, ch }) =>
            ch ? (
              <div key={name} className={s.channel}>
                <div className={s.chTop}>
                  <b>{name}</b>
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
              <b>{usdc(RUN.totals.paid)} USDC</b>
              <span>to the app, {usdc(RUN.totals.refunded)} back</span>
            </div>
            <div className={s.btns}>
              <Btn href={SOLANA.programUrl}>{SOLANA.program}</Btn>
              {SOLANA.tokenUrl ? <Btn href={SOLANA.tokenUrl}>{SOLANA.token}</Btn> : null}
            </div>
          </div>
        </div>
        <p className={s.note} data-tone-text="">{SOLANA.note}</p>
      </div>
    </section>
  );
}
