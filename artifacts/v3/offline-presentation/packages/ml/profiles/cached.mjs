import { assert, object, array, ids, unique, safeText, hash, textHash, freeze } from '../core.mjs';
import { validateCampaign } from '../engines/contract.mjs';

const MODEL = 'BAAI/bge-base-en-v1.5';
const TIERS = ['sparse', 'holdout', 'loo', 'leave-one-out', 'unknown'];
const BASE_FLAGS = ['association_not_fit_label', 'revision_unrecorded', 'no_independent_fit_labels'];
const sourceId = n => assert(Number.isSafeInteger(n) && n > 0, 'source_id_invalid');
const digest = h => assert(typeof h === 'string' && /^[a-f0-9]{64}$/u.test(h), 'hash_invalid');
const count = n => assert(Number.isSafeInteger(n) && n >= 0, 'count_invalid');
function screened(text, max = 240) {
  try {
    safeText(text, max);
    assert(text.trim().length > 0);
    assert(!/\b(pregnan\w*|hiv|religion|political affiliation|sexual orientation|medical diagnosis|race-based|ethnicity|passport|ssn|my phone|my email|my address)\b/iu.test(text));
    return true;
  } catch { return false; }
}
function queryHash(text) {
  // Same legacy Python whitespace set as cached-corpus.mjs; no new vector generation.
  return textHash(text.toLowerCase().replace(/[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ' ').replace(/^ +| +$/gu, ''));
}

/** Validate the adapter's vector-free projection, never accept raw DB rows. */
export function validateCachedLookupResult(result, taskText) {
  object(result, ['schemaVersion', 'status', 'provenance', 'matches']);
  assert(result.schemaVersion === 'cached-corpus-result.v1');
  assert(['ready', 'query_vector_unavailable'].includes(result.status));
  const p = result.provenance;
  object(p, ['database', 'readOnly', 'model', 'dimension', 'revision', 'queryVectorId', 'queryTextHash', 'normalization', 'category', 'sourceVectors', 'qualityFlags', 'screening', 'requestedLimit', 'mappingLimitPerPrompt', 'statementTimeoutMs', 'processTimeoutMs', 'embeddingCalls', 'fallback']);
  assert(p.database === 'ads' && p.readOnly === true && p.model === MODEL && p.dimension === 768 && p.revision === 'unrecorded', 'cached_source_invalid');
  assert(p.normalization === 'legacy-lower-trim-whitespace-sha256' && p.category === 'travel-hospitality');
  digest(p.queryTextHash);
  if (taskText !== undefined) assert(p.queryTextHash === queryHash(taskText), 'cached_query_mismatch');
  if (p.queryVectorId !== null) sourceId(p.queryVectorId);
  assert((result.status === 'ready') === (p.queryVectorId !== null), 'cached_status_invalid');
  assert(Number.isInteger(p.requestedLimit) && p.requestedLimit >= 1 && p.requestedLimit <= 5);
  assert(p.mappingLimitPerPrompt === 3 && p.statementTimeoutMs === 8000 && p.processTimeoutMs === 12000 && p.embeddingCalls === 0 && p.fallback === null);
  object(p.screening, ['omittedPrompts', 'omittedMappings', 'omittedHints']); Object.values(p.screening).forEach(count);
  ids(p.qualityFlags, 10);
  assert(p.qualityFlags.every(f => ['association_not_fit_label', 'revision_unrecorded', 'inferred_not_fit_groundtruth', 'sparse_hint'].includes(f)));
  assert(['association_not_fit_label', 'revision_unrecorded'].every(f => p.qualityFlags.includes(f)));
  array(p.sourceVectors, 40, v => {
    object(v, ['kind', 'entityId', 'vectorId', 'model', 'dimension', 'revision']);
    assert(['prompt', 'ad', 'hint'].includes(v.kind)); sourceId(v.entityId); sourceId(v.vectorId);
    assert(v.model === MODEL && v.dimension === 768 && v.revision === 'unrecorded');
  });
  unique(p.sourceVectors.map(v => `${v.kind}:${v.entityId}:${v.vectorId}`));
  array(result.matches, p.requestedLimit, m => {
    object(m, ['promptId', 'promptText', 'similarity', 'mappings']); sourceId(m.promptId);
    assert(typeof m.promptText === 'string');
    assert(Number.isFinite(m.similarity) && m.similarity >= -1 && m.similarity <= 1);
    array(m.mappings, 3, a => {
      object(a, ['mappingId', 'creativeId', 'advertiser', 'creativeText', 'hint']); sourceId(a.mappingId); sourceId(a.creativeId);
      assert(typeof a.advertiser === 'string' && typeof a.creativeText === 'string');
      if (a.hint !== null) {
        const h = a.hint; object(h, ['id', 'text', 'tier', 'modelVersion', 'reconstructionAuc']); sourceId(h.id);
        assert(typeof h.text === 'string' && typeof h.modelVersion === 'string' && TIERS.includes(h.tier));
        assert(h.reconstructionAuc === null || Number.isFinite(h.reconstructionAuc) && h.reconstructionAuc >= 0 && h.reconstructionAuc <= 1);
      }
    });
    unique(m.mappings.map(a => a.creativeId)); unique(m.mappings.map(a => a.mappingId));
  });
  unique(result.matches.map(m => m.promptId));
  unique(result.matches.flatMap(m => m.mappings.map(a => a.mappingId)));
  assert(result.status === 'ready' || result.matches.length === 0);
  return result;
}

/** Omit unfit packet lengths entirely; never change text while keeping cached provenance. */
export function screenedCachedAssociations(result) {
  validateCachedLookupResult(result);
  return result.matches.filter(m => screened(m.promptText)).flatMap(m => m.mappings
    .filter(a => screened(a.advertiser) && screened(a.creativeText, 2400))
    .map(a => ({ match: m, mapping: a })))
    .sort((a, b) => b.match.similarity-a.match.similarity || a.match.promptId-b.match.promptId || a.mapping.mappingId-b.mapping.mappingId);
}

function flagsFor(examples, hints) {
  return [...BASE_FLAGS, ...(examples.length < 3 ? ['sparse_history'] : []),
    ...(hints.length ? ['inferred_not_fit_groundtruth'] : []), ...(hints.some(h => h.tier === 'sparse') ? ['sparse_hint'] : [])].sort();
}

export function buildCachedCampaignProfile(campaign, options, lookupResult) {
  validateCampaign(campaign);
  object(options, ['approvedTargetingText', 'selectedCreativeIds']);
  safeText(options.approvedTargetingText, 1200);
  array(options.selectedCreativeIds, 5, sourceId); unique(options.selectedCreativeIds);
  const selected = [...options.selectedCreativeIds].sort((a, b) => a-b);
  const rows = screenedCachedAssociations(lookupResult).filter(r => selected.includes(r.mapping.creativeId)).slice(0, 5);
  const observedExamples = rows.map(({ match: m, mapping: a }) => ({
    id: `source:mapping:${a.mappingId}`, promptId: m.promptId, creativeId: a.creativeId, mappingId: a.mappingId,
    text: m.promptText, advertiser: a.advertiser, similarity: m.similarity,
  }));
  const inferredHints = [];
  for (const { mapping: a } of rows) {
    const h = a.hint;
    if (!h || !screened(h.text) || !screened(h.modelVersion, 160) || inferredHints.length === 2 || inferredHints.some(x => x.id === `source:hint:${h.id}`)) continue;
    inferredHints.push({ id: `source:hint:${h.id}`, creativeId: a.creativeId, text: h.text, tier: h.tier, modelVersion: h.modelVersion });
  }
  const content = {
    schemaVersion: 'cached-campaign-profile.v1', campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId,
    campaignContentHash: hash(campaign), profileBuilderVersion: 'cached-profile-v1', snapshotContentHash: hash(lookupResult),
    approvedTargetingText: options.approvedTargetingText, approvedCreativeVersionIds: campaign.creatives.map(c => c.creativeVersionId).sort(),
    sourceSeedHash: lookupResult.provenance.queryTextHash, sourceVectorRevision: 'unrecorded', sourceCreativeIds: selected,
    observedExamples, inferredHints, qualityFlags: flagsFor(observedExamples, inferredHints),
    historyStatus: lookupResult.status === 'ready' && observedExamples.length > 0 ? 'ready' : 'unavailable',
  };
  const profile = { ...content, profileHash: hash(content) };
  validateCachedCampaignProfile(profile, campaign);
  return freeze(profile);
}

export function validateCachedCampaignProfile(p, campaign) {
  validateCampaign(campaign);
  object(p, ['schemaVersion', 'campaignId', 'campaignVersionId', 'campaignContentHash', 'profileHash', 'profileBuilderVersion', 'snapshotContentHash', 'approvedTargetingText', 'approvedCreativeVersionIds', 'sourceSeedHash', 'sourceVectorRevision', 'sourceCreativeIds', 'observedExamples', 'inferredHints', 'qualityFlags', 'historyStatus']);
  assert(p.schemaVersion === 'cached-campaign-profile.v1' && p.profileBuilderVersion === 'cached-profile-v1');
  assert(p.campaignId === campaign.campaignId && p.campaignVersionId === campaign.campaignVersionId && p.campaignContentHash === hash(campaign), 'profile_campaign_mismatch');
  ['profileHash', 'campaignContentHash', 'snapshotContentHash', 'sourceSeedHash'].forEach(k => digest(p[k]));
  const { profileHash, ...content } = p; assert(profileHash === hash(content), 'profile_hash_mismatch');
  safeText(p.approvedTargetingText, 1200); ids(p.approvedCreativeVersionIds, 30);
  assert(hash(p.approvedCreativeVersionIds) === hash(campaign.creatives.map(c => c.creativeVersionId).sort()), 'profile_campaign_mismatch');
  assert(p.sourceVectorRevision === 'unrecorded');
  array(p.sourceCreativeIds, 5, sourceId); unique(p.sourceCreativeIds);
  assert(hash(p.sourceCreativeIds) === hash([...p.sourceCreativeIds].sort((a, b) => a-b)), 'source_order_invalid');
  array(p.observedExamples, 5, e => {
    object(e, ['id', 'promptId', 'creativeId', 'mappingId', 'text', 'advertiser', 'similarity']);
    sourceId(e.promptId); sourceId(e.creativeId); sourceId(e.mappingId);
    assert(e.id === `source:mapping:${e.mappingId}` && p.sourceCreativeIds.includes(e.creativeId), 'profile_source_mismatch');
    assert(screened(e.text) && screened(e.advertiser), 'profile_text_rejected');
    assert(Number.isFinite(e.similarity) && e.similarity >= -1 && e.similarity <= 1);
  });
  ids(p.observedExamples.map(e => e.id), 5);
  array(p.inferredHints, 2, h => {
    object(h, ['id', 'creativeId', 'text', 'tier', 'modelVersion']); sourceId(h.creativeId);
    assert(/^source:hint:[1-9]\d*$/u.test(h.id) && Number.isSafeInteger(Number(h.id.split(':').at(-1))), 'source_id_invalid');
    assert(p.sourceCreativeIds.includes(h.creativeId) && p.observedExamples.some(e => e.creativeId === h.creativeId), 'profile_source_mismatch');
    assert(screened(h.text) && screened(h.modelVersion, 160) && TIERS.includes(h.tier), 'profile_hint_invalid');
  });
  ids(p.inferredHints.map(h => h.id), 2); ids(p.qualityFlags, 10);
  assert(hash(p.qualityFlags) === hash(flagsFor(p.observedExamples, p.inferredHints)), 'profile_quality_invalid');
  assert(['ready', 'unavailable'].includes(p.historyStatus));
  assert((p.historyStatus === 'ready') === (p.observedExamples.length > 0), 'profile_status_invalid');
  return p;
}
