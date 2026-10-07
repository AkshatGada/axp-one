"use client";
import {Ld} from '@axp/design-system/ledger';
import {devnetTransactionURL, type NativePayment} from '../../../../../packages/publisher-sdk/financial.mjs';
import {boundPaymentIdentity, paymentState} from './payment-state.mjs';
import {money, type BudgetCampaign, type PaymentAction, type Turn} from './model';
import {NativePaymentEvidence} from './NativePaymentEvidence';

export function PaymentFlow({turn, campaign, payment, mode, pending, onAction, onRefresh}: {
  turn: Turn; campaign?: BudgetCampaign; payment?: NativePayment; mode?: string; pending?: boolean;
  onAction?: (action: PaymentAction) => void; onRefresh?: () => void;
}) {
  const controls = paymentState(campaign, {...boundPaymentIdentity(turn), uncertain: turn.paymentOperation?.uncertain});
  const native = mode === 'devnet';
  const vouchers = payment?.vouchers ?? [];
  const authorized = vouchers.filter(v => v.status === 'authorized');
  const close = controls.finalized ? payment?.transactions?.find(tx => tx.operation === 'close' && tx.status === 'finalized') : undefined;
  const explorer = close && devnetTransactionURL(close.signature);
  const unit = native ? 'test USDC' : mode === 'synthetic' ? 'test credits' : 'units';
  const deposit = native ? payment?.confirmedDepositBaseUnits : campaign?.depositBaseUnits;
  const cumulative = payment?.authorizedBaseUnits ?? campaign?.authorizedBaseUnits;
  const busy = pending || turn.budgetLoading || turn.paymentOperation?.pending;
  return <div className="pub-payment-story" data-native={native || undefined}>
    <div className="pub-stage-heading"><h3>{controls.finalized ? 'Publisher paid. Unused deposit returned.' : native ? 'Authorize off-chain. Settle on Solana.' : 'Synthetic payment ledger'}</h3><Ld.Tag tone={controls.finalized ? 'success' : controls.needsReconcile ? 'warning' : 'outline'}>{controls.finalized ? 'Finalized' : controls.needsReconcile ? 'Reconcile status' : controls.pending ? 'Settlement pending' : authorized.length ? 'Authorized · not yet paid' : 'Payment records'}</Ld.Tag></div>
    {campaign ? <>
      <p className="pub-payment-scope">{campaign.brandName || campaign.name} · whole channel, including this turn</p>
      <div className="pub-payment-flow" aria-label="Channel funding, off-chain cumulative authorization and settlement">
        <div className="pub-payment-node"><span className="ld-label">01 · {native ? 'On-chain' : 'Allocation'}</span><h4>Funded deposit</h4><b>{money(deposit)} <small>{unit}</small></b><span>{native ? payment?.openStatus === 'finalized' ? 'Opening finalized' : 'Deposit not confirmed' : 'Synthetic allocation'}</span></div>
        <span className="pub-payment-arrow" aria-hidden>→</span>
        <div className="pub-payment-node pub-payment-node-vouchers"><span className="ld-label">02 · Off-chain</span><h4>Cumulative authorization</h4><b>{money(cumulative)} <small>{unit}</small></b><span>{native ? `${authorized.length} authorized voucher${authorized.length === 1 ? '' : 's'}` : 'Synthetic ledger only'}</span><div className="pub-voucher-marks" aria-label={`${authorized.length} authorized vouchers`}>{authorized.slice(0, 12).map(v => <i key={v.chargeId} title={`Voucher ${v.sequence}: ${money(v.cumulativeAmountBaseUnits)} ${unit}`} />)}{authorized.length > 12 ? <span>+{authorized.length - 12}</span> : null}</div></div>
        <span className="pub-payment-arrow" aria-hidden>→</span>
        <div className="pub-payment-node pub-payment-node-close"><span className="ld-label">03 · {native ? 'On-chain close' : 'Ledger close'}</span><h4>{controls.finalized ? 'Finalized settlement' : 'Payout + refund'}</h4><dl><div><dt>Publisher</dt><dd>{native && !controls.finalized ? 'Awaiting close' : `${money(payment?.settledBaseUnits ?? campaign.settledBaseUnits)} ${unit}`}</dd></div><div><dt>Unused deposit</dt><dd>{native && !controls.finalized ? 'Awaiting close' : `${money(payment?.refundBaseUnits ?? campaign.refundBaseUnits)} ${unit}`}</dd></div></dl></div>
      </div>
      <p className="ld-caption">{native ? 'Vouchers update the cumulative total without a transaction per ad. Closing pays that total and refunds the unused deposit.' : 'Synthetic credits do not make a blockchain payment.'}</p>
      {explorer ? <a className="pub-finalized-proof" href={explorer} target="_blank" rel="noopener noreferrer"><span><b>Finalized Solana Devnet proof</b><span>Publisher payout and unused-deposit refund</span></span><span aria-hidden>Explorer ↗</span></a> : null}
      {native && onAction && turn.receipt ? <div className="pub-payment-actions">
        {controls.reconcile ? <Ld.Button variant="secondary" disabled={busy} onClick={() => onAction('reconcile')}>Reconcile saved payment</Ld.Button> : controls.authorize ? <Ld.Button variant="secondary" disabled={busy} onClick={() => onAction('authorize')}>Authorize accepted deliveries</Ld.Button> : <Ld.Button disabled={busy || !controls.settle} onClick={() => onAction('settle')}>{controls.finalized ? 'Channel closed · finalized' : turn.paymentOperation?.pending && turn.paymentOperation.action === 'settle' ? 'Settling Test USDC…' : 'Close & settle Test USDC'}</Ld.Button>}
        {!controls.finalized ? <span className="ld-caption">Closing ends new placements for this campaign.</span> : null}
      </div> : null}
      {native && !controls.bound ? <p role="status">Channel identity is unavailable or differs from this turn. Refresh records before continuing.</p> : null}
      {native && controls.bound && !controls.settle && !controls.closed && !controls.needsReconcile && !controls.pending && !controls.authorize ? <p className="ld-caption">Settlement is unavailable while delivery reservations or backend payment checks remain unresolved.</p> : null}
      <details className="pub-details"><summary>Accepted spend, reservations and channel totals</summary><div className="pub-money-grid">{[['This turn’s charge', turn.receipt?.charge.amountBaseUnits], ['Channel accepted', campaign.acceptedBaseUnits ?? campaign.spendBaseUnits], ['Reserved · not charged', campaign.reservedBaseUnits], ['Remaining campaign cap', campaign.remainingBaseUnits]].map(([name, amount]) => <div key={name}><span>{name}</span><b>{money(amount)}</b><span>{unit}</span></div>)}</div></details>
    </> : <p>No winning campaign to pay. The organic answer remains independent.</p>}
    {turn.paymentOperation?.pending ? <p role="status">{turn.paymentOperation.action === 'reconcile' ? 'Looking up the saved operation…' : turn.paymentOperation.action === 'authorize' ? 'Authorizing the accepted ledger…' : 'Draining the channel and processing settlement…'} Keep this view open; confirmation can take up to a minute.</p> : null}
    {turn.paymentOperation?.error ? <p className="pub-payment-notice" role="alert">{turn.paymentOperation.error}</p> : turn.paymentOperation?.message ? <p role="status">{turn.paymentOperation.message}</p> : null}
    {payment?.reason || turn.receipt?.authorization?.reason ? <p role="status">{payment?.reason || turn.receipt?.authorization?.reason}</p> : null}
    {onRefresh ? <div className="pub-between"><Ld.Button variant="ghost" onClick={onRefresh} disabled={busy}>{turn.budgetLoading ? 'Refreshing…' : 'Refresh payment records'}</Ld.Button>{turn.budgetFetchedAt ? <span className="ld-caption">Fetched {new Date(turn.budgetFetchedAt).toLocaleTimeString()}</span> : null}</div> : null}
    {turn.budgetError ? <p role="status">Refresh failed: {turn.budgetError}</p> : null}
    <NativePaymentEvidence payment={payment} />
  </div>;
}
