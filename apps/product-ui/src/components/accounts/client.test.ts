import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccountApiError, AccountsClient, isConfigured } from './client.ts';
import { categories, consumeConfirmationLink, lines, origins, validateWebsite } from './forms.ts';

const capabilities = { profiles: true, campaignServing: false, nativeFunding: false, appCredentials: false };
const user = { id: 'user-a', email: 'fixture@example.test', displayName: '' };
const organization = { id: 'org-a', name: 'Fixture organization', role: 'owner' as const, createdAt: 1, updatedAt: 1 };
const session = { authenticated: true, csrf: 'fixture-csrf', user, organizations: [organization], capabilities };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function fixture(responses: Response[]) {
  const calls: { url: string; options: RequestInit }[] = [];
  const transport: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options: options ?? {} });
    const response = responses.shift();
    assert.ok(response, 'unexpected request');
    return response;
  };
  return { client: new AccountsClient(transport), calls };
}

test('reads are same-origin, cookie-only and no-store', async () => {
  const { client, calls } = fixture([json({ enabled: true, provider: 'supabase', configured: { origin: true, provider: true, store: true }, capabilities }), json(session)]);
  assert.equal(isConfigured(await client.health()), true);
  assert.equal((await client.session()).authenticated, true);
  for (const { url, options } of calls) {
    assert.ok(url.startsWith('/api/accounts/'));
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.equal(new Headers(options.headers).has('authorization'), false);
    assert.equal(new Headers(options.headers).has('x-axp-csrf'), false);
    assert.equal(options.body, undefined);
  }
});

test('concurrent owner and finance reads are ordered through body consumption', async () => {
  const calls: string[] = [];
  let release!: (value: unknown) => void;
  const client = new AccountsClient(async url => {
    calls.push(String(url));
    if (calls.length === 1) return json(session);
    if (calls.length === 2) return { ok: true, json: () => new Promise(resolve => { release = resolve; }) } as Response;
    return json({ wallet: null });
  });
  await client.session();
  const first = client.organization('org-a');
  const second = client.financeRequest('/organizations/org-a/apps/app-a/wallet');
  await Promise.resolve();
  assert.equal(calls.length, 2);
  release({ organization, advertiser: null, apps: [] });
  await Promise.all([first, second]);
  assert.deepEqual(calls.slice(1), ['/api/accounts/organizations/org-a', '/api/accounts/organizations/org-a/apps/app-a/wallet']);
});

test('a rejected request releases the queue without retrying the mutation', async () => {
  const { client, calls } = fixture([json(session), json({ error: 'product_busy_retry' }, 429), json({ organization, advertiser: null, apps: [] })]);
  await client.session();
  const write = client.profile('Name');
  const read = client.organization('org-a');
  await assert.rejects(write, { status: 429 });
  await read;
  assert.equal(calls.length, 3);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
});

test('a transport failure releases queued reads without a replacement send', async () => {
  let count = 0;
  const client = new AccountsClient(async () => {
    if (++count === 1) return json(session);
    if (count === 2) throw new Error('fixture connection lost');
    return json({ organization, advertiser: null, apps: [] });
  });
  await client.session();
  const failed = client.profile('Name');
  const read = client.organization('org-a');
  await assert.rejects(failed, { code: 'connection_failed' });
  await read;
  assert.equal(count, 3);
});

test('session changes discard in-flight and queued owner requests before another send', async () => {
  let release!: (response: Response) => void;
  let count = 0;
  const client = new AccountsClient(async () => ++count === 1 ? json(session) : new Promise(resolve => { release = resolve; }));
  await client.session();
  const reading = client.organization('org-a');
  const writing = client.profile('Name');
  const results = Promise.allSettled([reading, writing]);
  client.clearSession();
  release(json({ organization, advertiser: null, apps: [] }));
  for (const result of await results) {
    assert.equal(result.status, 'rejected');
    if (result.status === 'rejected') assert.equal(result.reason.code, 'session_changed');
  }
  assert.equal(count, 2);
});

test('signout fences queued owner actions immediately and uses its captured CSRF', async () => {
  let release!: (response: Response) => void;
  const calls: RequestInit[] = [];
  const client = new AccountsClient(async (_url, options) => {
    calls.push(options!);
    return calls.length === 1 ? json(session) : new Promise(resolve => { release = resolve; });
  });
  await client.session();
  const signingOut = client.signout();
  await assert.rejects(client.profile('Name'), { code: 'session_required' });
  assert.equal(new Headers(calls[1].headers).get('x-axp-csrf'), session.csrf);
  release(json({ signedOut: true }));
  await signingOut;
  assert.equal(calls.length, 2);
});

test('accepts explicit health flags and keeps unconfigured health unavailable', async () => {
  const { client } = fixture([json({ enabled: false, provider: 'supabase', configured: { origin: true, provider: false, store: false }, capabilities })]);
  const health = await client.health();
  assert.equal(health.enabled, false);
  assert.equal(isConfigured(health), false);
});

test('authenticated writes fail closed before a session GET', async () => {
  const { client, calls } = fixture([]);
  await assert.rejects(client.profile('Name'), { status: 401 });
  await assert.rejects(client.createOrganization('Example'), { status: 401 });
  assert.equal(calls.length, 0);
});

test('profile, organization and app writes use only the session CSRF and exact DTOs', async () => {
  const appInput = { name: 'Example', website: 'https://example.test', allowedOrigins: ['https://example.test'], blockedCategories: ['gambling'], payout: null };
  const { client, calls } = fixture([json(session), json({ user: { ...user, displayName: 'A' } }),
    json({ organization }), json({ organization, advertiser: null, apps: [] }),
    json({ advertiser: {} }), json({ app: {} }), json({ app: {} })]);
  await client.session();
  await client.profile('A');
  await client.createOrganization('Example');
  await client.organization('org-a');
  await client.advertiser('org-a', { name: 'Business', website: 'https://example.test', description: '' });
  await client.app('org-a', appInput);
  await client.app('org-a', appInput, 'app-a');
  assert.deepEqual(calls.map(call => call.url), [
    '/api/accounts/session', '/api/accounts/profile', '/api/accounts/organizations',
    '/api/accounts/organizations/org-a', '/api/accounts/organizations/org-a/advertiser',
    '/api/accounts/organizations/org-a/apps', '/api/accounts/organizations/org-a/apps/app-a',
  ]);
  for (const { options } of calls.filter(call => call.options.method === 'POST')) {
    const headers = new Headers(options.headers);
    assert.equal(headers.get('x-axp-csrf'), 'fixture-csrf');
    assert.equal(headers.get('content-type'), 'application/json');
    const body = JSON.parse(String(options.body));
    assert.equal('userId' in body, false);
    assert.equal('organizationId' in body, false);
  }
  assert.deepEqual(JSON.parse(String(calls.at(-1)!.options.body)), appInput);
});

test('signup never creates local authentication; signin alone never supplies write authority', async () => {
  const { client, calls } = fixture([json({ confirmationRequired: true }), json({ signedIn: true })]);
  const input = { email: 'fixture@example.test', password: 'fixture-password' };
  await client.signup(input);
  await client.signin(input);
  await assert.rejects(client.profile('Name'), { status: 401 });
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), input);
  assert.equal(new Headers(calls[1].options.headers).has('x-axp-csrf'), false);
});

test('confirmation is a single explicit call with tokenHash only', async () => {
  const { client, calls } = fixture([json({ signedIn: true })]);
  const token = 'a'.repeat(56);
  assert.equal(calls.length, 0);
  await client.confirm(token);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/accounts/auth/confirm');
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), { tokenHash: token });
});

test('signout invalidates the in-memory CSRF capability', async () => {
  const { client, calls } = fixture([json(session), json({ signedOut: true })]);
  await client.session();
  await client.signout();
  assert.equal(new Headers(calls[1].options.headers).get('x-axp-csrf'), 'fixture-csrf');
  assert.deepEqual(JSON.parse(String(calls[1].options.body)), {});
  await assert.rejects(client.profile('Name'), { status: 401 });
  assert.equal(calls.length, 2);
});

test('401 and unauthenticated session responses discard previous CSRF', async () => {
  const { client, calls } = fixture([json(session), json({ error: 'authentication_required' }, 401), json({ authenticated: false })]);
  await client.session();
  await assert.rejects(client.profile('Name'), { status: 401 });
  await assert.rejects(client.profile('Name'), { status: 401 });
  await client.session();
  await assert.rejects(client.profile('Name'), { status: 401 });
  assert.equal(calls.length, 3);
});

test('a failed session refresh cannot retain stale write authority', async () => {
  const { client, calls } = fixture([json(session), json({ error: 'busy' }, 503)]);
  await client.session();
  await assert.rejects(client.session(), { status: 503 });
  await assert.rejects(client.profile('Name'), { status: 401 });
  assert.equal(calls.length, 2);
});

test('CSRF errors and rate limits do not retry an unsafe request', async () => {
  const { client, calls } = fixture([json(session), json({ error: 'csrf_invalid' }, 403), json({ error: 'auth_rate_limited' }, 429)]);
  await client.session();
  await assert.rejects(client.profile('Name'), /Refresh account/);
  await assert.rejects(client.signup({ email: 'fixture@example.test', password: 'fixture-password' }), /Wait/);
  assert.equal(calls.length, 3);
});

test('raw diagnostics and connection errors are not exposed to the UI', async () => {
  const { client } = fixture([json({ error: { code: 'unknown', message: 'SECRET_RAW_DIAGNOSTIC' } }, 500)]);
  await assert.rejects(client.health(), error => error instanceof AccountApiError && !error.message.includes('SECRET'));
  const failed = new AccountsClient(async () => { throw new Error('SECRET_NETWORK_DETAIL'); });
  await assert.rejects(failed.health(), error => error instanceof AccountApiError && !error.message.includes('SECRET'));
});

test('malformed health, session and auth success fail closed', async () => {
  for (const data of [{}, { enabled: true, configured: true, provider: 'unknown', capabilities },
    { enabled: true, configured: true, provider: 'supabase', capabilities },
    { enabled: true, configured: {}, provider: 'supabase', capabilities }]) {
    await assert.rejects(fixture([json(data)]).client.health(), { status: 502 });
  }
  for (const data of [{}, { ...session, csrf: '' }, { ...session, user: { id: 'a' } }, { ...session, organizations: [{ ...organization, role: 'member' }] }]) {
    const { client, calls } = fixture([json(data)]);
    await assert.rejects(client.session(), { status: 502 });
    await assert.rejects(client.profile('Name'), { status: 401 });
    assert.equal(calls.length, 1);
  }
  await assert.rejects(fixture([json({})]).client.signin({ email: 'fixture@example.test', password: 'fixture-password' }), { status: 502 });
  await assert.rejects(fixture([json({})]).client.signup({ email: 'fixture@example.test', password: 'fixture-password' }), { status: 502 });
  await assert.rejects(fixture([json({})]).client.confirm('a'.repeat(56)), { status: 502 });
});

test('confirmation-link consumption scrubs all URL credentials without posting', () => {
  const replaced: string[] = [];
  const token = 'a'.repeat(56);
  const result = consumeConfirmationLink(`https://example.test/account/?token_hash=${token}&type=email&other=private#refresh_token=private`, value => replaced.push(value));
  assert.deepEqual(result, { tokenHash: token, invalid: false });
  assert.deepEqual(replaced, ['/account/']);
});

test('unsupported, expired-error, duplicate and fragment-token links are scrubbed and rejected', () => {
  for (const suffix of ['?token_hash=short&type=email', `?token_hash=${'a'.repeat(56)}&type=recovery`,
    `?token_hash=${'a'.repeat(56)}&token_hash=${'b'.repeat(56)}&type=email`, '?error=expired',
    '#access_token=private&refresh_token=private', '?code=private']) {
    const replaced: string[] = [];
    assert.deepEqual(consumeConfirmationLink(`https://example.test/account/${suffix}`, url => replaced.push(url)), { tokenHash: null, invalid: true });
    assert.deepEqual(replaced, ['/account/']);
  }
});

test('ordinary navigation is not rewritten', () => {
  assert.deepEqual(consumeConfirmationLink('https://example.test/account/#main', () => assert.fail()), { tokenHash: null, invalid: false });
});

test('HTTPS and loopback app-development websites are accepted', () => {
  for (const url of ['https://example.test/app', 'http://localhost:3000/', 'http://127.0.0.1:3000/app', 'http://[::1]:3000/']) assert.equal(validateWebsite(url), url);
  for (const url of ['http://example.test', 'javascript:alert(1)', 'https://user:password@example.test', 'https://*.example.test', 'https://example.test/has space', 'https:\\example.test']) {
    assert.throws(() => validateWebsite(url));
  }
});

test('origin lists reject paths, wildcards and normalized path tricks', () => {
  assert.deepEqual(origins('https://example.test/\nhttp://localhost:3000\nhttps://example.test'), ['https://example.test', 'http://localhost:3000']);
  for (const value of ['https://example.test/path', 'https://*.example.test', 'https://example.test/?',
    'https://example.test/#', 'https://example.test/./', 'https://example.test/%2e/', 'https://example.test?x=1']) assert.throws(() => origins(value));
  assert.throws(() => origins(Array.from({ length: 33 }, (_, index) => `https://host${index}.test`).join('\n')), /32/);
});

test('declaration categories are bounded and lists trim/deduplicate', () => {
  assert.deepEqual(lines(' gambling\r\n\n gambling \n alcohol '), ['gambling', 'alcohol']);
  assert.deepEqual(categories('gambling\nalcohol'), ['gambling', 'alcohol']);
  assert.throws(() => categories('x'.repeat(81)), /80/);
  assert.throws(() => categories('unsafe\u0000value'));
});
