// The Prospectus showcase (noindex): every primitive on one sheet for owner review.
import type { Metadata } from "next";
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
  Opener,
  PrincipleLedger,
  ProvenanceLegend,
  RoleRail,
  Section,
  SiteFooter,
  SiteHeader,
  SourceNote,
  SplitGrid,
  StatGrid,
  Wrap,
} from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import { LIBRARY, fmt } from "@/data/library";

export const metadata: Metadata = { title: "Prospectus design system", robots: { index: false, follow: false } };

const COLOURS: [string, string][] = [
  ["--paper", "#f5f4f0"],
  ["--paper-2", "#eeede8"],
  ["--white", "#fffefa"],
  ["--ink", "#171b1f"],
  ["--muted", "#444d53"],
  ["--steel", "#626c73"],
  ["--steel-dark", "#37444b"],
  ["--silver", "#c8ccce"],
  ["--line", "#b9bec0"],
  ["--stage", "#1b2226"],
  ["--stage-2", "#232c31"],
  ["--stage-ink", "#eef0ee"],
];
const MONEY: MoneyState[] = ["deposit", "reserved", "accepted", "authorized", "settled", "refunded", "pending", "unknown"];

export default function DesignPage() {
  return (
    <>
      <MotionRoot />
      <SiteHeader
        links={[
          { href: "#type", label: "Type" },
          { href: "#colour", label: "Colour" },
          { href: "#blocks", label: "Blocks" },
          { href: "#stage", label: "Stage" },
        ]}
        cta={{ href: "/", label: "See the page" }}
      />
      <main id="main" style={{ paddingTop: "var(--px-header-h)" }}>
        <Section id="type" borderless>
          <Wrap>
            <div className="px-stack-lg">
              <p className="px-label">Prospectus, the AXP landing system. Specimen sheet.</p>
              <Display as="h1" size="dxxl">Display xxl.</Display>
              <Display size="dxl">Display xl for scene lines.</Display>
              <Display size="h1">Heading one, the question a section answers?</Display>
              <Display size="h2">Heading two, set in PolySans Wide Slim.</Display>
              <Display as="h3" size="h3" reveal={false}>Heading three in Wide Neutral</Display>
              <p className="px-lead">Lead text carries the argument in one or two sentences, never more than thirty two characters wide per line.</p>
              <p className="px-body">
                Body text is PolySans Neutral at eighteen pixels. Emphasis is a colour shift to <em>steel</em>, never italics. Mono is reserved for real data such as{" "}
                <Amount baseUnits="4000" /> or a hash, and never for labels.
              </p>
              <p className="px-small">Small text for notes and secondary lines.</p>
              <p className="px-caption">Caption text, PolySans 500 with open tracking.</p>
            </div>
          </Wrap>
        </Section>

        <Section id="colour" tone="paper2">
          <Wrap>
            <Opener id="colour-q" label="Colour" question="Paper, ink and one steel accent." size="h2" />
            <div className="px-swatches">
              {COLOURS.map(([n, v]) => (
                <div key={n} className="px-swatch">
                  <i style={{ background: `var(${n})` }} />
                  <span>
                    {n} <span className="px-num">{v}</span>
                  </span>
                </div>
              ))}
            </div>
          </Wrap>
        </Section>

        <Section>
          <Wrap>
            <Opener id="marks-q" label="Provenance" question="Every claim carries its mark." size="h2" lead="A glyph plus a plain word. Shape carries the meaning so it survives print, compression and colour blindness." />
            <ProvenanceLegend />
            <div style={{ marginTop: 48 }} className="px-marks">
              {MONEY.map((m) => (
                <MoneyStateMark key={m} state={m} />
              ))}
            </div>
          </Wrap>
        </Section>

        <Section>
          <Wrap>
            <Opener id="actions-q" label="Actions" question="One ink action, then quiet text links." size="h2" />
            <Actions>
              <ActionPrimary href="#">See the working MVP</ActionPrimary>
              <ActionPrimary href="#" variant="outline">Outline action</ActionPrimary>
              <ActionPrimary href="#" size="s">Small action</ActionPrimary>
              <ActionText href="#">Watch the four minute video</ActionText>
            </Actions>
          </Wrap>
        </Section>

        <Section id="blocks">
          <Wrap>
            <Opener id="fig-q" label="Figures" question="Figures, exhibits and sources." size="h2" layout="split" lead="Figures frame bespoke diagrams. Exhibits set real specimens like documents on a table." />
            <SplitGrid ratio="50">
              <Figure title="Figure title" kinds={["actual", "illustrative"]} caption="A figcaption explains what the reader is looking at." controls={<><button type="button">Pause</button><button type="button">Replay</button></>}>
                <div style={{ height: 220, background: "var(--hatch-silver)" }} />
              </Figure>
              <Exhibit label="Exhibit label" kinds={["fictional"]} tilt="left" note="An exhibit note sits under the sheet.">
                <div style={{ height: 220 }} />
              </Exhibit>
            </SplitGrid>
            <div style={{ marginTop: 48 }}>
              <SourceNote>
                {LIBRARY.source}, {LIBRARY.snapshotDate}. Placements observed {LIBRARY.placementsWindow.from} to {LIBRARY.placementsWindow.to}.
              </SourceNote>
            </div>
          </Wrap>
        </Section>

        <Section>
          <Wrap>
            <Opener id="stats-q" label="Numbers" question="Numbers rise from their own masks." size="h2" />
            <StatGrid>
              <BigStat value={fmt(LIBRARY.advertisers)} label="observed advertisers" kind="observed" />
              <BigStat value={fmt(LIBRARY.creatives)} label="unique ad creatives" kind="observed" delay={80} />
              <BigStat value={fmt(LIBRARY.placements)} label="observed ad placements" kind="observed" delay={160} />
              <BigStat value={<span className="px-num">0.004</span>} unit="USDC" label="An amount, set in mono" size="s" delay={240} />
            </StatGrid>
          </Wrap>
        </Section>

        <Section>
          <Wrap>
            <Opener id="rail-q" label="Rail and ledger" question="Six parties. Rules in rows." size="h2" />
            <RoleRail
              roles={[
                { name: "Party one", body: "A short line on what this party does." },
                { name: "Party two", body: "A filled node marks a part decided in code.", kind: "code" },
                { name: "Party three", body: "A short line on what this party does." },
                { name: "Party four", body: "A short line on what this party does." },
                { name: "Party five", body: "A short line on what this party does." },
                { name: "Party six", body: "A short line on what this party does." },
              ]}
            />
            <div style={{ marginTop: 80 }}>
              <PrincipleLedger
                rows={[
                  { rule: "A principle, stated plainly.", run: "What happened in the run that shows it held.", kind: "actual" },
                  { rule: "A rule enforced in code.", run: "The policy evidence beside it.", kind: "policy" },
                ]}
              />
            </div>
          </Wrap>
        </Section>

        <Section>
          <Wrap>
            <Opener id="nn-q" label="Now and next" question="Demonstrated, then planned." size="h2" />
            <NowNext now={["A demonstrated capability", "Another demonstrated capability"]} next={["A planned capability", "Another planned capability"]} />
            <div className="px-tiles" style={{ marginTop: 64 }}>
              <AudienceTile title="For one audience" body="One sentence on what they get." />
              <AudienceTile title="For another" body="One sentence on what they get." />
              <AudienceTile title="Planned audience" body="Dashed tiles are planned, never shown as done." planned />
            </div>
          </Wrap>
        </Section>

        <Section id="stage" tone="stage">
          <Wrap>
            <Opener id="stage-q" label="Stage" question="The one matte dark stage." size="h2" lead={<p className="px-lead" style={{ color: "var(--stage-ink)" }}>Used once per page, for the exchange itself.</p>} />
            <div className="px-marks">
              <Provenance kind="actual" onStage />
              <Provenance kind="policy" onStage />
              <Provenance kind="settled" onStage />
              <Provenance kind="illustrative" onStage />
            </div>
            <div style={{ marginTop: 40 }}>
              <ActionPrimary href="#">Action on stage</ActionPrimary>
            </div>
          </Wrap>
        </Section>
      </main>
      <SiteFooter scope={["Scope line one.", "Scope line two."]} base={<span>Footer base line.</span>} />
    </>
  );
}
