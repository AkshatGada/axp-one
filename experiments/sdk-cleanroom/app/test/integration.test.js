import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { createChatServer } from '../server.js';
import { configuredPublisher } from '../axp-integration.js';
import { AXPPublisher } from '../vendor/publisher-sdk/index.mjs';

const hash = 'a'.repeat(64);
function awardResult() {
  return { status: 'awarded', opportunityId: 'fixture-opportunity', financialMode: 'synthetic',
    award: { id: 'fixture-award', creativeHash: hash, priceBaseUnits: '10', expiresAt: Date.now() + 60000,
      brandName: 'Fixture sponsor', creative: { approvedText: 'Approved fixture copy <not HTML>',
        destinationURL: 'https://sponsor.example/', fictional: true } },
    deliveryToken: 'scoped-fixture-capability', trace: { privateBuyerContext: 'do not forward' } };
}
function fixtureExchange({ opportunity, loseReceipt = false, receiptMode = 'synthetic' } = {}) {
  const requests = [];
  let charges = 0;
  let renderAttempts = 0;
  const fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, options, body });
    assert.equal(options.headers['x-axp-publisher-key'], 'server-only-test-key');
    if (url.endsWith('/opportunities')) {
      return Response.json(await (opportunity ? opportunity(body) : awardResult()));
    }
    if (url.endsWith('/fail')) return Response.json({ status: 'failed' });
    if (url.endsWith('/render')) {
      renderAttempts++;
      const replayed = charges > 0;
      if (!charges) charges++;
      if (loseReceipt && renderAttempts === 1) {
        if (loseReceipt === 'timeout') return new Promise(() => {});
        throw new Error('response lost after acceptance');
      }
      return Response.json({ status: 'accepted', charge: { id: 'fixture-charge', amountBaseUnits: '10' },
        receipt: { awardId: 'fixture-award', creativeHash: hash }, signature: 'fixture-signature',
        receiptHash: 'b'.repeat(64), ...(receiptMode ? { financialMode: receiptMode } : {}), replayed });
    }
    throw new Error('Unexpected mocked route');
  };
  return { publisher: new AXPPublisher({ apiKey: 'server-only-test-key', baseURL: 'http://127.0.0.1:3470/api/product',
    timeoutMs: 40, receiptTimeoutMs: 40, fetch }), requests, get charges() { return charges; } };
}
async function setup(t, exchange, provider, integrationOptions) {
  const server = createChatServer({ publisher: exchange?.publisher, ...(provider ? { provider } : {}), integrationOptions });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, body = {}, session, headers = {}) {
    return fetch(`${base}${path}`, { method: 'POST',
      headers: { 'content-type': 'application/json', origin: base,
        ...(session ? { cookie: session.cookie, 'x-app-csrf': session.csrf } : {}), ...headers },
      body: JSON.stringify(body) });
  }
  async function bootstrap(old) {
    const response = await call('/api/axp/session', {}, old, { 'x-app-init': '1' });
    assert.equal(response.status, 200);
    return { ...await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function chat(session, { content = 'Recommend developer tools', id = randomUUID(), history } = {}) {
    const response = await call('/api/chat', { messages: history || [{ role: 'user', content }],
      ...(session ? { axp: { csrf: session.csrf, submissionId: id, sessionId: 'forged', turnId: 'forged' } } : {}) }, session);
    return { response, body: await response.json() };
  }
  return { base, call, bootstrap, chat };
}
async function placed(app, session) {
  const { body } = await app.chat(session);
  const turnId = body.axp.turnId;
  const response = await app.call('/api/axp/placement', { turnId }, session);
  assert.equal(response.status, 200);
  return { turnId, ...await response.json() };
}
function renderBody(ad) {
  return { turnId: ad.turnId, awardId: ad.award.id, deliveryToken: ad.deliveryToken,
    observation: { creativeHash: hash, domInserted: true, sponsoredLabelPresent: true },
    amount: '999999', recipient: 'attacker', signingKey: 'not forwarded' };
}

test('ordinary fixture chat stays available with ads disabled and configuration fails closed', async t => {
  const app = await setup(t);
  assert.equal((await app.bootstrap()).enabled, false);
  const { body } = await app.chat();
  assert.match(body.answer, /not an AI-generated answer/);
  assert.equal(body.axp, undefined);
  assert.equal(configuredPublisher({}), null);
  for (const env of [{ AXP_PUBLISHER_API_KEY: 'test' },
    { AXP_EXCHANGE_URL: 'https://axp.one/api/product', AXP_PUBLISHER_API_KEY: 'test' }]) {
    assert.throws(() => configuredPublisher(env), /operator loopback URL/);
  }
});

test('organic reply completes before a slow ad and receives no advertiser context', async t => {
  let resolveAd;
  const pending = new Promise(resolve => { resolveAd = resolve; });
  const exchange = fixtureExchange({ opportunity: () => pending });
  let organicInput;
  const app = await setup(t, exchange, { async answer(input) { organicInput = input; return 'Independent fixture'; } });
  const session = await app.bootstrap();
  const history = [{ role: 'user', content: 'Earlier private history' }, { role: 'assistant', content: 'Prior fixture' },
    { role: 'user', content: 'Recommend developer tools' }];
  const { body } = await app.chat(session, { history });
  assert.equal(body.answer, 'Independent fixture');
  assert.equal(body.axp.status, 'pending');
  assert.deepEqual(organicInput, { messages: history });
  assert.equal(exchange.requests.length, 1);
  const sent = exchange.requests[0].body;
  assert.equal(sent.question, history.at(-1).content);
  assert.notEqual(sent.sessionId, 'forged');
  assert.notEqual(sent.turnId, 'forged');
  assert.deepEqual(Object.keys(sent).sort(), ['placementId', 'question', 'sessionId', 'turnId']);
  resolveAd(awardResult());
  const ad = await (await app.call('/api/axp/placement', { turnId: body.axp.turnId }, session)).json();
  assert.equal(ad.status, 'awarded');
  assert.equal(ad.trace, undefined);
  assert.equal(JSON.stringify(body).includes('server-only-test-key'), false);
});

test('no-fill, exchange exceptions and SDK deadlines leave fixture replies intact; no purchase retry', async t => {
  for (const opportunity of [() => ({ status: 'no_fill', opportunityId: 'none' }),
    () => { throw new Error('private exchange detail'); }, () => new Promise(() => {})]) {
    const exchange = fixtureExchange({ opportunity });
    const app = await setup(t, exchange);
    const session = await app.bootstrap();
    const { body } = await app.chat(session);
    assert.match(body.answer, /Fixture reply/);
    const ad = await (await app.call('/api/axp/placement', { turnId: body.axp.turnId }, session)).json();
    assert.ok(['no_fill', 'error'].includes(ad.status));
    assert.doesNotMatch(JSON.stringify(ad), /private exchange detail/);
    assert.equal(exchange.requests.length, 1);
    if (ad.status === 'error') assert.ok(['network_error', 'timeout'].includes(ad.error.code));
  }
});

test('long/control-character messages skip sharing without truncating organic input', async t => {
  const exchange = fixtureExchange();
  const app = await setup(t, exchange);
  const session = await app.bootstrap();
  for (const content of ['x'.repeat(1600), 'private\u0001control']) {
    const { body, response } = await app.chat(session, { content });
    assert.equal(response.status, 200);
    assert.ok(body.answer.includes(content));
    const ad = await (await app.call('/api/axp/placement', { turnId: body.axp.turnId }, session)).json();
    assert.equal(ad.status, 'skipped');
  }
  assert.equal(exchange.requests.length, 0);
});

test('stable submission identity deduplicates purchases; changed canonical input is rejected only for ads', async t => {
  const exchange = fixtureExchange();
  const app = await setup(t, exchange);
  const session = await app.bootstrap();
  const id = randomUUID();
  const first = await app.chat(session, { id });
  const second = await app.chat(session, { id });
  assert.equal(first.body.axp.turnId, second.body.axp.turnId);
  const changed = await app.chat(session, { id, content: 'Changed question' });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.body.axp.status, 'error');
  assert.equal(exchange.requests.length, 1);
});

test('same-origin, CSRF, cookies and server-owned turn/award/token bindings are enforced', async t => {
  const exchange = fixtureExchange();
  const app = await setup(t, exchange);
  const first = await app.bootstrap();
  const second = await app.bootstrap();
  const ad = await placed(app, first);
  const binding = renderBody(ad);
  for (const headers of [{ origin: 'http://evil.example' }, { origin: '' },
    { 'sec-fetch-site': 'cross-site' }, { 'x-app-csrf': 'forged' }, { cookie: '' }]) {
    assert.equal((await app.call('/api/axp/render', binding, first, headers)).status, 403, JSON.stringify(headers));
  }
  // Node fetch ignores a custom Host; use raw HTTP to actually exercise rebinding.
  const forgedHostStatus = await new Promise((resolve, reject) => {
    const request = http.request(app.base + '/api/axp/render', { method: 'POST', headers: {
      host: 'evil.example', origin: 'http://evil.example', 'content-type': 'application/json',
      cookie: first.cookie, 'x-app-csrf': first.csrf,
    } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject); request.end(JSON.stringify(binding));
  });
  assert.equal(forgedHostStatus, 403);
  assert.equal((await app.call('/api/axp/session', {}, undefined, { 'x-app-init': '1', origin: 'http://evil.example' })).status, 403);
  assert.equal((await app.call('/api/axp/session')).status, 403);
  assert.equal((await app.call('/api/axp/render', binding, second)).status, 404);
  assert.equal((await app.call('/api/axp/render', { ...binding, awardId: 'other' }, first)).status, 403);
  assert.equal((await app.call('/api/axp/render', { ...binding, deliveryToken: 'other' }, first)).status, 403);
  for (const observation of [{ ...binding.observation, creativeHash: 'c'.repeat(64) },
    { ...binding.observation, domInserted: false }, { ...binding.observation, sponsoredLabelPresent: false }]) {
    assert.equal((await app.call('/api/axp/render', { ...binding, observation }, first)).status, 400);
  }
  assert.equal(exchange.requests.filter(request => request.url.endsWith('/render')).length, 0);
  const organic = await app.chat({ ...first, csrf: 'wrong' });
  assert.equal(organic.response.status, 200);
  assert.match(organic.body.answer, /Fixture reply/);
});

test('uncertain receipt retries the same binding and replays one charge; never auto-fails delivery', async t => {
  for (const loseReceipt of [true, 'timeout']) {
  const exchange = fixtureExchange({ loseReceipt, receiptMode: loseReceipt === 'timeout' ? null : 'synthetic' });
  const app = await setup(t, exchange);
  const session = await app.bootstrap();
  const ad = await placed(app, session);
  const binding = renderBody(ad);
  assert.equal((await app.call('/api/axp/render', binding, session)).status, 502);
  assert.equal((await app.call('/api/axp/fail', binding, session)).status, 409);
  const retried = await app.call('/api/axp/render', binding, session);
  assert.equal(retried.status, 200);
  const receipt = await retried.json();
  assert.equal(receipt.status, 'accepted');
  assert.equal(receipt.replayed, true);
  assert.equal(receipt.financialMode, 'synthetic');
  assert.equal(exchange.charges, 1);
  const posts = exchange.requests.filter(request => request.url.endsWith('/render'));
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0].body, posts[1].body);
  assert.deepEqual(Object.keys(posts[0].body).sort(), ['creativeHash', 'domInserted', 'sponsoredLabelPresent']);
  assert.equal(posts[0].options.headers['x-axp-delivery-token'], ad.deliveryToken);
  assert.equal(exchange.requests.filter(request => request.url.endsWith('/fail')).length, 0);
  }
});

test('failed insertion releases a reservation and cannot acknowledge it later', async t => {
  const exchange = fixtureExchange();
  const app = await setup(t, exchange);
  const session = await app.bootstrap();
  const ad = await placed(app, session);
  const binding = renderBody(ad);
  assert.equal((await app.call('/api/axp/fail', binding, session)).status, 200);
  assert.equal((await app.call('/api/axp/render', binding, session)).status, 404);
  assert.equal(exchange.requests.at(-1).url.endsWith('/fail'), true);
  assert.equal(exchange.charges, 0);
});

test('new chat retires a pending turn and releases its late award', async t => {
  let resolveAd;
  const exchange = fixtureExchange({ opportunity: () => new Promise(resolve => { resolveAd = resolve; }) });
  const app = await setup(t, exchange);
  const old = await app.bootstrap();
  const { body } = await app.chat(old);
  await app.bootstrap(old);
  resolveAd(awardResult());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(exchange.requests.at(-1).url.endsWith('/fail'), true);
  assert.equal((await app.call('/api/axp/placement', { turnId: body.axp.turnId }, old)).status, 403);
});

test('organic failure cancels reservation; stable retry never repurchases the original turn', async t => {
  const exchange = fixtureExchange();
  let fail = true;
  const app = await setup(t, exchange, { async answer() { if (fail) throw new Error('fixture failure'); return 'Recovered fixture'; } });
  const session = await app.bootstrap();
  const id = randomUUID();
  assert.equal((await app.chat(session, { id })).response.status, 502);
  await new Promise(resolve => setImmediate(resolve));
  fail = false;
  const retried = await app.chat(session, { id });
  assert.equal(retried.body.answer, 'Recovered fixture');
  assert.equal(retried.body.axp.status, 'skipped');
  assert.equal(exchange.requests.filter(request => request.url.endsWith('/opportunities')).length, 1);
  assert.equal(exchange.requests.filter(request => request.url.endsWith('/fail')).length, 1);
});

test('expired sessions and expired or non-synthetic awards fail closed for ads', async t => {
  let now = Date.now();
  const exchange = fixtureExchange();
  const app = await setup(t, exchange, undefined, { now: () => now });
  const session = await app.bootstrap();
  now += 3600001;
  assert.equal((await app.call('/api/axp/placement', { turnId: 'unknown' }, session)).status, 403);
  for (const override of [{ expiresAt: 1 }, { financialMode: 'devnet' }]) {
    const altered = fixtureExchange({ opportunity: () => {
      const result = awardResult();
      if (override.expiresAt) result.award.expiresAt = override.expiresAt;
      else Object.assign(result, override);
      return result;
    } });
    const next = await setup(t, altered);
    const auth = await next.bootstrap();
    const ad = await placed(next, auth);
    assert.equal(ad.status, 'error');
    assert.equal(altered.requests.at(-1).url.endsWith('/fail'), true);
  }
});

test('only the browser SDK module is public; keys, metadata, source, and environment remain private', async t => {
  const app = await setup(t, fixtureExchange());
  for (const path of ['/sponsorship.js', '/vendor/publisher-sdk/browser.mjs']) {
    const response = await fetch(app.base + path);
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /server-only-test-key/);
  }
  for (const path of ['/axp-integration.js', '/vendor/publisher-sdk/index.mjs',
    '/vendor/publisher-sdk/package.json', '/integrator.env', '/INTEGRATION_LOG.md']) {
    assert.equal((await fetch(app.base + path)).status, 404);
  }
  assert.equal((await fetch(app.base + '/api/axp/render')).status, 405);
});
