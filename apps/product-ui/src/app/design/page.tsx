import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Ld, InspectorProvider } from "@axp/design-system/ledger";
import { PROVENANCE, type ProvenanceKind } from "@axp/design-system/foundation";
import { decisionFor, evidenceHint, evidenceRecord, nameOf, opportunity, run, usdc } from "@/data/select";
import { activityGapLabel, activityLanes, activitySegments, auctionRow, campaignStats, hhmm, shortLabel } from "@/components/v2/derive";
import { LiveHashV2, LiveSignatureV2, LiveVerifyTile, DesignPipelineDemo, DrawerDemo } from "@/components/v2/live";

export const metadata: Metadata = { title: "Ledger v2 design system", robots: { index: false, follow: false } };

const L = Link as unknown as Ld.LinkC;

const INDEX: Array<{ group: string; items: Array<[string, string]> }> = [
  { group: "Foundations", items: [["principles", "Principles"], ["colour", "Colour roles"], ["type", "Typography"], ["space", "Spacing and layout"], ["shape", "Shape and elevation"], ["motion", "Motion"]] },
  {
    group: "Components",
    items: [
      ["buttons", "Buttons"],
      ["forms", "Form controls"],
      ["tabs", "Tabs and segmented"],
      ["nav", "Navigation"],
      ["kpi", "KPI tiles"],
      ["panels", "Panels"],
      ["tables", "Data tables"],
      ["tags", "Tags and status"],
      ["marks", "Provenance and money"],
      ["overlays", "Tooltip, popover, modal"],
      ["inspector", "Inspector drawer"],
      ["empty", "Empty and no fill"],
      ["toast", "Toasts and keys"],
    ],
  },
  {
    group: "Product",
    items: [
      ["pipeline", "Pipeline stepper"],
      ["ruler", "Score ruler"],
      ["bids", "Bid chart"],
      ["cumulative", "Cumulative chart"],
      ["meters", "Sparklines and meters"],
      ["activity", "Activity"],
      ["balance", "Channel balance"],
      ["chat", "Chat specimen"],
      ["receipt", "Receipt card"],
      ["evidence", "Evidence card"],
      ["campaign", "Campaign header"],
    ],
  },
  { group: "Rules", items: [["dataviz", "Data visualization"], ["present", "Present mode"], ["composition", "Composition"]] },
];

function Doc({ id, title, usage, children }: { id: string; title: string; usage: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="ds2-doc">
      <div className="ds2-doc-head">
        <h2 className="ld-section-title">{title}</h2>
        <p className="ld-secondary" style={{ maxWidth: "76ch" }}>
          {usage}
        </p>
      </div>
      {children}
    </section>
  );
}
function Spec({ label, children, canvas, pad = true }: { label?: ReactNode; children: ReactNode; canvas?: boolean; pad?: boolean }) {
  return (
    <div className="ds2-spec" data-canvas={canvas || undefined}>
      {label ? <div className="ds2-spec-l">{label}</div> : null}
      <div className={pad ? "ds2-spec-b" : undefined}>{children}</div>
    </div>
  );
}
function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ds2-state">
      <div>{children}</div>
      <span className="ld-caption">{label}</span>
    </div>
  );
}

export default function LedgerV2() {
  const o1 = opportunity(1);
  const o2 = opportunity(2);
  const o3 = opportunity(3);
  const o4 = opportunity(4);
  const cv = run.channels[0];
  const kf = run.channels[1];
  const cvH = decisionFor(o1, "v3-clearvault", "history")!;
  const cvB = decisionFor(o1, "v3-clearvault", "text_only")!;
  const kfR = decisionFor(o3, "v3-keyforge", "history")!;
  const mercari = evidenceRecord(cvH.retrieval!.examples[0].id)!;
  const hint = evidenceHint(cvH.retrieval!.hintIds[0])!;
  const lgH = decisionFor(o1, "v3-leatherguard", "history")!;
  const ariat = evidenceRecord(lgH.retrieval!.examples[0].id)!;
  const rows = run.opportunities.map(auctionRow);
  const stats = run.campaigns.map((c) => campaignStats(c.campaignId));
  const max = Number(run.policy.maxBidBaseUnits);
  const fmt = (v: number) => usdc(v);
  const pipeStages = (o: typeof o1): Ld.PipeStage[] =>
    o.status === "no_fill"
      ? [
          { id: "moment", label: "Moment", value: o.mandatoryCapabilities.length + " required", status: "done" },
          { id: "elig", label: "Eligibility", value: "0 of 3", status: "done" },
          ...["Evidence", "Decisions", "Auction", "Award", "Delivery", "Receipt", "Charge"].map((l) => ({ id: l, label: l, value: "Did not run", status: "skipped" as const })),
        ]
      : [
          { id: "moment", label: "Moment", value: "Floor " + usdc(o.floorBaseUnits), status: "done" },
          { id: "elig", label: "Eligibility", value: `${o.eligibility.eligible.length} of 3`, status: "done" },
          { id: "ev", label: "Evidence", value: o.decisions.find((d) => d.retrieval)?.retrieval?.method === "vector" ? "Vector match" : "Lexical", status: "done" },
          { id: "dec", label: "Decisions", value: `${o.decisions.length} calls`, status: "done" },
          { id: "auc", label: "Auction", value: `${o.auction.bids.length} bids`, status: "done" },
          { id: "award", label: "Award", value: usdc(o.award!.priceBaseUnits) + " reserved", status: "done" },
          { id: "del", label: "Delivery", value: `+${(o.delivery!.msAfterAward / 1000).toFixed(1)} s`, status: "done" },
          { id: "rec", label: "Receipt", value: "Signed", status: "done" },
          { id: "chg", label: "Charge", value: usdc(o.charge!.amountBaseUnits), status: "done" },
        ];
  const navGroups = (current: string): Array<{ label?: string; items: Ld.NavItem[] }> => [
    {
      items: [
        { key: "Overview", href: "#composition", label: "Overview", current: current === "overview" },
        {
          href: "#composition",
          label: "Opportunities",
          meta: "4",
          children: run.opportunities.map((o) => ({ href: "#composition", label: `${o.n}  ${shortLabel(o)}`, current: current === `o${o.n}`, key: `o${o.n}` })),
        },
        { key: "Campaigns", href: "#composition", label: "Campaigns", meta: "3" },
        { key: "Publisher", href: "#composition", label: "Publisher" },
        { key: "Settlement", href: "#composition", label: "Settlement", meta: usdc(run.totals.paidBaseUnits) },
        { key: "Evidence", href: "#composition", label: "Evidence" },
        { key: "Verify", href: "#composition", label: "Verify", meta: "48/48" },
      ],
    },
  ];

  const kpis = (
    <div className="ld-kpis">
      <Ld.Kpi label="Opportunities" value={run.counts.opportunities} context="4 questions in story order" />
      <Ld.Kpi label="Fill" value={`${run.counts.auctions} of ${run.counts.opportunities}`} context="1 no fill by rule, 0 calls" />
      <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context={`${rows.reduce((n, r) => n + r.bidders, 0)} became bids`} />
      <Ld.Kpi label="Accepted spend" value={usdc(run.totals.chargesBaseUnits)} context={`Test USDC; ${usdc(run.totals.refundedBaseUnits)} refunded`} chip={<Ld.Tag tone="brand">Sandbox</Ld.Tag>} />
      <LiveVerifyTile />
    </div>
  );

  return (
    <InspectorProvider scopeClass="ld">
      <div className="ld ds2">
        <Ld.TopBar
          brand={<Ld.Wordmark href="/" Link={L} />}
          run={<Ld.RunSwitcher runId={run.source.runId} note="Recorded replay · hosted Solana sandbox · test USDC" />}
          chips={
            <>
              <Ld.Pv kind="replay" />
              <Ld.Pv kind="fictional" label="Fictional advertisers" />
              <span className="ld-caption" style={{ alignSelf: "center", marginLeft: 6 }}>
                Ledger v2 design system
              </span>
            </>
          }
          actions={
            <>
              <Ld.Button variant="ghost" href="/design/v1/" Link={L}>
                v1 archive
              </Ld.Button>
              <Ld.Button variant="secondary" href="/present/" Link={L}>
                Present
              </Ld.Button>
              <Ld.Button href="/verify/" Link={L}>
                Verify
              </Ld.Button>
            </>
          }
        />
        <div className="ds2-body">
          <nav className="ds2-index" aria-label="Design system index">
            {INDEX.map((g) => (
              <div key={g.group} className="ld-nav-group">
                <div className="ld-nav-head">{g.group}</div>
                {g.items.map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="ld-nav-item">
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <main className="ds2-main">
            <header className="ds2-cover">
              <div className="ld-stack" style={{ gap: 10 }}>
                <Ld.Breadcrumbs items={[{ label: "axp.one" }, { label: "Design" }, { label: "Ledger v2" }]} />
                <h1 className="ds2-cover-t">Ledger, the axp.one product system</h1>
                <p className="ld-body" style={{ maxWidth: "70ch", color: "var(--ld-text-2)", fontSize: 15 }}>
                  A dashboard-grade system for the MVP explorer: calm surfaces, soft radius, one ultramarine for whatever is live, selected or winning, and real data in every example. The landing page keeps its editorial system; the product looks and works like a product.
                </p>
              </div>
              {kpis}
            </header>

            {/* ---------------- Foundations ---------------- */}
            <Doc id="principles" title="Principles" usage="Five rules every screen follows. They are why the components look the way they do.">
              <div className="ld-cols-3">
                {[
                  ["Functional first", "Screens are working surfaces: tables, charts and panels that answer a question at a glance. Narrative belongs to the landing page and Present mode."],
                  ["One live colour", "Ultramarine marks the interactive, the selected and the winning. Data text stays ink. Semantic states use their own muted colours with a word."],
                  ["Every value has a source", "Provenance pills sit on anything a reader might over-read: actual output, observed evidence, inferred hints, fictional advertisers."],
                  ["Detail on demand", "The main view shows the shape of the answer; raw records, hashes and paths open in the inspector."],
                  ["Truth over polish", "Recorded timings stay recorded. No spinners, count-ups or thinking text. Two clocks never share an axis."],
                  ["Readable at 1440 × 900", "Body 14 px, labels 12 px, nothing essential under 12 px; tabular figures for every number."],
                ].map(([h, b]) => (
                  <Ld.Panel key={h} title={h}>
                    <p className="ld-secondary">{b}</p>
                  </Ld.Panel>
                ))}
              </div>
            </Doc>

            <Doc id="colour" title="Colour roles" usage="Roles sit on the shared ultramarine foundation. Use the role, never the raw hex, so dark Present mode and future themes follow.">
              <div className="ld-cols-2">
                <Spec label="Surfaces">
                  <div className="ds2-swatches">
                    {[
                      ["--ld-canvas", "Canvas", "#f6f5f1"],
                      ["--ld-panel", "Panel", "#ffffff"],
                      ["--ld-sunken", "Sunken", "#f1f0ec"],
                      ["--ld-hover", "Hover", "#f3f3f6"],
                      ["--ld-selected", "Selected", "brand wash"],
                    ].map(([t, n, h]) => (
                      <div key={t} className="ds2-sw">
                        <i style={{ background: `var(${t})` }} />
                        <span className="ld-strong">{n}</span>
                        <span className="ld-caption">{t}</span>
                        <span className="ld-caption">{h}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="Text and borders">
                  <div className="ds2-swatches">
                    {[
                      ["--ld-text", "Primary", "#0e1220"],
                      ["--ld-text-2", "Secondary", "#4c5266"],
                      ["--ld-text-3", "Tertiary", "#6e7488"],
                      ["--ld-border", "Border", "#e3e3e8"],
                      ["--ld-border-2", "Strong border", "#cfd0d8"],
                    ].map(([t, n, h]) => (
                      <div key={t} className="ds2-sw">
                        <i style={{ background: `var(${t})` }} />
                        <span className="ld-strong">{n}</span>
                        <span className="ld-caption">{t}</span>
                        <span className="ld-caption">{h}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="Interactive and live: ultramarine">
                  <div className="ds2-swatches">
                    {[
                      ["--ld-accent", "Accent", "#2b3bff"],
                      ["--ld-accent-hover", "Accent hover", "#1a26cf"],
                      ["--ld-accent-wash", "Accent wash", "#e7e9ff"],
                      ["--ld-accent-line", "Accent line", "#b9c0ff"],
                    ].map(([t, n, h]) => (
                      <div key={t} className="ds2-sw">
                        <i style={{ background: `var(${t})` }} />
                        <span className="ld-strong">{n}</span>
                        <span className="ld-caption">{t}</span>
                        <span className="ld-caption">{h}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="Semantic states: muted, always with a word">
                  <div className="ld-stack">
                    <div className="ld-row">
                      <Ld.Tag tone="success" dot>
                        Passed
                      </Ld.Tag>
                      <Ld.Tag tone="warning" dot>
                        Not checked
                      </Ld.Tag>
                      <Ld.Tag tone="danger" dot>
                        Mismatch
                      </Ld.Tag>
                      <Ld.Tag dot>Recorded only</Ld.Tag>
                    </div>
                    <p className="ld-caption">Success, warning, danger and neutral are reserved for state. They are never the accent, never a series colour.</p>
                    <div className="ld-row">
                      <Ld.Tag tone="ch" dot>
                        ContextHint evidence
                      </Ld.Tag>
                      <span className="ld-caption">Vermillion #f65a20 only where ContextHint evidence appears.</span>
                    </div>
                  </div>
                </Spec>
              </div>
              <Spec label="Chart palette: emphasis, context, one reserved secondary">
                <div className="ld-row" style={{ gap: 16 }}>
                  {[
                    ["--ld-chart-1", "Emphasis: selected or winning"],
                    ["--ld-chart-2", "Second step"],
                    ["--ld-chart-3", "Third step"],
                    ["--ld-chart-4", "Fourth step"],
                    ["--ld-chart-context", "Context: everything else"],
                    ["--ld-chart-secondary", "Evidence series only"],
                  ].map(([t, n]) => (
                    <span key={t} className="ld-row" style={{ gap: 8 }}>
                      <i style={{ width: 22, height: 10, borderRadius: 3, background: `var(${t})`, display: "inline-block" }} />
                      <span className="ld-secondary">{n}</span>
                    </span>
                  ))}
                </div>
                <p className="ld-caption" style={{ marginTop: 10 }}>
                  Validated with the dataviz palette check: ultramarine against vermillion passes lightness, chroma, colour-vision separation (ΔE 34.8 protan) and contrast on the light surface.
                </p>
              </Spec>
            </Doc>

            <Doc id="type" title="Typography" usage="PolySans only. Median 500 for headings, Neutral 400 for reading, Wide only for big numbers. Sentence case everywhere. Mono is reserved for hashes, IDs and raw values.">
              <Spec pad={false}>
                <div className="ds2-type">
                  {[
                    ["Hero number", "Wide 400 · 44/1.05 · -3%", <span key="a" className="ld-hero-num">{usdc(run.totals.paidBaseUnits)}</span>, "One per screen at most"],
                    ["KPI number", "Wide 400 · 28/1.1 · -2%", <span key="b" className="ld-kpi-num">{run.counts.decisions}</span>, "Stat tiles"],
                    ["Page title", "Median 500 · 24/1.25", <span key="c" className="ld-page-title">Opportunity 1</span>, "One per page"],
                    ["Section title", "Median 500 · 18/1.35", <span key="d" className="ld-section-title">Auction</span>, "Groups of panels"],
                    ["Card title", "Median 500 · 15/1.4", <span key="e" className="ld-card-title">Bids by campaign</span>, "Panel headers"],
                    ["Body", "Neutral 400 · 14/1.5", <span key="f" className="ld-body">Code turns agent levels into a bid. The model never names a price.</span>, "Default text"],
                    ["Secondary", "Neutral 400 · 13/1.45", <span key="g" className="ld-secondary">Equal bids are ordered by campaign ID.</span>, "Supporting text"],
                    ["Label", "Median 500 · 12/1.35", <span key="h" className="ld-label">Accepted spend</span>, "Field and column labels, sentence case"],
                    ["Caption", "Neutral 400 · 12/1.4", <span key="i" className="ld-caption">Exchange clock, UTC</span>, "Axis text, notes"],
                    ["Mono", "Mono 400 · 12.5/1.4", <span key="j" className="ld-mono">{o1.receipt!.receiptHash.slice(0, 32)}…</span>, "Hashes, IDs, raw values only"],
                  ].map(([n, spec, ex, use]) => (
                    <div key={String(n)} className="ds2-type-row">
                      <span className="ld-strong">{n}</span>
                      <span className="ld-caption">{spec}</span>
                      <span style={{ minWidth: 0 }}>{ex}</span>
                      <span className="ld-caption">{use}</span>
                    </div>
                  ))}
                </div>
              </Spec>
              <Spec label="In a composition: hierarchy, not decoration" canvas>
                <Ld.Panel title="Bids by campaign" sub="Opportunity 1 · fit_intent_bid_v1" actions={<Ld.Tag tone="brand">Tie-break</Ld.Tag>}>
                  <div className="ld-cols-3">
                    <div className="ld-stack" style={{ gap: 2 }}>
                      <span className="ld-label">Winning bid</span>
                      <span className="ld-kpi-num">{usdc(o1.award!.priceBaseUnits)}</span>
                      <span className="ld-caption">{nameOf(o1.award!.campaignId)}, levels 3:3</span>
                    </div>
                    <div className="ld-stack" style={{ gap: 2 }}>
                      <span className="ld-label">Bidders</span>
                      <span className="ld-kpi-num">{o1.auction.bids.length}</span>
                      <span className="ld-caption">LeatherGuard excluded by rule</span>
                    </div>
                    <div className="ld-stack" style={{ gap: 2 }}>
                      <span className="ld-label">Floor</span>
                      <span className="ld-kpi-num">{usdc(o1.floorBaseUnits)}</span>
                      <span className="ld-caption">Test USDC</span>
                    </div>
                  </div>
                </Ld.Panel>
              </Spec>
            </Doc>

            <Doc id="space" title="Spacing and layout" usage="A 4 px base scale. Panels use 16 px padding and 16 px gaps; dense tables 10 to 12 px cell padding. The shell is a 52 px top bar, a 240 px sidebar and content up to 1,360 px.">
              <div className="ld-cols-2">
                <Spec label="Scale">
                  <div className="ds2-space">
                    {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((n) => (
                      <div key={n}>
                        <i style={{ width: n, height: n }} />
                        <span className="ld-caption">{n}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="App shell">
                  <div className="ds2-shellmap">
                    <div className="ds2-sm-top">Top bar 52 · wordmark, run, scope, Present, Verify</div>
                    <div className="ds2-sm-side">Sidebar 240</div>
                    <div className="ds2-sm-main">
                      Content · max 1,360 · padding 20 / 28
                      <div className="ds2-sm-grid">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                  <p className="ld-caption" style={{ marginTop: 8 }}>Under 900 px the sidebar becomes a horizontal scroller and grids stack to one column. No horizontal page scroll at 390 px.</p>
                </Spec>
              </div>
            </Doc>

            <Doc id="shape" title="Shape and elevation" usage="Radius by size: 6 controls, 10 cards and panels, 14 large containers, full for pills. Every surface has a 1 px border; shadow appears only when something floats.">
              <div className="ld-cols-4">
                {[
                  ["6 · controls", "--ld-r-sm", "var(--ld-shadow-1)", 6],
                  ["10 · cards, panels", "--ld-r-md", "var(--ld-shadow-1)", 10],
                  ["14 · drawers, modals", "--ld-r-lg", "var(--ld-shadow-3)", 14],
                  ["Full · pills", "--ld-r-full", "none", 999],
                ].map(([l, t, sh, r]) => (
                  <div key={String(l)} className="ds2-shape" style={{ borderRadius: Number(r) > 100 ? 999 : Number(r), boxShadow: String(sh) }}>
                    <span className="ld-strong">{l}</span>
                    <span className="ld-caption">{t}</span>
                  </div>
                ))}
              </div>
              <div className="ld-cols-3">
                {[
                  ["Shadow 1 · resting panel", "var(--ld-shadow-1)"],
                  ["Shadow 2 · raised card, chat", "var(--ld-shadow-2)"],
                  ["Shadow 3 · menu, drawer, modal", "var(--ld-shadow-3)"],
                ].map(([l, s]) => (
                  <div key={l} className="ds2-shape" style={{ boxShadow: s, borderRadius: 10 }}>
                    <span className="ld-strong">{l}</span>
                  </div>
                ))}
              </div>
            </Doc>

            <Doc id="motion" title="Motion" usage="Short and functional: 120 ms for hover and press, 180 ms for toggles and tabs, 220 ms for drawers, stepper progression and chart reveal. One easing curve. Reduced motion makes everything instant. Motion never imitates execution.">
              <div className="ld-cols-3">
                <Spec label="Chart reveal · 220 ms">
                  <Ld.RevealOnView caption="Bars grow from the baseline once, on first view.">
                    <Ld.BidBars
                      reveal
                      max={max}
                      floor={Number(o1.floorBaseUnits)}
                      format={fmt}
                      rows={o1.auction.bids.map((b) => ({ key: b.campaignId, label: nameOf(b.campaignId), value: Number(b.amountBaseUnits), winner: b.campaignId === o1.award!.campaignId }))}
                    />
                  </Ld.RevealOnView>
                </Spec>
                <Spec label="Card into slot · 220 ms">
                  <Ld.RevealOnView caption="The delivered card settles into the Sponsored slot.">
                    <Ld.SponsoredCard enter text={o1.award!.creative.approvedText} advertiser={nameOf(o1.award!.campaignId)} url={o1.award!.creative.destinationURL} />
                  </Ld.RevealOnView>
                </Spec>
                <Spec label="Stepper progression · 180 ms">
                  <div className="ld-stack">
                    <Ld.Pipeline stages={pipeStages(o1).slice(0, 4)} />
                    <span className="ld-caption">Click a stage, or focus the stepper and use the arrow keys.</span>
                  </div>
                </Spec>
              </div>
            </Doc>

            {/* ---------------- Components ---------------- */}
            <Doc id="buttons" title="Buttons" usage="One primary action per view, in ultramarine. Secondary for alternatives, ghost for quiet actions in toolbars, danger only for destructive actions. Text is a verb in sentence case; arrows only for navigation.">
              <Spec>
                <div className="ds2-states">
                  {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
                    <div key={v} className="ds2-state-row">
                      <span className="ld-label" style={{ width: 90 }}>
                        {v[0].toUpperCase() + v.slice(1)}
                      </span>
                      <State label="Default">
                        <Ld.Button variant={v}>{v === "danger" ? "Discard draft" : v === "ghost" ? "Inspect" : v === "secondary" ? "Present" : "Step through"}</Ld.Button>
                      </State>
                      <State label="Hover">
                        <Ld.Button variant={v} state="hover">
                          {v === "danger" ? "Discard draft" : v === "ghost" ? "Inspect" : v === "secondary" ? "Present" : "Step through"}
                        </Ld.Button>
                      </State>
                      <State label="Focus">
                        <Ld.Button variant={v} state="focus">
                          {v === "danger" ? "Discard draft" : v === "ghost" ? "Inspect" : v === "secondary" ? "Present" : "Step through"}
                        </Ld.Button>
                      </State>
                      <State label="Disabled">
                        <Ld.Button variant={v} disabled>
                          {v === "danger" ? "Discard draft" : v === "ghost" ? "Inspect" : v === "secondary" ? "Present" : "Step through"}
                        </Ld.Button>
                      </State>
                    </div>
                  ))}
                  <div className="ds2-state-row">
                    <span className="ld-label" style={{ width: 90 }}>
                      Sizes
                    </span>
                    <State label="Small · 28">
                      <Ld.Button size="sm">Verify</Ld.Button>
                    </State>
                    <State label="Medium · 32">
                      <Ld.Button>Verify</Ld.Button>
                    </State>
                    <State label="Large · 40">
                      <Ld.Button size="lg">Watch the guided replay</Ld.Button>
                    </State>
                  </div>
                </div>
              </Spec>
              <p className="ld-caption">Glyphs: no icon set. Allowed marks are the provenance glyphs, ✓ and ✕ in status, → for navigation, ▾ for menus and keyboard keys.</p>
            </Doc>

            <Doc id="forms" title="Form controls" usage="Used by the synthetic campaign draft. Labels above fields, hints below, errors in danger with the rule that failed. Limits mirror the exchange's own campaign validation.">
              <div className="ld-cols-2">
                <Spec>
                  <div className="ld-stack">
                    <Ld.Field label="Business name" hint="Up to 400 characters. Fictional only.">
                      <input className="ld-input" defaultValue={run.campaigns[0].businessName} />
                    </Ld.Field>
                    <Ld.Field label="Max bid (base units)" hint="Whole base units, at most 4,000 (0.004 test USDC).">
                      <input className="ld-input is-focus" defaultValue={run.campaigns[0].maxBidBaseUnits} />
                    </Ld.Field>
                    <Ld.Field label="Budget cap (base units)" error="At most 8,000 base units.">
                      <input className="ld-input" aria-invalid="true" defaultValue="9000" />
                    </Ld.Field>
                    <Ld.Field label="Destination" hint="Shown as text, never linked.">
                      <input className="ld-input" disabled defaultValue={run.campaigns[0].creative.destinationURL} />
                    </Ld.Field>
                  </div>
                </Spec>
                <Spec>
                  <div className="ld-stack">
                    <Ld.Field label="Creative" hint={`${run.campaigns[0].creative.approvedText.length} of 800 characters`}>
                      <textarea className="ld-textarea" defaultValue={run.campaigns[0].creative.approvedText} />
                    </Ld.Field>
                    <Ld.Field label="Coarse intent">
                      <select className="ld-select" defaultValue="crypto_wallet_tools">
                        <option value="crypto_wallet_tools">crypto_wallet_tools</option>
                      </select>
                    </Ld.Field>
                    <div className="ld-row" style={{ gap: 18 }}>
                      <Ld.Toggle label="Funded channel" initial />
                      <Ld.Toggle label="Paused" />
                      <Ld.Toggle label="Edit the recorded run" disabled />
                    </div>
                    <div className="ld-row" style={{ gap: 14 }}>
                      {run.campaigns[0].declaredConstraints.slice(0, 3).map((c) => (
                        <Ld.Checkbox key={c} label={c.replace(/_/g, " ")} initial />
                      ))}
                      <Ld.Checkbox label="mobile software wallet" />
                    </div>
                  </div>
                </Spec>
              </div>
            </Doc>

            <Doc id="tabs" title="Tabs and segmented control" usage="Tabs switch between views of the same object; the selected tab carries a 2 px ultramarine rule. Segmented controls switch a mode inside a panel.">
              <div className="ld-cols-2">
                <Spec>
                  <Ld.Tabs
                    label="Evidence by campaign"
                    tabs={run.campaigns.map((c) => ({
                      key: c.campaignId,
                      label: c.businessName,
                      count: decisionFor(o1, c.campaignId, "history")?.retrieval?.examples.length ?? 0,
                      panel: <p className="ld-secondary">{decisionFor(o1, c.campaignId, "history")?.retrieval?.examples.length} observed example(s) in {c.businessName}'s packet for opportunity 1.</p>,
                    }))}
                  />
                </Spec>
                <Spec>
                  <div className="ld-stack">
                    <Ld.Segmented label="Arm" options={["With history", "Baseline"]} />
                    <Ld.Segmented label="Units" options={["Test USDC", "Base units"]} initial={0} />
                  </div>
                </Spec>
              </div>
            </Doc>

            <Doc id="nav" title="Navigation" usage="Sidebar sections with counts; the current page is an ultramarine wash. Opportunities expand into short names, never truncated questions. The top bar holds the run switcher and scope, the only persistent chrome.">
              <Spec canvas pad={false}>
                <div className="ds2-shellpreview">
                  <Ld.TopBar
                    style={{ position: "relative" }}
                    brand={<Ld.Wordmark href="#nav" Link={L} />}
                    run={<Ld.RunSwitcher runId={run.source.runId} note="Recorded replay · hosted Solana sandbox · test USDC" open />}
                    chips={
                      <>
                        <Ld.Pv kind="replay" />
                        <Ld.Pv kind="settled" label="Hosted Solana sandbox" />
                        <Ld.Pv kind="fictional" label="Fictional advertisers" />
                      </>
                    }
                    actions={
                      <>
                        <Ld.Button variant="secondary">Present</Ld.Button>
                        <Ld.Button>Verify</Ld.Button>
                      </>
                    }
                  />
                  <div className="ds2-shellpreview-body">
                    <Ld.SideNav style={{ position: "relative", top: 0, height: "auto" }} groups={navGroups("o1")} foot="Story order. The mobile question ran first on the exchange clock." Link={L} />
                    <div className="ld-stack" style={{ padding: 20 }}>
                      <Ld.PageBar
                        crumbs={<Ld.Breadcrumbs items={[{ label: "Opportunities", href: "#nav" }, { label: "1" }]} Link={L} />}
                        title={shortLabel(o1)}
                        meta={<Ld.Tag tone="brand">Tie-break</Ld.Tag>}
                        sub={`“${o1.question}”`}
                        actions={
                          <>
                            <Ld.Button variant="secondary">Inspect</Ld.Button>
                            <Ld.Button>Step through</Ld.Button>
                          </>
                        }
                      />
                    </div>
                  </div>
                </div>
              </Spec>
            </Doc>

            <Doc id="kpi" title="KPI tiles" usage="A label, one number in Wide, and one line of context. Context explains the number instead of a percentage delta: there is one run, so there is no period to compare with. The live tile is computed in the reader's browser.">
              <Spec canvas>{kpis}</Spec>
              <Spec canvas>
                <div className="ld-kpis">
                  <Ld.Kpi label="Clearing prices" value={rows.filter((r) => r.price).map((r) => r.price).join(" · ")} context="Opportunities 1, 2, 3" />
                  <Ld.Kpi label="Calls per opportunity" value="6 · 6 · 3 · 0" context="Paired arms, repeat, no fill" spark={<Ld.Sparkline values={[6, 6, 3, 0]} label="Calls per opportunity: 6, 6, 3, 0" />} />
                  <Ld.Kpi label="Fees and new rent" value={(Number(run.fees.grossFeeAndRentLamports) / 1e6).toFixed(2) + "M"} context={`lamports, cap ${(Number(run.fees.capLamports) / 1e6).toFixed(0)}M`} chip={<Ld.Tag tone="success" dot>Within cap</Ld.Tag>} />
                </div>
              </Spec>
            </Doc>

            <Doc id="panels" title="Panels" usage="The unit of a dashboard: a title, an optional subtitle and actions, a body, an optional footer for source and scope. Panels sit on the canvas with 16 px gaps.">
              <div className="ld-cols-2">
                <Ld.Panel title="Channel ClearVault" sub={cv.channelId} actions={<Ld.Button variant="ghost" size="sm">Inspect</Ld.Button>} foot={<><span>Hosted Solana sandbox · finalized</span><span>Test USDC</span></>}>
                  <div className="ld-stack">
                    <Ld.BalanceBar
                      total={Number(cv.depositBaseUnits)}
                      legend
                      segments={[
                        ...cv.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Charge ${v.sequence} ${usdc(v.incrementBaseUnits)}` })),
                        { key: "r", value: Number(cv.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(cv.refundBaseUnits)}` },
                      ]}
                    />
                  </div>
                </Ld.Panel>
                <Ld.Panel title="Opportunity 4" sub="Mobile-only wallets" raised actions={<Ld.Tag tone="dashed">No fill</Ld.Tag>}>
                  <p className="ld-secondary">Every campaign was missing mobile_software_wallet. No agent was called; the app still answered in full.</p>
                </Ld.Panel>
              </div>
            </Doc>

            <Doc id="tables" title="Data tables" usage="Sticky sunken header, 1 px row rules, hover in the hover surface, selection as an ultramarine wash with a left rule. Numbers right-aligned with tabular figures. Status cells use tags; progress cells use meters.">
              <Ld.Panel title="Auctions" sub="Story order" flush>
                <Ld.Table
                  rowProps={(_, i) => ({ selected: i === 0, hover: i === 2 })}
                  columns={[
                    { key: "n", head: "#", cell: (r: (typeof rows)[number]) => <span className="ld-faint">{r.o.n}</span>, width: "40px" },
                    { key: "q", head: "Opportunity", sort: true, cell: (r) => <span className="ld-strong">{r.label}</span> },
                    { key: "req", head: "Required", cell: (r) => <span className="ld-row" style={{ gap: 4 }}>{r.required.map((c) => <Ld.Tag key={c} tone="outline">{c}</Ld.Tag>)}</span> },
                    { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible} of 3` },
                    { key: "b", head: "Bidders", num: true, cell: (r) => r.bidders },
                    { key: "p", head: "Price", num: true, sort: "desc", cell: (r) => (r.price ? <span className="ld-strong">{r.price}</span> : <span className="ld-faint">none</span>) },
                    { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">none</span> },
                    { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
                  ]}
                  rows={rows}
                />
              </Ld.Panel>
              <Ld.Panel title="Campaigns" flush>
                <Ld.Table
                  columns={[
                    { key: "c", head: "Campaign", cell: (s: (typeof stats)[number]) => <span className="ld-row" style={{ gap: 10 }}><span className="ld-avatar" data-tone={s.funded ? undefined : "muted"} style={{ width: 26, height: 26, fontSize: 12, borderRadius: 6 }}>{s.c.businessName[0]}</span><span className="ld-strong">{s.c.businessName}</span></span> },
                    { key: "s", head: "Status", cell: (s) => (s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>) },
                    { key: "e", head: "Eligible", num: true, cell: (s) => `${s.eligible} of 4` },
                    { key: "b", head: "Bids", num: true, cell: (s) => s.bids },
                    { key: "w", head: "Wins", num: true, cell: (s) => s.wins },
                    { key: "sp", head: "Spend vs cap", cell: (s) => <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)}`} /> },
                    { key: "r", head: "Returned at close", num: true, cell: (s) => (s.funded ? usdc(s.remaining) : <span className="ld-faint">none</span>) },
                  ]}
                  rows={stats}
                />
              </Ld.Panel>
            </Doc>

            <Doc id="tags" title="Tags and status" usage="Pills: 22 px, 12 px Median. Outcome tags in brand for filled, warning for a cap, dashed for no fill. Status uses semantic colours with a dot and a word. Never colour alone.">
              <Spec>
                <div className="ld-stack">
                  <div className="ld-row">
                    <Ld.Tag tone="brand">Filled</Ld.Tag>
                    <Ld.Tag tone="brand">Tie-break</Ld.Tag>
                    <Ld.Tag tone="warning">Frequency cap</Ld.Tag>
                    <Ld.Tag tone="dashed">No fill</Ld.Tag>
                    <Ld.Tag tone="solid">Winner</Ld.Tag>
                    <Ld.Tag tone="outline">crypto_storage</Ld.Tag>
                  </div>
                  <div className="ld-row">
                    <Ld.Tag tone="success" dot>Finalized</Ld.Tag>
                    <Ld.Tag tone="success" dot>Signature valid</Ld.Tag>
                    <Ld.Tag tone="warning" dot>Ed25519 unsupported here</Ld.Tag>
                    <Ld.Tag tone="danger" dot>Hash mismatch</Ld.Tag>
                    <Ld.Tag dot>Recorded hash only</Ld.Tag>
                    <Ld.Tag tone="ch" dot>Observed</Ld.Tag>
                  </div>
                </div>
              </Spec>
            </Doc>

            <Doc id="marks" title="Provenance and money" usage="Provenance pills keep the shape glyph and the word from the foundation, restyled as product pills. Money states keep their fill patterns; reserved, accepted and authorized are ultramarine, settled is ink.">
              <div className="ld-cols-2">
                <Spec label="Provenance">
                  <div className="ds2-list">
                    {(Object.keys(PROVENANCE) as ProvenanceKind[]).map((k) => (
                      <div key={k} className="ds2-list-row">
                        <Ld.Pv kind={k} />
                        <span className="ld-caption">{PROVENANCE[k].meaning}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="Money states, with this run's amounts">
                  <div className="ds2-list">
                    {[
                      ["deposit", `${usdc(cv.depositBaseUnits)} locked when ClearVault's channel opened`],
                      ["reserved", `${usdc(o1.award!.priceBaseUnits)} award on opportunity 1, before delivery`],
                      ["accepted", `${usdc(o1.charge!.amountBaseUnits)} charge after the signed receipt`],
                      ["authorized", `${usdc(cv.authorizedBaseUnits)} cumulative: voucher 2 replaces voucher 1`],
                      ["settled", `${usdc(cv.settledBaseUnits)} paid to the publisher at close`],
                      ["refunded", `${usdc(cv.refundBaseUnits)} returned to the payer at close`],
                      ["pending", "LeatherGuard's channel, never opened"],
                    ].map(([s, l]) => (
                      <div key={s} className="ds2-list-row">
                        <Ld.Money state={s as "deposit"} />
                        <span className="ld-caption">{l}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
              </div>
            </Doc>

            <Doc id="overlays" title="Tooltip, popover, modal" usage="Tooltips explain a term or a mark in one or two lines. Popovers hold a small panel of detail anchored to its trigger. Modals are rare: they confirm something that cannot be undone, which this read-only explorer never needs except in the synthetic draft.">
              <div className="ld-cols-3">
                <Spec label="Tooltip">
                  <div style={{ paddingTop: 64 }}>
                    <Ld.Tooltip open tip="Each voucher states the total owed so far. Voucher 2 at 0.007 replaces voucher 1 at 0.004.">
                      <span className="ld-link" style={{ borderBottom: "1px dotted currentColor" }}>
                        cumulative authorization
                      </span>
                    </Ld.Tooltip>
                  </div>
                </Spec>
                <Spec label="Popover">
                  <div className="ld-pop-card is-static">
                    <span className="ld-card-title">Frequency cap</span>
                    <span className="ld-secondary">ClearVault was already placed twice in this session (2 of 2). Its agent said bid; the exchange did not admit it.</span>
                    <span className="ld-row">
                      <Ld.Tag tone="warning">Rule, not the agent</Ld.Tag>
                    </span>
                  </div>
                </Spec>
                <Spec label="Modal" canvas>
                  <Ld.Modal
                    title="Discard this synthetic draft?"
                    actions={
                      <>
                        <Ld.Button variant="secondary">Keep editing</Ld.Button>
                        <Ld.Button variant="danger">Discard draft</Ld.Button>
                      </>
                    }
                  >
                    <p className="ld-secondary">It only ever lived in this browser. Nothing in the recorded run changes.</p>
                  </Ld.Modal>
                </Spec>
              </div>
            </Doc>

            <Doc id="inspector" title="Inspector drawer" usage="Detail on demand: the record's title, its path in run.json, every hash marked recomputable or recorded only, and the raw JSON. Opens from any Inspect action and from ?inspect= links; Esc closes.">
              <Spec canvas>
                <DrawerDemo />
              </Spec>
            </Doc>

            <Doc id="empty" title="Empty and no-fill states" usage="Say what did not happen and why, in plain words. A no-fill is never an empty ad box: the app's answer stands and the slot carries a quiet note.">
              <div className="ld-cols-2">
                <Ld.Empty title="Steps 3 to 9 did not run" action={<Ld.Button variant="secondary" size="sm">See eligibility</Ld.Button>}>
                  No agent was called for opportunity 4 (0 calls). No auction, award, receipt or charge.
                </Ld.Empty>
                <Ld.ChatSpecimen
                  app={run.publisher.displayName}
                  question={o4.question}
                  meta={<><Ld.Pv kind="actual" /> <span className="ld-mono">{o4.organic.model}</span></>}
                  answer={o4.organic.answer}
                  slot={
                    <div className="ld-nofill">
                      <Ld.Pv kind="policy" label="No fill" /> No sponsored placement for this turn
                    </div>
                  }
                />
              </div>
            </Doc>

            <Doc id="toast" title="Toasts and keyboard" usage="Toasts confirm a local action, for example a copied hash; they never announce work that did not happen. Keyboard hints sit next to the control they drive.">
              <div className="ld-cols-2">
                <Spec canvas>
                  <div className="ld-stack">
                    <Ld.Toast title="Receipt hash copied" sub={`${o1.receipt!.receiptHash.slice(0, 20)}…`} />
                    <Ld.Toast title="48 of 48 checks passed in this browser" sub="Hashes, Ed25519 signatures, sums" />
                  </div>
                </Spec>
                <Spec>
                  <div className="ld-stack">
                    {[
                      [["J", "K"], "Next or previous pipeline stage"],
                      [["I"], "Open the inspector"],
                      [["Esc"], "Close the inspector, leave step-through"],
                      [["→", "Space"], "Next beat in Present"],
                    ].map(([k, l]) => (
                      <span key={String(l)} className="ld-row">
                        {(k as string[]).map((x) => (
                          <Ld.Key key={x}>{x}</Ld.Key>
                        ))}
                        <span className="ld-secondary">{l as string}</span>
                      </span>
                    ))}
                  </div>
                </Spec>
              </div>
            </Doc>

            {/* ---------------- Product ---------------- */}
            <Doc id="pipeline" title="Pipeline stepper" usage="The spine of an opportunity: nine stages from the moment to the charge, each with its recorded result. The current stage is ultramarine; finished stages are ink; stages that did not run are hollow and say so.">
              <DesignPipelineDemo stagesFilled={pipeStages(o1)} stagesNoFill={pipeStages(o4)} />
            </Doc>

            <Doc id="ruler" title="Score ruler" usage="Agents answer in levels, and a level is the rounded score. The ruler draws the 2.5 line so a move from 2.38 to 2.52 reads as what it is: one observation crossing a rounding line, not a measured lift.">
              <div className="ld-cols-2">
                <Ld.Panel title="ClearVault · intent" sub="Opportunity 1 · level 2 to 3" actions={<Ld.Tag tone="brand">Level changed</Ld.Tag>}>
                  <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} marks={[{ value: cvB.scores.intent, kind: "baseline", label: "Baseline" }, { value: cvH.scores.intent, kind: "history", label: "With history" }]} />
                  <p className="ld-secondary" style={{ marginTop: 10 }}>
                    With history, ClearVault's intent score moved {cvB.scores.intent.toFixed(2)} to {cvH.scores.intent.toFixed(2)}, crossing the 2.5 rounding line: level {cvB.commercialIntentLevel} to {cvH.commercialIntentLevel}. Relevance and bid/skip stayed the same. One observation per arm; not a measured lift.
                  </p>
                </Ld.Panel>
                <Ld.Panel title="KeyForge · intent" sub="Opportunity 3 · just under the line" actions={<Ld.Tag>Level {kfR.commercialIntentLevel}</Ld.Tag>}>
                  <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} marks={[{ value: kfR.scores.intent, kind: "history", label: "With history" }]} />
                  <p className="ld-secondary" style={{ marginTop: 10 }}>
                    KeyForge's intent score was {kfR.scores.intent.toFixed(2)}, just under the 2.5 line: level {kfR.commercialIntentLevel}, so the bid table gives 75% of its max bid.
                  </p>
                </Ld.Panel>
              </div>
            </Doc>

            <Doc id="bids" title="Bid chart" usage="One axis from zero to the max bid. The winner is ultramarine, other bids neutral, campaigns that could not bid are listed with the reason instead of a bar. The floor is a thin rule.">
              <div className="ld-cols-2">
                <Ld.Panel title="Opportunity 1" sub="Equal bids; tie goes to the lower campaign ID" actions={<Ld.Tag tone="brand">Tie-break</Ld.Tag>}>
                  <Ld.BidBars
                    max={max}
                    floor={Number(o1.floorBaseUnits)}
                    format={fmt}
                    rows={run.campaigns.map((c) => {
                      const b = o1.auction.bids.find((x) => x.campaignId === c.campaignId);
                      return { key: c.campaignId, label: c.businessName, sub: b ? `levels ${b.levels}` : "excluded by rule", value: b ? Number(b.amountBaseUnits) : null, winner: c.campaignId === o1.award!.campaignId, note: "Missing crypto_storage" };
                    })}
                  />
                </Ld.Panel>
                <Ld.Panel title="Opportunity 3" sub="ClearVault capped; KeyForge sole bidder" actions={<Ld.Tag tone="warning">Frequency cap</Ld.Tag>}>
                  <Ld.BidBars
                    max={max}
                    floor={Number(o3.floorBaseUnits)}
                    format={fmt}
                    rows={run.campaigns.map((c) => {
                      const b = o3.auction.bids.find((x) => x.campaignId === c.campaignId);
                      const capped = o3.auction.notAdmitted.some((x) => x.campaignId === c.campaignId);
                      return { key: c.campaignId, label: c.businessName, sub: b ? `levels ${b.levels}` : capped ? "agent said bid" : "excluded by rule", value: b ? Number(b.amountBaseUnits) : null, winner: c.campaignId === o3.award!.campaignId, note: capped ? "Not admitted: frequency cap" : "Missing crypto_storage" };
                    })}
                  />
                </Ld.Panel>
              </div>
            </Doc>

            <Doc id="cumulative" title="Cumulative chart" usage="Vouchers state totals, so the authorization line steps up; it never stacks a second line on top. The cap is a gridline with its value.">
              <div className="ld-cols-2">
                {[cv, kf].map((ch) => (
                  <Ld.Panel key={ch.channelId} title={`${nameOf(ch.campaignId)} vouchers`} sub="Cumulative authorization, test USDC">
                    <Ld.StepChart max={Number(run.campaigns.find((c) => c.campaignId === ch.campaignId)!.budgetCapBaseUnits)} format={fmt} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `#${v.sequence} · opp ${v.opportunityN}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
                  </Ld.Panel>
                ))}
              </div>
            </Doc>

            <Doc id="meters" title="Sparklines and meters" usage="Small, quiet, labelled. A sparkline shows shape; the number beside it carries the value. Meters show a part of a whole with the whole written out.">
              <div className="ld-cols-3">
                <Spec label="Sparkline">
                  <span className="ld-row" style={{ gap: 12 }}>
                    <Ld.Sparkline values={o1.decisions.map((d) => Math.round(d.elapsedMs))} label="Decision latency, opportunity 1" />
                    <span className="ld-secondary">Decision time per call, opportunity 1 (recorded ms)</span>
                  </span>
                </Spec>
                <Spec label="Spend vs cap">
                  <div className="ld-stack">
                    {stats.map((s) => (
                      <span key={s.c.campaignId} className="ld-stack" style={{ gap: 4 }}>
                        <span className="ld-label">{s.c.businessName}</span>
                        <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)}`} />
                      </span>
                    ))}
                  </div>
                </Spec>
                <Spec label="Calls used">
                  <Ld.Progress value={run.model.completedCalls} max={run.model.maxCalls} tone="ink" label={`${run.model.completedCalls} of ${run.model.maxCalls} allowed calls`} />
                </Spec>
              </div>
            </Doc>

            <Doc id="activity" title="Activity" usage="The exchange log on the exchange clock only; sandbox block times never share this axis. Long idle gaps are broken and labelled rather than squeezed. Charges carry the emphasis.">
              <Ld.Panel title="Run activity" sub="Exchange clock, UTC · story order differs: the mobile question ran first">
                <Ld.ActivityChart lanes={activityLanes()} segments={activitySegments()} fmt={hhmm} gapLabel={activityGapLabel()} />
              </Ld.Panel>
              <Ld.Panel title="Opportunity 3 events" sub="Exchange clock">
                <Ld.Timeline
                  rows={run.events
                    .filter((e) => e.turnId === o3.turnId && e.seq >= 29)
                    .map((e) => ({ key: String(e.seq), time: new Date(e.at).toISOString().slice(11, 19), what: e.type.replace(/_/g, " "), detail: `event ${e.seq}`, tone: e.type === "charge_accepted" ? ("brand" as const) : ("ink" as const) }))}
                />
              </Ld.Panel>
            </Doc>

            <Doc id="balance" title="Channel balance" usage="A deposit split into what was paid and what came back, segment by segment with 2 px gaps. Paid is ink (settled); refunds are outlined.">
              <div className="ld-cols-2">
                {[cv, kf].map((ch) => (
                  <Ld.Panel key={ch.channelId} title={nameOf(ch.campaignId)} sub={`Deposit ${usdc(ch.depositBaseUnits)} test USDC`} actions={<Ld.Tag tone="success" dot>Finalized</Ld.Tag>}>
                    <Ld.BalanceBar
                      total={Number(ch.depositBaseUnits)}
                      legend
                      segments={[
                        ...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid #${v.sequence} ${usdc(v.incrementBaseUnits)}` })),
                        { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` },
                      ]}
                    />
                  </Ld.Panel>
                ))}
              </div>
            </Doc>

            <Doc id="chat" title="Chat specimen" usage="A depiction of the publisher's app, so it uses the large radius. The answer and the Sponsored card are separate; the card carries an ultramarine frame and its Sponsored label.">
              <div className="ld-cols-2">
                <Ld.ChatSpecimen app={run.publisher.displayName} question={o1.question} meta={<><Ld.Pv kind="actual" /> <span className="ld-mono">{o1.organic.model}</span> <span>no advertiser material</span></>} answer={o1.organic.answer} slot={<Ld.SponsoredCard text={o1.award!.creative.approvedText} advertiser={nameOf(o1.award!.campaignId)} url={o1.award!.creative.destinationURL} />} />
                <Ld.ChatSpecimen app={run.publisher.displayName} question={o2.question} meta={<><Ld.Pv kind="actual" /> <span className="ld-mono">{o2.organic.model}</span></>} answer={o2.organic.answer} slot={<div className="ld-await">Sponsored slot, awaiting auction</div>} />
              </div>
            </Doc>

            <Doc id="receipt" title="Receipt card" usage="The publisher's signed statement: key fields, then checks computed in the reader's browser. The caption keeps the claim honest.">
              <div className="ld-cols-2">
                <Ld.ReceiptCard
                  title="Publisher receipt · opportunity 1"
                  keyId={o1.receipt!.fields.publisherKeyId}
                  rows={[
                    { k: "Award", v: o1.receipt!.fields.awardId },
                    { k: "Creative hash", v: `${o1.receipt!.fields.creativeHash.slice(0, 24)}…` },
                    { k: "Acknowledgement", v: `${o1.receipt!.fields.renderAcknowledgementHash.slice(0, 24)}…` },
                    { k: "Publisher", v: `${o1.receipt!.fields.publisherId} (legacy ID)` },
                  ]}
                  checks={
                    <>
                      <LiveHashV2 value={o1.receipt!.fields} expected={o1.receipt!.receiptHash} label="Receipt hash recomputed here" />
                      <LiveSignatureV2 fields={o1.receipt!.fields} signature={o1.receipt!.signature} pem={run.publisher.publicKeyPEM} />
                    </>
                  }
                  caption="Proves the app's assertion that it inserted a labelled card, not that a person read it."
                />
                <div className="ld-stack">
                  <Ld.Panel title="Award, delivery, charge" sub="Opportunity 1">
                    <div className="ds2-flow">
                      <div>
                        <Ld.Money state="reserved" label="Award" />
                        <span className="ld-kpi-num" style={{ fontSize: 22 }}>{usdc(o1.award!.priceBaseUnits)}</span>
                        <span className="ld-caption">Reserved, not owed</span>
                      </div>
                      <div>
                        <Ld.Money state="accepted" label="Charge" />
                        <span className="ld-kpi-num" style={{ fontSize: 22 }}>{usdc(o1.charge!.amountBaseUnits)}</span>
                        <span className="ld-caption">+{(o1.delivery!.msAfterAward / 1000).toFixed(1)} s, after the receipt</span>
                      </div>
                      <div>
                        <Ld.Money state="authorized" label="Voucher 1" />
                        <span className="ld-kpi-num" style={{ fontSize: 22 }}>{usdc(o1.voucher!.cumulativeAmountBaseUnits)}</span>
                        <span className="ld-caption">Cumulative, off chain</span>
                      </div>
                    </div>
                  </Ld.Panel>
                </div>
              </div>
            </Doc>

            <Doc id="evidence" title="Evidence card" usage="ContextHint's vermillion marks the evidence; similarity is a bar with its method named (cosine for stored vectors, overlap for the lexical fallback). Real brands are labelled as past observations.">
              <div className="ld-cols-2">
                <Ld.EvidenceCard
                  prompt={mercari.promptText}
                  advertiser={mercari.advertiser}
                  creative={mercari.creativeText}
                  sim={1}
                  method="vector"
                  hint={
                    <div className="ld-stack" style={{ gap: 4 }}>
                      <Ld.Pv kind="inferred" label={`Inferred hint · tier ${hint.tier}`} />
                      <span className="ld-secondary">{hint.text}</span>
                    </div>
                  }
                />
                <Ld.EvidenceCard prompt={ariat.promptText} advertiser={ariat.advertiser} creative={ariat.creativeText} sim={lgH.retrieval!.examples[0].similarity} method="vector" hint={<span className="ld-secondary">In LeatherGuard's packet: the word “wallet” is ambiguous. Evidence cannot add a capability.</span>} />
              </div>
            </Doc>

            <Doc id="campaign" title="Campaign header" usage="Ad-platform style: a monogram, the name, status and the fictional mark, then the campaign's own numbers.">
              <div className="ld-stack">
                {stats.map((s) => (
                  <Ld.CampaignHeader
                    key={s.c.campaignId}
                    initial={s.c.businessName[0]}
                    muted={!s.funded}
                    name={s.c.businessName}
                    status={
                      <>
                        {s.funded ? <Ld.Tag tone="success" dot>Active</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>}
                        <Ld.Pv kind="fictional" />
                      </>
                    }
                    kpis={
                      <>
                        <span className="ld-secondary">
                          Spend <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{usdc(s.spend)}</b> of {usdc(s.cap)}
                        </span>
                        <span className="ld-secondary">
                          Wins <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{s.wins}</b>
                        </span>
                        <span className="ld-secondary">
                          Agent calls <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{s.calls}</b>
                        </span>
                        <span style={{ width: 160 }}>
                          <Ld.Progress value={s.spend} max={s.cap} />
                        </span>
                      </>
                    }
                    actions={<Ld.Button variant="secondary" size="sm">Open campaign</Ld.Button>}
                  />
                ))}
              </div>
            </Doc>

            {/* ---------------- Rules ---------------- */}
            <Doc id="dataviz" title="Data visualization rules" usage="Charts in Ledger answer one question each and sit next to the values they encode.">
              <div className="ld-cols-2">
                {[
                  ["One axis, from zero", "Bars start at zero on a shared scale; never two y-axes. Money in test USDC and fees in lamports are separate charts."],
                  ["Emphasis is ultramarine", "The selected or winning mark is ultramarine; everything else is the neutral context colour. A second hue is reserved for ContextHint evidence."],
                  ["Thin marks, quiet grid", "Bars 16 px with a 4 px rounded end, 2 px lines, 8 to 12 px markers with a surface ring, 1 px solid gridlines."],
                  ["Label sparingly", "Value at the bar end and on the line's points; axis text in captions; text never wears the series colour."],
                  ["Hover and table", "Every mark has a hover title; every chart has the same values in a table or labels on the page."],
                  ["Honest time", "The exchange clock and the sandbox chain clock never share an axis. Idle gaps are broken and labelled, never compressed silently."],
                ].map(([h, b]) => (
                  <Ld.Panel key={h} title={h}>
                    <p className="ld-secondary">{b}</p>
                  </Ld.Panel>
                ))}
              </div>
            </Doc>

            <Doc id="present" title="Present mode" usage="The video source. A 1920 × 1080 stage scaled to the window; product surfaces at 1.25×, captions on the ultramarine night bar, beat ticks in stage ultramarine. Keyboard driven; autoplay with ?auto=1.">
              <div className="ld-present-demo">
                <div className="ld-present-top">
                  <Ld.Wordmark href="/present/" Link={L} />
                  <span className="ld-label" style={{ color: "var(--brand-deep)" }}>
                    6 / 10
                  </span>
                  <span className="ld-card-title">Code sets the price</span>
                  <span style={{ marginLeft: "auto" }}>
                    <Ld.Pv kind="replay" />
                  </span>
                </div>
                <div style={{ padding: "24px 40px", display: "grid", alignContent: "center", zoom: 1.25 }}>
                  <Ld.BidBars max={max} floor={Number(o1.floorBaseUnits)} format={fmt} rows={o1.auction.bids.map((b) => ({ key: b.campaignId, label: nameOf(b.campaignId), sub: `levels ${b.levels}`, value: Number(b.amountBaseUnits), winner: b.campaignId === o1.award!.campaignId }))} />
                </div>
                <div className="ld-present-cap">
                  <span>Code, not the model, sets the bid: 100% of the 0.004 max at levels 3 and 3. A tie goes to the lower campaign ID.</span>
                  <span className="ld-present-ticks">
                    {Array.from({ length: 10 }, (_, i) => (
                      <i key={i} data-on={i === 5 || undefined} data-done={i < 5 || undefined} />
                    ))}
                  </span>
                </div>
              </div>
              <div className="ld-row" style={{ gap: 18 }}>
                <span className="ld-caption">Stage --stage #0a0e2a · caption 22 px on 120 px bar · ticks --stage-brand #6573ff · frame scale 1.25</span>
                <Link href="/present/" className="ld-link">
                  Open Present mode →
                </Link>
              </div>
            </Doc>

            <Doc id="composition" title="Composition" usage="How the pieces combine on the redesigned overview: KPIs, the auctions table, a chart and the latest delivery. This is the target for the dashboard screens, built only from the components above.">
              <div className="ds2-composition">
                <Ld.TopBar
                  style={{ position: "relative" }}
                  brand={<Ld.Wordmark href="#composition" Link={L} />}
                  run={<Ld.RunSwitcher runId={run.source.runId} note="Recorded replay" />}
                  chips={
                    <>
                      <Ld.Pv kind="replay" />
                      <Ld.Pv kind="settled" label="Hosted Solana sandbox" />
                      <Ld.Tag>Test USDC</Ld.Tag>
                      <Ld.Pv kind="fictional" label="Fictional advertisers" />
                    </>
                  }
                  actions={
                    <>
                      <Ld.Button variant="secondary">Present</Ld.Button>
                      <Ld.Button>Verify</Ld.Button>
                    </>
                  }
                />
                <div className="ds2-shellpreview-body">
                  <Ld.SideNav style={{ position: "relative", top: 0, height: "auto" }} groups={navGroups("overview")} Link={L} />
                  <div className="ld-stack" style={{ padding: 20, gap: 16, background: "var(--ld-canvas)" }}>
                    <Ld.PageBar title="Overview" sub="One recorded run of an ad exchange inside an AI app. Nothing re-executes." actions={<><Ld.Button variant="secondary">Step through opportunity 1</Ld.Button><Ld.Button>Watch the replay</Ld.Button></>} />
                    {kpis}
                    <div className="ds2-comp-grid">
                      <Ld.Panel title="Auctions" sub="Story order" flush actions={<Ld.Button variant="ghost" size="sm">All opportunities</Ld.Button>}>
                        <Ld.Table
                          columns={[
                            { key: "q", head: "Opportunity", cell: (r: (typeof rows)[number]) => <span className="ld-row" style={{ gap: 8 }}><span className="ld-faint">{r.o.n}</span><span className="ld-strong">{r.label}</span></span> },
                            { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible}/3` },
                            { key: "p", head: "Price", num: true, cell: (r) => r.price ?? <span className="ld-faint">none</span> },
                            { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
                          ]}
                          rows={rows}
                        />
                      </Ld.Panel>
                      <Ld.Panel title="Latest delivery" sub="Opportunity 3 · KeyForge">
                        <Ld.SponsoredCard text={o3.award!.creative.approvedText} advertiser={nameOf(o3.award!.campaignId)} url={o3.award!.creative.destinationURL} />
                      </Ld.Panel>
                    </div>
                    <Ld.Panel title="Run activity" sub="Exchange clock, UTC">
                      <Ld.ActivityChart lanes={activityLanes()} segments={activitySegments()} fmt={hhmm} gapLabel={activityGapLabel()} />
                    </Ld.Panel>
                  </div>
                </div>
              </div>
            </Doc>

            <footer className="ds2-foot">
              <span className="ld-caption">
                Ledger v2 · tokens and rules in docs/frontend/LEDGER_SYSTEM.md · every example uses run {run.source.runId}. <Link className="ld-link" href="/design/v1/">Ledger v1 archive</Link>
              </span>
            </footer>
          </main>
        </div>
      </div>
    </InspectorProvider>
  );
}
