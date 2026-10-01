import { readFileSync, mkdirSync, writeFileSync, statfsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createCachedCorpus } from '../../packages/ml/data_adapter/cached-corpus.mjs';
import { createEvidenceService } from '../../apps/backend/evidence.mjs';
import { PHASE2_SEED, PHASE2_CASES, PHASE2_CAMPAIGNS } from '../../packages/dsp/phase2-fixtures.mjs';
import { validateCachedCampaignProfile } from '../../packages/ml/profiles/cached.mjs';
import { assert, hash } from '../../packages/ml/core.mjs';
import { DEFAULT_EVIDENCE_PATH, EVIDENCE_SCHEMA, evidenceText, validateEvidence, loadEvidence } from '../../packages/advertiser/evidence.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROFILE_PATH = resolve(ROOT, 'artifacts/phase5/replay/source-profiles.json');
// Pin the existing V1 recorded source as well as verifying its manifest entry.
const PROFILE_HASH = '9c22053b9a79ddaf2f02bd00d795176566eb011fff7bea251ec147cbb8a3d772';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const LIMITATIONS = [
  'Narrow travel-hospitality background subset within the measured prompt panel, not all ContextHint data or all AI demand.',
  'Historical prompt-creative associations are not task-fit labels, impressions, conversions, economic value or real-world query volume.',
  'Historical brands are not enrolled AXP advertisers; captured copy is reference evidence, not approved campaign creative or licensed inventory.',
  'Hints are inferred targeting hypotheses, not advertiser configuration; sparse tiers and reconstruction diagnostics are not conversion probabilities.',
  'CapturedAt is catalogue export time, not an observation window; source capture times and database revision remain unknown.',
  'Hashes detect content changes, not independent authenticity, licensing rights or original-time attestation.',
  'No raw vectors, images, raw answers, tenant requests, credentials or private conversations are exported.',
  'Compute database inventory, when available, is separate from the user-reported Sep26 servingDB snapshot; these numbers are not combined.',
];

function recordedSource() {
  const bytes = readFileSync(PROFILE_PATH);
  assert(bytes.length <= 64 * 1024 && sha(bytes) === PROFILE_HASH, 'recorded_source_hash_mismatch');
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'artifacts/phase5/replay/manifest.json'), 'utf8'));
  assert(manifest.schemaVersion === 'axp.replay-bundle.v1' && manifest.files['source-profiles.json'] === PROFILE_HASH, 'recorded_source_manifest_mismatch');
  const saved = JSON.parse(bytes);
  assert(saved.runId === 'phase4-20261001-acceptance' && saved.captureKind === 'existing_public_local_bootstrap' && saved.noNewLookup === true && saved.profiles.length === 3, 'recorded_source_invalid');
  const seen = new Set();
  for (const p of saved.profiles) {
    const campaign = PHASE2_CAMPAIGNS.find(c => c.campaignId === p.campaignId);
    assert(campaign && !seen.has(p.campaignId), 'recorded_source_invalid'); seen.add(p.campaignId);
    validateCachedCampaignProfile(p, campaign);
  }
  return saved;
}

function sourceBase(sourceHash, creativeTextStatus) {
  return { database: 'ads', readOnly: true, sourceHash, category: 'travel-hospitality', revision: 'unrecorded', selectionVersion: 'advertiser-travel-bounded-v1', creativeTextStatus };
}
function seal(content) {
  const catalogue = { ...content, contentHash: hash(content) };
  return validateEvidence(catalogue);
}
function fallback(saved, capturedAt, reason) {
  const rows = new Map();
  for (const p of saved.profiles) for (const e of p.observedExamples) {
    const hinted = p.inferredHints.find(h => h.creativeId === e.creativeId);
    const hint = hinted ? { id: Number(hinted.id.split(':').at(-1)), text: hinted.text, tier: hinted.tier, modelVersion: hinted.modelVersion, reconstructionAuc: null, semantics: 'inferred_targeting_not_advertiser_configuration' } : null;
    const record = { id: `ads:mapping:${e.mappingId}`, promptId: e.promptId, promptText: e.text, creativeId: e.creativeId, mappingId: e.mappingId, advertiser: e.advertiser, creativeText: null, hint,
      source: { ...sourceBase(PROFILE_HASH, 'unavailable_in_recorded_profile'), profileHashes: [p.profileHash], recordedAt: saved.capturedAt } };
    const prior = rows.get(record.id);
    if (prior) {
      const { source: _a, ...a } = prior, { source: _b, ...b } = record;
      assert(hash(a) === hash(b), 'recorded_association_conflict');
      prior.source.profileHashes = [...new Set([...prior.source.profileHashes, p.profileHash])].sort();
    } else rows.set(record.id, record);
  }
  return seal({ schemaVersion: EVIDENCE_SCHEMA, capturedAt, sourceMode: 'recorded_profile_excerpt', limitations: [...LIMITATIONS,
    reason,
    'This is a hash-verified saved V1 profile excerpt captured from the Phase4 public bootstrap, not a refreshed database export.',
    'Creative text and actual inventory are unavailable in the recorded source; creativeText and inventory are null. No copy is fabricated.',
  ], inventory: null, records: [...rows.values()].sort((a, b) => a.mappingId - b.mappingId) });
}

/** At most one aggregate inventory and five fixed lookups, with no retries. */
export async function buildAdvertiserEvidence({ corpus = createCachedCorpus(), capturedAt = new Date().toISOString(), recordedOnly = false } = {}) {
  const saved = recordedSource();
  if (recordedOnly) return fallback(saved, capturedAt, 'Recorded-only export selected; current source accessibility was not probed.');
  let inventory;
  try { inventory = await corpus.inventory(); }
  catch { return fallback(saved, capturedAt, 'Local compute source was inaccessible during the bounded read attempt; no current inventory was obtained.'); }
  // Validate source identity before spending any of the five lookup slots.
  assert(inventory?.provenance?.database === 'ads' && inventory.provenance.readOnly === true, 'export_source_invalid');
  const queries = [...new Set([PHASE2_SEED, ...saved.profiles.flatMap(p => p.observedExamples.map(e => e.text)), PHASE2_CASES.find(c => c.familyId === 'booking').prompt])];
  assert(queries.length === 5, 'fixed_query_bound_invalid');
  const service = createEvidenceService({ corpus });
  const rows = new Map();
  let failures = 0, misses = 0, omitted = 0;
  for (const prompt of queries) {
    let packet;
    try { packet = await service.lookup({ prompt }); }
    catch { failures++; continue; }
    if (packet.status !== 'ready') { misses++; continue; }
    // Hash only the safe public text projection, without vector identity arrays.
    const packetHash = hash({ schemaVersion: packet.schemaVersion, status: packet.status, database: packet.provenance.database, readOnly: packet.provenance.readOnly, queryTextHash: packet.provenance.queryTextHash, matches: packet.matches });
    for (const m of packet.matches) for (const a of m.mappings) {
      try {
        evidenceText(m.promptText); evidenceText(a.advertiser, 160); evidenceText(a.creativeText);
        if (a.hint) { evidenceText(a.hint.text); evidenceText(a.hint.modelVersion, 160); }
      } catch { omitted++; continue; }
      const record = { id: `ads:mapping:${a.mappingId}`, promptId: m.promptId, promptText: m.promptText, creativeId: a.creativeId, mappingId: a.mappingId, advertiser: a.advertiser, creativeText: a.creativeText, hint: a.hint,
        source: { ...sourceBase(packetHash, 'historical_observed_copy'), queryTextHashes: [packet.provenance.queryTextHash] } };
      const prior = rows.get(record.id);
      if (prior) {
        const { source: _a, ...first } = prior.record, { source: _b, ...next } = record;
        assert(hash(first) === hash(next), 'export_association_changed_between_reads');
        prior.hashes.add(packetHash);
        prior.record.source.queryTextHashes = [...new Set([...prior.record.source.queryTextHashes, packet.provenance.queryTextHash])].sort();
      } else rows.set(record.id, { record, hashes: new Set([packetHash]) });
    }
  }
  if (!rows.size) return fallback(saved, capturedAt, `No usable records from five bounded lookups: ${failures} failed, ${misses} cache misses, ${omitted} unsafe associations omitted. No refreshed inventory is published in this recorded mode.`);
  const records = [...rows.values()].map(({ record, hashes }) => ({ ...record, source: { ...record.source, sourceHash: hash([...hashes].sort()) } })).sort((a, b) => a.mappingId - b.mappingId);
  return seal({ schemaVersion: EVIDENCE_SCHEMA, capturedAt, sourceMode: 'cached_database_export', limitations: [...LIMITATIONS,
    `One actual local compute inventory and five fixed cached lookups; ${failures} failures, ${misses} cache misses, ${omitted} unsafe associations omitted; at most 75 unique mapping records.`,
    'Preparation uses existing cached-vector neighbor retrieval; catalogue search uses exact lexical tokens only, not vectors or machine learning. No new embeddings generated.',
    'Lookups and inventory use separate repeatable-read read-only transactions; this is a bounded export, not a single atomic database snapshot or full clone.',
    'Duplicate mapping IDs across lookups are merged with query hashes; distinct source mapping IDs remain separate historical associations, not impression counts.',
  ], inventory, records });
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(x => ['--verify-only', '--recorded-only'].includes(x)), 'export_option_invalid');
  let catalogue;
  if (flags.includes('--verify-only')) catalogue = loadEvidence();
  else {
    const disk = statfsSync(ROOT); assert(disk.bavail * disk.bsize >= 50 * 1024 ** 3, 'export_free_space_floor');
    catalogue = await buildAdvertiserEvidence({ recordedOnly: flags.includes('--recorded-only') });
    mkdirSync(dirname(DEFAULT_EVIDENCE_PATH), { recursive: true });
    writeFileSync(DEFAULT_EVIDENCE_PATH, JSON.stringify(catalogue, null, 2) + '\n');
    catalogue = loadEvidence();
  }
  console.log(JSON.stringify({ schemaVersion: catalogue.schemaVersion, sourceMode: catalogue.sourceMode, recordCount: catalogue.records.length, creativeTextCount: catalogue.records.filter(r => r.creativeText !== null).length, hintCount: catalogue.records.filter(r => r.hint !== null).length, inventoryAvailable: catalogue.inventory !== null, contentHash: catalogue.contentHash }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('advertiser_evidence_export_failed'); process.exitCode = 1; });
