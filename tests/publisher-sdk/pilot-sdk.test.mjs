import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {AXPPublisher, PublisherSDKError} from '../../packages/publisher-sdk/index.mjs';
import {createRenderAcknowledger} from '../../packages/publisher-sdk/browser.mjs';
import {validateReceiptResult} from '../../packages/publisher-sdk/receipt.mjs';

const input = {question: 'Compare developer tools', sessionId: 'session-1', turnId: 'turn-1'};
const award = {id: 'award-1', creativeHash: 'a'.repeat(64), priceBaseUnits: '4000', expiresAt: 1791705600000,
  creative: {approvedText: 'Approved text', destinationURL: 'https://sponsor.example/'}};
const awarded = {status: 'awarded', opportunityId: 'opp-1', award, deliveryToken: 'bound-token', financialMode: 'synthetic', replayed: false};
const receipt = {status: 'accepted', financialMode: 'synthetic', receipt: {schemaVersion: 'publisher-receipt.v1', awardId: award.id, creativeHash: award.creativeHash, mode: 'synthetic'},
  charge: {id: 'charge-1', awardId: award.id, amountBaseUnits: '4000', receiptHash: 'b'.repeat(64)},
  receiptHash: 'b'.repeat(64), signature: 'fixture-not-cryptographic-proof', replayed: false};
const ok = value => ({ok: true, status: 200, json: async () => value});
const client = fetch => new AXPPublisher({apiKey: 'private-publisher-key', baseURL: 'http://127.0.0.1:3430/api/product', fetch});
const observation = {creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true};
const delivery = {awardId: award.id, deliveryToken: awarded.deliveryToken};
const receiptInput = {...delivery, observation};
const errorCode = (code, status) => error => error instanceof PublisherSDKError && error.code === code && (status === undefined || error.status === status);
function nodeFor(a = award) {
  return {isConnected: true, dataset: {awardId: a.id}, querySelector: selector => ({
    '[data-sponsored-label]': {textContent: 'Sponsored'},
    '[data-creative-copy]': {textContent: a.creative.approvedText},
    '[data-sponsored-destination]': {href: a.creative.destinationURL},
  }[selector])};
}
const browserArgs = () => ({node: nodeFor(), award, deliveryToken: delivery.deliveryToken});
const opportunityStatus = (status, extra = {}) => ({schemaVersion: 'publisher-opportunity-status.v1', status, ...extra});
const deliveryStatus = (status, extra = {}) => ({schemaVersion: 'publisher-award-status.v1', status, awardId: award.id, financialMode: 'synthetic',
  ...(status === 'accepted' ? {result: receipt} : {expiresAt: award.expiresAt}), ...extra});

test('malformed HTTP 200 browser responses are evicted, concurrent failure is deduped, explicit recovery is cached', async () => {
  for (const invalid of [undefined, {}, {status: 'failed'}, {status: 'accepted'}, {...receipt, signature: ''}, {...receipt, receiptHash: 'bad'}, {...receipt, replayed: 'true'}]) {
    let calls = 0;
    const acknowledge = createRenderAcknowledger({post: async () => {calls++; return calls === 1 ? invalid : receipt;}});
    const args = browserArgs();
    const results = await Promise.allSettled([acknowledge(args), acknowledge(args)]);
    assert.equal(calls, 1);
    for (const result of results) {assert.equal(result.status, 'rejected'); assert.equal(result.reason.code, 'invalid_receipt_response');}
    assert.equal(await acknowledge(args), receipt);
    assert.equal(await acknowledge(args), receipt);
    assert.equal(calls, 2);
  }
});

test('browser receipt award/creative/price/charge bindings reject before caching and remain retryable', async () => {
  const invalids = [
    {...receipt, receipt: {...receipt.receipt, awardId: 'other'}},
    {...receipt, receipt: {...receipt.receipt, creativeHash: 'c'.repeat(64)}},
    {...receipt, charge: {...receipt.charge, awardId: 'other'}},
    {...receipt, charge: {...receipt.charge, amountBaseUnits: '4001'}},
    {...receipt, charge: {...receipt.charge, receiptHash: 'c'.repeat(64)}},
    {...receipt, charge: {...receipt.charge, amountBaseUnits: '18446744073709551616'}},
  ];
  for (const invalid of invalids) {
    let calls = 0;
    const acknowledge = createRenderAcknowledger({post: async () => ++calls === 1 ? invalid : receipt});
    const args = browserArgs();
    await assert.rejects(acknowledge(args), errorCode('invalid_receipt_response'));
    assert.equal(await acknowledge(args), receipt); assert.equal(calls, 2);
    await assert.rejects(acknowledge({...args, award: {...award, priceBaseUnits: '4001'}}), /award_binding_conflict/);
  }
});

test('browser binds supplied receipt modes to the known award before caching, preserving legacy missing metadata', async () => {
  const legacy = {...receipt, financialMode: undefined, receipt: {...receipt.receipt, mode: undefined}, charge: {...receipt.charge, mode: undefined}};
  const invalids = [
    {...receipt, financialMode: 'devnet', receipt: {...receipt.receipt, mode: 'devnet'}, charge: {...receipt.charge, mode: 'devnet'}},
    {...legacy, financialMode: 'devnet'},
    {...legacy, mode: 'devnet'},
    {...legacy, receipt: {...legacy.receipt, mode: 'devnet'}},
    {...legacy, charge: {...legacy.charge, mode: 'devnet'}},
  ];
  for (const metadata of [{mode: 'synthetic'}, {financialMode: 'synthetic'}, {financialMode: 'synthetic', mode: 'synthetic'}]) {
    const boundAward = {...award, ...metadata}, args = {...browserArgs(), award: boundAward};
    for (const invalid of invalids) {
      let calls = 0;
      const acknowledge = createRenderAcknowledger({post: async () => ++calls === 1 ? invalid : receipt});
      await assert.rejects(acknowledge(args), errorCode('invalid_receipt_response'));
      assert.equal(calls, 1);
      assert.equal(await acknowledge(args), receipt); // Explicit retry after eviction.
      assert.equal(await acknowledge(args), receipt); assert.equal(calls, 2);
      await assert.rejects(acknowledge({...args, award: {...boundAward, financialMode: 'devnet', mode: 'devnet'}}), /award_binding_conflict/);
      assert.equal(calls, 2);
    }
    for (const valid of [legacy, {...legacy, receipt: {...legacy.receipt, mode: 'synthetic'}}, {...receipt, mode: 'synthetic', charge: {...receipt.charge, mode: 'synthetic'}}]) {
      let calls = 0;
      const acknowledge = createRenderAcknowledger({post: async () => {calls++; return valid;}});
      assert.equal(await acknowledge(args), valid); assert.equal(await acknowledge(args), valid); assert.equal(calls, 1);
    }
  }
});

test('server receipt validation uses the same browser-safe validator without signature verification claims', async () => {
  assert.equal(validateReceiptResult(receipt, {awardId: award.id, creativeHash: award.creativeHash, priceBaseUnits: award.priceBaseUnits}), receipt);
  const invalids = [
    {...receipt, receipt: {...receipt.receipt, awardId: 'other'}},
    {...receipt, receipt: {...receipt.receipt, creativeHash: 'c'.repeat(64)}},
    {...receipt, receipt: {...receipt.receipt, schemaVersion: 'wrong.v1'}},
    {...receipt, charge: {...receipt.charge, id: ' '}},
    {...receipt, charge: {...receipt.charge, amountBaseUnits: '-1'}},
    {...receipt, charge: {...receipt.charge, amountBaseUnits: '01'}},
    {...receipt, receipt: {...receipt.receipt, mode: 'devnet'}},
  ];
  for (const invalid of invalids) await assert.rejects(client(async () => ok(invalid)).acknowledgeRender(receiptInput), errorCode('invalid_receipt_response'));
  assert.equal(await client(async () => ok(receipt)).acknowledgeRender(receiptInput), receipt);
});

test('safe backend error codes and HTTP status survive request, lookup, receipt and failure paths', async () => {
  for (const [code, status] of [['turn_conflict', 409], ['opportunity_outcome_unknown', 409], ['publisher_key_revoked', 401], ['product_busy_retry', 429]]) {
    let calls = 0;
    const sdk = client(async () => {calls++; return {ok: false, status, json: async () => ({error: code, detail: 'private data not forwarded'})};});
    assert.deepEqual(await sdk.requestAd(input), {status: 'error', error: {code, status}});
    await assert.rejects(sdk.lookupOpportunity(input), errorCode(code, status));
    await assert.rejects(sdk.lookupDelivery(delivery), errorCode(code, status));
    await assert.rejects(sdk.acknowledgeRender(receiptInput), errorCode(code, status));
    await assert.rejects(sdk.failRender(delivery), errorCode(code, status));
    assert.equal(calls, 5); // One per explicit call; no automatic retry.
  }
});

test('unsafe, malformed and non-JSON backend error bodies never expose arbitrary text', async () => {
  for (const value of [{error: 'private-publisher-key failed\nsecret'}, {error: 'https://private.example/'}, {error: {code: 'secret'}}, {error: 'a'.repeat(101)}, {}]) {
    assert.deepEqual(await client(async () => ({ok: false, status: 502, json: async () => value})).requestAd(input),
      {status: 'error', error: {code: 'http_error', status: 502}});
  }
  await assert.rejects(client(async () => ({ok: false, status: 503, json: async () => {throw new Error('private response');}})).lookupDelivery(delivery), errorCode('http_error', 503));
});

test('opportunity lookup sends authenticated read-only GET without token or body, validates all union variants', async () => {
  const values = ['not_found', 'pending', 'unknown'].map(status => opportunityStatus(status));
  values.push(opportunityStatus('resolved', {result: {status: 'no_fill', opportunityId: 'opp-empty'}}));
  values.push(opportunityStatus('resolved', {result: awarded}));
  for (const awardStatus of ['reserved', 'expired', 'failed', 'delivered']) values.push(opportunityStatus('resolved', {result: awarded, awardStatus}));
  for (const value of values) {
    let calls = 0;
    const sdk = client(async (url, options) => {
      calls++; assert.equal(url, 'http://127.0.0.1:3430/api/product/publisher/opportunities?sessionId=session-1&turnId=turn-1');
      assert.equal(options.method, 'GET'); assert.equal('body' in options, false);
      assert.deepEqual(options.headers, {'x-axp-publisher-key': 'private-publisher-key'});
      assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
      return ok(value);
    });
    assert.equal(await sdk.lookupOpportunity(input), value); assert.equal(calls, 1);
  }
});

test('opportunity lookup rejects malformed schemas, incompatible union variants and unsafe saved awards', async () => {
  const invalids = [undefined, {}, opportunityStatus('accepted'), {...opportunityStatus('pending'), schemaVersion: 'wrong'},
    opportunityStatus('unknown', {result: awarded}), opportunityStatus('pending', {awardStatus: 'reserved'}),
    opportunityStatus('resolved'), opportunityStatus('resolved', {result: {status: 'error'}}),
    opportunityStatus('resolved', {result: {status: 'no_fill', opportunityId: 'opp'}, awardStatus: 'reserved'}),
    opportunityStatus('resolved', {result: awarded, awardStatus: 'accepted'}),
    opportunityStatus('resolved', {result: {...awarded, award: {...award, expiresAt: '1791705600000'}}}),
    opportunityStatus('resolved', {result: {...awarded, award: {...award, creative: {...award.creative, destinationURL: 'javascript:alert(1)'}}}}),
  ];
  for (const invalid of invalids) await assert.rejects(client(async () => ok(invalid)).lookupOpportunity(input), errorCode('invalid_response'));
});

test('delivery lookup sends publisher key and original token, returning saved accepted or terminal states', async () => {
  for (const status of ['reserved', 'expired', 'failed', 'accepted']) {
    const value = deliveryStatus(status); let calls = 0;
    const sdk = client(async (url, options) => {
      calls++; assert.equal(url, 'http://127.0.0.1:3430/api/product/awards/award-1/status');
      assert.equal(options.method, 'GET'); assert.equal('body' in options, false);
      assert.deepEqual(options.headers, {'x-axp-publisher-key': 'private-publisher-key', 'x-axp-delivery-token': delivery.deliveryToken});
      return ok(value);
    });
    assert.equal(await sdk.lookupDelivery(delivery), value); assert.equal(calls, 1);
  }
});

test('delivery lookup rejects wrong award, schema, expiry, financial mode and malformed accepted receipts', async () => {
  const invalids = [undefined, {}, deliveryStatus('delivered'), deliveryStatus('reserved', {schemaVersion: 'wrong'}),
    deliveryStatus('reserved', {awardId: 'other'}), deliveryStatus('reserved', {financialMode: ''}),
    deliveryStatus('reserved', {expiresAt: -1}), deliveryStatus('reserved', {expiresAt: 1.5}),
    deliveryStatus('expired', {expiresAt: '1791705600000'}), deliveryStatus('failed', {result: receipt}),
    deliveryStatus('accepted', {financialMode: 'devnet'})];
  for (const invalid of invalids) await assert.rejects(client(async () => ok(invalid)).lookupDelivery(delivery), errorCode('invalid_response'));
  for (const result of [undefined, {...receipt, receipt: {...receipt.receipt, awardId: 'other'}}, {...receipt, charge: {id: 'charge', amountBaseUnits: 'bad'}}]) {
    await assert.rejects(client(async () => ok(deliveryStatus('accepted', {result}))).lookupDelivery(delivery), errorCode('invalid_receipt_response'));
  }
});

test('lookup and delivery input validation rejects before transport', async () => {
  let calls = 0;
  const sdk = client(async () => {calls++; return ok({});});
  for (const invalid of [undefined, null, {}, [], true, {...input, sessionId: ' '}, {...input, sessionId: 'a'.repeat(121)}, {...input, turnId: 'x&turnId=other'}, {...input, turnId: 'x\n'}])
    await assert.rejects(sdk.lookupOpportunity(invalid), error => error instanceof PublisherSDKError);
  for (const invalid of [undefined, null, {}, [], true, {...delivery, awardId: ''}, {...delivery, awardId: 'a'.repeat(201)}, {...delivery, deliveryToken: ''}, {...delivery, deliveryToken: 'x\r\nheader:bad'}])
    await assert.rejects(sdk.lookupDelivery(invalid), error => error instanceof PublisherSDKError);
  assert.equal(calls, 0);
});

test('failRender requires failed status plus the matching award ID, never trusts HTTP 200 alone', async () => {
  for (const invalid of [{}, {status: 'failed'}, {status: 'accepted', award}, {status: 'failed', award: {...award, id: 'other'}}])
    await assert.rejects(client(async () => ok(invalid)).failRender(delivery), errorCode('invalid_fail_response'));
  const value = {status: 'failed', award: {id: award.id}};
  assert.equal(await client(async (url, options) => {
    assert.ok(url.endsWith('/awards/award-1/fail')); assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {reason: 'render_failed'}); return ok(value);
  }).failRender(delivery), value);
});

test('canonical transport trims question edges only and sends unique sorted trimmed restrictions without mutating inputs', async () => {
  const original = {...input, question: ' \tCompare\n  developer tools\n ', requiredCapabilities: [' solana ', 'ethereum', 'solana'], excludedCategories: [' travel_booking', 'hardware_wallet ', 'travel_booking']};
  const before = structuredClone(original), bodies = [];
  const sdk = client(async (_, options) => {bodies.push(options.body); return ok({status: 'no_fill', opportunityId: 'opp'});});
  await sdk.requestAd(original);
  await sdk.requestAd({...original, question: original.question.trim(), requiredCapabilities: ['ethereum', 'solana'], excludedCategories: ['hardware_wallet', 'travel_booking']});
  assert.equal(bodies[0], bodies[1]); assert.deepEqual(original, before);
  assert.deepEqual(JSON.parse(bodies[0]), {...input, question: 'Compare\n  developer tools', placementId: 'chat-sponsored-card', requiredCapabilities: ['ethereum', 'solana'], excludedCategories: ['hardware_wallet', 'travel_booking']});
});

test('canonical bounds enforce 1200 before trim and max17 raw restrictions; invalid input never reaches fetch', async () => {
  let calls = 0;
  const sdk = client(async () => {calls++; return ok({status: 'no_fill', opportunityId: 'opp'});});
  const valid = {...input, question: ` ${'x'.repeat(1198)} `, requiredCapabilities: Array.from({length: 17}, (_, i) => `id_${i}`)};
  assert.equal((await sdk.requestAd(valid)).status, 'no_fill'); assert.equal(calls, 1);
  for (const patch of [{question: ` ${'x'.repeat(1200)}`}, {question: ' \t\n '}, {question: 'x\u0000'},
    {requiredCapabilities: Array(18).fill('solana')}, {requiredCapabilities: ['']}, {requiredCapabilities: ['two words']},
    {requiredCapabilities: ['x'.repeat(101)]}, {excludedCategories: 'all'}, {excludedCategories: ['bad/id']}]) {
    assert.equal((await sdk.requestAd({...input, ...patch})).status, 'error');
  }
  assert.equal(calls, 1);
});

test('lookup deadline aborts transport, never purchases/retries or treats timeout as cancellation', async () => {
  let calls = 0, signal;
  const sdk = new AXPPublisher({apiKey: 'key', timeoutMs: 10, fetch: async (_, options) => {calls++; signal = options.signal; assert.equal(options.method, 'GET'); return new Promise(() => {});}});
  await assert.rejects(sdk.lookupOpportunity(input), errorCode('timeout')); assert.equal(signal.aborted, true); assert.equal(calls, 1);
});

test('0.2.0 local npm tarball allowlist installs offline with all public runtime entry points and declarations', t => {
  const root = mkdtempSync(join(tmpdir(), 'axp-sdk-pack-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const cache = join(root, 'cache');
  const pack = spawnSync('npm', ['pack', './packages/publisher-sdk', '--json', '--ignore-scripts', '--offline', '--cache', cache, '--pack-destination', root],
    {cwd: new URL('../../', import.meta.url), encoding: 'utf8'});
  assert.equal(pack.status, 0, pack.stderr);
  const [manifest] = JSON.parse(pack.stdout); assert.equal(manifest.version, '0.2.0');
  const expected = ['README.md', 'browser.d.mts', 'browser.mjs', 'errors.mjs', 'financial.d.mts', 'financial.mjs', 'index.d.mts', 'index.mjs', 'package.json', 'react.tsx', 'receipt.d.mts', 'receipt.mjs'];
  assert.deepEqual(manifest.files.map(file => file.path).sort(), expected.sort());
  const app = join(root, 'app');
  const install = spawnSync('npm', ['install', join(root, manifest.filename), '--prefix', app, '--no-save', '--package-lock=false', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', '--cache', cache], {encoding: 'utf8'});
  assert.equal(install.status, 0, install.stderr);
  const smoke = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {AXPPublisher, PublisherSDKError} from '@axp/publisher-sdk';
    import {createRenderAcknowledger} from '@axp/publisher-sdk/browser';
    import {moneyUnit} from '@axp/publisher-sdk/financial';
    import {validateReceiptResult} from '@axp/publisher-sdk/receipt';
    assert.equal(typeof AXPPublisher.prototype.lookupOpportunity, 'function');
    assert.equal(typeof AXPPublisher.prototype.lookupDelivery, 'function');
    assert.equal(typeof createRenderAcknowledger, 'function');
    assert.equal(moneyUnit('synthetic'), 'test credits');
    assert.throws(() => validateReceiptResult({}, {awardId: 'award'}), PublisherSDKError);
  `], {cwd: app, encoding: 'utf8'});
  assert.equal(smoke.status, 0, smoke.stderr);
});
