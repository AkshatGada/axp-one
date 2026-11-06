"use client";
import {Ld} from '@axp/design-system/ledger';
import {nativeTransactionURL, isFinalizedNativeTransaction, type NativePayment} from '../../../../../packages/publisher-sdk/financial.mjs';
import type {CampaignPayment} from '../advertiser-dashboard/model';
const money = (value?: string) => value && /^\d+$/.test(value) ? `${(BigInt(value) / 1000000n)}.${(BigInt(value) % 1000000n).toString().padStart(6, '0')}` : '—';
export function ArcPayments({payment, busy, bound = true, onSubmit, onClose, onReconcile, onAuthorize}: {
  payment: CampaignPayment | NativePayment; busy?: boolean; bound?: boolean;
  onSubmit?: () => void; onClose?: () => void; onReconcile?: () => void; onAuthorize?: () => void;
}) {
  const rows = payment.payments ?? [], uncertain = payment.reconciliationRequired;
  const gap = BigInt(payment.acceptedBaseUnits ?? '0') > BigInt(payment.authorizedBaseUnits ?? '0');
  return <div className="pub-stack arc-payment-story">
    <div className="pub-stage-heading"><h3>AI app earnings, paid through Arc.</h3><Ld.Tag tone={uncertain ? 'warning' : 'outline'}>USDC Nanopayments</Ld.Tag></div>
    <p className="ld-secondary">Each accepted Sponsored delivery authorizes one exact payment. Circle Gateway accepts it without per-payment gas and settles payments together on Arc Testnet.</p>
    <div className="pub-money-grid">
      {[
        ['Gateway funding', payment.confirmedDepositBaseUnits], ['Accepted deliveries', payment.acceptedBaseUnits],
        ['Signed authorizations', payment.authorizedBaseUnits], ['Accepted by Gateway', payment.submittedBaseUnits],
        ['Batch finalized', payment.settledBaseUnits], ['Unused allocation', payment.unusedAllocationBaseUnits],
      ].map(([label, amount]) => <div key={label}><span>{label}</span><b>{money(amount)}</b><span>test USDC</span></div>)}
    </div>
    <p className="ld-caption">Gateway acceptance is separate from onchain finality. Unused funds stay in the advertiser’s Gateway balance until explicitly withdrawn.</p>
    {!bound && <p role="alert">This payment does not match the current delivery. Refresh its records before continuing.</p>}
    {uncertain && <Ld.Callout tone="warning" title="Check the saved payment">The outcome is uncertain. Reconcile its original identity before sending another payment.</Ld.Callout>}
    <div className="pub-payment-actions">
      {gap && onAuthorize && <Ld.Button variant="secondary" disabled={busy || !bound || uncertain} onClick={onAuthorize}>Authorize accepted deliveries</Ld.Button>}
      {onSubmit && <Ld.Button disabled={busy || !bound || !payment.canPayout} onClick={onSubmit}>{busy ? 'Processing…' : 'Send nanopayments'}</Ld.Button>}
      {onReconcile && <Ld.Button variant="secondary" disabled={busy || !bound || !payment.canReconcile} onClick={onReconcile}>Check batch settlement</Ld.Button>}
      {onClose && <Ld.Button variant="ghost" disabled={busy || !bound || !payment.canClose} onClick={onClose}>End campaign & send remaining payments</Ld.Button>}
    </div>
    {payment.closeStatus === 'pending_batch' && <p role="status">Campaign ended. Gateway batch settlement is pending; this page does not report it as finalized.</p>}
    <details className="pub-details" open><summary>Delivery payments · {rows.length}</summary><div className="pub-transaction-list">{rows.length ? rows.map((row, index) => {
      const proof = row.batchProof, url = proof && nativeTransactionURL(proof, 'arc-testnet');
      const finalized = proof && isFinalizedNativeTransaction(proof, 'arc-testnet');
      return <div key={row.chargeId}><div className="pub-between"><b>Delivery {index + 1} · {money(row.amountBaseUnits)} test USDC</b><Ld.Tag tone={finalized ? 'success' : row.status === 'unknown' ? 'warning' : 'outline'}>{finalized ? 'Batch finalized' : row.transferStatus === 'confirmed' ? 'Batch confirmed · awaiting completion' : row.status === 'accepted' ? 'Gateway accepted · batch pending' : row.status}</Ld.Tag></div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer">View Arc batch transaction ↗</a>}
        <details className="pub-details"><summary>Receipt and payment proof</summary><dl><dt>Accepted receipt hash</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{row.receiptHash}</dd><dt>Authorization hash</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{row.payloadHash ?? 'Not signed'}</dd><dt>Gateway reference</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{row.transferId ?? 'Not submitted'}</dd></dl><p className="ld-caption">The Gateway reference identifies a payment. An Explorer link appears only when a batch transaction is reported and verified.</p></details></div>;
    }) : <p>No accepted deliveries yet. Requests and auction reservations do not create a nanopayment.</p>}</div></details>
    <details className="pub-details"><summary>Arc funding and network</summary><div className="pub-transaction-list">{payment.transactions?.filter(tx => ['open','approve','withdraw'].includes(tx.operation)).map((tx, index) => {
      const url = nativeTransactionURL(tx, 'arc-testnet');
      return <div key={index}><b>{tx.operation === 'open' ? 'Gateway deposit' : tx.operation === 'approve' ? 'Exact USDC allowance' : 'Gateway withdrawal'}</b><span> · {tx.status}</span>{url && <p><a href={url} target="_blank" rel="noopener noreferrer">View Arc transaction ↗</a></p>}</div>;
    })}<dl><dt>Network</dt><dd>Arc Testnet · 5042002</dd><dt>Advertiser payer</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{payment.payer}</dd><dt>AI app recipient</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{payment.payee}</dd><dt>Gateway Wallet</dt><dd className="ld-mono" style={{overflowWrap:'anywhere'}}>{payment.gatewayWallet}</dd></dl></div></details>
  </div>;
}
