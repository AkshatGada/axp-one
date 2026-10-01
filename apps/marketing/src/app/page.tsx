// axp.one: the landing page. One argument: what, why, how, money, moat, proof, next.
// Every word is server-rendered and visible without JS; motion layers on top (scenes/).
// Run values come from src/data/run.landing.json (the slim, render-only slice of the extraction); ContextHint values
// from src/data/library.ts; all copy from src/data/copy.ts. No internal identifiers on this page:
// those live in the MVP.
import type { CSSProperties } from "react";
import { Provenance } from "@axp/design-system/foundation";
import { ActionPrimary, ActionText, Actions, Opener, Section, SiteFooter, SiteHeader, VideoFigure, Words, Wrap } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
import { RUN, receiptFor, usdc } from "@/data/run";
import { BUILT_ON, CH_URL, CLOSING, FOOTER, HEADER, MVP_URL, MVP_VERIFY_URL, NAV, NEXT, PAYMENTS, PROOF, REAL, RULE, VIDEO, VIDEO_ANCHOR, WHY } from "@/data/copy";
import { RunSheet } from "@/specimens/RunSheet";
import { ReceiptSheet } from "@/specimens/Receipt";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import HeroScene from "@/scenes/HeroScene";
import StageScene from "@/scenes/StageScene";
import ScrubMeter from "@/scenes/ScrubMeter";
import ClosingStack from "@/scenes/ClosingStack";
import { ContextHintChapter } from "@/chapter/ContextHintChapter";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const KF = RUN.campaigns["v3-keyforge"];
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

function BuiltOn() {
  return (
    <section className="bo" aria-label={BUILT_ON.label}>
      <Wrap>
        <div className="bo-grid">
          <p className="bo-label">{BUILT_ON.label}</p>
          {BUILT_ON.items.map((it, i) => (
            <a key={it.lead} className="bo-item" href={it.href} {...ext} data-reveal="fade" style={d(i * 80)} data-i={i}>
              <b>{it.lead}</b>
              <span>{it.line}</span>
              <u>{it.link}</u>
            </a>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

function Why() {
  return (
    <Section id="why" labelledBy="why-q">
      <Wrap>
        <Opener id="why-q" label={WHY.label} question={WHY.h2} size="h2" />
        <div className="pg-for">
          {WHY.cols.map((f, i) => (
            <div key={f.title} data-reveal="fade" style={d(i * 90)}>
              <b>{f.title}</b>
              <p>{f.body}</p>
              {f.planned ? <Provenance kind="vision" label="Planned, not in this demo" /> : null}
            </div>
          ))}
        </div>
      </Wrap>
    </Section>
  );
}

/** The one full-bleed ultramarine wall, with the rules it holds. */
function Rule() {
  return (
    <Section id="rule" tone="brand" className="pg-wall" labelledBy="wall-q">
      <Wrap>
        <p className="px-label pg-wall-label">{RULE.label}</p>
        <h2 id="wall-q" className="px-dxxl pg-wall-h" data-reveal="">
          <span className="pg-wall-line">
            <Words text="Agents advise." />
          </span>
          <span className="pg-wall-line">
            <Words text="Code decides" start={2} />
          </span>
          <span className="pg-wall-line">
            <Words text="the money." start={4} />
          </span>
        </h2>
        <p className="px-lead pg-wall-lead">{RULE.body}</p>
        <ul className="pg-rules">
          {RULE.rules.map((r, i) => (
            <li key={r.rule} data-reveal="fade" style={d(i * 60)}>
              <b>{r.rule}</b>
              <span>{r.run}</span>
            </li>
          ))}
        </ul>
      </Wrap>
    </Section>
  );
}

function Payments() {
  return (
    <Section id="payments" labelledBy="pay-q">
      <Wrap>
        <Opener id="pay-q" label={PAYMENTS.label} question={PAYMENTS.h2} size="h2" layout="split" lead={<p className="px-body">{PAYMENTS.body}</p>} />
        <div className="pay-grid">
          <div className="pay-facts">
            {PAYMENTS.facts.map((f) => (
              <div key={f.label} className="pay-fact">
                <span className="pay-n">
                  {f.value}
                  {f.unit ? <small>{f.unit}</small> : null}
                </span>
                <span className="pay-l">{f.label}</span>
              </div>
            ))}
          </div>
          <div className="pay-meter">
            <ScrubMeter title={PAYMENTS.meterTitle} />
            <div className="pay-lanes" aria-hidden>
              <div className="pay-lane">
                <span className="pay-lane-k">{PAYMENTS.perAd}</span>
                <span className="pay-ticks">
                  {[0, 1, 2].map((k) => (
                    <i key={k} />
                  ))}
                </span>
                <span className="pay-lane-n">{PAYMENTS.perAdNote}</span>
              </div>
              <div className="pay-lane" data-one="">
                <span className="pay-lane-k">{PAYMENTS.channel}</span>
                <span className="pay-ticks">
                  <i />
                </span>
                <span className="pay-lane-n">{PAYMENTS.channelNote}</span>
              </div>
            </div>
            <p className="px-small">{PAYMENTS.source}</p>
          </div>
        </div>
      </Wrap>
    </Section>
  );
}

function Proof() {
  const kfReceipt = receiptFor("v3-repeat");
  return (
    <Section id="proof" labelledBy="proof-q">
      <Wrap>
        <Opener id="proof-q" label={PROOF.label} question={PROOF.h2} layout="split" lead={<div className="px-stack"><p className="px-h3">{PROOF.h3}</p><p className="px-body">{PROOF.lede}</p></div>} />
        <div className="pr-counts-row">
          {PROOF.counts.map((c, i) => (
            <div key={c.label} className="pr-count" data-reveal="mask" style={d(i * 70)}>
              <span className="px-mask">
                <span className="px-mask-in pr-count-n">{c.value}</span>
              </span>
              <span className="pr-count-l">{c.label}</span>
            </div>
          ))}
        </div>
        <div className="pr-lines">
          <p className="pr-money">{PROOF.money}</p>
          <a className="pr-verify" href={MVP_VERIFY_URL} {...ext}>
            {PROOF.verifyLine}
          </a>
        </div>
        <div className="pr-pair">
          <div className="pr-sheet">
            <p className="px-label">{PROOF.sheetTitle}</p>
            <RunSheet />
          </div>
          <Video />
        </div>
        <div className="real" id="whats-real">
          <p className="px-h3 real-h">{REAL.title}</p>
          <div className="real-grid">
            {[REAL.real, REAL.illustrative, REAL.notShown].map((col, i) => (
              <div key={col.title} className="real-col" data-kind={["real", "ill", "not"][i]}>
                <p className="real-k">{col.title}</p>
                <ul>
                  {col.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "clamp(40px, 5vw, 64px)" }}>
          <Actions>
            <ActionPrimary href={MVP_URL} external>
              {PROOF.action}
            </ActionPrimary>
            <ActionText href={MVP_VERIFY_URL} external>
              {PROOF.verify}
            </ActionText>
          </Actions>
        </div>
      </Wrap>
    </Section>
  );
}

function Video() {
  const v = RUN.video;
  if (!v) return null;
  return (
    <div id="video" className="pr-video">
      <p className="px-label">{VIDEO.h2}</p>
      <VideoFigure src={`/${v.file}`} poster="/video-poster.png" track={`/${v.captions}`} ratio={`${v.width} / ${v.height}`} title={VIDEO.title} caption={VIDEO.caption} chapters={v.chapters.map((at, i) => ({ at, label: VIDEO.chapters[i]! }))} />
    </div>
  );
}

function Next() {
  return (
    <Section id="next" labelledBy="next-q">
      <Wrap>
        <div className="nx">
          <h2 id="next-q" className="px-h2 nx-h">
            {NEXT.h2}
          </h2>
          <div className="nx-col">
            <p className="nx-k">
              <Provenance kind="actual" label="Working now" />
            </p>
            <p className="nx-t">{NEXT.now.join(" ")}</p>
          </div>
          <div className="nx-col" data-next="">
            <p className="nx-k">
              <Provenance kind="vision" label="Building next" />
            </p>
            <p className="nx-t">{NEXT.next.join(" ")}</p>
          </div>
        </div>
      </Wrap>
    </Section>
  );
}

function Closing() {
  return (
    <section className="pg-close px-section" data-tone="brand" data-header-tone="brand" aria-labelledby="close-q">
      <Wrap>
        <div className="pg-close-grid">
          <div className="px-stack-lg">
            <h2 id="close-q" className="px-dxl" data-reveal="">
              <Words text={CLOSING.h2} />
            </h2>
            <p className="px-lead">{CLOSING.body}</p>
            <Actions>
              <ActionPrimary href={MVP_URL} external>
                {CLOSING.primary}
              </ActionPrimary>
              <ActionText href={VIDEO_ANCHOR}>{CLOSING.video}</ActionText>
              <ActionText href={CH_URL} external>
                {CLOSING.contexthint}
              </ActionText>
            </Actions>
          </div>
          <ClosingStack />
        </div>
      </Wrap>
    </section>
  );
}

function FooterAside() {
  return (
    <div className="ft-aside">
      <div>
        <p className="ft-k">{FOOTER.contexthint.title}</p>
        <p>{FOOTER.contexthint.body}</p>
        <a href={CH_URL} {...ext}>
          {FOOTER.contexthint.link}
        </a>
      </div>
      <div>
        <p className="ft-k">Credits</p>
        <p>
          {FOOTER.jev.text}{" "}
          <a href={FOOTER.jev.url} {...ext}>
            {FOOTER.jev.name}
          </a>
          . Settlement on{" "}
          <a href="https://solana.com" {...ext}>
            Solana
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <MotionRoot />
      <FilmMode />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <HeroScene />
        <BuiltOn />
        <Why />
        <StageScene />
        <Rule />
        <Payments />
        <ContextHintChapter />
        <Proof />
        <Next />
        <Closing />
      </main>
      <SiteFooter scope={FOOTER.scope} legend={false} aside={<FooterAside />} base={<span>{FOOTER.base}</span>} />
    </>
  );
}
