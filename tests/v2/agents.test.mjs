import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createPairedHarness } from '../../packages/v2/agents.mjs';
import { QUESTIONS, CAMPAIGNS, mlCampaign } from '../../packages/v2/config.mjs';
import { hash, ContractError } from '../../packages/ml/core.mjs';
import { validateDecision } from '../../packages/ml/engines/contract.mjs';
import { jevResponse } from '../ml/fixtures.mjs';

const manifest = { schemaVersion: 'fixture-manifest.v1', snapshotId: 'fixture-v2', contentHash: hash('fixture-source'), materialKind: 'fixture' };
function retrieveFixture(task, campaign) {
  const profile = { schemaVersion: 'retrieved-campaign-profile.v1', profileId: 'fixture-profile:' + hash([task, campaign]).slice(0, 20),
    campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId, campaignContentHash: hash(campaign),
    snapshotId: manifest.snapshotId, snapshotContentHash: manifest.contentHash, retrievalMethod: 'lexical_fallback', historyStatus: 'ready',
    observedExamples: [{ id: 'observed-1', text: 'Historical association: compare self-custody wallets for Ethereum and Solana.' }],
    contrastExamples: [], inferredHints: [{ id: 'hint-1', text: 'Inferred interest in offline key storage, not a verified product capability.', tier: 'sparse', qualityFlags: ['inferred_not_observed'] }] };
  profile.profileHash = hash(profile);
  return { method: 'lexical_fallback', fallback: true, sourceHash: manifest.contentHash,
    examples: [{ id: 'observed-1', text: profile.observedExamples[0].text }], hints: profile.inferredHints, profile };
}
const retriever = () => ({ manifest: structuredClone(manifest), retrieve: retrieveFixture });
const inputs = () => ({ questions: [...QUESTIONS], campaigns: CAMPAIGNS.map(c => mlCampaign(c)), opportunityIds: ['opportunity-one', 'opportunity-two'] });
function fixture(t, options = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'v2-agents-'));
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));
  const args = { stateDir, runId: 'fixture-v2-paired', retriever: retriever(), ...options };
  return { stateDir, args, harness: createPairedHarness(args) };
}
const database = (stateDir, work) => {
  const db = new DatabaseSync(join(stateDir, 'paired-harness.sqlite'));
  try { return work(db); } finally { db.close(); }
};

test('full frozen 2×3×2 pair uses own ML declarations/evidence, admits before all 12 fake calls and replays', async t => {
  let attempts = 0;
  const seen = [];
  const f = fixture(t, { transport: async (payload, { signal }) => {
    attempts++; seen.push(payload); assert.ok(signal);
    assert.equal(f.harness.status().admittedCalls, attempts);
    assert.equal(f.harness.results().filter(r => r.status === 'admitted').length, 1);
    assert.equal(payload.state.opportunity.taskConstraints.requiredCapabilities, undefined);
    const c = payload.state.campaign;
    assert.deepEqual(c, inputs().campaigns.find(x => x.campaignVersionId === c.campaignVersionId));
    assert.deepEqual(Object.keys(payload.state), ['opportunity', 'campaign', 'evidence']);
    assert.doesNotMatch(JSON.stringify(payload), /budgetCapBaseUnits|maxBidBaseUnits|depositBaseUnits|channelId|competitors|apiKey|Authorization|vectors/);
    assert.equal(Buffer.byteLength(JSON.stringify(payload)) <= 8192, true);
    if (c.campaignId === 'v2-leatherguard') return jevResponse(payload, 0, 2, 'no_fit');
    return jevResponse(payload, 3, 2);
  } });
  assert.equal(f.harness.status().remainingCalls, 12);
  assert.deepEqual(f.harness.results(), []);
  const result = await f.harness.run(inputs());
  assert.equal(attempts, 12); assert.equal(result.length, 12);
  assert.equal(new Set(result.map(r => r.callId)).size, 12);
  assert.equal(new Set(result.map(r => r.requestHash)).size, 12);
  for (const r of result) {
    assert.equal(r.status, 'completed'); assert.equal(r.decision.opportunityId, inputs().opportunityIds[r.questionIndex]);
    assert.equal(r.decision.engineProvenance.fallbackOrigin, null);
    assert.equal(r.decision.engineProvenance.transportMode, 'fixture');
    assert.deepEqual(r.rawOutput.usage, { input_tokens: 100, output_tokens: 20 });
    assert.ok(r.startedAt <= r.completedAt); assert.ok(r.elapsedMs >= 0);
    assert.equal(r.retrieval === null, r.arm === 'text_only');
  }
  assert.equal(seen.filter(p => p.state.evidence === null).length, 6);
  assert.equal(seen.filter(p => p.state.evidence?.observed.length === 1).length, 6);
  assert.equal(result.filter(r => r.decision.decision === 'skip').length, 4);
  const state = f.harness.status(); assert.equal(state.admittedCalls, 12); assert.equal(state.remainingCalls, 0);
  assert.equal(state.admitted, 12); assert.equal(state.remaining, 0);
  assert.equal(state.usage.inputTokens, 1200); assert.equal(state.usage.outputTokens, 240); assert.equal(state.usage.unknownUsageCalls, 0);
  for (const k of ['inputHash', 'freezeHash', 'manifestHash', 'policyHash']) assert.match(state[k], /^[a-f0-9]{64}$/);
  assert.deepEqual(await f.harness.run(inputs()), result);
  const restarted = createPairedHarness({ ...f.args, transport: () => { throw new Error('replay must not invoke'); },
    retriever: { manifest, retrieve: () => { throw new Error('replay must not retrieve'); } } });
  assert.deepEqual(await restarted.run(inputs()), result); assert.equal(attempts, 12);
  assert.equal(restarted.status().remainingCalls, 0);
  database(f.stateDir, db => {
    for (const { data } of db.prepare('SELECT data FROM paired_calls').all()) {
      const row = JSON.parse(data); validateDecision(row.decision, row.request);
      assert.equal(Date.parse(row.request.options.deadlineAt) - row.admittedAt, 12000);
    }
  });
});

test('changed questions, campaigns, opportunity bindings, manifest and run ID cannot reset allowance', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => { calls++; return jevResponse(p); } });
  await f.harness.run(inputs());
  for (const mutate of [x => x.questions.reverse(), x => x.campaigns.reverse(), x => x.campaigns[0].creatives[0].approvedText += ' Changed.',
    x => x.opportunityIds.reverse(), x => delete x.opportunityIds]) {
    const changed = inputs(); mutate(changed); await assert.rejects(f.harness.run(changed), { code: 'paired_inputs_changed' });
  }
  const changedRetriever = retriever(); changedRetriever.manifest.contentHash = hash('changed');
  const changed = createPairedHarness({ ...f.args, retriever: changedRetriever });
  await assert.rejects(changed.run(inputs()), { code: 'paired_inputs_changed' });
  assert.throws(() => createPairedHarness({ ...f.args, runId: 'new-run' }).status(), { code: 'paired_run_identity_conflict' });
  assert.equal(calls, 12); assert.equal(f.harness.status().remainingCalls, 0);
});

test('strict bounds, invalid DTOs/unknown financial fields and nonfrozen questions reject before fake invocation', async t => {
  let calls = 0;
  const f = fixture(t, { transport: () => { calls++; throw new Error('must not call'); } });
  for (const mutate of [x => x.questions.push(QUESTIONS[0]), x => x.questions = [], x => x.questions[0] = 'unfrozen question',
    x => x.campaigns.push(x.campaigns[0]), x => x.campaigns[1] = x.campaigns[0], x => x.campaigns[0].budget = '10',
    x => x.campaigns[0].wallet = 'key', x => x.opportunityIds = ['only-one'], x => x.opportunityIds = ['same', 'same']]) {
    const invalid = inputs(); mutate(invalid); await assert.rejects(f.harness.run(invalid));
  }
  assert.equal(calls, 0); assert.equal(f.harness.status().frozen, false);
});

test('missing history, invalid profile hashes/bindings and retrieval failure abstain, never run a text substitute', async t => {
  for (const mode of ['unavailable', 'throw', 'wrong-hash', 'wrong-campaign', 'wrong-method']) {
    let calls = 0;
    const evidence = retriever(); evidence.retrieve = (task, campaign) => {
      if (mode === 'throw') throw new Error('private-token-must-not-persist');
      const r = retrieveFixture(task, campaign);
      if (mode === 'unavailable') { r.method = 'unavailable'; r.profile = null; }
      if (mode === 'wrong-hash') r.profile.profileHash = hash('wrong');
      if (mode === 'wrong-campaign') r.profile.campaignVersionId = 'other-campaign';
      if (mode === 'wrong-method') r.method = 'vector';
      return r;
    };
    const f = fixture(t, { retriever: evidence, transport: p => { calls++; assert.equal(p.state.evidence, null); return jevResponse(p); } });
    const result = await f.harness.run(inputs());
    assert.equal(calls, 6); assert.equal(f.harness.status().admittedCalls, 6);
    for (const r of result.filter(r => r.arm === 'history')) {
      assert.equal(r.status, 'unavailable'); assert.equal(r.decision.decision, 'abstain'); assert.equal(r.rawOutput, null);
      assert.equal(r.decision.relevanceLevel, null); assert.equal(r.decision.engineProvenance.fallbackOrigin, null);
    }
    assert.doesNotMatch(JSON.stringify(result), /private-token-must-not-persist/);
    await f.harness.run(inputs()); assert.equal(calls, 6);
  }
});

test('provider schema errors, insufficient evidence, HTTP error and generic failures preserve original results and usage', async t => {
  let calls = 0;
  const f = fixture(t, { transport: p => {
    calls++;
    if (calls === 1) { const r = jevResponse(p); r.answers.creative.choice = 'invented'; return r; }
    if (calls === 2) { const r = jevResponse(p); r.answers.sufficient.noul = .3; return r; }
    if (calls === 3) throw new ContractError('jev_http_503');
    if (calls === 4) throw new Error('private credential should not persist');
    return jevResponse(p);
  } });
  const result = await f.harness.run(inputs());
  assert.equal(result[0].rawOutput.answers.creative.choice, 'invented'); assert.equal(result[0].status, 'failed');
  assert.equal(result[0].decision.decision, 'abstain'); assert.deepEqual(result[0].usage, { inputTokens: 100, outputTokens: 20 });
  assert.equal(result[1].decision.engineProvenance.outcome, 'abstained'); assert.equal(result[1].status, 'completed');
  assert.equal(result[2].failure.code, 'jev_http_503'); assert.equal(result[2].status, 'uncertain');
  assert.equal(result[3].failure.code, 'transport_error'); assert.equal(result[3].status, 'uncertain');
  assert.doesNotMatch(JSON.stringify(result), /private credential/);
  assert.equal(f.harness.status().usage.unknownUsageCalls, 2);
  const restart = createPairedHarness({ ...f.args, transport: () => { throw new Error('cannot repeat'); } });
  assert.deepEqual(await restart.run(inputs()), result); assert.equal(calls, 12);
});

test('late responses remain timeout abstentions with original provider output and no retry', async t => {
  let clock = 1800000000000, calls = 0;
  const f = fixture(t, { now: () => clock, transport: p => { calls++; clock += 12001; return jevResponse(p); } });
  const result = await f.harness.run(inputs());
  assert.equal(calls, 12);
  for (const r of result) { assert.equal(r.decision.engineProvenance.outcome, 'timeout'); assert.equal(r.decision.decision, 'abstain'); assert.ok(r.rawOutput); }
  await f.harness.run(inputs()); assert.equal(calls, 12);
});

test('live disabled requires no credential and performs no HTTP; unavailable outputs are durable', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('NO NETWORK IN TESTS'); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const f = fixture(t);
  const result = await f.harness.run(inputs());
  assert.equal(result.length, 12); assert.equal(f.harness.status().admittedCalls, 0);
  for (const r of result) { assert.equal(r.status, 'unavailable'); assert.equal(r.decision.decision, 'abstain'); assert.equal(r.failure.code, 'paid_calls_unapproved'); }
  assert.deepEqual(await createPairedHarness({ ...f.args, liveEnabled: true }).run(inputs()), result);
});

test('two concurrent harness instances atomically admit each key once, never more than 12', async t => {
  let calls = 0; const seen = new Set();
  const fake = async p => {
    calls++; const key = hash(p); assert.ok(!seen.has(key)); seen.add(key);
    await new Promise(resolve => setTimeout(resolve, 2)); return jevResponse(p);
  };
  const f = fixture(t, { transport: fake });
  const other = createPairedHarness(f.args);
  await Promise.all([f.harness.run(inputs()), other.run(inputs())]);
  assert.equal(calls, 12); assert.equal(f.harness.status().admittedCalls, 12); assert.equal(f.harness.status().remainingCalls, 0);
  assert.equal(f.harness.results().filter(r => r.status === 'completed').length, 12);
});

test('process exit after durable admission never repeats that uncertain call or restores allowance', async t => {
  const f = fixture(t, { transport: p => jevResponse(p) });
  const script = `
    const {createPairedHarness} = await import(${JSON.stringify(new URL('../../packages/v2/agents.mjs', import.meta.url).href)});
    const {hash} = await import(${JSON.stringify(new URL('../../packages/ml/core.mjs', import.meta.url).href)});
    const {manifest, input, stateDir} = JSON.parse(process.env.V2_FIXTURE);
    const retrieve = ${retrieveFixture.toString()};
    const harness = createPairedHarness({stateDir,runId:'fixture-v2-paired',retriever:{manifest,retrieve},transport:()=>process.exit(37)});
    await harness.run(input);
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script],
    { env: { ...process.env, V2_FIXTURE: JSON.stringify({ manifest, input: inputs(), stateDir: f.stateDir }) }, timeout: 10000 });
  assert.equal(child.status, 37, child.stderr?.toString());
  assert.equal(f.harness.status().admittedCalls, 1); assert.equal(f.harness.status().remainingCalls, 11);
  let calls = 0;
  const restart = createPairedHarness({ ...f.args, transport: p => { calls++; return jevResponse(p); } });
  const result = await restart.run(inputs());
  assert.equal(calls, 11); assert.equal(result.length, 12); assert.equal(result[0].status, 'admitted');
  assert.equal(result[0].decision.decision, 'abstain'); assert.equal(result[0].decision.engineProvenance.failureReason, 'call_uncertain');
  assert.equal(restart.status().uncertainCalls, 1); assert.equal(restart.status().remainingCalls, 0);
  assert.deepEqual(await restart.run(inputs()), result); assert.equal(calls, 11);
});

test('process exit after output capture preserves raw output/usage but never recovers an uncertain bid', async t => {
  const f = fixture(t, { transport: p => jevResponse(p) });
  const script = `
    const {createPairedHarness} = await import(${JSON.stringify(new URL('../../packages/v2/agents.mjs', import.meta.url).href)});
    const {hash} = await import(${JSON.stringify(new URL('../../packages/ml/core.mjs', import.meta.url).href)});
    const {jevResponse} = await import(${JSON.stringify(new URL('../ml/fixtures.mjs', import.meta.url).href)});
    const {manifest, input, stateDir} = JSON.parse(process.env.V2_FIXTURE);
    const retrieve = ${retrieveFixture.toString()};
    const harness = createPairedHarness({stateDir,runId:'fixture-v2-paired',retriever:{manifest,retrieve},transport:payload=>{
      const raw = jevResponse(payload), answers = raw.answers; let reads = 0;
      Object.defineProperty(raw,'answers',{enumerable:true,get(){if(++reads===2)process.exit(38);return answers;}});
      return raw;
    }});
    await harness.run(input);
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script],
    { env: { ...process.env, V2_FIXTURE: JSON.stringify({ manifest, input: inputs(), stateDir: f.stateDir }) }, timeout: 10000 });
  assert.equal(child.status, 38, child.stderr?.toString());
  const original = f.harness.results()[0];
  assert.equal(original.status, 'admitted'); assert.ok(original.rawOutput.answers);
  assert.equal(original.decision.decision, 'abstain'); assert.equal(original.usage.inputTokens, 100);
  let calls = 0;
  const restart = createPairedHarness({ ...f.args, transport: p => { calls++; return jevResponse(p); } });
  const result = await restart.run(inputs());
  assert.equal(calls, 11); assert.deepEqual(result[0], original);
  assert.equal(result[0].decision.decision, 'abstain'); assert.equal(restart.status().admitted, 12);
  assert.equal(restart.status().remaining, 0); assert.equal(restart.status().usage.inputTokens, 1200);
});

test('implicit opportunity IDs are deterministic across restart; subsets remain bounded', async t => {
  const f = fixture(t, { transport: p => jevResponse(p) });
  const input = { questions: [QUESTIONS[0]], campaigns: [mlCampaign(CAMPAIGNS[0])] };
  const result = await f.harness.run(input); assert.equal(result.length, 2);
  assert.equal(result[0].decision.opportunityId, result[1].decision.opportunityId);
  assert.deepEqual(await createPairedHarness(f.args).run(input), result);
});

test('exact caller ML DTO including own targeting text binds retrieval profile and both arms', async t => {
  const input = inputs();
  input.campaigns[0].creatives[0].approvedText += '\nAdvertiser-declared targeting: compare offline self-custody.';
  const calls = [];
  const f = fixture(t, { transport: p => { calls.push(p); return jevResponse(p); } });
  const result = await f.harness.run(input);
  const own = calls.filter(p => p.state.campaign.campaignId === input.campaigns[0].campaignId);
  assert.equal(own.length, 4);
  own.forEach(p => assert.deepEqual(p.state.campaign, input.campaigns[0]));
  for (const r of result.filter(r => r.campaignId === input.campaigns[0].campaignId && r.arm === 'history')) {
    assert.equal(r.retrieval.profile.campaignContentHash, hash(input.campaigns[0])); assert.equal(r.status, 'completed');
  }
});

test('live key validation is unavailable before admission and never performs HTTP', async t => {
  const f = fixture(t, { liveEnabled: true });
  const result = await f.harness.run(inputs());
  assert.equal(f.harness.status().admitted, 0);
  result.forEach(r => { assert.equal(r.status, 'unavailable'); assert.equal(r.failure.code, 'jev_key_unavailable'); });
});

test('oversized and credential-bearing malformed provider outputs are hash-only failures, never corrected', async t => {
  const apiKey = 'fixture-private-key-not-for-export-123456';
  let calls = 0;
  const f = fixture(t, { apiKey, transport: p => {
    calls++;
    const r = jevResponse(p);
    if (calls === 1) r.unexpected = 'x'.repeat(65537);
    if (calls === 2) r.unexpected = apiKey;
    if (calls === 3) r.authorization = 'Bearer fixture-not-a-token-123456';
    if (calls === 4) return null;
    return r;
  } });
  const result = await f.harness.run(inputs());
  assert.equal(result[0].responseRejected, 'jev_response_limit'); assert.ok(result[0].responseBytes > 65536);
  for (const r of result.slice(0, 3)) { assert.equal(r.status, 'failed'); assert.equal(r.rawOutput, null); assert.match(r.rawOutputHash, /^[a-f0-9]{64}$/); assert.equal(r.decision.decision, 'abstain'); }
  assert.equal(result[1].responseRejected, 'jev_response_unsafe'); assert.equal(result[2].responseRejected, 'jev_response_unsafe');
  assert.equal(result[3].status, 'failed'); assert.equal(result[3].responseReceived, true);
  assert.ok(!JSON.stringify(result).includes(apiKey)); assert.doesNotMatch(JSON.stringify(result), /Bearer fixture/);
  const saved = database(f.stateDir, db => JSON.stringify(db.prepare('SELECT data FROM paired_calls').all()) + JSON.stringify(db.prepare('SELECT data FROM paired_run').all()));
  assert.ok(!saved.includes(apiKey)); assert.doesNotMatch(saved, /Bearer fixture/);
  await f.harness.run(inputs()); assert.equal(calls, 12);
});
