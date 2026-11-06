// Arc Testnet only. Amounts use the 6-decimal ERC-20 interface; native gas uses 18.
export const ARC_NETWORK = Object.freeze({
  network: 'arc-testnet', chainId: 5042002, caip2: 'eip155:5042002', domain: 26,
  rpc: 'https://rpc.testnet.arc.io', explorer: 'https://testnet.arcscan.app',
  token: '0x3600000000000000000000000000000000000000', tokenSymbol: 'USDC', decimals: 6,
  gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
  gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
});
export const ARC_LIMITS = Object.freeze({
  maxChannels: 2, maxDepositBaseUnits: '20000', maxBudgetBaseUnits: '16000',
  maxBidBaseUnits: '4000', aggregateDepositBaseUnits: '40000',
  aggregateChargeBaseUnits: '16000', maxCharges: 16,
  maxTransactionFeeAttoUSD: '100000000000000000', aggregateFeeAttoUSD: '1000000000000000000',
});
export function arcCheck(condition, code) {
  if (!condition) throw Object.assign(new Error(code), {code, reasonCode: code, status: 409});
}
export function arcRPCURL(value = ARC_NETWORK.rpc) {
  let url;
  try { url = new URL(value); } catch { arcCheck(false, 'arc_rpc_url_invalid'); }
  arcCheck((url.protocol === 'https:' || url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) && !url.username && !url.password && !url.hash, 'arc_rpc_url_invalid');
  return url.href;
}
export const sameAddress = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
