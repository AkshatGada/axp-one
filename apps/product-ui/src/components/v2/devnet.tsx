// Solana Devnet re-settlement of the recorded run's three receipts. Rendered only when src/data/devnet.public.json
// exists (see src/data/devnet.ts). Always presented apart from the recorded sandbox settlement; numbers never merge.
import type { ReactNode } from "react";
import { Ld, Term } from "@axp/design-system/ledger";
import { devnet } from "@/data/devnet";
import type { DevnetChannel, DevnetTxRef } from "@/data/devnet-types";
import { GLOSSARY } from "@/data/glossary";
import { nameOf, usdc } from "@/data/select";
import { RENT_NOTE, rentSolWords, solText } from "@/data/story";
import { asset } from "@/lib/paths";

export const hasDevnet = !!devnet;
const short = (s: string, h = 6, t = 4) => `${s.slice(0, h)}…${s.slice(-t)}`;
const lam = (v: string | number) => Number(v).toLocaleString("en-US");

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="ld-link dv-ext" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span aria-hidden> ↗</span>
      <span className="ld-sr"> (opens the Solana explorer)</span>
    </a>
  );
}

function TxLine({ label, t }: { label: string; t: DevnetTxRef }) {
  const rent = rentSolWords(t);
  return (
    <tr>
      <td>
        <span className="ld-stack" style={{ gap: 2 }}>
          <span className="ld-strong">{label}</span>
          <span className="ld-caption">Slot {t.slot.toLocaleString("en-US")}, finalized</span>
        </span>
      </td>
      <td>
        <span className="ld-mono">{short(t.signature, 8, 6)}</span>
      </td>
      <td data-num title={`${lam(t.feeLamports)} lamports`}>{solText(t.feeLamports)}</td>
      <td data-num>{rent}</td>
      <td>
        <Ext href={t.explorerUrl}>Explorer</Ext>
      </td>
    </tr>
  );
}

function ChannelCard({ ch }: { ch: DevnetChannel }) {
  return (
    <Ld.Panel
      id={`devnet-${ch.campaignId.replace("v3-", "")}`}
      title={nameOf(ch.campaignId)}
      sub="Payment channel on Solana Devnet, Devnet test USDC"
      actions={<Ext href={ch.channelExplorerUrl}>Channel {short(ch.channelAddress)}</Ext>}
      foot={<span>Status after close: {ch.status ?? "not recorded"}. The channel account keeps {solText(ch.remainingRentLamports ?? "0")} test SOL of storage rent until its reclaim window passes.</span>}
    >
      <div className="ld-stack" style={{ gap: 16 }}>
        <div className="ld-cols-3">
          <Ld.Stat label="Deposit" value={`${usdc(ch.depositBaseUnits)} USDC`} caption="Locked at open" />
          <Ld.Stat label="Paid to the publisher" value={`${usdc(ch.payoutBaseUnits)} USDC`} caption="Final voucher, at close" />
          <Ld.Stat label="Refunded" value={`${usdc(ch.refundBaseUnits)} USDC`} caption="Back to the payer at close" />
        </div>
        <div className="ld-stack" style={{ gap: 6 }}>
          <span className="ld-label">Receipt, charge, voucher</span>
          <ol className="dv-chain">
            {ch.vouchers.map((v) => (
              <li key={v.sequence}>
                <span>
                  Opportunity {v.opportunityN} receipt <span className="ld-mono">{short(v.receiptHash, 8, 6)}</span>
                </span>
                <span className="dv-arrow" aria-hidden>
                  →
                </span>
                <span>Charge {usdc(v.incrementBaseUnits)}</span>
                <span className="dv-arrow" aria-hidden>
                  →
                </span>
                <span>
                  Voucher {v.sequence}: {usdc(v.cumulativeBaseUnits)} in total
                </span>
                <Ld.Tag tone={v.settledOnChain ? "success" : "outline"} dot={v.settledOnChain}>
                  {v.settledOnChain ? "Settled on-chain" : "Superseded, off-chain"}
                </Ld.Tag>
                {ch.close ? <Ext href={ch.close.explorerUrl}>{v.settledOnChain ? "Settling transaction" : `Settled within voucher ${ch.vouchers.length}`}</Ext> : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="ld-table-wrap" style={{ border: "1px solid var(--ld-border)", borderRadius: 10 }}>
          <table className="ld-table">
            <thead>
              <tr>
                <th>Devnet transaction</th>
                <th>Signature</th>
                <th data-num>Network fee, test SOL</th>
                <th data-num>Storage rent, test SOL</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ch.open ? <TxLine label="Open channel" t={ch.open} /> : null}
              {ch.close ? <TxLine label={`Close: ${usdc(ch.payoutBaseUnits)} paid, ${usdc(ch.refundBaseUnits)} back`} t={ch.close} /> : null}
            </tbody>
          </table>
        </div>
      </div>
    </Ld.Panel>
  );
}

/** Settlement: the separate, verifiable re-settlement section. */
export function DevnetSettlementSection() {
  if (!devnet) return null;
  const d = devnet;
  const t = d.totals;
  const finalized = d.transactions.filter((x) => x.finality === "finalized").length;
  const nReceipts = d.channels.reduce((n, c) => n + c.vouchers.length, 0);
  const opens = d.transactions.filter((x) => x.role === "open").length;
  const closes = d.transactions.filter((x) => x.role === "close").length;
  return (
    <section id="devnet" className="dv-section" aria-labelledby="devnet-title">
      <div className="dv-head">
        <div className="ld-stack" style={{ gap: 4 }}>
          <span className="ld-row" style={{ gap: 8 }}>
            <h2 id="devnet-title" className="ld-section-title">
              Recorded receipts, settled on Solana Devnet
            </h2>
            <Ld.Tag tone="brand">Solana Devnet</Ld.Tag>
          </span>
          <p className="ld-secondary">The {nReceipts} accepted, publisher-signed receipts from this run; no new auctions or model calls; Devnet test USDC, no real value.</p>
        </div>
        <span className="ld-secondary">
          Program <Ext href={d.network.programExplorerUrl}>{short(d.network.program)}</Ext>
        </span>
      </div>
      <p className="dv-summary">
        Same amounts as above: <b>{usdc(t.depositBaseUnits)}</b> USDC deposited, <b>{usdc(t.publisherPayoutBaseUnits)}</b> paid to the publisher, <b>{usdc(t.payerRefundBaseUnits)}</b> refunded, in Devnet test USDC. <b>{d.transactions.length}</b> Devnet transactions (1 funding, {opens} opens, {closes} closes), {finalized === d.transactions.length ? "all finalized" : `${finalized} finalized`}.
      </p>
      {d.channels.map((ch) => (
        <ChannelCard key={ch.channelId} ch={ch} />
      ))}
      <div className="ld-cols-2">
        <Ld.Panel title="Funding, not settlement" sub="Before the channels opened, one transfer funded the disposable payer">
          <div className="ld-stack" style={{ gap: 8 }}>
            <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
              {usdc(d.funding.tokenBaseUnits)} Devnet test USDC and {Number(d.funding.lamports) / 1e9} test SOL moved to the payer. It is not part of any channel and pays no one for an ad.
            </span>
            <span className="ld-secondary">
              <span className="ld-mono">{short(d.funding.signature, 8, 6)}</span>, slot {d.funding.slot.toLocaleString("en-US")}. <Ext href={d.funding.explorerUrl}>Explorer</Ext>
            </span>
          </div>
        </Ld.Panel>
        <Ld.Panel title="Devnet fees and storage rent in test SOL" flush foot={<span>Kept apart from USDC, and apart from the sandbox numbers above. Rent differs by network, so these are not the sandbox figures. {RENT_NOTE}</span>}>
          <Ld.Table
            columns={[
              { key: "k", head: "", cell: (r: { k: string; v: string }) => r.k },
              { key: "v", head: "Test SOL", num: true, cell: (r) => <span className="ld-strong" title={`${lam(r.v)} lamports`}>{solText(r.v)}</span> },
            ]}
            rows={[
              { k: "Network fees, 2 opens and 2 closes", v: t.settlementNetworkFeeLamports },
              { k: "Storage rent locked", v: t.settlementNewRentLamports },
              { k: "Storage rent returned at close", v: t.settlementReclaimedRentLamports },
              { k: "Funding fee (paid by the funder)", v: t.fundingNetworkFeeLamports },
              { k: "Funding rent (paid by the funder)", v: t.fundingNewRentLamports },
            ]}
          />
        </Ld.Panel>
      </div>
      <Ld.Callout title="How this differs from the recorded run's own settlement">
        A public Solana Devnet instead of the hosted sandbox, Circle&apos;s Devnet test USDC instead of the sandbox token, fresh disposable keys and new channel addresses. The charges, the cumulative vouchers ({d.channels.map((c) => c.vouchers.map((v) => usdc(v.cumulativeBaseUnits)).join(" then ")).join("; ")}), the payouts and the refunds are the same. {new Set(d.channels.map(() => d.identities.payer)).size === 1 && d.channels.length > 1 ? "One payer still represents every funded advertiser." : ""} Payer <Ext href={d.identities.payerExplorerUrl}>{short(d.identities.payer)}</Ext>, publisher <Ext href={d.identities.payeeExplorerUrl}>{short(d.identities.payee)}</Ext>.
      </Ld.Callout>
    </section>
  );
}

/** Verify: links for a person to check on chain. The browser checks compare files; they do not query a chain. */
export function DevnetVerifyLinks() {
  if (!devnet) return null;
  const d = devnet;
  return (
    <Ld.Panel id="devnet" title="Check the Devnet re-settlement on chain yourself" sub="These links open the public Solana explorer. This page compares files; it does not query a chain." flush actions={<Ld.Tag tone="brand">Solana Devnet</Ld.Tag>}>
      <Ld.Table
        columns={[
          { key: "l", head: "Transaction", cell: (x: (typeof d.transactions)[number]) => <span className="ld-strong">{x.role === "funding" ? "Funding, not settlement" : `${x.role === "open" ? "Open" : "Close"} ${nameOf(x.campaignId!)}'s channel`}</span> },
          { key: "s", head: "Signature", cell: (x) => <span className="ld-mono">{short(x.signature, 8, 6)}</span> },
          { key: "slot", head: "Slot", num: true, cell: (x) => x.slot.toLocaleString("en-US") },
          { key: "f", head: "Status", cell: (x) => <Ld.Tag tone="success" dot>{x.finality === "finalized" ? "Finalized" : x.finality}</Ld.Tag> },
          { key: "x", head: "", cell: (x) => <Ext href={x.explorerUrl}>Explorer</Ext> },
        ]}
        rows={d.transactions}
      />
      <div className="ld-row" style={{ gap: 16, padding: "12px 16px", borderTop: "1px solid var(--ld-border)", flexWrap: "wrap" }}>
        <span className="ld-secondary">
          Program <Ext href={d.network.programExplorerUrl}>{short(d.network.program)}</Ext>
        </span>
        {d.channels.map((c) => (
          <span key={c.channelId} className="ld-secondary">
            {nameOf(c.campaignId)} channel <Ext href={c.channelExplorerUrl}>{short(c.channelAddress)}</Ext>
          </span>
        ))}
        <span className="ld-caption">Finality as observed {d.verification.checkedAt.slice(0, 10)}; public Devnet history may be pruned.</span>
      </div>
      <div className="ld-stack" style={{ gap: 6, padding: "12px 16px", borderTop: "1px solid var(--ld-border)" }}>
        <span className="ld-label">Each receipt and the Devnet transaction that settled it</span>
        {d.channels.flatMap((c) =>
          c.vouchers.map((v) => (
            <span key={`${c.channelId}-${v.sequence}`} className="ld-secondary">
              Opportunity {v.opportunityN} receipt <span className="ld-mono">{short(v.receiptHash, 8, 6)}</span>, {nameOf(c.campaignId)} voucher {v.sequence}
              {v.settledOnChain ? ": settled by " : `: superseded by voucher ${c.vouchers.length}, settled by `}
              {c.close ? <Ext href={c.close.explorerUrl}>{`the close of ${nameOf(c.campaignId)}'s channel`}</Ext> : "no close"}
            </span>
          )),
        )}
      </div>
    </Ld.Panel>
  );
}

/** Overview "Why Solana": the devnet channels, linked. */
export function DevnetLine() {
  if (!devnet) return null;
  return (
    <span className="ld-secondary dv-line">
      The same {devnet.channels.reduce((n, c) => n + c.vouchers.length, 0)} receipts were also settled on <Term title={GLOSSARY.devnet.term} def={GLOSSARY.devnet.def}>Solana Devnet</Term>:{" "}
      {devnet.channels.map((c, i) => (
        <span key={c.channelId}>
          {i ? ", " : ""}
          <Ext href={c.channelExplorerUrl}>{`${nameOf(c.campaignId)}'s channel`}</Ext>
        </span>
      ))}
      . <a className="ld-link" href={asset("/settlement/#devnet")}>All links</a>
    </span>
  );
}
