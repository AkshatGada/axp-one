// axp.one: the landing page. One argument: what, why, how, money, moat, trust, proof, next.
// Every word is server-rendered and visible without JS; motion layers on top (scenes/).
// Run values come from src/data/run.generated.json (extracted with asserts); library values
// from src/data/library.ts; all copy from src/data/copy.ts.
import type { CSSProperties } from "react";
import { Provenance } from "@axp/design-system/foundation";
import {
  ActionPrimary,
  ActionText,
  Actions,
  AudienceTile,
  BigStat,
  Display,
  Exhibit,
  Figure,
  NowNext,
  Opener,
  PrincipleLedger,
  RoleRail,
  Section,
  SiteFooter,
  SiteHeader,
  SourceNote,
  StatGrid,
  VideoFigure,
  Words,
  Wrap,
} from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import { LIBRARY } from "@/data/library";
import { CACHED, CV, CV_CHANNEL, RUN, receiptFor, usdc } from "@/data/run";
import { CLOSING, CONTEXTHINT, FOOTER, HEADER, HERO, MVP_URL, NAV, NEXT, PAYMENTS, PRINCIPLES, PROOF, ROLES, SHIFT, STAGE, VIDEO, VIDEO_ANCHOR } from "@/data/copy";
import { HostChat } from "@/specimens/HostChat";
import { ChannelMeter } from "@/specimens/ChannelMeter";
import { EvidenceChain } from "@/specimens/EvidenceChain";
import { NicheField } from "@/specimens/NicheField";
import { RunSheet } from "@/specimens/RunSheet";
import { ReceiptSheet } from "@/specimens/Receipt";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { Fit } from "@/scenes/Fit";
import { PlateStack, PlateStackStatic, STACK_H, STACK_W } from "@/scenes/PlateStack";
import { BOARD_H, BOARD_W, Switchboard } from "@/scenes/Switchboard";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const KF = RUN.campaigns["v3-keyforge"];

function Hero() {
  return (
    <Section id="top" borderless className="pg-hero">
      <Wrap>
        <div className="pg-hero-grid">
          <div className="pg-hero-copy">
            <h1 className="px-dxl">
              <Words text={HERO.h1} accent={HERO.accent} />
            </h1>
            <p className="px-lead pg-hero-lede pg-in" style={d(420)}>
              {HERO.lede}
            </p>
            <div className="pg-in" style={d(560)}>
              <Actions>
                <ActionPrimary href={MVP_URL}>{HERO.primary}</ActionPrimary>
                <ActionText href={VIDEO_ANCHOR}>{HERO.video}</ActionText>
                <ActionText href="#proof">{HERO.skip}</ActionText>
              </Actions>
            </div>
            <p className="pg-status pg-in" style={d(680)}>
              <span>{HERO.status}</span>
              <Provenance kind="replay" />
            </p>
          </div>
          <div className="pg-hero-chat">
            <HostChat question={CACHED.question} answer={CACHED.organic.excerpt} model={CACHED.organic.model} appName={HERO.appName} card={{ name: CV.name, text: CV.approvedText!, destination: CV.destination }} intro />
            <p className="pg-hero-cap">{HERO.frameCaption}</p>
          </div>
        </div>
      </Wrap>
      <Wrap className="pg-explode">
        <div className="pg-explode-head">
          <Display size="h1">{HERO.pullBack}</Display>
        </div>
        <div className="only-wide">
          <Fit w={STACK_W} h={STACK_H} maxH="92vh">
            <PlateStack tilt={1} explode={1} callouts={1} marker={1} />
          </Fit>
        </div>
        <div className="only-narrow">
          <PlateStackStatic />
        </div>
        <p className="px-small" style={{ marginTop: 20 }}>
          {HERO.stackCaption}
        </p>
      </Wrap>
    </Section>
  );
}

function Shift() {
  return (
    <Section id="shift" labelledBy="shift-q">
      <Wrap>
        <Opener id="shift-q" label={SHIFT.label} question={SHIFT.h2} layout="split" lead={<p className="px-body">{SHIFT.body}</p>} />
        <div className="pg-for">
          {SHIFT.for.map((f, i) => (
            <div key={f.who} data-reveal="fade" style={d(i * 90)}>
              <b>{f.who}</b>
              <p>{f.what}</p>
            </div>
          ))}
        </div>
        <div className="pg-roles">
          <Display as="h3" size="h2">
            {ROLES.h2}
          </Display>
          <RoleRail roles={ROLES.roles} />
          <p className="px-small">{ROLES.legend}</p>
        </div>
      </Wrap>
    </Section>
  );
}

function Stage() {
  return (
    <Section id="how" tone="stage" labelledBy="how-q">
      <Wrap>
        <div className="pg-stage-head">
          <Opener id="how-q" label={STAGE.label} question={STAGE.h2} lead={STAGE.lede} aside={<a className="pg-skip" href="#payments">{STAGE.skip}</a>} />
        </div>
        <ol className="pg-beats">
          {STAGE.beats.map((b, i) => (
            <li key={b.title} data-reveal="fade" style={d(i * 40)}>
              <b>{b.title}</b>
              <p>{b.body}</p>
            </li>
          ))}
        </ol>
        <div className="pg-stage-board only-wide">
          <Figure title="The exchange for one opportunity" kinds={["actual", "policy", "settled"]} caption="Values are actual, from the cached question. The wiring is illustrative." onStage>
            <Fit w={BOARD_W} h={BOARD_H}>
              <Switchboard beat={-1} />
            </Fit>
          </Figure>
        </div>
      </Wrap>
    </Section>
  );
}

/** The one full-bleed ultramarine wall: the rule the whole exchange rests on. */
function Rule() {
  return (
    <Section tone="brand" className="pg-wall" labelledBy="wall-q">
      <Wrap>
        <p className="px-label pg-wall-label">The rule</p>
        <h2 id="wall-q" className="px-dxxl pg-wall-h" data-reveal="">
          <Words text={STAGE.exit} />
        </h2>
        <div className="pg-wall-foot">
          <p className="px-lead">{STAGE.exitBody}</p>
          <ActionText href="#principles">{STAGE.exitLink}</ActionText>
        </div>
      </Wrap>
    </Section>
  );
}

function Payments() {
  return (
    <Section id="payments" labelledBy="pay-q">
      <Wrap>
        <Opener id="pay-q" label={PAYMENTS.label} question={PAYMENTS.h2} layout="split" lead={<p className="px-body">{PAYMENTS.body}</p>} />
        <div className="pg-lanes">
          <Figure title={`${CV.name}, one channel`} kinds={["settled"]} caption={PAYMENTS.caption}>
            <ChannelMeter ch={CV_CHANNEL} t={1} />
          </Figure>
          <div className="pg-lane-alt">
            <div className="px-marks">
              <span className="px-label">{PAYMENTS.lane}</span>
              <Provenance kind="illustrative" />
            </div>
            <div className="pg-transfers" aria-hidden>
              {["a", "b", "c"].map((k) => (
                <div key={k} className="pg-transfer">
                  <b>Transfer</b>
                  <span>Network fee, then a wait</span>
                </div>
              ))}
            </div>
            <p className="px-small">
              {PAYMENTS.laneNote} {PAYMENTS.x402}
            </p>
          </div>
        </div>
      </Wrap>
    </Section>
  );
}

function ContextHint() {
  return (
    <Section id="data" tone="paper2" labelledBy="data-q">
      <Wrap>
        <Opener
          id="data-q"
          label={CONTEXTHINT.label}
          question={CONTEXTHINT.h2}
          layout="split"
          aside={<Provenance kind="observed" />}
          lead={
            <div className="px-stack">
              <p className="px-h3">{CONTEXTHINT.h3}</p>
              <p className="px-body">{CONTEXTHINT.lede}</p>
            </div>
          }
        />
        <div className="pg-ch-stats">
          <StatGrid cols={3}>
            {CONTEXTHINT.stats.map((s, i) => (
              <BigStat key={s.label} value={s.value} label={s.label} sub={s.sub} accent="ch" delay={i * 90} />
            ))}
          </StatGrid>
        </div>
        <SourceNote>{CONTEXTHINT.source}</SourceNote>

        <div className="pg-dive">
          <Display size="h2">{CONTEXTHINT.dive}</Display>
          <div className="pg-dive-grid">
            <Figure title="The library, one square per niche" kinds={["observed", "illustrative"]} caption={CONTEXTHINT.fieldNote}>
              <NicheField />
            </Figure>
            <EvidenceChain />
          </div>
          <div className="px-stack">
            <p className="px-h3">{CONTEXTHINT.funnelTitle}</p>
            <div className="pg-funnel">
              {CONTEXTHINT.funnel.map((f, i) => (
                <div key={f.title} data-reveal="fade" style={d(i * 90)}>
                  <span className="px-label">{f.title}</span>
                  <span className="px-stat-value">
                    {f.value}
                    <span className="px-stat-unit">{f.unit}</span>
                  </span>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Display as="p" size="h1" className="pg-moat">
          {CONTEXTHINT.moat}
        </Display>
        <div className="px-stack-lg">
          <p className="px-small pg-context">{CONTEXTHINT.context}</p>
          <Actions>
            <ActionPrimary href={LIBRARY.url} external>
              {CONTEXTHINT.action}
            </ActionPrimary>
          </Actions>
        </div>
      </Wrap>
    </Section>
  );
}

function Principles() {
  return (
    <Section id="principles" labelledBy="rules-q">
      <Wrap>
        <Opener id="rules-q" label={PRINCIPLES.label} question={PRINCIPLES.h2} lead={PRINCIPLES.lede} layout="split" />
        <PrincipleLedger rows={PRINCIPLES.rows} />
      </Wrap>
    </Section>
  );
}

function Proof() {
  const kfReceipt = receiptFor("v3-repeat");
  return (
    <Section id="proof" labelledBy="proof-q">
      <Wrap>
        <Opener
          id="proof-q"
          label={PROOF.label}
          question={PROOF.h2}
          layout="split"
          aside={<Provenance kind="replay" />}
          lead={
            <div className="px-stack">
              <p className="px-h3">{PROOF.h3}</p>
              <p className="px-body">{PROOF.lede}</p>
            </div>
          }
        />
        <div className="pg-proof-stats">
          <StatGrid cols={3}>
            {PROOF.stats.map((s, i) => (
              <BigStat key={s.label} value={s.value} unit={s.unit} label={s.label} size="s" mono={s.mono} accent={s.mono ? "brand" : undefined} delay={i * 70} />
            ))}
          </StatGrid>
        </div>
        <Exhibit label={PROOF.sheetTitle} kinds={["replay", "actual"]}>
          <RunSheet />
        </Exhibit>
        <div className="pg-exhibits">
          <Exhibit label={PROOF.exhibitCard} kinds={["actual", "fictional"]} tilt="right">
            <div style={{ padding: "clamp(20px, 3vw, 36px)" }}>
              <p className="px-small" style={{ marginBottom: 16 }}>
                Shown beside the answer to: {RUN.turns.find((t) => t.id === "v3-repeat")!.question}
              </p>
              <SponsoredCard name={KF.name} text={KF.approvedText!} destination={KF.destination} />
            </div>
          </Exhibit>
          <Exhibit label={PROOF.exhibitReceipt} kinds={["actual"]} tilt="left" note={PROOF.limits[4]}>
            <ReceiptSheet r={kfReceipt} />
          </Exhibit>
        </div>
        <div className="pg-proof-foot">
          <div className="px-stack">
            <p className="px-h3">{PROOF.settlementTitle}</p>
            <div className="pg-scroll">
            <table className="pg-settle">
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col">Deposit</th>
                  <th scope="col">Paid to the app</th>
                  <th scope="col">Refunded</th>
                  <th scope="col">Close</th>
                </tr>
              </thead>
              <tbody>
                {RUN.channels.map((c) => (
                  <tr key={c.campaign}>
                    <td>{c.name}</td>
                    <td className="n">{usdc(c.deposit)}</td>
                    <td className="n">{usdc(c.settled)}</td>
                    <td className="n">{usdc(c.refund)}</td>
                    <td className="n">{c.closeTx}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total, test USDC</td>
                  <td className="n">{usdc(RUN.totals.deposits)}</td>
                  <td className="n">{usdc(RUN.totals.paid)}</td>
                  <td className="n">{usdc(RUN.totals.refunded)}</td>
                  <td>
                    <Provenance kind="settled" />
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
            <p className="px-small">{PROOF.publisherNote}</p>
          </div>
          <div className="px-stack">
            <p className="px-h3">{PROOF.limitsTitle}</p>
            <ul className="pg-limits">
              {PROOF.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ marginTop: "clamp(48px, 6vw, 88px)" }}>
          <ActionPrimary href={MVP_URL}>{PROOF.action}</ActionPrimary>
        </div>
      </Wrap>
    </Section>
  );
}

function Video() {
  const v = RUN.video;
  return (
    <Section id="video" tone="paper2" labelledBy="video-q">
      <Wrap>
        <Opener id="video-q" label={VIDEO.label} question={VIDEO.h2} size="h1" />
        {v ? (
          <div className="pg-video">
            <VideoFigure
              src={`/${v.file}`}
              poster={`/${v.poster}`}
              track={`/${v.captions}`}
              ratio={`${v.width} / ${v.height}`}
              title={VIDEO.title}
              caption={VIDEO.caption}
              chapters={v.chapters.map((at, i) => ({ at, label: VIDEO.chapters[i]! }))}
            />
          </div>
        ) : null}
      </Wrap>
    </Section>
  );
}

function Next() {
  return (
    <Section id="next" labelledBy="next-q">
      <Wrap>
        <Opener id="next-q" label={NEXT.label} question={NEXT.h2} />
        <NowNext now={NEXT.now} next={NEXT.next} />
        <div className="px-tiles" style={{ marginTop: "clamp(56px, 7vw, 96px)" }}>
          {NEXT.tiles.map((t) => (
            <AudienceTile key={t.title} title={t.title} body={t.body} planned={t.planned} />
          ))}
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
            <Display size="dxl" id="close-q">
              {CLOSING.h2}
            </Display>
            <p className="px-lead">{CLOSING.body}</p>
            <Actions>
              <ActionPrimary href={MVP_URL}>{CLOSING.primary}</ActionPrimary>
              <ActionText href={VIDEO_ANCHOR}>{CLOSING.video}</ActionText>
              <ActionText href={LIBRARY.url} external>
                {CLOSING.contexthint}
              </ActionText>
            </Actions>
          </div>
          <div style={{ maxWidth: 520, justifySelf: "end", width: "100%" }}>
            <SponsoredCard name={CV.name} text={CV.approvedText!} destination={CV.destination} />
            <div className="px-marks" style={{ marginTop: 16 }}>
              <Provenance kind="actual" label="The card from the cached question" onStage />
              <Provenance kind="fictional" onStage />
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <MotionRoot />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <Hero />
        <Shift />
        <Stage />
        <Rule />
        <Payments />
        <ContextHint />
        <Principles />
        <Proof />
        <Video />
        <Next />
        <Closing />
      </main>
      <SiteFooter scope={FOOTER.scope} base={<span>{FOOTER.base}</span>} />
    </>
  );
}
