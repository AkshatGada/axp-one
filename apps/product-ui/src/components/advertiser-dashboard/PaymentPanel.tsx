import {nativeTransactionURL} from '../../../../../packages/publisher-sdk/financial.mjs';
import { Ld } from '@axp/design-system/ledger';
import { date, decimal, type Campaign } from './model';
import { canRetryOpening, currencyUnit, nativeSettlementLabel, networkOf, networkLabel, paymentActions, paymentPhase, phaseLabel } from './payment';

export function PaymentPanel({ campaign, native, busy, onSettle, onPayout, onClose, onReconcile, onAuthorize, onRetryOpen }: { campaign: Campaign; native: boolean; busy: boolean; onSettle: () => void; onPayout: () => void; onClose: () => void; onReconcile: () => void; onAuthorize: () => void; onRetryOpen: () => void }) {
  const payment = campaign.payment, phase = paymentPhase(campaign), network = networkOf(campaign), tempo = network === 'tempo-testnet', unit = currencyUnit(native, network);
  const reason = campaign.paymentError ?? payment?.error ?? payment?.reason;
  const {closed, pending, uncertain, authorize, settle, payout, close, reconcile} = paymentActions(campaign);
  return <Ld.Panel title={native ? 'Payment channel' : 'Close campaign'} sub={native ? `${networkLabel(network)} · ${unit}` : 'Test credits · no real money'}>
    {native ? <>
      <div className="ad-payment-status" role="status"><Ld.Tag tone={uncertain ? 'warning' : closed ? 'success' : 'outline'}>{phaseLabel(phase)}</Ld.Tag></div>
      <p className="ld-secondary">{tempo ? 'Pay out accepted deliveries and keep running. Close to return the unused deposit.' : 'Close to pay accepted deliveries and return the unused deposit.'}</p>
      {reason && <Ld.Callout tone="warning" title="Payment needs attention">{reason.replaceAll('_', ' ')}</Ld.Callout>}
      {pending && <p className="ld-caption">This is still in progress. Refresh to see the latest status.</p>}
      {uncertain && <p className="ld-caption">Reconcile the saved operation before another payment action.</p>}
      <dl className="ad-review"><div><dt>Confirmed deposit</dt><dd>{payment?.confirmedDepositBaseUnits === undefined ? 'Awaiting confirmation' : `${decimal(payment.confirmedDepositBaseUnits)} ${unit}`}</dd></div><div><dt>Accepted charges</dt><dd>{decimal(campaign.acceptedBaseUnits ?? payment?.acceptedBaseUnits)} {unit}</dd></div><div><dt>Voucher total</dt><dd>{decimal(campaign.authorizedBaseUnits ?? payment?.authorizedBaseUnits)} {unit}</dd></div><div><dt>Publisher paid</dt><dd>{nativeSettlementLabel(campaign, 'settledBaseUnits')}</dd></div><div><dt>Returned deposit</dt><dd>{nativeSettlementLabel(campaign, 'refundBaseUnits')}</dd></div></dl>
      <div className="ad-action-row">
        {canRetryOpening(campaign) && <Ld.Button variant="secondary" disabled={busy} onClick={onRetryOpen}>Retry saved opening</Ld.Button>}
        {authorize && <Ld.Button variant="secondary" disabled={busy} onClick={onAuthorize}>Authorize deliveries</Ld.Button>}
        {tempo && !closed && <Ld.Button disabled={busy || !payout} onClick={onPayout}>{busy ? 'Processing…' : 'Pay out'}</Ld.Button>}
        <Ld.Button variant="secondary" disabled={busy || closed || !(tempo ? close : settle)} onClick={tempo ? onClose : onSettle}>{busy ? 'Processing…' : closed ? 'Closed and settled' : tempo ? 'Close & refund' : 'Close & settle Test USDC'}</Ld.Button>
        {reconcile && <Ld.Button variant="ghost" disabled={busy} onClick={onReconcile}>Reconcile status</Ld.Button>}
      </div>
      <Ld.Disclosure summary={`Transactions (${payment?.transactions?.length ?? 0})`}><div className="ad-payment-evidence">{payment?.transactions?.length ? <ul>{payment.transactions.map((tx, i) => {
        const url = nativeTransactionURL(tx, network);
        return <li key={`${tx.operation}-${tx.transactionHash ?? tx.signature ?? i}`}><div><strong>{tx.operation === 'payout' ? 'Publisher payout' : tx.operation.replaceAll('_', ' ')}</strong><span className="ld-caption">{tx.status.replaceAll('_', ' ')}{tx.finality ? ` · ${tx.finality}` : ''}{tx.createdAt ? ` · ${date(tx.createdAt)}` : ''}</span></div>{url ? <a href={url} target="_blank" rel="noopener noreferrer">View on {tempo ? 'Tempo' : 'Solana'} ↗</a> : <span className="ld-caption">No transaction recorded</span>}<dl className="ad-transaction-deltas">{tempo ? tx.feeAmountBaseUnits != null && <div><dt>Network fee</dt><dd>{tx.feeAmountBaseUnits} {tx.feeAsset ?? 'fee token'} base units</dd></div> : <>{tx.networkFeeLamports !== undefined && <div><dt>Network fee</dt><dd>{tx.networkFeeLamports} lamports</dd></div>}{tx.newRentLamports !== undefined && <div><dt>New rent</dt><dd>{tx.newRentLamports} lamports</dd></div>}{tx.reclaimedRentLamports !== undefined && <div><dt>Reclaimed rent</dt><dd>{tx.reclaimedRentLamports} lamports</dd></div>}</>}{tx.tokenDeltas && <div><dt>{unit} deltas · base units</dt><dd>Payer {tx.tokenDeltas.payer ?? 'unavailable'} · publisher {tx.tokenDeltas.publisher ?? 'unavailable'}</dd></div>}</dl></li>;
      })}</ul> : <p className="ld-caption">Transactions appear here once one is recorded.</p>}</div></Ld.Disclosure>
      <Ld.Disclosure summary="Vouchers and channel address"><div className="ad-payment-evidence"><dl className="ad-review"><div><dt>Channel</dt><dd className="ad-payment-identity">{payment?.address ?? payment?.protocolChannelId ?? payment?.channelId ?? 'Not opened'}</dd></div></dl>{payment?.vouchers?.length ? <ul>{payment.vouchers.map(v => <li key={v.chargeId}><div><strong>Voucher {v.sequence} · {v.status.replaceAll('_', ' ')}</strong><span className="ld-caption">+{decimal(v.incrementBaseUnits)} {unit} · total {decimal(v.cumulativeAmountBaseUnits)} {unit}</span></div></li>)}</ul> : <p className="ld-caption">No authorized vouchers yet.</p>}</div></Ld.Disclosure>
      <p className="ad-card-caption ld-caption">A payout does not add to the campaign’s spending limit.</p>
    </> : <>
      <p className="ld-secondary">Closing ends new placements and records the accepted charges as settled. No real money moves.</p><Ld.Button variant="secondary" disabled={busy || closed} onClick={onSettle}>{closed ? 'Closed and settled' : 'Close campaign'}</Ld.Button>
    </>}
  </Ld.Panel>;
}
