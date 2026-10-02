// Server-rendered building blocks for the Opportunity screen and the /design showcase.
// Every value comes from the projection; wording follows the data traps in docs/frontend/MVP_SPEC.md.
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Amount,
  ArmDiff,
  AuctionBoard,
  AwardTicket,
  AwaitingSlot,
  BidTableGrid,
  Callout,
  CapabilityChips,
  ChargeLine,
  ClampText,
  CopyHash,
  DecisionCard,
  DecisionGrid,
  EligibilityMatrix,
  EvidencePacket,
  Handoff,
  HostChat,
  InferredHint,
  InspectButton,
  KeyValue,
  MethodBadge,
  MoneyStateMark,
  NeighborList,
  NoFillSlot,
  NotAdmittedStamp,
  ObservedRecord,
  Provenance,
  QualityFlags,
  ReceiptSheet,
  ScoreRuler,
  SponsoredCard,
  TieBreakNote,
  VoucherStep,
  Term,
  type InspectPayload,
} from "@axp/design-system/ledger";
import { LiveHash, LiveSignature } from "@/components/live";
import { ARM_LABEL, campaign, decisionFor, evidenceHint, evidenceRecord, flagWords, fmtMs, fmtSeconds, fmtUtc, nameOf, reasonWords, run, usdc } from "@/data/select";
import type { Decision, Opportunity } from "@/data/types";
import { bpsFor } from "@/lib/policy.ts";
import { GLOSSARY } from "@/data/glossary";
import { DISCLAIMER } from "@/lib/narrative.ts";

export const two = (n: number) => n.toFixed(2);
const opIndex = (o: Opportunity) => run.opportunities.findIndex((x) => x.n === o.n);
const T = ({ k, children }: { k: keyof typeof GLOSSARY; children: ReactNode }) => <Term title={GLOSSARY[k].term} def={GLOSSARY[k].def}>{children}</Term>;

// ---------- Inspector payloads ----------
export const inspect = {
  opportunity(o: Opportunity): InspectPayload {
    const { decisions, organic, award, receipt, charge, voucher, delivery, auction, eligibility, turnInput, ...moment } = o;
    return {
      key: `opportunity:${o.n}`,
      title: `Opportunity ${o.n}: the moment`,
      sourcePath: `state.exchange.opportunities[id=${o.opportunityId}]`,
      json: moment,
      hashes: [{ label: "Turn input hash", value: o.turnInputHash, recomputable: true }, ...(o.questionHash ? [{ label: "Question hash (sha256 of the question)", value: o.questionHash, recomputable: true }] : [])],
    };
  },
  organic(o: Opportunity): InspectPayload {
    return {
      key: `organic:${o.n}`,
      title: "Organic answer",
      sourcePath: `state.turns[turnId=${o.turnId}].organic`,
      json: o.organic,
      hashes: [
        { label: "Organic input hash", value: o.organic.inputHash, recomputable: false },
        { label: "Completion hash", value: o.organic.completionHash, recomputable: false },
      ],
      note: "The organic model received only the question and the instruction shown here. It received no advertiser material.",
    };
  },
  eligibility(o: Opportunity): InspectPayload {
    return { key: `eligibility:${o.n}`, title: "Eligibility", sourcePath: `state.turns[turnId=${o.turnId}].eligibility`, json: o.eligibility };
  },
  decision(o: Opportunity, d: Decision): InspectPayload {
    const { packet, ...rest } = d;
    return {
      key: `decision:${d.slotId}`,
      title: `${nameOf(d.campaignId)}, ${ARM_LABEL[d.arm].toLowerCase()}`,
      sourcePath: `state.turns[turnId=${o.turnId}].records[slotId=${d.slotId}]`,
      json: rest,
      hashes: [
        { label: "Raw model output hash", value: d.rawOutputHash, recomputable: false, note: "The raw output is not published; its hash is the recorded one." },
        { label: "Request hash", value: d.requestHash, recomputable: false },
      ],
      note: "Scores and probabilities are copied from the model's recorded output. The conversion field is never shown.",
    };
  },
  packet(o: Opportunity, d: Decision): InspectPayload {
    return {
      key: `packet:${d.slotId}`,
      title: `Exact packet sent: ${nameOf(d.campaignId)}, ${ARM_LABEL[d.arm].toLowerCase()}`,
      sourcePath: `state.turns[turnId=${o.turnId}].records[slotId=${d.slotId}].packet`,
      json: d.packet,
      note: "The intent rubric's level-3 wording (destination, dates or event) is inherited from an earlier prototype and was unchanged in this run.",
      hashes: [
        { label: "Packet hash", value: d.packetHash, recomputable: true },
        ...(d.bindings.retrievalHash ? [{ label: "Retrieval hash", value: d.bindings.retrievalHash, recomputable: false }] : []),
      ],
    };
  },
  auction(o: Opportunity): InspectPayload {
    return { key: `auction:${o.n}`, title: "Auction outcome", sourcePath: `state.exchange.opportunities[id=${o.opportunityId}].outcome`, json: o.auction };
  },
  award(o: Opportunity): InspectPayload {
    return {
      key: `award:${o.award!.id}`,
      title: "Award",
      sourcePath: `state.exchange.awards[id=${o.award!.id}]`,
      json: o.award,
      hashes: [{ label: "Creative hash", value: o.award!.creativeHash, recomputable: true }],
    };
  },
  delivery(o: Opportunity): InspectPayload {
    return {
      key: `delivery:${o.n}`,
      title: "Delivery acknowledgement",
      sourcePath: `state.exchange.charges[awardId=${o.award!.id}].delivery`,
      json: o.delivery,
      hashes: [{ label: "Render acknowledgement hash", value: o.delivery!.renderAcknowledgementHash, recomputable: true }],
      note: "The acknowledgement object is the one the exchange's contract hashes on delivery; its hash matches the one inside the signed receipt.",
    };
  },
  receipt(o: Opportunity): InspectPayload {
    return {
      key: `receipt:${o.receipt!.chargeId}`,
      title: "Signed publisher receipt",
      sourcePath: `receipts[awardId=${o.award!.id}]`,
      json: o.receipt,
      hashes: [
        { label: "Receipt hash", value: o.receipt!.receiptHash, recomputable: true },
        { label: "Ed25519 signature", value: o.receipt!.signature, recomputable: true, note: `Signed by ${run.publisher.publisherKeyId}.` },
      ],
      note: `publisherId "${o.receipt!.fields.publisherId}" is a legacy ID from an earlier prototype of the app. It stays because it is part of the signed data: changing it would break the signature.`,
    };
  },
  charge(o: Opportunity): InspectPayload {
    return {
      key: `charge:${o.charge!.id}`,
      title: "Charge and voucher",
      sourcePath: `state.exchange.charges[id=${o.charge!.id}] + state.payments[channelId=${o.charge!.channelId}].vouchers`,
      json: { charge: o.charge, voucher: o.voucher },
      hashes: [
        { label: "Voucher payload hash", value: o.voucher!.payloadHash, recomputable: false },
        { label: "Voucher record hash", value: o.voucher!.voucherRecordHash, recomputable: false },
      ],
    };
  },
};

// ---------- In the app ----------
export function AppSpecimen({ o, slot }: { o: Opportunity; slot: ReactNode }) {
  return (
    <HostChat
      appName={run.publisher.displayName}
      question={o.question}
      answerMeta={
        <>
          <Provenance kind="actual" />
          <span className="lg-data-sm">{o.organic.model}</span>
          <span>{o.organic.effort} effort, no advertiser material</span>
        </>
      }
      answer={<ClampText text={o.organic.answer} lines={7} />}
      slot={slot}
      caption={
        <span className="lg-row" style={{ justifyContent: "space-between" }}>
          <span>Owned reference publisher app, specimen</span>
          <InspectButton payload={inspect.organic(o)} variant="text">
            Inspect answer
          </InspectButton>
        </span>
      }
    />
  );
}

export function WinnerCard({ o, enter }: { o: Opportunity; enter?: boolean }) {
  const c = campaign(o.award!.campaignId);
  return <SponsoredCard text={o.award!.creative.approvedText} advertiser={c.businessName} url={o.award!.creative.destinationURL} enter={enter} />;
}
export function SlotAwaiting() {
  return <AwaitingSlot />;
}
export function SlotNoFill() {
  return <NoFillSlot />;
}

// ---------- Step 1: the moment ----------
export function MomentStep({ o }: { o: Opportunity }) {
  const o1 = run.opportunities[0];
  return (
    <>
      <KeyValue
        rows={[
          { k: "Opportunity", v: <span className="lg-data">{o.opportunityId}</span> },
          { k: "Coarse intent", v: <span className="lg-data">{o.coarseIntent}</span> },
          { k: "Required", v: <CapabilityChips caps={o.mandatoryCapabilities.map((c) => ({ name: c, state: "required" as const }))} /> },
          { k: "Soft preferences", v: <CapabilityChips caps={o.softPreferences.map((c) => ({ name: c, state: "soft" as const }))} /> },
          { k: <T k="floor">Floor</T>, v: <Amount baseUnits={o.floorBaseUnits} /> },
          { k: "Slot", v: <span className="lg-data">{o.slotId}</span> },
          { k: "Created", v: <span><span className="lg-data">{fmtUtc(o.createdAt)}</span> <span className="lg-small">exchange clock</span></span> },
        ]}
      />
      {o.scenarioId === "repeat" ? (
        <Callout title="Same question, fresh answer">
          <p>
            The app sent the same organic input as opportunity 1 (input hash <span className="lg-data-sm">{o.organic.inputHash.slice(0, 10)}…</span>) and got a fresh completion (
            <span className="lg-data-sm">{o.organic.completionHash.slice(0, 10)}…</span> here, <span className="lg-data-sm">{o1.organic.completionHash.slice(0, 10)}…</span> before). The app bridge is not a cache.
          </p>
        </Callout>
      ) : null}
      <div className="lg-row">
        <InspectButton payload={inspect.opportunity(o)} />
      </div>
    </>
  );
}

// ---------- Step 2: who may compete ----------
export function EligibilityStep({ o }: { o: Opportunity }) {
  return (
    <>
      <EligibilityMatrix
        required={o.mandatoryCapabilities}
        rows={run.campaigns.map((c) => {
          const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
          const reason = ex
            ? ex.reason === "missing_constraint"
              ? <>Missing <span className="lg-data-sm lg-break">{ex.missing.join(", ")}</span></>
              : ex.reason === "frequency_cap"
                ? "Frequency cap: placed twice this session"
                : reasonWords(ex.reason)
            : "Declares every required capability";
          return { key: c.campaignId, name: c.businessName, declared: c.declaredConstraints, eligible: !ex, reason };
        })}
      />
      <p className="lg-small">
        Funding is checked at auction time, not here. <T k="eligibility">Eligibility</T> uses only advertiser declarations; historical evidence cannot add a capability.
      </p>
      <div className="lg-row">
        <InspectButton payload={inspect.eligibility(o)} />
      </div>
    </>
  );
}

// ---------- Step 3: evidence ----------
export function SimilarityLabel({ method, value }: { method: string; value: number }) {
  return (
    <span className="lg-row" style={{ gap: 6 }}>
      <span className="lg-small">{method === "vector" ? <T k="cosine">cosine</T> : <T k="lexical">overlap score</T>}</span>
      <span className="lg-data-sm">{value.toFixed(3)}</span>
    </span>
  );
}

export function EvidencePanel({ o, d }: { o: Opportunity; d: Decision }) {
  const rt = d.retrieval!;
  const vector = rt.method === "vector";
  const shownIds = new Set(rt.examples.map((e) => e.id));
  return (
    <EvidencePacket
      title={`${nameOf(d.campaignId)}'s agent, with history`}
      method={<MethodBadge method={rt.method} detail={vector ? `cosine, BGE-768, cached` : "word overlap, not semantic"} />}
      footer={
        <>
        <Handoff to={`Handed to ${nameOf(d.campaignId)}'s agent`} />
        <div className="lg-row" style={{ justifyContent: "space-between" }}>
          <span className="lg-row" style={{ gap: 10 }}>
            <span className="lg-label">Packet hash</span>
            <CopyHash value={d.packetHash} label="packet hash" />
          </span>
          <span className="lg-row" style={{ gap: 12 }}>
            <LiveHash value={d.packet} expected={d.packetHash} label="Packet hash" />
            <InspectButton payload={inspect.packet(o, d)}>View exact packet sent</InspectButton>
          </span>
        </div>
        </>
      }
    >
      {rt.examples.map((e) => {
        const r = evidenceRecord(e.id)!;
        return <ObservedRecord key={e.id} id={`evidence-${e.id}`} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} similarity={<SimilarityLabel method={rt.method} value={e.similarity} />} />;
      })}
      {rt.hintIds.map((h) => {
        const hint = evidenceHint(h)!;
        return <InferredHint key={h} id={`evidence-${h}`} text={hint.text} tier={`tier ${hint.tier}, ${hint.supportingCreativeCount} supporting creative${hint.supportingCreativeCount === 1 ? "" : "s"}`} flags={hint.qualityFlags.map(flagWords)} />;
      })}
      <div className="lg-stack-sm">
        <span className="lg-label">Nearest prompts in the screened slice ({vector ? "cosine" : "overlap score"})</span>
        <NeighborList
          items={rt.neighbors.map((n, i) => {
            const r = evidenceRecord(n.associationIds[0]);
            return {
              key: `${i}`,
              similarity: n.similarity,
              text: (
                <span>
                  {r?.promptText}
                  {r ? <span className="lg-muted"> · {r.advertiser}{shownIds.has(r.id) ? ", shown above" : ""}{n.associationIds.length > 1 ? ` and ${n.associationIds.length - 1} more` : ""}</span> : null}
                </span>
              ),
            };
          })}
        />
      </div>
      <div className="lg-stack-sm">
        <span className="lg-label">Quality flags</span>
        <QualityFlags flags={rt.qualityFlags.map(flagWords)} />
      </div>
    </EvidencePacket>
  );
}

export function EvidenceHook({ o }: { o: Opportunity }) {
  const d = decisionFor(o, "v3-clearvault", "history");
  const ex = d?.retrieval?.examples[0];
  const r = ex ? evidenceRecord(ex.id) : undefined;
  if (!d || !r || !ex) return null;
  if (d.retrieval!.method === "vector" && ex.similarity === 1)
    return (
      <Callout tone="ink" title="ContextHint had seen this exact question before">
        <p>
          Cosine similarity <span className="lg-data-sm">1.000</span> to an observed prompt that drew a <strong>{r.advertiser}</strong> listing: “{r.creativeText.replace(`${r.advertiser} `, "").split(" | ")[0]}”. Agents get that history as evidence. Real brands are past observations, not bidders.
        </p>
      </Callout>
    );
  return (
    <Callout title="This question was not in the history">
      <p>
        No stored vector exists for this wording, so retrieval fell back to word overlap. Scores here are an <strong>overlap score</strong>, not semantic similarity. The closest observed prompt shares words with the question at <span className="lg-data-sm">{ex.similarity.toFixed(3)}</span>.
      </p>
    </Callout>
  );
}

// ---------- Step 4: decisions ----------
function DecisionCell({ o, d }: { o: Opportunity; d: Decision | undefined }) {
  if (!d) return <span className="lg-small">No call in this arm</span>;
  const notAdmitted = o.auction.notAdmitted.find((x) => x.campaignId === d.campaignId);
  const role =
    d.auctionRole === "research"
      ? "Research arm, never auctioned"
      : d.auctionRole === "competed"
        ? "Competed in the auction"
        : d.auctionRole === "excluded"
          ? "Cannot enter the auction: excluded by rule"
          : null;
  const creative = d.creative.choice === "no_fit" ? `Chose no fit (p ${two(d.creative.noFitProbability ?? 0)})` : `Chose the approved card (p ${two(d.creative.probability ?? 0)})`;
  return (
    <DecisionCard
      id={`decision-${d.campaignId.replace("v3-", "")}-${d.arm === "history" ? "history" : "baseline"}`}
      verdict={d.decision}
      levels={`${d.relevanceLevel}:${d.commercialIntentLevel}`}
      scores={
        <>
          relevance <span className="lg-data-sm">{two(d.scores.relevance)}</span> · intent <span className="lg-data-sm">{two(d.scores.intent)}</span>
        </>
      }
      creative={creative}
      elapsed={fmtMs(d.elapsedMs)}
      tokens={`${d.usage.inputTokens} in / ${d.usage.outputTokens} out`}
      role={role}
      footer={
        <>
          {notAdmitted ? <NotAdmittedStamp detail={`Frequency cap: ${nameOf(d.campaignId)} was already placed twice in this session (${notAdmitted.sessionAwards} of ${notAdmitted.frequencyCap}). No bid, no amount.`} /> : null}
          <span className="lg-row" style={{ gap: 8 }}>
            <InspectButton payload={inspect.decision(o, d)} variant="text">
              Inspect
            </InspectButton>
          </span>
        </>
      }
    />
  );
}

export function DecisionsGrid({ o }: { o: Opportunity }) {
  const paired = o.decisions.some((d) => d.arm === "text_only");
  const columns = paired
    ? [
        { key: "base", title: "Baseline", sub: "question and campaign only; research arm, never auctioned" },
        { key: "hist", title: "With history", sub: "plus ContextHint evidence; this arm competed" },
      ]
    : [{ key: "hist", title: "With history", sub: "repeat question: history arm only" }];
  return (
    <DecisionGrid
      columns={columns}
      rows={run.campaigns.map((c) => ({
        key: c.campaignId,
        name: c.businessName,
        cells: paired ? [<DecisionCell key="b" o={o} d={decisionFor(o, c.campaignId, "text_only")} />, <DecisionCell key="h" o={o} d={decisionFor(o, c.campaignId, "history")} />] : [<DecisionCell key="h" o={o} d={decisionFor(o, c.campaignId, "history")} />],
      }))}
    />
  );
}

/** The fixed honest wording for what history changed for one campaign, from the recorded scores. */
export function armDiffSentence(o: Opportunity, campaignId: string): { changed: boolean; text: string } | null {
  const b = decisionFor(o, campaignId, "text_only");
  const h = decisionFor(o, campaignId, "history");
  if (!b || !h) return null;
  const name = nameOf(campaignId);
  const intentChanged = b.commercialIntentLevel !== h.commercialIntentLevel;
  const relChanged = b.relevanceLevel !== h.relevanceLevel;
  const verdictSame = b.decision === h.decision;
  const parts = [
    intentChanged
      ? `With history, ${name}'s intent score moved ${two(b.scores.intent)} to ${two(h.scores.intent)}, just enough to ${h.commercialIntentLevel > b.commercialIntentLevel ? "raise" : "change"} its level from ${b.commercialIntentLevel} to ${h.commercialIntentLevel}.`
      : `With history, ${name}'s intent score moved ${two(b.scores.intent)} to ${two(h.scores.intent)}; both count as level ${h.commercialIntentLevel}.`,
    relChanged ? `Relevance moved ${two(b.scores.relevance)} to ${two(h.scores.relevance)}: level ${b.relevanceLevel} to ${h.relevanceLevel}.` : `Relevance stayed at level ${h.relevanceLevel}.`,
    verdictSame ? `Its answer stayed ${h.decision}.` : `Its answer changed from ${b.decision} to ${h.decision}.`,
    DISCLAIMER,
  ];
  return { changed: intentChanged || relChanged || !verdictSame, text: parts.join(" ") };
}

export function IntentRuler({ o, campaignId }: { o: Opportunity; campaignId: string }) {
  const b = decisionFor(o, campaignId, "text_only");
  const h = decisionFor(o, campaignId, "history");
  const marks = [
    ...(b ? [{ value: b.scores.intent, kind: "baseline" as const, label: "Baseline" }] : []),
    ...(h ? [{ value: h.scores.intent, kind: "history" as const, label: "With history" }] : []),
  ];
  return <ScoreRuler min={1.5} max={3} ticks={[2, 3]} roundLines={[2.5]} keyLine={2.5} marks={marks} caption="Intent score; level = rounded score" />;
}

export function ArmDiffs({ o }: { o: Opportunity }) {
  const ids = ["v3-clearvault", "v3-keyforge"];
  return (
    <div className="lg-grid-2">
      {ids.map((id) => {
        const s = armDiffSentence(o, id);
        if (!s) return null;
        return (
          <ArmDiff key={id} id={`armdiff-${id.replace("v3-", "")}`} title={`What history changed for ${nameOf(id)}`} changed={s.changed} ruler={<IntentRuler o={o} campaignId={id} />}>
            {s.text}
          </ArmDiff>
        );
      })}
    </div>
  );
}

export function PolicyLine({ o }: { o: Opportunity }) {
  const winner = o.award?.campaignId;
  if (!winner) return null;
  const b = decisionFor(o, winner, "text_only");
  const h = decisionFor(o, winner, "history");
  if (!b || !h) return null;
  const c = campaign(winner);
  const amt = (d: Decision) => usdc(((BigInt(c.maxBidBaseUnits) * BigInt(bpsFor(d.relevanceLevel, d.commercialIntentLevel) ?? 0)) / BigInt(10000)).toString());
  const same = b.relevanceLevel === h.relevanceLevel && b.commercialIntentLevel === h.commercialIntentLevel;
  return (
    <Callout title="What the bid table makes of each arm">
      <p>
        {same ? (
          <>
            Both arms gave {nameOf(winner)} levels {h.relevanceLevel}:{h.commercialIntentLevel}, so the bid table gives <span className="lg-data-sm">{amt(h)}</span> either way. Only the history arm competed.
          </>
        ) : (
          <>
            Bid table applied to the baseline levels ({b.relevanceLevel}:{b.commercialIntentLevel}) would give <span className="lg-data-sm">{amt(b)}</span>; the history arm ({h.relevanceLevel}:{h.commercialIntentLevel}) gives <span className="lg-data-sm">{amt(h)}</span>. Only the history arm competed.
          </>
        )}
      </p>
    </Callout>
  );
}

export function LeatherGuardLine({ o }: { o: Opportunity }) {
  const ds = o.decisions.filter((d) => d.campaignId === "v3-leatherguard");
  if (!ds.length) return null;
  const rels = ds.map((d) => two(d.scores.relevance)).join(" and ");
  return (
    <Callout title="LeatherGuard was blocked twice">
      <p>
        By rule, it is missing <span className="lg-data-sm">crypto_storage</span>, so it cannot enter the auction. Its own agent also said no fit {ds.length > 1 ? "in both arms" : ""} (relevance {rels}, level {ds[0].relevanceLevel}). Its history packet matched crypto prompts to leather and RFID wallet ads: the word “wallet” is ambiguous. Evidence cannot add a capability.
      </p>
    </Callout>
  );
}

export function RepeatRulers({ o }: { o: Opportunity }) {
  const kf = decisionFor(o, "v3-keyforge", "history")!;
  const cv = decisionFor(o, "v3-clearvault", "history")!;
  return (
    <div className="lg-grid-2">
      <div className="lg-armdiff">
        <div className="lg-armdiff-top">
          <span className="lg-h3">KeyForge, just under the line</span>
          <span className="lg-stamp" data-tone="outline" style={{ padding: "4px 10px", fontSize: 13 }}>
            Level {kf.commercialIntentLevel}
          </span>
        </div>
        <ScoreRuler min={1.5} max={3} ticks={[2, 3]} roundLines={[2.5]} keyLine={2.5} marks={[{ value: kf.scores.intent, kind: "history", label: "With history" }]} caption="Intent score" />
        <p>
          KeyForge's intent score was {two(kf.scores.intent)}, just under the 2.5 rounding line: level {kf.commercialIntentLevel}. With relevance level {kf.relevanceLevel}, the bid table gives 75% of its max bid.
        </p>
      </div>
      <div className="lg-armdiff">
        <div className="lg-armdiff-top">
          <span className="lg-h3">ClearVault, capped by rule</span>
          <span className="lg-stamp" style={{ padding: "4px 10px", fontSize: 13 }}>
            Not admitted
          </span>
        </div>
        <ScoreRuler min={1.5} max={3} ticks={[2, 3]} roundLines={[2.5]} keyLine={2.5} marks={[{ value: cv.scores.intent, kind: "history", label: "With history" }]} caption="Intent score" />
        <p>
          ClearVault's agent judged this moment at levels {cv.relevanceLevel}:{cv.commercialIntentLevel} and said bid. The frequency cap is a rule, not the agent: the exchange did not admit the decision, so it has no bid row and no amount.
        </p>
      </div>
    </div>
  );
}

// ---------- Step 5: auction ----------
export function auctionRows(o: Opportunity) {
  const winner = o.auction.winnerCampaignId;
  return run.campaigns.map((c) => {
    const bid = o.auction.bids.find((b) => b.campaignId === c.campaignId);
    const na = o.auction.notAdmitted.find((x) => x.campaignId === c.campaignId);
    const rej = o.auction.rejections.find((r) => r.campaignId === c.campaignId);
    if (bid) {
      const won = bid.campaignId === winner;
      return {
        key: c.campaignId,
        name: c.businessName,
        levels: bid.levels ?? "",
        formula: `${usdc(bid.maxBidBaseUnits)} × ${(bid.bps ?? 0) / 100}% =`,
        amount: usdc(bid.amountBaseUnits),
        status: won ? <strong>Won{o.auction.tieBreakApplied ? " on the tie-break" : o.auction.bids.length === 1 ? ", sole bidder" : ""}</strong> : o.auction.tieBreakApplied ? "Equal bid, lost the tie-break" : "Lost",
        winner: won,
      };
    }
    return {
      key: c.campaignId,
      name: c.businessName,
      levels: na?.levels ?? "",
      formula: na ? "not admitted, no bid" : "no bid",
      amount: null,
      status: na ? "Frequency cap (2 of 2)" : rej ? (rej.reason === "missing_constraint" ? `Excluded: missing ${o.eligibility.excluded.find((x) => x.campaignId === c.campaignId)?.missing.join(", ")}` : reasonWords(rej.reason)) : "",
      out: true,
    };
  });
}

export function AuctionBoardFor({ o }: { o: Opportunity }) {
  return (
    <AuctionBoard
      rows={auctionRows(o)}
      floor={
        <>
          <Provenance kind="policy" label="Floor" />
          <Amount baseUnits={o.floorBaseUnits} />
          <span>Bids below the floor are rejected. The winner pays its own bid.</span>
        </>
      }
      footer={o.auction.tieBreakApplied ? <TieBreakNote>Equal bids are ordered by campaign ID: v3-clearvault before v3-keyforge.</TieBreakNote> : undefined}
    />
  );
}

export function AuctionStep({ o }: { o: Opportunity }) {
  const activeLevels = o.auction.bids.map((b) => b.levels ?? "");
  return (
    <>
      <BidTableGrid rows={run.policy.bidTable} active={activeLevels} maxBid={run.policy.maxBidBaseUnits} />
      <AuctionBoardFor o={o} />
      <div className="lg-row">
        <InspectButton payload={inspect.auction(o)} />
        <span className="lg-small">
          Rule: <span className="lg-data-sm">{run.policy.bidPolicy}</span>, <T k="firstPrice">first price</T>, sealed.
        </span>
      </div>
    </>
  );
}

// ---------- Steps 6 to 9 ----------
export function AwardStep({ o }: { o: Opportunity }) {
  const a = o.award!;
  return (
    <AwardTicket
      state={<MoneyStateMark state="reserved" />}
      note="Budget is reserved. Nothing is owed until the app proves delivery."
    >
      <KeyValue
        dense
        rows={[
          { k: "Award", v: <span className="lg-data-sm">{a.id}</span> },
          { k: "Winner", v: nameOf(a.campaignId) },
          { k: "Price", v: <Amount baseUnits={a.priceBaseUnits} /> },
          { k: "Creative hash", v: <span className="lg-stack-sm" style={{ gap: 6 }}><CopyHash value={a.creativeHash} label="creative hash" /><LiveHash value={a.creative} expected={a.creativeHash} label="Creative hash" /></span> },
          { k: "Expires", v: <span><span className="lg-data-sm">{fmtUtc(a.expiresAt)}</span> <span className="lg-small">exchange clock</span></span> },
        ]}
      />
      <div className="lg-row">
        <InspectButton payload={inspect.award(o)} />
      </div>
    </AwardTicket>
  );
}

export function DeliveryStep({ o }: { o: Opportunity }) {
  const d = o.delivery!;
  return (
    <>
      <KeyValue
        rows={[
          { k: "Card inserted", v: <span className="lg-data">domInserted: {String(d.acknowledgement.domInserted)}</span> },
          { k: "Sponsored label", v: <span className="lg-data">sponsoredLabelPresent: {String(d.acknowledgement.sponsoredLabelPresent)}</span> },
          { k: "Acknowledgement", v: <span className="lg-stack-sm" style={{ gap: 6 }}><CopyHash value={d.renderAcknowledgementHash} label="acknowledgement hash" /><LiveHash value={{ awardId: o.award!.id, creativeHash: o.award!.creativeHash, domInserted: d.acknowledgement.domInserted, sponsoredLabelPresent: d.acknowledgement.sponsoredLabelPresent }} expected={d.renderAcknowledgementHash} label="Acknowledgement hash" /></span> },
          { k: "Received", v: <span><span className="lg-data-sm">{fmtUtc(d.receivedAt)}</span> <span className="lg-data-sm">{fmtSeconds(d.msAfterAward)}</span> <span className="lg-small">after the award, recorded</span></span> },
        ]}
      />
      <div className="lg-row">
        <InspectButton payload={inspect.delivery(o)} />
      </div>
    </>
  );
}

export function ReceiptStep({ o }: { o: Opportunity }) {
  const r = o.receipt!;
  const f = r.fields;
  const order: Array<keyof typeof f> = ["schemaVersion", "runId", "mode", "publisherId", "publisherKeyId", "awardId", "opportunityId", "creativeHash", "nonce", "renderAcknowledgementHash"];
  return (
    <ReceiptSheet
      title={<T k="receipt">Publisher receipt</T>}
      meta={<span className="lg-data-sm">{f.publisherKeyId}</span>}
      checks={
        <>
          <LiveHash value={f} expected={r.receiptHash} label="Receipt hash" />
          <LiveSignature fields={f} signature={r.signature} publicKeyPEM={run.publisher.publicKeyPEM} />
          <InspectButton payload={inspect.receipt(o)} variant="text">
            Inspect
          </InspectButton>
        </>
      }
      caption="This proves the app's assertion that it inserted a labelled card, not that a person read it."
    >
      <KeyValue
        dense
        rows={order.map((k) => ({
          key: k,
          k: k,
          v: <span className="lg-data-sm lg-break">{f[k]}{k === "publisherId" ? <sup className="lg-small"> 1</sup> : null}</span>,
        }))}
      />
      <p className="lg-small" style={{ padding: "8px 0 4px" }}>
        1. Shown elsewhere as “{run.publisher.displayName}”. {run.publisher.legacyIdNote}
      </p>
    </ReceiptSheet>
  );
}

export function ChargeStep({ o }: { o: Opportunity }) {
  const c = o.charge!;
  const v = o.voucher!;
  const ch = campaign(c.campaignId);
  return (
    <>
      <ChargeLine state="accepted" amount={c.amountBaseUnits} meta={<>Charge {c.sequence} on <span className="lg-data-sm">{c.channelId}</span>, accepted <span className="lg-data-sm">{fmtUtc(c.acceptedAt)}</span></>} />
      <VoucherStep
        increment={v.incrementBaseUnits}
        cumulative={v.cumulativeAmountBaseUnits}
        status={<MoneyStateMark state="authorized" label={`Voucher ${v.sequence}, authorized`} />}
        note={
          v.sequence > 1 ? (
            <>
              Voucher {v.sequence} authorizes <span className="lg-data-sm">{usdc(v.cumulativeAmountBaseUnits)}</span> in total, not <span className="lg-data-sm">{usdc(v.cumulativeAmountBaseUnits)}</span> more. It replaces voucher {v.sequence - 1}. A <T k="voucher">voucher</T> is an off-chain, <T k="cumulative">cumulative authorization</T>; nothing moves on chain until the channel closes.
            </>
          ) : (
            <>
              A <T k="voucher">voucher</T> is an off-chain, <T k="cumulative">cumulative authorization</T>. Nothing moves on chain until the channel closes.
            </>
          )
        }
      />
      <div className="lg-row" style={{ justifyContent: "space-between" }}>
        <InspectButton payload={inspect.charge(o)} />
        <Link className="lg-btn" data-variant="outline" href={`/settlement/#${ch.slug}`}>
          See it settle <span className="lg-arrow">→</span>
        </Link>
      </div>
    </>
  );
}

export function NoFillCollapsed({ o }: { o: Opportunity }) {
  return (
    <div className="lg-collapsed-steps">
      <span className="lg-row" style={{ gap: 10 }}>
        <Provenance kind="policy" label="No fill" />
        <span className="lg-h3">Steps 3 to 9 did not run</span>
      </span>
      <p className="lg-body" style={{ color: "var(--ink)" }}>
        No agent was called (0 calls). No auction, award, receipt or charge.
      </p>
      <p className="lg-small">
        Every campaign was missing <span className="lg-data-sm">mobile_software_wallet</span>, so the exchange answered with no fill in code. The app still answered the question in full; the slot shows a quiet publisher note, never an empty ad box. Recorded order: this question ran first, about 70 minutes before the others.
      </p>
      <p className="lg-small">
        Opportunity <span className="lg-data-sm">{o.opportunityId}</span>, execution <span className="lg-data-sm">{o.execution}</span>.
      </p>
    </div>
  );
}

export function priceLine(o: Opportunity) {
  return o.award ? `${nameOf(o.award.campaignId)} ${usdc(o.award.priceBaseUnits)}` : "No fill";
}
export { opIndex };
