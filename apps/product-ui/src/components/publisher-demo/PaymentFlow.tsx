"use client";
import {Ld} from '@axp/design-system/ledger';
import {nativeTransactionURL, isFinalizedNativeTransaction, moneyUnit, type NativePayment} from '../../../../../packages/publisher-sdk/financial.mjs';
import {boundPaymentIdentity, paymentState} from './payment-state.mjs';
import {money, type BudgetCampaign, type PaymentAction, type Turn} from './model';
import {NativePaymentEvidence} from './NativePaymentEvidence';

export function PaymentFlow({turn, campaign, payment, mode, pending, onAction, onRefresh}: {
  turn: Turn; campaign?: BudgetCampaign; payment?: NativePayment; mode?: string; pending?: boolean;
  onAction?: (action: PaymentAction) => void; onRefresh?: () => void;
}) {
  const controls = paymentState(campaign, {...boundPaymentIdentity(turn), uncertain: turn.paymentOperation?.uncertain});
  const native = mode === 'devnet', tempo = payment?.network === 'tempo-testnet';
  const authorized = (payment?.vouchers ?? []).filter(v => v.status === 'authorized');
  const finalizedTransactions = payment?.transactions?.filter(tx => isFinalizedNativeTransaction(tx, payment.network));
  const latestPayout = finalizedTransactions?.filter(tx => tx.operation === 'payout' || tx.operation === 'close').at(-1);
  const explorer = latestPayout && nativeTransactionURL(latestPayout, payment?.network);
  const unit = moneyUnit(mode, payment ?? {settlementNetwork: turn.input.settlementNetwork});
  const deposit = native ? payment?.confirmedDepositBaseUnits : campaign?.depositBaseUnits;
  const cumulative = payment?.authorizedBaseUnits ?? campaign?.authorizedBaseUnits;
  const paid = !native || controls.finalized || (tempo && finalizedTransactions?.some(tx => tx.operation === 'payout'));
  const busy = pending || turn.budgetLoading || turn.paymentOperation?.pending;
  return <div className="pub-payment-story" data-native={native || undefined} data-network={payment?.network}>
    <div className="pub-stage-heading"><h3>{controls.finalized ? 'Publisher paid. Unused funds returned.' : native ? `Off-chain vouchers. ${tempo ? 'Tempo' : 'Solana'} settlement.` : 'Synthetic payment ledger'}</h3><Ld.Tag tone={controls.finalized ? 'success' : controls.needsReconcile ? 'warning' : 'outline'}>{controls.finalized ? 'Finalized' : controls.needsReconcile ? 'Reconcile status' : controls.pending ? 'Operation pending' : paid ? 'Paid · channel open' : authorized.length ? 'Authorized' : 'Payment records'}</Ld.Tag></div>
    {campaign ? <>
      <p className="pub-payment-scope">{campaign.brandName || campaign.name} · whole channel</p>
      <div className="pub-payment-flow" aria-label="Channel funding, vouchers, publisher payout and refund">
        <div className="pub-payment-node"><span className="ld-label">01 · Fund</span><h4>Deposit</h4><b>{money(deposit)} <small>{unit}</small></b><span>{native ? payment?.openStatus === 'finalized' ? 'Opening finalized' : 'Awaiting confirmation' : 'Synthetic allocation'}</span></div>
        <span className="pub-payment-arrow" aria-hidden>→</span>
        <div className="pub-payment-node pub-payment-node-vouchers"><span className="ld-label">02 · Vouchers</span><h4>Cumulative total</h4><b>{money(cumulative)} <small>{unit}</small></b><span>{native ? `${authorized.length} authorized voucher${authorized.length === 1 ? '' : 's'}` : 'Synthetic ledger'}</span><div className="pub-voucher-marks" aria-label={`${authorized.length} authorized vouchers`}>{authorized.slice(0, 12).map(v => <i key={v.chargeId} title={`Voucher ${v.sequence}: ${money(v.cumulativeAmountBaseUnits)} ${unit}`} />)}{authorized.length > 12 ? <span>+{authorized.length - 12}</span> : null}</div></div>
        <span className="pub-payment-arrow" aria-hidden>→</span>
        <div className="pub-payment-node"><span className="ld-label">03 · Payout</span><h4>Publisher paid</h4><b>{paid ? money(payment?.settledBaseUnits ?? campaign.settledBaseUnits) : '—'} <small>{unit}</small></b><span>{controls.finalized ? 'Final payout confirmed' : paid ? 'Campaign stays open' : tempo ? 'Pay out while open' : 'Paid at channel close'}</span></div>
        <span className="pub-payment-arrow" aria-hidden>→</span>
        <div className="pub-payment-node"><span className="ld-label">04 · Refund</span><h4>Unused deposit</h4><b>{!native || controls.finalized ? money(payment?.refundBaseUnits ?? campaign.refundBaseUnits) : '—'} <small>{unit}</small></b><span>{controls.finalized ? 'Returned at close' : 'Returned after final close'}</span></div>
      </div>
      <p className="ld-caption">{native ? tempo ? 'Many deliveries, cumulative vouchers, periodic payouts. The spending cap stays fixed.' : 'Vouchers accumulate off-chain. Closing pays the total and returns unused funds.' : 'Synthetic credits do not make a blockchain payment.'}</p>
      {explorer ? <a className="pub-finalized-proof" href={explorer} target="_blank" rel="noopener noreferrer"><span><b>Finalized {tempo ? 'Tempo Testnet' : 'Solana Devnet'} proof</b><span>{latestPayout?.operation === 'close' ? 'Final payout and refund' : 'Publisher payout · channel stays open'}</span></span><span aria-hidden>Explorer ↗</span></a> : null}
      {native && onAction && turn.receipt ? <div className="pub-payment-actions">
        {controls.reconcile ? <Ld.Button variant="secondary" disabled={busy} onClick={() => onAction('reconcile')}>Reconcile saved payment</Ld.Button> : controls.authorize ? <Ld.Button variant="secondary" disabled={busy} onClick={() => onAction('authorize')}>Authorize accepted deliveries</Ld.Button> : <>
          {tempo && !controls.closed && <Ld.Button disabled={busy || !controls.payout} onClick={() => onAction('payout')}>{turn.paymentOperation?.pending && turn.paymentOperation.action === 'payout' ? 'Paying out…' : 'Pay out'}</Ld.Button>}
          <Ld.Button variant={tempo ? 'secondary' : 'primary'} disabled={busy || !(tempo ? controls.close : controls.settle)} onClick={() => onAction(tempo ? 'close' : 'settle')}>{controls.finalized ? 'Channel closed · finalized' : turn.paymentOperation?.pending && ['close', 'settle'].includes(turn.paymentOperation.action) ? 'Closing channel…' : tempo ? 'Close & refund' : 'Close & settle Test USDC'}</Ld.Button>
        </>}
      </div> : null}
      {native && !controls.bound ? <p role="status">Channel identity differs from this turn. Refresh before continuing.</p> : null}
      <details className="pub-details"><summary>Accepted spend, reservations and channel totals</summary><div className="pub-money-grid">{[['This turn’s charge', turn.receipt?.charge.amountBaseUnits], ['Channel accepted', campaign.acceptedBaseUnits ?? campaign.spendBaseUnits], ['Reserved · not charged', campaign.reservedBaseUnits], ['Remaining campaign cap', campaign.remainingBaseUnits]].map(([name, amount]) => <div key={name}><span>{name}</span><b>{money(amount)}</b><span>{unit}</span></div>)}</div></details>
    </> : <p>No winning campaign to pay.</p>}
    {turn.paymentOperation?.pending ? <p role="status">{turn.paymentOperation.action === 'reconcile' ? 'Looking up the saved operation…' : turn.paymentOperation.action === 'authorize' ? 'Authorizing accepted deliveries…' : turn.paymentOperation.action === 'payout' ? 'Processing publisher payout…' : 'Processing final settlement and refund…'}</p> : null}
    {turn.paymentOperation?.error ? <p className="pub-payment-notice" role="alert">{turn.paymentOperation.error}</p> : turn.paymentOperation?.message ? <p role="status">{turn.paymentOperation.message}</p> : null}
    {payment?.reason || turn.receipt?.authorization?.reason ? <p role="status">{payment?.reason || turn.receipt?.authorization?.reason}</p> : null}
    {onRefresh ? <div className="pub-between"><Ld.Button variant="ghost" onClick={onRefresh} disabled={busy}>{turn.budgetLoading ? 'Refreshing…' : 'Refresh payment records'}</Ld.Button>{turn.budgetFetchedAt ? <span className="ld-caption">Fetched {new Date(turn.budgetFetchedAt).toLocaleTimeString()}</span> : null}</div> : null}
    {turn.budgetError ? <p role="status">Refresh failed: {turn.budgetError}</p> : null}
    <NativePaymentEvidence payment={payment} />
  </div>;
}
