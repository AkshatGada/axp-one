import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createV3Harness } from '../../packages/v3/agents.mjs';
import { CAMPAIGNS, QUESTIONS, mlCampaign, POLICY } from '../../packages/v3/config.mjs';
import { loadEvidence, promptHash } from '../../packages/v2/evidence.mjs';
import { hash, textHash, ContractError } from '../../packages/ml/core.mjs';
import { validateDecision } from '../../packages/ml/engines/contract.mjs';
import { buildJevRequest } from '../../packages/ml/engines/jev.mjs';
import { createJevHttpTransport } from '../../packages/ml/engines/jev-http.mjs';
import { jevResponse } from '../ml/fixtures.mjs';

const manifest = { schemaVersion: 'fixture-manifest.v1', snapshotId: 'v3-fixture', contentHash: hash('fixture-source') };
function retrieveFixture(task, campaign) {
  const profile = { schemaVersion: 'retrieved-campaign-profile.v1', profileId: 'profile:' + hash([task, campaign]).slice(0, 20),
    campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId, campaignContentHash: hash(campaign),
    snapshotId: manifest.snapshotId, snapshotContentHash: manifest.contentHash, retrievalMethod: 'lexical_fallback', historyStatus: 'ready',
    observedExamples: [{ id: 'observed-1', text: 'Historical reference, not campaign capabilities: offline hardware self-custody comparison.' }],
    contrastExamples: [], inferredHints: [{ id: 'hint-1', text: 'Inferred interest in offline storage, not verified capability.', tier: 'sparse', qualityFlags: ['inferred_not_observed', 'sparse_hint'] }] };
  profile.profileHash = hash(profile);
  return { method: 'lexical_fallback', fallback: true, sourceHash: manifest.contentHash, queryTextHash: promptHash(task),
    examples: profile.observedExamples, hints: profile.inferredHints, profile };
}
const retriever = () => ({ manifest: structuredClone(manifest), retrieve: retrieveFixture });
function slot(slotId = 'slot-1', options = {}) {
  return { slotId, question: QUESTIONS[0], questionIndex: 0, arm: 'history', campaign: mlCampaign(CAMPAIGNS[0], CAMPAIGNS[0].contextHints),
    opportunityId: 'opportunity-1', category: 'paired', ...options };
}
const paired = () => [0, 1].flatMap(questionIndex => CAMPAIGNS.flatMap(c => ['text_only', 'history'].map(arm => slot(`pair-${questionIndex}:${c.campaignId}:${arm}`,
  { question: QUESTIONS[questionIndex], questionIndex, arm, campaign: mlCampaign(c, c.contextHints), opportunityId: `opportunity-${questionIndex}` }))));
function fixture(t, options = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'v3-agents-'));
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));
  const args = { stateDir, runId: 'fixture-v3', retriever: retriever(), transport: p => jevResponse(p), ...options };
  return { stateDir, args, harness: createV3Harness(args) };
}
function database(stateDir, fn) {
  const db = new DatabaseSync(join(stateDir, 'v3-agents.sqlite'));
  try { return fn(db); } finally { db.close(); }
}

test('2×3×2 isolates all buyers including LeatherGuard, preserves exact packet/bindings and canonical decisions', async t => {
  let attempts = 0, retrieved = 0;
  const packets = [];
  const f = fixture(t, { retriever: { manifest, retrieve: (...args) => { retrieved++; return retrieveFixture(...args); } }, transport: (packet, { signal }) => {
    attempts++; packets.push(structuredClone(packet)); assert.ok(signal);
    const s = f.harness.status(); assert.equal(s.admittedCalls, attempts); assert.equal(s.plannedCalls, 12);
    assert.equal(f.harness.results().filter(r => r.status === 'admitted').length, 1);
    assert.deepEqual(Object.keys(packet.state), ['opportunity', 'campaign', 'evidence']);
    assert.doesNotMatch(JSON.stringify(packet), /budgetCapBaseUnits|maxBidBaseUnits|depositBaseUnits|channelId|competitors|apiKey|Authorization|"vector"/);
    const c = packet.state.campaign;
    assert.deepEqual(c, mlCampaign(CAMPAIGNS.find(x => x.campaignId === c.campaignId), CAMPAIGNS.find(x => x.campaignId === c.campaignId).contextHints));
    assert.deepEqual(packet.state.opportunity.taskConstraints, {});
    return c.campaignId === 'v3-leatherguard' ? jevResponse(packet, 0, 2, 'no_fit') : jevResponse(packet, 3, 2);
  } });
  const result = await f.harness.runSlots({ slots: paired() });
  assert.equal(result.length, 12); assert.equal(attempts, 12); assert.equal(retrieved, 6);
  assert.equal(result.filter(r => r.decision.decision === 'skip').length, 4);
  for (const [i, r] of result.entries()) {
    assert.equal(r.status, 'completed'); assert.equal(r.request.mode, 'sandbox'); validateDecision(r.decision, r.request);
    assert.equal(r.packetHash, hash(packets[i])); assert.deepEqual(r.packet, packets[i]);
    assert.deepEqual(buildJevRequest(r.request, POLICY.model), r.packet);
    assert.equal(r.requestHash, hash({ packet: r.packet, bindings: r.bindings, inputHash: r.inputHash }));
    assert.equal(r.bindings.campaignHash, hash(r.request.campaign)); assert.equal(r.bindings.opportunityId, r.decision.opportunityId);
    assert.equal(r.bindings.questionHash, textHash(r.question)); assert.equal(r.retrieval === null, r.arm === 'text_only');
    assert.equal(r.decision.engineProvenance.fallbackOrigin, null); assert.equal(r.decision.engineProvenance.transportMode, 'fixture');
    assert.equal(Date.parse(r.request.options.deadlineAt) - r.admittedAt, 12000);
  }
  assert.deepEqual(await f.harness.runSlots({ slots: paired() }), result);
  assert.equal(attempts, 12); assert.equal(retrieved, 6);
  const restarted = createV3Harness({ ...f.args, retriever: { manifest, retrieve: () => { throw Error('must not retrieve'); } }, transport: () => { throw Error('must not call'); } });
  assert.deepEqual(await restarted.runSlots({ slots: paired() }), result);
  assert.equal(restarted.status().categories.paired.remaining, 0); assert.equal(restarted.status().remainingCalls, 12);
  assert.equal(restarted.status().usage.inputTokens, 1200);
  const copy = structuredClone(result); copy[0].packet.model = 'tampered'; assert.notEqual(f.harness.results()[0].packet.model, 'tampered');
});

test('24 durable admissions enforce 12/3/6/3 categories including three referenced schema corrections', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => {
    calls++; const response = jevResponse(p);
    if (calls <= 3) response.answers.creative.choice = 'invented';
    return response;
  } });
  const pairs = paired(), failed = await f.harness.runSlots({ slots: pairs });
  const repeats = CAMPAIGNS.map((c, i) => slot(`repeat-${i}`, { campaign: mlCampaign(c), questionIndex: 2, opportunityId: 'repeat-opp', category: 'repeat' }));
  const lab = Array.from({ length: 6 }, (_, i) => slot(`lab-${i}`, { category: 'laboratory', opportunityId: 'lab-opp' }));
  const corrections = pairs.slice(0, 3).map(s => ({ ...s, slotId: 'fix:' + s.slotId, category: 'correction', correctionOf: s.slotId }));
  assert.ok(failed.slice(0, 3).every(r => r.status === 'failed' && r.documentedDefect.type === 'schema'));
  await f.harness.runSlots({ slots: repeats });
  const labs = await f.harness.runSlots({ slots: lab }); assert.ok(labs.every(r => r.request.mode === 'synthetic'));
  const fixed = await f.harness.runSlots({ slots: corrections }); assert.ok(fixed.every(r => r.documentedDefect.type === 'schema'));
  assert.equal(calls, 24); assert.equal(f.harness.status().remainingCalls, 0);
  for (const c of Object.values(f.harness.status().categories)) { assert.equal(c.admitted, c.limit); assert.equal(c.remaining, 0); }
  for (const category of ['paired', 'repeat', 'laboratory']) await assert.rejects(f.harness.runSlots({ slots: [slot('extra-' + category, { category })] }), { code: 'v3_category_limit' });
  const restart = createV3Harness({ ...f.args, transport: () => { throw Error('never rerun'); } });
  assert.equal(restart.status().admittedCalls, 24);
  assert.deepEqual(await restart.runSlots({ slots: corrections }), fixed);
  await f.harness.close(); assert.throws(() => f.harness.status(), { code: 'v3_harness_closed' });
});

test('all changed frozen bodies conflict before retrieval/calls; run/manifest/transport identities cannot reset limits', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => { calls++; return jevResponse(p); } });
  await f.harness.runSlots({ slots: [slot()] });
  for (const mutate of [s => s.question = QUESTIONS[1], s => s.questionIndex++, s => s.arm = 'text_only', s => s.category = 'laboratory',
    s => s.opportunityId = 'changed', s => s.campaign.creatives[0].approvedText += ' Changed targeting.']) {
    const s = slot(); mutate(s); await assert.rejects(f.harness.runSlots({ slots: [slot('would-be-new'), s] }), { code: 'v3_slot_input_conflict' });
  }
  for (const options of [{ runId: 'new-run' }, { retriever: { ...retriever(), manifest: { ...manifest, contentHash: hash('new') } } }, { transport: undefined }]) {
    const changed = createV3Harness({ ...f.args, ...options }); assert.throws(() => changed.status(), { code: 'v3_run_identity_conflict' });
  }
  assert.equal(calls, 1); assert.equal(f.harness.status().plannedCalls, 1);
});

test('invalid or financial slot DTOs reject before freezing/admission; caller mutation after runSlots cannot change body', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => { calls++; return jevResponse(p); } });
  for (const mutate of [s => s.campaign.budgetCapBaseUnits = '8000', s => s.campaign.competitors = [], s => s.question = 'human@example.com',
    s => s.category = 'lab', s => s.questionIndex = -1, s => s.arm = 'both', s => s.correctionOf = 'uncertain']) {
    const s = slot(); mutate(s); await assert.rejects(f.harness.runSlots({ slots: [s] }));
  }
  await assert.rejects(f.harness.runSlots({ slots: [slot(), slot()] }), { code: 'v3_duplicate_slot' });
  assert.equal(calls, 0); assert.equal(f.harness.status().plannedCalls, 0);
  const s = slot(), pending = f.harness.runSlots({ slots: [s] }); s.question = QUESTIONS[1]; s.campaign.creatives[0].approvedText = 'changed';
  assert.equal((await pending)[0].question, QUESTIONS[0]); assert.equal(calls, 1);
});

test('missing, mismatched and unsafe history abstains durably with no substitute/model call', async t => {
  for (const mode of ['throw', 'missing', 'hash', 'method', 'source', 'examples', 'query', 'secret', 'vector', 'private-source']) {
    let calls = 0;
    const r = retriever(); r.retrieve = (q, c) => {
      if (mode === 'throw') throw Error('private-error-do-not-export');
      const x = retrieveFixture(q, c);
      if (mode === 'missing') x.method = 'unavailable';
      if (mode === 'hash') x.profile.profileHash = hash('invalid');
      if (mode === 'method') x.method = 'vector';
      if (mode === 'source') x.sourceHash = hash('other');
      if (mode === 'examples') x.examples = [{ id: 'wrong', text: 'unbound' }];
      if (mode === 'query') x.queryTextHash = hash('other-question');
      if (mode === 'secret') x.secret = 'do-not-export';
      if (mode === 'vector') x.examples = [{ ...x.examples[0], vector: [1, 2] }];
      if (mode === 'private-source') x.examples = [{ ...x.examples[0], source: { database: 'ads', source: 'aws', sourceRefHash: hash('ref'), probeNiche: 'wallets', mappingNiche: 'wallets', status: 'ok', requestAssociated: true, customerGenerated: false, classification: null } }];
      return x;
    };
    const f = fixture(t, { retriever: r, transport: p => { calls++; return jevResponse(p); } });
    const result = await f.harness.runSlots({ slots: [slot()] });
    assert.equal(calls, 0); assert.equal(result[0].status, 'unavailable'); assert.equal(result[0].decision.decision, 'abstain');
    assert.equal(f.harness.status().admitted, 0); assert.doesNotMatch(JSON.stringify(result), /private-error|do-not-export/);
    assert.deepEqual(await f.harness.runSlots({ slots: [slot()] }), result);
  }
});

test('failures never fall back: retain invalid output, insufficient abstention, definitive HTTP failure and uncertainty', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => {
    calls++;
    if (calls === 1) { const x = jevResponse(p); x.answers.creative.choice = 'invented'; return x; }
    if (calls === 2) { const x = jevResponse(p); x.answers.sufficient.noul = .1; return x; }
    if (calls === 3) throw new ContractError('jev_http_400');
    if (calls === 4) throw Error('private-failure-token');
    return jevResponse(p, 0, 2, 'no_fit');
  } });
  const slots = Array.from({ length: 5 }, (_, i) => slot('failure-' + i));
  const result = await f.harness.runSlots({ slots });
  assert.deepEqual(result.map(r => r.status), ['failed', 'completed', 'failed', 'uncertain', 'completed']);
  assert.equal(result[0].rawOutput.answers.creative.choice, 'invented');
  assert.equal(result[1].decision.engineProvenance.outcome, 'abstained');
  assert.equal(result[2].documentedDefect.type, 'transport'); assert.equal(result[3].failure.code, 'transport_error');
  assert.ok(result.every(r => r.decision.engineProvenance.fallbackOrigin === null)); assert.doesNotMatch(JSON.stringify(result), /private-failure/);
  for (const i of [1, 3, 4]) await assert.rejects(f.harness.runSlots({ slots: [{ ...slots[i], slotId: 'correction-' + i, category: 'correction', correctionOf: slots[i].slotId }] }), { code: 'v3_documented_defect_required' });
  const correction = { ...slots[2], slotId: 'http-fix', category: 'correction', correctionOf: slots[2].slotId };
  const fixed = await f.harness.runSlots({ slots: [correction] }); assert.equal(fixed[0].status, 'completed');
  assert.equal(fixed[0].documentedDefect.failureHash, hash(result[2].failure));
  await assert.rejects(f.harness.runSlots({ slots: [{ ...correction, slotId: 'second-fix' }] }), { code: 'v3_defect_already_corrected' });
  assert.deepEqual(await f.harness.runSlots({ slots }), result); assert.equal(calls, 6);
});

test('corrections preserve task/campaign/opportunity bindings and cannot double-reference a defect in one batch', async t => {
  const f = fixture(t, { transport: p => ({ ...jevResponse(p), extra: true }) });
  await f.harness.runSlots({ slots: [slot()] });
  const corrected = { ...slot('fix'), category: 'correction', correctionOf: 'slot-1' };
  await assert.rejects(f.harness.runSlots({ slots: [{ ...corrected, opportunityId: 'new-opportunity' }] }), { code: 'v3_correction_binding_conflict' });
  await assert.rejects(f.harness.runSlots({ slots: [corrected, { ...corrected, slotId: 'fix-2' }] }), { code: 'v3_defect_already_corrected' });
  assert.equal(f.harness.status().plannedCalls, 1); assert.equal(f.harness.status().admitted, 1);
});

test('disabled/keyless live mode performs no network and durable unavailable slots are not silently retried', async t => {
  const previous = globalThis.fetch; globalThis.fetch = () => { throw Error('NO NETWORK'); };
  t.after(() => { globalThis.fetch = previous; });
  for (const liveEnabled of [false, true]) {
    const f = fixture(t, { transport: undefined, liveEnabled });
    const result = await f.harness.runSlots({ slots: [slot()] });
    assert.equal(result[0].request.mode, 'sandbox'); assert.equal(result[0].status, 'unavailable'); assert.equal(f.harness.status().admitted, 0);
    assert.equal(result[0].failure.code, liveEnabled ? 'jev_key_unavailable' : 'paid_calls_unapproved');
    const restart = createV3Harness({ ...f.args, liveEnabled: true, apiKey: 'fixture-long-enough-key-not-real' });
    assert.deepEqual(await restart.runSlots({ slots: [slot()] }), result);
  }
});

test('concurrent instances CAS-admit once and conflicting plans cannot change frozen evidence', async t => {
  let calls = 0;
  const f = fixture(t, { transport: async p => { calls++; await new Promise(resolve => setTimeout(resolve, 2)); return jevResponse(p); } });
  const other = createV3Harness(f.args);
  await Promise.all([f.harness.runSlots({ slots: paired() }), other.runSlots({ slots: paired() })]);
  assert.equal(calls, 12); assert.equal(f.harness.status().admitted, 12); assert.equal(f.harness.status().completedCalls, 12);
});

test('process death after admission or raw-output capture becomes uncertain and never repeats on restart', async t => {
  for (const afterCapture of [false, true]) {
    const f = fixture(t);
    const slots = [slot('interrupted', { arm: 'text_only' }), slot('pending', { arm: 'text_only' })];
    const script = `
      const {createV3Harness} = await import(${JSON.stringify(new URL('../../packages/v3/agents.mjs', import.meta.url).href)});
      const {jevResponse} = await import(${JSON.stringify(new URL('../ml/fixtures.mjs', import.meta.url).href)});
      const {stateDir,manifest,slots} = JSON.parse(process.env.V3_FIXTURE);
      const harness = createV3Harness({stateDir,runId:'fixture-v3',retriever:{manifest,retrieve(){throw Error('text needs no history');}},transport:p=>{
        if(!${afterCapture})process.exit(37);
        const raw=jevResponse(p), answers=raw.answers;let reads=0;
        Object.defineProperty(raw,'answers',{enumerable:true,get(){if(++reads===2)process.exit(38);return answers;}});
        return raw;
      }});
      await harness.runSlots({slots});
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script],
      { env: { ...process.env, V3_FIXTURE: JSON.stringify({ stateDir: f.stateDir, manifest, slots }) }, timeout: 10000 });
    assert.equal(child.status, afterCapture ? 38 : 37, child.stderr?.toString());
    assert.equal(f.harness.status().admitted, 1); assert.equal(f.harness.status().uncertainCalls, 1);
    const original = f.harness.results()[0]; assert.equal(original.status, 'uncertain');
    assert.equal(original.decision.decision, 'abstain'); assert.equal(!!original.rawOutput, afterCapture);
    let calls = 0;
    const restart = createV3Harness({ ...f.args, transport: p => { calls++; return jevResponse(p); }, retriever: { manifest, retrieve: () => { throw Error('no repeat retrieval'); } } });
    const results = await restart.runSlots({ slots });
    assert.deepEqual(results[0], original); assert.equal(results[1].status, 'completed'); assert.equal(calls, 1);
    assert.equal(restart.status().admitted, 2); assert.equal(restart.status().remainingCalls, 22);
    await assert.rejects(restart.runSlots({ slots: [{ ...slots[0], slotId: 'fix-uncertain', category: 'correction', correctionOf: slots[0].slotId }] }), { code: 'v3_documented_defect_required' });
    assert.deepEqual(await restart.runSlots({ slots }), results); assert.equal(calls, 1);
  }
});

test('late responses remain abstentions with no retry or uncertain-outcome correction', async t => {
  let clock = 1800000000000;
  const f = fixture(t, { now: () => clock, transport: p => { clock += 12001; return jevResponse(p); } });
  const result = await f.harness.runSlots({ slots: [slot()] });
  assert.equal(result[0].status, 'failed'); assert.equal(result[0].decision.engineProvenance.outcome, 'timeout');
  assert.equal(result[0].decision.decision, 'abstain'); assert.ok(result[0].rawOutput); assert.equal(result[0].documentedDefect, null);
  assert.deepEqual(await f.harness.runSlots({ slots: [slot()] }), result);
});

test('unsafe and oversized provider bodies are hash-only, credentials never enter disk or public projection', async t => {
  const apiKey = 'fixture-private-api-key-long-not-real'; let calls = 0;
  const f = fixture(t, { apiKey, transport: p => {
    calls++; return { ...jevResponse(p), extra: calls === 1 ? apiKey : 'x'.repeat(65537) };
  } });
  const result = await f.harness.runSlots({ slots: [slot(), slot('large')] });
  assert.deepEqual(result.map(r => r.responseRejected), ['jev_response_unsafe', 'jev_response_limit']);
  assert.ok(result.every(r => r.status === 'failed' && r.rawOutput === null && /^[a-f0-9]{64}$/.test(r.rawOutputHash)));
  const disk = database(f.stateDir, db => JSON.stringify(db.prepare('SELECT data FROM v3_slots').all()) + JSON.stringify(db.prepare('SELECT data FROM v3_run').all()));
  assert.ok(!disk.includes(apiKey)); assert.ok(!JSON.stringify(result).includes(apiKey));
  assert.deepEqual(await f.harness.runSlots({ slots: [slot(), slot('large')] }), result); assert.equal(calls, 2);
});

test('strict HTTP transport sends exactly the captured request bytes without real fetch', async t => {
  const bodies = [], apiKey = 'fixture-private-http-key-not-real';
  const transport = createJevHttpTransport({ apiKey, maxCalls: 24, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + apiKey); bodies.push(options.body);
    return { ok: true, text: async () => JSON.stringify(jevResponse(JSON.parse(options.body))) };
  } });
  const f = fixture(t, { apiKey, transport });
  const result = await f.harness.runSlots({ slots: [slot()] });
  assert.equal(bodies[0], JSON.stringify(result[0].packet)); assert.equal(bodies[0], result[0].packetBytes);
  assert.equal(result[0].packetBytesHash, textHash(bodies[0])); assert.equal(result[0].packetHash, hash(JSON.parse(bodies[0])));
  assert.equal(transport.usage().attempts, 1); assert.equal(result[0].status, 'completed');
  assert.ok(!JSON.stringify(result).includes(apiKey));
});

test('strict transport malformed JSON is a documented schema defect, not a retried uncertain network error', async t => {
  const apiKey = 'fixture-json-key-not-a-real-credential'; let calls = 0;
  const transport = createJevHttpTransport({ apiKey, fetchImpl: async (_url, options) => {
    calls++; return { ok: true, text: async () => calls === 1 ? '{broken' : JSON.stringify(jevResponse(JSON.parse(options.body))) };
  } });
  const f = fixture(t, { apiKey, transport });
  const original = (await f.harness.runSlots({ slots: [slot()] }))[0];
  assert.equal(original.status, 'failed'); assert.equal(original.documentedDefect.type, 'schema');
  assert.equal(original.failure.code, 'jev_response_invalid'); assert.equal(original.rawOutput, null);
  const correction = { ...slot('json-fix'), category: 'correction', correctionOf: 'slot-1' };
  const result = await f.harness.runSlots({ slots: [correction] }); assert.equal(result[0].status, 'completed'); assert.equal(calls, 2);
});

test('actual immutable V2 export is reused offline with exact cached/lexical packets and no artifact changes', async t => {
  const previous = globalThis.fetch; globalThis.fetch = () => { throw Error('NO NETWORK'); }; t.after(() => { globalThis.fetch = previous; });
  const files = ['manifest.json', 'catalogue.json', 'index.backend.json'].map(n => new URL('../../artifacts/v2/evidence/' + n, import.meta.url));
  const before = files.map(p => textHash(readFileSync(p)));
  const evidence = loadEvidence(), packets = [];
  const f = fixture(t, { retriever: evidence, transport: p => { packets.push(p); return jevResponse(p); } });
  const inputs = [slot('cached'), slot('uncached', { question: QUESTIONS[1], questionIndex: 1, opportunityId: 'offline-opp' })];
  const result = await f.harness.runSlots({ slots: inputs });
  assert.deepEqual(result.map(r => r.retrieval.method), ['vector', 'lexical_fallback']);
  assert.equal(packets.length, 2);
  result.forEach((r, i) => { assert.deepEqual(r.packet, packets[i]); assert.equal(r.bindings.profileHash, r.retrieval.profile.profileHash); assert.equal(r.status, 'completed'); });
  assert.deepEqual(files.map(p => textHash(readFileSync(p))), before);
});
