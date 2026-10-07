import test from 'node:test';
import assert from 'node:assert/strict';
import { AXPPublisher, PublisherSDKError } from '../../packages/publisher-sdk/index.mjs';
import { inspectPlacement, createSponsoredCard, createRenderAcknowledger } from '../../packages/publisher-sdk/browser.mjs';

const input = {question: 'Compare developer tools', sessionId: 'session-1', turnId: 'turn-1'};
const award = {id: 'award-1', creativeHash: 'a'.repeat(64), priceBaseUnits: '4000', expiresAt: Date.now() + 60000, brandName: 'StackPilot', creative: {creativeVersionId: 'creative-1', approvedText: 'Exact <approved> text', destinationURL: 'https://sponsor.example/', fictional: true}};
const awarded = {status: 'awarded', opportunityId: 'opp-1', award, deliveryToken: 'scoped-token', mode: 'synthetic', trace: {engine: 'jev'}, replayed: false};
const receipt = {status: 'accepted', charge: {id: 'charge-award-1', amountBaseUnits: '4000'}, receiptHash: 'b'.repeat(64), receipt: {awardId: award.id, creativeHash: award.creativeHash}, signature: 'signature', replayed: false};
const sdk = fetch => new AXPPublisher({apiKey: 'server-secret', baseURL: 'http://127.0.0.1:3430/api/product/', fetch});
const response = body => ({ok: true, json: async () => body});

test('server request sends minimal context and authenticates without modifying approved creative', async () => {
  const calls = [];
  const client = sdk(async (url, options) => {calls.push({url, options}); return response(awarded);});
  const result = await client.requestAd({...input, requiredCapabilities: ['software_development']});
  assert.deepEqual(result, awarded);
  assert.equal(result.award.creative, award.creative);
  assert.equal(calls[0].url, 'http://127.0.0.1:3430/api/product/opportunities');
  assert.deepEqual(JSON.parse(calls[0].options.body), {...input, placementId: 'chat-sponsored-card', requiredCapabilities: ['software_development']});
  assert.equal(calls[0].options.headers['x-axp-publisher-key'], 'server-secret');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal('apiKey' in JSON.parse(calls[0].options.body), false);
});
test('no-fill is first-class and produces no delivery request', async () => {
  let calls = 0;
  const client = sdk(async () => {calls++; return response({status: 'no_fill', opportunityId: 'opp-1', trace: {rejections: [{reason: 'frequency_cap'}]}});});
  assert.equal((await client.requestAd(input)).status, 'no_fill');
  assert.equal(calls, 1);
});
test('request failures fail open, do not expose key or automatically retry', async () => {
  let calls = 0;
  const client = sdk(async () => {calls++; throw new Error('server-secret provider failure');});
  const result = await client.requestAd(input);
  assert.deepEqual(result, {status: 'error', error: {code: 'network_error'}});
  assert.equal(JSON.stringify(result).includes('server-secret'), false);
  assert.equal(calls, 1);
});
test('HTTP errors are inspectable and one explicit retry preserves session and turn identity', async () => {
  const bodies = [];
  const client = sdk(async (_, options) => {bodies.push(options.body); return {ok: false, status: 409};});
  assert.deepEqual(await client.requestAd(input), {status: 'error', error: {code: 'http_error', status: 409}});
  await client.requestAd(input);
  assert.equal(bodies[0], bodies[1]);
});
test('deadline bounds even a transport that ignores abort, while independent answer completes', async () => {
  let calls = 0, signal;
  const client = new AXPPublisher({apiKey: 'server-secret', timeoutMs: 15, fetch: async (_, options) => {calls++; signal = options.signal; return new Promise(() => {});}});
  const ad = client.requestAd(input);
  assert.equal(await Promise.resolve('independent organic answer'), 'independent organic answer');
  assert.deepEqual(await ad, {status: 'error', error: {code: 'timeout'}});
  assert.equal(signal.aborted, true); assert.equal(calls, 1);
});
test('unsafe destination and malformed price/hash reject before rendering', async () => {
  for (const patch of [{creative: {...award.creative, destinationURL: 'javascript:alert(1)'}}, {priceBaseUnits: 4000}, {priceBaseUnits: '-1'}, {priceBaseUnits: '18446744073709551616'}, {creativeHash: 'not-a-hash'}]) {
    assert.equal((await sdk(async () => response({...awarded, award: {...award, ...patch}})).requestAd(input)).error.code, 'invalid_response');
  }
});
test('bad input never reaches transport; publisher key and safe API origin are required', async () => {
  let calls = 0;
  const client = sdk(async () => {calls++; return response(awarded);});
  for (const patch of [{sessionId: ''}, {turnId: 'space id'}, {question: 'x'.repeat(1201)}, {question: 'x\u0000'}, {requiredCapabilities: 'all'}]) {
    assert.equal((await client.requestAd({...input, ...patch})).status, 'error');
  }
  assert.equal(calls, 0);
  assert.throws(() => new AXPPublisher(), /publisher_key_required/);
  for (const baseURL of ['http://remote.example/api', 'https://user:password@host.example/api', 'https://host.example/api?key=secret']) assert.throws(() => new AXPPublisher({apiKey: 'key', baseURL}), /invalid_base_url/);
});
test('render observation cannot supply price, recipient or arbitrary payload fields', async () => {
  const calls = [];
  const client = sdk(async (url, options) => {calls.push({url, options}); return response(receipt);});
  await assert.rejects(client.acknowledgeRender({awardId: award.id, deliveryToken: 'token', observation: {creativeHash: award.creativeHash, domInserted: false, sponsoredLabelPresent: true}}), /render_not_observed/);
  const result = await client.acknowledgeRender({awardId: award.id, deliveryToken: 'token', observation: {creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true, amount: '9999', recipient: 'other'}});
  assert.equal(result.charge.id, receipt.charge.id);
  assert.deepEqual(JSON.parse(calls[0].options.body), {creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true});
  assert.equal(calls[0].options.headers['x-axp-delivery-token'], 'token');
  assert.equal(calls.length, 1);
});
test('explicit failure releases only the bound award; receipt errors are never reported as accepted', async () => {
  const calls = [];
  const client = sdk(async (url, options) => {calls.push({url, options}); return response({status: 'failed'});});
  await client.failRender({awardId: award.id, deliveryToken: 'token'});
  assert.equal(calls[0].url.endsWith('/awards/award-1/fail'), true);
  assert.deepEqual(JSON.parse(calls[0].options.body), {reason: 'render_failed'});
  await assert.rejects(client.acknowledgeRender({awardId: award.id, deliveryToken: 'token', observation: {creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true}}), error => error instanceof PublisherSDKError && error.code === 'invalid_receipt_response');
});

function observedNode() {
  const label = {textContent: 'Sponsored'}, copy = {textContent: award.creative.approvedText}, link = {href: award.creative.destinationURL};
  const node = {isConnected: true, dataset: {awardId: award.id}, querySelector: selector => ({'[data-sponsored-label]': label, '[data-creative-copy]': copy, '[data-sponsored-destination]': link}[selector])};
  return {node, label, copy, link};
}
test('DOM observation requires connection, award binding, exact text, destination and disclosure', () => {
  const {node, label, copy, link} = observedNode();
  assert.deepEqual(inspectPlacement(node, award), {creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true});
  node.isConnected = false; assert.equal(inspectPlacement(node, award).domInserted, false); node.isConnected = true;
  copy.textContent += ' rewritten'; assert.equal(inspectPlacement(node, award).domInserted, false); copy.textContent = award.creative.approvedText;
  link.href = 'https://other.example/'; assert.equal(inspectPlacement(node, award).domInserted, false); link.href = award.creative.destinationURL;
  label.textContent = 'Recommended'; assert.equal(inspectPlacement(node, award).sponsoredLabelPresent, false);
  node.dataset.awardId = 'other-award'; assert.equal(inspectPlacement(node, award).domInserted, false);
});
test('hidden disclosure is not a Sponsored observation', () => {
  const {node, label} = observedNode(); label.hidden = true;
  assert.equal(inspectPlacement(node, award).sponsoredLabelPresent, false);
  label.hidden = false;
  label.nodeType = 1;
  label.ownerDocument = {defaultView: {getComputedStyle: () => ({display: 'none', opacity: '1'})}};
  assert.equal(inspectPlacement(node, award).sponsoredLabelPresent, false);
});
test('browser acknowledger dedupes in-flight and accepted posts, rejects changed award bindings', async () => {
  const {node} = observedNode(); let calls = 0;
  const acknowledge = createRenderAcknowledger({post: async () => {calls++; return receipt;}});
  const args = {node, award, deliveryToken: 'token'};
  const [first, second] = await Promise.all([acknowledge(args), acknowledge(args)]);
  assert.equal(first, second); assert.equal(await acknowledge(args), receipt); assert.equal(calls, 1);
  await assert.rejects(acknowledge({...args, deliveryToken: 'changed-token'}), /award_binding_conflict/);
});
test('uncertain render can explicitly retry same observation; detached DOM never posts', async () => {
  const {node} = observedNode(); let calls = 0;
  const acknowledge = createRenderAcknowledger({post: async () => {calls++; if (calls === 1) throw new Error('timeout'); return receipt;}});
  const args = {node, award, deliveryToken: 'token'};
  await assert.rejects(acknowledge(args), /timeout/); assert.equal(await acknowledge(args), receipt); assert.equal(calls, 2);
  node.isConnected = false; await assert.rejects(acknowledge(args), /render_not_observed/); assert.equal(calls, 2);
});
test('native renderer preserves approved plain text and refuses executable destinations', () => {
  const document = {createElement: tag => ({tag, dataset: {}, attributes: {}, children: [], setAttribute(k, v) {this.attributes[k] = v;}, append(...children) {this.children.push(...children);}})};
  const node = createSponsoredCard({document, award});
  assert.equal(node.children[0].textContent, 'Sponsored');
  assert.equal(node.children[1].textContent, award.creative.approvedText);
  assert.equal('innerHTML' in node.children[1], false);
  assert.equal(node.children[2].rel, 'sponsored noopener noreferrer');
  assert.throws(() => createSponsoredCard({document, award: {...award, creative: {...award.creative, destinationURL: 'data:text/html,danger'}}}), /invalid_destination/);
});
