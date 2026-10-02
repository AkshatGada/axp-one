"use client";

// v7 how it works: the exchange's rules as one rail on the dark stage. Behind it, the order-book
// floor: a tape of real observed questions streams towards the viewer (bidding illustrative). In
// front, seven stations, each a tiny real specimen from the first question of the live run. The
// opportunity travels the rail as you scroll (pinned at >= 900px with motion on); each station
// lights as it arrives. Still, every station is lit.
import { useRef, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { CACHED, CV, CV_CHANNEL, KF, LG, usdc } from "@/data/run";
import { HOW } from "@/data/copy";
import { TAPE } from "@/hero-lab/data";
import { usePinned } from "@/motion/useReduced";
import { seg } from "@/motion/motion";
import s from "./how.module.css";

const T = 15;
const bidOf = (c: string) => CACHED.bids.find((b) => b.campaign === c);

function Tape() {
  return (
    <div className={s.view} aria-hidden>
      <div className={s.floor}>
        <div className={s.grid} />
        {TAPE.map((r, i) => (
          <div key={i} className={s.row} style={{ "--i": i, "--n": TAPE.length, "--t": `${T}s` } as CSSProperties}>
            <span className={s.rq}>{r.q}</span>
            <span className={s.rb}>
              {r.bids.map((b, k) => (
                <i key={k} style={{ "--b": b } as CSSProperties} data-win={k === r.win ? "" : undefined} />
              ))}
            </span>
            <span className={s.rs}>Settled</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Specimen({ i }: { i: number }) {
  const cv = bidOf("v3-clearvault");
  const kf = bidOf("v3-keyforge");
  const max = Math.max(...CACHED.bids.map((b) => Number(b.amount)));
  switch (i) {
    case 0:
      return (
        <>
          <span className={s.app}>AI app</span>
          <p className={s.sq}>{CACHED.question}</p>
          <span className={s.chip}>{HOW.mustStore}</span>
        </>
      );
    case 1:
      return (
        <>
          <span className={s.chip} data-ch="">
            {HOW.evidence}
          </span>
          <ul className={s.list}>
            <li>
              {CV.name} <b>{HOW.bidWord}</b>
            </li>
            <li>
              {KF.name} <b>{HOW.bidWord}</b>
            </li>
            <li data-out="">
              {LG.name} <b>{HOW.skipWord}</b>
            </li>
          </ul>
          <span className={s.jev}>{HOW.withJev}</span>
        </>
      );
    case 2:
      return (
        <>
          <div className={s.bars}>
            {[cv, kf].map((b) =>
              b ? (
                <div key={b.campaign} className={s.barRow} data-win={b.campaign === CACHED.winner ? "" : undefined}>
                  <span>{b.name}</span>
                  <i style={{ "--w": Number(b.amount) / max } as CSSProperties} />
                  <span className={s.num}>{usdc(b.amount)}</span>
                </div>
              ) : null,
            )}
          </div>
          <span className={s.rule}>
            <s>{LG.name}</s> {HOW.outLine}
          </span>
          <span className={s.rule}>{HOW.tie}</span>
        </>
      );
    default:
      return (
        <>
          <div className={s.mini}>
            <i />
            <i />
            <div className={s.miniCard}>
              <span>Sponsored</span> {CV.name}
            </div>
          </div>
          <span className={s.rule}>{HOW.beside}</span>
          <span className={s.rule}>
            {HOW.receipt} <b className={s.num}>{usdc(CACHED.price!)} USDC</b>
          </span>
          <div className={s.solTrack}>
            <i style={{ width: `${(Number(CV_CHANNEL.settled) / Number(CV_CHANNEL.deposit)) * 100}%` }} />
          </div>
          <span className={s.rule}>{HOW.oneClose}</span>
        </>
      );
  }
}

export default function How() {
  const ref = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const pinned = usePinned();
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const n = HOW.steps.length;
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(p, "change", (v) => {
    if (!pinnedRef.current) return;
    const t = seg(v, 0.06, 0.8);
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${t.toFixed(4)})`;
    railRef.current?.querySelectorAll<HTMLElement>("[data-st]").forEach((el, i) => {
      const on = t >= i / (n - 1) - 0.02;
      if (on !== (el.dataset.on === "1")) el.dataset.on = on ? "1" : "";
    });
  });

  return (
    <section ref={ref} id="how" data-world="stage" className={s.how} data-tone="stage" data-header-tone="stage" aria-labelledby="how-title" data-pinned={pinned ? "" : undefined}>
      <div className={s.stage}>
        <Tape />
        <div className={`px-wrap ${s.in}`}>
          <div className={s.head} data-tone-text="">
            <p className={s.label}>{HOW.label}</p>
            <h2 id="how-title" className={`px-h1 ${s.h2}`}>
              {HOW.h2}
            </h2>
          </div>
          <div className={s.railWrap}>
            <div className={s.line} aria-hidden>
              <i ref={fillRef} />
            </div>
            <ol ref={railRef} className={s.rail}>
              {HOW.steps.map((st, i) => (
                <li key={st} data-st="" data-on={pinned ? (i === 0 ? "1" : "") : "1"} style={{ "--i": i } as CSSProperties}>
                  <span className={s.node} aria-hidden>
                    {i + 1}
                  </span>
                  <p className={s.t}>{st}</p>
                  <div className={s.spec} data-visual="">
                    <Specimen i={i} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className={s.tagline}>{HOW.tagline}</p>
        </div>
      </div>
    </section>
  );
}
