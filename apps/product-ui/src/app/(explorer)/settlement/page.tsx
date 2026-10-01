import type { Metadata } from "next";
import Link from "next/link";
import { CopyHash, InspectButton, Ld } from "@axp/design-system/ledger";
import { campaign, nameOf, run, usdc } from "@/data/select";
import { txPayload } from "@/components/money";
import type { Channel, ChainTx } from "@/data/types";

export const metadata: Metadata = { title: "Solana settlement" };
const L = Link as unknown as Ld.LinkC;
const lam = (v: string | number) => Number(v).toLocaleString("en-US");

function TxRow({ ch, t }: { ch: Channel; t: ChainTx }) {
  return (
    <tr>
      <td>
        <span className="ld-stack" style={{ gap: 2 }}>
          <span className="ld-strong">{t.kind === "open" ? "Open channel" : "Close channel"}</span>
          <span className="ld-caption">Solana transaction, slot {t.slot.toLocaleString("en-US")}</span>
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
      <td data-num>{t.kind === "open" ? `+${lam(t.newRentLamports)}` : `−${lam(t.reclaimedRentLamports)}`}</td>
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
  return (
    <>
      <Ld.PageBar
        title="Solana payment channels"
        meta={<Ld.Tag tone="success" dot>Both finalized</Ld.Tag>}
        sub="Each funded advertiser locked a 0.020 test USDC deposit in its own Solana payment channel on a hosted sandbox. Every accepted delivery advanced an off-chain voucher. One close per channel paid the publisher the last authorized total and refunded the rest. No transfer per ad."
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Deposited" value={usdc(run.totals.depositsBaseUnits)} context="Test USDC across 2 channels" />
        <Ld.Kpi label="Paid to the publisher" value={usdc(run.totals.paidBaseUnits)} context="Equals the 3 accepted charges" />
        <Ld.Kpi label="Refunded" value={usdc(run.totals.refundedBaseUnits)} context="Returned to the payer at close" />
        <Ld.Kpi label="Solana transactions" value={run.chainTxs.length} context="2 opens, 2 closes, all finalized" />
        <Ld.Kpi label="Fees and new rent" value={`${(Number(run.fees.grossFeeAndRentLamports) / 1e6).toFixed(2)}M`} context={`lamports, cap ${(Number(run.fees.capLamports) / 1e6).toFixed(0)}M`} chip={<Ld.Tag tone={capOk ? "success" : "danger"} dot>{capOk ? "Within cap" : "Over cap"}</Ld.Tag>} />
      </div>

      {run.channels.map((ch) => {
        const c = campaign(ch.campaignId);
        const cap = Number(c.budgetCapBaseUnits);
        return (
          <section key={ch.channelId} id={c.slug} className="st2-channel">
            <Ld.Panel
              title={`${c.businessName}`}
              sub="Solana payment channel · hosted sandbox · test USDC"
              actions={
                <>
                  <Ld.Pv kind="fictional" label="Fictional advertiser" />
                  <Ld.Button variant="ghost" size="sm" href={`/advertisers/${c.slug}/`} Link={L}>
                    Campaign
                  </Ld.Button>
                </>
              }
              foot={
                <>
                  <span>Phase {ch.phase}, no reconciliation needed. Same disposable test payer for both channels.</span>
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
                    <Ld.Stat label="Deposit" value={usdc(ch.depositBaseUnits)} caption="Locked at open" />
                    <Ld.Stat label="Paid out" value={usdc(ch.settledBaseUnits)} caption="Last voucher total" />
                    <Ld.Stat label="Refunded" value={usdc(ch.refundBaseUnits)} caption="Back to the payer" />
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
                    <span className="ld-label">In order, without timestamps</span>
                    <div className="st2-seq">
                      <span data-chain>Open on Solana · deposit {usdc(ch.depositBaseUnits)}</span>
                      {ch.vouchers.map((v) => (
                        <span key={v.sequence} id={`voucher-${c.slug}-${v.sequence}`}>
                          Charge {v.sequence} → voucher {v.sequence}: {usdc(v.cumulativeAmountBaseUnits)} in total
                        </span>
                      ))}
                      <span data-chain>Close on Solana · {usdc(ch.settledBaseUnits)} paid, {usdc(ch.refundBaseUnits)} back</span>
                    </div>
                  </div>
                </div>
                <div className="ld-stack" style={{ gap: 6 }}>
                  <span className="ld-label">Cumulative authorization, against the {usdc(cap)} cap</span>
                  <Ld.StepChart max={cap} format={(x) => usdc(x)} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `#${v.sequence} · opp ${v.opportunityN}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
                  {ch.vouchers.length > 1 ? <span className="ld-caption">Voucher 2 replaces voucher 1: {usdc(ch.vouchers[1].cumulativeAmountBaseUnits)} in total, not {usdc(ch.vouchers[0].cumulativeAmountBaseUnits)} plus {usdc(ch.vouchers[1].cumulativeAmountBaseUnits)}.</span> : null}
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

      <Ld.Panel title={nameOf(run.unfunded[0].campaignId)} sub="No Solana channel was opened" actions={<Ld.Tag tone="dashed">Unfunded</Ld.Tag>}>
        <p className="ld-secondary">Channel status pending open, deposit {usdc(run.unfunded[0].depositBaseUnits)}. It never reached an auction: every question required crypto storage, which it does not declare.</p>
      </Ld.Panel>

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
              { k: "Network fees, 4 transactions", v: run.fees.networkFeeLamports },
              { k: "New rent, gross", v: run.fees.newRentLamports },
              { k: "Reclaimed rent at close", v: run.fees.reclaimedRentLamports },
              { k: "Fees plus new rent", v: run.fees.grossFeeAndRentLamports },
              { k: "Run cap", v: run.fees.capLamports },
            ]}
          />
        </Ld.Panel>
      </div>

      <Ld.Panel title="Solana transactions by slot" sub="Sandbox clock. These block times are not aligned with the exchange clock on the Overview and must not be compared with it.">
        <Ld.Timeline
          rows={run.chainTxs.map((t) => ({
            key: t.signature,
            time: `slot ${t.slot.toLocaleString("en-US")}`,
            what: `${t.kind === "open" ? "Open" : "Close"} ${nameOf(t.campaignId)}'s channel`,
            detail: `Solana transaction · ${t.finality} · ${new Date(t.blockTime * 1000).toISOString().slice(11, 19)} sandbox clock`,
            tone: t.kind === "close" ? ("brand" as const) : ("ink" as const),
          }))}
        />
      </Ld.Panel>

      <Ld.Callout title="Funding is not settlement">
        An approved one-time sandbox faucet top-up funded the payer. Absolute wallet balances include funds from before this run, so only each transaction's own changes are shown. Hosted Solana sandbox, not devnet or mainnet.
      </Ld.Callout>
    </>
  );
}
