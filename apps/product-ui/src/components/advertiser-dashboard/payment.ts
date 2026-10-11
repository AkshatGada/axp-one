import {isFinalizedNativeTransaction} from '../../../../../packages/publisher-sdk/financial.mjs';
import { decimal, type Bootstrap, type Campaign, type ProductState, type PaymentMetadata, type SettlementNetwork } from './model.ts';

/** Only explicit financial metadata enables native labels; engine execution is independent. */
export function nativePayments(bootstrap?: Partial<Bootstrap> | null, state?: Partial<ProductState> | null): boolean {
  const mode = state?.financialMode ?? bootstrap?.financialMode ?? state?.payments?.mode ?? bootstrap?.payments?.mode;
  return mode === 'devnet' || mode === 'solana-devnet' || mode === 'native-devnet';
}
export function networkOf(campaign?: Pick<Campaign, 'settlementNetwork' | 'payment'>): SettlementNetwork { return campaign?.payment?.network === 'tempo-testnet' || campaign?.settlementNetwork === 'tempo-testnet' ? 'tempo-testnet' : 'solana-devnet'; }
export function networkLabel(network: SettlementNetwork): string { return network === 'tempo-testnet' ? 'Tempo Testnet' : 'Solana Devnet'; }
export function currencyUnit(native: boolean, network: SettlementNetwork = 'solana-devnet'): string { return native ? network === 'tempo-testnet' ? 'test PathUSD' : 'Test USDC' : 'test credits'; }
export function paymentReadiness(bootstrap: Bootstrap, network: SettlementNetwork): PaymentMetadata | undefined { return bootstrap.payments?.networks?.[network] ?? (network === 'solana-devnet' ? bootstrap.payments : undefined); }
/** Totals stay partitioned by settlement asset, including legacy Solana campaigns. */
export function networkTotals(campaigns: Campaign[]) {
  return (['solana-devnet', 'tempo-testnet'] as const).map(network => {
    const rows = campaigns.filter(c => networkOf(c) === network);
    const sum = (key: 'spendBaseUnits' | 'settledBaseUnits') => rows.reduce((total, c) => total + BigInt(c[key] ?? (key === 'spendBaseUnits' ? c.acceptedBaseUnits : undefined) ?? '0'), 0n).toString();
    return {network, campaigns: rows.length, spendBaseUnits: sum('spendBaseUnits'), settledBaseUnits: sum('settledBaseUnits')};
  }).filter(row => row.campaigns > 0);
}
export function financialModeLabel(bootstrap?: Partial<Bootstrap> | null, state?: Partial<ProductState> | null): string {
  if (!bootstrap) return 'Connecting payments…';
  return nativePayments(bootstrap, state) ? bootstrap.payments?.networks?.['tempo-testnet'] ? 'Native testnet payments' : 'Solana Devnet · Test USDC' : 'Synthetic test credits';
}
export function nativeSettlementLabel(campaign: Campaign, field: 'settledBaseUnits' | 'refundBaseUnits'): string {
  const payment = campaign.payment, network = networkOf(campaign);
  const tempo = network === 'tempo-testnet';
  const closeFinalized = payment?.closeStatus === 'finalized' && (!tempo || payment.transactions?.some(tx => tx.operation === 'close' && isFinalizedNativeTransaction(tx, network)));
  const paidWhileOpen = tempo && field === 'settledBaseUnits' && payment?.transactions?.some(tx => tx.operation === 'payout' && isFinalizedNativeTransaction(tx, network));
  if (closeFinalized || paidWhileOpen) return `${decimal(payment?.[field] ?? campaign[field])} ${currencyUnit(true, network)}`;
  return payment?.closeStatus || campaign.status === 'settling' || payment?.phase === 'closing' ? 'Awaiting finality' : 'Not settled';
}
export function paymentPhase(campaign: Campaign): string { return campaign.payment?.reconciliationRequired ? 'uncertain' : campaign.payment?.phase ?? campaign.channelStatus ?? (campaign.status === 'draft' ? 'not_opened' : 'unknown'); }
export function phaseLabel(phase: string): string {
  return ({ not_opened: 'Not funded', unfunded: 'Not funded', pending_open: 'Opening channel', opening: 'Opening channel', open: 'Channel open', draining: 'Draining deliveries', authorizing: 'Authorizing charges', paying_out: 'Payout pending', closing: 'Settlement pending', finalized: 'Channel closed · finalized', closed: 'Channel closed', uncertain: 'Reconciliation required', unknown: 'Status unavailable', failed: 'Payment blocked' } as Record<string, string>)[phase] ?? phase.replaceAll('_', ' ');
}
export function launchNotice(campaign: Campaign, native: boolean): string {
  if (!native) return 'Campaign launched. Open the publisher demo to create a matching conversation.';
  if (campaign.status === 'active' && paymentPhase(campaign) === 'open') return `Channel funded on ${networkLabel(networkOf(campaign))}. Your campaign is ready to compete.`;
  return `Campaign saved. ${phaseLabel(paymentPhase(campaign))}. Check payment status before testing a conversation.`;
}
export type PaymentOperationResult = {status?: string; reason?: string | null; reasonCode?: string | null};
export function paymentOperationProblem(operation?: PaymentOperationResult): string | undefined {
  const reason = (operation?.reason ?? operation?.reasonCode)?.replaceAll('_', ' ');
  if (operation?.status === 'unknown') return `Payment outcome is uncertain. Reconcile the saved operation before continuing.${reason ? ` ${reason}` : ''}`;
  if (operation?.status === 'blocked' || operation?.status === 'failed') return `Payment ${operation.status}.${reason ? ` ${reason}` : ' Inspect the channel status before retrying.'}`;
  return undefined;
}
/** Construct a pinned Devnet explorer URL rather than trusting arbitrary response URLs. */
export function transactionURL(signature?: string, network: SettlementNetwork = 'solana-devnet'): string | null {
  if (network === 'tempo-testnet') return signature && /^0x[0-9a-fA-F]{64}$/.test(signature) ? `https://explore.testnet.tempo.xyz/tx/${signature}` : null;
  return signature && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature) ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : null;
}
export function paymentActions(campaign: Campaign): { closed: boolean; pending: boolean; uncertain: boolean; authorize: boolean; settle: boolean; payout: boolean; close: boolean; reconcile: boolean } {
  const payment = campaign.payment, phase = paymentPhase(campaign);
  const closed = campaign.status === 'settled' || ['closed', 'finalized'].includes(phase);
  const uncertain = ['uncertain', 'unknown'].includes(phase) || payment?.reconciliationRequired === true;
  const pending = ['pending_open', 'opening', 'authorizing', 'paying_out', 'closing'].includes(phase);
  const accepted = campaign.acceptedBaseUnits ?? payment?.acceptedBaseUnits ?? '0';
  const authorized = campaign.authorizedBaseUnits ?? payment?.authorizedBaseUnits ?? '0';
  const amountsValid = /^\d+$/.test(accepted) && /^\d+$/.test(authorized);
  const gap = amountsValid && BigInt(accepted) > BigInt(authorized);
  return { closed, pending, uncertain, authorize: !closed && !pending && !uncertain && ['open', 'draining'].includes(phase) && gap, settle: !closed && !pending && !uncertain && payment?.canSettle === true, payout: networkOf(campaign) === 'tempo-testnet' && !closed && !pending && !uncertain && amountsValid && accepted === authorized && campaign.reservedBaseUnits === '0' && payment?.canPayout === true, close: networkOf(campaign) === 'tempo-testnet' && !closed && !pending && !uncertain && payment?.canClose === true, reconcile: payment?.canReconcile === true };
}

/** Retry only the same saved opening; a signed/uncertain identity requires lookup. */
export function canRetryOpening(campaign: Campaign): boolean {
  if (campaign.status !== 'opening') return false;
  const payment = campaign.payment;
  if (!payment) return true;
  if (payment.reconciliationRequired || ['unknown', 'uncertain'].includes(payment.phase ?? '')) return false;
  if (payment.openStatus && !['not_prepared', 'prepared'].includes(payment.openStatus)) return false;
  if (payment.transactions?.some(tx => tx.operation === 'open' && Boolean(tx.signature || tx.transactionHash))) return false;
  return payment.canRetryOpen === true;
}
