import Link from "next/link";
import { Ld, Term } from "@axp/design-system/ledger";
import { GLOSSARY } from "@/data/glossary";
import { nameOf, opportunity, run, usdc } from "@/data/select";
import { activityLanes, activitySegments, auctionRow, campaignStats, hhmm } from "@/components/v2/derive";
import { LiveVerifyTile } from "@/components/v2/live";
import { RowLink } from "@/components/v2/RowLink";
import { DevnetLine, hasDevnet } from "@/components/v2/devnet";

const L = Link as unknown as Ld.LinkC;

export default function Overview() {
  const rows = run.opportunities.map(auctionRow);
  const stats = run.campaigns.map((c) => campaignStats(c.campaignId));
  const o1 = opportunity(1);
  const bids = rows.reduce((n, r) => n + r.bidders, 0);
  const cv = run.channels[0];
  return (
    <>
      <Ld.PageBar
        title="One recorded run of an ad exchange inside an AI app"
        sub={<>People ask an AI app what to buy. Advertiser agents decide with <Term title={GLOSSARY.jev.term} def={GLOSSARY.jev.def}>Jev</Term>, using <Term title={GLOSSARY.contexthint.term} def={GLOSSARY.contexthint.def}>ContextHint</Term> history; code sets the price; the app shows one labelled Sponsored card; payment settles on a <Term title={GLOSSARY.solanaSandbox.term} def={GLOSSARY.solanaSandbox.def}>hosted Solana sandbox</Term> only after a signed delivery. Everything here is the saved record.</>}
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
              <Ld.SponsoredCard text={o1.award!.creative.approvedText} advertiser={nameOf(o1.award!.campaignId)} url={o1.award!.creative.destinationURL} />
            </div>
          </div>
          <figcaption className="ld-caption">
            Opportunity 1 as the person saw it: the answer, then one disclosed card. {nameOf(o1.award!.campaignId)} paid {usdc(o1.charge!.amountBaseUnits)} USDC, charged only after the app signed its receipt.
          </figcaption>
        </figure>
        <div className="ov2-side">
          <div className="ov2-kpis">
            <Ld.Kpi label="Questions" value={run.counts.opportunities} context={`${run.counts.auctions} filled, 1 no fill by rule`} href="/opportunity/1/" Link={L} />
            <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context={`${bids} became bids in an auction`} />
            <Ld.Kpi label="Prices" value={rows[0].price} unit="USDC" context={`Then ${rows[1].price} and ${rows[2].price} USDC`} />
            <Ld.Kpi label="Paid to the app" value={usdc(run.totals.chargesBaseUnits)} unit="USDC" context={`Test USDC; ${usdc(run.totals.refundedBaseUnits)} USDC refunded`} href="/settlement/" Link={L} />
            <Ld.Kpi label="Sandbox transactions" value={run.chainTxs.length} context={`For ${run.counts.receipts} paid deliveries`} href="/settlement/" Link={L} />
            <LiveVerifyTile context="Checked in your browser" />
          </div>
          <Ld.Callout tone="brand" title="Where a rule kept an agent out: opportunity 3">
            The same question was asked again. ClearVault&apos;s agent said bid, but ClearVault had already been placed twice in this session, so the frequency cap kept it out of the auction. KeyForge, the only admitted bidder, won at {rows[2].price} USDC. In opportunities 1 and 2 the wallets tied and a tie rule fixed in the exchange code decided. <a className="ld-link" href="/opportunity/3/#auction">Open opportunity 3</a>
          </Ld.Callout>
        </div>
      </div>

      <div className="ov2-grid">
        <Ld.Panel title="Auctions" sub="In story order. Select a row for the full pipeline." flush foot={<a className="ld-link" href="/opportunity/1/">Step through opportunity 1 →</a>}>
          <Ld.Table
            columns={[
              { key: "q", head: "Question", cell: (r: (typeof rows)[number]) => <RowLink href={`/opportunity/${r.o.n}/`}><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.label}</span></RowLink> },
              { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible} of 3` },
              { key: "b", head: "Bids", num: true, cell: (r) => r.bidders },
              { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
              { key: "p", head: "Price, USDC", num: true, cell: (r) => (r.price ? <span className="ld-strong">{r.price}</span> : <span className="ld-faint">none</span>) },
              { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
            ]}
            rows={rows}
          />
        </Ld.Panel>
        <Ld.Panel title="Why Solana" sub="Small ads need payments that don't each touch the chain">
          <div className="ld-stack" style={{ gap: 12 }}>
            <p className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              An ad here costs {rows[2].price} to {rows[0].price} USDC. That only makes sense if each delivery doesn&apos;t need its own on-chain transaction. A <Term title={GLOSSARY.channel.term} def={GLOSSARY.channel.def}>payment channel</Term> turns many accepted charges into one open and one close on Solana; in between, each delivery is a signed off-chain <Term title={GLOSSARY.voucher.term} def={GLOSSARY.voucher.def}>voucher</Term>.
            </p>
            <ol className="ov2-chan" aria-label={`${nameOf(cv.campaignId)} channel in order`}>
              <li data-chain>
                <b>Open</b> <span>Solana transaction, {usdc(cv.depositBaseUnits)} USDC locked</span>
              </li>
              {cv.vouchers.map((v) => (
                <li key={v.sequence}>
                  <b>Voucher {v.sequence}</b> <span>off-chain, {usdc(v.cumulativeAmountBaseUnits)} USDC in total</span>
                </li>
              ))}
              <li data-chain>
                <b>Close</b> <span>Solana transaction, {usdc(cv.settledBaseUnits)} paid, {usdc(cv.refundBaseUnits)} back</span>
              </li>
            </ol>
            <span className="ld-caption">
              {nameOf(cv.campaignId)}&apos;s channel: {cv.vouchers.length} deliveries, 2 transactions. Hosted Solana sandbox, test USDC. <a className="ld-link" href="/settlement/">Settlement</a>
            </span>
            <DevnetLine />
          </div>
        </Ld.Panel>
      </div>

      <Ld.Panel title="Run activity" sub="Exchange clock, UTC. The 70-minute idle gap is drawn as a break. Sandbox chain times are on Settlement, never on this axis.">
        <Ld.ActivityChart lanes={activityLanes()} segments={activitySegments()} fmt={hhmm} gapLabel="70 min" />
      </Ld.Panel>

      <div className="ov2-stack">
        <Ld.Panel title="Campaigns" sub="Three fictional advertisers" flush actions={<Ld.Button variant="ghost" size="sm" href="/advertisers/" Link={L}>How they joined</Ld.Button>}>
          <Ld.Table
            columns={[
              { key: "c", head: "Campaign", cell: (s: (typeof stats)[number]) => <RowLink href={`/advertisers/${s.c.slug}/`}><span className="ld-strong">{s.c.businessName}</span></RowLink> },
              { key: "s", head: "Status", cell: (s) => (s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>) },
              { key: "e", head: "Eligible", num: true, cell: (s) => `${s.eligible} of 4` },
              { key: "b", head: "Bids", num: true, cell: (s) => s.bids },
              { key: "w", head: "Wins", num: true, cell: (s) => s.wins },
              { key: "sp", head: "Spend vs cap, USDC", cell: (s) => <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)}`} /> },
              { key: "r", head: "Refunded at close, USDC", num: true, cell: (s) => (s.funded ? usdc(s.remaining) : <span className="ld-faint">no channel</span>) },
            ]}
            rows={stats}
          />
        </Ld.Panel>
        <Ld.Panel title="Payment channels" sub="Deposit, paid and refunded, test USDC on the hosted Solana sandbox" actions={<Ld.Button variant="ghost" size="sm" href="/settlement/" Link={L}>Settlement</Ld.Button>}>
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
        {hasDevnet ? "The recorded run settled on a hosted Solana sandbox; devnet links are on Settlement." : "Hosted Solana sandbox, not devnet or mainnet."} Test USDC, not real money. One disposable test payer funded both fictional advertisers. Agent decisions by {run.policy.model}; organic answers by {run.policy.organicModel}.
      </p>
    </>
  );
}
