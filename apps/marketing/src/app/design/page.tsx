// The Prospectus brand book (noindex): the system and every signature component, built with the
// real AXP content and the recorded run. The landing page is composed from exactly these parts.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Amount, MoneyStateMark, Provenance, type MoneyState } from "@axp/design-system/foundation";
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
  PrincipleLedger,
  ProvenanceLegend,
  RoleRail,
  Section,
  SiteFooter,
  SiteHeader,
  SourceNote,
  SplitGrid,
  StatGrid,
  Wordmark,
  Wrap,
} from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import { LIBRARY, fmt } from "@/data/library";
import { CACHED, CV, CV_CHANNEL, REPEAT, RUN, receiptFor } from "@/data/run";
import { FOOTER, HERO, MVP_URL } from "@/data/copy";
import { CONTEXTHINT, NEXT, ROLES, RULE } from "@/data/copy-book";
import { EvidencePayoff } from "@/specimens/EvidenceChain";
import { HostChat } from "@/specimens/HostChat";
import { ChannelMeter } from "@/specimens/ChannelMeter";
import { EvidenceChain } from "@/specimens/EvidenceChain";
import { NicheField } from "@/specimens/NicheField";
import { RunSheet } from "@/specimens/RunSheet";
import { ReceiptSheet } from "@/specimens/Receipt";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { PlateSheet, PLATES } from "@/scenes/plates";
import { BoardBeats, ExplodeScrubber, MotionDemos } from "@/showcase/Demos";
import { GlyphPlate } from "@/showcase/Glyphs";
import { PLATE_M, css } from "@/motion/motion";

export const metadata: Metadata = { title: "axp.one brand book: Prospectus", robots: { index: false, follow: false } };

const INDEX: [string, string][] = [
  ["type", "Type"],
  ["colour", "Colour"],
  ["depth", "Depth and shape"],
  ["grid", "Grids"],
  ["marks", "Provenance"],
  ["actions", "Actions"],
  ["chat", "Host chat and card"],
  ["stack", "The exploded card"],
  ["board", "The switchboard"],
  ["meter", "Channel meter"],
  ["evidence", "Evidence chain"],
  ["field", "Niche field"],
  ["proof", "Run sheet and receipt"],
  ["blocks", "Content blocks"],
  ["motion", "Motion"],
];

const COLOURS: [string, string, string][] = [
  ["--brand", "#2b3bff", "Ultramarine: the winning bid, the route, the Sponsored frame, the primary action"],
  ["--brand-deep", "#1a26cf", "Hover, small brand text"],
  ["--brand-wash", "#e7e9ff", "Tint, card shadow"],
  ["--paper", "#f4f2ec", "Page"],
  ["--paper-2", "#ecebe4", "Sunk band"],
  ["--white", "#fbfaf6", "Raised sheet"],
  ["--ink", "#0e1220", "Text, paid money"],
  ["--muted", "#4c5266", "Secondary text"],
  ["--line", "#c9cad3", "Hairlines"],
  ["--stage", "#0a0e2a", "The one stage: ultramarine night"],
  ["--stage-brand", "#6573ff", "Ultramarine on the stage"],
  ["--contexthint", "#f65a20", "ContextHint, only in its own section"],
];
const MONEY: MoneyState[] = ["deposit", "reserved", "accepted", "authorized", "settled", "refunded", "pending", "unknown"];

function Chapter({ id, name, title, lead, children, tone }: { id: string; name: string; title: string; lead?: ReactNode; children: ReactNode; tone?: "paper2" | "stage" }) {
  return (
    <Section id={id} tone={tone}>
      <Wrap>
        <header className="bk-chapter">
          <div className="px-opener-label">
            <p className="px-label">{name}</p>
          </div>
          <Display size="h1">{title}</Display>
          {lead ? <p className="px-lead" style={tone === "stage" ? { color: "var(--stage-muted)", maxWidth: "46ch" } : { maxWidth: "46ch" }}>{lead}</p> : null}
        </header>
        {children}
      </Wrap>
    </Section>
  );
}

export default function BrandBook() {
  const cached = receiptFor("v3-cached");
  const kfReceipt = receiptFor("v3-repeat");
  return (
    <>
      <MotionRoot />
      <SiteHeader links={[{ href: "#stack", label: "Exploded card" }, { href: "#board", label: "Switchboard" }, { href: "#motion", label: "Motion" }, { href: "/", label: "The page" }]} cta={{ href: MVP_URL, label: "See the MVP" }} chip="Brand book" />
      <main id="main">
        <section id="top" className="bk-cover-band" data-header-tone="brand">
          <Wrap>
            <div className="bk-cover">
              <GlyphPlate kinds={["actual", "observed", "inferred", "fictional", "policy", "settled", "synthetic", "replay", "illustrative", "vision"]} />
              <Wordmark as="p" className="bk-mark" />
              <div className="bk-meta">
                <div className="px-stack">
                  <p className="px-lead" style={{ maxWidth: "36ch" }}>
                    Prospectus: the landing system for {HERO.h1.toLowerCase().replace(/\.$/, "")}. Paper, ink, one ultramarine, one ultramarine night. Every mark says where a fact came from.
                  </p>
                  <p className="px-small">Brand book, version 2. Built with our recorded run and ContextHint data as of {LIBRARY.snapshotDate}.</p>
                </div>
                <ul className="bk-index">
                  {INDEX.map(([id, name]) => (
                    <li key={id}>
                      <a href={`#${id}`}>
                        {name}
                        <span aria-hidden>&rarr;</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Wrap>
        </section>

        <Chapter id="type" name="Type" title="PolySans, wide for the argument, plain for the facts." lead="Wide Slim 300 carries every headline. Neutral carries the reading. Mono appears only where a value is real data.">
          <div className="px-stack-lg">
            <Display as="p" size="dxxl">The exchange.</Display>
            <Display as="p" size="dxl">Behind one card.</Display>
            <Display as="p" size="h1">{HERO.h1}</Display>
            <Display as="p" size="h2">Rules the money cannot break.</Display>
            <p className="px-h3">Built on ContextHint.</p>
            <SplitGrid ratio="74">
              <p className="px-lead">{HERO.lede}</p>
              <div className="px-stack">
                <p className="px-body">Body text is eighteen pixels. Emphasis is a shift to <em>ultramarine</em>, never italics. A price reads <Amount baseUnits={CACHED.price!} />.</p>
                <p className="px-small">Small text for notes, sources and scope lines.</p>
                <p className="px-caption">Caption, PolySans 500, open tracking.</p>
              </div>
            </SplitGrid>
          </div>
        </Chapter>

        <Chapter id="colour" name="Colour" title="Paper, ink and one ultramarine." tone="paper2" lead="Ultramarine is the money and the route: it appears where the story peaks and nowhere else. ContextHint keeps its own vermillion, and its evidence turns ultramarine the moment it enters an axp decision.">
          <div className="px-swatches">
            {COLOURS.map(([n, v, role]) => (
              <div key={n} className={`px-swatch${n === "--brand" ? " bk-swatch-hero" : ""}`}>
                <i style={{ background: `var(${n})`, height: n === "--brand" ? 200 : undefined }} />
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{role}</span>
                <span>
                  {n} <span className="px-num">{v}</span>
                </span>
              </div>
            ))}
          </div>
        </Chapter>

        <Chapter id="depth" name="Depth and shape" title="Square sheets on hard shadows. No blur, ever." lead="Depth is an offset, like a printed sheet lifted off the page. Plates lie on the table through one matrix.">
          <div className="px-stack-lg">
            <div className="dp-row">
              <div className="dp-box" style={{ boxShadow: "none" }}>Flat, 1px ink rule</div>
              <div className="dp-box" style={{ boxShadow: "var(--shadow-offset-s)" }}>Offset small, 5px</div>
              <div className="dp-box" style={{ boxShadow: "var(--shadow-offset)" }}>Offset, 9px</div>
              <div className="dp-box" style={{ boxShadow: "var(--shadow-offset)", transform: "rotate(-1.1deg)" }}>Exhibit, tilted</div>
            </div>
            <div className="dp-iso">
              <div className="dp-iso-cell">
                <div style={{ width: 300, height: 180, position: "relative" }}>
                  <PlateSheet p={PLATES[1]!} />
                </div>
              </div>
              <div className="dp-iso-cell">
                <div style={{ width: 300, height: 180, position: "relative", transform: css(PLATE_M) }}>
                  <PlateSheet p={PLATES[1]!} />
                </div>
              </div>
              <div className="px-stack">
                <p className="px-h3">The plate matrix</p>
                <p className="px-body">One 2D matrix, no 3D: squash to 58 percent, shear 36 degrees, turn 4 degrees. Text stays horizontal and readable, Safari never sees preserve-3d, and the flat sheet morphs into the plate by mixing two matrices.</p>
                <code className="px-small" style={{ overflowWrap: "anywhere" }}>{css(PLATE_M)}</code>
              </div>
            </div>
            <div className="dp-row">
              <span className="px-chip">Hackathon MVP</span>
              <span className="px-chip">Hosted Solana sandbox</span>
              <span className="sp-tag">Skip</span>
              <span className="sp-tag" data-solid="">Bid</span>
              <span className="sp-card-label">Sponsored</span>
            </div>
          </div>
        </Chapter>

        <Chapter id="grid" name="Grids" title="Asymmetric, on a 1520 stage." lead="Two ratios do almost all the work: .86 to 1.14 for argument and figure, .74 to 1.26 for a label beside a long exhibit.">
          {(["86", "74"] as const).map((r) => (
            <div key={r} className="dp-grid" data-ratio={r} style={{ marginBottom: 48 }}>
              <div className="dp-grid-overlay" aria-hidden>
                <i />
                <i />
              </div>
              <div className="dp-grid-content">
                <div>
                  <p className="px-label">{r === "86" ? ".86 fr" : ".74 fr"}</p>
                </div>
                <div>
                  <p className="px-label">{r === "86" ? "1.14 fr" : "1.26 fr"}</p>
                </div>
              </div>
            </div>
          ))}
        </Chapter>

        <Chapter id="marks" name="Provenance" title="Every claim carries its mark." lead="A glyph plus a plain word. The shape carries the meaning, so it survives print, video compression and colour blindness.">
          <ProvenanceLegend />
          <div style={{ marginTop: 56 }} className="px-stack">
            <p className="px-h3">Money states</p>
            <div className="px-marks">
              {MONEY.map((m) => (
                <MoneyStateMark key={m} state={m} />
              ))}
            </div>
          </div>
        </Chapter>

        <Chapter id="actions" name="Actions" title="One ink action. Then quiet text.">
          <Actions>
            <ActionPrimary href={MVP_URL}>{HERO.primary}</ActionPrimary>
            <ActionPrimary href="#video" variant="outline">{HERO.video}</ActionPrimary>
            <ActionPrimary href={MVP_URL} size="s">See the MVP</ActionPrimary>
            <ActionText href="#proof">Skip to the proof</ActionText>
          </Actions>
        </Chapter>

        <Chapter id="chat" name="Host chat and card" title="The answer, then a card that says Sponsored." lead="A specimen of the AI app's own chat, the one rounded shape on the page because it is a third-party surface.">
          <SplitGrid ratio="86" align="start">
            <div className="px-stack">
              <p className="px-body">{HERO.frameCaption}</p>
              <p className="px-small">The intro plays once from first paint: the question, the answer word by word, then the card lands on its hard shadow, label first.</p>
            </div>
            <HostChat question={CACHED.question} answer={CACHED.organic.excerpt} appName={HERO.appName} card={{ name: CV.name, text: CV.approvedText!, destination: CV.destination }} intro />
          </SplitGrid>
        </Chapter>

        <Chapter id="stack" name="The exploded card" title={HERO.pullBack} lead="Six plates on a dashed steel route, each a real specimen from the cached question. Drag to explode.">
          <ExplodeScrubber />
          <p className="px-small" style={{ marginTop: 16 }}>{HERO.stackCaption}</p>
        </Chapter>

        <Chapter id="board" name="The switchboard" title="What happens between the question and the card?" tone="stage" lead="The one dark stage. Seven beats light one region each; the rest dims. Values are actual, motion illustrative.">
          <BoardBeats />
        </Chapter>

        <Chapter id="meter" name="Channel meter" title="A deposit, a running total, one close." lead={`${CV.name}'s actual channel at four moments, drawn to the scale of its deposit.`}>
          <div className="px-stack-lg">
            {[0, 0.45, 0.8, 1].map((t) => (
              <Figure key={t} title={t === 0 ? "Opened with a deposit" : t === 0.45 ? "First accepted card" : t === 0.8 ? "Running total after two cards" : "Closed once"} kinds={t === 1 ? ["settled"] : ["actual"]}>
                <ChannelMeter ch={CV_CHANNEL} t={t} />
              </Figure>
            ))}
          </div>
        </Chapter>

        <Chapter id="evidence" name="Evidence chain" title={CONTEXTHINT.dive} lead="What ClearVault's agent saw for the cached question, and the one thing that changed.">
          <SplitGrid ratio="74">
            <p className="px-small">{CONTEXTHINT.context}</p>
            <div className="px-stack-lg">
              <EvidenceChain />
              <EvidencePayoff />
            </div>
          </SplitGrid>
        </Chapter>

        <Chapter id="field" name="Niche field" title={`${fmt(LIBRARY.niches)} niches. One of them is the run's.`} lead={CONTEXTHINT.fieldNote} tone="paper2">
          <NicheField />
          <div style={{ marginTop: 32 }}>
            <SourceNote>{CONTEXTHINT.source}</SourceNote>
          </div>
        </Chapter>

        <Chapter id="proof" name="Run sheet and receipt" title="One recorded run, end to end.">
          <div className="px-stack-lg">
            <Exhibit label="Run sheet" kinds={["replay", "actual"]}>
              <RunSheet />
            </Exhibit>
            <SplitGrid ratio="50">
              <Exhibit label={`${RUN.campaigns["v3-keyforge"].name}'s actual Sponsored card`} kinds={["actual", "fictional"]} tilt="right">
                <div style={{ padding: 28 }}>
                  <SponsoredCard name={RUN.campaigns["v3-keyforge"].name} text={RUN.campaigns["v3-keyforge"].approvedText!} destination={RUN.campaigns["v3-keyforge"].destination} />
                  <p className="px-small" style={{ marginTop: 16 }}>Shown for: {REPEAT.question}</p>
                </div>
              </Exhibit>
              <Exhibit label="Its signed receipt" kinds={["actual"]} tilt="left" note="A receipt proves the app delivered the card, not that a person looked.">
                <ReceiptSheet r={kfReceipt} />
              </Exhibit>
            </SplitGrid>
          </div>
        </Chapter>

        <Chapter id="blocks" name="Content blocks" title={ROLES.h3}>
          <div className="px-stack-lg">
            <RoleRail roles={ROLES.roles} />
            <p className="px-small">{ROLES.legend}</p>
            <PrincipleLedger rows={RULE.rules.map((r) => ({ rule: r.rule, run: r.run, kind: "actual" as const }))} />
            <StatGrid>
              {[
                { value: fmt(LIBRARY.advertisers), label: "advertisers observed", sub: undefined },
                { value: fmt(LIBRARY.creatives), label: "unique ads", sub: undefined },
                { value: fmt(LIBRARY.placements), label: "times an ad was seen", sub: undefined },
                { value: fmt(LIBRARY.niches), label: "niches", sub: `${fmt(LIBRARY.nichesWithAds)} with ads` },
                { value: fmt(LIBRARY.subNiches), label: "sub niches", sub: `${fmt(LIBRARY.subNichesWithAds)} with ads` },
              ].map((s, i) => (
                <BigStat key={s.label} value={s.value} label={s.label} sub={s.sub} kind="observed" delay={i * 80} />
              ))}
            </StatGrid>
            <SourceNote>{CONTEXTHINT.source}</SourceNote>
            <p className="px-small">{CONTEXTHINT.context}</p>
            <NowNext now={NEXT.now} next={NEXT.next} />
            <div className="px-tiles">
              {NEXT.tiles.map((t) => (
                <AudienceTile key={t.title} title={t.title} body={t.body} planned={t.planned} />
              ))}
            </div>
          </div>
        </Chapter>

        <Chapter id="motion" name="Motion" title="Cause, then effect. One curve family." lead="Transform, opacity and clip-path only. Under reduced motion every demo shows its end state." tone="paper2">
          <MotionDemos />
        </Chapter>
      </main>
      <SiteFooter scope={FOOTER.scope} base={<><span>{FOOTER.base}</span><a href="/">Back to the page</a></>} />
    </>
  );
}
