import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InspectorProvider, Ld } from "@axp/design-system/ledger";
import { PresentStage, type BeatMeta } from "@/components/PresentStage";
import { BEATS } from "@/present/beats";
import { decisionFor, evidenceHint, evidenceRecord, nameOf, opportunity, run, usdc } from "@/data/select";
import { auctionRow, campaignStats } from "@/components/v2/derive";
import { LiveHashV2, LiveSignatureV2, LiveTamperResult, LiveVerifyTile } from "@/components/v2/live";
import { levelsWords } from "@/components/v2/stages";
import { devnet } from "@/data/devnet";

export const metadata: Metadata = { title: "Present", robots: { index: false, follow: false } };

const F = ({ from, children }: { from: number; children: ReactNode }) => (
  <div data-from={from} className="pr-from">
    {children}
  </div>
);
const fmt = (v: number) => usdc(v);
const short = (s: string) => `${s.slice(0, 12)}…${s.slice(-8)}`;

export default function PresentPage() {
  const o1 = opportunity(1);
  const o3 = opportunity(3);
  const o4 = opportunity(4);
  const cvB = decisionFor(o1, "v3-clearvault", "text_only")!;
  const cvH = decisionFor(o1, "v3-clearvault", "history")!;
  const kfB = decisionFor(o1, "v3-keyforge", "text_only")!;
  const kfH = decisionFor(o1, "v3-keyforge", "history")!;
  const lgH = decisionFor(o1, "v3-leatherguard", "history")!;
  const o2 = opportunity(2);
  const o2b = decisionFor(o2, "v3-clearvault", "text_only")!;
  const o2h = decisionFor(o2, "v3-clearvault", "history")!;
  const mercari = evidenceRecord(cvH.retrieval!.examples[0].id)!;
  const hint = evidenceHint(cvH.retrieval!.hintIds[0])!;
  const max = Number(run.policy.maxBidBaseUnits);
  const rows = run.opportunities.map(auctionRow);
  const bars = (o: typeof o1) =>
    run.campaigns.map((c) => {
      const b = o.auction.bids.find((x) => x.campaignId === c.campaignId);
      const capped = o.auction.notAdmitted.some((x) => x.campaignId === c.campaignId);
      return { key: c.campaignId, label: c.businessName, sub: b ? levelsWords(b.levels) : capped ? "agent said bid" : "excluded by rule", value: b ? Number(b.amountBaseUnits) : null, winner: c.campaignId === o.auction.winnerCampaignId, note: capped ? "Not admitted: frequency cap" : "Missing crypto storage" };
    });
  const card = (o: typeof o1) => <Ld.SponsoredCard text={o.award!.creative.approvedText} advertiser={nameOf(o.award!.campaignId)} url={o.award!.creative.destinationURL} />;
  const amt = (d: typeof cvB) => usdc((max * (run.policy.bidTable.find((r) => r.levels === `${d.relevanceLevel}:${d.commercialIntentLevel}`)?.bps ?? 0)) / 10000);
  const limits = [
    "Fictional advertisers; their capabilities are their own declarations.",
    "Past ads are observations, not proof of targeting lift.",
    "One disposable test payer funded both advertisers.",
    devnet ? "The recorded run settled on a hosted Solana sandbox; the re-settlement used Solana Devnet. Test USDC only; not mainnet." : "A hosted Solana sandbox and test USDC; not devnet or mainnet.",
    "A signed receipt shows the app inserted a labelled card, not that a person read it.",
    "The app's own answers were recorded by the team that ran it.",
  ];

  const views: Record<string, ReactNode> = {
    problem: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 480px", alignItems: "center" }}>
        <div className="pr2-lede">
          <p className="pr2-big" style={{ fontSize: 46 }}>People ask AI apps what to buy.</p>
          <p className="pr2-mid">Advertisers want to be in that moment. Today there is no honest, disclosed way to be there.</p>
        </div>
        <F from={2}>
          <div className="pr2-claims">
            <span className="ld-label">One recorded run of an exchange built for it</span>
            <div className="pr2-claim">
              <b>Disclosed</b>
              <span>One labelled Sponsored card, kept apart from the app&apos;s own answer.</span>
            </div>
            <div className="pr2-claim">
              <b>Decided in code</b>
              <span>Advertiser agents judge the moment; rules set eligibility, price, ties and caps.</span>
            </div>
            <div className="pr2-claim" data-tone="brand">
              <b>Paid on delivery</b>
              <span>Only a signed delivery becomes a charge, settled through payment channels on Solana.</span>
            </div>
          </div>
        </F>
      </div>
    ),
    chat: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 560px", alignItems: "center" }}>
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
    run: (
      <div className="ld-stack-lg" style={{ gap: 16 }}>
        <div className="ld-kpis">
          <Ld.Kpi label="Questions" value={run.counts.opportunities} context="Asked in the app" />
          <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context="Decided with Jev" />
          <Ld.Kpi label="Auctions" value={run.counts.auctions} context="Plus 1 no fill" />
          <Ld.Kpi label="Signed deliveries" value={run.counts.receipts} context="Publisher receipts" />
          <Ld.Kpi label="Paid to the app" value={usdc(run.totals.paidBaseUnits)} unit="USDC" context="Test USDC" />
        </div>
        <div className="pr2-split" style={{ gridTemplateColumns: "1.15fr 1fr", gap: 16 }}>
          <Ld.Panel title="The four questions" sub="Story order" flush>
            <Ld.Table
              columns={[
                { key: "q", head: "Question", cell: (r: (typeof rows)[number]) => <span><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.label}</span></span> },
                { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
                { key: "p", head: "USDC", num: true, cell: (r) => r.price ?? <span className="ld-faint">none</span> },
                { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
              ]}
              rows={rows}
            />
          </Ld.Panel>
          <F from={2}>
            <div className="ld-stack" style={{ gap: 10 }}>
              {run.campaigns.map((c) => {
                const s = campaignStats(c.campaignId);
                return (
                  <Ld.CampaignHeader
                    key={c.campaignId}
                    initial={c.businessName[0]}
                    muted={!c.funded}
                    name={c.businessName}
                    status={<>{c.funded ? <Ld.Tag tone="success" dot>{`Funded ${usdc(c.depositBaseUnits)} USDC`}</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>}</>}
                    kpis={<span className="ld-secondary">Declares {c.declaredConstraints.map((x) => x.replace(/_/g, " ").replace(/^rfid/, "RFID")).join(", ")}. Max bid {usdc(c.maxBidBaseUnits)}, cap {usdc(s.cap)} USDC.</span>}
                  />
                );
              })}
            </div>
          </F>
        </div>
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
        <div className="ld-cols-3">
          {([
            [nameOf("v3-clearvault"), cvB, cvH],
            [nameOf("v3-keyforge"), kfB, kfH],
          ] as const).map(([name, b, h]) => (
            <Ld.Panel key={name} title={`${name}, opportunity 1`} sub="Intent, decided with Jev" actions={<Ld.Tag tone="outline">{`Level ${b.commercialIntentLevel} to ${h.commercialIntentLevel}`}</Ld.Tag>}>
              <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} width={300} marks={[{ value: b.scores.intent, kind: "baseline", label: "Baseline" }, { value: h.scores.intent, kind: "history", label: "With history" }]} />
              <p className="ld-secondary" style={{ marginTop: 8 }}>
                Moved {b.scores.intent.toFixed(2)} to {h.scores.intent.toFixed(2)}, crossing the 2.5 rounding line. One observation per arm; not a measured lift.
              </p>
            </Ld.Panel>
          ))}
          <Ld.Panel title="ClearVault, opportunity 2" sub="Intent, decided with Jev" actions={<Ld.Tag tone="outline">{`Unchanged, level ${o2b.commercialIntentLevel}`}</Ld.Tag>}>
            <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} width={300} marks={[{ value: o2b.scores.intent, kind: "baseline", label: "Baseline" }, { value: o2h.scores.intent, kind: "history", label: "With history" }]} />
            <p className="ld-secondary" style={{ marginTop: 8 }}>
              On the offline question history moved intent {o2b.scores.intent.toFixed(2)} to {o2h.scores.intent.toFixed(2)}; both round to level {o2h.commercialIntentLevel}.
            </p>
          </Ld.Panel>
        </div>
        <F from={2}>
          <Ld.Panel title="LeatherGuard" sub="Decided with Jev" actions={<Ld.Tag tone="dashed">Skip, no fit</Ld.Tag>}>
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              Relevance level {lgH.relevanceLevel} ({lgH.scores.relevance.toFixed(2)}): its agent chose no fitting creative. It is also excluded by rule for missing crypto storage. Evidence cannot add a capability.
            </p>
          </Ld.Panel>
        </F>
      </div>
    ),
    auction: (
      <div className="ld-stack-lg" style={{ gap: 14 }}>
        <div className="op2-bidtable">
          {run.policy.bidTable.map((r) => (
            <div key={r.levels} data-active={r.levels === "3:3" || undefined}>
              <span className="ld-caption">{levelsWords(r.levels).replace(/^r/, "R")}</span>
              <span className="ld-stat-v">{r.bps / 100}%</span>
              <span className="ld-caption">{usdc((max * r.bps) / 10000)} USDC</span>
            </div>
          ))}
        </div>
        <F from={2}>
          <div className="pr2-split" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <Ld.Panel title="Opportunity 1 bids, USDC" sub="Highest bid wins; the winner pays its own bid" actions={<Ld.Tag tone="brand">Tie rule</Ld.Tag>}>
              <Ld.BidBars reveal max={max} floor={Number(o1.floorBaseUnits)} format={fmt} rows={bars(o1)} />
            </Ld.Panel>
            <div className="ld-stack" style={{ gap: 12 }}>
              <Ld.Callout title="Why the bids are equal">
                Same capabilities, same 0.004 USDC max bid, same ratings (relevance 3, intent 3). A tie rule fixed in the exchange code before the run decides: the lower campaign ID, so ClearVault.
              </Ld.Callout>
              <Ld.Callout tone="brand" title="What history changed here">
                With history ClearVault&apos;s levels rose from {cvB.relevanceLevel} and {cvB.commercialIntentLevel} to {cvH.relevanceLevel} and {cvH.commercialIntentLevel}, so the bid table gave {amt(cvH)} USDC instead of {amt(cvB)}. One observation per arm; not a measured lift. On opportunity 3 the frequency cap, not a tie, decides who may bid.
              </Ld.Callout>
            </div>
          </div>
        </F>
      </div>
    ),
    charge: (
      <div className="ld-stack-lg" style={{ gap: 14 }}>
        <div className="ld-flow">
          <Ld.FlowTile step="1. Award" title={`${nameOf(o1.award!.campaignId)} won`} state={<Ld.Money state="reserved" label="Reserved, not owed" />} value={`${usdc(o1.award!.priceBaseUnits)} USDC`}>
            <LiveHashV2 value={o1.award!.creative} expected={o1.award!.creativeHash} label="Creative hash recomputed here" />
          </Ld.FlowTile>
          <F from={2}>
            <Ld.FlowTile step="2. Delivery and signed receipt" title={`Card inserted, ${(o1.delivery!.msAfterAward / 1000).toFixed(1)} s after the award`}>
              <LiveHashV2 value={o1.receipt!.fields} expected={o1.receipt!.receiptHash} label="Receipt hash recomputed here" />
              <LiveSignatureV2 fields={o1.receipt!.fields} signature={o1.receipt!.signature} pem={run.publisher.publicKeyPEM} />
            </Ld.FlowTile>
          </F>
          <F from={3}>
            <Ld.FlowTile step="3. Charge, then voucher" title="Only now is it owed" state={<Ld.Money state="accepted" label="Accepted charge" />} value={`${usdc(o1.charge!.amountBaseUnits)} USDC`}>
              <Ld.Money state="authorized" label={`Voucher ${o1.voucher!.sequence}: ${usdc(o1.voucher!.cumulativeAmountBaseUnits)} in total`} />
            </Ld.FlowTile>
          </F>
        </div>
        <F from={2}>
          <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {card(o1)}
            <div className="ld-callout" style={{ alignContent: "start", gap: 8 }}>
              <span className="ld-card-title">What the app signed</span>
              <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                That it inserted this exact card, with its Sponsored label, for opportunity 1. Not that a person read it.
              </span>
              <span className="ld-secondary">
                Receipt hash <span className="ld-mono">{short(o1.receipt!.receiptHash)}</span>
              </span>
              <span className="ld-secondary">
                Ed25519 signature <span className="ld-mono">{short(o1.receipt!.signature)}</span>
              </span>
              <span className="ld-caption">Key {o1.receipt!.fields.publisherKeyId}, published in the same file</span>
            </div>
          </div>
        </F>
      </div>
    ),
    cap: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="ld-stack">
          <Ld.Callout tone="warning" title="Agent said bid. Exchange did not admit it.">
            Opportunity 3: ClearVault was already placed twice in this session (2 of 2). The frequency cap is a rule, not the agent. No bid, no amount.
          </Ld.Callout>
          <Ld.Panel title="Opportunity 3 bids, USDC" actions={<Ld.Tag tone="warning">Frequency cap</Ld.Tag>}>
            <Ld.BidBars max={max} floor={Number(o3.floorBaseUnits)} format={fmt} rows={bars(o3)} />
          </Ld.Panel>
        </div>
        <F from={2}>
          <div className="ld-stack" style={{ gap: 10 }}>
            <Ld.ChatSpecimen app={run.publisher.displayName} question={o4.question} meta={<Ld.Pv kind="actual" />} answer={o4.organic.answer} slot={<div className="ld-nofill"><Ld.Pv kind="policy" label="No fill" /> No sponsored placement for this turn</div>} />
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              Opportunity 4: every campaign lacked mobile software wallet. 0 agent calls; no auction, award, receipt or charge.
            </p>
          </div>
        </F>
      </div>
    ),
    settlement: (
      <div className="ld-stack-lg" style={{ gap: 14 }}>
        <Ld.Callout tone="brand" title="Why Solana">
          A {usdc(o2.charge!.amountBaseUnits)} USDC ad only makes sense if each delivery is not its own on-chain transaction. A payment channel turns many accepted charges into one open and one close on Solana; in between, each delivery is a signed off-chain voucher.
        </Ld.Callout>
        <div className="ld-cols-2">
          {run.channels.map((ch) => (
            <Ld.Panel key={ch.channelId} title={nameOf(ch.campaignId)} sub="Payment channel, hosted Solana sandbox, test USDC" actions={<Ld.Tag tone="success" dot>Finalized</Ld.Tag>}>
              <div className="ld-stack" style={{ gap: 10 }}>
                <Ld.BalanceBar total={Number(ch.depositBaseUnits)} legend segments={[...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid ${usdc(v.incrementBaseUnits)}` })), { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` }]} />
                <Ld.StepChart max={Number(ch.depositBaseUnits)} cap={8000} format={fmt} width={460} height={120} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `Voucher ${v.sequence}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
              </div>
            </Ld.Panel>
          ))}
        </div>
        <F from={2}>
          <div className="ld-kpis">
            <Ld.Kpi label="Paid to the publisher" value={usdc(run.totals.paidBaseUnits)} unit="USDC" context="One close per channel" />
            <Ld.Kpi label="Refunded" value={usdc(run.totals.refundedBaseUnits)} unit="USDC" context="Back to the payer" />
            <Ld.Kpi label="Sandbox transactions" value={run.chainTxs.length} context="For 3 paid deliveries" />
            {devnet ? <Ld.Kpi tone="live" label="Re-settled on Solana Devnet" value={devnet.transactions.length} unit="transactions" context="Finalized; explorer links on Settlement" /> : null}
          </div>
        </F>
      </div>
    ),
    verify: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="ld-stack" style={{ gap: 12 }}>
          <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LiveVerifyTile context="Checked in this browser" />
            <Ld.Kpi label="New calls on restart" value={run.restart.newCalls} context={`Models off; ${run.restart.newCharges} new charges, ${run.restart.newSignatures} new signatures`} />
          </div>
          <LiveTamperResult />
          <div className="ld-callout">
            <span className="ld-card-title">What Verify checks, on the public file</span>
            <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              28 hashes, 3 publisher signatures (Ed25519) and 17 sums and rules{devnet ? ", plus the Devnet re-settlement tied to the same receipts" : ""}. Open Verify on this site to run them yourself.
            </span>
          </div>
        </div>
        <F from={2}>
          <Ld.Panel title="What this run does not show">
            <ul className="ev2-list" style={{ fontSize: 15, color: "var(--ld-text)" }}>
              {limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Ld.Panel>
        </F>
      </div>
    ),
    claim: (
      <div className="pr2-end">
        <p className="pr2-end-big">
          <span>Disclosed.</span>
          <span>Decided in code.</span>
          <span>Paid on delivery.</span>
        </p>
        <div className="pr2-end-grid">
          <div className="pr2-claim">
            <b>Disclosed</b>
            <span>Every card carried its Sponsored label, and the app signed that it inserted it that way.</span>
          </div>
          <div className="pr2-claim">
            <b>Decided in code</b>
            <span>Jev judged relevance and intent; rules set who could bid, the price, ties and caps.</span>
          </div>
          <div className="pr2-claim" data-tone="brand">
            <b>Paid on delivery</b>
            <span>{run.counts.receipts} signed receipts became {run.counts.receipts} charges, settled through 2 payment channels on Solana.</span>
          </div>
        </div>
        <span className="ld-secondary">Explore the record and run the checks: the explorer and Verify pages of this site.</span>
      </div>
    ),
  };

  const extra = { devnet: !!devnet };
  const metas: BeatMeta[] = BEATS.map((b) => ({ id: b.id, n: b.n, title: b.title, steps: b.steps, durationMs: b.durationMs, exploreHref: b.exploreHref, caption: b.caption(run, extra) }));
  return (
    <InspectorProvider scopeClass="ld">
      <PresentStage beats={metas} views={BEATS.map((b) => views[b.id])} scope={devnet ? "Hosted Solana sandbox + Devnet re-settlement, test USDC, fictional advertisers" : "Hosted Solana sandbox, test USDC, fictional advertisers"} />
    </InspectorProvider>
  );
}
