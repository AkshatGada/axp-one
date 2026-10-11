import {isFinalizedNativeTransaction} from '../../../../../packages/publisher-sdk/financial.mjs';

// Presentation/action guards only. The existing backend remains the signer and ledger authority.
export function paymentState(campaign, {campaignId, channelId, settlementNetwork = 'solana-devnet', uncertain = false} = {}) {
  const payment = campaign?.payment;
  const bound = Boolean(campaignId && channelId && campaign?.id === campaignId && payment?.channelId === channelId && payment?.mode === 'devnet' && ['solana-devnet', 'tempo-testnet'].includes(payment?.network) && payment.network === settlementNetwork);
  const finalized = bound && payment.closeStatus === 'finalized' && payment.transactions?.some(tx => tx.operation === 'close' && isFinalizedNativeTransaction(tx, payment.network)) === true;
  const closed = finalized || campaign?.status === 'settled' || payment?.phase === 'finalized' || payment?.closeStatus === 'finalized';
  const pending = ['pending_open', 'opening', 'authorizing', 'paying_out', 'closing'].includes(payment?.phase) || Boolean(payment?.closeStatus && !['finalized', 'failed'].includes(payment.closeStatus));
  const needsReconcile = uncertain || payment?.reconciliationRequired === true;
  const accepted = campaign?.acceptedBaseUnits ?? payment?.acceptedBaseUnits;
  const authorized = campaign?.authorizedBaseUnits ?? payment?.authorizedBaseUnits;
  const validAmounts = /^\d+$/.test(accepted ?? '') && /^\d+$/.test(authorized ?? '');
  const settled = campaign?.settledBaseUnits ?? payment?.settledBaseUnits ?? '0';
  const closeRetryAllowed = payment?.network === 'tempo-testnet' && payment.closeStatus === 'failed' && payment.canClose === true;
  const safe = bound && !closed && !pending && !needsReconcile && payment.openStatus === 'finalized' && (!payment.closeStatus || closeRetryAllowed) && ['open', 'draining'].includes(payment.phase) && validAmounts && accepted === authorized && campaign.reservedBaseUnits === '0';
  const gap = validAmounts && BigInt(accepted) > BigInt(authorized);
  return {
    bound, finalized, closed, pending, needsReconcile,
    settle: safe && payment.canSettle === true,
    payout: safe && payment.network === 'tempo-testnet' && payment.phase === 'open' && !payment.closeStatus && payment.canPayout === true && /^\d+$/.test(settled) && BigInt(authorized) > BigInt(settled),
    close: safe && payment.network === 'tempo-testnet' && payment.canClose === true,
    authorize: bound && !closed && !pending && !needsReconcile && ['open', 'draining'].includes(payment.phase) && gap,
    // A lost HTTP acknowledgement may leave a known operation on the server. Lookup reuses it.
    reconcile: bound && !finalized && (payment.canReconcile === true || uncertain),
  };
}

export function syntheticSettlementFinalized(campaign) {
  return campaign?.status === 'settled';
}

export function boundPaymentIdentity(turn) {
  if (turn?.ad?.status !== 'awarded' || !turn.ad.award.campaignId) return {};
  const campaignId = turn.ad.award.campaignId;
  const saved = turn.budgetAfterAward?.campaigns?.find(c => c.id === campaignId);
  const channelId = turn.receipt?.payment?.channelId ?? saved?.payment?.channelId ?? turn.ad.trace?.payment?.channelId;
  const settlementNetwork = turn.input?.settlementNetwork;
  return {campaignId, channelId, ...(settlementNetwork ? {settlementNetwork} : {})};
}
