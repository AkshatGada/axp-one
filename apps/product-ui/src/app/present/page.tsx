import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Amount,
  AuctionBoard,
  BidTableGrid,
  CapabilityChips,
  Handoff,
  InferredHint,
  InspectorProvider,
  MoneyStateMark,
  NoFillSlot,
  NotAdmittedStamp,
  NumberStrip,
  ObservedRecord,
  Provenance,
  ScopeChip,
  SponsoredCard,
  StatusStamp,
  TieBreakNote,
} from "@axp/design-system/ledger";
import { PresentStage, type BeatMeta } from "@/components/PresentStage";
import { LiveVerifyCount } from "@/components/LiveVerifyCount";
import { BEATS } from "@/present/beats";
import { decisionFor, evidenceHint, evidenceRecord, nameOf, opportunity, outcomeLine, run, usdc } from "@/data/select";
import { AppSpecimen, ArmDiffs, AuctionBoardFor, SimilarityLabel, WinnerCard, RepeatRulers } from "@/components/opportunity/parts";
import { LiveHash, LiveSignature } from "@/components/live";
import { channelMeter, ladder } from "@/components/money";

export const metadata: Metadata = { title: "Present", robots: { index: false, follow: false } };

const F = ({ from, children, className }: { from: number; children: ReactNode; className?: string }) => (
  <div data-from={from} className={`pr-from${className ? ` ${className}` : ""}`}>
    {children}
  </div>
);

export default function PresentPage() {
  const o1 = opportunity(1);
  const o3 = opportunity(3);
  const o4 = opportunity(4);
  const cv = run.channels[0];
  const kf = run.channels[1];
  const cvHist = decisionFor(o1, "v3-clearvault", "history")!;
  const lgHist = decisionFor(o1, "v3-leatherguard", "history")!;
  const mercari = evidenceRecord(cvHist.retrieval!.examples[0].id)!;
  const hint = evidenceHint(cvHist.retrieval!.hintIds[0])!;
  const leather = lgHist.retrieval!.examples.map((e) => ({ e, r: evidenceRecord(e.id)! }));

  const views: Record<string, ReactNode> = {
    chat: (
      <div className="pr-split" style={{ gridTemplateColumns: "1fr 560px" }}>
        <div className="pr-lede">
          <span className="pr-kicker">
            <Provenance kind="actual" /> The answer
          </span>
          <p className="pr-big">An AI app answers the question on its own. No advertiser material reaches the answer.</p>
          <F from={2}>
            <span className="pr-kicker">
              <Provenance kind="fictional" /> The card
            </span>
            <p className="pr-big">Below it, one disclosed Sponsored card, bought in a sealed auction.</p>
          </F>
        </div>
        <div className="pr-app">
          <AppSpecimen
            o={o1}
            slot={
              <div className="pr-slot">
                <div data-hide-from={2}>
                  <div className="lg-slot-await">
                    <strong>Sponsored slot, awaiting auction</strong>
                  </div>
                </div>
                <div data-show-from={2} hidden className="lg-ad-enter">
                  <WinnerCard o={o1} />
                </div>
              </div>
            }
          />
        </div>
      </div>
    ),
    numbers: (
      <div className="lg-stack-lg" style={{ gap: 36 }}>
        <div className="lg-row" style={{ gap: 10 }}>
          <ScopeChip kind="replay" label="Recorded replay" />
          <ScopeChip kind="settled" label="Hosted Solana sandbox" />
          <ScopeChip label="Test USDC" />
          <ScopeChip kind="fictional" label="Fictional advertisers" />
          <span className="lg-data-sm" style={{ marginLeft: 8 }}>{run.source.runId}</span>
        </div>
        <NumberStrip
          items={[
            { value: run.counts.opportunities, label: "questions" },
            { value: run.counts.decisions, label: "agent decisions" },
            { value: run.counts.auctions, label: "auctions" },
            { value: run.counts.noFill, label: "no fill" },
            { value: run.counts.receipts, label: "signed deliveries" },
          ]}
        />
        <div className="pr-qs">
          {run.opportunities.map((o) => (
            <div key={o.n} className="pr-q">
              <span className="pr-qn">{o.n}</span>
              <span className="pr-qt">{o.question}</span>
              <span className="pr-qo">{outcomeLine(o)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    advertisers: (
      <div className="pr-three">
        {run.campaigns.map((c) => (
          <div key={c.campaignId} className="lg-stack">
            <SponsoredCard square text={c.creative.approvedText} advertiser={c.businessName} url={c.creative.destinationURL} />
            <CapabilityChips caps={c.declaredConstraints.map((x) => ({ name: x }))} />
            {c.funded ? (
              <span className="lg-row" style={{ gap: 12 }}>
                <MoneyStateMark state="deposit" label="Deposit" />
                <Amount baseUnits={c.depositBaseUnits} />
              </span>
            ) : (
              <StatusStamp tone="dashed">Unfunded: no channel opened</StatusStamp>
            )}
          </div>
        ))}
      </div>
    ),
    evidence: (
      <div className="pr-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="lg-stack">
          <span className="pr-kicker">
            <Provenance kind="observed" /> Seen before, by ContextHint
          </span>
          <ObservedRecord prompt={mercari.promptText} advertiser={mercari.advertiser} creative={mercari.creativeText} similarity={<SimilarityLabel method="vector" value={1} />} />
          <InferredHint text={hint.text} tier={`tier ${hint.tier}`} />
          <Handoff to={`Handed to ${nameOf("v3-clearvault")}'s and ${nameOf("v3-keyforge")}'s agents`} />
        </div>
        <F from={2}>
          <div className="lg-stack">
            <span className="pr-kicker">
              <Provenance kind="observed" /> LeatherGuard's packet: the word “wallet” is ambiguous
            </span>
            {leather.slice(0, 2).map(({ e, r }) => (
              <ObservedRecord key={e.id} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} similarity={<SimilarityLabel method="vector" value={e.similarity} />} />
            ))}
            <p className="pr-note">Evidence informs a judgment. It cannot add a capability LeatherGuard never declared.</p>
          </div>
        </F>
      </div>
    ),
    decisions: (
      <div className="lg-stack-lg">
        <ArmDiffs o={o1} />
        <F from={2}>
          <div className="pr-band">
            <span className="lg-verdict" data-v="skip">
              Skip
            </span>
            <span className="pr-note" style={{ margin: 0 }}>
              LeatherGuard's agent: relevance <span className="lg-data">{lgHist.scores.relevance.toFixed(2)}</span>, level {lgHist.relevanceLevel}, creative no fit. Excluded by rule as well: missing <span className="lg-data">crypto_storage</span>.
            </span>
          </div>
        </F>
      </div>
    ),
    auction: (
      <div className="lg-stack-lg">
        <BidTableGrid rows={run.policy.bidTable} active={o1.auction.bids.map((b) => b.levels ?? "")} maxBid={run.policy.maxBidBaseUnits} />
        <F from={2}>
          <AuctionBoardFor o={o1} />
        </F>
      </div>
    ),
    charge: (
      <div className="pr-three" style={{ alignItems: "stretch" }}>
        <div className="pr-card">
          <span className="pr-kicker">1 · Award</span>
          <MoneyStateMark state="reserved" label="Reserved, not owed" />
          <span className="pr-amount"><Amount baseUnits={o1.award!.priceBaseUnits} /></span>
          <span className="pr-note">{nameOf(o1.award!.campaignId)} won. Budget is reserved; nothing is owed until the app proves delivery.</span>
          <LiveHash value={o1.award!.creative} expected={o1.award!.creativeHash} label="Creative hash" />
        </div>
        <F from={2} className="pr-card">
          <span className="pr-kicker">2 · Delivery and signed receipt</span>
          <span className="pr-note">
            Card inserted with its Sponsored label, received <span className="lg-data">+{(o1.delivery!.msAfterAward / 1000).toFixed(1)} s</span> after the award. Signed with <span className="lg-data">{run.publisher.publisherKeyId}</span>.
          </span>
          <div className="lg-stack-sm">
            <LiveHash value={{ awardId: o1.award!.id, creativeHash: o1.award!.creativeHash, domInserted: o1.delivery!.acknowledgement.domInserted, sponsoredLabelPresent: o1.delivery!.acknowledgement.sponsoredLabelPresent }} expected={o1.delivery!.renderAcknowledgementHash} label="Acknowledgement hash" />
            <LiveHash value={o1.receipt!.fields} expected={o1.receipt!.receiptHash} label="Receipt hash" />
            <LiveSignature fields={o1.receipt!.fields} signature={o1.receipt!.signature} publicKeyPEM={run.publisher.publicKeyPEM} />
          </div>
          <span className="lg-small">A receipt proves the app's assertion that it inserted a labelled card, not that a person read it.</span>
        </F>
        <F from={3} className="pr-card">
          <span className="pr-kicker">3 · Charge, then voucher</span>
          <MoneyStateMark state="accepted" label="Accepted charge" />
          <span className="pr-amount"><Amount baseUnits={o1.charge!.amountBaseUnits} /></span>
          <MoneyStateMark state="authorized" label={`Voucher ${o1.voucher!.sequence}: ${usdc(o1.voucher!.cumulativeAmountBaseUnits)} authorized in total`} />
          <span className="pr-note">Off chain. Nothing moves on chain until the channel closes.</span>
        </F>
      </div>
    ),
    cap: (
      <div className="pr-split" style={{ gridTemplateColumns: "1fr 520px" }}>
        <div className="lg-stack">
          <span className="pr-kicker">Opportunity 3: the same question again</span>
          <NotAdmittedStamp detail={`Frequency cap: ClearVault was already placed twice in this session (2 of 2). No bid, no amount.`} />
          <RepeatRulers o={o3} />
          <AuctionBoardFor o={o3} />
        </div>
        <F from={2}>
          <div className="lg-stack">
            <span className="pr-kicker">Opportunity 4: mobile only</span>
            <AppSpecimen o={o4} slot={<NoFillSlot />} />
            <span className="pr-note">0 agent calls. No auction, award, receipt or charge.</span>
          </div>
        </F>
      </div>
    ),
    settlement: (
      <div className="lg-stack-lg" style={{ gap: 32 }}>
        <div className="pr-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[cv, kf].map((ch) => (
            <div className="lg-stack" key={ch.channelId}>
              <span className="pr-kicker">{nameOf(ch.campaignId)}</span>
              {channelMeter(ch, { legend: false })}
              <F from={2}>{ladder(ch)}</F>
            </div>
          ))}
        </div>
        <F from={2}>
          <NumberStrip
            items={[
              { value: usdc(run.totals.depositsBaseUnits), label: "test USDC deposited" },
              { value: usdc(run.totals.paidBaseUnits), label: "to the publisher" },
              { value: usdc(run.totals.refundedBaseUnits), label: "refunded" },
              { value: Number(run.fees.networkFeeLamports).toLocaleString("en-US"), label: "lamports in network fees, kept apart" },
            ]}
          />
        </F>
      </div>
    ),
    verify: (
      <div className="pr-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="lg-stack">
          <LiveVerifyCount />
          <NumberStrip
            items={[
              { value: run.restart.newCalls, label: "new model calls on restart" },
              { value: run.restart.newCharges, label: "new charges" },
              { value: run.restart.newSignatures, label: "new signatures" },
            ]}
          />
        </div>
        <F from={2}>
          <div className="lg-stack">
            <span className="pr-kicker">What this run does not show</span>
            <ul className="pr-limits">
              {run.limitations.run.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <span className="pr-big" style={{ fontSize: 32 }}>Explore every hash yourself.</span>
          </div>
        </F>
      </div>
    ),
  };

  const metas: BeatMeta[] = BEATS.map((b) => ({ id: b.id, n: b.n, title: b.title, steps: b.steps, durationMs: b.durationMs, exploreHref: b.exploreHref, caption: b.caption(run) }));
  return (
    <InspectorProvider>
      <PresentStage beats={metas} views={BEATS.map((b) => views[b.id])} />
    </InspectorProvider>
  );
}
