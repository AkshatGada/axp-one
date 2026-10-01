import Link from "next/link";
import { Ld } from "@axp/design-system/ledger";
import { nameOf, opportunity, run, usdc } from "@/data/select";
import { activityLanes, activitySegments, auctionRow, campaignStats, hhmm } from "@/components/v2/derive";
import { LiveVerifyTile } from "@/components/v2/live";
import { RowLink } from "@/components/v2/RowLink";

const L = Link as unknown as Ld.LinkC;

export default function Overview() {
  const rows = run.opportunities.map(auctionRow);
  const stats = run.campaigns.map((c) => campaignStats(c.campaignId));
  const last = opportunity(3);
  const bids = rows.reduce((n, r) => n + r.bidders, 0);
  return (
    <>
      <Ld.PageBar
        title="Overview"
        meta={<Ld.Tag tone="brand">Recorded run</Ld.Tag>}
        sub="One recorded run of an ad exchange inside an AI app: four questions, advertiser agents, sealed auctions, disclosed Sponsored cards and test USDC settlement. Everything is the saved record; nothing re-executes. Built on ContextHint data, Jev decisions and Solana settlement."
        actions={
          <>
            <Ld.Button variant="secondary" href="/opportunity/1/" Link={L}>
              Step through opportunity 1
            </Ld.Button>
            <Ld.Button href="/present/?auto=1" Link={L}>
              Watch the guided replay
            </Ld.Button>
          </>
        }
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Opportunities" value={run.counts.opportunities} context="Questions asked in the app" href="/opportunity/1/" Link={L} />
        <Ld.Kpi label="Fill" value={`${run.counts.auctions} of ${run.counts.opportunities}`} context="1 no fill by rule, 0 agent calls" />
        <Ld.Kpi label="Agent decisions" value={run.counts.decisions} context={`${bids} became bids in an auction`} />
        <Ld.Kpi label="Clearing prices" value={rows[0].price} context={`Then ${rows[1].price} and ${rows[2].price} on opportunities 2 and 3`} />
        <Ld.Kpi label="Accepted spend" value={usdc(run.totals.chargesBaseUnits)} context={`Test USDC paid out; ${usdc(run.totals.refundedBaseUnits)} refunded`} chip={<Ld.Tag tone="brand">Sandbox</Ld.Tag>} href="/settlement/" Link={L} />
        <LiveVerifyTile />
      </div>

      <div className="ov2-grid">
        <Ld.Panel title="Auctions" sub="In story order. Select a row for the full pipeline." flush>
          <Ld.Table
            columns={[
              { key: "q", head: "Opportunity", cell: (r: (typeof rows)[number]) => <RowLink href={`/opportunity/${r.o.n}/`}><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{r.label}</span></RowLink> },
              { key: "e", head: "Eligible", num: true, cell: (r) => `${r.eligible} of 3` },
              { key: "b", head: "Bids", num: true, cell: (r) => r.bidders },
              { key: "w", head: "Winner", cell: (r) => r.winner ?? <span className="ld-faint">nobody</span> },
              { key: "p", head: "Price", num: true, cell: (r) => (r.price ? <span className="ld-strong">{r.price}</span> : <span className="ld-faint">none</span>) },
              { key: "t", head: "Outcome", cell: (r) => <Ld.Tag tone={r.tag.tone}>{r.tag.label}</Ld.Tag> },
            ]}
            rows={rows}
          />
        </Ld.Panel>
        <Ld.Panel title="Latest delivery" sub={`Opportunity ${last.n} · ${nameOf(last.award!.campaignId)} · ${usdc(last.charge!.amountBaseUnits)}`} actions={<Ld.Button variant="ghost" size="sm" href={`/opportunity/${last.n}/#charge`} Link={L}>Open</Ld.Button>}>
          <div className="ld-stack">
            <div className="ld-chat-q" style={{ justifySelf: "start", maxWidth: "100%", borderRadius: "16px 16px 16px 4px" }}>{last.question}</div>
            <Ld.SponsoredCard text={last.award!.creative.approvedText} advertiser={nameOf(last.award!.campaignId)} url={last.award!.creative.destinationURL} />
            <Ld.Verified state="pass">Signed receipt; checked on Verify</Ld.Verified>
          </div>
        </Ld.Panel>
      </div>

      <Ld.Panel title="Run activity" sub="Exchange clock, UTC. The 70-minute idle gap is drawn as a break. Sandbox chain times are on Settlement, never on this axis.">
        <Ld.ActivityChart lanes={activityLanes()} segments={activitySegments()} fmt={hhmm} gapLabel="70 min" />
      </Ld.Panel>

      <div className="ov2-grid">
        <Ld.Panel title="Campaigns" sub="Three fictional advertisers" flush actions={<Ld.Button variant="ghost" size="sm" href="/advertisers/" Link={L}>How they joined</Ld.Button>}>
          <Ld.Table
            columns={[
              { key: "c", head: "Campaign", cell: (s: (typeof stats)[number]) => <RowLink href={`/advertisers/${s.c.slug}/`}><span className="ld-strong">{s.c.businessName}</span></RowLink> },
              { key: "s", head: "Status", cell: (s) => (s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>) },
              { key: "e", head: "Eligible", num: true, cell: (s) => `${s.eligible} of 4` },
              { key: "b", head: "Bids", num: true, cell: (s) => s.bids },
              { key: "w", head: "Wins", num: true, cell: (s) => s.wins },
              { key: "sp", head: "Spend vs cap", cell: (s) => <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)}`} /> },
              { key: "r", head: "Refunded at close", num: true, cell: (s) => (s.funded ? usdc(s.remaining) : <span className="ld-faint">no channel</span>) },
            ]}
            rows={stats}
          />
        </Ld.Panel>
        <Ld.Panel title="Channels" sub="Deposit, paid and refunded, test USDC" actions={<Ld.Button variant="ghost" size="sm" href="/settlement/" Link={L}>Settlement</Ld.Button>}>
          <div className="ld-stack-lg" style={{ gap: 18 }}>
            {run.channels.map((ch) => (
              <div key={ch.channelId} className="ld-stack" style={{ gap: 8 }}>
                <div className="ld-between">
                  <span className="ld-strong">{nameOf(ch.campaignId)}</span>
                  <span className="ld-caption">
                    {usdc(ch.settledBaseUnits)} paid · {usdc(ch.refundBaseUnits)} back of {usdc(ch.depositBaseUnits)}
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
            <div className="ld-row" style={{ gap: 14 }}>
              <Ld.Money state="settled" label="Paid to the publisher" />
              <Ld.Money state="refunded" label="Refunded" />
            </div>
          </div>
        </Ld.Panel>
      </div>

      <p className="ld-caption">
        Hosted Solana sandbox, not devnet or mainnet. Test USDC, not real money. One disposable test payer funded both fictional advertisers. Agent decisions by {run.policy.model}; organic answers by {run.policy.organicModel}.
      </p>
    </>
  );
}
