import Link from "next/link";
import { Ld, Term } from "@axp/design-system/ledger";
import { GLOSSARY } from "@/data/glossary";
import { nameOf, opportunity, run, usdc } from "@/data/select";
import { activityGapLabel, activityLanes, activitySegments, auctionRow, campaignStats, hhmm } from "@/components/v2/derive";
import { LiveVerifyTile } from "@/components/v2/live";
import { RowLink } from "@/components/v2/RowLink";
import { DevnetLine, hasDevnet } from "@/components/v2/devnet";
import { firstPaid, highlight, onDevnet, otherAuctionsLine } from "@/data/story";
import { asset } from "@/lib/paths";

const L = Link as unknown as Ld.LinkC;

export default function Overview() {
  const rows = run.opportunities.map(auctionRow);
  const stats = run.campaigns.map((c) => campaignStats(c.campaignId));
  const o1 = firstPaid() ?? run.opportunities[0];
  const bids = rows.reduce((n, r) => n + r.bidders, 0);
  const cv = run.channels.slice().sort((a, b) => b.vouchers.length - a.vouchers.length)[0];
  const hl = highlight();
  const prices = rows.filter((r) => r.price).map((r) => r.price!);
  const lo = prices.length ? prices.reduce((a, b) => (Number(a) <= Number(b) ? a : b)) : null;
  const hi = prices.length ? prices.reduce((a, b) => (Number(a) >= Number(b) ? a : b)) : null;
  const deliveries = run.counts.receipts;
  return (
    <>
      <Ld.PageBar
        title={onDevnet ? "One live run of an ad exchange inside an AI app" : "One recorded run of an ad exchange inside an AI app"}
        sub={<>People ask an AI app what to buy. Advertiser agents decide whether to bid; code sets the price; the app shows one labelled Sponsored card, paid only after a signed delivery.</>}
        actions={
          <>
            <Ld.Button variant="secondary" href="/present/?auto=1" Link={L}>
              Watch the guided replay
            </Ld.Button>
            <Ld.Button href="/opportunity/1/" Link={L}>
              Step through opportunity 1
            </Ld.Button>
          </>
        }
      />
      <dl className="ov2-defs">
        <div>
          <dt>
            <Term title={GLOSSARY.jev.term} def={GLOSSARY.jev.def}>Jev</Term>
          </dt>
          <dd>The judgment model each advertiser&apos;s agent uses to rate relevance and intent. It never names a price.</dd>
        </div>
        <div>
          <dt>
            <Term title={GLOSSARY.contexthint.term} def={GLOSSARY.contexthint.def}>ContextHint</Term>
          </dt>
          <dd>
            ContextHint is the intelligence platform for ChatGPT ads. It records real prompts and the ads seen beside them; agents get past examples and an inferred audience as evidence.{" "}
            <a className="ld-link" href="https://contexthint.com" target="_blank" rel="noopener noreferrer">
              contexthint.com
            </a>
          </dd>
        </div>
        <div>
          <dt>{onDevnet ? <Term title={GLOSSARY.devnet.term} def={GLOSSARY.devnet.def}>Solana Devnet</Term> : <Term title={GLOSSARY.solanaSandbox.term} def={GLOSSARY.solanaSandbox.def}>Hosted Solana sandbox</Term>}</dt>
          <dd>{onDevnet ? "Solana's public test network. Every transaction opens in the Solana explorer." : "A private test network that runs Solana programs, used for this run. Test tokens only; not mainnet."}</dd>
        </div>
      </dl>
      <div className="ov2-hero">
        <figure className="ov2-pic">
          <div className="ld-chat">
            <div className="ld-chat-bar">
              <span>{run.publisher.displayName}</span>
              <Ld.Pv kind="replay" label="Recorded" />
            </div>
            <div className="ld-chat-body">
              <div className="ld-chat-q">{o1.question}</div>
              <div className="ld-chat-meta">
                <Ld.Pv kind="actual" />
                <span>The app&apos;s own answer, no advertiser material</span>
              </div>
              <p className="ld-chat-a ov2-answer">{o1.organic.answer}</p>
              {o1.award ? <Ld.SponsoredCard text={o1.award.creative.approvedText} advertiser={nameOf(o1.award.campaignId)} url={o1.award.creative.destinationURL} /> : <div className="ld-nofill">No sponsored placement for this turn</div>}
            </div>
          </div>
          <figcaption className="ld-caption">
            {o1.award && o1.charge ? `Opportunity ${o1.n} as the person saw it: the answer, then one disclosed card. ${nameOf(o1.award.campaignId)} paid ${usdc(o1.charge.amountBaseUnits)} USDC, charged only after the app signed its receipt.` : `Opportunity ${o1.n} as the person saw it.`}
          </figcaption>
        </figure>
        <div className="ov2-side">
          <div className="ov2-kpis">
            <Ld.Kpi label="Questions" value={run.counts.opportunities} context={`${run.counts.auctions} filled${run.counts.noFill ? `, ${run.counts.noFill} no fill` : ""}`} href="/opportunity/1/" Link={L} />
            <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context={`${bids} became bids in an auction`} />
            <Ld.Kpi label={lo === hi ? "Price" : "Top price"} value={hi ?? "none"} unit={hi ? "USDC" : undefined} context={lo && lo !== hi ? `Lowest ${lo} USDC; ${prices.length} auctions won` : `${prices.length} auction${prices.length === 1 ? "" : "s"} won`} />
            <Ld.Kpi label="Paid to the app" value={usdc(run.totals.chargesBaseUnits)} unit="USDC" context={`Test USDC; ${usdc(run.totals.refundedBaseUnits)} USDC refunded`} href="/settlement/" Link={L} />
            <Ld.Kpi label={`${onDevnet ? "Devnet" : "Sandbox"} transactions`} value={run.chainTxs.length} context={`For ${deliveries} paid deliver${deliveries === 1 ? "y" : "ies"}`} href="/settlement/" Link={L} />
            <LiveVerifyTile context="Checked in your browser" />
          </div>
          {hl ? (
            <Ld.Callout tone="brand" title={hl.title}>
              {hl.body} {otherAuctionsLine(hl.n)} <a className="ld-link" href={asset(`/opportunity/${hl.n}/#auction`)}>Open opportunity {hl.n}</a>
            </Ld.Callout>
          ) : null}
        </div>
      </div>

      <div className="ov2-grid">
        <Ld.Panel title="Auctions" sub="In story order. Select a row for the full pipeline." flush>
          <Ld.Table
            columns={[
              { key: "q", head: "Question", cell: (r: (typeof rows)[number]) => <RowLink href={`/opportunity/${r.o.n}/`}><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.label}</span></RowLink> },
              { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible} of ${run.campaigns.length}` },
              { key: "b", head: "Bids", num: true, cell: (r) => r.bidders },
              { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
              { key: "p", head: "Price, USDC", num: true, cell: (r) => (r.price ? <span className="ld-strong">{r.price}</span> : <span className="ld-faint">none</span>) },
              { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
            ]}
            rows={rows}
          />
        </Ld.Panel>
        <Ld.Panel title="Why Solana" sub="Small ads need payments that don't each touch the chain">
          <div className="ld-stack" style={{ gap: 10 }}>
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              {lo ? `An ad here costs ${lo === hi ? lo : `${lo} to ${hi}`} USDC. ` : ""}A <Term title={GLOSSARY.channel.term} def={GLOSSARY.channel.def}>payment channel</Term> locks a deposit once on Solana; each accepted delivery is a signed off-chain <Term title={GLOSSARY.voucher.term} def={GLOSSARY.voucher.def}>voucher</Term>; one close pays the publisher.{cv ? ` ${nameOf(cv.campaignId)}'s channel: open, ${cv.vouchers.map((v) => `voucher ${v.sequence} (${usdc(v.cumulativeAmountBaseUnits)} in total)`).join(", ")}, close.` : ""}
            </p>
            <span className="ld-caption">
              This run had {deliveries} paid deliver{deliveries === 1 ? "y" : "ies"} over {run.channels.length} channel{run.channels.length === 1 ? "" : "s"}, so channels cost about as many transactions ({run.chainTxs.length}) as deliveries here. Illustration, not from this run: a channel still needs only one open and one close for 100 deliveries.
            </span>
            {onDevnet ? (
              <a className="ld-link" href={asset("/settlement/")}>
                Every transaction on the Solana explorer
              </a>
            ) : (
              <DevnetLine />
            )}
          </div>
        </Ld.Panel>
      </div>

      <Ld.Panel title="Run activity" sub={`Exchange clock, UTC.${activityGapLabel() ? ` The ${activityGapLabel()} idle gap is drawn as a break.` : ""} Chain times are on Settlement, never on this axis.`}>
        <Ld.ActivityChart lanes={activityLanes()} segments={activitySegments()} fmt={hhmm} gapLabel={activityGapLabel()} />
      </Ld.Panel>

      <div className="ov2-stack">
        <Ld.Panel title="Campaigns" sub={`${run.campaigns.length} fictional advertisers`} flush actions={<Ld.Button variant="ghost" size="sm" href="/advertisers/" Link={L}>How they joined</Ld.Button>}>
          <Ld.Table
            columns={[
              { key: "c", head: "Campaign", cell: (s: (typeof stats)[number]) => <RowLink href={`/advertisers/${s.c.slug}/`}><span className="ld-strong">{s.c.businessName}</span></RowLink> },
              { key: "s", head: "Status", cell: (s) => (s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>) },
              { key: "e", head: "Eligible", num: true, cell: (s) => `${s.eligible} of ${run.opportunities.length}` },
              { key: "b", head: "Bids", num: true, cell: (s) => s.bids },
              { key: "w", head: "Wins", num: true, cell: (s) => s.wins },
              { key: "sp", head: "Spend vs cap, USDC", cell: (s) => <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)}`} /> },
              { key: "r", head: "Refunded at close, USDC", num: true, cell: (s) => (s.funded ? usdc(s.remaining) : <span className="ld-faint">no channel</span>) },
            ]}
            rows={stats}
          />
        </Ld.Panel>
        <Ld.Panel title="Payment channels" sub={`Deposit, paid and refunded, test USDC on ${onDevnet ? "Solana Devnet" : "the hosted Solana sandbox"}`} actions={<Ld.Button variant="ghost" size="sm" href="/settlement/" Link={L}>Settlement</Ld.Button>}>
          <div className="ld-stack-lg" style={{ gap: 18 }}>
            <div className="ov2-channels">
            {run.channels.map((ch) => (
              <div key={ch.channelId} className="ld-stack" style={{ gap: 8 }}>
                <div className="ld-between">
                  <span className="ld-strong">{nameOf(ch.campaignId)}</span>
                  <span className="ld-caption">
                    {usdc(ch.settledBaseUnits)} paid, {usdc(ch.refundBaseUnits)} back, of {usdc(ch.depositBaseUnits)} USDC
                  </span>
                </div>
                <Ld.BalanceBar
                  total={Number(ch.depositBaseUnits)}
                  segments={[
                    ...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid ${usdc(v.incrementBaseUnits)}` })),
                    { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` },
                  ]}
                />
              </div>
            ))}
            </div>
            <div className="ld-row" style={{ gap: 14 }}>
              <Ld.Money state="settled" label="Paid to the publisher" />
              <Ld.Money state="refunded" label="Refunded" />
            </div>
          </div>
        </Ld.Panel>
      </div>

      <p className="ld-caption">
        {onDevnet ? "Settled live on Solana Devnet in Devnet test USDC; not mainnet, not real money." : hasDevnet ? "The recorded run settled on a hosted Solana sandbox; Devnet links are on Settlement. Test USDC, not real money." : "Hosted Solana sandbox, not Devnet or mainnet. Test USDC, not real money."} {new Set(run.channels.map((c) => c.payer)).size === 1 && run.channels.length > 1 ? "One disposable test payer funded every advertiser. " : ""}Agent decisions by {run.policy.model}; organic answers by {run.policy.organicModel}.
      </p>
    </>
  );
}
