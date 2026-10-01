// Opportunity stage panels on Ledger v2. Plain language and visuals in the main view; IDs, hashes and raw
// records in the Inspector. Wording follows the data traps in docs/frontend/MVP_SPEC.md.
import Link from "next/link";
import type { ReactNode } from "react";
import { InspectButton, Ld } from "@axp/design-system/ledger";
import { campaign, decisionFor, evidenceHint, evidenceRecord, flagWords, nameOf, run, usdc } from "@/data/select";
import type { Decision, Opportunity } from "@/data/types";
import { armDiffSentence, inspect } from "@/components/opportunity/parts";
import { bpsFor } from "@/lib/policy.ts";
import { LiveHashV2, LiveSignatureV2 } from "./live";

const L = Link as unknown as Ld.LinkC;
const two = (n: number) => n.toFixed(2);
const utc = (ms: number) => `${new Date(ms).toISOString().slice(11, 19)} UTC`;
const plain = (s: string) => s.replace(/_/g, " ");

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
    return STAGES.map((s, i) =>
      i === 0
        ? { id: s.id, label: s.label, value: `${o.mandatoryCapabilities.length} required`, status: "done" as const }
        : i === 1
          ? { id: s.id, label: s.label, value: "0 of 3", status: "done" as const }
          : { id: s.id, label: s.label, value: "Did not run", status: "skipped" as const },
    );
  const method = o.decisions.find((d) => d.retrieval)?.retrieval?.method;
  const values = [
    `Floor ${usdc(o.floorBaseUnits)}`,
    `${o.eligibility.eligible.length} of 3`,
    method === "vector" ? "Seen before" : "Word overlap",
    `${o.decisions.length} calls`,
    o.auction.tieBreakApplied ? `Tie ${usdc(o.auction.bids[0].amountBaseUnits)}` : `${o.auction.bids.length} bid${o.auction.bids.length > 1 ? "s" : ""}`,
    `${usdc(o.award!.priceBaseUnits)} held`,
    `+${(o.delivery!.msAfterAward / 1000).toFixed(1)} s`,
    "Signed",
    usdc(o.charge!.amountBaseUnits),
  ];
  return STAGES.map((s, i) => ({ id: s.id, label: s.label, value: values[i], status: "done" as const }));
}

function StagePanel({ n, title, sub, inspectPayload, children }: { n: number; title: string; sub: ReactNode; inspectPayload?: Parameters<typeof InspectButton>[0]["payload"]; children: ReactNode }) {
  return (
    <Ld.Panel title={`${n}. ${title}`} sub={sub} actions={inspectPayload ? <InspectButton payload={inspectPayload}>Inspect record</InspectButton> : undefined}>
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
        <Ld.Stat label="Floor price" value={`${usdc(o.floorBaseUnits)} test USDC`} caption="Lowest bid the app accepts" />
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
            {o.softPreferences.map((c) => (
              <Ld.Tag key={c} tone="outline">
                {plain(c)}
              </Ld.Tag>
            ))}
          </span>
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
    <StagePanel n={2} title="Who may compete" sub="A rule in code, checked before any agent is asked: a campaign must declare every required capability." inspectPayload={inspect.eligibility(o)}>
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
      <span className="ld-caption">Funding is checked at auction time. Historical evidence never adds a capability.</span>
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
                <Ld.Tag>{hint.tier === "sparse" ? "Sparse: few supporting ads" : `Tier ${hint.tier}`}</Ld.Tag>
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
        {rt.neighbors.map((n, i) => {
          const r = evidenceRecord(n.associationIds[0]);
          return (
            <div key={i} className="op2-neighbor">
              <Ld.SimBar value={n.similarity} method={rt.method} />
              <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                “{r?.promptText}” <span className="ld-faint">· {r?.advertiser}{r && shown.has(r.id) ? ", shown above" : ""}</span>
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
    <StagePanel n={3} title="What each agent was shown" sub={<>Each agent got its own packet of <a className="ld-link" href="https://contexthint.com" target="_blank" rel="noopener noreferrer">ContextHint</a> history: past prompts, the ads that appeared beside them, and inferred targeting hints.</>}>
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
        Relevance level <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{d.relevanceLevel}</b> ({two(d.scores.relevance)}) · Intent level <b className="ld-strong" style={{ color: "var(--ld-text)" }}>{d.commercialIntentLevel}</b> ({two(d.scores.intent)})
      </span>
      <span className="ld-caption">
        {d.creative.choice === "no_fit" ? "Chose no fitting creative" : "Chose the approved card"} · {Math.round(d.elapsedMs)} ms recorded
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
    <StagePanel n={4} title="What each agent decided" sub="Decided with Jev. Each agent answers in levels: relevance (does the approved card fit?) and commercial intent (is the person comparing offers?). A level is the rounded score.">
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
                {c.campaignId === "v3-leatherguard" ? <Ld.Tag tone="dashed">Excluded by rule</Ld.Tag> : diff ? <Ld.Tag tone={diff.changed ? "brand" : undefined}>{diff.changed ? "Level changed" : "Unchanged"}</Ld.Tag> : null}
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
        <Ld.Callout tone="brand" title="What the bid table makes of each arm">
          {wb.relevanceLevel === wh.relevanceLevel && wb.commercialIntentLevel === wh.commercialIntentLevel
            ? `Both arms gave ${nameOf(winner)} levels ${wh.relevanceLevel}:${wh.commercialIntentLevel}, so the bid table gives ${amt(wh)} either way. Only the history arm competed.`
            : `Bid table applied to the baseline levels (${wb.relevanceLevel}:${wb.commercialIntentLevel}) would give ${amt(wb)}; the history arm (${wh.relevanceLevel}:${wh.commercialIntentLevel}) gives ${amt(wh)}. Only the history arm competed.`}
        </Ld.Callout>
      ) : null}
    </StagePanel>
  );
}

// 5 ---------------------------------------------------------------
export function AuctionPanel({ o }: { o: Opportunity }) {
  const max = Number(run.policy.maxBidBaseUnits);
  const active = o.auction.bids.map((b) => b.levels);
  return (
    <StagePanel n={5} title="Auction" sub="Code turns levels into a bid: a share of the campaign's max bid. Highest bid wins; the model never names a price." inspectPayload={inspect.auction(o)}>
      <div className="op2-bidtable">
        {run.policy.bidTable.map((r) => (
          <div key={r.levels} data-active={active.includes(r.levels) || undefined}>
            <span className="ld-caption">Levels {r.levels}</span>
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
            sub: b ? `levels ${b.levels}` : capped ? "agent said bid" : "excluded by rule",
            value: b ? Number(b.amountBaseUnits) : null,
            winner: c.campaignId === o.auction.winnerCampaignId,
            note: capped ? "Not admitted: frequency cap" : ex ? `Missing ${ex.missing.map(plain).join(", ")}` : "No bid",
          };
        })}
      />
      <div className="ld-cols-3">
        <Ld.Stat label="Winner" value={nameOf(o.auction.winnerCampaignId)} caption={o.auction.tieBreakApplied ? "Won on the tie-break" : o.auction.bids.length === 1 ? "Only bidder" : "Highest bid"} />
        <Ld.Stat label="Price" value={`${usdc(o.award!.priceBaseUnits)} test USDC`} caption="First price: the winner pays its own bid" />
        <Ld.Stat label="Rule" value="Bid table v1" caption="Sealed, first price, floor 0.001" />
      </div>
      {o.auction.tieBreakApplied ? <Ld.Callout title="Tie-break">Equal bids are ordered by campaign ID: v3-clearvault before v3-keyforge.</Ld.Callout> : null}
    </StagePanel>
  );
}

// 6 ---------------------------------------------------------------
export function AwardPanel({ o }: { o: Opportunity }) {
  const a = o.award!;
  return (
    <StagePanel n={6} title="Award, not a charge yet" sub="The winner's card is reserved for the slot. Budget is held; nothing is owed until the app proves delivery." inspectPayload={inspect.award(o)}>
      <div className="ld-flow">
        <Ld.FlowTile step="Reserved" title={nameOf(a.campaignId)} state={<Ld.Money state="reserved" label="Reserved, not owed" />} value={usdc(a.priceBaseUnits)}>
          <span className="ld-caption">Test USDC held against the campaign's cap</span>
        </Ld.FlowTile>
        <Ld.FlowTile step="Creative" title="The approved card, unchanged">
          <Ld.SponsoredCard text={a.creative.approvedText} advertiser={nameOf(a.campaignId)} url={a.creative.destinationURL} />
          <LiveHashV2 value={a.creative} expected={a.creativeHash} label="Creative hash recomputed here" />
        </Ld.FlowTile>
        <Ld.FlowTile step="Expires" title={utc(a.expiresAt)}>
          <span className="ld-caption">Exchange clock. An undelivered award would expire and release the budget.</span>
        </Ld.FlowTile>
      </div>
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
        keyId={`key ${r.fields.publisherKeyId}`}
        rows={[
          { k: "Statement", v: "Inserted the awarded card with its Sponsored label" },
          { k: "For", v: `Opportunity ${o.n}, ${nameOf(o.award!.campaignId)}'s card` },
          { k: "Publisher", v: `${run.publisher.displayName} (ID from an earlier prototype)` },
          { k: "Mode", v: "Hosted Solana sandbox" },
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
    <StagePanel n={9} title="Charge and voucher" sub="Only an accepted, signed delivery becomes a charge. The charge advances the advertiser's payment channel off chain." inspectPayload={inspect.charge(o)}>
      <div className="ld-flow">
        <Ld.FlowTile step="Charge" title={`Charge ${c.sequence} on ${nameOf(c.campaignId)}'s channel`} state={<Ld.Money state="accepted" label="Accepted" />} value={usdc(c.amountBaseUnits)} />
        <Ld.FlowTile step={`Voucher ${v.sequence}`} title="Cumulative authorization" state={<Ld.Money state="authorized" label="Authorized in total" />} value={usdc(v.cumulativeAmountBaseUnits)}>
          {v.sequence > 1 ? <span className="ld-caption">Replaces voucher {v.sequence - 1}: {usdc(v.cumulativeAmountBaseUnits)} in total, not {usdc(v.cumulativeAmountBaseUnits)} more.</span> : <span className="ld-caption">Nothing moves on chain until the channel closes.</span>}
        </Ld.FlowTile>
      </div>
      <Ld.Panel title={`${nameOf(c.campaignId)} vouchers`} sub="Cumulative authorization against the 0.008 cap, test USDC">
        <Ld.StepChart max={cap} format={(x) => usdc(x)} points={ch.vouchers.map((x) => ({ key: String(x.sequence), label: `#${x.sequence} · opp ${x.opportunityN}`, value: Number(x.cumulativeAmountBaseUnits) }))} />
      </Ld.Panel>
      <span>
        <Ld.Button variant="secondary" href={`/settlement/#${campaign(c.campaignId).slug}`} Link={L}>
          See it settle →
        </Ld.Button>
      </span>
    </StagePanel>
  );
}

export function NoFillPanel({ o, n }: { o: Opportunity; n: number }) {
  return (
    <Ld.Panel title={`${n}. Did not run`} sub="No fill">
      <Ld.Empty title="Steps 3 to 9 did not run">
        No agent was called (0 calls). No auction, award, receipt or charge. Every campaign was missing mobile software wallet, so the exchange answered with no fill in code. The app still answered the question in full. On the exchange clock this question ran first, about 70 minutes before the others.
      </Ld.Empty>
    </Ld.Panel>
  );
}

export function stagePanels(o: Opportunity): ReactNode[] {
  if (o.status === "no_fill") return [<MomentPanel key="m" o={o} />, <EligibilityPanel key="e" o={o} />, ...STAGES.slice(2).map((s, i) => <NoFillPanel key={s.id} o={o} n={i + 3} />)];
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
