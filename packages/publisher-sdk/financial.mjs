// Public metadata only. This module never signs, authorizes or submits a payment.
export function financialModeOf(...records) {
  for (const record of records) if (typeof record?.financialMode === 'string' && record.financialMode) return record.financialMode;
  for (const record of records) if (typeof record?.mode === 'string' && record.mode) return record.mode;
  return undefined;
}

export function moneyUnit(mode, networkOrPayment) {
  const network = typeof networkOrPayment === 'string' ? networkOrPayment : networkOrPayment?.network ?? networkOrPayment?.settlementNetwork;
  if (mode !== 'synthetic' && network === 'tempo-testnet') return 'test PathUSD';
  return mode === 'synthetic' ? 'test credits' : mode === 'devnet' || mode === 'sandbox' ? 'test USDC' : 'units';
}

export function devnetTransactionURL(signature) {
  if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return undefined;
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

// This checks the backend's reported evidence; it does not query the network.
export function nativeTransactionURL(transaction, network = transaction?.network ?? 'solana-devnet') {
  if (transaction?.network && transaction.network !== network) return undefined;
  if (network === 'solana-devnet') return devnetTransactionURL(transaction?.signature);
  if (network !== 'tempo-testnet' || (transaction?.chainId !== undefined && transaction.chainId !== 42431)) return undefined;
  const hash = transaction?.transactionHash;
  return typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash) ? `https://explore.testnet.tempo.xyz/tx/${hash}` : undefined;
}

export function isFinalizedNativeTransaction(transaction, network = transaction?.network ?? 'solana-devnet') {
  return transaction?.status === 'finalized' && transaction?.finality === 'finalized' && !!nativeTransactionURL(transaction, network);
}
