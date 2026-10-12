// Labelled transport fixtures only: no provider, cloud, model, wallet or payment calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AccountApiError, AccountsClient } from '../apps/product-ui/src/components/accounts/client.ts';
import { accountSDKExample } from '../apps/product-ui/src/components/accounts/resourceForms.ts';

const org = 'fixture-org', campaign = 'fixture-campaign', app = 'fixture-app';
const capabilities = { profiles: true, campaignDrafts: true, appCredentials: true, campaignServing: true, nativeFunding: false };
const session = { authenticated: true, user: { id: 'fixture-owner', email: 'fixture@example.test', displayName: '' },
  csrf: 'fixture-csrf', organizations: [{ id: org, name: 'Fixture org', role: 'owner' }], capabilities };
const enrollment = { campaignId: campaign, organizationId: org, version: 3, approvedContentHash: 'a'.repeat(64),
  enabled: true, financialMode: 'synthetic', updatedAt: 12 };
const summary = { acceptedBaseUnits: '3000', reservedBaseUnits: '2000', deliveryCount: 1 };
const delivery = { awardId: 'fixture-award', opportunityId: 'fixture-opportunity', campaignId: campaign, campaignVersionId: `${campaign}-v3`,
  appId: app, amountBaseUnits: '3000', receiptHash: 'b'.repeat(64), acceptedAt: 11, settlementNetwork: 'solana-devnet' };
const campaignReport = { schemaVersion: 'account-campaign-report.v1', financialMode: 'synthetic', campaignId: campaign,
  summary, bySettlementNetwork: { 'solana-devnet': summary }, deliveries: [delivery] };
const appReport = { ...campaignReport, schemaVersion: 'account-app-report.v1', appId: app };
delete appReport.campaignId;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
function fixture(responses = []) {
  const calls = [];
  const client = new AccountsClient(async (url, options) => {
    calls.push({ url, ...options });
    assert.ok(responses.length, 'unexpected request');
    const response = responses.shift();
    return typeof response === 'function' ? response() : json(response);
  });
  return { client, calls };
}
const operations = client => [
  () => client.appIntegration(org, app),
  () => client.campaignServing(org, campaign),
  () => client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: true }),
  () => client.campaignReport(org, campaign), () => client.appReport(org, app),
];

test('serving and report methods require a current human session before transport', async () => {
  const { client, calls } = fixture();
  for (const operation of operations(client)) await assert.rejects(operation(), { status: 401 });
  assert.equal(calls.length, 0);
});

test('frozen owner serving/report routes, CSRF and explicit version-precondition bodies', async () => {
  const paused = { ...enrollment, enabled: false };
  const { client, calls } = fixture([session, { enrollment: null }, { enrollment }, { enrollment: paused }, campaignReport, appReport]);
  await client.session();
  assert.deepEqual(await client.campaignServing(org, campaign), { enrollment: null });
  assert.deepEqual(await client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: true, ownerId: 'forged', financialMode: 'devnet' }), { enrollment });
  assert.deepEqual(await client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: false }), { enrollment: paused });
  assert.deepEqual(await client.campaignReport(org, campaign), campaignReport);
  assert.deepEqual(await client.appReport(org, app), appReport);
  const base = `/api/accounts/organizations/${org}`;
  assert.deepEqual(calls.slice(1).map(call => [call.method, call.url, call.body && JSON.parse(call.body)]), [
    ['GET', `${base}/campaigns/${campaign}/serving`, undefined],
    ['POST', `${base}/campaigns/${campaign}/serving`, { expectedVersion: 3, enabled: true }],
    ['POST', `${base}/campaigns/${campaign}/serving`, { expectedVersion: 3, enabled: false }],
    ['GET', `${base}/campaigns/${campaign}/report`, undefined], ['GET', `${base}/apps/${app}/report`, undefined],
  ]);
  for (const call of calls) {
    assert.equal(call.credentials, 'same-origin'); assert.equal(call.cache, 'no-store'); assert.equal(call.redirect, 'error');
    const headers = new Headers(call.headers);
    assert.equal(headers.get('x-axp-csrf'), call.method === 'POST' ? session.csrf : null);
    assert.equal(headers.has('authorization'), false); assert.equal(headers.has('x-axp-publisher-key'), false);
  }
});

test('serving requires a reviewed safe integer version and an actual boolean', async () => {
  const { client, calls } = fixture([session]); await client.session();
  for (const expectedVersion of [undefined, null, 0, -1, 1.5, '3', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(client.setCampaignServing(org, campaign, { expectedVersion, enabled: true }), { status: 400, code: 'invalid_expected_version' });
  }
  for (const enabled of [undefined, null, 'true', 0, 1]) {
    await assert.rejects(client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled }), { status: 400 });
  }
  assert.equal(calls.length, 1);
});

test('version conflicts never retry, approve or enroll a replacement version automatically', async () => {
  for (const enabled of [true, false]) {
    const { client, calls } = fixture([session, () => json({ error: 'campaign_version_conflict' }, 409)]);
    await client.session();
    await assert.rejects(client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled }), failure =>
      failure instanceof AccountApiError && failure.code === 'campaign_version_conflict' && /review the latest saved version/.test(failure.message));
    assert.equal(calls.length, 2); assert.deepEqual(JSON.parse(calls[1].body), { expectedVersion: 3, enabled });
  }
});

test('enrollment validates resource binding, version, approval, timestamp and synthetic mode separately from legacy DTO', async () => {
  for (const patch of [{ campaignId: 'foreign' }, { organizationId: 'foreign' }, { version: 0 }, { version: '3' },
    { enabled: 1 }, { financialMode: 'devnet' }, { updatedAt: 'today' }, { updatedAt: -1 },
    { approvedContentHash: null }, { approvedContentHash: 'invalid' }]) {
    const { client } = fixture([session, { enrollment: { ...enrollment, ...patch } }]); await client.session();
    await assert.rejects(client.campaignServing(org, campaign), { status: 502, code: 'invalid_response' });
  }
  const { client } = fixture([session, { enrollment: { ...enrollment, enabled: false, approvedContentHash: null, privateSnapshot: 'discard' } }]);
  await client.session();
  assert.deepEqual(await client.campaignServing(org, campaign), { enrollment: { ...enrollment, enabled: false, approvedContentHash: null } });
});

test('serving success cannot substitute a different version or requested enabled value', async () => {
  for (const patch of [{ version: 4 }, { enabled: false }]) {
    const { client } = fixture([session, { enrollment: { ...enrollment, ...patch } }]); await client.session();
    await assert.rejects(client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: true }), { status: 502 });
  }
});

test('report projections keep only frozen public fields, including for competitor deliveries in app reports', async () => {
  const privateFields = { question: 'PRIVATE', contextHints: ['PRIVATE'], budgetCapBaseUnits: 'PRIVATE', apiKey: 'PRIVATE', deliveryToken: 'PRIVATE', decision: { evidence: 'PRIVATE' } };
  for (const [kind, report] of [['campaign', campaignReport], ['app', appReport]]) {
    const decorated = { ...report, ...privateFields, summary: { ...summary, ...privateFields },
      deliveries: [{ ...delivery, ...privateFields, creative: { approvedText: 'Public delivered text' } }] };
    const { client } = fixture([session, decorated]); await client.session();
    const projected = await (kind === 'app' ? client.appReport(org, app) : client.campaignReport(org, campaign));
    assert.deepEqual(projected, report);
    assert.equal(JSON.stringify(projected).includes('PRIVATE'), false);
  }
});

test('report schema, owner identity, unsupported mode and per-delivery owner bindings fail closed', async () => {
  for (const [kind, report, idField] of [['campaign', campaignReport, 'campaignId'], ['app', appReport, 'appId']]) {
    for (const patch of [{ schemaVersion: 'axp.product-state.v1' }, { financialMode: 'mainnet' }, { [idField]: 'foreign' },
      { deliveries: [{ ...delivery, [idField]: 'foreign' }] }]) {
      const { client } = fixture([session, { ...report, ...patch }]); await client.session();
      await assert.rejects(kind === 'app' ? client.appReport(org, app) : client.campaignReport(org, campaign), { status: 502 });
    }
  }
});

test('reports bound deliveries to 100, permit empty/reserved-only reports, and reject duplicates', async () => {
  const zero = { acceptedBaseUnits: '0', reservedBaseUnits: '2000', deliveryCount: 0 };
  const empty = { ...campaignReport, summary: zero, bySettlementNetwork: { 'solana-devnet': zero }, deliveries: [] };
  const { client } = fixture([session, empty]); await client.session();
  assert.deepEqual(await client.campaignReport(org, campaign), empty);
  const hundred = Array.from({ length: 100 }, (_, i) => ({ ...delivery, awardId: `award-${i}` }));
  const totals = { ...summary, deliveryCount: 101 };
  const bounded = { ...campaignReport, summary: totals, bySettlementNetwork: { 'solana-devnet': totals }, deliveries: hundred };
  const f = fixture([session, bounded]); await f.client.session();
  assert.equal((await f.client.campaignReport(org, campaign)).deliveries.length, 100);
  for (const deliveries of [[delivery, delivery], [...hundred, { ...delivery, awardId: 'award-101' }]]) {
    const f = fixture([session, { ...bounded, deliveries }]); await f.client.session();
    await assert.rejects(f.client.campaignReport(org, campaign), { status: 502 });
  }
});

test('summary and delivery amounts are exact integer strings; malformed counts/rails/receipts fail closed', async () => {
  for (const patch of [{ acceptedBaseUnits: 3000 }, { reservedBaseUnits: '-1' }, { acceptedBaseUnits: '01' },
    { acceptedBaseUnits: '1e3' }, { deliveryCount: -1 }, { deliveryCount: 1.5 }]) {
    const { client } = fixture([session, { ...campaignReport, summary: { ...summary, ...patch } }]); await client.session();
    await assert.rejects(client.campaignReport(org, campaign), { status: 502 });
  }
  for (const patch of [{ amountBaseUnits: '0' }, { amountBaseUnits: '0.003' }, { amountBaseUnits: 3000 },
    { acceptedAt: 'today' }, { receiptHash: 'missing' }, { settlementNetwork: 'mainnet' }, { awardId: '' }]) {
    const { client } = fixture([session, { ...campaignReport, deliveries: [{ ...delivery, ...patch }] }]); await client.session();
    await assert.rejects(client.campaignReport(org, campaign), { status: 502 });
  }
  for (const bySettlementNetwork of [{ mainnet: summary }, { 'solana-devnet': { ...summary, reservedBaseUnits: null } }, { 'solana-devnet': { ...summary, deliveryCount: 0 } }, {}]) {
    const { client } = fixture([session, { ...campaignReport, bySettlementNetwork }]); await client.session();
    await assert.rejects(client.campaignReport(org, campaign), { status: 502 });
  }
});

test('Solana/Tempo report summaries stay distinct, without recomputing or treating amounts as funded balances', async () => {
  const tempo = { acceptedBaseUnits: '7000', reservedBaseUnits: '0', deliveryCount: 2 };
  const report = { ...appReport, summary,
    bySettlementNetwork: { 'solana-devnet': summary, 'tempo-testnet': tempo },
    deliveries: [delivery, { ...delivery, awardId: 'tempo-award', campaignId: 'another-public-campaign', settlementNetwork: 'tempo-testnet', amountBaseUnits: '7000' }] };
  const { client } = fixture([session, report]); await client.session();
  assert.deepEqual(await client.appReport(org, app), report);
});

test('Tempo-only deliveries remain valid when the compatibility Solana summary is zero', async () => {
  const zero = { acceptedBaseUnits: '0', reservedBaseUnits: '0', deliveryCount: 0 };
  const report = { ...appReport, summary: zero, bySettlementNetwork: { 'solana-devnet': zero, 'tempo-testnet': summary },
    deliveries: [{ ...delivery, settlementNetwork: 'tempo-testnet' }] };
  const { client } = fixture([session, report]); await client.session();
  assert.deepEqual(await client.appReport(org, app), report);
});

test('encoded path IDs cannot inject routes or report parameters', async () => {
  const weirdOrg = 'org/other?owner=x', weirdCampaign = 'campaign/other?x=y', weirdApp = 'app/other#private';
  const { client, calls } = fixture([session, { enrollment: null }, { ...campaignReport, campaignId: weirdCampaign, deliveries: [] }, { ...appReport, appId: weirdApp, deliveries: [] }]);
  await client.session(); await client.campaignServing(weirdOrg, weirdCampaign);
  await client.campaignReport(weirdOrg, weirdCampaign); await client.appReport(weirdOrg, weirdApp);
  assert.equal(calls[1].url, `/api/accounts/organizations/${encodeURIComponent(weirdOrg)}/campaigns/${encodeURIComponent(weirdCampaign)}/serving`);
  assert.equal(calls[2].url, `/api/accounts/organizations/${encodeURIComponent(weirdOrg)}/campaigns/${encodeURIComponent(weirdCampaign)}/report`);
  assert.equal(calls[3].url, `/api/accounts/organizations/${encodeURIComponent(weirdOrg)}/apps/${encodeURIComponent(weirdApp)}/report`);
});

test('401 expires all owner authority; CSRF/unavailable/rate-limit errors never retry writes or expose diagnostics', async () => {
  for (const [status, code] of [[403, 'csrf_invalid'], [503, 'account_network_unavailable'], [429, 'rate_limited'], [401, 'authentication_required']]) {
    const { client, calls } = fixture([session, () => json({ error: { code, message: 'PRIVATE_BACKEND_DETAIL' } }, status)]);
    await client.session();
    await assert.rejects(client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: true }), failure => failure.status === status && !failure.message.includes('PRIVATE'));
    assert.equal(calls.length, 2);
    if (status === 401) for (const operation of operations(client)) await assert.rejects(operation(), { status: 401 });
    assert.equal(calls.length, 2);
  }
});

test('logout invalidates in-flight report and enrollment responses', async () => {
  for (const [operation, response] of [[client => client.campaignReport(org, campaign), campaignReport],
    [client => client.appReport(org, app), appReport], [client => client.campaignServing(org, campaign), { enrollment }],
    [client => client.setCampaignServing(org, campaign, { expectedVersion: 3, enabled: true }), { enrollment }]]) {
    let resolve;
    const { client } = fixture([session, () => new Promise(done => { resolve = done; })]);
    await client.session(); const pending = operation(client); client.clearSession(); resolve(json(response));
    await assert.rejects(pending, { status: 401, code: 'session_changed' });
  }
});

test('readiness accepts actual health campaignServing and SDK examples cover modes without requesting an ad', async () => {
  const health = { enabled: true, provider: 'supabase', configured: { origin: true, provider: true, store: true }, capabilities };
  assert.equal((await fixture([health]).client.health()).capabilities.campaignServing, true);
  const example = accountSDKExample('https://fixture.example.test', true);
  assert.match(example, /config.financialMode/); assert.match(example, /synthetic: receipt accrual/);
  assert.match(example, /devnet: requires finalized own-wallet funding/);
  assert.doesNotMatch(example, /must be 'synthetic'|No native funding is connected/);
  assert.match(example, /config.servingEnabled/); assert.match(example, /recovery readiness/);
  assert.doesNotMatch(example, /requestAd\(|renderAd\(|\/api\/product|axp_app_[a-f0-9]{64}/);
});

test('account UI source gates by health, preserves secret guards and handles serving conflicts without write retries', () => {
  const read = name => readFileSync(new URL(`../apps/product-ui/src/components/accounts/${name}`, import.meta.url), 'utf8');
  const console = read('AccountConsole.tsx'), serving = read('servingResources.tsx'), resources = read('newResourceForms.tsx');
  assert.match(console, /const servingReady = Boolean\(ready && authenticated && health\?\.capabilities.campaignServing\)/);
  assert.match(console, /clearResourceSecret\(\);\s*if \(lock.current\) return/);
  assert.match(console, /epoch !== secretEpoch.current/);
  assert.match(console, /onSubmitCapture=\{clearResourceSecret\} onChangeCapture=\{clearResourceSecret\}/);
  assert.match(resources, /renderServing=.*dirty => <CampaignServing/);
  assert.match(serving, /expectedVersion: campaign.version, enabled: nextEnabled/);
  assert.match(serving, /failure.code === 'campaign_version_conflict'\) onConflict\(\)/);
  assert.match(serving, /\|\| dirty \|\| campaign.status !== 'approved'/);
  assert.match(serving, /setKnown\(false\); setEnrollment\(null\)/);
  assert.match(serving, /Object.entries\(report.bySettlementNetwork\)/);
  assert.doesNotMatch(serving, /report.summary.(acceptedBaseUnits|reservedBaseUnits|deliveryCount)/);
  assert.match(serving, /let active = true/); assert.match(serving, /active = false/);
  for (const source of [console, serving, resources]) assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|navigator\.clipboard|console\.(log|debug|info)/);
  const types = read('types.ts');
  assert.match(types, /servingStatus: 'not_connected'/);
  assert.match(types, /schemaVersion: 'account-campaign-report.v1'/); assert.match(types, /schemaVersion: 'account-app-report.v1'/);
});

test('owner integration readiness is session-bound, projected and validates gates without an SDK key', async () => {
  const gates = {credential:true,restrictions:true,catalogue:true,inventory:true,provider:true,funding:true,broadcasts:true};
  const readiness = {schemaVersion:'account-app-integration.v1',appId:app,financialMode:'synthetic',apiBasePath:'/api/accounts/sdk',
    activeCredentialCount:1,gates,ready:true,execution:'fixture',recoverySupported:true,broadcastEnabled:false};
  const {client,calls} = fixture([session,{...readiness,apiKey:'PRIVATE',packet:'PRIVATE',gates:{...gates,extra:'PRIVATE'}}]);
  await client.session();assert.deepEqual(await client.appIntegration(org,app),readiness);
  assert.equal(new Headers(calls[1].headers).has('x-axp-publisher-key'),false);
  for(const patch of [{appId:'foreign'},{activeCredentialCount:0},{ready:false},{financialMode:'mainnet'},{gates:{...gates,provider:'yes'}}]){
    const f=fixture([session,{...readiness,...patch}]);await f.client.session();await assert.rejects(f.client.appIntegration(org,app),{status:502});
  }
  let resolve;const pending=fixture([session,()=>new Promise(done=>{resolve=done;})]);await pending.client.session();
  const result=pending.client.appIntegration(org,app);pending.client.clearSession();resolve(json(readiness));await assert.rejects(result,{code:'session_changed'});
});

test('activity DTOs are bounded, owner-bound and drop private additions',async()=>{
  const entry={opportunityId:delivery.opportunityId,appId:app,campaignId:campaign,campaignVersionId:delivery.campaignVersionId,
    settlementNetwork:'solana-devnet',disposition:'won',decision:'bid',execution:'fixture',reasonCodes:['declared_fit_supported'],
    bidBaseUnits:'3000',awardId:delivery.awardId,deliveryStatus:'accepted'};
  const report={...campaignReport,activity:[entry],activityTotal:1};
  const f=fixture([session,{...report,activity:[{...entry,question:'PRIVATE',packet:'PRIVATE',deliveryToken:'PRIVATE'}]}]);await f.client.session();
  assert.deepEqual(await f.client.campaignReport(org,campaign),report);
  for(const patch of [{activityTotal:0},{activity:Array(101).fill(entry)},{activity:[{...entry,campaignId:'foreign'}]},
    {activity:[{...entry,execution:'live'}]},{activity:[{...entry,reasonCodes:['<private text>']}]},{activity:[{...entry,bidBaseUnits:3000}]}]){
    const invalid=fixture([session,{...report,...patch}]);await invalid.client.session();await assert.rejects(invalid.client.campaignReport(org,campaign),{status:502});
  }
});
