/** Display-only helpers. Amounts stay integer base-unit strings everywhere else. */
import type { AccountActivity, PayoutNetwork } from './types.ts';

export const networkLabel: Record<PayoutNetwork, string> = {
  'solana-devnet': 'Solana Devnet',
  'tempo-testnet': 'Tempo Testnet',
};
export const networkAsset: Record<PayoutNetwork, string> = {
  'solana-devnet': 'test USDC',
  'tempo-testnet': 'test PathUSD',
};
export function networkName(network: string) { return networkLabel[network as PayoutNetwork] ?? network; }
export function assetName(network: string) { return networkAsset[network as PayoutNetwork] ?? 'test units'; }

/** Six-decimal base units to a plain decimal string, without floating point. */
export function formatUnits(base: string | null | undefined): string {
  if (typeof base !== 'string' || !/^[0-9]{1,30}$/.test(base)) return 'Not available';
  const padded = base.padStart(7, '0');
  const whole = padded.slice(0, -6).replace(/^0+(?=\d)/, '');
  const fraction = padded.slice(-6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

export type FinancialMode = 'synthetic' | 'devnet';
export function modeName(mode: FinancialMode) {
  return mode === 'devnet' ? 'Solana Devnet, test USDC' : 'Simulated accounting';
}
export function modeSentence(mode: FinancialMode) {
  return mode === 'devnet'
    ? 'This server uses the Solana Devnet test network with test USDC. Nothing here is real money.'
    : 'This server uses simulated accounting. Charges and earnings are ledger entries only; no deposit, payout or refund takes place.';
}
/** Unit shown next to an amount. Simulated amounts are never labelled as a test-network balance. */
export function amountUnit(mode: FinancialMode, network: string) {
  return mode === 'devnet' ? assetName(network) : `simulated ${assetName(network)}`;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatWhen(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
}

export const dispositionLabel: Record<AccountActivity['disposition'], string> = {
  won: 'Won the placement',
  lost: 'Outbid',
  skipped: 'Chose not to bid',
  unavailable: 'Decision unavailable',
  abstained: 'Abstained',
  excluded: 'Not eligible',
  no_fill: 'No ad shown',
};
export const deliveryLabel: Record<AccountActivity['deliveryStatus'], string> = {
  not_awarded: 'No placement',
  accepted: 'Insertion accepted',
  failed: 'Delivery failed',
  expired: 'Expired before delivery',
  reserved: 'Reserved, awaiting receipt',
};
export function executionLabel(execution: AccountActivity['execution']) {
  return execution === 'actual-api-model' ? 'Live model decision'
    : execution === 'fixture' ? 'Fixture decision (test data)'
      : execution === 'unavailable' ? 'Model unavailable' : 'No model decision reported';
}
export const gateLabel: Record<string, string> = {
  credential: 'Active server key',
  restrictions: 'Category rules can be enforced',
  catalogue: 'Campaign catalogue available',
  inventory: 'Eligible campaigns enrolled',
  provider: 'Bidding service reachable',
  funding: 'Funded channel for this app',
  broadcasts: 'Broadcasts available for funding',
};
