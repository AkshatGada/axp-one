import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createFixtureFinancialRepository, createSupabaseFinancialRepository} from '../packages/accounts/financial-repository.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const challenge = (n = 1) => ({kind: 'wallet_challenge', id: id(n), resourceId: id(10), organizationId: id(20), ownerId: id(30),
  purpose: 'funding', origin: 'https://fixture.invalid', network: 'solana-devnet', address: 'fixture-address', message: 'fixture challenge',
  nonce: 'fixture-nonce', createdAt: 100, expiresAt: 1000, consumedAt: null});
const wallet = (purpose = 'funding', resourceId = id(10)) => ({kind: 'wallet_binding', id: id(1), purpose, resourceId,
  organizationId: id(20), ownerId: id(30), address: 'fixture-address', network: 'solana-devnet', verifiedAt: 200});
const channel = (n = 1, campaign = 10, app = 50) => ({kind: 'channel', id: id(n), resourceId: id(campaign), organizationId: id(20), ownerId: id(30),
  counterpartyAppId: id(app), counterpartyOrgId: id(60), counterpartyOwnerId: id(70), campaignVersion: 1, campaignContentHash: 'a'.repeat(64),
  terms: {payer: 'fixture-payer', payee: 'fixture-payee', depositBaseUnits: '1000'}, termsHash: 'b'.repeat(64), createdAt: 100,
  phase: 'frozen', servingEnabled: false, vouchers: []});
const ck = n => `wallet-challenge:${id(n)}`;
const ch = n => `channel:${id(n)}`;
const wk = (purpose = 'funding', resource = id(10)) => `wallet:${purpose}:${resource}`;
const status = (code, expected = 409) => e => e.code === code && e.message === code && e.status === expected;
function local(t) {
  const dir = mkdtempSync(join(tmpdir(), 'axp-financial-repository-'));
  const path = join(dir, 'finance.sqlite');
  const repositories = [];
  const open = () => {const repo = createFixtureFinancialRepository({path, now: () => 500}); repositories.push(repo); return repo;};
  t.after(() => {for (const r of repositories) {try {r.close();} catch {}} rmSync(dir, {recursive: true, force: true});});
  return {path, dir, open, repo: open()};
}
const secretKey = 'sb_secret_fixture_0123456789';
function remote(handler) {
  const calls = [];
  const repo = createSupabaseFinancialRepository({url: 'https://fixture.supabase.co', secretKey, fetchImpl: async (url, options) => {
    calls.push({url, options});
    const result = await handler(JSON.parse(options.body));
    return result instanceof Response ? result : new Response(JSON.stringify(result));
  }});
  return {repo, calls};
}

test('fixture persists JSON privately across instances/restarts; returned values never alias storage', async t => {
  const f = local(t);
  assert.equal(await f.repo.get(ck(1)), null);
  const value = challenge();
  const saved = await f.repo.create(ck(1), value);
  assert.deepEqual(saved, {key: ck(1), revision: 1, value});
  value.address = 'caller change'; saved.value.address = 'returned change';
  assert.equal((await f.open().get(ck(1))).value.address, 'fixture-address');
  const next = await f.repo.cas(ck(1), 1, challenge());
  assert.equal(next.revision, 2);
  assert.equal((await f.open().get(ck(1))).revision, 2);
  assert.equal(statSync(f.path).mode & 0o777, 0o600);
  assert.ok(readFileSync(f.path).subarray(0, 16).toString().startsWith('SQLite format 3'));
});
test('create/missing/stale CAS conflict without overwrite; only one concurrent handle advances revision', async t => {
  const {repo, open} = local(t);
  await repo.create(wk(), wallet());
  await assert.rejects(() => repo.create(wk(), {...wallet(), address: 'other'}), status('financial_conflict'));
  await assert.rejects(() => repo.cas(ck(99), 1, challenge(99)), status('financial_conflict'));
  const outcomes = await Promise.allSettled([repo.cas(wk(), 1, {...wallet(), address: 'first'}), open().cas(wk(), 1, {...wallet(), address: 'second'})]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
  assert.equal((await repo.get(wk())).revision, 2);
});
test('independent processes cannot both CAS the same persisted revision', async t => {
  const {repo, path} = local(t);
  await repo.create(wk(), wallet());
  const module = new URL('../packages/accounts/financial-repository.mjs', import.meta.url).href;
  const code = `import {createFixtureFinancialRepository} from ${JSON.stringify(module)};
    const r=createFixtureFinancialRepository({path:process.argv[1]});
    try {await r.cas(process.argv[2],1,JSON.parse(process.argv[3]));console.log('saved');}
    catch(e){console.log(e.code+':'+e.status);}finally{r.close();}`;
  const run = n => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['--input-type=module', '-e', code, path, wk(), JSON.stringify({...wallet(), address: `process-${n}`})]);
    let out = '', err = ''; p.stdout.on('data', d => {out += d;}); p.stderr.on('data', d => {err += d;});
    p.on('error', reject); p.on('exit', code => code === 0 ? resolve(out.trim()) : reject(Error(err)));
  });
  assert.deepEqual((await Promise.all([run(1), run(2)])).sort(), ['financial_conflict:409', 'saved']);
});
test('channel CAS freezes terms, identity, payee and all non-state fields but allows explicit serving opt-in', async t => {
  const {repo} = local(t); const original = channel();
  await repo.create(ch(1), original);
  for (const [field, changed] of Object.entries({organizationId: id(21), ownerId: id(31), resourceId: id(11), counterpartyAppId: id(51),
    counterpartyOrgId: id(61), counterpartyOwnerId: id(71), id: id(2), campaignVersion: 2, campaignContentHash: 'c'.repeat(64),
    terms: {...original.terms, payee: 'redirect'}, termsHash: 'c'.repeat(64), createdAt: 101, payerAddress: 'added address'})) {
    await assert.rejects(() => repo.cas(ch(1), 1, {...original, [field]: changed}), status('financial_conflict'), field);
  }
  const updated = await repo.cas(ch(1), 1, {...original, phase: 'funded', protocolChannelId: 'pinned-native-channel', servingEnabled: true,
    authorizedBaseUnits: '5', paidBaseUnits: '0', refundBaseUnits: '0', feeAndRentLamports: '10', open: {status: 'finalized'}, close: null,
    pendingVoucher: null, vouchers: [{privateSignature: 'fixture-only'}]});
  assert.equal(updated.revision, 2); assert.equal(updated.value.servingEnabled, true);
  assert.equal((await repo.cas(ch(1), 2, {...updated.value, servingEnabled: false})).value.servingEnabled, false);
});
test('wallet addresses can rotate; immutable account bindings cannot', async t => {
  const {repo} = local(t); await repo.create(wk(), wallet());
  for (const field of ['organizationId', 'ownerId', 'resourceId']) {
    const candidate = {...wallet(), [field]: id(99)};
    await assert.rejects(() => repo.cas(wk(), 1, candidate), e => [400, 409].includes(e.status));
  }
  const next = await repo.cas(wk(), 1, {...wallet(), id: id(2), address: 'new verified address', verifiedAt: 600});
  assert.equal(next.value.address, 'new verified address');
});
test('challenge CAS freezes all challenge bytes; consumption is one-way and proof binding must match', async t => {
  const {repo} = local(t); const value = challenge(); await repo.create(ck(1), value);
  for (const [field, changed] of Object.entries({origin: 'https://evil.invalid', network: 'tempo-testnet', address: 'redirect', message: 'rewrite',
    id: id(2), nonce: 'new nonce', createdAt: 101, expiresAt: 2000, purpose: 'payout', proofHash: 'a'.repeat(64)}))
    await assert.rejects(() => repo.cas(ck(1), 1, {...value, [field]: changed}), status('financial_conflict'), field);
  const consumed = {...value, consumedAt: 300, proofHash: 'd'.repeat(64), verifiedBinding: wallet()};
  await assert.rejects(() => repo.cas(ck(1), 1, {...consumed, verifiedBinding: {...wallet(), address: 'redirect'}}), status('financial_conflict'));
  const saved = await repo.cas(ck(1), 1, consumed);
  assert.equal(saved.revision, 2);
  for (const changed of [{...consumed, consumedAt: null}, {...consumed, proofHash: 'e'.repeat(64)},
    {...consumed, verifiedBinding: {...wallet(), verifiedAt: 201}}, {...consumed, consumedAt: 301}])
    await assert.rejects(() => repo.cas(ck(1), 2, changed), status('financial_conflict'));
  assert.equal((await repo.cas(ck(1), 2, consumed)).revision, 3);
});
test('atomic channel pair uniqueness and lifetime per-app payee pinning survive closing/restart', async t => {
  const {repo, open} = local(t);
  await repo.create(ch(1), channel());
  await assert.rejects(() => open().create(ch(2), channel(2)), status('channel_binding_exists'));
  await assert.rejects(() => repo.create(ch(3), {...channel(3, 11), terms: {payee: 'redirect'}}), status('channel_payee_conflict'));
  await repo.cas(ch(1), 1, {...channel(), phase: 'finalized'});
  await assert.rejects(() => open().create(ch(4), channel(4)), status('channel_binding_exists'));
  await repo.create(ch(5), channel(5, 11));
  await repo.create(ch(6), {...channel(6, 10, 51), terms: {payee: 'other-app-address'}});
  assert.equal((await repo.list('channel', id(50))).length, 2);
});
test('listing matches only kind/resource or channel counterparty app, sorts keys and caps at 100', async t => {
  const {repo} = local(t);
  for (let i = 110; i >= 1; i--) await repo.create(ck(i), challenge(i));
  const rows = await repo.list('wallet_challenge', id(10));
  assert.equal(rows.length, 100); assert.equal(rows[0].key, ck(1)); assert.equal(rows.at(-1).key, ck(100));
  await repo.create(ch(1), channel()); await repo.create(ch(2), channel(2, 11)); await repo.create(ch(3), channel(3, 12, 51));
  assert.deepEqual((await repo.list('channel', id(50))).map(r => r.key), [ch(1), ch(2)]);
  assert.deepEqual((await repo.list('channel', id(10))).map(r => r.key), [ch(1)]);
  assert.deepEqual(await repo.list('wallet_binding', id(10)), []);
  assert.deepEqual(await repo.list('wallet_challenge', id(50)), []);
});
test('strict JSON/key/revision validation and UTF-8 whole-record 256KiB bounds', async t => {
  const {repo} = local(t);
  const cyclic = challenge(); cyclic.cycle = cyclic;
  const bad = [null, [], {...challenge(), kind: 'unknown'}, {...challenge(), ownerId: ''}, {...challenge(), missing: undefined},
    {...challenge(), bad: Infinity}, {...challenge(), bad: 1n}, {...challenge(), bad: () => {}}, {...challenge(), bad: new Date()},
    {...challenge(), bad: Array(2)}, {...challenge(), bad: '\0'}, {...challenge(), bad: '\ud800'}, cyclic];
  for (const value of bad) await assert.rejects(() => repo.create(ck(1), value), status('invalid_input', 400));
  let called = false; const accessor = {...challenge()}; Object.defineProperty(accessor, 'private', {enumerable: true, get() {called = true; return 'secret';}});
  await assert.rejects(() => repo.create(ck(1), accessor), status('invalid_input', 400)); assert.equal(called, false);
  for (const key of ['arbitrary', '__proto__', 'channel:bad', 'wallet:funding:bad', ck(1) + '\n'])
    await assert.rejects(() => repo.get(key), status('invalid_input', 400));
  for (const revision of [0, -1, 1.2, '1', null, Number.MAX_SAFE_INTEGER, Infinity])
    await assert.rejects(() => repo.cas(ck(1), revision, challenge()), status('invalid_input', 400));
  const small = {...challenge(), payload: 'é'.repeat(50000), signedWireBase64: 'x'.repeat(15000)};
  await repo.create(ck(1), small);
  await assert.rejects(() => repo.cas(ck(1), 1, {...small, payload: 'é'.repeat(140000)}), status('invalid_input', 400));
  const base = {key: ck(2), revision: 1, value: {...challenge(2), payload: ''}};
  base.value.payload = 'x'.repeat(262144 - Buffer.byteLength(JSON.stringify(base)));
  await repo.create(ck(2), base.value);
  await assert.rejects(() => repo.create(ck(3), {...base.value, id: id(3), payload: base.value.payload + 'x'}), status('invalid_input', 400));
});
test('fixture requires persistent explicit path and rejects symlinks and hardlinks', t => {
  for (const path of [undefined, '', ':memory:']) assert.throws(() => createFixtureFinancialRepository({path}), /invalid_input/);
  const f = local(t); symlinkSync(f.path, join(f.dir, 'symlink')); linkSync(f.path, join(f.dir, 'hardlink'));
  for (const path of [join(f.dir, 'symlink'), join(f.dir, 'hardlink')])
    assert.throws(() => createFixtureFinancialRepository({path}), /financial_repository_unavailable/);
});
test('Supabase uses only fixed RPC operations with backend opaque apikey, no Bearer or generic capability', async () => {
  const f = remote(({operation, payload}) => operation === 'get' ? null : operation === 'list' ? [] :
    {key: payload.key, revision: operation === 'create' ? 1 : payload.revision + 1, value: payload.value});
  assert.deepEqual(Object.keys(f.repo), ['get', 'create', 'cas', 'list']);
  assert.equal(await f.repo.get(ck(1)), null); await f.repo.create(ck(1), challenge()); await f.repo.cas(ck(1), 1, challenge());
  assert.deepEqual(await f.repo.list('channel', id(50)), []);
  assert.deepEqual(f.calls.map(c => JSON.parse(c.options.body).operation), ['get', 'create', 'cas', 'list']);
  for (const {url, options} of f.calls) {
    assert.equal(url, 'https://fixture.supabase.co/rest/v1/rpc/axp_account_financial_operation');
    assert.deepEqual(options.headers, {apikey: secretKey, 'content-type': 'application/json'});
    assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
  }
});
test('Supabase validates backend-only configuration before I/O, never accepts person/app/publishable credentials', () => {
  for (const key of [undefined, '', 'sb_publishable_fixture_0123456789', 'eyJ.payload.signature', 'axp_app_' + 'a'.repeat(64), 'sb_secret_short', secretKey + '\n'])
    assert.throws(() => createSupabaseFinancialRepository({url: 'https://fixture.supabase.co', secretKey: key}), /financial_repository_secret_key_required/);
  for (const url of ['http://fixture.supabase.co', 'https://evil.invalid', 'https://fixture.supabase.co/path', 'https://fixture.supabase.co/?key=x',
    'https://fixture.supabase.co/#hash', 'https://user:password@fixture.supabase.co', 'https://fixture.supabase.co:444'])
    assert.throws(() => createSupabaseFinancialRepository({url, secretKey}), /financial_repository_configuration_required/);
});
test('Supabase response shape/binding/revision/list bounds fail closed, while private values remain backend-only intact', async () => {
  const row = {key: ck(1), revision: 1, value: {...challenge(), privateSignature: 'fixture-private-by-design'}};
  assert.deepEqual(await remote(() => row).repo.get(ck(1)), row);
  for (const bad of [{...row, raw_secret: secretKey}, {...row, key: ck(2)}, {...row, revision: '1'}, {}, [], {key: ck(1), revision: 1, value: null}])
    await assert.rejects(() => remote(() => bad).repo.get(ck(1)), /financial_repository_invalid/);
  for (const bad of [null, {}, [row, row], Array(101).fill(row), [{...row, value: {...row.value, resourceId: id(99)}}]])
    await assert.rejects(() => remote(() => bad).repo.list('wallet_challenge', id(10)), /financial_repository_invalid/);
  await assert.rejects(() => remote(() => ({...row, revision: 9})).repo.create(ck(1), challenge()), /financial_repository_invalid/);
  await assert.rejects(() => remote(() => ({...row, value: {...challenge(), message: 'rewritten'}})).repo.create(ck(1), challenge()), /financial_repository_invalid/);
  await assert.rejects(() => remote(() => new Response('x'.repeat(262145))).repo.get(ck(1)), /financial_repository_invalid/);
});
test('Supabase allowlisted conflicts/errors never expose SQL, request input or secrets and never fall back', async () => {
  for (const [code, message, http, expected] of [['PT409', 'financial_conflict', 409, 'financial_conflict'], ['PT409', 'channel_binding_exists', 409, 'channel_binding_exists'],
    ['PT409', 'channel_payee_conflict', 409, 'channel_payee_conflict'], ['PT400', 'invalid_input', 400, 'invalid_input'], ['PT404', 'not_found', 404, 'not_found'],
    ['42501', secretKey, 403, 'financial_repository_unavailable'], ['PGRST202', secretKey, 404, 'financial_repository_migration_required'],
    ['PT503', secretKey, 503, 'financial_repository_unavailable'], ['wrong', 'financial_conflict', 409, 'financial_repository_unavailable']]) {
    await assert.rejects(() => remote(() => new Response(JSON.stringify({code, message, details: secretKey, hint: 'private SQL'}), {status: http})).repo.get(ck(1)),
      e => e.message === expected && e.code === expected && !JSON.stringify(e).includes(secretKey));
  }
  await assert.rejects(() => remote(() => {throw Error(secretKey);}).repo.get(ck(1)), /financial_repository_unavailable/);
  await assert.rejects(() => remote(() => new Response('private non-json SQL')).repo.get(ck(1)), /financial_repository_invalid/);
});
test('SQL artefacts keep service RPC-only ACL/RLS, atomic uniqueness, frozen state and rollback coverage', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261012_axp_account_finance.sql', import.meta.url), 'utf8');
  const tests = readFileSync(new URL('../supabase/tests/account_finance.sql', import.meta.url), 'utf8');
  assert.match(sql, /axp_account_financial_operation\(operation text,payload jsonb[\s\S]*security definer set search_path=''/);
  assert.match(sql, /enable row level security/); assert.match(sql, /grant execute on function public\.axp_account_financial_operation\(text,jsonb\) to service_role/);
  assert.match(sql, /create unique index axp_account_financial_channel_binding/); assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /limit 100/); assert.match(sql, /262144/); assert.match(sql, /'servingEnabled'/);
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete)/i);
  assert.match(tests, /rollback;\s*$/); assert.doesNotMatch(tests, /^commit;/m);
});
