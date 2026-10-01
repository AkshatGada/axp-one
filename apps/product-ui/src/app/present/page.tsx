import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InspectorProvider, Ld } from "@axp/design-system/ledger";
import { PresentStage, type BeatMeta } from "@/components/PresentStage";
import { BEATS } from "@/present/beats";
import { decisionFor, evidenceHint, evidenceRecord, nameOf, opportunity, run, usdc } from "@/data/select";
import { auctionRow, campaignStats } from "@/components/v2/derive";
import { LiveHashV2, LiveSignatureV2, LiveVerifyTile } from "@/components/v2/live";

export const metadata: Metadata = { title: "Present", robots: { index: false, follow: false } };

const F = ({ from, children }: { from: number; children: ReactNode }) => (
  <div data-from={from} className="pr-from">
    {children}
  </div>
);
const fmt = (v: number) => usdc(v);

export default function PresentPage() {
  const o1 = opportunity(1);
  const o3 = opportunity(3);
  const o4 = opportunity(4);
  const cvB = decisionFor(o1, "v3-clearvault", "text_only")!;
  const cvH = decisionFor(o1, "v3-clearvault", "history")!;
  const kfB = decisionFor(o1, "v3-keyforge", "text_only")!;
  const kfH = decisionFor(o1, "v3-keyforge", "history")!;
  const lgH = decisionFor(o1, "v3-leatherguard", "history")!;
  const mercari = evidenceRecord(cvH.retrieval!.examples[0].id)!;
  const hint = evidenceHint(cvH.retrieval!.hintIds[0])!;
  const max = Number(run.policy.maxBidBaseUnits);
  const rows = run.opportunities.map(auctionRow);
  const bars = (o: typeof o1) =>
    run.campaigns.map((c) => {
      const b = o.auction.bids.find((x) => x.campaignId === c.campaignId);
      const capped = o.auction.notAdmitted.some((x) => x.campaignId === c.campaignId);
      return { key: c.campaignId, label: c.businessName, sub: b ? `levels ${b.levels}` : capped ? "agent said bid" : "excluded by rule", value: b ? Number(b.amountBaseUnits) : null, winner: c.campaignId === o.auction.winnerCampaignId, note: capped ? "Not admitted: frequency cap" : "Missing crypto storage" };
    });
  const card = (o: typeof o1) => <Ld.SponsoredCard text={o.award!.creative.approvedText} advertiser={nameOf(o.award!.campaignId)} url={o.award!.creative.destinationURL} />;

  const views: Record<string, ReactNode> = {
    chat: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 600px" }}>
        <div className="pr2-lede">
          <Ld.Pv kind="actual" label="The answer" />
          <p className="pr2-big">An AI app answers on its own. No advertiser material reaches the answer.</p>
          <F from={2}>
            <Ld.Pv kind="fictional" label="The card" />
            <p className="pr2-big">Below it, one disclosed Sponsored card, bought in a sealed auction.</p>
          </F>
        </div>
        <Ld.ChatSpecimen
          app={run.publisher.displayName}
          question={o1.question}
          meta={<><Ld.Pv kind="actual" /> <span>no advertiser material</span></>}
          answer={o1.organic.answer}
          slot={
            <>
              <div data-hide-from={2}>
                <div className="ld-await">Sponsored slot, awaiting auction</div>
              </div>
              <div data-show-from={2} hidden className="ld-ad-enter">
                {card(o1)}
              </div>
            </>
          }
        />
      </div>
    ),
    numbers: (
      <div className="ld-stack-lg" style={{ gap: 24 }}>
        <div className="ld-kpis">
          <Ld.Kpi label="Questions" value={run.counts.opportunities} context="Asked in the app" />
          <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context="Decided with Jev" />
          <Ld.Kpi label="Auctions" value={run.counts.auctions} context="Plus 1 no fill" />
          <Ld.Kpi label="Signed deliveries" value={run.counts.receipts} context="Publisher receipts" />
          <Ld.Kpi label="Settled" value={usdc(run.totals.paidBaseUnits)} context="Test USDC on a hosted Solana sandbox" />
        </div>
        <Ld.Panel title="The four questions" sub="Story order" flush>
          <Ld.Table
            columns={[
              { key: "q", head: "Question", cell: (r: (typeof rows)[number]) => <span><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.o.question}</span></span> },
              { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
              { key: "p", head: "Price", num: true, cell: (r) => r.price ?? <span className="ld-faint">none</span> },
              { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
            ]}
            rows={rows}
          />
        </Ld.Panel>
      </div>
    ),
    advertisers: (
      <div className="ld-stack" style={{ gap: 14 }}>
        {run.campaigns.map((c) => {
          const s = campaignStats(c.campaignId);
          return (
            <Ld.CampaignHeader
              key={c.campaignId}
              initial={c.businessName[0]}
              muted={!c.funded}
              name={c.businessName}
              status={<>{c.funded ? <Ld.Tag tone="success" dot>{`Funded ${usdc(c.depositBaseUnits)}`}</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>}<Ld.Pv kind="fictional" /></>}
              kpis={<span className="ld-secondary">Declares {c.declaredConstraints.map((x) => x.replace(/_/g, " ")).join(", ")} · max bid {usdc(c.maxBidBaseUnits)} · cap {usdc(s.cap)}</span>}
            />
          );
        })}
      </div>
    ),
    evidence: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="ld-stack">
          <Ld.Callout tone="ch" title="ContextHint had seen this exact question before">Next to a hardware-wallet listing. That history goes to the agents as evidence.</Ld.Callout>
          <Ld.EvidenceCard prompt={mercari.promptText} advertiser={mercari.advertiser} creative={mercari.creativeText} sim={1} method="vector" hint={<span className="ld-stack" style={{ gap: 4 }}><Ld.Pv kind="inferred" label="Inferred hint" /><span className="ld-secondary">{hint.text}</span></span>} />
        </div>
        <F from={2}>
          <div className="ld-stack">
            <Ld.Callout title="LeatherGuard's packet: the word “wallet” is ambiguous">Crypto prompts that drew leather and RFID wallet ads. Evidence cannot add a capability it never declared.</Ld.Callout>
            {lgH.retrieval!.examples.slice(0, 2).map((e) => {
              const r = evidenceRecord(e.id)!;
              return <Ld.EvidenceCard key={e.id} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} sim={e.similarity} method="vector" />;
            })}
          </div>
        </F>
      </div>
    ),
    decisions: (
      <div className="ld-stack-lg" style={{ gap: 16 }}>
        <div className="ld-cols-2">
          {([
            [nameOf("v3-clearvault"), cvB, cvH],
            [nameOf("v3-keyforge"), kfB, kfH],
          ] as const).map(([name, b, h]) => (
            <Ld.Panel key={name} title={`${name} · intent`} sub="Decided with Jev · level = rounded score" actions={<Ld.Tag tone="brand">{`Level ${b.commercialIntentLevel} to ${h.commercialIntentLevel}`}</Ld.Tag>}>
              <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} width={520} marks={[{ value: b.scores.intent, kind: "baseline", label: "Baseline" }, { value: h.scores.intent, kind: "history", label: "With history" }]} />
              <p className="ld-secondary" style={{ marginTop: 8 }}>
                Moved {b.scores.intent.toFixed(2)} to {h.scores.intent.toFixed(2)}, crossing the 2.5 rounding line. One observation per arm; not a measured lift.
              </p>
            </Ld.Panel>
          ))}
        </div>
        <F from={2}>
          <Ld.Panel title="LeatherGuard" sub="Decided with Jev" actions={<Ld.Tag tone="dashed">Skip · no fit</Ld.Tag>}>
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              Relevance level {lgH.relevanceLevel} ({lgH.scores.relevance.toFixed(2)}): its agent chose no fitting creative. It is also excluded by rule for missing crypto storage. Evidence cannot add a capability.
            </p>
          </Ld.Panel>
        </F>
      </div>
    ),
    auction: (
      <div className="ld-stack-lg" style={{ gap: 18 }}>
        <div className="op2-bidtable">
          {run.policy.bidTable.map((r) => (
            <div key={r.levels} data-active={r.levels === "3:3" || undefined}>
              <span className="ld-caption">Levels {r.levels}</span>
              <span className="ld-stat-v">{r.bps / 100}%</span>
              <span className="ld-caption">{usdc((max * r.bps) / 10000)}</span>
            </div>
          ))}
        </div>
        <F from={2}>
          <Ld.Panel title="Opportunity 1 · bids" sub="Highest bid wins; equal bids go to the lower campaign ID" actions={<Ld.Tag tone="brand">Tie-break</Ld.Tag>}>
            <Ld.BidBars reveal max={max} floor={Number(o1.floorBaseUnits)} format={fmt} rows={bars(o1)} />
          </Ld.Panel>
        </F>
      </div>
    ),
    charge: (
      <div className="ld-stack-lg" style={{ gap: 16 }}>
      <div className="ld-flow">
        <Ld.FlowTile step="1 · Award" title={`${nameOf(o1.award!.campaignId)} won`} state={<Ld.Money state="reserved" label="Reserved, not owed" />} value={usdc(o1.award!.priceBaseUnits)}>
          <LiveHashV2 value={o1.award!.creative} expected={o1.award!.creativeHash} label="Creative hash recomputed here" />
        </Ld.FlowTile>
        <F from={2}>
          <Ld.FlowTile step="2 · Delivery and signed receipt" title={`Card inserted with its label, +${(o1.delivery!.msAfterAward / 1000).toFixed(1)} s`}>
            <LiveHashV2 value={{ awardId: o1.award!.id, creativeHash: o1.award!.creativeHash, domInserted: true, sponsoredLabelPresent: true }} expected={o1.delivery!.renderAcknowledgementHash} label="Acknowledgement hash recomputed here" />
            <LiveHashV2 value={o1.receipt!.fields} expected={o1.receipt!.receiptHash} label="Receipt hash recomputed here" />
            <LiveSignatureV2 fields={o1.receipt!.fields} signature={o1.receipt!.signature} pem={run.publisher.publicKeyPEM} />
            <span className="ld-caption">Proves the app inserted a labelled card, not that a person read it.</span>
          </Ld.FlowTile>
        </F>
        <F from={3}>
          <Ld.FlowTile step="3 · Charge, then voucher" title="Only now is it owed" state={<Ld.Money state="accepted" label="Accepted charge" />} value={usdc(o1.charge!.amountBaseUnits)}>
            <Ld.Money state="authorized" label={`Voucher ${o1.voucher!.sequence}: ${usdc(o1.voucher!.cumulativeAmountBaseUnits)} authorized in total`} />
          </Ld.FlowTile>
        </F>
      </div>
      <F from={2}>
        <div className="ld-cols-2">
          {card(o1)}
          <div className="ld-callout">
            <span className="ld-card-title">What the app signed</span>
            <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              It inserted this exact card, with its Sponsored label, for opportunity 1. The publisher key signed that statement; your browser just checked the signature.
            </span>
          </div>
        </div>
      </F>
      </div>
    ),
    cap: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 520px" }}>
        <div className="ld-stack">
          <Ld.Callout tone="warning" title="Agent said bid. Exchange did not admit it.">
            Opportunity 3: ClearVault was already placed twice in this session (2 of 2). The frequency cap is a rule, not the agent.
          </Ld.Callout>
          <Ld.Panel title="Opportunity 3 · bids" actions={<Ld.Tag tone="warning">Frequency cap</Ld.Tag>}>
            <Ld.BidBars max={max} floor={Number(o3.floorBaseUnits)} format={fmt} rows={bars(o3)} />
          </Ld.Panel>
        </div>
        <F from={2}>
          <Ld.ChatSpecimen app={run.publisher.displayName} question={o4.question} meta={<Ld.Pv kind="actual" />} answer={o4.organic.answer} slot={<div className="ld-nofill"><Ld.Pv kind="policy" label="No fill" /> No sponsored placement for this turn</div>} />
          <p className="ld-secondary" style={{ marginTop: 10, color: "var(--ld-text)" }}>
            Opportunity 4: 0 agent calls. No auction, award, receipt or charge.
          </p>
        </F>
      </div>
    ),
    settlement: (
      <div className="ld-stack-lg" style={{ gap: 18 }}>
        <div className="ld-cols-2">
          {run.channels.map((ch) => (
            <Ld.Panel key={ch.channelId} title={nameOf(ch.campaignId)} sub="Solana payment channel · hosted sandbox · test USDC" actions={<Ld.Tag tone="success" dot>Finalized</Ld.Tag>}>
              <div className="ld-stack">
                <Ld.BalanceBar total={Number(ch.depositBaseUnits)} legend segments={[...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid ${usdc(v.incrementBaseUnits)}` })), { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` }]} />
                <F from={2}>
                  <Ld.StepChart max={8000} format={fmt} width={520} height={140} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `voucher ${v.sequence}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
                </F>
              </div>
            </Ld.Panel>
          ))}
        </div>
        <F from={2}>
          <div className="ld-kpis">
            <Ld.Kpi label="Paid to the publisher" value={usdc(run.totals.paidBaseUnits)} context="Test USDC, one close per channel" />
            <Ld.Kpi label="Refunded" value={usdc(run.totals.refundedBaseUnits)} context="Back to the payer" />
            <Ld.Kpi label="Network fees" value={Number(run.fees.networkFeeLamports).toLocaleString("en-US")} context="Lamports, kept apart from USDC" />
          </div>
        </F>
      </div>
    ),
    verify: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="ld-stack">
          <div className="ld-kpis">
            <LiveVerifyTile />
          </div>
          <div className="ld-kpis">
            <Ld.Kpi label="New calls on restart" value={run.restart.newCalls} context="Models off" />
            <Ld.Kpi label="New charges" value={run.restart.newCharges} context="No double charge" />
            <Ld.Kpi label="New signatures" value={run.restart.newSignatures} context="Receipts replayed, not re-signed" />
          </div>
        </div>
        <F from={2}>
          <Ld.Panel title="What this run does not show">
            <ul className="ev2-list" style={{ fontSize: 15, color: "var(--ld-text)" }}>
              {run.limitations.run.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Ld.Panel>
          <p className="pr2-big" style={{ fontSize: 30, marginTop: 18 }}>
            Explore every hash yourself.
          </p>
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
