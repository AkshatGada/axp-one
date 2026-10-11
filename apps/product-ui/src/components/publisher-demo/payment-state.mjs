import {isFinalizedNativeTransaction} from '../../../../../packages/publisher-sdk/financial.mjs';

// Presentation/action guards only. The existing backend remains the signer and ledger authority.
export function paymentState(campaign, {campaignId, channelId, uncertain = false} = {}) {
  const payment = campaign?.payment;
  const bound = Boolean(campaignId && channelId && campaign?.id === campaignId && payment?.channelId === channelId && payment?.mode === 'devnet' && payment?.network === 'solana-devnet');
  const finalized = bound && payment.closeStatus === 'finalized' && payment.transactions?.some(tx => tx.operation === 'close' && isFinalizedNativeTransaction(tx)) === true;
  const closed = finalized || campaign?.status === 'settled' || payment?.phase === 'finalized' || payment?.closeStatus === 'finalized';
  const pending = ['pending_open', 'opening', 'authorizing', 'closing'].includes(payment?.phase) || Boolean(payment?.closeStatus && !['finalized', 'failed'].includes(payment.closeStatus));
  const needsReconcile = uncertain || payment?.reconciliationRequired === true;
  const accepted = campaign?.acceptedBaseUnits ?? payment?.acceptedBaseUnits;
  const authorized = campaign?.authorizedBaseUnits ?? payment?.authorizedBaseUnits;
  const validAmounts = /^\d+$/.test(accepted ?? '') && /^\d+$/.test(authorized ?? '');
  const gap = validAmounts && BigInt(accepted) > BigInt(authorized);
  return {
    bound, finalized, closed, pending, needsReconcile,
    settle: bound && !closed && !pending && !needsReconcile && payment.canSettle === true && payment.openStatus === 'finalized' && !payment.closeStatus && ['open', 'draining'].includes(payment.phase) && validAmounts && accepted === authorized && campaign.reservedBaseUnits === '0',
    authorize: bound && !closed && !pending && !needsReconcile && ['open', 'draining'].includes(payment.phase) && gap,
    // A lost HTTP acknowledgement may leave a known operation on the server. Lookup reuses it.
    reconcile: bound && !finalized && (payment.canReconcile === true || uncertain),
  };
}

export function boundPaymentIdentity(turn) {
  if (turn?.ad?.status !== 'awarded' || !turn.ad.award.campaignId) return {};
  const campaignId = turn.ad.award.campaignId;
  const saved = turn.budgetAfterAward?.campaigns?.find(c => c.id === campaignId);
  const channelId = turn.receipt?.payment?.channelId ?? saved?.payment?.channelId ?? turn.ad.trace?.payment?.channelId;
  return {campaignId, channelId};
}
