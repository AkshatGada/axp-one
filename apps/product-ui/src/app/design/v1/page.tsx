import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Amount,
  AwaitingSlot,
  Button,
  Callout,
  CapabilityChips,
  CheckMark,
  Chip,
  CopyHash,
  DataTable,
  InspectorDrawer,
  InspectorProvider,
  KeyHint,
  KeyValue,
  Lamports,
  LedgerTimeline,
  MethodBadge,
  MoneyStateMark,
  NumberStrip,
  ObservedRecord,
  InferredHint,
  Provenance,
  RunSpine,
  ScopeBar,
  ScopeChip,
  StatusStamp,
  Step,
  StepRail,
  Term,
  NotAdmittedStamp,
  NoFillSlot,
  ScoreRuler,
  ArmDiff,
  VerifyRow,
  Wordmark,
  Handoff,
} from "@axp/design-system/ledger";
import { PROVENANCE, type ProvenanceKind } from "@axp/design-system/foundation";
import { campaign, decisionFor, evidenceHint, evidenceRecord, fmtUtc, nameOf, opportunity, outcomeLine, run, usdc } from "@/data/select";
import {
  AppSpecimen,
  ArmDiffs,
  AuctionStep,
  AwardStep,
  ChargeStep,
  DecisionsGrid,
  DeliveryStep,
  EligibilityStep,
  EvidencePanel,
  IntentRuler,
  ReceiptStep,
  SimilarityLabel,
  WinnerCard,
  armDiffSentence,
  inspect,
} from "@/components/opportunity/parts";
import { channelMeter, ladder, txCard } from "@/components/money";
import { CardIntoSlotDemo, RevealDemo, RouteDemo, VerifyDemo } from "@/components/design-demos";
import { GLOSSARY } from "@/data/glossary";

export const metadata: Metadata = { title: "Ledger v1 design system (archived)", robots: { index: false, follow: false } };

function Spec({ name, source, children, note }: { name: string; source: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="ds-spec">
      <div className="ds-spec-head">
        <span className="lg-h3">{name}</span>
        <span className="ds-spec-src">{source}</span>
      </div>
      {note ? <p className="lg-small">{note}</p> : null}
      {children}
    </div>
  );
}

function Part({ id, title, lede, children }: { id: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="lg-section" style={{ marginTop: 72 }}>
      <div className="lg-section-head">
        <h2 className="lg-title" style={{ fontSize: 40 }}>
          {title}
        </h2>
      </div>
      <p className="lg-lede">{lede}</p>
      <div className="lg-stack-lg" style={{ gap: 40, marginTop: 8 }}>
        {children}
      </div>
    </section>
  );
}

const SWATCHES: Array<[string, string, string]> = [
  ["--paper", "#f4f2ec", "Page"],
  ["--paper-2", "#ecebe4", "Sunk wells, callouts"],
  ["--white", "#fbfaf6", "Raised sheets"],
  ["--ink", "#0e1220", "Text, data, settled money"],
  ["--muted", "#4c5266", "Secondary text"],
  ["--brand", "#2b3bff", "Ultramarine: live, winning, selected"],
  ["--brand-deep", "#1a26cf", "Brand text on paper, hover"],
  ["--brand-wash", "#e7e9ff", "Winning row, selected bid level"],
  ["--line", "#c9cad3", "Hairlines"],
  ["--stage", "#0a0e2a", "Ultramarine night: Present"],
  ["--contexthint", "#f65a20", "ContextHint evidence only"],
];

const PV_WHERE: Record<ProvenanceKind, string> = {
  actual: "Jev decisions, the organic answer",
  observed: "ContextHint prompts and ad creatives",
  inferred: "ContextHint targeting hints",
  fictional: "ClearVault, KeyForge, LeatherGuard",
  policy: "Eligibility, frequency cap, tie-break, no fill",
  settled: "Finalized sandbox transactions",
  synthetic: "The Try preview and failure demos",
  replay: "Everything in this explorer",
  illustrative: "Motion on the landing page",
  vision: "Roadmap items only",
};

export default function DesignPage() {
  const o1 = opportunity(1);
  const o2 = opportunity(2);
  const o3 = opportunity(3);
  const o4 = opportunity(4);
  const cv = run.channels[0];
  const kf = run.channels[1];
  const lg = run.unfunded[0];
  const cvHist = decisionFor(o1, "v3-clearvault", "history")!;
  const lgHist = decisionFor(o1, "v3-leatherguard", "history")!;
  const kfLex = decisionFor(o2, "v3-keyforge", "history")!;
  const mercari = evidenceRecord(cvHist.retrieval!.examples[0].id)!;
  const ariat = evidenceRecord(lgHist.retrieval!.examples[0].id)!;
  const sparse = evidenceHint("ads:hint:52391")!;
  const unchanged = armDiffSentence(o2, "v3-clearvault")!;
  const spineGroups = [
    {
      label: "Opportunities, by question",
      items: run.opportunities.map((o) => ({
        kind: "opportunity" as const,
        href: `/opportunity/${o.n}/`,
        n: o.n,
        question: o.question,
        outcome: outcomeLine(o),
        glyph: (o.status === "no_fill" ? "nofill" : o.auction.notAdmitted.length ? "capped" : "filled") as "filled" | "capped" | "nofill",
        total: usdc(o.runningTotalBaseUnits),
        current: o.n === 3,
      })),
    },
  ];

  return (
    <InspectorProvider verifyHref="/verify/">
      <div className="ds-root" style={{ maxWidth: 1360, margin: "0 auto", padding: "40px clamp(20px, 4vw, 64px) 120px" }}>
        {/* ---------- Cover ---------- */}
        <header className="ds-cover">
          <div className="lg-row" style={{ justifyContent: "space-between" }}>
            <span className="lg-row" style={{ gap: 14 }}>
              <span className="lg-brand-mark"><Wordmark /></span>
              <span className="lg-label">Product design system</span>
            </span>
            <span className="lg-row" style={{ gap: 10 }}>
              <Provenance kind="replay" />
              <Link className="lg-btn" data-variant="outline" href="/opportunity/1/">
                Open the explorer <span className="lg-arrow">→</span>
              </Link>
            </span>
          </div>
          <div className="ds-cover-grid">
            <div className="lg-stack-lg">
              <h1 className="ds-cover-title">Ledger<span className="lg-brand-dot">.</span></h1>
              <p className="lg-lede" style={{ fontSize: 22, maxWidth: "34ch", color: "var(--ink)" }}>
                An instrument for one recorded run: a financial document crossed with a flight recorder. Every value on every screen is real, marked with where it came from, and open to inspection.
              </p>
              <div className="ds-facts">
                <div>
                  <span className="lg-label">Values from the run</span>
                  <span className="lg-data">{run.counts.decisions} decisions</span>
                </div>
                <div>
                  <span className="lg-label">Checks in the browser</span>
                  <span className="lg-data">48</span>
                </div>
                <div>
                  <span className="lg-label">Typeface</span>
                  <span>PolySans</span>
                </div>
                <div>
                  <span className="lg-label">Identity</span>
                  <span className="lg-brand-text">Ultramarine, one hue</span>
                </div>
              </div>
            </div>
            <div style={{ maxWidth: 440, justifySelf: "end", width: "100%" }}>
              <AppSpecimen o={o1} slot={<WinnerCard o={o1} />} />
            </div>
          </div>
        </header>

        {/* ---------- Foundation ---------- */}
        <Part id="foundation" title="Foundation" lede="Shared with the landing page: warm paper, blue-black ink, one electric ultramarine and one ultramarine night stage. Ledger adds a fixed type scale and a dense, ruled grid. Data stays ink; ultramarine marks what is live, winning or selected.">
          <Spec name="Colour" source="design-system/foundation/steel.css">
            <div className="ds-swatches">
              {SWATCHES.map(([t, hex, role]) => (
                <div className="ds-swatch" key={t}>
                  <i style={{ background: `var(${t})` }} />
                  <span className="lg-data-sm">{t}</span>
                  <span className="lg-data-sm lg-muted">{hex}</span>
                  <span className="lg-small">{role}</span>
                </div>
              ))}
            </div>
          </Spec>
          <Spec name="Where the brand goes" source="ultramarine #2b3bff, ContextHint #f65a20" note="Ultramarine appears only where the story peaks. ContextHint's vermillion marks its evidence and turns into ultramarine as it enters an agent's decision.">
            <div className="ds-two">
              <div className="lg-stack-sm">
                <span className="lg-label">Winning bid</span>
                <div className="lg-board">
                  <div className="lg-board-row" data-winner>
                    <span className="lg-h3">{nameOf(o1.award!.campaignId)}</span>
                    <span className="lg-data">3:3</span>
                    <span className="lg-board-formula">0.004 × 100% =<b>{usdc(o1.award!.priceBaseUnits)}</b></span>
                    <span className="lg-small">Won on the tie-break</span>
                  </div>
                </div>
              </div>
              <div className="lg-stack">
                <div className="lg-stack-sm">
                  <span className="lg-label">Live check and primary action</span>
                  <div className="lg-row">
                    <CheckMark state="pass">Signature verified here</CheckMark>
                    <Button>Step through</Button>
                  </div>
                </div>
                <div className="lg-stack-sm">
                  <span className="lg-label">Evidence handoff</span>
                  <Handoff to={`Handed to ${nameOf("v3-clearvault")}'s agent`} />
                </div>
              </div>
            </div>
          </Spec>
          <Spec name="Type scale" source="ledger.css .lg-*" note="PolySans only. Wide 300 for titles, Neutral for reading, Mono only for real data: amounts, hashes, IDs, timings. Status text never under 14 px.">
            <div>
              {[
                ["Title 40 · Wide 300", <span className="lg-title" key="t">One recorded run of an ad exchange inside an AI app.</span>],
                ["Display 32 · Wide 300", <span className="lg-display" key="d">{o1.question}</span>],
                ["H1 28 · Wide 400", <span className="lg-h1" key="h1">Two payment channels, three receipts, one settlement each.</span>],
                ["H2 20 · Median 500", <span className="lg-h2" key="h2">What each agent decided</span>],
                ["Body 16", <p className="lg-body" key="b">Code turns levels into a bid: a share of the campaign's max bid from the bid table. The highest bid wins; the model never names a price.</p>],
                ["Label 13 · Median 500", <span className="lg-label" key="l">Cumulative authorization</span>],
                ["Data 15 · Mono", <span className="lg-data" key="m"><Amount baseUnits={o1.award!.priceBaseUnits} /> · {o1.award!.id}</span>],
                ["Data small 13 · Mono", <span className="lg-data-sm lg-break" key="s">{o1.receipt!.receiptHash}</span>],
              ].map(([k, v]) => (
                <div className="ds-type-row" key={String(k)}>
                  <span className="lg-label">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Spec>
          <div className="ds-two">
            <Spec name="Spacing ladder" source="--space-1 … --space-30">
              <div className="ds-space">
                {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
                  <div key={n}>
                    <i style={{ width: n, height: n }} />
                    <span className="lg-data-sm">{n}</span>
                  </div>
                ))}
              </div>
            </Spec>
            <Spec name="Shape and depth" source="--radius-0, --shadow-offset-s">
              <div className="lg-row" style={{ gap: 20, alignItems: "stretch" }}>
                <div className="lg-sheet lg-sheet-pad" style={{ flex: 1 }}>
                  <span className="lg-label">Square sheet</span>
                  <p className="lg-small">Every Ledger surface is square with 1 px rules.</p>
                </div>
                <div className="lg-sheet lg-sheet-pad" data-raised style={{ flex: 1 }}>
                  <span className="lg-label">Raised: hard offset</span>
                  <p className="lg-small">Flat 5 px offset, no blur. Used for the receipt and the app.</p>
                </div>
                <div className="lg-sheet lg-sheet-pad" style={{ flex: 1, borderRadius: 12 }}>
                  <span className="lg-label">The one radius</span>
                  <p className="lg-small">Only the host chat specimen: it depicts someone else's app.</p>
                </div>
              </div>
            </Spec>
          </div>
          <Spec name="Density rules" source="docs/frontend/DESIGN_SYSTEMS.md">
            <div className="ds-rules">
              {[
                ["Mono is evidence", "If a string is set in mono, it is copied from the run: an amount, hash, ID, model name or timing."],
                ["Every value is marked", "A provenance glyph and word sits beside every claim. Shape carries meaning, never colour alone."],
                ["Two clocks, never one axis", "Exchange times and sandbox block times come from different clocks and are never aligned."],
                ["No fake execution", "No spinners, count-ups or thinking text. Recorded timings are shown as recorded."],
                ["Money keeps its units", "Test USDC in six-decimal base units; fees and rent in lamports. Never added together."],
                ["Square, ruled, quiet", "Hairlines over boxes, one brand hue, no icons, no decorative dots. The only gradient is the evidence handoff."],
              ].map(([h, b]) => (
                <div key={h}>
                  <span className="lg-h3">{h}</span>
                  <span className="lg-small">{b}</span>
                </div>
              ))}
            </div>
          </Spec>
        </Part>

        {/* ---------- Provenance and money ---------- */}
        <Part id="marks" title="Marks" lede="Provenance says where a value came from. Money states say where money is. Both are a shape plus a word, so they survive print, video compression and colour blindness.">
          <Spec name="Provenance" source="design-system/foundation/provenance.ts">
            <DataTable
              columns={[
                { key: "m", head: "Mark", cell: (k: ProvenanceKind) => <Provenance kind={k} /> },
                { key: "d", head: "Meaning", cell: (k) => <span className="lg-small">{PROVENANCE[k].meaning}</span> },
                { key: "w", head: "In this run", cell: (k) => <span className="lg-small" style={{ color: "var(--ink)" }}>{PV_WHERE[k]}</span> },
              ]}
              rows={Object.keys(PROVENANCE) as ProvenanceKind[]}
            />
          </Spec>
          <Spec name="Money states" source="state.payments, state.exchange.awards">
            <DataTable
              columns={[
                { key: "s", head: "State", cell: (r: { s: Parameters<typeof MoneyStateMark>[0]["state"]; a: ReactNode; w: ReactNode }) => <MoneyStateMark state={r.s} /> },
                { key: "a", head: "Amount", cell: (r) => r.a },
                { key: "w", head: "Where it happened", cell: (r) => <span className="lg-small" style={{ color: "var(--ink)" }}>{r.w}</span> },
              ]}
              rows={[
                { s: "deposit", a: <Amount baseUnits={cv.depositBaseUnits} />, w: "ClearVault's channel deposit, locked once on open" },
                { s: "reserved", a: <Amount baseUnits={o1.award!.priceBaseUnits} />, w: "Award on opportunity 1, before delivery" },
                { s: "accepted", a: <Amount baseUnits={o1.charge!.amountBaseUnits} />, w: "Charge after the signed receipt was accepted" },
                { s: "authorized", a: <Amount baseUnits={cv.authorizedBaseUnits} />, w: "Voucher 2: cumulative, replaces voucher 1" },
                { s: "settled", a: <Amount baseUnits={cv.settledBaseUnits} />, w: "Paid to the publisher at close" },
                { s: "refunded", a: <Amount baseUnits={cv.refundBaseUnits} />, w: "Returned to the payer at close" },
                { s: "pending", a: <Amount baseUnits={lg.depositBaseUnits} />, w: `${nameOf(lg.campaignId)}: channel ${lg.status.replace("_", " ")}, never funded` },
                { s: "unknown", a: <span className="lg-small">none</span>, w: "Not reached in this run; would never render as settled" },
              ]}
            />
          </Spec>
        </Part>

        {/* ---------- Frame ---------- */}
        <Part id="frame" title="Frame" lede="Scope is always on screen: a recorded replay, a hosted sandbox, test USDC, fictional advertisers. The spine keeps the story order and the running total; the inspector opens the raw record behind any value.">
          <Spec name="ScopeBar" source="components/chrome.tsx">
            <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
              <ScopeBar
                brand={<Wordmark />}
                brandHref="/"
                runId={run.source.runId}
                chips={
                  <>
                    <ScopeChip kind="replay" label="Recorded replay" />
                    <ScopeChip kind="settled" label="Hosted Solana sandbox" />
                    <ScopeChip label="Test USDC" />
                    <ScopeChip kind="fictional" label="Fictional advertisers" />
                  </>
                }
                actions={
                  <>
                    <span className="lg-btn" data-variant="outline">Present</span>
                    <span className="lg-btn">Verify</span>
                  </>
                }
              />
            </div>
          </Spec>
          <div className="ds-two ds-two-spine">
            <Spec name="RunSpine" source="story order, running accepted total">
              <div className="ds-spine-spec" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
                <RunSpine groups={spineGroups} foot="Ordered by question. Recorded order: the mobile question ran first." />
              </div>
            </Spec>
            <Spec name="Inspector" source="?inspect=receipt:<chargeId>" note="Raw JSON from the public projection, its source path in run.json, and every hash marked recomputable or recorded only.">
              <div className="ds-inspector-frame">
                <InspectorDrawer payload={inspect.receipt(o1)} verifyHref="/verify/" staticOpen />
              </div>
            </Spec>
          </div>
          <div className="ds-three">
            <Spec name="Term" source="data/glossary.ts">
              <p className="lg-body" style={{ color: "var(--ink)" }}>
                Voucher 2 is a <Term title={GLOSSARY.cumulative.term} def={GLOSSARY.cumulative.def}>cumulative authorization</Term>. Fees are paid in <Term title={GLOSSARY.lamports.term} def={GLOSSARY.lamports.def}>lamports</Term>.
              </p>
            </Spec>
            <Spec name="KeyHint" source="keyboard">
              <div className="lg-stack-sm">
                <KeyHint keys={["J", "K"]}>step through an opportunity</KeyHint>
                <KeyHint keys={["I"]}>open the inspector</KeyHint>
                <KeyHint keys={["Esc"]}>close, leave step-through</KeyHint>
              </div>
            </Spec>
            <Spec name="Buttons and chips" source="ledger.css .lg-btn .lg-chip">
              <div className="lg-stack">
                <div className="lg-row">
                  <Button>Step through</Button>
                  <Button variant="outline">Present</Button>
                  <Button variant="text">Inspect</Button>
                </div>
                <div className="lg-row">
                  <Chip>{run.policy.bidPolicy}</Chip>
                  <Chip mono>{o1.slotId}</Chip>
                  <Chip dashed>Unfunded</Chip>
                </div>
              </div>
            </Spec>
          </div>
        </Part>

        {/* ---------- Primitives ---------- */}
        <Part id="primitives" title="Primitives" lede="Documents, not dashboards: key and value lists, hairline tables, callouts for limits, stamps for rulings, checks that run in the reader's browser.">
          <div className="ds-two">
            <Spec name="KeyValue" source={`state.exchange.awards[id=${o1.award!.id.slice(0, 14)}…]`}>
              <KeyValue
                rows={[
                  { k: "Award", v: <span className="lg-data-sm">{o1.award!.id}</span> },
                  { k: "Price", v: <Amount baseUnits={o1.award!.priceBaseUnits} /> },
                  { k: "Expires", v: <span><span className="lg-data-sm">{fmtUtc(o1.award!.expiresAt)}</span> <span className="lg-small">exchange clock</span></span> },
                  { k: "Creative hash", v: <CopyHash value={o1.award!.creativeHash} label="creative hash" /> },
                ]}
              />
            </Spec>
            <Spec name="DataTable" source="state.payments">
              <DataTable
                columns={[
                  { key: "c", head: "Channel", cell: (c: typeof cv) => nameOf(c.campaignId) },
                  { key: "d", head: "Deposit", num: true, cell: (c) => <Amount baseUnits={c.depositBaseUnits} unit="" /> },
                  { key: "p", head: "Paid", num: true, cell: (c) => <Amount baseUnits={c.settledBaseUnits} unit="" /> },
                  { key: "r", head: "Refunded", num: true, cell: (c) => <Amount baseUnits={c.refundBaseUnits} unit="" /> },
                ]}
                rows={run.channels}
              />
            </Spec>
          </div>
          <div className="ds-three">
            <Spec name="Callout" source="run.limitations">
              <Callout title="What this run does not show">
                <p>{run.limitations.run[5]}</p>
              </Callout>
            </Spec>
            <Spec name="StatusStamp" source="policy rulings">
              <div className="lg-stack-sm">
                <StatusStamp kind="policy">Frequency cap, 2 of 2</StatusStamp>
                <StatusStamp tone="dashed">Unfunded: no channel opened</StatusStamp>
                <StatusStamp tone="outline">Unchanged</StatusStamp>
              </div>
            </Spec>
            <Spec name="CheckMark" source="computed here vs recorded">
              <div className="lg-stack-sm">
                <CheckMark state="pass">Receipt hash recomputed here: matches</CheckMark>
                <CheckMark state="recorded">Raw model output: recorded hash only</CheckMark>
                <CheckMark state="skip">Ed25519 unsupported: hash checks still ran</CheckMark>
                <span className="lg-row" style={{ gap: 14 }}>
                  <Lamports value={run.fees.networkFeeLamports} />
                  <Amount baseUnits={run.totals.paidBaseUnits} />
                </span>
              </div>
            </Spec>
          </div>
          <Spec name="NumberStrip" source="counts">
            <NumberStrip
              items={[
                { value: run.counts.opportunities, label: "questions asked in the app" },
                { value: run.counts.decisions, label: "agent decisions" },
                { value: `${run.counts.auctions} + ${run.counts.noFill}`, label: "auctions + no fill" },
                { value: run.counts.receipts, label: "signed deliveries" },
                { value: usdc(run.totals.paidBaseUnits), label: `test USDC paid, ${usdc(run.totals.refundedBaseUnits)} refunded` },
              ]}
            />
          </Spec>
        </Part>

        {/* ---------- The app ---------- */}
        <Part id="app" title="The app" lede="The host chat is the only rounded shape in Ledger, because it depicts a third-party app. The answer and the Sponsored slot are separate; the answer never receives advertiser material.">
          <div className="ds-three">
            <Spec name="Delivered card" source="opportunity 3">
              <AppSpecimen o={o3} slot={<WinnerCard o={o3} />} />
            </Spec>
            <Spec name="Awaiting auction" source="step-through, steps 1 to 6">
              <AppSpecimen o={o2} slot={<AwaitingSlot />} />
            </Spec>
            <Spec name="No fill" source="opportunity 4">
              <AppSpecimen o={o4} slot={<NoFillSlot />} />
            </Spec>
          </div>
        </Part>

        {/* ---------- Eligibility and evidence ---------- */}
        <Part id="evidence" title="Eligibility and evidence" lede="Eligibility is a rule over declarations. Evidence is real history from ContextHint, kept apart from the campaign: observed prompts and ads, inferred hints, and the method used to find them.">
          <Spec name="EligibilityMatrix" source="opportunity 4: two required capabilities">
            <EligibilityStep o={o4} />
          </Spec>
          <div className="ds-two">
            <Spec name="MethodBadge" source="retrieval.method">
              <div className="lg-stack-sm">
                <MethodBadge method="vector" detail="cosine, BGE-768, cached" />
                <MethodBadge method="lexical_fallback" detail="word overlap, not semantic" />
              </div>
              <CapabilityChips caps={[{ name: "crypto_storage", state: "required" }, { name: "hardware_wallet", state: "declared" }, { name: "mobile_software_wallet", state: "missing" }, { name: "solana", state: "soft" }]} />
            </Spec>
            <Spec name="ObservedRecord" source={mercari.id}>
              <ObservedRecord prompt={mercari.promptText} advertiser={mercari.advertiser} creative={mercari.creativeText} similarity={<SimilarityLabel method="vector" value={1} />} />
            </Spec>
          </div>
          <div className="ds-two">
            <Spec name="Ambiguous evidence" source={`${ariat.id}, LeatherGuard's packet`} note="The word “wallet” matched crypto prompts to leather wallet ads. Evidence cannot add a capability.">
              <ObservedRecord prompt={ariat.promptText} advertiser={ariat.advertiser} creative={ariat.creativeText} similarity={<SimilarityLabel method="vector" value={lgHist.retrieval!.examples[0].similarity} />} />
            </Spec>
            <Spec name="InferredHint" source={`${sparse.id}, tier ${sparse.tier}`}>
              <InferredHint text={sparse.text} tier={`tier ${sparse.tier}, ${sparse.supportingCreativeCount} supporting creative`} flags={["Inferred, not observed", "Sparse: few supporting creatives"]} />
            </Spec>
          </div>
          <Spec name="EvidencePacket" source="opportunity 2, KeyForge, lexical fallback">
            <EvidencePanel o={o2} d={kfLex} />
          </Spec>
        </Part>

        {/* ---------- Decisions ---------- */}
        <Part id="decisions" title="Decisions" lede="Agents answer in levels; levels are rounded scores. The ruler draws the rounding line so a move from 2.38 to 2.52 reads as what it is: one observation crossing a line, not a measured lift.">
          <Spec name="DecisionGrid" source="opportunity 1: 3 campaigns × 2 research arms">
            <DecisionsGrid o={o1} />
          </Spec>
          <Spec name="ArmDiff with ScoreRuler: changed" source="opportunity 1">
            <ArmDiffs o={o1} />
          </Spec>
          <div className="ds-two">
            <Spec name="ArmDiff: unchanged, equal weight" source="opportunity 2">
              <ArmDiff title={`What history changed for ${nameOf("v3-clearvault")}`} changed={unchanged.changed} ruler={<IntentRuler o={o2} campaignId="v3-clearvault" />}>
                {unchanged.text}
              </ArmDiff>
            </Spec>
            <Spec name="Not admitted" source="opportunity 3, ClearVault">
              <NotAdmittedStamp detail="Frequency cap: ClearVault was already placed twice in this session (2 of 2). No bid, no amount." />
              <ScoreRuler min={0} max={3} roundLines={[0.5, 1.5, 2.5]} keyLine={2.5} marks={[{ value: decisionFor(o3, "v3-clearvault", "history")!.scores.intent, kind: "history", label: "Intent with history" }]} caption="Full 0 to 3 scale with every rounding line" />
            </Spec>
          </div>
        </Part>

        {/* ---------- Auction to charge ---------- */}
        <Part id="auction" title="Auction to charge" lede="Code sets the price, an award reserves budget, the app's signed receipt makes it a charge, and the charge advances a cumulative voucher. Each step is a separate fact.">
          <Spec name="AuctionBoard with BidTableGrid and TieBreakNote" source="opportunity 1">
            <AuctionStep o={o1} />
          </Spec>
          <div className="ds-two">
            <Spec name="AwardTicket" source="reserved, not a charge">
              <AwardStep o={o1} />
            </Spec>
            <Spec name="Delivery" source="render acknowledgement">
              <DeliveryStep o={o1} />
            </Spec>
          </div>
          <div className="ds-two">
            <Spec name="ReceiptSheet" source="receipts[awardId], Ed25519 checked here">
              <ReceiptStep o={o1} />
            </Spec>
            <Spec name="ChargeLine and VoucherStep" source="opportunity 2: voucher 2">
              <ChargeStep o={o2} />
            </Spec>
          </div>
        </Part>

        {/* ---------- Money ---------- */}
        <Part id="money" title="Settlement" lede="Each funded advertiser locked a deposit in its own channel. Vouchers accumulate off chain; one close pays the last total and refunds the rest. USDC and lamports never share a column.">
          <div className="ds-two">
            <Spec name="ChannelMeter" source={cv.channelId}>
              {channelMeter(cv)}
            </Spec>
            <Spec name="ChannelMeter" source={kf.channelId}>
              {channelMeter(kf)}
            </Spec>
          </div>
          <div className="ds-two">
            <Spec name="CumulativeLadder" source={`${cv.channelId}.vouchers`}>
              {ladder(cv)}
            </Spec>
            <Spec name="TxCard" source="chainEvidence, close transaction">
              {txCard(cv, cv.close)}
            </Spec>
          </div>
        </Part>

        {/* ---------- Timeline and verify ---------- */}
        <Part id="records" title="Records and proof" lede="The exchange log is ordered by sequence on the exchange clock. The chain is ordered by slot on the sandbox clock. Verify rows recompute in the reader's browser and fail loudly.">
          <div className="ds-two">
            <Spec name="LedgerTimeline" source="events 29 to 33, exchange clock">
              <LedgerTimeline
                groups={[
                  {
                    key: "o3",
                    title: `Opportunity 3: ${o3.question}`,
                    meta: "exchange clock",
                    rows: run.events
                      .filter((e) => e.seq >= 29)
                      .map((e) => ({ key: `${e.seq}`, a: e.seq, b: fmtUtc(e.at), c: <span><span className="lg-tl-type">{e.type.replace(/_/g, " ")}</span> <span className="lg-tl-sum">{e.type === "buyer_decision" ? `${nameOf(String(e.data.campaignId))}: ${e.data.decision} ${e.data.relevanceLevel}:${e.data.commercialIntentLevel}` : e.type === "award_reserved" ? `${nameOf(String(e.data.campaignId))} ${usdc(String(e.data.priceBaseUnits))}` : e.type === "charge_accepted" ? usdc(String(e.data.amountBaseUnits)) : ""}</span></span> })),
                  },
                ]}
              />
            </Spec>
            <Spec name="VerifyRow" source="computed in this browser">
              <VerifyDemo receipt={o1.receipt!.fields as unknown as Record<string, string>} receiptHash={o1.receipt!.receiptHash} />
            </Spec>
          </div>
        </Part>

        {/* ---------- Step rail ---------- */}
        <Part id="rail" title="The step rail" lede="Nine steps from the moment to the voucher, each with real values and a plain explanation. In step-through, the active step leads and the rest recede to 35%.">
          <div style={{ maxWidth: 760 }}>
            <StepRail>
              {[
                ["The moment", <>Required <span className="lg-data-sm">crypto_storage</span>, floor <Amount baseUnits={o1.floorBaseUnits} /></>],
                ["Who may compete", `${o1.eligibility.eligible.map(nameOf).join(" and ")}; LeatherGuard excluded by rule`],
                ["What each agent was shown", `Vector match, cosine 1.000 to an observed ${mercari.advertiser} listing`],
                ["What each agent decided", "ClearVault 3:3, KeyForge 3:3, LeatherGuard skip"],
                ["Auction", <>Two bids of <Amount baseUnits={o1.award!.priceBaseUnits} />; tie goes to v3-clearvault</>],
                ["Award (not a charge yet)", <MoneyStateMark key="r" state="reserved" label={`Reserved ${usdc(o1.award!.priceBaseUnits)}`} />],
                ["Delivery", <span key="d" className="lg-data-sm">+{(o1.delivery!.msAfterAward / 1000).toFixed(1)} s after the award</span>],
                ["Signed receipt", <span key="s" className="lg-data-sm">{run.publisher.publisherKeyId}</span>],
                ["Charge and voucher", <MoneyStateMark key="a" state="authorized" label={`Voucher 1, cumulative ${usdc(o1.voucher!.cumulativeAmountBaseUnits)}`} />],
              ].map(([t, v], i) => (
                <Step key={String(t)} n={i + 1} id={`rail-${i}`} title={String(t)} active={i === 4} dim={i !== 4}>
                  <span className="lg-small" style={{ color: "var(--ink)" }}>
                    {v}
                  </span>
                </Step>
              ))}
            </StepRail>
          </div>
        </Part>

        {/* ---------- Motion ---------- */}
        <Part id="motion" title="Motion" lede="One easing curve. Cause, then effect: a step reveals, a route draws to the app, the card lands in its slot. Motion explains the interface; it never imitates execution. Reduced motion makes all of it instant.">
          <div className="ds-motion">
            <RevealDemo>
              <KeyValue
                dense
                rows={[
                  { k: "Winner", v: nameOf(o1.award!.campaignId) },
                  { k: "Price", v: <Amount baseUnits={o1.award!.priceBaseUnits} /> },
                  { k: "Tie-break", v: "v3-clearvault before v3-keyforge" },
                ]}
              />
            </RevealDemo>
            <RouteDemo
              target={<div className="lg-slot-await" style={{ minHeight: 120 }}><strong>Sponsored slot</strong></div>}
              step={
                <div className="lg-row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <span className="lg-step-node" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "var(--on-brand)" }}>5</span>
                  <span className="lg-stack-sm" style={{ gap: 2 }}>
                    <span className="lg-h3">Auction</span>
                    <span className="lg-small">{campaign("v3-clearvault").businessName} wins at {usdc(o1.award!.priceBaseUnits)}</span>
                  </span>
                </div>
              }
            />
            <CardIntoSlotDemo card={<WinnerCard o={o1} />} />
          </div>
        </Part>

        {/* ---------- Copy ---------- */}
        <Part id="copy" title="Words" lede="The interface states what the record shows and stops there. These are the lines the system keeps fixed.">
          <div className="ds-rules">
            {[
              ["Agent said bid. Exchange did not admit it.", "Opportunity 3, ClearVault: the frequency cap is a rule, not the agent."],
              ["One observation per arm; not a measured lift.", "Every arm comparison ends with this sentence."],
              ["Observed historical reference, not an axp.one advertiser", "Under every real brand from ContextHint."],
              ["The two lanes use different clocks and are not aligned in time.", "Timeline banner: exchange clock and sandbox clock."],
              ["This proves the app's assertion that it inserted a labelled card, not that a person read it.", "Under every signed receipt."],
              ["No sponsored placement for this turn", "The no-fill note. Never an empty ad box."],
            ].map(([h, b]) => (
              <div key={h}>
                <span className="lg-h3">{h}</span>
                <span className="lg-small">{b}</span>
              </div>
            ))}
          </div>
        </Part>
      </div>
    </InspectorProvider>
  );
}
