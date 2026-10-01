import { mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { assert, object, id, safeText, hash, textHash, freeze, ContractError } from '../ml/core.mjs';
import { validateCampaign, validateRequest, validateProfile, validateDecision, RUBRIC, RUBRIC_HASH } from '../ml/engines/contract.mjs';
import { JevDecisionEngine, buildJevRequest, JEV_MAPPING_VERSION, JEV_QUESTION_VERSION } from '../ml/engines/jev.mjs';
import { createJevHttpTransport, JEV_MODEL } from '../ml/engines/jev-http.mjs';
import { screenText, promptHash } from '../v2/evidence.mjs';
import { POLICY, makeOpportunity } from './config.mjs';

const VERSION = 'v3-slot-harness.v1', DEADLINE_MS = 12000;
const CATEGORIES = Object.keys(POLICY.categoryLimits);
const active = new Set(); // Only suppresses recovery of this process's in-flight calls.
const clone = value => structuredClone(value);
const codeOf = error => error instanceof ContractError && /^[\w.:/-]{1,160}$/u.test(error.code) ? error.code : 'transport_error';
const safeEncoded = (encoded, apiKey) => {
  assert(typeof encoded === 'string', 'invalid_json');
  assert(!(apiKey && encoded.includes(apiKey)) && !/bearer\s+[\w.-]{12,}|-----BEGIN .*PRIVATE KEY|\b(?:sk|ts)-[a-z0-9_-]{16,}|"(?:apiKey|authorization|privateKey|walletKey|secret)"\s*:|[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(encoded), 'unsafe_projection');
  return encoded;
};
const safeJSON = (value, apiKey) => safeEncoded(JSON.stringify(value), apiKey);
function abstain(request, code, transportMode, elapsedMs = 0) {
  const decision = {
    schemaVersion: 'agent-decision.v1', opportunityId: request.opportunity.id,
    advertiserId: request.campaign.advertiserId, campaignVersionId: request.campaign.campaignVersionId,
    agentRunId: 'agent:' + hash([request.runId, request.opportunity.id, request.campaign.campaignVersionId, request.options.engineConfigVersion]).slice(0, 24),
    decision: 'abstain', creativeVersionId: null, relevanceLevel: null, commercialIntentLevel: null,
    relevance: null, commercialIntent: null, conversionProbability: null, evidenceFieldIds: [],
    reasonCodes: [code], scoreSemantics: RUBRIC.version,
    engineProvenance: { engine: 'history_jev_v1', engineVersion: 'v1', engineConfigVersion: request.options.engineConfigVersion,
      rubricHash: RUBRIC_HASH, model: JEV_MODEL, transportMode, profileHash: request.profile?.profileHash ?? null,
      snapshotHash: request.profile?.snapshotContentHash ?? null, elapsedMs, outcome: 'unavailable', failureReason: code,
      fallbackOrigin: null, candidateLevels: [], usage: null },
  };
  return validateDecision(decision, request);
}
const rows = db => db.prepare('SELECT data FROM v3_slots ORDER BY rowid').all().map(r => JSON.parse(r.data));
const get = (db, slotId) => {
  const row = db.prepare('SELECT data FROM v3_slots WHERE slot_id=?').get(slotId);
  return row ? JSON.parse(row.data) : null;
};
const save = (db, row) => db.prepare('UPDATE v3_slots SET data=? WHERE slot_id=?').run(JSON.stringify(row), row.slotId);
const publicRow = row => {
  const { ownerPid, preflightFailure, input, ...output } = row;
  return output;
};
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
function defect(row) {
  if (row.status !== 'failed' || row.decision?.decision !== 'abstain') return null;
  const code = row.failure?.code;
  if (/^jev_http_[45]\d\d$/u.test(code ?? '')) return { type: 'transport', code, stage: 'transport', documentation: 'V3_DECISIONS: definitive HTTP failure' };
  if (['jev_response_invalid', 'jev_model_mismatch', 'schema_invalid', 'unknown_field', 'missing_field', 'score_invalid', 'creative_id_invalid', 'decision_binding_invalid', 'bid_invalid', 'skip_invalid', 'evidence_id_invalid'].includes(code)) {
    return { type: 'schema', code, stage: 'validation', documentation: 'V3_DECISIONS: strict provider schema failure' };
  }
  return null;
}

/** One state directory, one run identity and durable 24-admission allowance.
 * Injected transports are fixtures. Only main opts into real strict Jev HTTP.
 */
export function createV3Harness({ stateDir, runId, retriever, apiKey, liveEnabled = false, transport, now = Date.now }) {
  assert(typeof stateDir === 'string' && isAbsolute(stateDir), 'v3_state_directory_invalid');
  id(runId);
  assert(typeof liveEnabled === 'boolean' && typeof now === 'function', 'v3_options_invalid');
  assert(retriever && typeof retriever.retrieve === 'function' && retriever.manifest, 'v3_retriever_unavailable');
  assert(transport === undefined || typeof transport === 'function', 'v3_transport_invalid');
  const transportMode = transport ? 'fixture' : 'live';
  const categoryLimits = freeze(clone(POLICY.categoryLimits));
  const manifest = freeze(clone(retriever.manifest));
  safeJSON(manifest, apiKey);
  const policy = freeze(clone({ version: VERSION, mainPolicy: POLICY, model: JEV_MODEL, transportMode,
    deadlineMs: DEADLINE_MS, rubricHash: RUBRIC_HASH, mappingVersion: JEV_MAPPING_VERSION, questionVersion: JEV_QUESTION_VERSION,
    implementationHashes: Object.fromEntries(['./agents.mjs', './config.mjs', '../v2/evidence.mjs', '../v2/config.mjs', '../ml/core.mjs',
      '../ml/engines/contract.mjs', '../ml/engines/base.mjs', '../ml/engines/jev.mjs', '../ml/engines/jev-http.mjs'].map(p => [p, textHash(readFileSync(new URL(p, import.meta.url)))])) }));
  const identity = { version: VERSION, runId, manifestHash: hash(manifest), policyHash: hash(policy), transportMode };
  const filename = resolve(stateDir, 'v3-agents.sqlite');
  let closed = false, closing = false, provider, queue = Promise.resolve();
  function store(work) {
    assert(!closed, 'v3_harness_closed');
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(filename);
    try {
      db.exec(`PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;
        CREATE TABLE IF NOT EXISTS v3_run (singleton INTEGER PRIMARY KEY CHECK(singleton=1), data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS v3_slots (slot_id TEXT PRIMARY KEY, data TEXT NOT NULL);
        BEGIN IMMEDIATE;`);
      const saved = db.prepare('SELECT data FROM v3_run WHERE singleton=1').get();
      if (saved) assert(hash(JSON.parse(saved.data)) === hash(identity), 'v3_run_identity_conflict');
      else db.prepare('INSERT INTO v3_run VALUES(1,?)').run(JSON.stringify(identity));
      for (const row of rows(db)) {
        if (row.status !== 'admitted' || active.has(filename + ':' + row.callId)) continue;
        if (row.ownerPid === process.pid || !alive(row.ownerPid)) {
          row.status = 'uncertain'; row.failure = { code: 'call_uncertain', stage: 'recovery' };
          row.decision = abstain(row.request, 'call_uncertain', transportMode); save(db, row);
        }
      }
      const result = work(db); db.exec('COMMIT'); return result;
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK'); throw error;
    } finally { db.close(); }
  }
  function status() {
    return freeze(store(db => {
      const calls = rows(db), admittedCalls = calls.filter(r => r.admitted).length;
      const categories = Object.fromEntries(CATEGORIES.map(category => {
        const admitted = calls.filter(r => r.category === category && r.admitted).length;
        const planned = calls.filter(r => r.category === category).length;
        return [category, { limit: categoryLimits[category], planned, admitted, remaining: categoryLimits[category] - admitted }];
      }));
      return { ...identity, frozen: calls.length > 0, freezeHash: hash(calls.map(r => ({ slotId: r.slotId, inputHash: r.inputHash, requestHash: r.requestHash }))), maxCalls: POLICY.maxCalls, admitted: admittedCalls, admittedCalls,
        remaining: POLICY.maxCalls - admittedCalls, remainingCalls: POLICY.maxCalls - admittedCalls, categories,
        plannedCalls: calls.length, completedCalls: calls.filter(r => r.status === 'completed').length,
        uncertainCalls: calls.filter(r => ['admitted', 'uncertain'].includes(r.status)).length,
        failedCalls: calls.filter(r => r.status === 'failed').length, unavailableCalls: calls.filter(r => r.status === 'unavailable').length,
        pendingCalls: calls.filter(r => r.status === 'pending').length,
        usage: { inputTokens: calls.reduce((n, r) => n + (r.usage?.inputTokens ?? 0), 0),
          outputTokens: calls.reduce((n, r) => n + (r.usage?.outputTokens ?? 0), 0),
          unknownUsageCalls: calls.filter(r => r.admitted && r.usage === null).length } };
    }));
  }
  function results() { return freeze(store(db => rows(db).map(publicRow))); }
  function validateSlot(slot) {
    object(slot, ['slotId', 'question', 'questionIndex', 'arm', 'campaign', 'opportunityId', 'category', 'correctionOf'],
      ['slotId', 'question', 'questionIndex', 'arm', 'campaign', 'opportunityId', 'category']);
    id(slot.slotId); id(slot.opportunityId); screenText(slot.question, 1200); safeText(slot.question, 1200);
    assert(Number.isSafeInteger(slot.questionIndex) && slot.questionIndex >= 0, 'v3_question_index_invalid');
    assert(['text_only', 'history'].includes(slot.arm) && CATEGORIES.includes(slot.category), 'v3_slot_invalid');
    validateCampaign(slot.campaign);
    if (slot.category === 'correction') id(slot.correctionOf);
    else assert(slot.correctionOf === undefined, 'v3_correction_category_required');
    safeJSON(slot, apiKey); hash(slot);
  }
  function checkCorrection(db, slot) {
    if (slot.category !== 'correction') return null;
    const original = get(db, slot.correctionOf), documented = original && defect(original);
    assert(documented, 'v3_documented_defect_required');
    assert(original.category !== 'correction', 'v3_correction_chain_forbidden');
    assert(!rows(db).some(r => r.category === 'correction' && r.correctionOf === slot.correctionOf && r.slotId !== slot.slotId), 'v3_defect_already_corrected');
    for (const key of ['question', 'questionIndex', 'arm', 'campaign', 'opportunityId']) assert(hash(original.input[key]) === hash(slot[key]), 'v3_correction_binding_conflict');
    return { correctionOf: original.slotId, failureHash: hash(original.failure), ...documented };
  }
  async function prepare(slot) {
    let retrieval = null, preflightFailure = null;
    if (slot.arm === 'history') {
      try {
        retrieval = clone(await retriever.retrieve(slot.question, clone(slot.campaign)));
        safeJSON(retrieval, apiKey);
        object(retrieval, ['method', 'fallback', 'sourceHash', 'examples', 'hints', 'profile', 'historyStatus', 'queryTextHash',
          'queryVectorId', 'model', 'dimension', 'revision', 'neighborCount', 'neighbors', 'independentPromptCount', 'qualityFlags'],
          ['method', 'fallback', 'sourceHash', 'examples', 'hints', 'profile']);
        assert(['vector', 'lexical_fallback'].includes(retrieval?.method), 'evidence_unavailable');
        assert(retrieval.fallback === (retrieval.method === 'lexical_fallback'), 'retrieval_invalid');
        assert(retrieval.profile?.schemaVersion === 'retrieved-campaign-profile.v1' && retrieval.profile.historyStatus === 'ready', 'evidence_unavailable');
        validateProfile(retrieval.profile, slot.campaign);
        assert(retrieval.profile.retrievalMethod === retrieval.method, 'retrieval_profile_mismatch');
        assert(retrieval.profile.snapshotContentHash === retrieval.sourceHash && retrieval.profile.snapshotId === manifest.snapshotId, 'retrieval_source_mismatch');
        assert(Array.isArray(retrieval.examples) && Array.isArray(retrieval.hints), 'retrieval_invalid');
        assert(retrieval.examples.length <= 3 && retrieval.hints.length <= 2, 'retrieval_invalid');
        for (const example of retrieval.examples) {
          object(example, ['id', 'text', 'normalizedHash', 'promptId', 'creativeId', 'mappingId', 'similarity', 'source', 'hintIds'], ['id', 'text']);
          id(example.id); screenText(example.text, 600);
          if (example.source) {
            object(example.source, ['database', 'source', 'sourceRefHash', 'probeNiche', 'mappingNiche', 'status', 'requestAssociated', 'customerGenerated', 'classification']);
            assert(example.source.database === 'ads' && example.source.status === 'ok' && example.source.requestAssociated === false && example.source.customerGenerated === false, 'retrieval_source_invalid');
            if (example.source.classification !== null) object(example.source.classification, ['promptHash', 'classificationTextHash', 'chosenSlug', 'method']);
          }
        }
        for (const hint of retrieval.hints) {
          object(hint, ['id', 'text', 'tier', 'qualityFlags', 'sourceHintId', 'modelVersion', 'supportingCreativeIds'], ['id', 'text', 'tier', 'qualityFlags']);
          id(hint.id); screenText(hint.text, 600);
          if (hint.supportingCreativeIds) assert(hint.supportingCreativeIds.some(id => retrieval.examples.some(e => e.creativeId === id)), 'retrieval_hint_mismatch');
        }
        if (retrieval.neighbors) {
          assert(Array.isArray(retrieval.neighbors) && retrieval.neighbors.length <= 5, 'retrieval_invalid');
          retrieval.neighbors.forEach(n => object(n, ['normalizedHash', 'promptIds', 'similarity', 'associationIds']));
        }
        assert(hash(retrieval.examples.map(({ id, text }) => ({ id, text }))) === hash(retrieval.profile.observedExamples), 'retrieval_example_mismatch');
        assert(hash(retrieval.hints.map(({ id, text, tier, qualityFlags }) => ({ id, text, tier, qualityFlags }))) === hash(retrieval.profile.inferredHints), 'retrieval_hint_mismatch');
        if (retrieval.queryTextHash !== undefined) assert(retrieval.queryTextHash === promptHash(slot.question), 'retrieval_query_mismatch');
        hash(retrieval);
      } catch (error) {
        preflightFailure = codeOf(error);
        retrieval = { method: 'unavailable', fallback: false, sourceHash: hash(manifest), examples: [], hints: [], profile: null, failureReason: preflightFailure };
      }
    }
    // Exchange owns mandatory eligibility. The frozen slot interface supplies no
    // mandatoryCapabilities; do not silently add a hard crypto requirement here.
    const o = makeOpportunity(slot.question, { turnId: slot.slotId, now: now(), mandatoryCapabilities: [] });
    const request = { schemaVersion: 'decision-request.v1', runId, mode: slot.category === 'laboratory' ? 'synthetic' : POLICY.financialMode,
      opportunity: { id: slot.opportunityId, coarseIntent: o.coarseIntent, destination: o.destination, taskText: slot.question,
        taskConstraints: {}, softPreferences: o.softPreferences }, campaign: clone(slot.campaign),
      profile: preflightFailure ? null : retrieval?.profile ?? null,
      options: { deadlineAt: new Date(now() + DEADLINE_MS).toISOString(), rubricVersion: RUBRIC.version,
        engineConfigVersion: `${VERSION}:${slot.arm}:${slot.slotId}` } };
    validateRequest(request);
    let packet = null;
    try { packet = buildJevRequest(request, JEV_MODEL); assert(Buffer.byteLength(JSON.stringify(packet)) <= 8192, 'jev_payload_limit'); }
    catch (error) { preflightFailure ??= codeOf(error); }
    const bindings = { runId, slotId: slot.slotId, opportunityId: slot.opportunityId, questionIndex: slot.questionIndex, mode: request.mode,
      questionHash: textHash(slot.question), campaignId: slot.campaign.campaignId, campaignVersionId: slot.campaign.campaignVersionId,
      advertiserId: slot.campaign.advertiserId, campaignHash: hash(slot.campaign), arm: slot.arm, category: slot.category,
      manifestHash: identity.manifestHash, sourceHash: retrieval?.sourceHash ?? null, profileHash: request.profile?.profileHash ?? null,
      retrievalHash: retrieval ? hash(retrieval) : null };
    return { slotId: slot.slotId, question: slot.question, task: slot.question, questionIndex: slot.questionIndex,
      campaignId: slot.campaign.campaignId, campaignVersionId: slot.campaign.campaignVersionId,
      opportunityId: slot.opportunityId, arm: slot.arm, category: slot.category, correctionOf: slot.correctionOf ?? null,
      input: clone(slot), inputHash: hash(slot), bindings, request, packet, packetHash: hash(packet),
      packetBytes: packet === null ? null : JSON.stringify(packet), packetBytesHash: packet === null ? null : textHash(JSON.stringify(packet)),
      requestHash: hash({ packet, bindings, inputHash: hash(slot) }), retrieval, preflightFailure,
      callId: 'v3-call:' + hash([runId, slot.slotId]).slice(0, 32), status: 'pending', admitted: false,
      decision: null, rawOutput: null, rawOutputHash: null, responseReceived: false, responseRejected: null,
      failure: null, documentedDefect: null, usage: null, frozenAt: now(), admittedAt: null, startedAt: null,
      responseAt: null, completedAt: null, elapsedMs: null };
  }
  async function execute(slotId) {
    const initial = store(db => get(db, slotId));
    if (initial.status !== 'pending') return;
    let unavailable = initial.preflightFailure;
    if (!transport) {
      if (!liveEnabled) unavailable ??= 'paid_calls_unapproved';
      else if (!provider) {
        try { provider = createJevHttpTransport({ apiKey, maxCalls: POLICY.maxCalls }); }
        catch (error) { unavailable ??= codeOf(error); }
      }
    }
    const call = store(db => {
      const row = get(db, slotId);
      if (row.status !== 'pending') return null;
      const attemptAt = now();
      row.request.options.deadlineAt = new Date(attemptAt + DEADLINE_MS).toISOString();
      if (unavailable) {
        row.status = 'unavailable'; row.failure = { code: unavailable, stage: 'preflight' };
        row.decision = abstain(row.request, unavailable, transportMode); row.completedAt = now(); row.elapsedMs = 0;
        save(db, row); return null;
      }
      const all = rows(db);
      assert(all.filter(r => r.admitted).length < POLICY.maxCalls, 'v3_call_limit');
      assert(all.filter(r => r.admitted && r.category === row.category).length < categoryLimits[row.category], 'v3_category_limit');
      if (row.category === 'correction') row.documentedDefect = checkCorrection(db, row.input);
      row.admitted = true; row.status = 'admitted'; row.ownerPid = process.pid;
      row.admittedAt = attemptAt; row.startedAt = row.admittedAt;
      row.decision = abstain(row.request, 'call_uncertain', transportMode);
      save(db, row); return row;
    });
    if (!call) return;
    const token = filename + ':' + call.callId;
    active.add(token);
    const start = performance.now();
    const captured = async (packet, options) => {
      assert(hash(packet) === call.packetHash && JSON.stringify(packet) === call.packetBytes, 'v3_packet_changed');
      try {
        const raw = await (transport ?? provider)(packet, options);
        const encoded = JSON.stringify(raw);
        assert(typeof encoded === 'string', 'jev_response_invalid');
        let rejected = Buffer.byteLength(encoded) > 65536 ? 'jev_response_limit' : null;
        try { safeEncoded(encoded, apiKey); } catch { rejected ??= 'jev_response_unsafe'; }
        store(db => {
          const row = get(db, slotId);
          if (row.status !== 'admitted') return; // A late output cannot revive a terminal timeout.
          row.rawOutput = rejected ? null : JSON.parse(encoded); row.rawOutputHash = textHash(encoded);
          row.responseReceived = true; row.responseRejected = rejected; row.responseAt = now(); row.responseBytes = Buffer.byteLength(encoded);
          const u = row.rawOutput?.usage;
          if (Number.isSafeInteger(u?.input_tokens) && u.input_tokens >= 0 && Number.isSafeInteger(u?.output_tokens) && u.output_tokens >= 0) row.usage = { inputTokens: u.input_tokens, outputTokens: u.output_tokens };
          save(db, row);
        });
        assert(rejected === null, rejected);
        return raw;
      } catch (error) {
        store(db => {
          const row = get(db, slotId);
          if (row.status !== 'admitted') return;
          const code = codeOf(error);
          row.failure = { code, stage: 'transport' };
          if (/^jev_http_[45]\d\d$/u.test(code) || ['jev_response_invalid', 'jev_response_limit'].includes(code)) row.definitiveTransportFailure = true;
          save(db, row);
        });
        throw error;
      }
    };
    try {
      let decision;
      try {
        // V2's fixture engine only accepts synthetic requests. Mode is not in the
        // Jev wire packet; retain the actual slot mode in the persisted request.
        const engineRequest = transport ? { ...call.request, mode: 'synthetic' } : call.request;
        decision = await new JevDecisionEngine({ model: JEV_MODEL, transport: captured, transportMode, liveAuthorized: liveEnabled, now }).scoreOpportunity(engineRequest);
        validateDecision(decision, call.request);
      } catch (error) { decision = abstain(call.request, codeOf(error), transportMode, performance.now() - start); }
      store(db => {
        const row = get(db, slotId);
        row.decision = clone(decision); row.completedAt = now(); row.elapsedMs = performance.now() - start;
        const outcome = decision.engineProvenance.outcome;
        row.status = ['valid', 'abstained'].includes(outcome) ? 'completed' : row.responseReceived || row.definitiveTransportFailure ? 'failed' : 'uncertain';
        if (decision.engineProvenance.failureReason) row.failure ??= { code: decision.engineProvenance.failureReason, stage: 'validation' };
        row.documentedDefect ??= defect(row); save(db, row);
      });
    } finally { active.delete(token); }
  }
  async function run(input) {
    object(input, ['slots']);
    assert(Array.isArray(input.slots) && input.slots.length > 0 && input.slots.length <= POLICY.maxCalls, 'v3_slot_limit');
    const slots = freeze(clone(input.slots)); slots.forEach(validateSlot);
    assert(new Set(slots.map(s => s.slotId)).size === slots.length, 'v3_duplicate_slot');
    // Validate all conflicts before retrieval or provider work.
    const missing = store(db => {
      const planned = rows(db), newSlots = [];
      for (const slot of slots) {
        const old = get(db, slot.slotId);
        if (old) assert(old.inputHash === hash(slot), 'v3_slot_input_conflict');
        else { checkCorrection(db, slot); newSlots.push(slot); }
      }
      for (const category of CATEGORIES) assert(planned.filter(r => r.category === category).length + newSlots.filter(s => s.category === category).length <= categoryLimits[category], 'v3_category_limit');
      assert(planned.length + newSlots.length <= POLICY.maxCalls, 'v3_slot_limit');
      return newSlots;
    });
    const plans = [];
    for (const slot of missing) plans.push(await prepare(slot));
    // Freeze the complete supplied batch before the first provider admission.
    store(db => {
      const all = rows(db);
      const fresh = plans.filter(p => !get(db, p.slotId));
      for (const plan of plans) {
        const old = get(db, plan.slotId);
        if (old) assert(old.inputHash === plan.inputHash, 'v3_slot_input_conflict');
        else checkCorrection(db, plan.input);
      }
      for (const category of CATEGORIES) assert(all.filter(r => r.category === category).length + fresh.filter(r => r.category === category).length <= categoryLimits[category], 'v3_category_limit');
      assert(all.length + fresh.length <= POLICY.maxCalls, 'v3_slot_limit');
      const insert = db.prepare('INSERT INTO v3_slots VALUES(?,?)');
      for (const plan of fresh) {
        if (plan.category === 'correction') plan.documentedDefect = checkCorrection(db, plan.input);
        insert.run(plan.slotId, JSON.stringify(plan));
      }
    });
    for (const slot of slots) await execute(slot.slotId);
    return freeze(store(db => slots.map(s => publicRow(get(db, s.slotId)))));
  }
  function runSlots(input) {
    assert(!closed && !closing, 'v3_harness_closed');
    // Snapshot before the first await; queued caller mutations cannot change input.
    const copy = clone(input), task = queue.then(() => run(copy));
    queue = task.catch(() => {}); return task;
  }
  async function close() { closing = true; await queue; closed = true; }
  return Object.freeze({ runSlots, status, results, close });
}
