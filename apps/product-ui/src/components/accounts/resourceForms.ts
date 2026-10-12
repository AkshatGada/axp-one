import type { CampaignInput } from './types.ts';

// Frozen supported product declarations, not inferred capabilities or live inventory.
export const campaignCapabilities = [
  'crypto_storage', 'hardware_wallet', 'offline_key_storage', 'mobile_software_wallet',
  'ethereum', 'solana', 'travel_booking', 'expense_management', 'policy_enforcement',
  'authentication', 'agent_identity', 'software_development', 'online_learning',
  'project_management', 'design_tools', 'productivity', 'ecommerce',
] as const;
export const publisherScopes = ['opportunities:write', 'opportunities:read', 'delivery:write', 'delivery:read'] as const;

function text(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} is required, up to ${max} characters, without line breaks or control characters.`);
  }
  return value.trim();
}
function list(value: unknown, label: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Use at most ${max} ${label}.`);
  const entries = value.map(entry => text(entry, label, 400));
  if (new Set(entries).size !== entries.length) throw new Error(`Remove duplicate ${label}.`);
  return entries;
}
/** Explicit projection prevents client-supplied ownership, version or approval fields. */
export function campaignPayload(value: CampaignInput): CampaignInput {
  const name = text(value.name, 'Campaign name', 120);
  const productDescription = text(value.productDescription, 'Product description', 1200);
  const approvedText = text(value.approvedText, 'Sponsored text', 800);
  const contextHints = list(value.contextHints, 'context hints', 6);
  const declaredCapabilities = list(value.declaredCapabilities, 'product capabilities', 12);
  if (declaredCapabilities.some(entry => !(campaignCapabilities as readonly string[]).includes(entry))) {
    throw new Error('Choose only supported product capabilities.');
  }
  if (productDescription.length + approvedText.length + contextHints.join('').length > 2400) {
    throw new Error('Description, Sponsored text and hints together must be at most 2,400 UTF-16 characters.');
  }
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test([productDescription, approvedText, ...contextHints].join(' '))) {
    throw new Error('Remove private contact details or credentials from campaign content.');
  }
  const { maxBidBaseUnits, budgetCapBaseUnits, settlementNetwork } = value;
  if (![maxBidBaseUnits, budgetCapBaseUnits].every(amount => typeof amount === 'string' && /^[1-9][0-9]{0,5}$/.test(amount)) ||
      BigInt(maxBidBaseUnits) > 4000n || BigInt(budgetCapBaseUnits) > 100000n || BigInt(maxBidBaseUnits) > BigInt(budgetCapBaseUnits)) {
    throw new Error('Use positive integer base-unit strings: bid at most 4,000, cap at most 100,000, and bid no greater than cap.');
  }
  if (!['solana-devnet', 'tempo-testnet'].includes(settlementNetwork)) throw new Error('Choose a supported test settlement network.');
  return { name, productDescription, approvedText, contextHints, declaredCapabilities, maxBidBaseUnits, budgetCapBaseUnits, settlementNetwork };
}
export function campaignFormInput(data: FormData): CampaignInput {
  const get = (name: string) => String(data.get(name) ?? '');
  return campaignPayload({
    name: get('name'), productDescription: get('productDescription'), approvedText: get('approvedText'),
    contextHints: get('contextHints').split(/\r?\n/u).map(line => line.trim()).filter(Boolean),
    declaredCapabilities: data.getAll('declaredCapabilities').map(String),
    maxBidBaseUnits: get('maxBidBaseUnits'), budgetCapBaseUnits: get('budgetCapBaseUnits'),
    settlementNetwork: get('settlementNetwork') as CampaignInput['settlementNetwork'],
  });
}
export function credentialLabel(label: string) { return text(label, 'Credential label', 120); }
export function credentialStatus(credential: { revokedAt: number | null; expiresAt: number }, now = Date.now()) {
  return credential.revokedAt !== null ? 'Revoked' : credential.expiresAt <= now ? 'Expired' : 'Active';
}
export function accountSDKBaseURL(origin: string) { return `${new URL(origin).origin}/api/accounts/sdk`; }

/** No actual key is interpolated into examples, copied snippets, URLs or logs. */
export function accountSDKExample(origin: string) {
  const baseURL = accountSDKBaseURL(origin);
  return `// Your Node.js server only. Install the local @axp/publisher-sdk 0.2.0 tarball.
import { AXPPublisher } from '@axp/publisher-sdk';

const baseURL = ${JSON.stringify(baseURL)};
const apiKey = process.env.AXP_PUBLISHER_API_KEY; // private server environment only
if (!apiKey) throw new Error('Set AXP_PUBLISHER_API_KEY on your server');

// Read only: authenticates your app and returns its saved restrictions.
const response = await fetch(baseURL + '/publisher/config', {
  headers: { 'x-axp-publisher-key': apiKey },
  cache: 'no-store', redirect: 'error',
});
if (!response.ok) throw new Error('Account SDK configuration unavailable');
const config = await response.json();
// config.financialMode === 'unfunded'; config.servingEnabled === false.
const axp = new AXPPublisher({ apiKey, baseURL });
// Do not call requestAd yet: serving/recovery returns account_serving_not_connected (503).
// Never expose the publisher key in browser code, NEXT_PUBLIC_* or model input.`;
}
