import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { hash, computeBid, validateCampaign, validateDecision } from '../../packages/contracts/index.mjs';
import { freeze } from '../../packages/ml/core.mjs';
import { loadEvidence, DEFAULT_EVIDENCE_PATH } from '../../packages/advertiser/evidence.mjs';
import { PRESETS, simulationOpportunity } from '../../packages/advertiser/service.mjs';
import { compareDecisions, POLICY } from '../../packages/advertiser/decision-engine.mjs';

export const OUTPUT_PATH = fileURLToPath(new URL('../../artifacts/advertiser/decision-comparison.json', import.meta.url));
export const PANEL_VERSION = 'authored-declarations-12-v1';
export const FIXTURE_CLOCK = 2000000000000; // Fixture time, not an observation timestamp.
export const EVIDENCE_IDS = freeze({
  tripdesk: ['ads:mapping:53989', 'ads:mapping:189867', 'ads:mapping:280148', 'ads:mapping:688879', 'ads:mapping:932235'],
  agentpass: ['ads:mapping:110136'],
  hotelops: ['ads:mapping:4442'],
});
// Frozen in EVIDENCE_COMPARISON.md before the engine's first execution.
// No score, winner or independent true-fit label is assigned to these tasks.
export const CASES = freeze([
  { id: 'travel-basic', family: 'travel', presetId: 'tripdesk', prompt: 'Compare corporate travel booking tools for teams.' },
  { id: 'travel-offsite', family: 'travel', presetId: 'tripdesk', prompt: 'Compare corporate travel booking platforms for a remote company offsite, shared itineraries, automated approvals, finance reporting, and per-employee pricing without a dedicated travel manager.' },
  { id: 'expenses-remote', family: 'expenses', presetId: 'tripdesk', prompt: "Compare tools for a remote team's expenses and reimbursements, automated reporting, global travel, checkout policy, and per-employee pricing." },
  { id: 'expenses-basic', family: 'expenses', presetId: 'tripdesk', prompt: 'Compare automatic expense capture tools for teams.' },
  { id: 'auth-basic', family: 'auth', presetId: 'agentpass', prompt: 'Compare authentication and identity tools for AI travel agents.' },
  { id: 'auth-developers', family: 'auth', presetId: 'agentpass', prompt: 'Compare authentication for product and engineering teams building AI travel agents, with secure identity for both human users and the agents themselves.' },
  { id: 'hotel-basic', family: 'hotel', presetId: 'hotelops', prompt: 'Compare hotel ERP software and expert vendor shortlists.' },
  { id: 'hotel-revenue', family: 'hotel', presetId: 'hotelops', prompt: 'Compare hotel ERP vendors for hospitality leaders evaluating revenue management, wary of AI-first vendor hype, seeking expert-built shortlists over algorithm-generated picks.' },
  { id: 'informational', family: 'informational', presetId: 'tripdesk', prompt: 'Explain what corporate travel booking and expense management mean.' },
  { id: 'unknown', family: 'unknown', presetId: 'hotelops', prompt: 'Compare telescopes for observing distant galaxies.' },
  { id: 'required-mismatch', family: 'required-mismatch', presetId: 'tripdesk', prompt: 'I need corporate travel booking with authentication and identity for AI agents.' },
  { id: 'wrong-capability', family: 'wrong-capability', presetId: 'agentpass', prompt: 'Compare corporate travel booking and automatic expense capture for teams.' },
]);
export const PANEL_HASH = hash({ version: PANEL_VERSION, cases: CASES, evidenceIds: EVIDENCE_IDS, fixtureClock: FIXTURE_CLOCK });
const byteHash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const repoFile = path => fileURLToPath(new URL(`../../${path}`, import.meta.url));

/** Construct canonical service DTOs only. Never instantiate a session/exchange. */
export function caseInput(task, catalogue) {
  const preset = PRESETS.find(p => p.id === task.presetId);
  assert.ok(preset, 'unknown_panel_preset');
  const { id: _presetId, ...fields } = structuredClone(preset);
  const draft = { ...fields, draftId: `comparison-${task.presetId}`, evidenceIds: [...EVIDENCE_IDS[task.presetId]], maxBidBaseUnits: '4000', budgetCapBaseUnits: '8000', depositBaseUnits: '20000', approved: true };
  for (const id of draft.evidenceIds) assert.ok(catalogue.records.some(r => r.id === id), `missing_frozen_evidence:${id}`);
  const campaign = {
    campaignId: `campaign-${draft.draftId}`, campaignVersionId: `campaign-${draft.draftId}-v1`, advertiserId: 'fictional-demo-advertiser', status: 'active',
    allowedIntents: ['travel_tools'], destination: 'global', declaredConstraints: [...draft.declaredCapabilities],
    creatives: [{ creativeVersionId: `creative-${draft.draftId}-v1`, approvedText: draft.approvedText, destinationURL: draft.websiteURL, fictional: true, softFitTags: [...draft.declaredCapabilities], evidenceFieldIds: ['declaredConstraints'] }],
    softFitTags: [...draft.declaredCapabilities], maxBidBaseUnits: draft.maxBidBaseUnits, budgetCapBaseUnits: draft.budgetCapBaseUnits,
    channelId: `sim-channel-${draft.draftId}`, policyVersion: 'fit_intent_bid_v1',
  };
  validateCampaign(campaign);
  const opportunity = { ...simulationOpportunity(task.prompt, { turnId: `comparison-${task.id}`, randomSessionId: 'offline-comparison-session', now: FIXTURE_CLOCK }), id: `comparison-opportunity-${task.id}` };
  return freeze({ campaign, opportunity, draft, prompt: task.prompt, catalogue });
}

export function decisionSignature(arm) {
  return hash([arm.decision.decision, arm.decision.relevanceLevel, arm.bid]);
}

/** Check declarations, provenance and bid arithmetic, never a desired winner. */
export function assertComparison(input, comparison) {
  const { campaign, opportunity, catalogue } = input;
  assert.equal(comparison.schemaVersion, 'advertiser-evidence-comparison.v1');
  assert.equal(comparison.mode, 'synthetic');
  assert.equal(comparison.presentation, 'offline_decision_comparison');
  assert.equal(comparison.catalogueHash, catalogue.contentHash);
  assert.equal(comparison.previewOnly, true);
  assert.ok(Array.isArray(comparison.limitations) && comparison.limitations.length > 0);
  const missing = opportunity.taskConstraints.filter(x => !campaign.declaredConstraints.includes(x));
  const matched = opportunity.softPreferences.filter(x => campaign.declaredConstraints.includes(x));
  const ceiling = matched.length === 0 ? 0 : matched.length === opportunity.softPreferences.length ? 3 : 2;
  for (const arm of [comparison.baseline, comparison.history]) {
    const d = arm.decision, p = d.engineProvenance;
    validateDecision(d, campaign, opportunity, FIXTURE_CLOCK);
    assert.equal(d.conversionProbability, null);
    assert.equal(p.model, null);
    assert.equal(p.catalogueHash, catalogue.contentHash);
    assert.ok(d.relevanceLevel <= ceiling, 'history_cannot_add_declared_capability');
    assert.deepEqual(arm.bid, computeBid(d, campaign, campaign.budgetCapBaseUnits, input.draft.depositBaseUnits, opportunity.floorBaseUnits));
    if (missing.length || ceiling === 0 || opportunity.coarseIntent !== 'travel_tools') {
      assert.notEqual(d.decision, 'bid', 'unsupported_or_required_mismatch_must_skip');
      assert.equal(arm.bid.status, 'no_bid');
    }
    if (arm.bid.status === 'bid') {
      const amount = BigInt(arm.bid.amountBaseUnits);
      assert.ok(amount >= BigInt(opportunity.floorBaseUnits));
      for (const cap of [campaign.maxBidBaseUnits, campaign.budgetCapBaseUnits, input.draft.depositBaseUnits]) assert.ok(amount <= BigInt(cap));
    }
    assert.equal(p.retrieval.availableRecords, catalogue.records.length);
    const selected = p.retrieval.selected;
    assert.ok(selected.length <= POLICY.profileLimit);
    assert.deepEqual(p.supportingHistoricalEvidenceIds, selected.map(r => r.id));
    assert.equal(new Set(selected.map(r => `${r.promptId}:${r.hint?.id ?? r.creativeId}`)).size, selected.length);
    for (const r of selected) {
      const row = catalogue.records.find(source => source.id === r.id);
      assert.ok(row, 'selected_source_must_exist');
      for (const key of ['promptId', 'promptText', 'creativeId', 'creativeText', 'advertiser', 'hint']) assert.deepEqual(r[key], row[key]);
      assert.equal(r.sourceHash, row.source.sourceHash);
      assert.ok(r.sharedTaskFeatures.length >= POLICY.minSharedFeatures);
      assert.ok(r.sharedCampaignFeatures.length >= POLICY.minSharedFeatures);
      assert.ok(r.affinity + 0.000001 >= POLICY.minAffinity); // Provenance is rounded.
      assert.ok(r.topicAnchors.some(topic => matched.includes(topic)));
    }
  }
  assert.equal(comparison.baseline.decision.engineProvenance.retrieval.selected.length, 0);
  const history = comparison.history.decision.engineProvenance;
  if (history.retrieval.selected.length === 0) {
    assert.equal(history.fallbackReason, 'no_aligned_historical_support');
    assert.equal(decisionSignature(comparison.baseline), decisionSignature(comparison.history));
  }
  assert.equal(comparison.changed, decisionSignature(comparison.baseline) !== decisionSignature(comparison.history));
}

export function summarize(rows) {
  const count = predicate => rows.filter(predicate).length;
  return {
    tasks: rows.length, pairedComparisons: rows.length, armDecisions: rows.length * 2,
    changed: count(r => r.comparison.changed), unchanged: count(r => !r.comparison.changed),
    participationChanges: count(r => r.comparison.baseline.decision.decision !== r.comparison.history.decision.decision),
    relevanceBandChanges: count(r => r.comparison.baseline.decision.relevanceLevel !== r.comparison.history.decision.relevanceLevel),
    bidChanges: count(r => hash(r.comparison.baseline.bid) !== hash(r.comparison.history.bid)),
    baselineBids: count(r => r.comparison.baseline.bid.status === 'bid'), historyBids: count(r => r.comparison.history.bid.status === 'bid'),
    historyWithoutAlignedSupport: count(r => r.comparison.history.decision.engineProvenance.retrieval.selected.length === 0),
    safetyCheckedPairs: rows.length, safetyViolations: 0,
    independentTrueFitLabels: 0, claimedLift: null,
  };
}

/** All engine inputs are offline in-memory projections; both arms share policy. */
export function buildComparison({ measure = false } = {}) {
  const catalogue = loadEvidence();
  assert.equal(catalogue.records.length, 18, 'bounded_comparison_requires_original_18_rows');
  assert.equal(new Set(CASES.map(c => c.id)).size, 12);
  assert.equal(new Set(CASES.map(c => c.prompt)).size, 12);
  const elapsed = [];
  const cases = CASES.map(task => {
    const input = caseInput(task, catalogue);
    const before = hash(input), started = performance.now();
    const comparison = compareDecisions(input);
    if (measure) elapsed.push({ caseId: task.id, elapsedMs: Math.round((performance.now() - started) * 1000) / 1000 });
    assert.equal(hash(input), before, 'comparison_must_not_mutate_inputs');
    assertComparison(input, comparison);
    const { catalogue: _catalogue, ...projection } = input;
    return { ...task, input: projection, inputHash: hash(projection), comparison };
  });
  const stable = {
    schemaVersion: 'advertiser-offline-comparison-packet.v1', mode: 'synthetic', presentation: 'offline_decision_comparison',
    panel: { version: PANEL_VERSION, hash: PANEL_HASH, tasks: CASES, evidenceIds: EVIDENCE_IDS, labelProvenance: 'authored_demonstration_and_declaration_checks_not_independent_true_fit', fixtureClock: FIXTURE_CLOCK },
    provenance: {
      catalogueHash: catalogue.contentHash, catalogueFileSha256: byteHash(DEFAULT_EVIDENCE_PATH), sourceMode: catalogue.sourceMode, catalogueCapturedAt: catalogue.capturedAt,
      rows: catalogue.records.map(row => ({ id: row.id, rowHash: hash(row), sourceHash: row.source.sourceHash })),
      associationRows: catalogue.records.length, distinctPrompts: new Set(catalogue.records.map(r => r.promptId)).size,
      engine: { path: 'packages/advertiser/decision-engine.mjs', sha256: byteHash(repoFile('packages/advertiser/decision-engine.mjs')), policy: POLICY, policyHash: hash(POLICY) },
      inputModuleHashes: ['packages/advertiser/service.mjs', 'packages/advertiser/evidence.mjs', 'packages/contracts/index.mjs', 'packages/ml/core.mjs'].map(path => ({ path, sha256: byteHash(repoFile(path)) })),
      harnessSha256: byteHash(fileURLToPath(import.meta.url)),
    },
    executionBoundary: { taskProjections: 12, persistedOpportunities: 0, sessionsCreated: 0, channelsCreated: 0, reservations: 0, deliveries: 0, charges: 0, modelCalls: 0, embeddingCalls: 0, upstreamQueries: 0, walletOperations: 0, externalRequests: 0, stateModel: 'in_memory_counterfactual_only', amounts: 'hypothetical_integer_base_units_not_funding' },
    cases, summary: summarize(cases),
    limitations: [
      'Twelve authored tasks are demonstrations and declaration checks, not independent task-fit labels or a held-out quality benchmark.',
      'Changed decisions or bids are heuristic behavior differences, not demonstrated lift, conversions, causality or calibrated relevance.',
      'Both arms use the same corpus-derived lexical IDF; the comparison isolates added historical packets, not all historical-data influence.',
      'Historical associations are not impressions, advertiser enrollment or product capability evidence; inferred hints remain hypotheses.',
      'No auction, stateful opportunity, funded channel, reservation, placement, charge, model, wallet or payment operation occurs.',
      'Fixture time is not an observation window. Catalogue capture time is export provenance, not trustworthy historical serving time.',
    ],
  };
  const packet = { ...stable, contentHash: hash(stable) };
  if (measure) packet.measurement = { observedAt: new Date().toISOString(), nodeVersion: process.version, platform: process.platform, architecture: process.arch, scope: 'single sequential pass; full two-arm compareDecisions call only; excludes loading, artifact validation, IO and exchange', pairedCalls: 12, samples: elapsed, totalMs: Math.round(elapsed.reduce((sum, r) => sum + r.elapsedMs, 0) * 1000) / 1000, reproducibility: 'measurement excluded from deterministic contentHash; no production latency or per-arm speed claim' };
  return packet;
}

export function deterministicPacket(packet) {
  const { measurement: _measurement, contentHash: _contentHash, ...stable } = packet;
  return stable;
}

function main(args) {
  assert.ok(args.length <= 1 && (!args.length || ['--write', '--check'].includes(args[0])), 'usage: node scripts/demo/evidence-decision-comparison.mjs [--write|--check]');
  const packet = buildComparison({ measure: args[0] === '--write' });
  if (args[0] === '--write') {
    const bytes = `${JSON.stringify(packet, null, 2)}\n`;
    assert.ok(Buffer.byteLength(bytes) <= 256 * 1024, 'bounded_comparison_artifact_too_large');
    writeFileSync(OUTPUT_PATH, bytes, { mode: 0o644 });
  }
  if (args[0] === '--check') {
    const saved = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
    assert.equal(saved.contentHash, hash(deterministicPacket(saved)), 'saved_comparison_hash_invalid');
    assert.deepEqual(deterministicPacket(saved), deterministicPacket(packet), 'comparison_artifact_drift');
  }
  console.log(JSON.stringify({ panelHash: PANEL_HASH, contentHash: packet.contentHash, summary: packet.summary, ...(args[0] === '--write' ? { output: OUTPUT_PATH } : {}) }, null, 2));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main(process.argv.slice(2));
