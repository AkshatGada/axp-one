import { decimal, type Bootstrap, type Campaign, type ProductState } from './model.ts';

/** Only explicit financial metadata enables native labels; engine execution is independent. */
export function nativePayments(bootstrap?: Partial<Bootstrap> | null, state?: Partial<ProductState> | null): boolean {
  const mode = state?.financialMode ?? bootstrap?.financialMode ?? state?.payments?.mode ?? bootstrap?.payments?.mode;
  return mode === 'devnet' || mode === 'solana-devnet' || mode === 'native-devnet';
}
export function currencyUnit(native: boolean): string { return native ? 'Test USDC' : 'test credits'; }
export function financialModeLabel(bootstrap?: Partial<Bootstrap> | null, state?: Partial<ProductState> | null): string {
  if (!bootstrap) return 'Connecting payments…';
  return nativePayments(bootstrap, state) ? 'Solana Devnet · Test USDC' : 'Synthetic test credits';
}
export function nativeSettlementLabel(campaign: Campaign, field: 'settledBaseUnits' | 'refundBaseUnits'): string {
  if (campaign.payment?.closeStatus === 'finalized') return `${decimal(campaign.payment[field] ?? campaign[field])} Test USDC`;
  return campaign.payment?.closeStatus || campaign.status === 'settling' || campaign.payment?.phase === 'closing' ? 'Awaiting finality' : 'Not settled';
}
export function paymentPhase(campaign: Campaign): string { return campaign.payment?.reconciliationRequired ? 'uncertain' : campaign.payment?.phase ?? campaign.channelStatus ?? (campaign.status === 'draft' ? 'not_opened' : 'unknown'); }
export function phaseLabel(phase: string): string {
  return ({ not_opened: 'Not funded', unfunded: 'Not funded', pending_open: 'Opening channel', opening: 'Opening channel', open: 'Channel open', draining: 'Draining deliveries', authorizing: 'Authorizing charges', closing: 'Settlement pending', finalized: 'Channel closed · finalized', closed: 'Channel closed', uncertain: 'Reconciliation required', unknown: 'Status unavailable', failed: 'Payment blocked' } as Record<string, string>)[phase] ?? phase.replaceAll('_', ' ');
}
export function launchNotice(campaign: Campaign, native: boolean): string {
  if (!native) return 'Campaign launched. Open the publisher demo to create a matching conversation.';
  if (campaign.status === 'active' && paymentPhase(campaign) === 'open') return 'Channel funded on Solana Devnet. Your campaign is ready to compete.';
  return `Campaign saved. ${phaseLabel(paymentPhase(campaign))}. Check payment status before testing a conversation.`;
}
/** Construct a pinned Devnet explorer URL rather than trusting arbitrary response URLs. */
export function transactionURL(signature?: string): string | null {
  return signature && /^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(signature) ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : null;
}
export function paymentActions(campaign: Campaign): { closed: boolean; pending: boolean; uncertain: boolean; authorize: boolean; settle: boolean; reconcile: boolean } {
  const payment = campaign.payment, phase = paymentPhase(campaign);
  const closed = campaign.status === 'settled' || ['closed', 'finalized'].includes(phase);
  const uncertain = ['uncertain', 'unknown'].includes(phase) || payment?.reconciliationRequired === true;
  const pending = ['pending_open', 'opening', 'authorizing', 'closing'].includes(phase);
  const accepted = campaign.acceptedBaseUnits ?? payment?.acceptedBaseUnits ?? '0';
  const authorized = campaign.authorizedBaseUnits ?? payment?.authorizedBaseUnits ?? '0';
  const gap = /^\d+$/.test(accepted) && /^\d+$/.test(authorized) && BigInt(accepted) > BigInt(authorized);
  return { closed, pending, uncertain, authorize: !closed && !pending && !uncertain && ['open', 'draining'].includes(phase) && gap, settle: !closed && !pending && !uncertain && payment?.canSettle === true, reconcile: payment?.canReconcile === true };
}

/** Retry only the same saved opening; a signed/uncertain identity requires lookup. */
export function canRetryOpening(campaign: Campaign): boolean {
  if (campaign.status !== 'opening') return false;
  const payment = campaign.payment;
  if (!payment) return true;
  if (payment.reconciliationRequired || ['unknown', 'uncertain'].includes(payment.phase ?? '')) return false;
  if (payment.openStatus && !['not_prepared', 'prepared'].includes(payment.openStatus)) return false;
  if (payment.transactions?.some(tx => tx.operation === 'open' && Boolean(tx.signature))) return false;
  return payment.canRetryOpen === true;
}
