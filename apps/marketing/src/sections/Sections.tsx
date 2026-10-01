// The v6 landing sections that need no scroll state: the three pillars, ContextHint (one section),
// Jev (one real judgment) and the Solana section's frame (its channel figure is a client scene).
// Copy from src/data/copy.ts; run values from src/data/run.ts; nothing hand-typed.
import type { CSSProperties } from "react";
import { ActionPrimary, Words } from "@axp/design-system/prospectus";
import { CH_URL, CONTEXTHINT, JEV_SECTION, PILLARS, SOLANA } from "@/data/copy";
import { DEVNET, usdc } from "@/data/run";
import { AdWall } from "@/chapter/AdWall";
import SolanaChannel from "./SolanaChannel";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function Pillars() {
  return (
    <section className="pl" aria-label="Built on three pillars">
      <div className="px-wrap pl-grid">
        <p className="pl-why">{PILLARS.why}</p>
        {PILLARS.items.map((it, i) => (
          <a key={it.key} className="pl-item" data-p={it.key} href={it.href} {...ext} data-reveal="fade" style={d(i * 80)}>
            <span className="pl-name">{it.name}</span>
            <b className="pl-lead">{it.lead}</b>
            <span className="pl-line">{it.line}</span>
            <u className="pl-link">{it.link}</u>
          </a>
        ))}
      </div>
    </section>
  );
}

/** ContextHint, one section: the scale (words, never exact counts), the wall of observed ads with
 *  its label above it, the moat line and the one action. */
export function ContextHintSection() {
  const c = CONTEXTHINT;
  return (
    <section id="data" className="ch" aria-labelledby="data-q">
      <div className="px-wrap ch-head">
        <div className="ch-head-l">
          <p className="ch-label">{c.label}</p>
          <h2 id="data-q" className="ch-scale" data-reveal="">
            {c.scale.map((line, i) => (
              <span key={line} className="ch-scale-row">
                <Words text={line} start={i * 4} accent={line.replace(/ of (advertisers|ads|ad placements)\.$/, "")} />
              </span>
            ))}
          </h2>
        </div>
        <div className="ch-head-r" data-reveal="fade" style={d(160)}>
          <p className="ch-lede">{c.lede}</p>
          <p className="ch-more">{c.more}</p>
        </div>
      </div>
      <p className="px-wrap ch-wall-label">{c.wallLabel}</p>
      <AdWall />
      <div className="px-wrap ch-foot">
        <p className="ch-moat" data-reveal="">
          <span className="ch-moat-row">
            <Words text={c.moat[0]!} />
          </span>
          <span className="ch-moat-row">
            <Words text={c.moat[1]!} start={4} />
          </span>
          <span className="ch-moat-row">
            <Words text={c.moat[2]!} start={16} accent={c.moat[2]!} />
          </span>
        </p>
        <div className="ch-foot-r">
          <ActionPrimary href={CH_URL} external className="ch-action">
            {c.action}
          </ActionPrimary>
          <p className="ch-note">{c.note}</p>
        </div>
      </div>
    </section>
  );
}

/** Jev: one real judgment from the run. What goes in, what Jev returns (with its confidence), and
 *  the capped bid the exchange's code makes of it. */
export function JevSection() {
  const j = JEV_SECTION;
  return (
    <section id="jev" className="jv px-section" aria-labelledby="jev-q">
      <div className="px-wrap">
        <header className="jv-head">
          <div>
            <p className="jv-label">{j.label}</p>
            <h2 id="jev-q" className="px-h2 jv-h" data-reveal="">
              <Words text={j.h2} />
            </h2>
          </div>
          <p className="jv-lede">{j.lede}</p>
        </header>
        <div className="jv-flow">
          <div className="jv-col jv-in" data-reveal="fade">
            <p className="jv-k">{j.inLabel}</p>
            <ul className="jv-inputs">
              {j.inputs.map((x) => (
                <li key={x.k}>
                  <span className="jv-ik">{x.k}</span>
                  <span className="jv-iv">{x.v}</span>
                  <span className="jv-is">{x.sub}</span>
                </li>
              ))}
            </ul>
          </div>
          <span className="jv-arrow" aria-hidden />
          <div className="jv-col jv-out" data-reveal="fade" style={d(140)}>
            <p className="jv-k">{j.outLabel}</p>
            <div className="jv-panel">
              <p className="jv-decision">
                <span>Decision</span>
                <b>{j.decision}</b>
              </p>
              <ul className="jv-outputs">
                {j.outputs.map((o) => (
                  <li key={o.k} style={{ "--c": o.conf } as CSSProperties}>
                    <span className="jv-ok">{o.k}</span>
                    <span className="jv-ov">{o.v}</span>
                    <span className="jv-bar" aria-hidden>
                      <i />
                    </span>
                    <span className="jv-oc">{o.confText}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <span className="jv-arrow" aria-hidden />
          <div className="jv-col jv-code" data-reveal="fade" style={d(280)}>
            <p className="jv-k">{j.codeLabel}</p>
            <p className="jv-bid">
              {j.bid}
              <small>USDC bid</small>
            </p>
            <p className="jv-code-t">{j.code}</p>
          </div>
        </div>
        <div className="jv-foot">
          <a className="jv-credit" href={j.creditUrl} {...ext}>
            {j.credit}
          </a>
          <p className="jv-note">{j.note}</p>
        </div>
      </div>
    </section>
  );
}

/** Solana payment channels, in Solana purple (scoped to this section and its pillar). */
export function SolanaSection() {
  const s = SOLANA;
  return (
    <section id="solana" className="sol px-section" aria-labelledby="sol-q">
      <div className="px-wrap">
        <header className="sol-head">
          <div>
            <p className="sol-label">{s.label}</p>
            <h2 id="sol-q" className="px-h2 sol-h" data-reveal="">
              <Words text={s.h2} accent="Settled once." />
            </h2>
          </div>
          <p className="sol-lede">{s.lede}</p>
        </header>
        <SolanaChannel />
        {DEVNET ? (
          <div className="sol-dev">
            <div className="sol-dev-copy">
              <h3 className="sol-dev-h">{s.devnetH}</h3>
              <p className="sol-dev-b">{s.devnetBody}</p>
              <p className="sol-dev-n">{s.devnetNote}</p>
              <a className="sol-prog" href={DEVNET.programUrl} {...ext}>
                {s.program}
              </a>
            </div>
            <ul className="sol-dev-rows">
              {DEVNET.channels.map((c) => (
                <li key={c.campaign}>
                  <p className="sol-dev-name">
                    <b>{c.name}</b> <span>fictional advertiser</span>
                  </p>
                  <p className="sol-dev-sum">
                    Deposit {usdc(c.deposit)}, vouchers {c.vouchers.map((v) => usdc(v)).join(" then ")}, paid {usdc(c.paid)}, refunded {usdc(c.refunded)} USDC
                  </p>
                  <span className="sol-btns">
                    <span className="sol-btns-k">{s.explorer}</span>
                    <a className="sol-btn" href={c.openUrl} {...ext} aria-label={`${c.name}: the channel open on Solana Explorer`}>
                      {s.openTx}
                    </a>
                    <a className="sol-btn" href={c.closeUrl} {...ext} aria-label={`${c.name}: the channel close on Solana Explorer`}>
                      {s.closeTx}
                    </a>
                    <a className="sol-btn" href={c.channelUrl} {...ext} aria-label={`${c.name}: the channel account on Solana Explorer`}>
                      {s.channel}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
