// Money specimens bound to the projection: channel meters, cumulative ladders, transactions.
// USDC (base units) and lamports (test SOL) are never mixed. Only per-transaction deltas are shown.
import type { ReactNode } from "react";
import { Amount, ChannelMeter, CopyHash, CumulativeLadder, InspectButton, KeyValue, Lamports, MoneyStateMark, Provenance, TxCard, type InspectPayload } from "@axp/design-system/ledger";
import { nameOf, run, usdc } from "@/data/select";
import type { Channel, ChainTx } from "@/data/types";

export function channelMeter(ch: Channel, opts: { legend?: boolean } = {}) {
  const scale = Number(ch.depositBaseUnits);
  const segs = ch.vouchers.map((v) => ({ key: `v${v.sequence}`, state: "settled" as const, value: Number(v.incrementBaseUnits), label: `#${v.sequence} ${usdc(v.incrementBaseUnits)}` }));
  return (
    <ChannelMeter
      scale={scale}
      segments={[...segs, { key: "refund", state: "refunded", value: Number(ch.refundBaseUnits), label: `↩ ${usdc(ch.refundBaseUnits)} refunded` }]}
      labels={[<span key="a">0</span>, <span key="b">{usdc(ch.depositBaseUnits)} deposit</span>]}
      legend={
        opts.legend === false ? undefined : (
          <>
            <MoneyStateMark state="deposit" label={`Deposit ${usdc(ch.depositBaseUnits)}`} />
            <MoneyStateMark state="settled" label={`Paid to publisher ${usdc(ch.settledBaseUnits)}`} />
            <MoneyStateMark state="refunded" label={`Refunded ${usdc(ch.refundBaseUnits)}`} />
          </>
        )
      }
    />
  );
}

export function ladder(ch: Channel) {
  return (
    <CumulativeLadder
      rows={ch.vouchers.map((v, i) => ({
        key: `${v.sequence}`,
        id: `voucher-${nameOf(ch.campaignId).toLowerCase()}-${v.sequence}`,
        seq: v.sequence,
        what: (
          <span className="lg-stack-sm" style={{ gap: 2 }}>
            <span>
              Opportunity {v.opportunityN}, {v.status}
              {i < ch.vouchers.length - 1 ? <span className="lg-muted">, replaced by #{ch.vouchers[i + 1].sequence}</span> : null}
            </span>
            <span className="lg-data-sm lg-muted">payload {v.payloadHash.slice(0, 10)}…</span>
          </span>
        ),
        increment: `+${usdc(v.incrementBaseUnits)}`,
        cumulative: usdc(v.cumulativeAmountBaseUnits),
        superseded: i < ch.vouchers.length - 1,
      }))}
    />
  );
}

const signed = (s: string) => (s.startsWith("-") || s === "0" ? s : `+${s}`);
export function txPayload(ch: Channel, t: ChainTx): InspectPayload {
  const { logs, ...rest } = t;
  return {
    key: `tx:${t.signature}`,
    title: `${t.kind === "open" ? "Open" : "Close"} transaction, ${nameOf(ch.campaignId)}`,
    sourcePath: `chainEvidence.channels[channelId=${ch.channelId}].originalTransactions[txSignature]`,
    json: { ...rest, logLines: logs.length },
    note: `Read back from ${run.network.kind === "devnet" ? "Solana Devnet" : "the hosted Solana sandbox"} after the run. blockTime is the chain's clock, which is not aligned with the exchange clock. Absolute balances are omitted; only this transaction's deltas are shown.`,
  };
}

export function txCard(ch: Channel, t: ChainTx, extra?: ReactNode) {
  const name = nameOf(ch.campaignId);
  return (
    <TxCard
      id={`tx-${t.kind}-${name.toLowerCase()}`}
      title={`${t.kind === "open" ? "Open" : "Close"}: ${name}`}
      status={<Provenance kind="settled" label={t.finality === "finalized" ? "Finalized" : t.finality} />}
      details={[{ label: `Program logs (${t.logs.length} lines)`, body: <pre className="lg-json">{t.logs.join("\n")}</pre> }]}
    >
      <KeyValue
        dense
        rows={[
          { k: "Signature", v: <CopyHash value={t.signature} head={12} tail={8} label="signature" /> },
          { k: "Slot", v: <span className="lg-data-sm">{t.slot}</span> },
          {
            k: "USDC deltas",
            v: (
              <span className="lg-stack-sm" style={{ gap: 2 }}>
                <span className="lg-data-sm">payer {signed(t.tokenDeltas.payer)} base units ({t.tokenDeltas.payer.startsWith("-") ? "-" : t.tokenDeltas.payer === "0" ? "" : "+"}{usdc(t.tokenDeltas.payer.replace("-", ""))})</span>
                <span className="lg-data-sm">publisher {signed(t.tokenDeltas.publisher)} base units ({t.tokenDeltas.publisher === "0" ? "" : "+"}{usdc(t.tokenDeltas.publisher)})</span>
              </span>
            ),
          },
          { k: "Network fee", v: <Lamports value={t.networkFeeLamports} /> },
          { k: t.kind === "open" ? "New rent" : "Reclaimed rent", v: <Lamports value={t.kind === "open" ? t.newRentLamports : t.reclaimedRentLamports} /> },
          { k: "Status", v: <span className="lg-small">{t.confirmationStatus ?? t.finality}, no error</span> },
        ]}
      />
      <div className="lg-row" style={{ paddingTop: 8 }}>
        <InspectButton payload={txPayload(ch, t)} />
        {extra}
      </div>
    </TxCard>
  );
}

export function depositAmount(ch: Channel) {
  return <Amount baseUnits={ch.depositBaseUnits} />;
}
export const channels = () => run.channels;
