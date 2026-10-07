"use client";
import {Ld} from '@axp/design-system/ledger';
import {devnetTransactionURL, isFinalizedNativeTransaction, type NativePayment} from '../../../../../packages/publisher-sdk/financial.mjs';
import {money} from './model';

export function NativePaymentEvidence({payment}: {payment?: NativePayment}) {
  if (!payment || payment.mode !== 'devnet') return null;
  const network = payment.network === 'solana-devnet';
  return <div className="pub-native-payment pub-stack">
    <div className="pub-between"><h4>On-chain records</h4><Ld.Tag tone={payment.reconciliationRequired ? 'warning' : 'outline'}>{payment.reconciliationRequired ? 'Needs reconciliation' : payment.phase || 'State unavailable'}</Ld.Tag></div>
    {payment.reason ? <p role="status">{payment.reason}</p> : null}
    <div className="pub-transaction-list">{payment.transactions?.length ? payment.transactions.map((tx, i) => {
      const complete = network && isFinalizedNativeTransaction(tx), url = network ? devnetTransactionURL(tx.signature) : undefined;
      return <div key={`${tx.operation}-${i}`}><div className="pub-between"><b>{tx.operation === 'open' ? 'Open and deposit' : 'Payout and refund'}</b><Ld.Tag tone={complete ? 'success' : 'outline'}>{complete ? 'Finalized' : tx.status || 'Not reported'}</Ld.Tag></div>{url ? <a href={url} target="_blank" rel="noopener noreferrer">View Devnet transaction →</a> : null}<details className="pub-details"><summary>Fees and token balances</summary><div className="pub-facts"><span>Finality</span><b>{tx.finality || 'Not reported'}</b><span>Network fee</span><b>{tx.networkFeeLamports ?? 'Not reported'} lamports</b><span>New account rent</span><b>{tx.newRentLamports ?? 'Not reported'} lamports</b><span>Reclaimed rent</span><b>{tx.reclaimedRentLamports ?? 'Not reported'} lamports</b></div>{complete && tx.tokenDeltas ? <pre>{JSON.stringify(tx.tokenDeltas, null, 2)}</pre> : <p className="ld-caption">No finalized token balance proof.</p>}</details></div>;
    }) : <p>No native transaction records.</p>}</div>
    <details className="pub-details"><summary>Voucher authorization · {payment.vouchers?.length ?? 0} records</summary>{payment.vouchers?.map((v, i) => <div className="pub-voucher" key={i}><div className="pub-between"><b>Voucher {v.sequence ?? i + 1}</b><Ld.Tag tone={v.status === 'authorized' ? 'success' : 'outline'}>{v.status}</Ld.Tag></div><p>{money(v.incrementBaseUnits)} test USDC increment · {money(v.cumulativeAmountBaseUnits)} cumulative</p><pre>{JSON.stringify(v, null, 2)}</pre></div>)}<p className="ld-caption">Off-chain authorization, not a payout.</p></details>
    <details className="pub-details"><summary>Channel identity</summary><div className="pub-facts">{[['Network', payment.network], ['Channel', payment.channelId], ['Protocol channel', payment.protocolChannelId], ['Address', payment.address], ['Payer', payment.payer], ['Publisher', payment.payee], ['Mint', payment.mint], ['Open state', payment.openStatus], ['Close state', payment.closeStatus]].map(([label, value]) => <span key={label} className="pub-payment-fact"><span>{label}</span><b className="ld-mono">{value || 'Not reported'}</b></span>)}</div></details>
  </div>;
}
