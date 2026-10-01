import type { Metadata } from "next";
import Link from "next/link";
import { Amount, Callout, CheckMark, CopyHash, DataTable, KeyValue, Lamports, PageHead, Provenance, Section, StatusStamp, Term } from "@axp/design-system/ledger";
import { campaign, nameOf, run, usdc } from "@/data/select";
import { channelMeter, ladder, txCard } from "@/components/money";
import { GLOSSARY } from "@/data/glossary";

export const metadata: Metadata = { title: "Settlement" };

export default function SettlementPage() {
  const [cv] = run.channels;
  const samePayer = run.channels.every((c) => c.payer === cv.payer);
  const capOk = BigInt(run.fees.grossFeeAndRentLamports) <= BigInt(run.fees.capLamports);
  return (
    <>
      <PageHead
        kicker={<Provenance kind="settled" label="Settled on the hosted Solana sandbox" />}
        title="Two payment channels, three receipts, one settlement each."
        lede="Each funded advertiser locked a 0.020 test USDC deposit in its own channel. Every accepted delivery advanced a cumulative off-chain authorization (a voucher). At close, the publisher received the last authorized total and the rest went back. No transfer per ad."
      />

      {run.channels.map((ch) => {
        const c = campaign(ch.campaignId);
        const seq = [
          { k: "Open", v: `deposit ${usdc(ch.depositBaseUnits)}`, chain: true },
          ...ch.vouchers.flatMap((v) => [
            { k: `Charge ${v.sequence}`, v: `opportunity ${v.opportunityN}, ${usdc(v.incrementBaseUnits)}`, chain: false },
            { k: `Voucher ${v.sequence}`, v: `${usdc(v.cumulativeAmountBaseUnits)} in total`, chain: false },
          ]),
          { k: "Close", v: `${usdc(ch.settledBaseUnits)} paid, ${usdc(ch.refundBaseUnits)} back`, chain: true },
        ];
        return (
          <section key={ch.channelId} id={c.slug} className="lg-section">
            <div className="lg-section-head">
              <h2 className="lg-h1">{c.businessName}</h2>
              <span className="lg-row" style={{ gap: 10 }}>
                <Provenance kind="fictional" label="Fictional advertiser" />
                <span className="lg-data-sm">{ch.channelId}</span>
              </span>
            </div>
            <div className="st-channel">
              {channelMeter(ch)}
              <div className="lg-stack-sm">
                <span className="lg-label">In order, without timestamps. Shaded steps are on chain; the rest are off chain.</span>
                <div className="lg-seq">
                  {seq.map((s, i) => (
                    <div key={i} data-kind={s.chain ? "chain" : undefined}>
                      <span className="lg-label">{s.k}</span>
                      <span className="lg-small" style={{ color: "var(--ink)" }}>
                        {s.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="st-cols">
                <div className="lg-stack">
                  <span className="lg-h3">
                    <Term title={GLOSSARY.cumulative.term} def={GLOSSARY.cumulative.def}>
                      Cumulative vouchers
                    </Term>
                  </span>
                  {ladder(ch)}
                  {ch.vouchers.length > 1 ? (
                    <p className="lg-small">
                      #2 replaces #1's authority: {usdc(ch.vouchers[1].cumulativeAmountBaseUnits)} in total, not {usdc(ch.vouchers[0].cumulativeAmountBaseUnits)} + {usdc(ch.vouchers[1].cumulativeAmountBaseUnits)}.
                    </p>
                  ) : null}
                  <KeyValue
                    dense
                    rows={[
                      { k: "Phase", v: <span className="lg-row" style={{ gap: 8 }}><span className="lg-data-sm">{ch.phase}</span><span className="lg-small">No reconciliation needed</span></span> },
                      { k: "Channel on chain", v: <CopyHash value={ch.protocolChannelId} label="channel" /> },
                      { k: "Terms hash", v: <CopyHash value={ch.termsHash} label="terms hash" /> },
                      { k: "Program", v: <CopyHash value={ch.program} label="program" /> },
                      { k: "Mint", v: <CopyHash value={ch.mint} label="mint" /> },
                      { k: "Payer", v: <span className="lg-stack-sm" style={{ gap: 2 }}><CopyHash value={ch.payer} label="payer" />{samePayer ? <span className="lg-small">Same disposable payer for both channels</span> : null}</span> },
                      { k: "Payee", v: <span className="lg-stack-sm" style={{ gap: 2 }}><CopyHash value={ch.payee} label="payee" /><span className="lg-small">{run.publisher.displayName}</span></span> },
                    ]}
                  />
                </div>
                <div className="lg-stack">
                  {txCard(ch, ch.open)}
                  {txCard(ch, ch.close)}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="lg-section" id="leatherguard">
        <div className="lg-row" style={{ justifyContent: "space-between" }}>
          <span className="lg-row" style={{ gap: 14 }}>
            <span className="lg-h2">{nameOf(run.unfunded[0].campaignId)}</span>
            <StatusStamp tone="dashed">Unfunded: no channel</StatusStamp>
          </span>
          <span className="lg-small">Channel status {run.unfunded[0].status.replace("_", " ")}, deposit <Amount baseUnits={run.unfunded[0].depositBaseUnits} />. It never reached an auction.</span>
        </div>
      </section>

      <Section id="totals" title="Totals" lede="Test USDC and test SOL are counted separately. They never share a column.">
        <div className="st-cols">
          <div className="lg-stack-sm">
            <span className="lg-label">Test USDC</span>
            <DataTable
              columns={[
                { key: "k", head: "", cell: (r: { k: string; v: string }) => r.k },
                { key: "v", head: "USDC", num: true, cell: (r) => <Amount baseUnits={r.v} unit="" /> },
              ]}
              rows={[
                { k: "Deposits", v: run.totals.depositsBaseUnits },
                { k: "Paid to the publisher", v: run.totals.paidBaseUnits },
                { k: "Refunded to the payer", v: run.totals.refundedBaseUnits },
              ]}
            />
            <p className="lg-small">Paid plus refunded equals deposited. Paid equals the three accepted charges.</p>
          </div>
          <div className="lg-stack-sm">
            <span className="lg-label">
              Test SOL, in <Term title={GLOSSARY.lamports.term} def={GLOSSARY.lamports.def}>lamports</Term>
            </span>
            <DataTable
              columns={[
                { key: "k", head: "", cell: (r: { k: string; v: string }) => r.k },
                { key: "v", head: "Lamports", num: true, cell: (r) => <Lamports value={r.v} /> },
              ]}
              rows={[
                { k: "Network fees, 4 transactions", v: run.fees.networkFeeLamports },
                { k: "New rent, gross", v: run.fees.newRentLamports },
                { k: "Reclaimed rent at close", v: run.fees.reclaimedRentLamports },
                { k: "Fees plus new rent, gross", v: run.fees.grossFeeAndRentLamports },
                { k: "Run cap", v: run.fees.capLamports },
              ]}
            />
            <CheckMark state={capOk ? "pass" : "fail"}>{capOk ? "Within the cap" : "Over the cap"}</CheckMark>
            <p className="lg-small">Fees and rent are paid in test SOL (lamports) and never mixed with USDC. Reclaimed rent is not subtracted from the cap.</p>
          </div>
        </div>
        <Callout title="Funding is not settlement">
          <p>An approved one-time sandbox faucet top-up funded the payer. Funding is not settlement. Absolute wallet balances include funds from before this run, so only per-transaction changes are shown.</p>
        </Callout>
        <p className="lg-small">
          Exchange times and sandbox block times come from different clocks; the <Link href="/timeline/">timeline</Link> keeps them in separate lanes.
        </p>
      </Section>
    </>
  );
}
