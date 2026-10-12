// Mock transport only. No Supabase/users/email/models/payments/cloud or sockets.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AccountApiError, AccountsClient } from '../apps/product-ui/src/components/accounts/client.ts';
import {
  accountSDKBaseURL, accountSDKExample, campaignCapabilities, campaignFormInput,
  campaignPayload, credentialLabel, credentialStatus, publisherScopes,
} from '../apps/product-ui/src/components/accounts/resourceForms.ts';

const orgId = '11111111-1111-4111-8111-111111111111';
const appId = '22222222-2222-4222-8222-222222222222';
const campaignId = '33333333-3333-4333-8333-333333333333';
const keyId = '44444444-4444-4444-8444-444444444444';
const nextId = '55555555-5555-4555-8555-555555555555';
const capabilities = { profiles: true, campaignDrafts: true, appCredentials: true, campaignServing: false, nativeFunding: false };
const session = { authenticated: true, csrf: 'fixture-session-csrf', user: { id: 'fixture-user', email: 'fixture@example.test', displayName: '' }, organizations: [{ id: orgId, name: 'Owner fixture', role: 'owner' }], capabilities };
const input = { name: 'Wallet comparison', productDescription: 'Hardware wallet with offline key storage.', approvedText: 'Inspect this hardware wallet.', contextHints: ['When comparing hardware wallets.'], declaredCapabilities: ['hardware_wallet', 'offline_key_storage'], maxBidBaseUnits: '4000', budgetCapBaseUnits: '100000', settlementNetwork: 'solana-devnet' };
const campaign = { id: campaignId, organizationId: orgId, advertiserId: 'fixture-advertiser', version: 1, status: 'draft', input, approvedContentHash: null, createdAt: 1, updatedAt: 1, servingStatus: 'not_connected' };
const credential = { id: keyId, organizationId: orgId, appId, publisherId: `app:${appId}`, label: 'Staging backend', scopes: [...publisherScopes], createdAt: 1, expiresAt: 2592000001, revokedAt: null };
const apiKey = `axp_app_${'a'.repeat(64)}`;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function fixture(responses = []) {
  const calls = [];
  const client = new AccountsClient(async (url, options = {}) => {
    calls.push({ url: String(url), ...options });
    assert.ok(responses.length, 'unexpected transport request');
    const response = responses.shift();
    return typeof response === 'function' ? response() : json(response);
  });
  return { client, calls };
}
const body = call => call.body === undefined ? undefined : JSON.parse(call.body);
const campaignBase = `/api/accounts/organizations/${orgId}/campaigns`;
const credentialsBase = `/api/accounts/organizations/${orgId}/apps/${appId}/credentials`;

test('all owner resource reads and writes fail closed before a session read', async () => {
  const { client, calls } = fixture();
  for (const operation of [
    () => client.organization(orgId), () => client.campaigns(orgId), () => client.campaign(orgId, campaignId),
    () => client.saveCampaign(orgId, input), () => client.approveCampaign(orgId, campaignId, 1),
    () => client.appCredentials(orgId, appId), () => client.issueAppCredential(orgId, appId, 'Backend'),
    () => client.revokeAppCredential(orgId, appId, keyId), () => client.rotateAppCredential(orgId, appId, keyId, 'Replacement'),
  ]) await assert.rejects(operation, { status: 401 });
  assert.equal(calls.length, 0);
});

test('frozen campaign routes, DTOs, versions and approval round-trip through mocked transport', async () => {
  const edited = { ...campaign, version: 2, updatedAt: 2, input: { ...input, approvedText: 'Revised text.' } };
  const approved = { ...edited, status: 'approved', approvedContentHash: 'c'.repeat(64) };
  const { client, calls } = fixture([session, { campaigns: [campaign] }, { campaign }, { campaign }, { campaign: edited }, { campaign: approved }]);
  await client.session();
  assert.deepEqual(await client.campaigns(orgId), { campaigns: [campaign] });
  assert.deepEqual(await client.campaign(orgId, campaignId), { campaign });
  await client.saveCampaign(orgId, { ...input, organizationId: 'forged', advertiserId: 'forged', version: 99, status: 'approved', approvedContentHash: 'forged' });
  assert.deepEqual(await client.saveCampaign(orgId, edited.input, campaignId), { campaign: edited });
  assert.deepEqual(await client.approveCampaign(orgId, campaignId, 2), { campaign: approved });
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['GET', '/api/accounts/session'], ['GET', campaignBase], ['GET', `${campaignBase}/${campaignId}`],
    ['POST', campaignBase], ['POST', `${campaignBase}/${campaignId}`], ['POST', `${campaignBase}/${campaignId}/approve`],
  ]);
  assert.deepEqual(body(calls[3]), input);
  assert.deepEqual(body(calls[4]), edited.input);
  assert.deepEqual(body(calls[5]), { expectedVersion: 2 });
  for (const call of calls) {
    assert.equal(call.cache, 'no-store'); assert.equal(call.credentials, 'same-origin'); assert.equal(call.redirect, 'error');
    const headers = new Headers(call.headers);
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('x-axp-publisher-key'), false);
    assert.equal(headers.get('x-axp-csrf'), call.method === 'POST' ? session.csrf : null);
  }
});

test('credential issue/list/revoke/rotate use exact owner routes and only label or empty bodies', async () => {
  const replacement = { ...credential, id: nextId, label: 'Replacement' };
  const revoked = { ...credential, revokedAt: 2 };
  const { client, calls } = fixture([session, { credentials: [credential] }, { credential, apiKey }, { credential: revoked }, { credential: replacement, apiKey }]);
  await client.session();
  assert.deepEqual(await client.appCredentials(orgId, appId), { credentials: [credential] });
  assert.deepEqual(await client.issueAppCredential(orgId, appId, ' Staging backend '), { credential, apiKey });
  assert.deepEqual(await client.revokeAppCredential(orgId, appId, keyId), { credential: revoked });
  assert.deepEqual(await client.rotateAppCredential(orgId, appId, keyId, 'Replacement'), { credential: replacement, apiKey });
  assert.deepEqual(calls.slice(1).map(call => [call.method, call.url, body(call)]), [
    ['GET', credentialsBase, undefined], ['POST', credentialsBase, { label: 'Staging backend' }],
    ['POST', `${credentialsBase}/${keyId}/revoke`, {}], ['POST', `${credentialsBase}/${keyId}/rotate`, { label: 'Replacement' }],
  ]);
  assert.ok(calls.every(call => !JSON.stringify(call).includes(apiKey)));
});

test('approval requires a reviewed positive safe integer version before sending anything', async () => {
  const { client, calls } = fixture([session]);
  await client.session();
  for (const version of [undefined, null, 0, -1, 1.5, '1', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(client.approveCampaign(orgId, campaignId, version), { status: 400, code: 'invalid_expected_version' });
  }
  assert.equal(calls.length, 1);
});

test('atomic approval conflict never falls back to freshness GET or approves a newer version automatically', async () => {
  const approved = { ...campaign, version: 2, status: 'approved', approvedContentHash: 'c'.repeat(64) };
  const latest = { ...campaign, version: 2, input: { ...input, approvedText: 'Edited in another tab.' } };
  const { client, calls } = fixture([
    session, () => json({ error: 'campaign_version_conflict' }, 409),
    { campaigns: [latest] }, { campaign: { ...approved, input: latest.input } },
  ]);
  await client.session();
  await assert.rejects(client.approveCampaign(orgId, campaignId, 1), failure =>
    failure instanceof AccountApiError && failure.status === 409 && failure.code === 'campaign_version_conflict' &&
    /review the latest saved version/.test(failure.message) && /Nothing was approved/.test(failure.message));
  assert.equal(calls.length, 2, 'conflict must not retry approval or do a client freshness check');
  assert.deepEqual(body(calls[1]), { expectedVersion: 1 });
  assert.equal((await client.campaigns(orgId)).campaigns[0].version, 2);
  // Separate explicit approval after reviewing the refreshed version.
  assert.equal((await client.approveCampaign(orgId, campaignId, 2)).campaign.version, 2);
  assert.deepEqual(body(calls[3]), { expectedVersion: 2 });
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['GET', '/api/accounts/session'], ['POST', `${campaignBase}/${campaignId}/approve`],
    ['GET', campaignBase], ['POST', `${campaignBase}/${campaignId}/approve`],
  ]);
});

test('approval rejects a success DTO for a different saved version', async () => {
  const { client } = fixture([session, { campaign: { ...campaign, version: 2, status: 'approved', approvedContentHash: 'c'.repeat(64) } }]);
  await client.session();
  await assert.rejects(client.approveCampaign(orgId, campaignId, 1), { status: 502, code: 'invalid_response' });
});

test('capability rollout accepts optional resource flags but rejects non-booleans', async () => {
  const health = { enabled: true, provider: 'supabase', configured: { origin: true, provider: true, store: true }, capabilities };
  assert.deepEqual((await fixture([health]).client.health()).capabilities, capabilities);
  const { campaignDrafts, appCredentials, ...legacy } = capabilities;
  assert.deepEqual((await fixture([{ ...health, capabilities: legacy }]).client.health()).capabilities, legacy);
  for (const key of ['campaignDrafts', 'appCredentials']) {
    await assert.rejects(fixture([{ ...health, capabilities: { ...capabilities, [key]: 'true' } }]).client.health(), { status: 502 });
    await assert.rejects(fixture([{ ...session, capabilities: { ...capabilities, [key]: 1 } }]).client.session(), { status: 502 });
  }
  assert.equal(capabilities.campaignServing, false); assert.equal(capabilities.nativeFunding, false);
});

test('foreign and missing resource responses are equally actionable 404s, without retry', async () => {
  const { client, calls } = fixture([session, () => json({ error: 'not_found' }, 404), () => json({ error: 'not_found' }, 404)]);
  await client.session();
  const errors = [];
  for (const id of [campaignId, nextId]) await assert.rejects(client.campaign(orgId, id), error => { errors.push(error); return error.status === 404; });
  assert.equal(errors[0].message, errors[1].message);
  assert.equal(calls.length, 3);
});

test('campaign DTO validation rejects foreign bindings, unsupported serving and invalid approval state', async () => {
  for (const patch of [
    { organizationId: nextId }, { id: nextId }, { version: 0 }, { version: 1.5 },
    { status: 'active' }, { servingStatus: 'connected' }, { approvedContentHash: 'a'.repeat(64) },
    { status: 'approved', approvedContentHash: null }, { input: null }, { input: { ...input, maxBidBaseUnits: '1.0' } },
  ]) {
    const { client } = fixture([session, { campaign: { ...campaign, ...patch } }]);
    await client.session();
    await assert.rejects(client.campaign(orgId, campaignId), { status: 502 });
  }
});

test('credential lists never accept raw key/hash/token fields or mismatched app identity', async () => {
  for (const patch of [
    { organizationId: nextId }, { appId: nextId }, { publisherId: `app:${nextId}` },
    { keyHash: 'a'.repeat(64) }, { key_hash: 'a'.repeat(64) }, { hash: 'private' }, { apiKey }, { token: 'private' },
    { scopes: ['opportunities:write'] }, { expiresAt: 0 }, { revokedAt: 'never' }, { createdAt: Number.MAX_SAFE_INTEGER },
  ]) {
    const { client } = fixture([session, { credentials: [{ ...credential, ...patch }] }]);
    await client.session();
    await assert.rejects(client.appCredentials(orgId, appId), { status: 502 });
  }
});

test('raw credential is returned only on issuance/rotation; malformed mutations fail closed', async () => {
  for (const response of [{ credential }, { credential, apiKey: 'bad' }, { credential: { ...credential, revokedAt: 2 }, apiKey }]) {
    const { client } = fixture([session, response]); await client.session();
    await assert.rejects(client.issueAppCredential(orgId, appId, 'Backend'), { status: 502 });
  }
  const same = fixture([session, { credential, apiKey }]); await same.client.session();
  await assert.rejects(same.client.rotateAppCredential(orgId, appId, keyId, 'New'), { status: 502 });
  const notRevoked = fixture([session, { credential }]); await notRevoked.client.session();
  await assert.rejects(notRevoked.client.revokeAppCredential(orgId, appId, keyId), { status: 502 });
});

test('logout/clearSession invalidates pending key responses and all subsequent resource requests', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const { client, calls } = fixture([session, () => pending]);
  await client.session();
  const issuing = client.issueAppCredential(orgId, appId, 'Backend');
  client.clearSession();
  resolve(json({ credential, apiKey }));
  await assert.rejects(issuing, { status: 401, code: 'session_changed' });
  await assert.rejects(client.appCredentials(orgId, appId), { status: 401 });
  await assert.rejects(client.campaigns(orgId), { status: 401 });
  assert.equal(calls.length, 2);
});

test('unauthenticated or failed session refresh cannot leave resource authority behind', async () => {
  for (const response of [{ authenticated: false }, () => json({ error: 'busy' }, 503)]) {
    const { client, calls } = fixture([session, response]);
    await client.session(); await client.session().catch(() => {});
    await assert.rejects(client.issueAppCredential(orgId, appId, 'Backend'), { status: 401 });
    await assert.rejects(client.campaigns(orgId), { status: 401 });
    assert.equal(calls.length, 2);
  }
});

test('a stale session response cannot restore authority after logout', async () => {
  let resolve;
  const { client } = fixture([() => new Promise(done => { resolve = done; })]);
  const loading = client.session(); client.clearSession(); resolve(json(session));
  await assert.rejects(loading, { status: 401, code: 'session_changed' });
  await assert.rejects(client.campaigns(orgId), { status: 401 });
});

test('401 expires authority; CSRF/rate-limit failures do not retry or expose raw diagnostics', async () => {
  const { client, calls } = fixture([session, () => json({ error: { code: 'csrf_invalid', message: apiKey } }, 403), () => json({ error: 'credential_not_active' }, 409), () => json({ error: 'authentication_required' }, 401)]);
  await client.session();
  await assert.rejects(client.issueAppCredential(orgId, appId, 'Backend'), error => error instanceof AccountApiError && /Refresh account/.test(error.message) && !error.message.includes(apiKey));
  await assert.rejects(client.rotateAppCredential(orgId, appId, keyId, 'Backend'), /revoked or expired/);
  await assert.rejects(client.appCredentials(orgId, appId), { status: 401 });
  await assert.rejects(client.campaigns(orgId), { status: 401 });
  assert.equal(calls.length, 4);
});

test('resource URL segments are encoded; IDs cannot inject routes or queries', async () => {
  const weird = 'org/foreign?owner=other';
  const { client, calls } = fixture([session, { campaigns: [] }, { credentials: [] }]);
  await client.session(); await client.campaigns(weird); await client.appCredentials(weird, 'app/other?key=x');
  assert.equal(calls[1].url, `/api/accounts/organizations/${encodeURIComponent(weird)}/campaigns`);
  assert.equal(calls[2].url, `/api/accounts/organizations/${encodeURIComponent(weird)}/apps/app%2Fother%3Fkey%3Dx/credentials`);
});

test('campaign validation handles exact frozen bounds, distinctness, private content and UTF-16 lengths', () => {
  assert.deepEqual(campaignPayload(input), input);
  assert.equal(campaignPayload({ ...input, settlementNetwork: 'tempo-testnet' }).settlementNetwork, 'tempo-testnet');
  for (const patch of [
    { name: '' }, { name: 'x'.repeat(121) }, { productDescription: 'x'.repeat(1201) }, { approvedText: 'x'.repeat(801) },
    { approvedText: 'line\nbreak' }, { productDescription: 'a'.repeat(1200), approvedText: 'b'.repeat(800), contextHints: ['c'.repeat(400), 'd'] },
    { contextHints: ['x'.repeat(401)] }, { contextHints: ['same', ' same '] }, { contextHints: Array.from({ length: 7 }, (_, i) => String(i)) },
    { declaredCapabilities: ['invented'] }, { declaredCapabilities: ['solana', 'solana'] }, { declaredCapabilities: campaignCapabilities.slice(0, 13) },
    { maxBidBaseUnits: '0' }, { maxBidBaseUnits: '01' }, { maxBidBaseUnits: '1e3' }, { maxBidBaseUnits: '0.004' }, { maxBidBaseUnits: 3000 },
    { maxBidBaseUnits: '4001' }, { budgetCapBaseUnits: '100001' }, { budgetCapBaseUnits: '3999' }, { settlementNetwork: 'mainnet' },
    { approvedText: 'Contact private@example.test' }, { approvedText: '-----BEGIN EC PRIVATE KEY' },
    { productDescription: '😀'.repeat(601) },
  ]) assert.throws(() => campaignPayload({ ...input, ...patch }), JSON.stringify(patch));
  assert.doesNotThrow(() => campaignPayload({ ...input, productDescription: 'a'.repeat(1200), approvedText: 'b'.repeat(800), contextHints: ['c'.repeat(400)] }));
});

test('form extraction emits frozen campaign input only and validates credential labels', () => {
  const data = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (key === 'contextHints') data.set(key, value.join('\n'));
    else if (Array.isArray(value)) value.forEach(entry => data.append(key, entry));
    else data.set(key, value);
  }
  data.set('ownerId', 'forged'); data.set('version', '99');
  assert.deepEqual(campaignFormInput(data), input);
  assert.equal(credentialLabel(' Backend '), 'Backend');
  for (const label of ['', 'x'.repeat(121), 'label\nvalue']) assert.throws(() => credentialLabel(label));
});

test('metadata distinguishes active, expired and irreversibly revoked keys', () => {
  assert.equal(credentialStatus(credential, 2), 'Active');
  assert.equal(credentialStatus(credential, credential.expiresAt), 'Expired');
  assert.equal(credentialStatus({ ...credential, revokedAt: 2 }, 3), 'Revoked');
  assert.equal(credentialStatus({ ...credential, revokedAt: 2 }, credential.expiresAt + 1), 'Revoked');
});

test('server examples use current origin/account SDK, authenticated fetch and no actual secret or serving promise', () => {
  for (const origin of ['https://preview.example.test', 'http://127.0.0.1:3495']) {
    assert.equal(accountSDKBaseURL(origin), `${origin}/api/accounts/sdk`);
    const example = accountSDKExample(origin);
    assert.ok(example.includes(`${origin}/api/accounts/sdk`));
    assert.ok(example.includes("process.env.AXP_PUBLISHER_API_KEY"));
    assert.ok(example.includes("'x-axp-publisher-key': apiKey"));
    assert.ok(example.includes('new AXPPublisher({ apiKey, baseURL })'));
    assert.ok(example.includes('Account serving is not connected on this server.'));
    assert.ok(example.includes('config.financialMode'));
    assert.ok(example.includes('config.servingEnabled'));
    assert.ok(example.includes('app-specific readiness may still be blocked.') === false);
    assert.ok(!example.includes(apiKey)); assert.ok(!example.includes('/api/product'));
    assert.ok(!example.includes('console.')); assert.ok(!example.includes('NEXT_PUBLIC_AXP'));
  }
});

test('console source keeps the one-time secret in component memory with action/navigation and stale-response guards', () => {
  // Source contract checks supplement transport tests; browser interaction acceptance is separate.
  const source = readFileSync(new URL('../apps/product-ui/src/components/accounts/AccountConsole.tsx', import.meta.url), 'utf8');
  const resources = readFileSync(new URL('../apps/product-ui/src/components/accounts/newResourceForms.tsx', import.meta.url), 'utf8');
  assert.match(source, /const \[issuedKey, setIssuedKey\] = useState/);
  assert.match(source, /clearResourceSecret\(\);\s*if \(lock.current\) return/);
  assert.match(source, /epoch !== secretEpoch.current/);
  assert.match(source, /!mounted.current \|\| epoch/);
  for (const event of ['popstate', 'hashchange', 'pagehide', 'beforeunload']) assert.ok(source.includes(`addEventListener('${event}'`));
  assert.ok(source.includes("closest('button, a, summary')"));
  assert.ok(source.includes('onSubmitCapture={clearResourceSecret} onChangeCapture={clearResourceSecret}'));
  assert.ok(source.includes('issuedKey?.organizationId === details.organization.id && issuedKey.appId === selectedApp.id'));
  assert.ok(resources.includes('Unsaved changes: save a new draft version before approving.'));
  assert.ok(resources.includes('client.approveCampaign(organizationId, selected.id, selected.version)'));
  assert.ok(resources.includes("failure.code === 'campaign_version_conflict'"));
  assert.ok(!resources.includes('client.campaign(organizationId, selected.id)'));
  assert.ok(resources.includes('Serving: not connected'));
  assert.ok(resources.includes('credential.scopes.join'));
  for (const code of [source, resources]) assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|console\.(log|debug|info)|navigator\.clipboard|URLSearchParams/);
});
