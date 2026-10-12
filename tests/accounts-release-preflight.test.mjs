import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAccountsReleaseConfig, runAccountsReleasePreflight, EXPECTED_ACCOUNT_PROJECT,
  ACCOUNT_HEALTH_PATH} from '../packages/accounts/release-preflight.mjs';
import {main} from '../scripts/accounts/release-preflight.mjs';
import {createAccountsAPI} from '../packages/accounts/api.mjs';

const origin = 'https://accounts-isolated.example.test';
const secret = 'private_sentinel_do_not_output_123456';
const goodConfig = () => ({
  VERCEL: '1', VERCEL_ENV: 'preview', AXP_ACCOUNTS_ENABLED: '1',
  AXP_ACCOUNTS_ORIGIN: origin, AXP_ACCOUNTS_PROFILE_STORE: 'supabase',
  AXP_SUPABASE_URL: `https://${EXPECTED_ACCOUNT_PROJECT}.supabase.co`,
  AXP_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${secret}`,
  AXP_NETWORK_SUPABASE_SECRET_KEY: `sb_secret_${secret}`,
  AXP_ACCOUNT_SERVING_ENABLED: '1', AXP_ACCOUNT_PAYMENTS_ENABLED: '1',
  AXP_ACCOUNT_FINANCIAL_MODE: 'devnet', AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: '0',
  AXP_RUN_STORE: 'blob', BLOB_READ_WRITE_TOKEN: `vercel_blob_rw_fixture_${secret}`,
  AXP_STATE_KEY: Buffer.alloc(32, 7).toString('base64'), AXP_PRODUCT_ENABLED: '0',
});
const goodHealth = () => ({
  enabled: true, provider: 'supabase', profileStore: 'supabase',
  configured: {origin: true, provider: true, store: true},
  capabilities: {profiles: true, campaignDrafts: true, appCredentials: true,
    campaignServing: true, nativeFunding: false, walletBindings: true},
  serving: {ready: true, reason: null, financialMode: 'devnet', walletBindings: true, broadcastEnabled: false},
});
const response = body => ({ok: true, status: 200, redirected: false, json: async () => body});
const inspect = config => checkAccountsReleaseConfig({config, expectedOrigin: origin});
const fails = (report, id) => assert.equal(report.checks.find(item => item.id === id)?.ok, false, id);

test('valid native preview: pure inspection, stable separate namespaces and no mutation', async () => {
  const config = Object.freeze(goodConfig());
  const before = JSON.stringify(config);
  const report = await runAccountsReleasePreflight({config, expectedOrigin: origin,
    fetchImpl: () => assert.fail('offline preflight must not fetch')});
  assert.equal(report.ok, true);
  assert.equal(report.health.status, 'not_requested');
  assert.equal(report.expectedProject, 'qcejmyhaakoedjaqmcub');
  assert.deepEqual(report.workspaces, {sessions: 'axp-accounts-v1', serving: 'axp-account-network-native-v1', kind: 'accounts'});
  assert.equal(JSON.stringify(config), before);
});

for (const [name, patch, id] of [
  ['wrong project', {AXP_SUPABASE_URL: 'https://other.supabase.co'}, 'dedicated_supabase_project'],
  ['project hostname suffix attack', {AXP_SUPABASE_URL: `https://${EXPECTED_ACCOUNT_PROJECT}.supabase.co.evil.test`}, 'dedicated_supabase_project'],
  ['project credentials', {AXP_SUPABASE_URL: `https://${secret}@${EXPECTED_ACCOUNT_PROJECT}.supabase.co`}, 'dedicated_supabase_project'],
  ['wrong exact origin', {AXP_ACCOUNTS_ORIGIN: 'https://other.example.test'}, 'account_origin_exact'],
  ['origin path', {AXP_ACCOUNTS_ORIGIN: `${origin}/account/`}, 'account_origin_exact'],
  ['origin trailing slash', {AXP_ACCOUNTS_ORIGIN: `${origin}/`}, 'account_origin_exact'],
  ['fixture store', {AXP_ACCOUNTS_PROFILE_STORE: 'sqlite-fixture'}, 'supabase_profile_store'],
  ['implicit profile store', {AXP_ACCOUNTS_PROFILE_STORE: undefined}, 'supabase_profile_store'],
  ['accounts disabled', {AXP_ACCOUNTS_ENABLED: '0'}, 'accounts_enabled'],
  ['serving disabled', {AXP_ACCOUNT_SERVING_ENABLED: '0'}, 'account_serving_enabled'],
  ['native payments disabled', {AXP_ACCOUNT_PAYMENTS_ENABLED: '0'}, 'account_payments_configuration'],
  ['invalid financial mode', {AXP_ACCOUNT_FINANCIAL_MODE: secret}, 'account_financial_mode'],
  ['broadcast enabled', {AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: '1'}, 'broadcasts_explicitly_disabled'],
  ['broadcast implicit', {AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: undefined}, 'broadcasts_explicitly_disabled'],
  ['broadcast malformed', {AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: 'false'}, 'broadcasts_explicitly_disabled'],
  ['local runtime', {VERCEL: undefined}, 'hosted_preview'],
  ['production', {VERCEL_ENV: 'production'}, 'hosted_preview'],
  ['shared demo enabled', {AXP_PRODUCT_ENABLED: '1'}, 'shared_demo_disabled'],
  ['browser fixture enabled', {AXP_ACCOUNT_BROWSER_FIXTURE: '1'}, 'browser_fixture_disabled'],
  ['file hosted storage', {AXP_RUN_STORE: 'file'}, 'private_durable_store_configuration'],
  ['unknown store', {AXP_RUN_STORE: secret}, 'private_durable_store_configuration'],
  ['missing durability', {BLOB_READ_WRITE_TOKEN: undefined}, 'private_durable_store_configuration'],
  ['malformed Blob token', {BLOB_READ_WRITE_TOKEN: secret}, 'private_durable_store_configuration'],
  ['Blob endpoint override', {VERCEL_BLOB_API_URL: `https://${secret}.example.test`}, 'private_durable_store_configuration'],
  ['missing encryption', {AXP_STATE_KEY: undefined}, 'state_encryption_key'],
  ['invalid encryption', {AXP_STATE_KEY: secret}, 'state_encryption_key'],
  ['loose base64 encryption', {AXP_STATE_KEY: `${Buffer.alloc(32).toString('base64')}!`}, 'state_encryption_key'],
  ['secret used as publishable key', {AXP_SUPABASE_PUBLISHABLE_KEY: `sb_secret_${secret}`}, 'supabase_publishable_key'],
  ['missing catalogue key', {AXP_NETWORK_SUPABASE_SECRET_KEY: undefined}, 'supabase_catalogue_secret'],
  ...['axp-accounts-v1', 'axp-account-network-v1', 'axp-account-network-native-v1'].map(value =>
    [`demo workspace collision ${value}`, {AXP_PRODUCT_WORKSPACE_ID: value}, 'separate_workspace_identities']),
]) {
  test(`reject ${name} and suppress optional health`, async () => {
    const config = {...goodConfig(), ...patch};
    const report = await runAccountsReleasePreflight({config, expectedOrigin: origin, health: true,
      fetchImpl: () => assert.fail('invalid configuration must not fetch')});
    assert.equal(report.ok, false);
    assert.equal(report.health.status, 'blocked');
    fails(report, id);
    assert.ok(!JSON.stringify(report).includes(secret));
  });
}

for (const value of [undefined, 'https://axp.one', 'https://www.axp.one', `${origin}/`,
  `${origin}/account`, `${origin}?token=${secret}`, `https://${secret}@example.test`,
  'http://example.test', 'https://localhost']) {
  test(`reject unsafe expected origin ${String(value).replaceAll(secret, '[redacted]')}`, async () => {
    const report = await runAccountsReleasePreflight({config: {...goodConfig(), AXP_ACCOUNTS_ORIGIN: value},
      expectedOrigin: value, health: true, fetchImpl: () => assert.fail('unsafe target must not fetch')});
    assert.equal(report.ok, false);
    fails(report, 'expected_origin');
    assert.ok(!JSON.stringify(report).includes(secret));
  });
}

test('synthetic mode uses the other account namespace without claiming finance checks', async () => {
  const config = {...goodConfig(), AXP_ACCOUNT_FINANCIAL_MODE: 'synthetic', AXP_ACCOUNT_PAYMENTS_ENABLED: '0'};
  const body = goodHealth();
  body.serving.financialMode = 'synthetic';
  delete body.serving.walletBindings;
  delete body.capabilities.walletBindings;
  const report = await runAccountsReleasePreflight({config, expectedOrigin: origin, health: true,
    fetchImpl: async () => response(body)});
  assert.equal(report.ok, true);
  assert.equal(report.workspaces.serving, 'axp-account-network-v1');
  assert.equal(report.health.financeSchema, 'not_checked');
});

test('supports existing Upstash aliases and default backend selection', () => {
  for (const patch of [
    {AXP_RUN_STORE: 'upstash', KV_REST_API_URL: 'https://redis.example.test', KV_REST_API_TOKEN: secret},
    {AXP_RUN_STORE: undefined, BLOB_READ_WRITE_TOKEN: undefined, UPSTASH_REDIS_REST_URL: 'https://redis.example.test', UPSTASH_REDIS_REST_TOKEN: secret},
    {AXP_RUN_STORE: undefined},
    {AXP_SUPABASE_URL: `https://${EXPECTED_ACCOUNT_PROJECT}.supabase.co/`},
  ]) assert.equal(inspect({...goodConfig(), ...patch}).ok, true);
  for (const url of ['http://redis.example.test', `https://${secret}@redis.example.test`, `https://redis.example.test/?key=${secret}`]) {
    fails(inspect({...goodConfig(), AXP_RUN_STORE: 'upstash', KV_REST_API_URL: url, KV_REST_API_TOKEN: secret}),
      'private_durable_store_configuration');
  }
  fails(inspect({...goodConfig(), AXP_RUN_STORE: 'upstash'}), 'private_durable_store_configuration');
});

test('health is exactly one unauthenticated GET, with redirect/credential/timeout safeguards', async () => {
  const requests = [];
  const body = {...goodHealth(), secret, reason: secret};
  const report = await runAccountsReleasePreflight({config: goodConfig(), expectedOrigin: origin, health: true,
    fetchImpl: async (url, init) => {requests.push({url, init}); return response(body);}});
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${origin}${ACCOUNT_HEALTH_PATH}`);
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.redirect, 'error');
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(requests[0].init.cache, 'no-store');
  assert.deepEqual(requests[0].init.headers, {accept: 'application/json'});
  assert.ok(requests[0].init.signal instanceof AbortSignal);
  assert.equal(requests[0].init.body, undefined);
  assert.equal(report.ok, true);
  assert.deepEqual(report.health, {status: 'checked', catalogue: 'ready', financeSchema: 'ready', profileSchema: 'not_checked'});
  assert.ok(!JSON.stringify(report).includes(secret));
  const output = JSON.stringify(report);
  for (const field of ['AXP_STATE_KEY', 'BLOB_READ_WRITE_TOKEN', 'AXP_SUPABASE_PUBLISHABLE_KEY', 'AXP_NETWORK_SUPABASE_SECRET_KEY']) {
    assert.ok(!output.includes(goodConfig()[field]), field);
  }
});

test('health projection matches the existing account backend without service or owner actions', async () => {
  let readinessReads = 0;
  const api = createAccountsAPI({origin, enabled: true, provider: {},
    store: {profileStore: 'supabase', resourceRepository: true},
    network: {ready: true, financialBindings: true, financialMode: 'devnet', broadcastEnabled: false,
      readiness: async () => {readinessReads++; return goodHealth().serving;},
      withService: () => assert.fail('health must not construct serving/payment workers')},
  });
  const report = await runAccountsReleasePreflight({config: goodConfig(), expectedOrigin: origin, health: true,
    fetchImpl: async url => {
      let status, body;
      await api.handler({url: new URL(url).pathname, method: 'GET', headers: {}}, {
        writeHead: code => {status = code;}, end: text => {body = text;},
      });
      return new Response(body, {status});
    }});
  assert.equal(report.ok, true);
  assert.equal(readinessReads, 1);
});

test('invalid health request configuration never fetches', async () => {
  for (const timeoutMs of [0, -1, 10001, 1.5, Infinity]) {
    const report = await runAccountsReleasePreflight({config: goodConfig(), expectedOrigin: origin,
      health: true, timeoutMs, fetchImpl: () => assert.fail('invalid timeout must not fetch')});
    assert.equal(report.ok, false);
    fails(report, 'health_request_configuration');
  }
});

for (const [name, change, id] of [
  ['disabled accounts', body => {body.enabled = false;}, 'health_accounts_ready'],
  ['fixture profiles', body => {body.profileStore = 'sqlite-fixture';}, 'health_accounts_ready'],
  ['resource schema unavailable', body => {body.capabilities.appCredentials = false;}, 'health_resources_ready'],
  ['catalogue unavailable', body => {body.serving.ready = false; body.serving.reason = secret;}, 'health_catalogue_ready'],
  ['wrong financial mode', body => {body.serving.financialMode = 'synthetic';}, 'health_financial_mode'],
  ['broadcast enabled', body => {body.serving.broadcastEnabled = true;}, 'health_broadcasts_disabled'],
  ['broadcast absent', body => {delete body.serving.broadcastEnabled;}, 'health_broadcasts_disabled'],
  ['native funding enabled', body => {body.capabilities.nativeFunding = true;}, 'health_broadcasts_disabled'],
  ['finance schema unavailable', body => {body.serving.walletBindings = false;}, 'health_finance_schema_ready'],
]) {
  test(`health rejects ${name} without outputting remote details`, async () => {
    const body = goodHealth(); change(body);
    const report = await runAccountsReleasePreflight({config: goodConfig(), expectedOrigin: origin, health: true,
      fetchImpl: async () => response(body)});
    assert.equal(report.ok, false); fails(report, id);
    assert.ok(!JSON.stringify(report).includes(secret));
  });
}

for (const [name, fetchImpl] of [
  ['network error', async () => {throw Error(secret);}],
  ['timeout', async () => {throw new DOMException(secret, 'TimeoutError');}],
  ['redirect', async () => ({ok: true, status: 200, redirected: true, json: () => assert.fail('no redirect body')} )],
  ['HTTP error', async () => ({ok: false, status: 503, json: () => assert.fail('no error body')})],
  ['malformed JSON', async () => ({ok: true, status: 200, json: async () => {throw Error(secret);}})],
  ['null JSON', async () => response(null)],
]) {
  test(`health fails closed on ${name}`, async () => {
    const report = await runAccountsReleasePreflight({config: goodConfig(), expectedOrigin: origin, health: true, fetchImpl});
    assert.equal(report.ok, false);
    assert.ok(!JSON.stringify(report).includes(secret));
  });
}

test('CLI exit statuses, strict argument redaction and no implicit env/network use', async () => {
  let output = '';
  const write = text => {output += text;};
  const config = goodConfig();
  const before = JSON.stringify(config);
  assert.equal(await main({argv: ['--expected-origin', origin], config, write,
    fetchImpl: () => assert.fail('no health flag')}), 0);
  assert.equal(JSON.parse(output).ok, true);
  for (const argv of [[], ['--unknown', secret], ['--expected-origin', origin, secret]]) {
    output = '';
    assert.equal(await main({argv, config, write, fetchImpl: () => assert.fail('invalid args')}), 1);
    assert.ok(!output.includes(secret));
  }
  output = '';
  assert.equal(await main({argv: ['--expected-origin', origin, '--health'], config, write,
    fetchImpl: async () => response(goodHealth())}), 0);
  assert.equal(JSON.parse(output).health.status, 'checked');
  assert.equal(JSON.stringify(config), before);
});
