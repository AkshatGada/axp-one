import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createProductService, PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';
import {inspectPlacement} from '../../packages/publisher-sdk/browser.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

async function fixture(t, options = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'axp-publisher-sdk-'));
  let clock = Date.now(), modelCalls = 0;
  const service = createProductService({stateDir, publisherKey: 'publisher-test-key', now: () => clock,
    transport: async packet => {modelCalls++; return jevResponse(packet, 3, 2);}, ...options});
  let server;
  t.after(async () => {if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));} service.close(); rmSync(stateDir, {recursive: true, force: true});});
  service.saveAccount({name: 'SDK integration fixture', websiteURL: 'https://fixture.example/'});
  const {id: _id, label: _label, exampleQuestion, ...draft} = PRESETS[0];
  const {campaign} = service.saveCampaign({...draft, budgetCapBaseUnits: '100000', depositBaseUnits: '100000'});
  service.approve(campaign.id); service.launch(campaign.id);
  const {handler} = createProductAPI({service});
  let baseURL = 'http://127.0.0.1:3430/api/product';
  let fetchAPI = async (url, options = {}) => {
    const parsed = new URL(url), req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.url = parsed.pathname; req.method = options.method ?? 'GET';
    req.headers = {host: parsed.host, ...(options.headers ?? {})};
    let status, headers, output;
    await handler(req, {writeHead(code, value) {status = code; headers = value;}, end(value) {output = value;}});
    return new Response(output, {status, headers});
  };
  // Default exercises the actual route parser/handler in process, without sockets.
  // Opt in to real loopback HTTP when the caller has network permission.
  if (process.env.AXP_SDK_HTTP_TEST === '1') {
    server = createServer(handler);
    await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
    baseURL = `http://127.0.0.1:${server.address().port}/api/product`; fetchAPI = fetch;
  }
  const sdk = new AXPPublisher({apiKey: 'publisher-test-key', baseURL, fetch: fetchAPI});
  return {service, sdk, baseURL, fetch: fetchAPI, campaign, exampleQuestion, stateDir, calls: () => modelCalls, advance: ms => {clock += ms;}};
}
const observation = award => inspectPlacement({isConnected: true, dataset: {awardId: award.id}, querySelector(selector) {
  if (selector === '[data-sponsored-label]') return {textContent: 'Sponsored'};
  if (selector === '[data-creative-copy]') return {textContent: award.creative.approvedText};
  if (selector === '[data-sponsored-destination]') return {href: award.creative.destinationURL};
}}, award);

test('SDK talks to actual product API handler: new campaign → award → exact observation → one charge and duplicate replay', async t => {
  const f = await fixture(t);
  const input = {question: f.exampleQuestion, sessionId: 'session-sdk', turnId: 'turn-sdk'};
  const ad = await f.sdk.requestAd(input);
  assert.equal(ad.status, 'awarded'); assert.equal(ad.award.campaignId, f.campaign.id);
  assert.equal(ad.award.creative.approvedText, f.campaign.approvedText);
  assert.equal(ad.trace.decisions[0].engineProvenance.execution, 'fixture');
  const rendered = {awardId: ad.award.id, deliveryToken: ad.deliveryToken, observation: observation(ad.award)};
  const receipt = await f.sdk.acknowledgeRender(rendered);
  const duplicate = await f.sdk.acknowledgeRender(rendered);
  assert.equal(receipt.status, 'accepted'); assert.equal(duplicate.replayed, true);
  assert.equal(duplicate.charge.id, receipt.charge.id);
  assert.equal(f.service.state().summary.deliveryCount, 1);
  assert.equal(f.service.state().summary.spendBaseUnits, receipt.charge.amountBaseUnits);
  const retried = await f.sdk.requestAd(input);
  assert.equal(retried.award.id, ad.award.id); assert.equal(retried.replayed, true); assert.equal(f.calls(), 1);
  const conflict = await f.sdk.requestAd({...input, question: 'A different user question'});
  assert.deepEqual(conflict, {status: 'error', error: {code: 'http_error', status: 409}});
});
test('connected SDK preserves campaign frequency, publisher restrictions, explicit render failure and expiry', async t => {
  const f = await fixture(t);
  const input = {question: f.exampleQuestion, sessionId: 'session-frequency', turnId: 'one'};
  for (const turnId of ['one', 'two']) {
    const ad = await f.sdk.requestAd({...input, turnId}); assert.equal(ad.status, 'awarded');
    await f.sdk.acknowledgeRender({awardId: ad.award.id, deliveryToken: ad.deliveryToken, observation: observation(ad.award)});
  }
  const capped = await f.sdk.requestAd({...input, turnId: 'three'}); assert.equal(capped.status, 'no_fill');
  assert.equal(capped.trace.rejections.some(r => r.reason === 'frequency_cap'), true);
  const missing = await f.sdk.requestAd({...input, sessionId: 'session-fresh', turnId: 'missing', requiredCapabilities: ['hardware_wallet']}); assert.equal(missing.status, 'no_fill');
  const blocked = await f.sdk.requestAd({...input, sessionId: 'session-fresh', turnId: 'blocked', excludedCategories: ['software_development']}); assert.equal(blocked.status, 'no_fill');
  assert.equal(blocked.trace.candidates[0].eligible, false);
  assert.equal(blocked.trace.candidates[0].reason, 'publisher_category_blocked');
  assert.equal(blocked.trace.decisions.length, 0);
  const failed = await f.sdk.requestAd({...input, sessionId: 'session-fresh', turnId: 'failed'}); assert.equal(failed.status, 'awarded');
  await f.sdk.failRender({awardId: failed.award.id, deliveryToken: failed.deliveryToken});
  assert.equal(f.service.state().summary.reservedBaseUnits, '0');
  await assert.rejects(f.sdk.acknowledgeRender({awardId: failed.award.id, deliveryToken: failed.deliveryToken, observation: observation(failed.award)}), error => error.status === 409);
  const expired = await f.sdk.requestAd({...input, sessionId: 'session-fresh', turnId: 'expired'}); assert.equal(expired.status, 'awarded');
  f.advance(5 * 60 * 1000);
  await assert.rejects(f.sdk.acknowledgeRender({awardId: expired.award.id, deliveryToken: expired.deliveryToken, observation: observation(expired.award)}), error => error.status === 409);
  assert.equal(f.service.state().summary.deliveryCount, 2); assert.equal(f.service.state().summary.reservedBaseUnits, '0');
});
test('independent answer completes while fixture buyer is pending; organic provider receives no advertiser material', async t => {
  let release, organicPrompt;
  const f = await fixture(t, {transport: packet => new Promise(resolve => {release = () => resolve(jevResponse(packet, 3, 2));}),
    organicTransport: async request => {organicPrompt = request.suppliedPrompt; return {answer: 'Independent fixture answer', model: 'fixture-organic'};}});
  const input = {question: f.exampleQuestion, sessionId: 'parallel-session', turnId: 'parallel-turn'};
  const ad = f.sdk.requestAd(input);
  const bootstrap = await (await f.fetch(`${f.baseURL}/bootstrap`)).json();
  const answer = await (await f.fetch(`${f.baseURL}/demo/answer`, {method: 'POST', headers: {'content-type': 'application/json', 'x-axp-csrf': bootstrap.csrf}, body: JSON.stringify(input)})).json();
  assert.equal(answer.answer, 'Independent fixture answer'); assert.equal(answer.advertiserMaterialIncluded, false);
  assert.equal(organicPrompt.includes(f.campaign.approvedText), false);
  assert.equal(organicPrompt.includes(f.campaign.brandName), false);
  assert.equal(organicPrompt.includes(f.campaign.contextHints[0]), false);
  assert.ok(release); release(); assert.equal((await ad).status, 'awarded');
});
test('wrong server key is rejected and public bootstrap/config never expose publisher key', async t => {
  const f = await fixture(t);
  const wrong = new AXPPublisher({apiKey: 'wrong-key', baseURL: f.baseURL, fetch: f.fetch});
  const failed = await wrong.requestAd({question: f.exampleQuestion, sessionId: 'unauthorized', turnId: 'one'});
  assert.equal(failed.error.status, 401);
  for (const path of ['/bootstrap', '/publisher/config']) {
    const value = await (await f.fetch(`${f.baseURL}${path}`)).json();
    assert.equal(JSON.stringify(value).includes('publisher-test-key'), false);
  }
  assert.equal(f.calls(), 0);
});
