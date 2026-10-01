import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { assert, ContractError, hash, textHash, freeze, id, ids, safeText } from '../ml/core.mjs';
import { validateCampaign, validateRequest, validateProfile, validateDecision, RUBRIC, RUBRIC_HASH } from '../ml/engines/contract.mjs';
import { JevDecisionEngine, buildJevRequest, JEV_MAPPING_VERSION, JEV_QUESTION_VERSION } from '../ml/engines/jev.mjs';
import { createJevHttpTransport, JEV_MODEL } from '../ml/engines/jev-http.mjs';
import { QUESTIONS, POLICY, makeOpportunity } from './config.mjs';

const MAX_CALLS = 12, DEADLINE_MS = 12000;
const VERSION = 'v2-paired-harness.v1';
const ARMS = ['text_only', 'history'];
const clone = value => structuredClone(value);
const safeFailure = error => error instanceof ContractError && /^[\w.:/-]{1,160}$/u.test(error.code)
  ? error.code : 'transport_error';

// Same local state directory has one identity and one lifetime allowance. No
// transaction spans retrieval or network work; admission uses a SQLite CAS.
function store(stateDir, work, write = false) {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(stateDir, 'paired-harness.sqlite'));
  try {
    db.exec(`PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS paired_run (singleton INTEGER PRIMARY KEY CHECK(singleton=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS paired_calls (slot TEXT PRIMARY KEY, admitted INTEGER NOT NULL DEFAULT 0 CHECK(admitted IN (0,1)), data TEXT NOT NULL);`);
    if (write) db.exec('BEGIN IMMEDIATE');
    const result = work(db);
    if (write) db.exec('COMMIT');
    return result;
  } catch (error) {
    if (write && db.isTransaction) db.exec('ROLLBACK');
    throw error;
  } finally { db.close(); }
}
function readRun(db, runId) {
  const row = db.prepare('SELECT data FROM paired_run WHERE singleton=1').get();
  const saved = row ? JSON.parse(row.data) : null;
  assert(!saved || (saved.version === VERSION && saved.runId === runId), 'paired_run_identity_conflict');
  return saved;
}
function rows(db) {
  return db.prepare('SELECT data FROM paired_calls ORDER BY rowid').all().map(row => JSON.parse(row.data));
}
function saveCall(db, row) {
  db.prepare('UPDATE paired_calls SET admitted=?, data=? WHERE slot=?').run(row.admitted ? 1 : 0, JSON.stringify(row), row.slot);
}
function abstention(request, code, outcome, transportMode, elapsedMs = 0) {
  const d = {
    schemaVersion: 'agent-decision.v1', opportunityId: request.opportunity.id,
    advertiserId: request.campaign.advertiserId, campaignVersionId: request.campaign.campaignVersionId,
    agentRunId: 'agent:' + hash([request.runId, request.opportunity.id, request.campaign.campaignVersionId, request.options.engineConfigVersion]).slice(0, 24),
    decision: 'abstain', creativeVersionId: null, relevanceLevel: null, commercialIntentLevel: null,
    relevance: null, commercialIntent: null, conversionProbability: null, evidenceFieldIds: [],
    reasonCodes: [code], scoreSemantics: RUBRIC.version,
    engineProvenance: { engine: 'history_jev_v1', engineVersion: 'v1', engineConfigVersion: request.options.engineConfigVersion,
      rubricHash: RUBRIC_HASH, model: JEV_MODEL, transportMode, profileHash: request.profile?.profileHash ?? null,
      snapshotHash: request.profile?.snapshotContentHash ?? null, elapsedMs, outcome, failureReason: code,
      fallbackOrigin: null, candidateLevels: [], usage: null },
  };
  validateDecision(d, request);
  return d;
}
function output(row) {
  const { slot, request, payload, admitted, preflightFailure, ...result } = row;
  return result;
}
function usageOf(raw) {
  const u = raw?.usage;
  return Number.isSafeInteger(u?.input_tokens) && u.input_tokens >= 0 && Number.isSafeInteger(u?.output_tokens) && u.output_tokens >= 0
    ? { inputTokens: u.input_tokens, outputTokens: u.output_tokens } : null;
}

/** Injected transport is fixture-only. Live HTTP is opt-in and never retries. */
export function createPairedHarness({ stateDir, runId, retriever, apiKey, liveEnabled = false, transport, now = Date.now }) {
  assert(typeof stateDir === 'string' && isAbsolute(stateDir), 'paired_state_directory_invalid');
  id(runId); assert(typeof now === 'function' && typeof liveEnabled === 'boolean');
  assert(retriever && typeof retriever.retrieve === 'function' && retriever.manifest, 'paired_retriever_unavailable');
  assert(transport === undefined || typeof transport === 'function', 'paired_transport_invalid');
  const transportMode = transport ? 'fixture' : 'live';
  const policy = freeze(clone({ version: VERSION, maxCalls: MAX_CALLS, deadlineMs: DEADLINE_MS, arms: ARMS,
    mainPolicy: POLICY, rubric: RUBRIC, model: JEV_MODEL, mappingVersion: JEV_MAPPING_VERSION,
    questionVersion: JEV_QUESTION_VERSION, transportMode,
    implementationHashes: Object.fromEntries(['./agents.mjs', './config.mjs', '../ml/core.mjs', '../ml/engines/contract.mjs',
      '../ml/engines/base.mjs', '../ml/engines/jev.mjs', '../ml/engines/jev-http.mjs'].map(path => [path, textHash(readFileSync(new URL(path, import.meta.url)))])),
  }));
  let provider;
  const withStore = (fn, write = false) => store(stateDir, db => { readRun(db, runId); return fn(db); }, write);
  function status() {
    return withStore(db => {
      const saved = readRun(db, runId), calls = rows(db);
      const admittedCalls = calls.filter(c => c.admitted).length;
      return freeze({ runId, version: VERSION, frozen: !!saved, inputHash: saved?.inputHash ?? null,
        freezeHash: saved?.freezeHash ?? null, manifestHash: saved?.manifestHash ?? null, policyHash: saved?.policyHash ?? null,
        transportMode: saved?.policy.transportMode ?? transportMode, maxCalls: MAX_CALLS, admittedCalls, admitted: admittedCalls,
        remainingCalls: MAX_CALLS - admittedCalls, remaining: MAX_CALLS - admittedCalls, plannedCalls: calls.length,
        completedCalls: calls.filter(c => c.status === 'completed').length,
        uncertainCalls: calls.filter(c => ['admitted', 'uncertain'].includes(c.status)).length,
        failedCalls: calls.filter(c => c.status === 'failed').length,
        unavailableCalls: calls.filter(c => c.status === 'unavailable').length,
        pendingCalls: calls.filter(c => c.status === 'pending').length,
        usage: { inputTokens: calls.reduce((n, c) => n + (c.usage?.inputTokens ?? 0), 0),
          outputTokens: calls.reduce((n, c) => n + (c.usage?.outputTokens ?? 0), 0),
          unknownUsageCalls: calls.filter(c => c.admitted && c.usage === null).length },
      });
    });
  }
  function results() { return freeze(withStore(db => rows(db).filter(c => c.status !== 'pending').map(output))); }

  async function run({ questions, campaigns, opportunityIds } = {}) {
    assert(Array.isArray(questions) && questions.length > 0 && questions.length <= 2, 'paired_question_limit');
    questions.forEach(q => { safeText(q, 1200); assert(QUESTIONS.includes(q), 'frozen_question_required'); });
    assert(new Set(questions).size === questions.length, 'paired_duplicate_question');
    assert(Array.isArray(campaigns) && campaigns.length > 0 && campaigns.length <= 3, 'paired_campaign_limit');
    campaigns.forEach(validateCampaign); ids(campaigns.map(c => c.campaignVersionId), 3); ids(campaigns.map(c => c.campaignId), 3);
    if (opportunityIds !== undefined) { ids(opportunityIds, 2); assert(opportunityIds.length === questions.length, 'paired_opportunity_ids_invalid'); }
    // Snapshot caller objects before the first await, including all manifest fields.
    const inputs = freeze(clone({ questions, campaigns, opportunityIds: opportunityIds ?? questions.map((_, i) => 'v2-opp:' + hash([runId, i]).slice(0, 24)),
      manifest: retriever.manifest, policy }));
    const inputHash = hash(inputs), existing = withStore(db => readRun(db, runId));
    assert(!existing || existing.inputHash === inputHash, 'paired_inputs_changed');
    if (!existing) {
      const plans = [];
      for (const [questionIndex, task] of inputs.questions.entries()) for (const campaign of inputs.campaigns) {
        let retrieval, retrievalFailure = null;
        try {
          retrieval = clone(await retriever.retrieve(task, clone(campaign)));
          assert(retrieval && ['vector', 'lexical_fallback', 'unavailable'].includes(retrieval.method), 'retrieval_invalid');
          assert(typeof retrieval.fallback === 'boolean' && /^[a-f0-9]{64}$/u.test(retrieval.sourceHash), 'retrieval_invalid');
          assert(Array.isArray(retrieval.examples) && retrieval.examples.length <= 5 && Array.isArray(retrieval.hints), 'retrieval_invalid');
          assert(Object.hasOwn(retrieval, 'profile'), 'retrieval_invalid');
          hash(retrieval); // Reject non-serializable evidence before freezing/admission.
        } catch (error) { retrievalFailure = safeFailure(error); retrieval = { method: 'unavailable', fallback: false, sourceHash: hash(inputs.manifest), examples: [], hints: [], profile: null, failureReason: retrievalFailure }; }
        for (const arm of ARMS) {
          const o = makeOpportunity(task, { now: now(), questionIndex });
          const request = { schemaVersion: 'decision-request.v1', runId, mode: 'synthetic',
            opportunity: { id: inputs.opportunityIds[questionIndex], coarseIntent: o.coarseIntent, destination: o.destination,
              taskText: task, taskConstraints: {}, softPreferences: o.softPreferences }, campaign: clone(campaign), profile: null,
            options: { deadlineAt: new Date(now() + DEADLINE_MS).toISOString(), rubricVersion: RUBRIC.version, engineConfigVersion: `${VERSION}:${arm}` } };
          let preflightFailure = null;
          if (arm === 'history') {
            try {
              assert(!retrievalFailure && retrieval.method !== 'unavailable' && retrieval.profile?.historyStatus === 'ready', 'evidence_unavailable');
              assert(retrieval.profile.schemaVersion === 'retrieved-campaign-profile.v1', 'retrieved_profile_required');
              validateProfile(retrieval.profile, campaign);
              assert(retrieval.profile.retrievalMethod === retrieval.method, 'retrieval_profile_mismatch');
              assert(retrieval.profile.snapshotContentHash === retrieval.sourceHash && retrieval.profile.snapshotId === inputs.manifest.snapshotId, 'retrieval_source_mismatch');
              request.profile = clone(retrieval.profile);
            } catch (error) { preflightFailure = retrievalFailure ?? safeFailure(error); }
          }
          validateRequest(request);
          let payload = null;
          try {
            payload = buildJevRequest(request, JEV_MODEL);
            assert(Buffer.byteLength(JSON.stringify(payload)) <= 8192, 'jev_payload_limit');
          } catch (error) { preflightFailure ??= safeFailure(error); }
          const slot = JSON.stringify([questionIndex, campaign.campaignVersionId, arm]);
          plans.push({ slot, questionIndex, task, campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId,
            arm, retrieval: arm === 'history' ? clone(retrieval) : null, request, payload, preflightFailure, admitted: false,
            decision: null, callId: 'v2-call:' + hash([runId, slot]).slice(0, 32), requestHash: hash({ payload, opportunityId: request.opportunity.id, arm, inputHash }),
            status: 'pending', rawOutput: null, failure: null, usage: null, admittedAt: null, startedAt: null, completedAt: null, elapsedMs: null });
        }
      }
      // The request deadline is attempt-specific, not part of the evidence freeze.
      const frozenPlans = plans.map(({ request, ...p }) => ({ ...p, request: { ...request, options: { ...request.options, deadlineAt: null } } }));
      const saved = { version: VERSION, runId, inputs, inputHash, manifestHash: hash(inputs.manifest), policyHash: hash(policy), policy,
        freezeHash: hash({ inputs, plans: frozenPlans }), frozenAt: now() };
      withStore(db => {
        const raced = readRun(db, runId);
        assert(!raced || raced.inputHash === inputHash, 'paired_inputs_changed');
        if (raced) return; // Concurrent preparation consumes the first durable plan.
        assert(rows(db).length === 0, 'paired_state_invalid');
        db.prepare('INSERT INTO paired_run VALUES(1,?)').run(JSON.stringify(saved));
        const insert = db.prepare('INSERT INTO paired_calls(slot,data) VALUES(?,?)');
        for (const p of plans) insert.run(p.slot, JSON.stringify(p));
      }, true);
    }
    let transportUnavailable = null;
    if (!transport && liveEnabled && !provider) {
      // Construction validates the key but has no network side effect.
      try { provider = createJevHttpTransport({ apiKey, maxCalls: MAX_CALLS }); }
      catch (error) { transportUnavailable = safeFailure(error); }
    }
    const savedPlans = withStore(db => rows(db));
    for (const planned of savedPlans) {
      if (planned.status !== 'pending') continue;
      const call = withStore(db => {
        const row = JSON.parse(db.prepare('SELECT data FROM paired_calls WHERE slot=?').get(planned.slot).data);
        if (row.status !== 'pending') return null;
        const attemptAt = now();
        row.request.options.deadlineAt = new Date(attemptAt + DEADLINE_MS).toISOString();
        const unavailable = row.preflightFailure ?? transportUnavailable ?? (!transport && !liveEnabled ? 'paid_calls_unapproved' : null);
        if (unavailable) {
          row.status = 'unavailable'; row.failure = { code: unavailable, stage: 'preflight' };
          row.decision = abstention(row.request, unavailable, 'unavailable', transportMode);
          row.completedAt = now(); row.elapsedMs = 0; saveCall(db, row); return null;
        }
        assert(db.prepare('SELECT COUNT(*) AS n FROM paired_calls WHERE admitted=1').get().n < MAX_CALLS, 'paired_call_limit');
        row.admitted = true; row.status = 'admitted'; row.admittedAt = attemptAt; row.startedAt = row.admittedAt;
        row.decision = abstention(row.request, 'call_uncertain', 'unavailable', transportMode);
        saveCall(db, row); return row;
      }, true);
      if (!call) continue;
      const start = performance.now();
      const captured = async (payload, options) => {
        assert(hash(payload) === hash(call.payload), 'paired_request_changed');
        try {
          // Exactly one invocation, and its admission is already committed.
          provider ??= transport ?? createJevHttpTransport({ apiKey, maxCalls: MAX_CALLS });
          const raw = await provider(payload, options);
          const encoded = JSON.stringify(raw);
          assert(typeof encoded === 'string', 'jev_response_invalid');
          const responseBytes = Buffer.byteLength(encoded);
          const unsafe = (typeof apiKey === 'string' && apiKey.length > 0 && encoded.includes(apiKey)) ||
            /bearer\s+[\w.-]{12,}|-----BEGIN .*PRIVATE KEY|\b(?:sk|ts)-[a-z0-9_-]{16,}|"(?:apiKey|authorization|privateKey|walletKey|secret)"\s*:/iu.test(encoded);
          const rejected = responseBytes > 65536 ? 'jev_response_limit' : unsafe ? 'jev_response_unsafe' : null;
          const original = rejected ? null : JSON.parse(encoded);
          withStore(db => {
            const row = JSON.parse(db.prepare('SELECT data FROM paired_calls WHERE slot=?').get(call.slot).data);
            row.rawOutput = original; row.usage = usageOf(original); row.responseAt = now(); row.responseReceived = true;
            row.rawOutputHash = textHash(encoded); row.responseBytes = responseBytes; row.responseRejected = rejected;
            saveCall(db, row);
          }, true);
          assert(rejected === null, rejected);
          return raw;
        } catch (error) {
          withStore(db => {
            const row = JSON.parse(db.prepare('SELECT data FROM paired_calls WHERE slot=?').get(call.slot).data);
            row.failure = { code: safeFailure(error), stage: 'transport' }; saveCall(db, row);
          }, true);
          throw error;
        }
      };
      let decision;
      try {
        decision = await new JevDecisionEngine({ model: JEV_MODEL, transport: captured, transportMode,
          liveAuthorized: liveEnabled, now }).scoreOpportunity(call.request);
        validateDecision(decision, call.request);
      } catch (error) { decision = abstention(call.request, safeFailure(error), 'invalid', transportMode, performance.now() - start); }
      withStore(db => {
        const row = JSON.parse(db.prepare('SELECT data FROM paired_calls WHERE slot=?').get(call.slot).data);
        row.decision = clone(decision); row.completedAt = now(); row.elapsedMs = performance.now() - start;
        const outcome = decision.engineProvenance.outcome;
        row.status = ['valid', 'abstained'].includes(outcome) ? 'completed' : !row.responseReceived && row.admitted ? 'uncertain' : 'failed';
        if (decision.engineProvenance.failureReason) row.failure ??= { code: decision.engineProvenance.failureReason, stage: 'validation' };
        saveCall(db, row);
      }, true);
    }
    return results();
  }
  return Object.freeze({ run, status, results });
}
