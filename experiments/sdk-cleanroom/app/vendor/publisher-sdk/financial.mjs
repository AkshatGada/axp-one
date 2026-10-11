// Public metadata only. This module never signs, authorizes or submits a payment.
export function financialModeOf(...records) {
  for (const record of records) if (typeof record?.financialMode === 'string' && record.financialMode) return record.financialMode;
  for (const record of records) if (typeof record?.mode === 'string' && record.mode) return record.mode;
  return undefined;
}

export function moneyUnit(mode) {
  return mode === 'synthetic' ? 'test credits' : mode === 'devnet' || mode === 'sandbox' ? 'test USDC' : 'units';
}

export function devnetTransactionURL(signature) {
  if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return undefined;
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

// This checks the backend's reported evidence; it does not query the network.
export function isFinalizedNativeTransaction(transaction) {
  return transaction?.status === 'finalized' && transaction?.finality === 'finalized' && !!devnetTransactionURL(transaction.signature);
}
