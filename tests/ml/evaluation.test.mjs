import test from 'node:test';
import assert from 'node:assert/strict';
import { freezeBenchmarkCases, runBenchmark, RuleDecisionEngine, JevDecisionEngine, pairedFamilyBootstrap, ndcgAt3, summarizeAttempts, quantile } from '../../packages/ml/index.mjs';
import { request } from './fixtures.mjs';

function cases() { return [{ id: 'case1', taskId: 'task1', familyId: 'family1', split: 'final_test', request: request(), labels: null }]; }
test('benchmark does not invent human labels, quality, costs or measured throughput', async () => {
  const result = await runBenchmark({ cases: cases(), arms: [{ id: 'rules', engine: new RuleDecisionEngine(), unavailableReason: null }, { id: 'history', engine: null, unavailableReason: 'corpus_pending' }], repetitions: 3 });
  assert.equal(result.manifest.labelStatus, 'human_labels_pending'); assert.equal(result.manifest.actualAttempts, 6); assert.equal(result.reports[0].valid, 3); assert.equal(result.reports[0].quality.ndcgAt3, null); assert.equal(result.reports[1].outcomes.unavailable, 3); assert.equal(result.reports[0].throughput, null); assert.equal(result.manifest.adoption, 'baseline_retained_pending_independent_labels_and_paid_trials');
});
test('case manifest reproduces; family split conflict and hard call bounds rejected before execution', async () => {
  assert.deepEqual(freezeBenchmarkCases(cases()), freezeBenchmarkCases(cases()));
  const mixed = cases(); mixed.push({ ...structuredClone(mixed[0]), id: 'case2', taskId: 'task2', split: 'validation' }); assert.throws(() => freezeBenchmarkCases(mixed), /benchmark_family_leakage/);
  let calls = 0; const engine = { async scoreOpportunity() { calls++; } }; await assert.rejects(runBenchmark({ cases: cases(), arms: [{ id: 'test', engine, unavailableReason: null }], repetitions: 3, maxAttempts: 2 }), /attempt_cap/); assert.equal(calls, 0);
});
test('paid engine is unavailable in local harness even if adapter is externally authorized', async () => {
  let calls = 0; const engine = new JevDecisionEngine({ model: 'jev-1.13.0', liveAuthorized: true, transport: async () => { calls++; } });
  const result = await runBenchmark({ cases: cases(), arms: [{ id: 'jev', engine, unavailableReason: null }], repetitions: 1 }); assert.equal(calls, 0); assert.equal(result.attempts[0].outcome, 'unavailable'); assert.equal(result.attempts[0].reason, 'paid_trials_pending');
});
test('fixture labels are not relabelled human truth; caller-supplied human labels enable metrics', async () => {
  const panel = cases(); panel[0].labels = { source: 'synthetic_assertion', reviewerIds: [], commercialIntentLevel: 3, relevanceLevels: { 'bay-solo-v1': 3 }, acceptableCreativeIds: ['bay-solo-v1'], expectedDecision: 'bid', hardEligibility: 'eligible' };
  const args = { cases: panel, arms: [{ id: 'rules', engine: new RuleDecisionEngine(), unavailableReason: null }], repetitions: 1 };
  const synthetic = await runBenchmark(args); assert.equal(synthetic.reports[0].quality.ndcgAt3, null);
  panel[0].labels.source = 'human_reviewed'; panel[0].labels.reviewerIds = ['fixture-reviewer-assertion'];
  const supplied = await runBenchmark(args); assert.equal(supplied.reports[0].quality.ndcgAt3, 1); assert.equal(supplied.reports[0].quality.topChoiceAcceptableRate, 1); assert.equal(supplied.reports[0].quality.ordinalIntentMAE, 0);
  // This is a metric unit fixture, not evidence of an actual human-labelled pilot.
});
test('unavailable positive-fit attempts receive zero ranking credit and retain confusion failures', async () => {
  const panel = cases(); panel[0].labels = { source: 'human_reviewed', reviewerIds: ['fixture-reviewer-assertion'], commercialIntentLevel: 3, relevanceLevels: { 'bay-solo-v1': 3 }, acceptableCreativeIds: ['bay-solo-v1'], expectedDecision: 'bid', hardEligibility: 'eligible' };
  const result = await runBenchmark({ cases: panel, arms: [{ id: 'missing', engine: null, unavailableReason: 'engine_unavailable' }], repetitions: 1 }); assert.equal(result.reports[0].quality.ndcgAt3, 0); assert.equal(result.reports[0].quality.confusion.failuresOrAbstentions, 1);
  panel[0].labels.hardEligibility = 'excluded'; const bypass = await runBenchmark({ cases: panel, arms: [{ id: 'rules', engine: new RuleDecisionEngine(), unavailableReason: null }], repetitions: 1 }); assert.equal(bypass.attempts.length, 0); assert.equal(bypass.bypassed.length, 1);
});
test('failure-inclusive latency and cost preserve unknown denominators', () => {
  const summary = summarizeAttempts([{ outcome: 'valid', elapsedMs: 10, cost: .01 }, { outcome: 'timeout', elapsedMs: 500, cost: null }, { outcome: 'invalid', elapsedMs: 200, cost: .01 }]); assert.equal(summary.attempts, 3); assert.equal(summary.deadlineSuccessRate, 1/3); assert.equal(summary.cost.totalAttemptedCost, null); assert.equal(summary.latency.samples, 3); assert(summary.latency.p95 > 400);
  assert.equal(quantile([], .5), null); assert.equal(ndcgAt3(['a', 'b'], { a: 3, b: 1 }), 1); assert.equal(ndcgAt3(['a'], { a: 0 }), null); assert.throws(() => ndcgAt3(['a', 'a'], { a: 3 }));
});
test('paired uncertainty resamples families rather than repeated decisions', () => {
  const pairs = [{ familyId: 'a', a: .8, b: .6 }, { familyId: 'a', a: .8, b: .6 }, { familyId: 'b', a: .6, b: .8 }];
  const result = pairedFamilyBootstrap(pairs); assert.equal(result.families, 2); assert.equal(result.observations, 3); assert(Math.abs(result.pairedMean) < 1e-9); assert.deepEqual(result, pairedFamilyBootstrap(pairs));
  assert.equal(pairedFamilyBootstrap(pairs.slice(0, 1)).interval95, null);
});
