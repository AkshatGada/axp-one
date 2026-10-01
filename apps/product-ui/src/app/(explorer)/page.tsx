import Link from "next/link";
import { DataTable, NumberStrip, PageHead, Provenance, SponsoredCard } from "@axp/design-system/ledger";
import { campaign, nameOf, run, usdc, whyLine } from "@/data/select";
import type { Opportunity } from "@/data/types";
import { AppSpecimen, WinnerCard } from "@/components/opportunity/parts";

export default function Overview() {
  const o1 = run.opportunities[0];
  return (
    <div className="ov">
      <div className="ov-hero">
        <PageHead
          kicker={
            <>
              <Provenance kind="replay" />
              <span className="lg-runid">{run.source.runId}</span>
            </>
          }
          title="One recorded run of an ad exchange inside an AI app."
          lede="Four questions were asked in an AI app. For each one, advertiser agents judged the moment, the exchange ran a sealed auction, the app showed a labelled Sponsored card, and the publisher's signed receipt turned delivery into a test USDC charge settled through payment channels. Everything here is the saved record of that run. Nothing re-executes."
        >
          <div className="lg-row" style={{ gap: 12, marginTop: 8 }}>
            <Link className="lg-btn" data-size="lg" href="/present/?auto=1">
              Watch the guided replay (4 min) <span className="lg-arrow">→</span>
            </Link>
            <Link className="lg-btn" data-variant="outline" data-size="lg" href="/opportunity/1/">
              Step through opportunity 1
            </Link>
          </div>
        </PageHead>
        <div className="ov-chat">
          <AppSpecimen o={o1} slot={<WinnerCard o={o1} />} />
        </div>
      </div>

      <NumberStrip
        items={[
          { value: run.counts.opportunities, label: "questions asked in the app" },
          { value: run.counts.decisions, label: "agent decisions, from 15 model calls" },
          { value: `${run.counts.auctions} + ${run.counts.noFill}`, label: "auctions, plus 1 no fill" },
          { value: run.counts.receipts, label: "signed deliveries" },
          { value: usdc(run.totals.paidBaseUnits), label: `test USDC paid; ${usdc(run.totals.refundedBaseUnits)} refunded` },
        ]}
      />

      <section className="lg-section">
        <div className="lg-section-head">
          <h2 className="lg-h1">What happened</h2>
          <span className="lg-small">In story order. The mobile question actually ran first.</span>
        </div>
        <DataTable
          columns={[
            { key: "n", head: "", width: "32px", cell: (o: Opportunity) => <span className="lg-h3">{o.n}</span> },
            {
              key: "q",
              head: "Question",
              cell: (o) => (
                <Link href={`/opportunity/${o.n}/`} style={{ textDecoration: "none" }}>
                  <span className="lg-h3" style={{ fontWeight: 400 }}>
                    {o.question}
                  </span>
                </Link>
              ),
            },
            { key: "w", head: "Winner", cell: (o) => (o.award ? nameOf(o.award.campaignId) : <span className="lg-muted">No fill</span>) },
            { key: "p", head: "Price", num: true, cell: (o) => (o.award ? <span className="lg-data">{usdc(o.award.priceBaseUnits)}</span> : <span className="lg-muted">none</span>) },
            { key: "y", head: "Why", cell: (o) => <span className="lg-small" style={{ color: "var(--ink)" }}>{whyLine(o)}</span> },
            { key: "t", head: "Accepted so far", num: true, cell: (o) => <span className="lg-data">{usdc(o.runningTotalBaseUnits)}</span> },
          ]}
          rows={run.opportunities}
        />
      </section>

      <section className="lg-section">
        <div className="lg-section-head">
          <h2 className="lg-h1">Who took part</h2>
          <Link className="lg-btn" data-variant="text" href="/advertisers/">
            How the advertisers joined
          </Link>
        </div>
        <div className="lg-grid-3">
          {run.campaigns.map((c) => (
            <SponsoredCard key={c.campaignId} square text={c.creative.approvedText} advertiser={c.businessName} url={c.creative.destinationURL} note={c.funded ? `Funded ${usdc(c.depositBaseUnits)} test USDC` : "Unfunded: no channel opened"} />
          ))}
        </div>
        <p className="lg-small">
          Publisher: {run.publisher.displayName}. Model for agent decisions: <span className="lg-data-sm">{run.policy.model}</span>; organic answers: <span className="lg-data-sm">{run.policy.organicModel}</span>.
        </p>
      </section>

      <section className="lg-section">
        <div className="lg-legend">
          <Provenance kind="replay" />
          <Provenance kind="actual" />
          <Provenance kind="observed" />
          <Provenance kind="inferred" />
          <Provenance kind="fictional" />
          <Provenance kind="policy" />
          <Provenance kind="settled" />
        </div>
        <p className="lg-small">
          Hosted Solana sandbox, not devnet or mainnet. Test USDC, not real money. One disposable test payer funded both fictional advertisers ({campaign("v3-clearvault").businessName} and {campaign("v3-keyforge").businessName}); they are not independent wallets.
        </p>
      </section>
    </div>
  );
}
