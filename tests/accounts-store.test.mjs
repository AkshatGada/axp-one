import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, rmSync, statSync, chmodSync, symlinkSync, linkSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createAccountsAPI} from '../packages/accounts/api.mjs';

const START = 1_800_000_000_000, DAY = 86_400_000;
const ALICE = {id: 'provider-alice', email: 'same@example.test'};
const BOB = {id: 'provider-bob', email: 'same@example.test'};
const appInput = (overrides = {}) => ({name: 'My AI app', website: 'https://app.example.test',
  allowedOrigins: ['https://app.example.test'], blockedCategories: ['gambling'], payout: null, ...overrides});
const advertiserInput = (overrides = {}) => ({name: 'My business', website: 'https://business.example.test', description: 'Independent business', ...overrides});
const sessionInput = (overrides = {}) => ({hash: 'a'.repeat(64), userId: ALICE.id,
  accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresAt: START + 60_000,
  absoluteExpiresAt: START + 7 * DAY, csrf: 'fixture-csrf-value', ...overrides});
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'axp-accounts-store-test-'));
  const dir = join(root, 'private');
  let time = START, store = createAccountStore({dir, now: () => time});
  t.after(() => {store.close(); rmSync(root, {recursive: true, force: true});});
  return {root, dir, get store() {return store;}, time(value) {time = value;},
    reopen() {store.close(); store = createAccountStore({dir, now: () => time}); return store;}};
}
function error(fn, code = 'invalid_input', status = 400) {
  assert.throws(fn, e => e.code === code && e.status === status && e.message === code);
}
function ownerPair(f) {
  f.store.ensureUser(ALICE); f.store.ensureUser(BOB);
  return [f.store.createOrganization(ALICE.id, {name: 'Alice org'}), f.store.createOrganization(BOB.id, {name: 'Bob org'})];
}
// Independent encoder over explicit bytes exercises leading-zero decoding;
// does not use the store's BigInt length logic to construct expected results.
function base58(bytes) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {carry += digits[i] * 256; digits[i] = carry % 58; carry = Math.floor(carry / 58);}
    while (carry) {digits.push(carry % 58); carry = Math.floor(carry / 58);}
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  return '1'.repeat(zeros) + digits.reverse().map(n => alphabet[n]).join('');
}

test('frozen synchronous API and one person can own both profiles', t => {
  const f = fixture(t), store = f.store;
  assert.deepEqual(Object.keys(store).sort(), ['ensureUser', 'user', 'updateProfile', 'organizations',
    'createOrganization', 'organization', 'details', 'saveAdvertiser', 'saveApp',
    'putSession', 'session', 'deleteSession', 'close'].sort());
  assert.deepEqual(store.ensureUser(ALICE), {...ALICE, displayName: ''});
  assert.deepEqual(store.updateProfile(ALICE.id, {displayName: 'Alice'}), {...ALICE, displayName: 'Alice'});
  const org = store.createOrganization(ALICE.id, {name: 'Both roles'});
  assert.deepEqual(Object.keys(org).sort(), ['id', 'name', 'role', 'createdAt', 'updatedAt'].sort());
  assert.equal(org.role, 'owner'); assert.equal(org.createdAt, START);
  assert.deepEqual(store.details(ALICE.id, org.id), {organization: org, advertiser: null, apps: []});
  const advertiser = store.saveAdvertiser(ALICE.id, org.id, advertiserInput());
  const app = store.saveApp(ALICE.id, org.id, appInput());
  assert.equal(advertiser.organizationId, org.id); assert.equal(app.organizationId, org.id);
  const saved = store.details(ALICE.id, org.id);
  assert.deepEqual(saved.advertiser, advertiser); assert.deepEqual(saved.apps, [app]);
  assert.deepEqual(store.organizations(ALICE.id), [org]);
  f.time(START + 1000);
  const changed = store.saveAdvertiser(ALICE.id, org.id, advertiserInput({name: 'Changed'}));
  assert.equal(changed.id, advertiser.id); assert.equal(changed.createdAt, START); assert.equal(changed.updatedAt, START + 1000);
  const changedApp = store.saveApp(ALICE.id, org.id, appInput({name: 'Changed app'}), app.id);
  assert.equal(changedApp.id, app.id); assert.equal(changedApp.createdAt, START);
  assert.equal(changedApp.updatedAt, START + 1000);
  saved.apps[0].allowedOrigins.push('https://evil.test');
  assert.deepEqual(store.details(ALICE.id, org.id).apps[0].allowedOrigins, ['https://app.example.test']);
});

test('provider ID, never duplicate email, determines identity and preserves profile', t => {
  const f = fixture(t), [aliceOrg, bobOrg] = ownerPair(f);
  f.store.updateProfile(ALICE.id, {displayName: 'Alice only'});
  assert.equal(f.store.user(BOB.id).displayName, '');
  assert.equal(f.store.ensureUser({...ALICE, email: 'new@example.test'}).displayName, 'Alice only');
  assert.equal(f.store.user(BOB.id).email, BOB.email);
  assert.deepEqual(f.store.organizations(ALICE.id), [aliceOrg]);
  assert.deepEqual(f.store.organizations(BOB.id), [bobOrg]);
  f.store.ensureUser({id: 'third-provider-id', email: 'new@example.test'});
  assert.deepEqual(f.store.organizations('third-provider-id'), []);
  error(() => f.store.user('not-a-verified-user'), 'not_found', 404);
  error(() => f.store.updateProfile('not-a-verified-user', {displayName: 'Injected'}), 'not_found', 404);
  error(() => f.store.createOrganization('not-a-verified-user', {name: 'Injected'}), 'not_found', 404);
});

test('two-user reads/writes and nonexistent/foreign resources all fail closed with 404', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  const advertiser = s.saveAdvertiser(ALICE.id, org.id, advertiserInput());
  const app = s.saveApp(ALICE.id, org.id, appInput());
  for (const orgId of [org.id, 'nonexistent', "' OR 1=1 --"]) {
    for (const fn of [() => s.organization(BOB.id, orgId), () => s.details(BOB.id, orgId),
      () => s.saveAdvertiser(BOB.id, orgId, advertiserInput()), () => s.saveApp(BOB.id, orgId, appInput()),
      () => s.saveApp(BOB.id, orgId, appInput(), app.id),
      () => s.saveAdvertiser(BOB.id, orgId, {malicious: true})]) error(fn, 'not_found', 404);
  }
  assert.deepEqual(s.details(ALICE.id, org.id), {organization: org, advertiser, apps: [app]});
});

test('app ID is bound to its organization even when both organizations have the same owner', t => {
  const f = fixture(t), [org, bobOrg] = ownerPair(f), s = f.store;
  const otherOrg = s.createOrganization(ALICE.id, {name: 'Another Alice org'});
  const app = s.saveApp(ALICE.id, org.id, appInput());
  error(() => s.saveApp(ALICE.id, otherOrg.id, appInput(), app.id), 'not_found', 404);
  error(() => s.saveApp(BOB.id, bobOrg.id, appInput(), app.id), 'not_found', 404);
  error(() => s.saveApp(ALICE.id, org.id, appInput(), 'missing'), 'not_found', 404);
  assert.deepEqual(s.details(ALICE.id, otherOrg.id).apps, []);
  assert.deepEqual(s.details(ALICE.id, org.id).apps, [app]);
});

test('all exact input boundaries reject identity/ownership injection and missing fields', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  for (const key of ['userId', 'ownerId', 'organizationId', 'id', 'role', 'email', 'createdAt', '__proto__']) {
    const extra = {[key]: BOB.id};
    error(() => s.updateProfile(ALICE.id, {displayName: 'No', ...extra}), 'unknown_field');
    error(() => s.createOrganization(ALICE.id, {name: 'No', ...extra}), 'unknown_field');
    error(() => s.saveAdvertiser(ALICE.id, org.id, {...advertiserInput(), ...extra}), 'unknown_field');
    error(() => s.saveApp(ALICE.id, org.id, {...appInput(), ...extra}), 'unknown_field');
  }
  error(() => s.ensureUser({...ALICE, displayName: 'Injected'}), 'unknown_field');
  error(() => s.ensureUser({...ALICE, providerVerified: true}), 'unknown_field');
  error(() => s.putSession({...sessionInput(), email: BOB.email}), 'unknown_field');
  error(() => s.saveApp(ALICE.id, org.id, appInput({payout: {network: 'tempo-testnet', address: '0x' + 'a'.repeat(40), verified: true}})), 'unknown_field');
  error(() => s.saveApp(ALICE.id, org.id, {name: 'Missing fields'}), 'missing_field');
  error(() => s.updateProfile(ALICE.id, {}), 'missing_field');
  error(() => s.ensureUser({email: ALICE.email}), 'missing_field');
  error(() => s.createOrganization(ALICE.id, null));
  error(() => s.updateProfile(ALICE.id, Object.create({displayName: 'Inherited'})));
  const input = {get name() {throw new Error('must not execute');}};
  error(() => s.createOrganization(ALICE.id, input), 'unknown_field');
  assert.deepEqual(s.details(ALICE.id, org.id).apps, []);
});

test('bounded strings, lists and invalid updates leave existing data unchanged', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  const app = s.saveApp(ALICE.id, org.id, appInput());
  for (const input of [appInput({name: 'x'.repeat(121)}), appInput({name: ' '}),
    appInput({name: 123}), appInput({name: 'nul\0name'}),
    appInput({allowedOrigins: Array.from({length: 33}, (_, i) => `https://app${i}.test`)}),
    appInput({blockedCategories: Array.from({length: 33}, (_, i) => `c${i}`)}),
    appInput({blockedCategories: ['x'.repeat(81)]}), appInput({blockedCategories: ['one', 'one']}),
    appInput({blockedCategories: [null]}), appInput({allowedOrigins: 'https://app.test'}),
    appInput({allowedOrigins: ['https://app.test', 'https://app.test/']})]) {
    error(() => s.saveApp(ALICE.id, org.id, input, app.id));
  }
  error(() => s.updateProfile(ALICE.id, {displayName: 'x'.repeat(121)}));
  error(() => s.saveAdvertiser(ALICE.id, org.id, advertiserInput({description: 'x'.repeat(2001)})));
  error(() => s.ensureUser({id: 'x'.repeat(129), email: ALICE.email}));
  error(() => s.ensureUser({id: 'provider-invalid', email: 'invalid-email'}));
  assert.deepEqual(s.details(ALICE.id, org.id).apps, [app]);
  assert.equal(s.saveAdvertiser(ALICE.id, org.id, advertiserInput({name: 'x'.repeat(120), description: 'x'.repeat(2000)})).description.length, 2000);
  assert.equal(s.updateProfile(ALICE.id, {displayName: ''}).displayName, '');
  assert.equal(s.saveApp(ALICE.id, org.id, appInput({allowedOrigins: [], blockedCategories: []}), app.id).allowedOrigins.length, 0);
});

test('URLs allow HTTPS and exact HTTP loopback, origins reject paths/wildcards/credentials', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  for (const url of ['http://localhost:3430/path', 'http://127.0.0.1:3430', 'http://[::1]:3430', 'https://example.test/path?q=1']) {
    assert.equal(s.saveApp(ALICE.id, org.id, appInput({website: url})).website, new URL(url).href);
  }
  for (const url of ['http://example.test', 'http://localhost.evil.test', 'http://127.0.0.2', 'http://[::2]',
    'javascript:alert(1)', 'ftp://example.test', 'https://user:pass@example.test', 'https://*.test',
    'https://app.test\\evil', 'not a url', 'https://example.test/' + 'x'.repeat(2048)]) {
    error(() => s.saveApp(ALICE.id, org.id, appInput({website: url})), url.length > 2048 ? 'invalid_input' : 'invalid_url');
  }
  for (const origin of ['https://example.test/path', 'https://example.test/./', 'https://example.test/%2e',
    'https://example.test?', 'https://example.test#', 'https://example.test/?q=1', 'https://*.test', 'null']) {
    error(() => s.saveApp(ALICE.id, org.id, appInput({allowedOrigins: [origin]})), 'invalid_url');
  }
  assert.deepEqual(s.saveApp(ALICE.id, org.id, appInput({allowedOrigins: ['http://localhost:3000', 'http://[::1]:3000']})).allowedOrigins,
    ['http://localhost:3000', 'http://[::1]:3000']);
});

test('Solana base58 must decode to exactly 32 bytes including leading zero bytes', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  const valid = ['11111111111111111111111111111111', 'So11111111111111111111111111111111111111112',
    base58(Buffer.alloc(32, 255)), base58(Buffer.from([0, 0, ...Array(30).fill(255)])),
    base58(Buffer.from([...Array(31).fill(0), 1]))];
  for (const address of valid) assert.deepEqual(s.saveApp(ALICE.id, org.id,
    appInput({payout: {network: 'solana-devnet', address}})).payout, {network: 'solana-devnet', address});
  // 31/33-byte payloads can have plausible 32..44-character strings: length
  // and alphabet alone are not sufficient validation.
  for (const address of ['1'.repeat(31), '1'.repeat(33), '2'.repeat(32), 'z'.repeat(44),
    base58(Buffer.alloc(31, 255)), base58(Buffer.from([0, ...Array(32).fill(1)])),
    '0'.repeat(32), 'O'.repeat(32), 'I'.repeat(32), 'l'.repeat(32), valid[1] + ' ', '']) {
    assert.throws(() => s.saveApp(ALICE.id, org.id, appInput({payout: {network: 'solana-devnet', address}})),
      e => e.status === 400 && ['invalid_payout', 'invalid_input'].includes(e.code));
  }
});

test('Tempo shape is exactly 0x plus 40 hex characters, without ownership claims', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  for (const address of ['0x' + '0'.repeat(40), '0x' + 'aB'.repeat(20)]) {
    const app = s.saveApp(ALICE.id, org.id, appInput({payout: {network: 'tempo-testnet', address}}));
    assert.deepEqual(app.payout, {network: 'tempo-testnet', address});
    assert.equal(Object.hasOwn(app.payout, 'verified'), false);
  }
  for (const address of ['0X' + 'a'.repeat(40), '0x' + 'a'.repeat(39), '0x' + 'a'.repeat(41), '0x' + 'g'.repeat(40)]) {
    error(() => s.saveApp(ALICE.id, org.id, appInput({payout: {network: 'tempo-testnet', address}})), 'invalid_payout');
  }
  error(() => s.saveApp(ALICE.id, org.id, appInput({payout: {network: 'mainnet', address: '0x' + 'a'.repeat(40)}})), 'invalid_payout');
});

test('session private record matches API spread-refresh and access expiry does not log out', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  const initial = sessionInput();
  assert.equal(s.putSession(initial), undefined);
  assert.deepEqual(s.session(initial.hash), initial);
  f.time(initial.expiresAt);
  assert.deepEqual(s.session(initial.hash), initial, 'expired access token remains refreshable');
  const refreshed = {...s.session(initial.hash), accessToken: 'fixture-new-access', refreshToken: 'fixture-new-refresh', expiresAt: START + DAY};
  s.putSession(refreshed);
  assert.deepEqual(s.session(initial.hash), refreshed);
  const publicRecords = JSON.stringify([s.user(ALICE.id), s.organizations(ALICE.id), s.details(ALICE.id, org.id)]);
  for (const privateValue of [initial.hash, initial.accessToken, initial.refreshToken, initial.csrf, refreshed.accessToken]) assert.equal(publicRecords.includes(privateValue), false);
  error(() => s.putSession({...refreshed, userId: BOB.id}), 'session_binding', 409);
  f.time(START + 2 * DAY);
  error(() => s.putSession({...refreshed, absoluteExpiresAt: START + 8 * DAY}), 'invalid_expiry');
  // Provider access token expiry and local absolute expiry are independent.
  s.putSession({...refreshed, expiresAt: START + 8 * DAY});
  f.time(initial.absoluteExpiresAt - 1); assert.notEqual(s.session(initial.hash), null);
  f.time(initial.absoluteExpiresAt); assert.equal(s.session(initial.hash), null);
  error(() => s.putSession({...refreshed, absoluteExpiresAt: START + 8 * DAY}), 'invalid_expiry');
  s.deleteSession(initial.hash); s.deleteSession(initial.hash);
  assert.equal(s.session(initial.hash), null);
});

test('session expiry/numeric/identity/token validation and already expired access token ingestion', t => {
  const f = fixture(t), s = f.store; s.ensureUser(ALICE);
  for (const overrides of [{expiresAt: NaN}, {expiresAt: Infinity}, {expiresAt: '123'}, {expiresAt: 1.5},
    {expiresAt: 0}, {expiresAt: -1}, {absoluteExpiresAt: START}, {absoluteExpiresAt: START - 1},
    {absoluteExpiresAt: START + 7 * DAY + 1}, {absoluteExpiresAt: Number.MAX_SAFE_INTEGER + 1}]) {
    error(() => s.putSession(sessionInput(overrides)), 'invalid_expiry');
  }
  for (const overrides of [{hash: ''}, {csrf: ''}, {accessToken: ''}, {refreshToken: ''},
    {accessToken: 'x'.repeat(16385)}, {refreshToken: 'has whitespace'}]) error(() => s.putSession(sessionInput(overrides)));
  error(() => s.putSession(sessionInput({userId: 'unknown-provider-id'})), 'not_found', 404);
  s.putSession(sessionInput({expiresAt: START - 1000}));
  assert.equal(s.session('a'.repeat(64)).expiresAt, START - 1000);
  assert.equal(s.session('b'.repeat(64)), null);
});

test('main account API refreshes expired access from the private store without leaking tokens', async t => {
  const f = fixture(t), s = f.store; s.ensureUser(ALICE);
  const cookie = 'f'.repeat(64), hash = createHash('sha256').update(cookie).digest('hex');
  s.putSession(sessionInput({hash, expiresAt: START - 1}));
  let refreshCalls = 0;
  const provider = {
    async refresh(token) {
      assert.equal(token, 'fixture-refresh'); refreshCalls++;
      return {user: {...ALICE, email: 'verified-new@example.test'}, accessToken: 'fixture-api-access',
        refreshToken: 'fixture-api-refresh', expiresAt: START + DAY};
    },
  };
  const api = createAccountsAPI({store: s, provider, origin: 'http://localhost:3430', now: () => START});
  const response = {writeHead(status, headers) {this.status = status; this.headers = headers;}, end(body) {this.body = body;}};
  await api.handler({url: '/api/accounts/session', method: 'GET', headers: {cookie: `axp_session=${cookie}`}}, response);
  assert.equal(response.status, 200); assert.equal(refreshCalls, 1);
  assert.equal(JSON.parse(response.body).authenticated, true);
  assert.equal(JSON.parse(response.body).user.email, 'verified-new@example.test');
  assert.deepEqual(s.session(hash), sessionInput({hash, accessToken: 'fixture-api-access', refreshToken: 'fixture-api-refresh', expiresAt: START + DAY}));
  for (const value of ['fixture-api-access', 'fixture-api-refresh', hash, 'accessToken', 'refreshToken']) assert.equal(response.body.includes(value), false);
  // Provider identity mismatches cannot attach another person to this cookie.
  f.time(START + DAY);
  const wrongAPI = createAccountsAPI({store: s, provider: {async refresh() {return {user: BOB};}},
    origin: 'http://localhost:3430', now: () => START + DAY});
  await wrongAPI.handler({url: '/api/accounts/session', method: 'GET', headers: {cookie: `axp_session=${cookie}`}}, response);
  assert.equal(response.status, 401); assert.equal(s.session(hash), null);
});

test('organization, app and active-session quotas are transactional and update-safe', t => {
  const f = fixture(t), s = f.store; s.ensureUser(ALICE);
  const org = s.createOrganization(ALICE.id, {name: 'First'});
  for (let i = 1; i < 20; i++) s.createOrganization(ALICE.id, {name: `Org ${i}`});
  error(() => s.createOrganization(ALICE.id, {name: 'Overflow'}), 'limit_exceeded', 409);
  const first = s.saveApp(ALICE.id, org.id, appInput());
  for (let i = 1; i < 50; i++) s.saveApp(ALICE.id, org.id, appInput({name: `App ${i}`}));
  error(() => s.saveApp(ALICE.id, org.id, appInput()), 'limit_exceeded', 409);
  assert.equal(s.saveApp(ALICE.id, org.id, appInput({name: 'Update at cap'}), first.id).name, 'Update at cap');
  for (let i = 0; i < 20; i++) s.putSession(sessionInput({hash: i.toString(16).padStart(64, '0')}));
  error(() => s.putSession(sessionInput()), 'limit_exceeded', 409);
  s.putSession(sessionInput({hash: '0'.repeat(64), accessToken: 'fixture-updated-at-cap'}));
  // Access-expired sessions must still count toward the live-session cap.
  f.time(START + DAY);
  error(() => s.putSession(sessionInput()), 'limit_exceeded', 409);
  s.deleteSession('0'.repeat(64)); s.putSession(sessionInput());
  f.time(START + 7 * DAY);
  s.putSession(sessionInput({hash: 'f'.repeat(64), expiresAt: START + 8 * DAY, absoluteExpiresAt: START + 8 * DAY}));
  assert.notEqual(s.session('f'.repeat(64)), null);
  assert.equal(s.organizations(ALICE.id).length, 20); assert.equal(s.details(ALICE.id, org.id).apps.length, 50);
});

test('private permissions, single SQLite snapshot and persistence across close/restart', t => {
  const f = fixture(t), [org] = ownerPair(f), s = f.store;
  const app = s.saveApp(ALICE.id, org.id, appInput());
  const advertiser = s.saveAdvertiser(ALICE.id, org.id, advertiserInput());
  s.updateProfile(ALICE.id, {displayName: 'Persistent Alice'}); s.putSession(sessionInput());
  assert.equal(statSync(f.dir).mode & 0o777, 0o700);
  for (const file of readdirSync(f.dir)) assert.equal(statSync(join(f.dir, file)).mode & 0o777, 0o600);
  s.close(); s.close(); error(() => s.user(ALICE.id), 'store_closed', 503);
  assert.deepEqual(readdirSync(f.dir), ['accounts.sqlite']);
  chmodSync(f.dir, 0o755); chmodSync(join(f.dir, 'accounts.sqlite'), 0o644);
  const reopened = f.reopen();
  assert.equal(statSync(f.dir).mode & 0o777, 0o700); assert.equal(statSync(join(f.dir, 'accounts.sqlite')).mode & 0o777, 0o600);
  assert.deepEqual(reopened.details(ALICE.id, org.id), {organization: org, advertiser, apps: [app]});
  assert.equal(reopened.user(ALICE.id).displayName, 'Persistent Alice');
  assert.deepEqual(reopened.session(sessionInput().hash), sessionInput());
  reopened.close();
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import {createAccountStore} from ${JSON.stringify(new URL('../packages/accounts/store.mjs', import.meta.url).href)};
    const store=createAccountStore({dir:process.argv[1],now:()=>${START}});
    const user=store.user(${JSON.stringify(ALICE.id)});
    if(user.displayName!=='Persistent Alice'||store.organizations(user.id).length!==1||!store.session('a'.repeat(64)))process.exitCode=1;
    store.close();`, f.dir], {encoding: 'utf8'});
  assert.equal(result.status, 0, 'fresh process reopens profile/session state'); assert.equal(result.stdout, '');
  const db = new DatabaseSync(join(f.dir, 'accounts.sqlite'), {readOnly: true});
  try {assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');} finally {db.close();}
});

test('unsafe symlink/hardlink SQLite paths are rejected without changing target', t => {
  const f = fixture(t), path = join(f.dir, 'accounts.sqlite'); f.store.close();
  const bytes = readFileSync(path), symlinkDir = join(f.root, 'symlink-dir');
  symlinkSync(f.dir, symlinkDir);
  error(() => createAccountStore({dir: symlinkDir}), 'unsafe_storage', 500);
  const other = join(f.root, 'other');
  // Use an actual empty private store directory as a task-owned link fixture.
  const tempStore = createAccountStore({dir: other}); tempStore.close();
  rmSync(join(other, 'accounts.sqlite'));
  symlinkSync(path, join(other, 'accounts.sqlite'));
  error(() => createAccountStore({dir: other}), 'store_unavailable', 503);
  rmSync(join(other, 'accounts.sqlite')); linkSync(path, join(other, 'accounts.sqlite'));
  error(() => createAccountStore({dir: other}), 'unsafe_storage', 500);
  assert.deepEqual(readFileSync(path), bytes);
});
