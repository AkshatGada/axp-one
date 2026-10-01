import type { Metadata } from "next";
import Link from "next/link";
import { CopyHash, InspectButton, Ld, Term } from "@axp/design-system/ledger";
import { GLOSSARY } from "@/data/glossary";
import { campaign, nameOf, run, usdc } from "@/data/select";
import { txPayload } from "@/components/money";
import type { Channel, ChainTx } from "@/data/types";
import { DevnetSettlementSection, Ext, hasDevnet } from "@/components/v2/devnet";
import { NET, list, onDevnet, onePayer, rentWords } from "@/data/story";

export const metadata: Metadata = { title: onDevnet ? "Settlement, live on Solana Devnet" : hasDevnet ? "Settlement: hosted Solana sandbox and Solana Devnet" : "Hosted Solana sandbox settlement" };
const L = Link as unknown as Ld.LinkC;
const lam = (v: string | number) => Number(v).toLocaleString("en-US");

function TxRow({ ch, t }: { ch: Channel; t: ChainTx }) {
  return (
    <tr>
      <td>
        <span className="ld-stack" style={{ gap: 2 }}>
          <span className="ld-strong">{t.kind === "open" ? "Open channel" : "Close channel"}</span>
          <span className="ld-caption">
            {NET.tx}, slot {t.slot.toLocaleString("en-US")}
            {t.explorerUrl ? (
              <>
                {" "}
                <Ext href={t.explorerUrl}>Explorer</Ext>
              </>
            ) : null}
          </span>
        </span>
      </td>
      <td>
        <Ld.Tag tone="success" dot>
          {t.finality === "finalized" ? "Finalized" : t.finality}
        </Ld.Tag>
      </td>
      <td data-num>{t.tokenDeltas.payer.startsWith("-") ? `−${usdc(t.tokenDeltas.payer.slice(1))}` : `+${usdc(t.tokenDeltas.payer)}`}</td>
      <td data-num>{t.tokenDeltas.publisher === "0" ? <span className="ld-faint">0</span> : `+${usdc(t.tokenDeltas.publisher)}`}</td>
      <td data-num>{lam(t.networkFeeLamports)}</td>
      <td data-num>{rentWords(t)}</td>
      <td>
        <InspectButton payload={txPayload(ch, t)} variant="text">
          Inspect
        </InspectButton>
      </td>
    </tr>
  );
}

export default function SettlementPage() {
  const capOk = BigInt(run.fees.grossFeeAndRentLamports) <= BigInt(run.fees.capLamports);
  const perOpenRent = run.channels[0]?.open.newRentLamports ?? "0";
  const perReclaim = run.channels[0]?.close.reclaimedRentLamports ?? "0";
  const deposits = Array.from(new Set(run.channels.map((c) => c.depositBaseUnits)));
  const opens = run.chainTxs.filter((t) => t.kind === "open").length;
  const closes = run.chainTxs.filter((t) => t.kind === "close").length;
  const reclaimPct = Math.round((Number(run.fees.reclaimedRentLamports) / Number(run.fees.newRentLamports)) * 100);
  return (
    <>
      <Ld.PageBar
        title={onDevnet ? "Payment channels, live on Solana Devnet" : hasDevnet ? "Payment channels on Solana" : "Payment channels on a hosted Solana sandbox"}
        meta={<Ld.Tag tone="success" dot>All finalized</Ld.Tag>}
        sub={<>Each funded advertiser locked {deposits.length === 1 ? `a ${usdc(deposits[0])} USDC (test)` : "a test USDC"} deposit in its own <Term title={GLOSSARY.channel.term} def={GLOSSARY.channel.def}>payment channel</Term> on {onDevnet ? <Term title={GLOSSARY.devnet.term} def={GLOSSARY.devnet.def}>Solana Devnet</Term> : <>a <Term title={GLOSSARY.solanaSandbox.term} def={GLOSSARY.solanaSandbox.def}>hosted Solana sandbox</Term></>}. Every accepted delivery advanced an off-chain <Term title={GLOSSARY.voucher.term} def={GLOSSARY.voucher.def}>voucher</Term>. One close per channel paid the publisher the last authorized total and refunded the rest. No transfer per ad.{hasDevnet ? ` The same ${run.counts.receipts} receipts were then settled again on Solana Devnet, shown separately below.` : ""}{onDevnet ? " Every transaction opens in the Solana explorer." : ""}</>}
        actions={hasDevnet ? <a className="ld-btn ld-btn--primary" href="#devnet">Solana Devnet re-settlement ↓</a> : undefined}
      />
      {hasDevnet ? (
        <div className="st2-part">
          <h2 className="ld-section-title">The recorded run&apos;s own settlement, on a hosted Solana sandbox</h2>
          <p className="ld-secondary">What the run did when it was recorded. The Devnet re-settlement is a separate section with its own numbers.</p>
        </div>
      ) : null}
      <div className="ld-kpis">
        <Ld.Kpi label="Deposited" value={usdc(run.totals.depositsBaseUnits)} unit="USDC" context={`Test USDC across ${run.channels.length} channel${run.channels.length === 1 ? "" : "s"}`} />
        <Ld.Kpi label="Paid to the publisher" value={usdc(run.totals.paidBaseUnits)} unit="USDC" context={`Equals the ${run.counts.receipts} accepted charge${run.counts.receipts === 1 ? "" : "s"}`} />
        <Ld.Kpi label="Refunded" value={usdc(run.totals.refundedBaseUnits)} unit="USDC" context="Returned to the payer at close" />
        <Ld.Kpi label={`${NET.short} transactions`} value={run.chainTxs.length} context={`${opens} open${opens === 1 ? "" : "s"}, ${closes} close${closes === 1 ? "" : "s"}, ${run.chainTxs.every((t) => t.finality === "finalized") ? "all finalized" : "see each"}`} />
        <Ld.Kpi label="Fees and new rent, lamports" value={lam(run.fees.grossFeeAndRentLamports)} context={`Test SOL, cap ${lam(run.fees.capLamports)}`} chip={<Ld.Tag tone={capOk ? "success" : "danger"} dot>{capOk ? "Within cap" : "Over cap"}</Ld.Tag>} />
      </div>

      {run.channels.map((ch) => {
        const c = campaign(ch.campaignId);
        const cap = Number(c.budgetCapBaseUnits);
        return (
          <section key={ch.channelId} id={c.slug} className="st2-channel">
            <Ld.Panel
              title={`${c.businessName}`}
              sub={`Payment channel on ${NET.the}, test USDC`}
              actions={
                <>
                  {ch.explorerUrl ? <Ext href={ch.explorerUrl}>Channel on the explorer</Ext> : <Ld.Pv kind="fictional" label="Fictional advertiser" />}
                  <Ld.Button variant="ghost" size="sm" href={`/advertisers/${c.slug}/`} Link={L}>
                    Campaign
                  </Ld.Button>
                </>
              }
              foot={
                <>
                  <span>
                    Phase {ch.phase}
                    {ch.reconciliationRequired ? ", reconciliation required" : ", no reconciliation needed"}.{onePayer ? " Same disposable test payer for every channel." : ""}
                  </span>
                  <span className="ld-row" style={{ gap: 6 }}>
                    <span>Channel</span>
                    <CopyHash value={ch.protocolChannelId} head={6} tail={4} label="channel address" />
                  </span>
                </>
              }
            >
              <div className="st2-cols">
                <div className="ld-stack" style={{ gap: 14 }}>
                  <div className="ld-cols-3">
                    <Ld.Stat label="Deposit" value={`${usdc(ch.depositBaseUnits)} USDC`} caption="Locked at open" />
                    <Ld.Stat label="Paid out" value={`${usdc(ch.settledBaseUnits)} USDC`} caption="Last voucher total" />
                    <Ld.Stat label="Refunded" value={`${usdc(ch.refundBaseUnits)} USDC`} caption="Back to the payer" />
                  </div>
                  <Ld.BalanceBar
                    total={Number(ch.depositBaseUnits)}
                    legend
                    segments={[
                      ...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Charge ${v.sequence}, opportunity ${v.opportunityN}: ${usdc(v.incrementBaseUnits)}` })),
                      { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` },
                    ]}
                  />
                  <div className="ld-stack" style={{ gap: 6 }}>
                    <span className="ld-label">In order, USDC (no clock times)</span>
                    <ol className="st2-seq" aria-label={`${c.businessName} channel in order`}>
                      <li data-chain>
                        <b>Open</b> {usdc(ch.depositBaseUnits)} locked
                      </li>
                      {ch.vouchers.map((v) => (
                        <li key={v.sequence} id={`voucher-${c.slug}-${v.sequence}`}>
                          <b>Voucher {v.sequence}</b> {usdc(v.cumulativeAmountBaseUnits)}
                        </li>
                      ))}
                      <li data-chain>
                        <b>Close</b> {usdc(ch.settledBaseUnits)} paid
                      </li>
                    </ol>
                    <span className="ld-caption">Open and close are {onDevnet ? "Devnet" : "sandbox"} transactions; vouchers are off-chain totals so far. {usdc(ch.refundBaseUnits)} USDC went back to the payer at close.</span>
                  </div>
                </div>
                <div className="ld-stack" style={{ gap: 6 }}>
                  <span className="ld-label">Cumulative authorization in USDC, against the {usdc(ch.depositBaseUnits)} deposit (campaign cap {usdc(cap)} as a line)</span>
                  <Ld.StepChart max={Number(ch.depositBaseUnits)} cap={cap} format={(x) => usdc(x)} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `Voucher ${v.sequence}, opp ${v.opportunityN}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
                  {ch.vouchers.length > 1 ? <span className="ld-caption">Each voucher replaces the one before: voucher {ch.vouchers.length} is {usdc(ch.vouchers[ch.vouchers.length - 1].cumulativeAmountBaseUnits)} in total, not the sum of the vouchers.</span> : null}
                </div>
              </div>
              <div className="ld-table-wrap" style={{ marginTop: 16, border: "1px solid var(--ld-border)", borderRadius: 10 }}>
                <table className="ld-table" id={`tx-close-${c.slug}`}>
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Status</th>
                      <th data-num>Payer USDC</th>
                      <th data-num>Publisher USDC</th>
                      <th data-num>Fee, lamports</th>
                      <th data-num>Rent, lamports</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    <TxRow ch={ch} t={ch.open} />
                    <TxRow ch={ch} t={ch.close} />
                  </tbody>
                </table>
              </div>
            </Ld.Panel>
          </section>
        );
      })}

      {run.unfunded.map((u) => {
        const ex = run.opportunities.filter((o) => o.eligibility.excluded.some((x) => x.campaignId === u.campaignId && x.reason === "missing_constraint"));
        const missing = Array.from(new Set(ex.flatMap((o) => o.eligibility.excluded.find((x) => x.campaignId === u.campaignId)!.missing)));
        return (
          <Ld.Panel key={u.channelId} title={nameOf(u.campaignId)} sub="No Solana channel was opened" actions={<Ld.Tag tone="dashed">Unfunded</Ld.Tag>}>
            <p className="ld-secondary">
              Channel status {u.status.replace(/_/g, " ")}, deposit {usdc(u.depositBaseUnits)}. With no channel it could never be charged.{ex.length ? ` It was excluded by rule in ${ex.length} of ${run.opportunities.length} questions (missing ${list(missing.map((m) => m.replace(/_/g, " ")))}).` : ""}
            </p>
          </Ld.Panel>
        );
      })}

      {run.chainExtras ? (
        <Ld.Panel title="Everything on the Solana explorer" sub="Every transaction, channel and wallet in this run, on Solana Devnet" flush actions={<Ld.Tag tone="brand">Solana Devnet</Ld.Tag>}>
          <Ld.Table
            columns={[
              { key: "k", head: "What", cell: (r: { k: string; v: string; url: string; note?: string }) => <span className="ld-stack" style={{ gap: 2 }}><span className="ld-strong">{r.k}</span>{r.note ? <span className="ld-caption">{r.note}</span> : null}</span> },
              { key: "v", head: "Address or signature", cell: (r) => <span className="ld-mono">{`${r.v.slice(0, 8)}…${r.v.slice(-6)}`}</span> },
              { key: "x", head: "", cell: (r) => <Ext href={r.url}>Explorer</Ext> },
            ]}
            rows={[
              ...(run.network.programExplorerUrl ? [{ k: "Payment channel program", v: run.channels[0].program, url: run.network.programExplorerUrl }] : []),
              ...(run.chainExtras.funding ? [{ k: "Funding, not settlement", v: run.chainExtras.funding.signature, url: run.chainExtras.funding.explorerUrl, note: `Funded ${run.chainExtras.funding.payers.length} payer wallet${run.chainExtras.funding.payers.length === 1 ? "" : "s"} before any channel opened` }] : []),
              ...run.channels.flatMap((ch) => [
                ...(ch.explorerUrl ? [{ k: `${nameOf(ch.campaignId)}'s channel`, v: ch.protocolChannelId, url: ch.explorerUrl }] : []),
                ...(ch.open.explorerUrl ? [{ k: `Open ${nameOf(ch.campaignId)}'s channel`, v: ch.open.signature, url: ch.open.explorerUrl, note: `${usdc(ch.depositBaseUnits)} USDC locked` }] : []),
                ...(ch.close.explorerUrl ? [{ k: `Close ${nameOf(ch.campaignId)}'s channel`, v: ch.close.signature, url: ch.close.explorerUrl, note: `${usdc(ch.settledBaseUnits)} paid, ${usdc(ch.refundBaseUnits)} back` }] : []),
              ]),
              ...run.chainExtras.payers.map((p) => ({ k: `${nameOf(p.campaignId)}'s payer wallet`, v: p.address, url: p.explorerUrl })),
              ...(run.chainExtras.publisher.address && run.chainExtras.publisher.explorerUrl ? [{ k: "Publisher wallet", v: run.chainExtras.publisher.address, url: run.chainExtras.publisher.explorerUrl }] : []),
            ]}
          />
        </Ld.Panel>
      ) : null}

      <details className="st2-more">
        <summary>
          <span className="ld-card-title">On-chain costs, totals and transaction order</span>
          <span className="ld-caption">Lamports, rent and the {NET.short === "Devnet" ? "Devnet" : "sandbox"} transactions by slot</span>
        </summary>
        <div className="ld-stack-lg" style={{ gap: 16 }}>
      <div className="ld-cols-2">
        <Ld.Panel title="Totals in test USDC" flush>
          <Ld.Table
            columns={[
              { key: "k", head: "", cell: (r: { k: string; v: string }) => r.k },
              { key: "v", head: "Test USDC", num: true, cell: (r) => <span className="ld-strong">{usdc(r.v)}</span> },
            ]}
            rows={[
              { k: "Deposits", v: run.totals.depositsBaseUnits },
              { k: "Accepted charges", v: run.totals.chargesBaseUnits },
              { k: "Paid to the publisher", v: run.totals.paidBaseUnits },
              { k: "Refunded to the payer", v: run.totals.refundedBaseUnits },
            ]}
          />
        </Ld.Panel>
        <Ld.Panel title="Fees and rent in lamports (test SOL)" flush foot={<span>Kept apart from USDC. Reclaimed rent is not subtracted from the cap.</span>}>
          <Ld.Table
            columns={[
              { key: "k", head: "", cell: (r: { k: string; v: string }) => r.k },
              { key: "v", head: "Lamports", num: true, cell: (r) => <span className="ld-strong">{lam(r.v)}</span> },
            ]}
            rows={[
              { k: `Network fees, ${run.chainTxs.length} transactions`, v: run.fees.networkFeeLamports },
              { k: "New rent, gross", v: run.fees.newRentLamports },
              { k: "Reclaimed rent at close", v: run.fees.reclaimedRentLamports },
              { k: "Fees plus new rent", v: run.fees.grossFeeAndRentLamports },
              { k: "Run cap", v: run.fees.capLamports },
            ]}
          />
        </Ld.Panel>
      </div>

      <Ld.Panel title={`${NET.short} transactions in order`} sub={`Ordered by slot on ${NET.the}. The chain keeps its own clock, so no clock times are shown here; they are in each transaction's Inspector record.`}>
        <Ld.Timeline
          rows={run.chainTxs.map((t, i) => ({
            key: t.signature,
            time: `${i + 1}`,
            what: `${t.kind === "open" ? "Open" : "Close"} ${nameOf(t.campaignId)}'s channel`,
            detail: `Slot ${t.slot.toLocaleString("en-US")}, ${t.finality}`,
            tone: t.kind === "close" ? ("brand" as const) : ("ink" as const),
          }))}
        />
      </Ld.Panel>

      <Ld.Callout title="Network fees and rent, paid in test SOL">
        Fees and <Term title={GLOSSARY.rent.term} def={GLOSSARY.rent.def}>rent</Term> are paid in test SOL, measured in <Term title={GLOSSARY.lamports.term} def={GLOSSARY.lamports.def}>lamports</Term>, and kept apart from the USDC ad spend. Each channel paid {lam(perOpenRent)} lamports of new rent at open; {lam(perReclaim)} of it ({reclaimPct}%) was reclaimed at close, so {lam(run.fees.reclaimedRentLamports)} of {lam(run.fees.newRentLamports)} in total. Network fees were {lam(run.fees.networkFeeLamports)} lamports for the {run.chainTxs.length} transactions. These costs are paid per channel, not per ad: one open and one close are shared by every delivery the channel carries, and each delivery is a signed voucher, not a transaction. Here the channels carried {list(run.channels.map((c) => String(c.vouchers.length)))} deliveries.
      </Ld.Callout>
        </div>
      </details>

      <Ld.Callout title="Funding is not settlement">
        {run.chainExtras?.funding ? `The ${run.chainExtras.funding.payers.length === 1 ? "payer was" : "payers were"} funded by one transfer before any channel opened (linked above), outside any channel.` : "The payer was funded before the run, outside any channel."} Absolute wallet balances include funds from before this run, so only each transaction's own changes are shown. {onDevnet ? "Solana Devnet, Devnet test tokens; not mainnet." : "Hosted Solana sandbox, not Devnet or mainnet."}
      </Ld.Callout>
      <DevnetSettlementSection />
    </>
  );
}
