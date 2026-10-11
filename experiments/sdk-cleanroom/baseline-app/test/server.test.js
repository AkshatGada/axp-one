import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatServer } from '../server.js';
import { FixtureAnswerProvider } from '../answer-provider.js';

async function withServer(t, provider) {
  const server = createChatServer(provider ? { provider } : {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function post(base, messages) {
  return fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
}

test('fixture is deterministic and references prior conversation turns', async () => {
  const provider = new FixtureAnswerProvider();
  const messages = [{ role: 'user', content: 'Hello' }];
  const first = await provider.answer({ messages });
  assert.equal(first, await provider.answer({ messages }));
  const second = await provider.answer({ messages: [...messages,
    { role: 'assistant', content: first }, { role: 'user', content: 'And next?' }] });
  assert.match(second, /turn 2/);
  assert.match(second, /previous message was: “Hello”/);
  assert.match(second, /not an AI-generated answer/);
});

test('HTTP API supports multiple turns', async (t) => {
  const base = await withServer(t);
  const history = [{ role: 'user', content: 'Hello' }];
  const first = await post(base, history);
  assert.equal(first.status, 200);
  const { answer } = await first.json();
  history.push({ role: 'assistant', content: answer }, { role: 'user', content: 'Follow up' });
  const second = await post(base, history);
  assert.equal(second.status, 200);
  assert.match((await second.json()).answer, /turn 2/);
});

test('validates malformed histories before calling the provider', async (t) => {
  let calls = 0;
  const base = await withServer(t, { async answer() { calls++; return 'OK'; } });
  for (const history of [undefined, [], null,
    [{ role: 'system', content: 'No' }],
    [{ role: 'user', content: ' ' }],
    [{ role: 'user', content: 'x'.repeat(4001) }],
    [{ role: 'user', content: 'Hi' }, { role: 'user', content: 'Again' }, { role: 'user', content: 'No' }],
    Array.from({ length: 43 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'Hi' })),
  ]) {
    assert.equal((await post(base, history)).status, 400);
  }
  assert.equal(calls, 0);
});

test('rejects malformed JSON, wrong content type, oversized bodies and wrong methods', async (t) => {
  const base = await withServer(t);
  assert.equal((await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  })).status, 400);
  assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(33000),
  })).status, 413);
  assert.equal((await fetch(`${base}/api/chat`)).status, 405);
});

test('provider failures and invalid outputs return safe, retryable errors', async (t) => {
  for (const provider of [
    { async answer() { throw new Error('private credential details'); } },
    { async answer() { return ''; } },
    { async answer() { return 'x'.repeat(4001); } },
  ]) {
    const base = await withServer(t, provider);
    const response = await post(base, [{ role: 'user', content: 'Hi' }]);
    assert.equal(response.status, 502);
    const body = await response.text();
    assert.match(body, /Please try again/);
    assert.doesNotMatch(body, /private credential/);
  }
});

test('serves only public assets with expected content types and security headers', async (t) => {
  const base = await withServer(t);
  for (const [path, type] of [['/', 'text/html'], ['/app.js', 'text/javascript'], ['/style.css', 'text/css']]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  }
  for (const path of ['/server.js', '/answer-provider.js', '/package.json', '/missing']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404);
  }
  assert.equal(await (await fetch(base, { method: 'HEAD' })).text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
