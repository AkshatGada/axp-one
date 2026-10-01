import { performance } from 'node:perf_hooks';
import { ContractError, assert, hash, freeze } from '../core.mjs';
import { validateRequest, validateDecision, RUBRIC_HASH } from './contract.mjs';

export function participation(relevance, intent) { return relevance >= 2 && intent >= 2 ? 'bid' : 'skip'; }
export function intentLevel(o) {
  if (o.coarseIntent === 'informational' || o.coarseIntent === 'blocked') return 0;
  if (o.coarseIntent === 'travel_tools') return o.taskConstraints.requiredCapabilities?.length ? 3 : 2;
  if (o.coarseIntent === 'hotel_comparison') return o.destination === null ? 1 : 2;
  return o.destination !== null && Object.values(o.taskConstraints).some(v => v !== false && v !== null && (!Array.isArray(v) || v.length > 0)) ? 3 : o.destination === null ? 1 : 2;
}
export class BaseDecisionEngine {
  constructor(engine, { now = Date.now, monotonic = () => performance.now(), model = null, transportMode = null } = {}) {
    this.engine = engine; this.now = now; this.monotonic = monotonic; this.model = model; this.transportMode = transportMode;
  }
  async scoreOpportunity(input) {
    validateRequest(input);
    const request = freeze(structuredClone(input)), start = this.monotonic();
    const remaining = Date.parse(request.options.deadlineAt) - this.now();
    let timer; const controller = new AbortController();
    let data;
    try {
      assert(remaining > 0, 'decision_timeout');
      // No long retry loop, and external work receives an abort signal.
      data = await Promise.race([
        this.evaluate(request, controller.signal),
        new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ContractError('decision_timeout')); }, Math.min(remaining, 2_147_483_647)); }),
      ]);
      assert(this.now() < Date.parse(request.options.deadlineAt), 'decision_timeout');
    } catch (e) {
      const known = e instanceof ContractError;
      const code = known ? e.code : 'transport_error';
      data = { decision: 'abstain', outcome: code === 'decision_timeout' ? 'timeout' : code === 'transport_error' ? 'transport_error' : code.endsWith('unavailable') || ['thin_profile', 'model_unconfigured', 'paid_calls_unapproved'].includes(code) ? 'unavailable' : 'invalid', failureReason: code };
    } finally { clearTimeout(timer); }
    const elapsedMs = Math.max(0, this.monotonic() - start);
    const result = {
      schemaVersion: 'agent-decision.v1', opportunityId: request.opportunity.id, advertiserId: request.campaign.advertiserId, campaignVersionId: request.campaign.campaignVersionId,
      agentRunId: 'agent:' + hash([request.runId, request.opportunity.id, request.campaign.campaignVersionId, this.engine, request.options.engineConfigVersion]).slice(0, 24),
      decision: data.decision, creativeVersionId: data.creativeVersionId ?? null,
      relevanceLevel: data.relevanceLevel ?? null, commercialIntentLevel: data.commercialIntentLevel ?? null,
      relevance: data.relevanceLevel == null ? null : data.relevanceLevel/3, commercialIntent: data.commercialIntentLevel == null ? null : data.commercialIntentLevel/3,
      conversionProbability: null, evidenceFieldIds: data.evidenceFieldIds ?? [], reasonCodes: data.reasonCodes ?? [data.failureReason ?? (data.decision === 'bid' ? 'fit_supported' : 'agent_skip')], scoreSemantics: 'fit-intent-v1',
      engineProvenance: { engine: this.engine, engineVersion: 'v1', engineConfigVersion: request.options.engineConfigVersion, rubricHash: RUBRIC_HASH, model: data.model ?? this.model, transportMode: this.transportMode, profileHash: request.profile?.profileHash ?? null, snapshotHash: request.profile?.snapshotContentHash ?? null, elapsedMs, outcome: data.outcome ?? 'valid', failureReason: data.failureReason ?? null, fallbackOrigin: null, candidateLevels: data.candidateLevels ?? [], usage: data.usage ?? null },
    };
    validateDecision(result, request); return freeze(result);
  }
}

/** The caller persists both attempts; original failures cannot disappear in a fallback. */
export async function scoreWithFallback(primary, fallback, request) {
  const original = await primary.scoreOpportunity(request);
  if (original.engineProvenance.outcome === 'valid' || Date.now() >= Date.parse(request.options.deadlineAt)) return freeze({ original, fallback: null, effective: original });
  const result = structuredClone(await fallback.scoreOpportunity(request));
  result.engineProvenance.fallbackOrigin = original.agentRunId; validateDecision(result, request);
  return freeze({ original, fallback: result, effective: result });
}
