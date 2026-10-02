import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InspectorProvider, Ld } from "@axp/design-system/ledger";
import { PresentStage, type BeatMeta } from "@/components/PresentStage";
import { BEATS } from "@/present/beats";
import { decisionFor, evidenceHint, evidenceRecord, nameOf, run, usdc } from "@/data/select";
import { auctionRow, campaignStats } from "@/components/v2/derive";
import { LiveHashV2, LiveSignatureV2, LiveTamperResult, LiveVerifyTile } from "@/components/v2/live";
import { levelsWords } from "@/components/v2/stages";
import { devnet } from "@/data/devnet";
import { CHECK_TOTAL } from "@/data/checks";
import { DISCLAIMER, NET, auctionKind, auctionSentence, capChip, earlierSameQuestion, list, noFillSentence, onDevnet, onePayer, story, tieFacts } from "@/data/story";
import type { Decision, Opportunity } from "@/data/types";

export const metadata: Metadata = { title: "Present", robots: { index: false, follow: false } };

const F = ({ from, children }: { from: number; children: ReactNode }) => (
  <div data-from={from} className="pr-from">
    {children}
  </div>
);
const fmt = (v: number) => usdc(v);
const short = (s: string, h = 12, t = 8) => `${s.slice(0, h)}…${s.slice(-t)}`;
const lv = (d: Pick<Decision, "relevanceLevel" | "commercialIntentLevel">) => levelsWords(`${d.relevanceLevel}:${d.commercialIntentLevel}`).replace(/^r/, "R");

export default function PresentPage() {
  const { paid, auction, hist, cap, nofill, ev, evMain, evOther } = story.picks();
  const max = Math.max(...run.campaigns.map((c) => Number(c.maxBidBaseUnits)));
  const rows = run.opportunities.map(auctionRow);
  const bars = (o: Opportunity) =>
    run.campaigns.map((c) => {
      const b = o.auction.bids.find((x) => x.campaignId === c.campaignId);
      const capped = o.auction.notAdmitted.some((x) => x.campaignId === c.campaignId);
      const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
      const h = decisionFor(o, c.campaignId, "history");
      return {
        key: c.campaignId,
        label: c.businessName,
        sub: b ? levelsWords(b.levels) : capped ? "agent said bid" : ex ? "excluded by rule" : h ? `agent said ${h.decision}` : "not asked",
        value: b ? Number(b.amountBaseUnits) : null,
        winner: c.campaignId === o.auction.winnerCampaignId,
        note: capped ? "Not admitted: frequency cap" : ex ? `Missing ${ex.missing.map((m) => m.replace(/_/g, " ")).join(", ")}` : "No bid",
      };
    });
  const card = (o: Opportunity) => <Ld.SponsoredCard text={o.award!.creative.approvedText} advertiser={nameOf(o.award!.campaignId)} url={o.award!.creative.destinationURL} />;
  const lead = paid ?? run.opportunities[0];
  const limits = [
    "Fictional advertisers; their capabilities are their own declarations.",
    "Past ads are observations, not proof of targeting lift.",
    ...(onePayer ? ["One disposable test payer funded every advertiser."] : run.channels.length > 1 ? ["Each advertiser has its own test wallet; the demo operator runs all of them."] : []),
    onDevnet ? "Settled on Solana Devnet in Devnet test USDC; not mainnet." : devnet ? "The recorded run settled on a hosted Solana sandbox; the re-settlement used Solana Devnet. Test USDC only; not mainnet." : "A hosted Solana sandbox and test USDC; not Devnet or mainnet.",
    "A signed receipt shows the app inserted a labelled card, not that a person read it.",
    "The app's own answers were recorded by the team that ran it.",
  ];
  const bidsChecked = run.opportunities.reduce((n, o) => n + o.auction.bids.length, 0);

  // The Devnet proof card for beat 9: the run's own close when the run is live on Devnet, else the re-settlement's.
  const dvCard = (() => {
    if (onDevnet) {
      const ch = run.channels.slice().sort((a, b) => b.vouchers.length - a.vouchers.length)[0];
      return ch && ch.close.explorerUrl ? { title: `${nameOf(ch.campaignId)}'s channel, closed on Solana Devnet`, address: ch.protocolChannelId, addressUrl: ch.explorerUrl ?? null, sig: ch.close.signature, sigUrl: ch.close.explorerUrl, slot: ch.close.slot, paid: ch.settledBaseUnits, back: ch.refundBaseUnits, note: "This run's own close transaction." } : null;
    }
    if (!devnet) return null;
    const ch = devnet.channels.slice().sort((a, b) => b.vouchers.length - a.vouchers.length)[0];
    return ch?.close ? { title: `${nameOf(ch.campaignId)}'s receipts, re-settled on Solana Devnet`, address: ch.channelAddress, addressUrl: ch.channelExplorerUrl, sig: ch.close.signature, sigUrl: ch.close.explorerUrl, slot: ch.close.slot, paid: ch.payoutBaseUnits, back: ch.refundBaseUnits, note: `The same ${devnet.channels.reduce((n, c) => n + c.vouchers.length, 0)} signed receipts, settled again on a public network. All links on Settlement.` } : null;
  })();

  const views: Record<string, ReactNode> = {
    problem: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 540px", alignItems: "center" }}>
        <div className="pr2-lede">
          <p className="pr2-big" style={{ fontSize: 50 }}>People ask AI apps what to buy.</p>
          <p className="pr2-mid">Advertisers want to be in that moment. Today there is no honest, disclosed way to be there: no labelled place, no rules anyone can check, no proof an ad was shown.</p>
        </div>
        <Ld.ChatSpecimen app="An AI app" question={lead.question} meta={<><Ld.Pv kind="actual" /> <span>the app&apos;s own answer</span></>} answer={lead.organic.answer} slot={<div className="ld-await">No disclosed place for an ad</div>} />
      </div>
    ),
    chat: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 560px", alignItems: "center" }}>
        <div className="pr2-lede">
          <Ld.Pv kind="actual" label="The answer" />
          <p className="pr2-big">An AI app answers on its own. No advertiser material reaches the answer.</p>
          <F from={2}>
            <Ld.Pv kind="fictional" label="The card" />
            <p className="pr2-big">{paid ? "Below it, one disclosed Sponsored card, bought in a sealed auction and paid through Solana." : "No card was placed in this run."}</p>
          </F>


        </div>
        <Ld.ChatSpecimen
          app={run.publisher.displayName}
          question={lead.question}
          meta={<><Ld.Pv kind="actual" /> <span>no advertiser material</span></>}
          answer={lead.organic.answer}
          slot={
            paid ? (
              <>
                <div data-hide-from={2}>
                  <div className="ld-await">Sponsored slot, awaiting auction</div>
                </div>
                <div data-show-from={2} hidden className="ld-ad-enter">
                  {card(paid)}
                </div>
              </>
            ) : (
              <div className="ld-nofill">No sponsored placement for this turn</div>
            )
          }
        />
      </div>
    ),
    run: (
      <div className="ld-stack-lg" style={{ gap: 16 }}>
        <div className="ld-kpis">
          <Ld.Kpi label="Questions" value={run.counts.opportunities} context="Asked in the app" />
          <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context="By Jev, a judgment model that rates relevance and intent" />
          <Ld.Kpi label="Auctions" value={run.counts.auctions} context={run.counts.noFill ? `Plus ${run.counts.noFill} no fill` : "Every question filled"} />
          <Ld.Kpi label="Signed deliveries" value={run.counts.receipts} context="Publisher receipts" />
          <Ld.Kpi label="Paid to the app" value={usdc(run.totals.paidBaseUnits)} unit="USDC" context="Test USDC" />
        </div>
        <div className="pr2-split" style={{ gridTemplateColumns: "1.15fr 1fr", gap: 16 }}>
          <Ld.Panel title={`The ${run.counts.opportunities} questions`} sub="Story order" flush>
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
                  kpis={<span className="ld-secondary">Declares {list(c.declaredConstraints.map(capChip))}. Max bid {usdc(c.maxBidBaseUnits)}, cap {usdc(s.cap)} USDC.</span>}
                />
              );
            })}
          </div>
        </div>
      </div>
    ),
    evidence: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {evMain?.retrieval ? (
          (() => {
            const ex = evMain.retrieval.examples[0];
            const rec = ex ? evidenceRecord(ex.id) : undefined;
            const hint = evMain.retrieval.hintIds[0] ? evidenceHint(evMain.retrieval.hintIds[0]) : undefined;
            const exact = evMain.retrieval.method === "vector" && ex?.similarity === 1;
            return (
              <div className="ld-stack">
                <Ld.Callout tone="ch" title={exact ? "ContextHint had seen this exact question before" : `What ${nameOf(evMain.campaignId)}'s agent was shown`}>
                  {exact && rec ? `ContextHint is the intelligence platform for ChatGPT ads (contexthint.com). It records real prompts and the ads seen beside them; this question appeared next to an ad from ${rec.advertiser}, and that history goes to the agents as evidence.` : "ContextHint is the intelligence platform for ChatGPT ads (contexthint.com). It records real prompts and the ads seen beside them; past prompts close to this one go to the agent as evidence, with an inferred audience."}
                </Ld.Callout>
                {rec ? <Ld.EvidenceCard prompt={rec.promptText} advertiser={rec.advertiser} creative={rec.creativeText} sim={ex!.similarity} method={evMain.retrieval.method} hint={hint ? <span className="ld-stack" style={{ gap: 4 }}><Ld.Pv kind="inferred" label="Inferred hint" /><span className="ld-secondary">{hint.text}</span></span> : undefined} /> : null}
              </div>
            );
          })()
        ) : (
          <Ld.Callout tone="ch" title="ContextHint history">No agent was asked in this run, so no evidence was sent.</Ld.Callout>
        )}
        {evOther?.retrieval && ev ? (
          <div className="ld-stack">
            <Ld.Callout title={`${nameOf(evOther.campaignId)}'s packet${ev.eligibility.excluded.some((x) => x.campaignId === evOther.campaignId) ? ": it cannot bid here" : ""}`}>
              Its history drew ads from {list(Array.from(new Set(evOther.retrieval.examples.map((e) => evidenceRecord(e.id)?.advertiser).filter(Boolean) as string[])).slice(0, 3))}. Evidence cannot add a capability it never declared.
            </Ld.Callout>
            {evOther.retrieval.examples.slice(0, 2).map((e) => {
              const r = evidenceRecord(e.id)!;
              return <Ld.EvidenceCard key={e.id} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} sim={e.similarity} method={evOther.retrieval!.method} />;
            })}
          </div>
        ) : null}
      </div>
    ),
    decisions: hist?.e ? (
      (() => {
        const { o, campaignId, e } = hist;
        const tile = (d: Decision, label: string, tone?: "brand") => (
          <div className="pr2-ba" data-tone={tone}>
            <span className="ld-label">{label}</span>
            <span className="pr2-ba-lv">{lv(d)}</span>
            <span className="pr2-ba-bid">{d.decision === "bid" ? `${usdc(story.tableBid(d))} USDC` : "No bid"}</span>
            <span className="ld-caption">{d.decision === "bid" ? "Bid from the table" : `Agent said ${d.decision}`}</span>
          </div>
        );
        const others = run.campaigns.filter((c) => c.campaignId !== campaignId && decisionFor(o, c.campaignId, "history"));
        return (
          <div className="ld-stack-lg" style={{ gap: 16 }}>
            <div className="pr2-before-after">
              <div className="ld-stack" style={{ gap: 6 }}>
                <span className="ld-card-title">
                  {nameOf(campaignId)}, opportunity {o.n}: decided with Jev
                </span>
                <span className="ld-secondary">{e.changed ? `With ContextHint history its ${e.which} score moved ${e.sh > e.sb ? "up" : "down"}, just enough to change its level.` : "History moved its scores, but no level changed."}</span>
              </div>
              <div className="pr2-ba-row">
                {tile(e.b, "Without history")}
                <span className="pr2-ba-arrow" aria-hidden>
                  →
                </span>
                {tile(e.h, "With ContextHint history", "brand")}
              </div>
              <span className="ld-caption">{DISCLAIMER}</span>
            </div>
            <div className="ld-cols-3">
              <Ld.Panel title={`${nameOf(campaignId)}, intent score`} sub="Secondary detail">
                <Ld.ScoreRuler min={1.5} max={3} ticks={[2, 3]} width={300} marks={[{ value: e.b.scores.intent, kind: "baseline", label: "Without history" }, { value: e.h.scores.intent, kind: "history", label: "With history" }]} />
              </Ld.Panel>
              {others.slice(0, 2).map((c) => {
                const h = decisionFor(o, c.campaignId, "history")!;
                const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
                return (
                  <Ld.Panel key={c.campaignId} title={c.businessName} sub="Decided with Jev" actions={ex ? <Ld.Tag tone="dashed">Excluded by rule</Ld.Tag> : <Ld.Tag tone="outline">{h.decision === "bid" ? "Bid" : "Skip"}</Ld.Tag>}>
                    <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                      {lv(h)}. {ex ? `Excluded by rule (missing ${list(ex.missing.map((m) => m.replace(/_/g, " ")))}); evidence cannot add a capability.` : h.decision === "bid" ? `Bid ${usdc(story.tableBid(h))} USDC from the table.` : "Its agent chose no fitting creative."}
                    </p>
                  </Ld.Panel>
                );
              })}
            </div>
          </div>
        );
      })()
    ) : (
      <Ld.Callout title="Decided with Jev">Each agent rated relevance and intent; the model never names a price.</Ld.Callout>
    ),
    auction: auction?.award ? (
      (() => {
        const o = auction;
        const e = story.historyEffect(o, o.award!.campaignId);
        const f = tieFacts(o);
        const k = auctionKind(o);
        return (
          <div className="ld-stack-lg" style={{ gap: 14 }}>
            <div className="op2-bidtable">
              {run.policy.bidTable.map((r) => (
                <div key={r.levels} data-active={o.auction.bids.some((b) => b.levels === r.levels) || undefined}>
                  <span className="ld-caption">{levelsWords(r.levels).replace(/^r/, "R")}</span>
                  <span className="ld-stat-v">{r.bps / 100}%</span>
                  <span className="ld-caption">{usdc((Number(run.policy.maxBidBaseUnits) * r.bps) / 10000)} USDC</span>
                </div>
              ))}
            </div>
            <div className="pr2-split" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
              <Ld.Panel title={`Opportunity ${o.n} bids, USDC`} sub="Highest bid wins; the winner pays its own bid" actions={<Ld.Tag tone="brand">{k === "tie" ? "Tie rule" : k === "single" ? "Only bidder" : "Highest bid"}</Ld.Tag>}>
                <Ld.BidBars reveal max={max} floor={Number(o.floorBaseUnits)} format={fmt} rows={bars(o)} />
              </Ld.Panel>
              <div className="ld-stack" style={{ gap: 12 }}>
                <Ld.Callout title={k === "tie" ? "Why the bids are equal" : "How it was decided"}>
                  {k === "tie" && (f.sameMax || f.sameLevels) ? `${[f.sameCaps ? "Same capabilities" : null, f.sameMax ? `same ${usdc(f.max!)} USDC max bid` : null, f.sameLevels ? `same ratings (${levelsWords(f.levels)})` : null].filter(Boolean).join(", ")}. ` : ""}
                  {auctionSentence(o)}
                </Ld.Callout>
                {e ? (
                  <Ld.Callout tone="brand" title="What history changed here">
                    {e.changed && e.bidChanged ? `With history ${nameOf(o.award!.campaignId)}'s levels ${e.rose ? "rose" : "changed"} from ${e.b.relevanceLevel} and ${e.b.commercialIntentLevel} to ${e.h.relevanceLevel} and ${e.h.commercialIntentLevel}, so the bid table gave ${usdc(e.bidH)} USDC instead of ${usdc(e.bidB)}.` : `With and without history the bid table gave ${usdc(e.bidH)} USDC.`} {DISCLAIMER}
                    {cap && cap.o.n !== o.n ? ` On opportunity ${cap.o.n} the frequency cap, not a tie, decides who may bid.` : ""}
                  </Ld.Callout>
                ) : null}
              </div>
            </div>
            <div className="pr2-strip">
              <Ld.Stat label="Winner" value={nameOf(o.award!.campaignId)} caption={story.winnerCaption(o)} />
              <Ld.Stat label="Price" value={`${usdc(o.award!.priceBaseUnits)} USDC`} caption="First price: the winner pays its own bid" />
              <Ld.Stat label="Who set it" value="The bid table" caption="The model rated; code priced. Never the other way round" />
            </div>
          </div>
        );
      })()
    ) : (
      <Ld.Callout title="No auction ran">{nofill ? noFillSentence(nofill) : "No opportunity reached an auction."}</Ld.Callout>
    ),
    charge: paid ? (
      <div className="ld-stack-lg" style={{ gap: 14 }}>
        <div className="ld-flow">
          <Ld.FlowTile step="1. Award" title={`${nameOf(paid.award!.campaignId)} won`} state={<Ld.Money state="reserved" label="Reserved, not owed" />} value={`${usdc(paid.award!.priceBaseUnits)} USDC`}>
            <LiveHashV2 value={paid.award!.creative} expected={paid.award!.creativeHash} label="Creative hash recomputed here" />
          </Ld.FlowTile>
          <F from={2}>
            <Ld.FlowTile step="2. Delivery and signed receipt" title={`Card inserted, ${(paid.delivery!.msAfterAward / 1000).toFixed(1)} s after the award`}>
              <LiveHashV2 value={paid.receipt!.fields} expected={paid.receipt!.receiptHash} label="Receipt hash recomputed here" />
              <LiveSignatureV2 fields={paid.receipt!.fields} signature={paid.receipt!.signature} pem={run.publisher.publicKeyPEM} />
              <span className="ld-caption">
                Receipt <span className="ld-mono">{short(paid.receipt!.receiptHash, 10, 6)}</span>
              </span>
            </Ld.FlowTile>
          </F>
          <F from={3}>
            <Ld.FlowTile step="3. Charge, then voucher" title="Only now is it owed" state={<Ld.Money state="accepted" label="Accepted charge" />} value={`${usdc(paid.charge!.amountBaseUnits)} USDC`}>
              <Ld.Money state="authorized" label={`Voucher ${paid.voucher!.sequence}: ${usdc(paid.voucher!.cumulativeAmountBaseUnits)} in total`} />
            </Ld.FlowTile>
          </F>
        </div>
        <F from={2}>
          <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {card(paid)}
            <div className="ld-callout" style={{ alignContent: "start", gap: 8 }}>
              <span className="ld-card-title">What the app signed</span>
              <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                That it inserted this exact card, with its Sponsored label, for opportunity {paid.n}. Not that a person read it.
              </span>
              <span className="ld-secondary">
                Receipt hash <span className="ld-mono">{short(paid.receipt!.receiptHash)}</span>
              </span>
              <span className="ld-secondary">
                Ed25519 signature <span className="ld-mono">{short(paid.receipt!.signature)}</span>
              </span>
              <span className="ld-caption">Key {paid.receipt!.fields.publisherKeyId}, published in the same file</span>
            </div>
          </div>
        </F>
        <F from={3}>
          <ol className="st2-seq pr2-seq" aria-label="In order">
            <li>
              <b>Reserved</b> {usdc(paid.award!.priceBaseUnits)}
            </li>
            <li>
              <b>Inserted</b> +{(paid.delivery!.msAfterAward / 1000).toFixed(1)} s
            </li>
            <li>
              <b>Receipt signed</b> Ed25519
            </li>
            <li data-chain>
              <b>Charged</b> {usdc(paid.charge!.amountBaseUnits)}
            </li>
            <li data-chain>
              <b>Voucher {paid.voucher!.sequence}</b> {usdc(paid.voucher!.cumulativeAmountBaseUnits)} in total
            </li>
          </ol>
        </F>
      </div>
    ) : (
      <Ld.Callout title="Nothing was awarded">No award, so no receipt and no charge.</Ld.Callout>
    ),
    cap: (
      <div className="pr2-split" style={{ gridTemplateColumns: cap && nofill ? "1fr 1fr" : "1fr", gap: 24 }}>
        {cap ? (
          <div className="ld-stack">
            <Ld.Callout tone="warning" title="Agent said bid. Exchange did not admit it.">
              Opportunity {cap.o.n}: {earlierSameQuestion(cap.o) ? "the same question again. " : ""}
              {nameOf(cap.x.campaignId)} was already placed {cap.x.sessionAwards === 2 ? "twice" : `${cap.x.sessionAwards} times`} in this session ({cap.x.sessionAwards} of {cap.x.frequencyCap}). The frequency cap is a rule, not the agent. No bid, no amount.
            </Ld.Callout>
            <Ld.Panel title={`Opportunity ${cap.o.n} bids, USDC`} actions={<Ld.Tag tone="warning">Frequency cap</Ld.Tag>}>
              <Ld.BidBars max={max} floor={Number(cap.o.floorBaseUnits)} format={fmt} rows={bars(cap.o)} />
            </Ld.Panel>
          </div>
        ) : null}
        {nofill ? (
          <div className="ld-stack" style={{ gap: 10 }}>
            <Ld.ChatSpecimen app={run.publisher.displayName} question={nofill.question} meta={<Ld.Pv kind="actual" />} answer={nofill.organic.answer} slot={<div className="ld-nofill"><Ld.Pv kind="policy" label="No fill" /> No sponsored placement for this turn</div>} />
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              Opportunity {nofill.n}: {noFillSentence(nofill)} No auction, award, receipt or charge.
            </p>
          </div>
        ) : null}
        {!cap && !nofill ? (
          <Ld.Panel title="Every question, by rule" flush>
            <Ld.Table
              columns={[
                { key: "q", head: "Question", cell: (r: (typeof rows)[number]) => <span><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.label}</span></span> },
                { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible} of ${run.campaigns.length}` },
                { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
                { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
              ]}
              rows={rows}
            />
          </Ld.Panel>
        ) : null}
      </div>
    ),
    settlement: (
      <div className="ld-stack-lg" style={{ gap: 14 }}>
        <Ld.Callout tone="brand" title="Why Solana">
          {onDevnet ? "Solana Devnet is Solana's public test network. " : "The hosted Solana sandbox is a private test network that runs Solana programs. "}A small ad only makes sense if each delivery is not its own on-chain transaction. A payment channel turns many accepted charges into one open and one close on Solana. This run had {run.counts.receipts} deliveries over {run.channels.length} channels, about as many transactions as deliveries; a channel carrying 100 deliveries would still need only one open and one close (illustration, not from this run).
        </Ld.Callout>
        <div className="pr2-split" style={{ gridTemplateColumns: dvCard ? "1.35fr 1fr" : "1fr", gap: 14 }}>
          <div className="ld-cols-2">
            {run.channels.slice(0, 2).map((ch) => (
              <Ld.Panel key={ch.channelId} title={nameOf(ch.campaignId)} sub={`Payment channel, ${NET.name}`} actions={<Ld.Tag tone="success" dot>Finalized</Ld.Tag>}>
                <div className="ld-stack" style={{ gap: 10 }}>
                  <Ld.BalanceBar total={Number(ch.depositBaseUnits)} legend segments={[...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid ${usdc(v.incrementBaseUnits)}` })), { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` }]} />
                  <Ld.StepChart max={Number(ch.depositBaseUnits)} cap={Number(run.campaigns.find((c) => c.campaignId === ch.campaignId)!.budgetCapBaseUnits)} format={fmt} width={340} height={120} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `Voucher ${v.sequence}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
                </div>
              </Ld.Panel>
            ))}
          </div>
          {dvCard ? (
            <div className="ld-panel pr2-dv">
              <div className="ld-between">
                <span className="ld-card-title">{dvCard.title}</span>
                <Ld.Tag tone="brand">Solana Devnet</Ld.Tag>
              </div>
              <span className="ld-secondary">
                Channel{" "}
                {dvCard.addressUrl ? (
                  <a className="ld-link" href={dvCard.addressUrl} target="_blank" rel="noopener noreferrer">
                    <span className="ld-mono">{short(dvCard.address, 8, 6)}</span> ↗
                  </a>
                ) : (
                  <span className="ld-mono">{short(dvCard.address, 8, 6)}</span>
                )}
              </span>
              <div className="pr2-dv-tx">
                <span className="ld-label">Close transaction, finalized at slot {dvCard.slot.toLocaleString("en-US")}</span>
                <a className="ld-link" href={dvCard.sigUrl} target="_blank" rel="noopener noreferrer">
                  <span className="ld-mono">{short(dvCard.sig, 10, 8)}</span> ↗
                </a>
                <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                  +{usdc(dvCard.paid)} USDC to the publisher, +{usdc(dvCard.back)} back to the payer. The final voucher is checked on chain by the Ed25519 program.
                </span>
              </div>
              <span className="ld-caption">{dvCard.note}</span>
            </div>
          ) : null}
        </div>
      </div>
    ),
    verify: (
      <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="ld-stack" style={{ gap: 12 }}>
          <div className="pr2-split" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LiveVerifyTile context="Checked in this browser" />
            <Ld.Kpi label="New calls on restart" value={run.restart.newCalls} context={`Models off; ${run.restart.newCharges} new charges, ${run.restart.newSignatures} new signatures`} />
          </div>
          <LiveTamperResult n={paid?.n ?? 1} />
          <div className="ld-callout">
            <span className="ld-card-title">What Verify checks, on the public file</span>
            <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              {CHECK_TOTAL} recomputed checks: hashes, publisher signatures (Ed25519), sums and rules.{devnet ? " Separately, a few more tie the Devnet re-settlement file to the same receipts." : ""} Open Verify on this site to run them yourself.
            </span>
          </div>
        </div>
        <Ld.Panel title="What this run does not show">
          <ul className="ev2-list" style={{ fontSize: 15, color: "var(--ld-text)" }}>
            {limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Ld.Panel>
      </div>
    ),
    claim: (
      <div className="pr2-end">
        <p className="pr2-end-big">
          <span>Disclosed.</span> <span>Decided in code.</span> <span>Paid on delivery.</span>
        </p>
        <div className="pr2-end-grid">
          <div className="pr2-claim">
            <b>Disclosed</b>
            <span className="pr2-claim-n">
              {run.counts.receipts} of {run.counts.receipts}
            </span>
            <span>cards inserted with their Sponsored label, each in a receipt the app signed.</span>
          </div>
          <div className="pr2-claim">
            <b>Decided in code</b>
            <span className="pr2-claim-n">{run.counts.decisions}</span>
            <span>
              agent decisions by Jev; all {bidsChecked} bids equal the bid table{cap ? `, and a frequency cap kept ${nameOf(cap.x.campaignId)} out once` : ""}.
            </span>
          </div>
          <div className="pr2-claim" data-tone="brand">
            <b>Paid on delivery</b>
            <span className="pr2-claim-n">{usdc(run.totals.paidBaseUnits)} USDC</span>
            <span>
              from {run.counts.receipts} signed receipts, through {run.channels.length} payment channels on {NET.name}
              {devnet ? ", re-settled on Solana Devnet" : ""}. {CHECK_TOTAL} of {CHECK_TOTAL} checks pass.
            </span>
          </div>
        </div>
        <p className="pr2-close">Open Verify and check it yourself.</p>
      </div>
    ),
  };

  const extra = { devnet: !!devnet };
  const metas: BeatMeta[] = BEATS.map((b) => ({
    id: b.id,
    n: b.n,
    title: typeof b.title === "function" ? b.title(run) : b.title,
    steps: b.steps,
    durationMs: b.durationMs,
    exploreHref: typeof b.exploreHref === "function" ? b.exploreHref(run) : b.exploreHref,
    caption: b.caption(run, extra),
  }));
  return (
    <InspectorProvider scopeClass="ld">
      <PresentStage beats={metas} views={BEATS.map((b) => views[b.id])} phrase={process.env.AXP_RUN_LABEL ?? story.runPhrase} scope={onDevnet ? "Devnet test USDC, fictional advertisers" : devnet ? "Solana sandbox, re-settled on Devnet, test USDC, fictional advertisers" : "Hosted Solana sandbox, test USDC, fictional advertisers"} />
    </InspectorProvider>
  );
}
