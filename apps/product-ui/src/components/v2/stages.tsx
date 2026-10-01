// Opportunity stage panels on Ledger v2. Plain language and visuals in the main view; IDs, hashes and raw
// records in the Inspector. Wording follows the data traps in docs/frontend/MVP_SPEC.md.
import Link from "next/link";
import type { ReactNode } from "react";
import { InspectButton, Ld, Term } from "@axp/design-system/ledger";
import { GLOSSARY } from "@/data/glossary";
import { campaign, decisionFor, evidenceHint, evidenceRecord, flagWords, nameOf, run, usdc } from "@/data/select";
import type { Decision, Opportunity } from "@/data/types";
import { armDiffSentence, inspect } from "@/components/opportunity/parts";
import { bpsFor } from "@/lib/policy.ts";
import { LiveHashV2, LiveSignatureV2 } from "./live";

const L = Link as unknown as Ld.LinkC;
const two = (n: number) => n.toFixed(2);
const utc = (ms: number) => `${new Date(ms).toISOString().slice(11, 19)} UTC`;
const plain = (s: string) => s.replace(/_/g, " ");

/** "3:2" -> "relevance 3, intent 2" */
export const levelsWords = (lv?: string | null) => {
  if (!lv) return "";
  const [r, i] = lv.split(":");
  return `relevance ${r}, intent ${i}`;
};

export const STAGES = [
  { id: "moment", label: "Moment" },
  { id: "eligibility", label: "Eligibility" },
  { id: "evidence", label: "Evidence" },
  { id: "decisions", label: "Decisions" },
  { id: "auction", label: "Auction" },
  { id: "award", label: "Award" },
  { id: "delivery", label: "Delivery" },
  { id: "receipt", label: "Receipt" },
  { id: "charge", label: "Charge" },
] as const;

export function pipeStages(o: Opportunity): Ld.PipeStage[] {
  if (o.status === "no_fill")
    return [
      { id: "moment", label: "Moment", value: `${o.mandatoryCapabilities.length} required`, status: "done" as const },
      { id: "eligibility", label: "Eligibility", value: "0 of 3 may bid", status: "done" as const },
      { id: "nofill", label: "Steps 3 to 9", value: "Did not run", status: "skipped" as const },
    ];
  const method = o.decisions.find((d) => d.retrieval)?.retrieval?.method;
  const values = [
    `Floor ${usdc(o.floorBaseUnits)}`,
    `${o.eligibility.eligible.length} of 3 may bid`,
    method === "vector" ? "Seen before" : "Word overlap",
    `${o.decisions.length} calls`,
    o.auction.tieBreakApplied ? `Tie at ${usdc(o.auction.bids[0].amountBaseUnits)}` : `${o.auction.bids.length} bid${o.auction.bids.length > 1 ? "s" : ""}`,
    `${usdc(o.award!.priceBaseUnits)} held`,
    `+${(o.delivery!.msAfterAward / 1000).toFixed(1)} s`,
    "Signed",
    `${usdc(o.charge!.amountBaseUnits)} charged`,
  ];
  return STAGES.map((s, i) => ({ id: s.id, label: s.label, value: values[i], status: "done" as const }));
}

function StagePanel({ n, title, sub, inspectPayload, children }: { n: number; title: string; sub: ReactNode; inspectPayload?: Parameters<typeof InspectButton>[0]["payload"]; children: ReactNode }) {
  return (
    <Ld.Panel title={`${n}. ${title}`} sub={sub} actions={inspectPayload ? <InspectButton payload={inspectPayload} primary>Inspect record</InspectButton> : undefined}>
      <div className="ld-stack-lg" style={{ gap: 16 }}>
        {children}
      </div>
    </Ld.Panel>
  );
}

// 1 ---------------------------------------------------------------
export function MomentPanel({ o }: { o: Opportunity }) {
  const o1 = run.opportunities[0];
  return (
    <StagePanel n={1} title="The moment" sub="The app offered one Sponsored slot beside its answer. Only these fields reach the exchange." inspectPayload={inspect.opportunity(o)}>
      <div className="ld-cols-3">
        <Ld.Stat label="Topic" value="Crypto wallet tools" caption="Coarse intent only; no user profile" />
        <Ld.Stat label="Floor price" value={`${usdc(o.floorBaseUnits)} USDC`} caption="Test USDC; the lowest bid the app accepts" />
        <Ld.Stat label="Created" value={utc(o.createdAt)} caption="Exchange clock" />
      </div>
      <div className="ld-cols-2">
        <div className="ld-stack" style={{ gap: 6 }}>
          <span className="ld-label">Must have</span>
          <span className="ld-row" style={{ gap: 6 }}>
            {o.mandatoryCapabilities.map((c) => (
              <Ld.Tag key={c} tone="solid">
                {plain(c)}
              </Ld.Tag>
            ))}
          </span>
        </div>
        <div className="ld-stack" style={{ gap: 6 }}>
          <span className="ld-label">Nice to have</span>
          <span className="ld-row" style={{ gap: 6 }}>
            {o.softPreferences.filter((c) => !(o.mandatoryCapabilities as string[]).includes(c)).map((c) => (
              <Ld.Tag key={c} tone="outline">
                {plain(c)}
              </Ld.Tag>
            ))}
          </span>
          {o.softPreferences.some((c) => (o.mandatoryCapabilities as string[]).includes(c)) ? <span className="ld-caption">{o.softPreferences.filter((c) => (o.mandatoryCapabilities as string[]).includes(c)).map(plain).join(", ")} is also listed as a preference.</span> : null}
        </div>
      </div>
      {o.scenarioId === "repeat" ? (
        <Ld.Callout title="Same question, fresh answer">
          The app sent the same organic input as opportunity {o1.n} and got a new completion: the app bridge is not a cache. Both hashes are in the Inspector.
        </Ld.Callout>
      ) : null}
      <Ld.Callout tone="brand">The answer on the left was written by the app's own model with no advertiser material. The Sponsored slot under it is separate.</Ld.Callout>
    </StagePanel>
  );
}

// 2 ---------------------------------------------------------------
export function EligibilityPanel({ o }: { o: Opportunity }) {
  return (
    <StagePanel n={2} title="Who may compete" sub="A rule in code decides who can enter the auction: a campaign must declare every required capability." inspectPayload={inspect.eligibility(o)}>
      <Ld.CapGrid
        caps={o.mandatoryCapabilities}
        rows={run.campaigns.map((c) => {
          const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
          return {
            key: c.campaignId,
            name: c.businessName,
            has: c.declaredConstraints,
            ok: !ex,
            result: ex ? (ex.reason === "missing_constraint" ? `Missing ${ex.missing.map(plain).join(", ")}` : ex.reason === "frequency_cap" ? "Frequency cap: placed twice this session" : plain(ex.reason)) : "",
          };
        })}
      />
      <span className="ld-caption">
        {o.decisions.length
          ? "Every agent was asked here, even an excluded one, for the research comparison; an excluded campaign can never bid. Funding is checked at auction time, and history never adds a capability."
          : "No campaign was eligible, so no agent was asked."}
      </span>
    </StagePanel>
  );
}

// 3 ---------------------------------------------------------------
function EvidenceTab({ o, d }: { o: Opportunity; d: Decision }) {
  const rt = d.retrieval!;
  const shown = new Set(rt.examples.map((e) => e.id));
  return (
    <div className="ld-stack" style={{ gap: 12 }}>
      <div className="ld-between">
        <span className="ld-row" style={{ gap: 8 }}>
          <Ld.Tag tone={rt.method === "vector" ? "brand" : "warning"}>{rt.method === "vector" ? "Vector match: the exact question was stored" : "Lexical fallback: word overlap, not semantic"}</Ld.Tag>
          <span className="ld-caption">
            Similarity is <Term title={GLOSSARY.cosine.term} def={GLOSSARY.cosine.def}>cosine</Term> for stored questions, <Term title={GLOSSARY.lexical.term} def={GLOSSARY.lexical.def}>word overlap</Term> otherwise.
          </span>
        </span>
        <span className="ld-row" style={{ gap: 10 }}>
          <LiveHashV2 value={d.packet} expected={d.packetHash} label="Packet hash recomputed here" />
          <InspectButton payload={inspect.packet(o, d)}>View exact packet</InspectButton>
        </span>
      </div>
      <div className="ld-cols-2">
        {rt.examples.map((e) => {
          const r = evidenceRecord(e.id)!;
          return <Ld.EvidenceCard key={e.id} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} sim={e.similarity} method={rt.method} />;
        })}
        {rt.hintIds.map((h) => {
          const hint = evidenceHint(h)!;
          return (
            <div key={h} className="ld-evidence" style={{ boxShadow: "inset 3px 0 0 var(--ld-ch)" }}>
              <div className="ld-between">
                <Ld.Pv kind="inferred" label="Inferred targeting hint" />
                <Ld.Tag>{hint.tier === "sparse" ? "Sparse: few supporting ads" : hint.tier === "loo" ? "Leave-one-out tested" : "Held-out tested"}</Ld.Tag>
              </div>
              <p className="ld-evidence-q" style={{ fontSize: 13 }}>
                {hint.text}
              </p>
              <span className="ld-caption">A hypothesis about who past ads targeted, not an advertiser setting.</span>
            </div>
          );
        })}
      </div>
      <div className="ld-stack" style={{ gap: 6 }}>
        <span className="ld-label">Nearest prompts in the screened history</span>
        <span className="ld-caption">Brands in this list are observed historical references, not axp.one advertisers.</span>
        {rt.neighbors.map((n, i) => {
          const r = evidenceRecord(n.associationIds[0]);
          return (
            <div key={i} className="op2-neighbor">
              <Ld.SimBar value={n.similarity} method={rt.method} />
              <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                “{r?.promptText}” <span className="ld-faint">({r?.advertiser}{r && shown.has(r.id) ? ", shown above" : ""})</span>
              </span>
            </div>
          );
        })}
      </div>
      <span className="ld-row" style={{ gap: 6 }}>
        {rt.qualityFlags.map((f) => (
          <Ld.Tag key={f}>{flagWords(f)}</Ld.Tag>
        ))}
      </span>
    </div>
  );
}

export function EvidencePanel({ o }: { o: Opportunity }) {
  const ds = o.decisions.filter((d) => d.arm === "history" && d.retrieval);
  const cv = ds.find((d) => d.campaignId === "v3-clearvault");
  const ex = cv?.retrieval?.examples[0];
  const r = ex ? evidenceRecord(ex.id) : undefined;
  return (
    <StagePanel n={3} title="What each agent was shown" sub={<>Each agent got its own packet of <Term title={GLOSSARY.contexthint.term} def={GLOSSARY.contexthint.def}>ContextHint</Term> history (<a className="ld-link" href="https://contexthint.com" target="_blank" rel="noopener noreferrer">contexthint.com</a>): past prompts, the ads that appeared beside them, and inferred targeting hints.</>}>
      {cv && r && ex ? (
        cv.retrieval!.method === "vector" && ex.similarity === 1 ? (
          <Ld.Callout tone="ch" title="ContextHint had seen this exact question before">
            It appeared next to a <b>{r.advertiser}</b> hardware-wallet listing. Agents get that history as evidence. Real brands are past observations, not bidders.
          </Ld.Callout>
        ) : (
          <Ld.Callout tone="warning" title="This wording was not in the history">
            No stored vector exists for it, so retrieval fell back to word overlap. Scores below are overlap scores, not semantic similarity.
          </Ld.Callout>
        )
      ) : null}
      <Ld.Tabs label="Packet by campaign" tabs={ds.map((d) => ({ key: d.campaignId, label: nameOf(d.campaignId), count: d.retrieval!.examples.length, panel: <EvidenceTab o={o} d={d} /> }))} />
    </StagePanel>
  );
}

// 4 ---------------------------------------------------------------
function ArmRow({ d, o }: { d: Decision; o: Opportunity }) {
  const na = o.auction.notAdmitted.find((x) => x.campaignId === d.campaignId);
  return (
    <div className="op2-arm" id={`decision-${d.campaignId.replace("v3-", "")}-${d.arm === "history" ? "history" : "baseline"}`}>
      <div className="ld-between">
        <span className="ld-label">{d.arm === "history" ? "With history" : "Baseline, research only"}</span>
        <span className="ld-row" style={{ gap: 6 }}>
          <Ld.Tag tone={d.decision === "bid" ? "solid" : "outline"}>{d.decision === "bid" ? "Bid" : "Skip"}</Ld.Tag>
          <InspectButton payload={inspect.decision(o, d)} variant="text">
            Inspect
          </InspectButton>
        </span>
      </div>
      <span className="ld-secondary">
        Relevance <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{d.relevanceLevel} of 3</b> (score {two(d.scores.relevance)}), intent <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{d.commercialIntentLevel} of 3</b> (score {two(d.scores.intent)})
      </span>
      <span className="ld-caption">
        {d.creative.choice === "no_fit" ? "Chose no fitting creative" : "Chose the approved card"}, {Math.round(d.elapsedMs)} ms recorded
      </span>
      {na && d.arm === "history" ? (
        <Ld.Callout tone="warning" title="Agent said bid. Exchange did not admit it.">
          Frequency cap: {nameOf(d.campaignId)} was already placed twice in this session ({na.sessionAwards} of {na.frequencyCap}). No bid, no amount.
        </Ld.Callout>
      ) : null}
    </div>
  );
}

export function DecisionsPanel({ o }: { o: Opportunity }) {
  const winner = o.award?.campaignId;
  const wb = winner ? decisionFor(o, winner, "text_only") : undefined;
  const wh = winner ? decisionFor(o, winner, "history") : undefined;
  const amt = (d: Decision) => usdc(((BigInt(run.policy.maxBidBaseUnits) * BigInt(bpsFor(d.relevanceLevel, d.commercialIntentLevel) ?? 0)) / BigInt(10000)).toString());
  return (
    <StagePanel n={4} title="What each agent decided" sub={<>Decided with <Term title={GLOSSARY.jev.term} def={GLOSSARY.jev.def}>Jev</Term>. Each agent answers in levels: relevance (does the approved card fit?) and commercial intent (is the person comparing offers?). A level is the rounded score, from 0 to 3.</>}>
      <div className="ld-cols-3">
        {run.campaigns.map((c) => {
          const b = decisionFor(o, c.campaignId, "text_only");
          const h = decisionFor(o, c.campaignId, "history");
          const diff = armDiffSentence(o, c.campaignId);
          const marks = [...(b ? [{ value: b.scores.intent, kind: "baseline" as const, label: "Baseline" }] : []), ...(h ? [{ value: h.scores.intent, kind: "history" as const, label: "With history" }] : [])];
          return (
            <div key={c.campaignId} className="op2-dcard">
              <div className="ld-between">
                <span className="ld-stack" style={{ gap: 0 }}>
                  <span className="ld-card-title">{c.businessName}</span>
                  <span className="ld-caption">Decided with Jev</span>
                </span>
                {c.campaignId === "v3-leatherguard" ? <Ld.Tag tone="dashed">Excluded by rule</Ld.Tag> : diff ? <Ld.Tag tone="outline">{diff.changed ? "Level changed" : "Unchanged"}</Ld.Tag> : null}
              </div>
              {h && c.campaignId !== "v3-leatherguard" ? <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} width={220} marks={marks} /> : null}
              {b ? <ArmRow d={b} o={o} /> : null}
              {h ? <ArmRow d={h} o={o} /> : null}
              {diff && c.campaignId !== "v3-leatherguard" ? <p className="ld-secondary">{diff.text}</p> : null}
              {c.campaignId === "v3-leatherguard" && h ? (
                <p className="ld-secondary">Blocked twice: excluded by rule (missing crypto storage) and its own agent chose no fit. Its history matched crypto prompts to leather and RFID wallet ads; the word “wallet” is ambiguous.</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {o.scenarioId === "repeat" ? (
        <Ld.Callout title="Only the history arm was asked on the repeat">The paired baseline arm ran only for the first two questions. KeyForge's intent score was {two(decisionFor(o, "v3-keyforge", "history")!.scores.intent)}, just under the 2.5 line, so level 2.</Ld.Callout>
      ) : wb && wh ? (
        <Ld.Callout tone="brand" title="What the bid table makes of each answer">
          {wb.relevanceLevel === wh.relevanceLevel && wb.commercialIntentLevel === wh.commercialIntentLevel
            ? `With and without history, ${nameOf(winner)} got relevance ${wh.relevanceLevel} of 3 and intent ${wh.commercialIntentLevel} of 3, so the bid table gives ${amt(wh)} USDC either way. Only the answer with history competed.`
            : `Without history, ${nameOf(winner)}'s levels (relevance ${wb.relevanceLevel} of 3, intent ${wb.commercialIntentLevel} of 3) would bid ${amt(wb)} USDC; with history (relevance ${wh.relevanceLevel} of 3, intent ${wh.commercialIntentLevel} of 3) it bid ${amt(wh)} USDC. Only the answer with history competed. One observation per arm; not a measured lift.`}
        </Ld.Callout>
      ) : null}
    </StagePanel>
  );
}

// 5 ---------------------------------------------------------------
/** Why the bids tie, in plain words, and what history changed. Data unchanged. */
function TieExplainer({ o }: { o: Opportunity }) {
  const w = o.auction.winnerCampaignId!;
  const b = decisionFor(o, w, "text_only");
  const h = decisionFor(o, w, "history")!;
  const amt = (d: Decision) => usdc(((BigInt(run.policy.maxBidBaseUnits) * BigInt(bpsFor(d.relevanceLevel, d.commercialIntentLevel) ?? 0)) / BigInt(10000)).toString());
  const changed = b && (b.relevanceLevel !== h.relevanceLevel || b.commercialIntentLevel !== h.commercialIntentLevel);
  return (
    <Ld.Callout title="Why the bids are equal">
      Both wallets declared the same capabilities, offered the same 0.004 USDC max bid, and got the same ratings (relevance {h.relevanceLevel} of 3, intent {h.commercialIntentLevel} of 3), so the bid table gave them the same bid. A fixed <Term title={GLOSSARY.tieRule.term} def={GLOSSARY.tieRule.def}>tie rule</Term>, fixed in the exchange code before the run, decides: the lower campaign ID wins, so {nameOf(w)}.{" "}
      {b
        ? changed
          ? `With history ${nameOf(w)}'s levels rose from ${b.relevanceLevel} and ${b.commercialIntentLevel} to ${h.relevanceLevel} and ${h.commercialIntentLevel}, so the bid table gave ${amt(h)} USDC instead of ${amt(b)}. One observation per arm; not a measured lift.`
          : `History made no difference here: with and without it the bid table gave ${amt(h)} USDC.`
        : null}{" "}
      For a frequency-cap exclusion, see <a className="ld-link" href="/opportunity/3/#auction">opportunity 3</a>.
    </Ld.Callout>
  );
}

export function AuctionPanel({ o }: { o: Opportunity }) {
  const max = Number(run.policy.maxBidBaseUnits);
  const active = o.auction.bids.map((b) => b.levels);
  return (
    <StagePanel n={5} title="Auction" sub="Code turns levels into a bid: a share of the campaign's max bid. Highest bid wins; the model never names a price." inspectPayload={inspect.auction(o)}>
      <div className="op2-bidtable">
        {run.policy.bidTable.map((r) => (
          <div key={r.levels} data-active={active.includes(r.levels) || undefined}>
            <span className="ld-caption">{levelsWords(r.levels).replace(/^r/, "R")}</span>
            <span className="ld-stat-v">{r.bps / 100}%</span>
            <span className="ld-caption">{usdc((max * r.bps) / 10000)}</span>
          </div>
        ))}
      </div>
      <Ld.BidBars
        reveal
        max={max}
        floor={Number(o.floorBaseUnits)}
        format={(v) => usdc(v)}
        rows={run.campaigns.map((c) => {
          const b = o.auction.bids.find((x) => x.campaignId === c.campaignId);
          const capped = o.auction.notAdmitted.some((x) => x.campaignId === c.campaignId);
          const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
          return {
            key: c.campaignId,
            label: c.businessName,
            sub: b ? levelsWords(b.levels) : capped ? "agent said bid" : "excluded by rule",
            value: b ? Number(b.amountBaseUnits) : null,
            winner: c.campaignId === o.auction.winnerCampaignId,
            note: capped ? "Not admitted: frequency cap" : ex ? `Missing ${ex.missing.map(plain).join(", ")}` : "No bid",
          };
        })}
      />
      <div className="ld-cols-3">
        <Ld.Stat label="Winner" value={nameOf(o.auction.winnerCampaignId)} caption={o.auction.tieBreakApplied ? "Won on the tie-break" : o.auction.bids.length === 1 ? "Only bidder" : "Highest bid"} />
        <Ld.Stat label="Price" value={`${usdc(o.award!.priceBaseUnits)} USDC`} caption="Test USDC; first price, the winner pays its own bid" />
        <Ld.Stat label="Rule" value="Bid table v1" caption="Sealed, first price, floor 0.001 USDC" />
      </div>
      {o.auction.tieBreakApplied ? <TieExplainer o={o} /> : null}
      {o.auction.notAdmitted.length ? (
        <Ld.Callout tone="warning" title="A rule kept a bidder out. Agent said bid. Exchange did not admit it.">
          ClearVault had already been placed twice in this session, so the frequency cap kept it out of the auction (no bid, no amount). KeyForge, the only admitted bidder, won at {usdc(o.award!.priceBaseUnits)} USDC with {levelsWords(o.auction.bids[0].levels)}.
        </Ld.Callout>
      ) : null}
    </StagePanel>
  );
}

// 6 ---------------------------------------------------------------
export function AwardPanel({ o }: { o: Opportunity }) {
  const a = o.award!;
  return (
    <StagePanel n={6} title="Award, not a charge yet" sub="The winner's card is reserved for the slot. Budget is held; nothing is owed until the app proves delivery." inspectPayload={inspect.award(o)}>
      <div className="ld-cols-2">
        <Ld.FlowTile step="Reserved" title={nameOf(a.campaignId)} state={<Ld.Money state="reserved" label="Reserved, not owed" />} value={`${usdc(a.priceBaseUnits)} USDC`}>
          <span className="ld-caption">Test USDC held against the campaign's cap</span>
        </Ld.FlowTile>
        <Ld.FlowTile step="Expires" title={utc(a.expiresAt)}>
          <span className="ld-caption">Exchange clock. An undelivered award would expire and release the budget.</span>
        </Ld.FlowTile>
      </div>
      <Ld.FlowTile step="Creative" title="The approved card, unchanged">
        <Ld.SponsoredCard text={a.creative.approvedText} advertiser={nameOf(a.campaignId)} url={a.creative.destinationURL} />
        <LiveHashV2 value={a.creative} expected={a.creativeHash} label="Creative hash recomputed here" />
      </Ld.FlowTile>
    </StagePanel>
  );
}

// 7 ---------------------------------------------------------------
export function DeliveryPanel({ o }: { o: Opportunity }) {
  const d = o.delivery!;
  return (
    <StagePanel n={7} title="Delivery" sub="The app inserted the approved card with its Sponsored label and acknowledged it." inspectPayload={inspect.delivery(o)}>
      <div className="ld-flow">
        <Ld.FlowTile step="Card inserted" title={d.acknowledgement.domInserted ? "Yes" : "No"} state={<Ld.Verified state={d.acknowledgement.domInserted ? "pass" : "fail"}>Recorded by the app</Ld.Verified>} />
        <Ld.FlowTile step="Sponsored label shown" title={d.acknowledgement.sponsoredLabelPresent ? "Yes" : "No"} state={<Ld.Verified state={d.acknowledgement.sponsoredLabelPresent ? "pass" : "fail"}>Recorded by the app</Ld.Verified>} />
        <Ld.FlowTile step="Received" title={`+${(d.msAfterAward / 1000).toFixed(1)} s after the award`}>
          <span className="ld-caption">Recorded, exchange clock {utc(d.receivedAt)}</span>
        </Ld.FlowTile>
      </div>
      <LiveHashV2 value={{ awardId: o.award!.id, creativeHash: o.award!.creativeHash, domInserted: d.acknowledgement.domInserted, sponsoredLabelPresent: d.acknowledgement.sponsoredLabelPresent }} expected={d.renderAcknowledgementHash} label="Acknowledgement hash recomputed here" />
    </StagePanel>
  );
}

// 8 ---------------------------------------------------------------
export function ReceiptPanel({ o }: { o: Opportunity }) {
  const r = o.receipt!;
  return (
    <StagePanel n={8} title="Signed receipt" sub="The app signed what it did with its own key. Your browser checks the signature now." inspectPayload={inspect.receipt(o)}>
      <Ld.ReceiptCard
        title="Publisher receipt"
        keyId={<>Signed with key <span className="ld-mono">{r.fields.publisherKeyId}</span></>}
        rows={[
          { k: "Statement", v: "Inserted the awarded card with its Sponsored label" },
          { k: "For", v: `Opportunity ${o.n}, ${nameOf(o.award!.campaignId)}'s card` },
          { k: "Publisher", v: run.publisher.displayName },
          { k: "Mode", v: r.fields.mode, mono: true },
          { k: "Receipt hash", v: `${r.receiptHash.slice(0, 20)}…`, mono: true },
          { k: "Signature", v: `${r.signature.slice(0, 20)}…`, mono: true },
        ]}
        checks={
          <>
            <LiveHashV2 value={r.fields} expected={r.receiptHash} label="Receipt hash recomputed here" />
            <LiveSignatureV2 fields={r.fields} signature={r.signature} pem={run.publisher.publicKeyPEM} />
          </>
        }
        caption="This proves the app's assertion that it inserted a labelled card, not that a person read it."
      />
    </StagePanel>
  );
}

// 9 ---------------------------------------------------------------
export function ChargePanel({ o }: { o: Opportunity }) {
  const c = o.charge!;
  const v = o.voucher!;
  const ch = run.channels.find((x) => x.channelId === c.channelId)!;
  const cap = Number(campaign(c.campaignId).budgetCapBaseUnits);
  return (
    <StagePanel n={9} title="Charge and voucher" sub={<>Only an accepted, signed delivery becomes a charge. The charge advances the advertiser's <Term title={GLOSSARY.channel.term} def={GLOSSARY.channel.def}>payment channel</Term> with an off-chain <Term title={GLOSSARY.voucher.term} def={GLOSSARY.voucher.def}>voucher</Term>.</>} inspectPayload={inspect.charge(o)}>
      <div className="ld-flow">
        <Ld.FlowTile step="Charge" title={`Charge ${c.sequence} on ${nameOf(c.campaignId)}'s payment channel`} state={<Ld.Money state="accepted" label="Accepted" />} value={`${usdc(c.amountBaseUnits)} USDC`} />
        <Ld.FlowTile step={`Voucher ${v.sequence}`} title="Cumulative authorization" state={<Ld.Money state="authorized" label="Authorized in total" />} value={`${usdc(v.cumulativeAmountBaseUnits)} USDC`}>
          {v.sequence > 1 ? <span className="ld-caption">Replaces voucher {v.sequence - 1}: {usdc(v.cumulativeAmountBaseUnits)} in total, not {usdc(v.cumulativeAmountBaseUnits)} more.</span> : <span className="ld-caption">Nothing moves on chain until the channel closes.</span>}
        </Ld.FlowTile>
      </div>
      <Ld.Panel title={`${nameOf(c.campaignId)} vouchers so far`} sub="Cumulative authorization in test USDC, against the channel's deposit, with the campaign cap as a line">
        <Ld.StepChart max={Number(ch.depositBaseUnits)} cap={cap} format={(x) => usdc(x)} points={ch.vouchers.filter((x) => x.sequence <= v.sequence).map((x) => ({ key: String(x.sequence), label: `Voucher ${x.sequence}`, value: Number(x.cumulativeAmountBaseUnits) }))} />
      </Ld.Panel>
      <span>
        <Ld.Button variant="secondary" href={`/settlement/#${campaign(c.campaignId).slug}`} Link={L}>
          See it settle →
        </Ld.Button>
      </span>
    </StagePanel>
  );
}

export function NoFillPanel({ o }: { o: Opportunity }) {
  return (
    <Ld.Panel title="No agent was called" sub="Steps 3 to 9 did not run">
      <Ld.Empty title="No fill, decided in code">
        Every campaign was missing mobile software wallet, so no campaign could enter the auction and no agent was asked (0 calls). No auction, award, receipt or charge. The app still answered the question in full. On the exchange clock this question ran first, about 70 minutes before the others.
      </Ld.Empty>
    </Ld.Panel>
  );
}

export function stagePanels(o: Opportunity): ReactNode[] {
  if (o.status === "no_fill") return [<MomentPanel key="m" o={o} />, <EligibilityPanel key="e" o={o} />, <NoFillPanel key="nf" o={o} />];
  return [
    <MomentPanel key="m" o={o} />,
    <EligibilityPanel key="e" o={o} />,
    <EvidencePanel key="ev" o={o} />,
    <DecisionsPanel key="d" o={o} />,
    <AuctionPanel key="a" o={o} />,
    <AwardPanel key="aw" o={o} />,
    <DeliveryPanel key="dl" o={o} />,
    <ReceiptPanel key="r" o={o} />,
    <ChargePanel key="c" o={o} />,
  ];
}
