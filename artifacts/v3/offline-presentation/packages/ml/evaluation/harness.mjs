import { performance } from 'node:perf_hooks';
import { ContractError, assert, object, array, id, ids, hash, freeze } from '../core.mjs';
import { validateRequest, validateDecision, RUBRIC_HASH } from '../engines/contract.mjs';
import { summarizeAttempts, ndcgAt3 } from './metrics.mjs';

function labels(value, request) {
  if (value === null) return;
  object(value, ['source', 'reviewerIds', 'commercialIntentLevel', 'relevanceLevels', 'acceptableCreativeIds', 'expectedDecision', 'hardEligibility']);
  assert(['human_reviewed', 'synthetic_assertion'].includes(value.source)); ids(value.reviewerIds, 2); assert(value.source !== 'human_reviewed' || value.reviewerIds.length > 0, 'human_review_missing');
  const creativeIds = request.campaign.creatives.map(c => c.creativeVersionId);
  object(value.relevanceLevels, creativeIds); assert(Object.values(value.relevanceLevels).every(n => Number.isInteger(n) && n >= 0 && n <= 3));
  assert(Number.isInteger(value.commercialIntentLevel) && value.commercialIntentLevel >= 0 && value.commercialIntentLevel <= 3);
  ids(value.acceptableCreativeIds, 30); assert(value.acceptableCreativeIds.every(k => creativeIds.includes(k)));
  assert(['bid', 'skip'].includes(value.expectedDecision) && ['eligible', 'excluded'].includes(value.hardEligibility));
}
export function freezeBenchmarkCases(cases) {
  array(cases, 120, c => {
    object(c, ['id', 'taskId', 'familyId', 'split', 'request', 'labels']); id(c.id); id(c.taskId); id(c.familyId);
    assert(['development', 'validation', 'final_test'].includes(c.split)); validateRequest(c.request); labels(c.labels, c.request);
    if (c.split !== 'development' && c.request.profile !== null) assert([...c.request.profile.observedExamples, ...c.request.profile.contrastExamples].every(e => e.familyId !== c.familyId), 'benchmark_profile_leakage');
  });
  ids(cases.map(c => c.id), 120); assert(new Set(cases.map(c => c.taskId)).size <= 40, 'case_limit');
  const familySplit = new Map();
  for (const c of cases) { assert(!familySplit.has(c.familyId) || familySplit.get(c.familyId) === c.split, 'benchmark_family_leakage'); familySplit.set(c.familyId, c.split); }
  const cloned = structuredClone(cases).sort((a, b) => a.id.localeCompare(b.id));
  return freeze({ schemaVersion: 'benchmark-cases.v1', cases: cloned, inputHash: hash(cloned.map(({ labels, ...c }) => c)), labelHash: cloned.some(c => c.labels !== null) ? hash(cloned.map(c => ({ id: c.id, labels: c.labels }))) : null, familyCount: familySplit.size, labelStatus: cloned.every(c => c.labels?.source === 'human_reviewed') && cloned.length ? 'caller_supplied_human_reviewed' : cloned.some(c => c.labels !== null) ? 'partial_or_synthetic_labels' : 'human_labels_pending' });
}

function quality(attempts, cases) {
  const byId = new Map(cases.map(c => [c.id, c])), evaluated = attempts.filter(a => a.split === 'final_test');
  const confusion = { expectedBidActualBid: 0, expectedBidActualSkip: 0, expectedSkipActualBid: 0, expectedSkipActualSkip: 0, failuresOrAbstentions: 0 };
  let labelled = 0, positive = 0, ndcgSum = 0, rankingUnavailable = 0, topAcceptable = 0, intentError = 0, intentCount = 0, relevanceError = 0, relevanceCount = 0, noFit = 0;
  for (const a of evaluated) {
    const c = byId.get(a.caseId), l = c.labels;
    if (!l || l.source !== 'human_reviewed' || l.hardEligibility !== 'eligible') continue;
    labelled++;
    const positiveFit = Object.values(l.relevanceLevels).some(n => n > 0);
    if (positiveFit) positive++; else noFit++;
    const d = a.decision;
    if (a.outcome !== 'valid' || !d || d.decision === 'abstain') { confusion.failuresOrAbstentions++; continue; }
    const key = 'expected' + (l.expectedDecision === 'bid' ? 'Bid' : 'Skip') + 'Actual' + (d.decision === 'bid' ? 'Bid' : 'Skip'); confusion[key]++;
    if (l.acceptableCreativeIds.includes(d.creativeVersionId)) topAcceptable++;
    intentError += Math.abs(d.commercialIntentLevel-l.commercialIntentLevel); intentCount++;
    if (d.creativeVersionId !== null) { relevanceError += Math.abs(d.relevanceLevel-l.relevanceLevels[d.creativeVersionId]); relevanceCount++; }
    const ranking = d.engineProvenance.candidateLevels.slice().sort((x, y) => y.relevanceLevel-x.relevanceLevel || x.creativeVersionId.localeCompare(y.creativeVersionId)).map(x => x.creativeVersionId);
    if (positiveFit) {
      if (ranking.length !== c.request.campaign.creatives.length) rankingUnavailable++;
      else ndcgSum += ndcgAt3(ranking, l.relevanceLevels);
    }
  }
  return { status: labelled ? 'exploratory_human_label_panel' : 'unavailable_human_labels_pending', finalAttempts: evaluated.length, labelledAttempts: labelled, positiveFitAttempts: positive, noFitAttempts: noFit, rankingUnavailableAttempts: rankingUnavailable, ndcgAt3: positive && !rankingUnavailable ? ndcgSum/positive : null, topChoiceAcceptableRate: labelled ? topAcceptable/labelled : null, confusion, ordinalIntentMAE: intentCount ? intentError/intentCount : null, ordinalIntentScoredAttempts: intentCount, ordinalRelevanceMAE: relevanceCount ? relevanceError/relevanceCount : null, ordinalRelevanceScoredAttempts: relevanceCount };
}

/** Bounded sequential local/fixture harness. Live paid transports are deliberately unavailable. */
export async function runBenchmark({ cases, arms, repetitions = 3, maxAttempts = 1440, deadlineMs = 500, now = Date.now, monotonic = () => performance.now() }) {
  const frozen = freezeBenchmarkCases(cases);
  assert(Number.isInteger(repetitions) && repetitions > 0 && repetitions <= 3); assert(Number.isInteger(maxAttempts) && maxAttempts > 0 && maxAttempts <= 1440);
  assert(Number.isFinite(deadlineMs) && deadlineMs > 0 && deadlineMs <= 10000);
  array(arms, 4, a => { object(a, ['id', 'engine', 'unavailableReason']); id(a.id); assert(a.engine === null || typeof a.engine.scoreOpportunity === 'function'); if (a.unavailableReason !== null) id(a.unavailableReason); }); ids(arms.map(a => a.id), 4);
  assert(frozen.cases.length*arms.length*repetitions <= maxAttempts, 'attempt_cap');
  const attempts = [], bypassed = [];
  const runStart = monotonic();
  for (const c of frozen.cases) for (let repetition = 0; repetition < repetitions; repetition++) for (const arm of arms) {
    if (c.labels?.hardEligibility === 'excluded') { bypassed.push({ caseId: c.id, armId: arm.id, repetition, reason: 'policy_excluded' }); continue; }
    const request = structuredClone(c.request); request.options.deadlineAt = new Date(Math.min(Date.parse(request.options.deadlineAt), now()+deadlineMs)).toISOString();
    const start = monotonic(); let decision = null, outcome, reason = null, timer;
    if (arm.engine === null || arm.unavailableReason !== null || arm.engine.transportMode === 'live') { outcome = 'unavailable'; reason = arm.unavailableReason ?? (arm.engine === null ? 'engine_unconfigured' : 'paid_trials_pending'); }
    else try {
      decision = await Promise.race([arm.engine.scoreOpportunity(request), new Promise((_, reject) => { timer = setTimeout(() => reject(new ContractError('decision_timeout')), deadlineMs); })]);
      validateDecision(decision, request); outcome = decision.engineProvenance.outcome; reason = decision.engineProvenance.failureReason;
      if (now() >= Date.parse(request.options.deadlineAt)) { outcome = 'timeout'; reason = 'decision_timeout'; decision = null; }
    } catch (e) { outcome = e instanceof ContractError && e.code === 'decision_timeout' ? 'timeout' : 'invalid'; reason = outcome === 'timeout' ? 'decision_timeout' : 'decision_failed_validation'; decision = null; }
    finally { clearTimeout(timer); }
    const elapsedMs = Math.max(0, monotonic()-start);
    attempts.push({ caseId: c.id, familyId: c.familyId, split: c.split, armId: arm.id, repetition, requestHash: hash(request), elapsedMs, outcome, reason, cost: outcome === 'unavailable' || arm.engine?.transportMode !== 'live' ? 0 : null, decision });
  }
  const durationMs = Math.max(0, monotonic()-runStart);
  const reports = arms.map(arm => {
    const own = attempts.filter(a => a.armId === arm.id); const summary = summarizeAttempts(own, deadlineMs);
    return { armId: arm.id, ...summary, quality: quality(own, frozen.cases) };
  });
  const manifest = { schemaVersion: 'benchmark-run.v1', mode: 'local_fixture_only', inputHash: frozen.inputHash, labelHash: frozen.labelHash, labelStatus: frozen.labelStatus, rubricHash: RUBRIC_HASH, repetitions, maxAttempts, concurrency: 1, deadlineMs, actualAttempts: attempts.length, bypassed: bypassed.length, durationMs, environment: { runtime: process.version, platform: process.platform, architecture: process.arch }, adoption: 'baseline_retained_pending_independent_labels_and_paid_trials', realDataIngestion: 'pending' };
  return freeze({ manifest, reports, attempts, bypassed });
}
