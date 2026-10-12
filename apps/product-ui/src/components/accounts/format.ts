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
  return mode === 'devnet' ? 'Solana Devnet · test USDC' : 'Test balance · no real money';
}
export function modeSentence(mode: FinancialMode) {
  return mode === 'devnet'
    ? 'Amounts here are test USDC on the Solana Devnet test network. No real money.'
    : 'Amounts here are test balances. No real money moves.';
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
  won: 'Won',
  lost: 'Outbid',
  skipped: 'Chose not to bid',
  unavailable: 'Decision unavailable',
  abstained: 'Chose not to bid',
  excluded: 'Not eligible',
  no_fill: 'No ad shown',
};
export const deliveryLabel: Record<AccountActivity['deliveryStatus'], string> = {
  not_awarded: 'No placement',
  accepted: 'Shown and accepted',
  failed: 'Delivery failed',
  expired: 'Expired before delivery',
  reserved: 'Awaiting receipt',
};
export function executionLabel(execution: AccountActivity['execution']) {
  return execution === 'actual-api-model' ? 'Live decision'
    : execution === 'fixture' ? 'Test decision'
      : execution === 'unavailable' ? 'Decision unavailable' : 'No decision reported';
}
export const gateLabel: Record<string, string> = {
  credential: 'Active API key',
  restrictions: 'Ad rules can be applied',
  catalogue: 'Campaigns available',
  inventory: 'At least one live campaign',
  provider: 'Bidding available',
  funding: 'Funded for this app',
  broadcasts: 'Payments available',
};
