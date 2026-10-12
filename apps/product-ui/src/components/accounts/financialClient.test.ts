import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccountFinancialClient, FinancialScope, financialChannelDTO, type FinancialChannel } from './financialClient.ts';
import { AccountsClient } from './client.ts';
import { base58 } from './walletStandard.ts';
const org = '10000000-0000-4000-8000-000000000001', campaign = '20000000-0000-4000-8000-000000000001';
const app = '30000000-0000-4000-8000-000000000001', channelId = '40000000-0000-4000-8000-000000000001';
const payer = base58(new Uint8Array(32).fill(7)), payee = base58(new Uint8Array(32).fill(8));
const channel: FinancialChannel = { id: channelId, campaignId: campaign, campaignVersion: 2, appId: app,
  financialMode: 'devnet', settlementNetwork: 'solana-devnet', asset: 'USDC', decimals: 6, signingMode: 'own_wallet', payer, payee,
  depositBaseUnits: '20000', chargeCapBaseUnits: '10000', termsHash: 'a'.repeat(64), phase: 'frozen', protocolChannelId: null,
  authorizedBaseUnits: '0', paidBaseUnits: '0', refundBaseUnits: '0', feeAndRentLamports: '0', openStatus: 'not_prepared', closeStatus: 'not_prepared',
  openTransaction: null, closeTransaction: null, requiresReconciliation: false, servingEnabled: false, createdAt: 1, pendingAuthorizationStatus: null };
const binding = { id: channelId, resourceId: campaign, organizationId: org, ownerId: org, purpose: 'funding', network: 'solana-devnet', address: payer, verifiedAt: 1 };
const challenge = { challengeId: channelId, message: 'Fixture ownership challenge', encoding: 'utf8', signatureEncoding: 'base58', expiresAt: Date.now() + 300000, address: payer, network: 'solana-devnet', purpose: 'funding' };
function fixture(responses: unknown[]) {
  const calls: { path: string; body?: object }[] = [];
  const client = new AccountFinancialClient(async (path, body) => { calls.push({ path, body }); assert.ok(responses.length); return responses.shift(); });
  return { client, calls };
}
test('financial callback makes no constructor requests; routes and proof bodies match the owner API', async () => {
  const { client, calls } = fixture([{ wallet: binding }, challenge, { wallet: binding }, { channels: [channel] }, { channel }]);
  assert.equal(calls.length, 0);
  await client.wallet(org, 'campaigns', campaign);
  const proof = await client.challenge(org, 'campaigns', campaign, payer);
  await client.verifyWallet(org, 'campaigns', campaign, proof, base58(new Uint8Array(64).fill(3)));
  await client.channels(org, 'campaigns', campaign);
  await client.freeze(org, campaign, 2, app, '20000');
  assert.deepEqual(calls.map(c => c.path), ['wallet', 'wallet/challenge', 'wallet/verify', 'channels', 'funding'].map(suffix => `/organizations/${org}/campaigns/${campaign}/${suffix}`));
  assert.deepEqual(calls[1].body, { address: payer, network: 'solana-devnet' });
  assert.deepEqual(calls[2].body, { challengeId: channelId, signature: base58(new Uint8Array(64).fill(3)) });
  assert.deepEqual(calls[4].body, { expectedVersion: 2, appId: app, depositBaseUnits: '20000' });
});
test('account-session callback retains cookie/CSRF protection without fetch fallback or retry', async () => {
  const requests: RequestInit[] = [];
  const accounts = new AccountsClient(async (_url, options) => { requests.push(options!); return Response.json(requests.length === 1 ? {
    authenticated: true, csrf: 'fixture-csrf', user: { id: org, email: 'fixture@example.test', displayName: '' }, organizations: [],
    capabilities: { profiles: true, campaignServing: true, nativeFunding: true },
  } : { channel }); });
  const finance = new AccountFinancialClient((path, body) => accounts.financeRequest(path, body));
  await assert.rejects(finance.freeze(org, campaign, 2, app, '20000'), { status: 401 });
  assert.equal(requests.length, 0);
  await accounts.session(); await finance.freeze(org, campaign, 2, app, '20000');
  assert.equal(requests[1].credentials, 'same-origin'); assert.equal(requests[1].cache, 'no-store');
  assert.equal(new Headers(requests[1].headers).get('x-axp-csrf'), 'fixture-csrf');
  accounts.clearSession(); await assert.rejects(finance.channels(org, 'campaigns', campaign), { status: 401 });
  assert.equal(requests.length, 2);
});
test('DTOs require actual devnet mode, exact network and canonical bounded integers; private fields are discarded', () => {
  const parsed = financialChannelDTO({ ...channel, vouchers: ['PRIVATE'], walletKey: 'PRIVATE', signing: 'PRIVATE' });
  assert.deepEqual(parsed, channel);
  for (const invalid of [{ financialMode: 'synthetic' }, { financialMode: 'native' }, { settlementNetwork: 'tempo-testnet' }, { depositBaseUnits: '2e4' },
    { paidBaseUnits: 1 }, { depositBaseUnits: '020000' }, { depositBaseUnits: '200001' }, { authorizedBaseUnits: '10001' }, { servingEnabled: undefined },
    { pendingAuthorizationStatus: 'signed' }, { pendingAuthorizationStatus: undefined }]) {
    assert.throws(() => financialChannelDTO({ ...channel, ...invalid }));
  }
  for (const pendingAuthorizationStatus of [null, 'preparing', 'prepared', 'unknown']) {
    assert.equal(financialChannelDTO({ ...channel, pendingAuthorizationStatus }).pendingAuthorizationStatus, pendingAuthorizationStatus);
  }
});
test('foreign resource lists, mismatched bindings and changed frozen recipients fail closed', async () => {
  await assert.rejects(fixture([{ channels: [{ ...channel, campaignId: app }] }]).client.channels(org, 'campaigns', campaign));
  await assert.rejects(fixture([{ wallet: { ...binding, organizationId: app } }]).client.wallet(org, 'campaigns', campaign));
  await assert.rejects(fixture([{ channel: { ...channel, payee: base58(new Uint8Array(32).fill(9)) } }]).client.reconcile(org, channel));
  await assert.rejects(fixture([{ channels: [channel, channel] }]).client.channels(org, 'campaigns', campaign));
});
test('prepare/sign/reconcile are separate explicit requests; partial cooperative close remains unsigned waiting state', async () => {
  const closing = { ...channel, phase: 'draining', closeStatus: 'prepared' };
  const signing = { kind: 'close' as const, termsHash: channel.termsHash, wireBase64: 'AQID', requiredSigners: [payer, payee], estimatedFeeAndRentLamports: '5000' };
  const { client, calls } = fixture([{ channel: closing, signing }, { channel: closing, signing }, { channel: closing }]);
  const prepared = await client.prepare(org, closing, 'close', 'payee');
  assert.equal(calls.length, 1); assert.ok(prepared.signing);
  const partial = await client.submit(org, closing, prepared.signing, 'fixture-partial-wire', 'payee');
  assert.equal(partial.signing?.kind, 'close'); assert.equal(partial.channel.phase, 'draining');
  await client.reconcile(org, closing);
  assert.deepEqual(calls.map(c => c.body), [{}, { wireBase64: 'fixture-partial-wire' }, {}]);
  assert.deepEqual(calls.map(c => c.path.split('/').slice(-2).join('/')), ['close/prepare', 'close/sign', `${channelId}/reconcile`]);
});
test('native voucher payload kind is normalized, payer-only and stripped to unsigned wallet message metadata', async () => {
  const signing = { kind: 'solana-voucher', network: 'solana-devnet', signatureType: 'ed25519', termsHash: channel.termsHash,
    signer: payer, messageBase64: 'AQID', chargeId: 'charge-1', previousAmountBaseUnits: '0', cumulativeAmountBaseUnits: '1000', voucher: { private: 'PRIVATE' }, signingPayload: { private: 'PRIVATE' } };
  const { client, calls } = fixture([{ channel: { ...channel, phase: 'funded' }, signing }, { channel: { ...channel, phase: 'funded', authorizedBaseUnits: '1000' } }]);
  const prepared = await client.prepare(org, channel, 'voucher', 'payer');
  assert.equal(prepared.signing?.kind, 'voucher'); assert.equal(JSON.stringify(prepared.signing).includes('PRIVATE'), false);
  await client.submit(org, channel, prepared.signing!, 'fixture-voucher-signature', 'payer');
  assert.deepEqual(calls[1].body, { signature: 'fixture-voucher-signature' });
  const forbidden = fixture([]);
  await assert.rejects(forbidden.client.prepare(org, channel, 'voucher', 'payee'), { status: 403 });
  await assert.rejects(forbidden.client.submit(org, channel, prepared.signing!, 'anything', 'payee'), { status: 403 });
  assert.equal(forbidden.calls.length, 0);
});
test('payer activation and pause are explicit version-bound requests, never funding side effects', async () => {
  const { client, calls } = fixture([{ channel: { ...channel, phase: 'funded', servingEnabled: true } }, { channel: { ...channel, phase: 'funded', servingEnabled: false } }]);
  await client.serving(org, channel, true, 'payer'); await client.serving(org, channel, false, 'payer');
  assert.deepEqual(calls.map(c => c.body), [{ expectedVersion: 2, enabled: true }, { expectedVersion: 2, enabled: false }]);
  assert.ok(calls.every(c => c.path.endsWith('/serving')));
  await assert.rejects(client.serving(org, channel, true, 'payee'), { status: 403 }); assert.equal(calls.length, 2);
});
test('bad deposit values and path injection make no requests; uncertain requests are never retried', async () => {
  const { client, calls } = fixture([]);
  for (const amount of ['0', '01', '0.02', '200001', '-1', '1e3', '']) await assert.rejects(client.freeze(org, campaign, 2, app, amount));
  await assert.rejects(client.channels('../foreign', 'campaigns', campaign)); assert.equal(calls.length, 0);
  let attempts = 0;
  const failed = new AccountFinancialClient(async () => { attempts++; throw Error('fixture unknown'); });
  await assert.rejects(failed.prepare(org, channel, 'open', 'payer')); assert.equal(attempts, 1);
});
test('scope invalidation fences pending signatures and late completion cannot unlock a newer operation', () => {
  const scope = new FinancialScope(), first = scope.begin();
  assert.throws(() => scope.begin(), { status: 409 });
  scope.invalidate(); assert.equal(first.current(), false);
  const second = scope.begin(); first.finish(); assert.throws(() => scope.begin(), { status: 409 });
  second.finish(); const third = scope.begin(); assert.equal(third.current(), true); third.finish();
});
