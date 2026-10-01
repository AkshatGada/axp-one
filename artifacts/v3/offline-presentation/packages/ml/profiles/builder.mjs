import { assert, object, ids, safeText, hash, freeze } from '../core.mjs';
import { validateCampaign, validateProfile } from '../engines/contract.mjs';

/** Selection is explicit and reviewed by the caller; it cannot use held-out evidence. */
export function buildCampaignProfile(campaign, snapshot, selection) {
  validateCampaign(campaign);
  object(selection, ['approvedTargetingText', 'observedAssociationIds', 'contrastAssociationIds', 'inferredHintIds']);
  safeText(selection.approvedTargetingText, 1200); ids(selection.observedAssociationIds, 5); ids(selection.contrastAssociationIds, 3); ids(selection.inferredHintIds, 2);
  assert(snapshot.manifest.contentHash === hash(snapshot.records) && snapshot.manifest.splitManifestHash === snapshot.splits.contentHash, 'snapshot_hash_mismatch');
  const { contentHash, ...splitContent } = snapshot.splits; assert(contentHash === hash(splitContent), 'split_hash_mismatch');
  assert(snapshot.splits.status === 'ready', 'split_infeasible');
  const exampleIds = new Set(snapshot.splits.assignments.filter(a => a.split === 'example').map(a => a.evidenceId));
  const records = new Map([...snapshot.records.prompts, ...snapshot.records.creatives, ...snapshot.records.associations, ...snapshot.records.hints].map(r => [r.id, r]));
  const vectorMap = new Map(snapshot.records.vectors.map(v => [v.evidenceId, v.values]));
  const getExample = key => {
    assert(exampleIds.has(key), 'held_out_evidence'); const a = records.get(key); assert(a && a.promptId && a.creativeId, 'association_required');
    assert(exampleIds.has(a.promptId) && exampleIds.has(a.creativeId), 'held_out_evidence');
    const p = records.get(a.promptId), c = records.get(a.creativeId);
    // Omit long text rather than truncate and accidentally preserve an incompatible vector.
    safeText(p.text, 240);
    return { id: a.id, familyId: p.familyId, historicalAdvertiserGroupId: c.advertiserGroupId, text: p.text, vector: vectorMap.get(p.id) ?? null };
  };
  const observedExamples = selection.observedAssociationIds.slice().sort().map(getExample);
  const contrastExamples = selection.contrastAssociationIds.slice().sort().map(getExample);
  const inferredHints = selection.inferredHintIds.slice().sort().map(key => {
    assert(exampleIds.has(key), 'held_out_evidence'); const h = records.get(key); assert(h?.tier && h.supportingEvidenceIds.every(k => exampleIds.has(k)), 'held_out_evidence'); safeText(h.text, 240);
    return { id: h.id, text: h.text, tier: h.tier, qualityFlags: h.qualityFlags };
  });
  const independentPromptFamilyCount = new Set(observedExamples.map(e => e.familyId)).size;
  const historicalAdvertiserCount = new Set(observedExamples.map(e => e.historicalAdvertiserGroupId)).size;
  const historyReady = independentPromptFamilyCount >= 3 && historicalAdvertiserCount >= 2 && new Set(contrastExamples.map(e => e.familyId)).size >= 2 && snapshot.manifest.embeddingSpace !== null && [...observedExamples, ...contrastExamples].every(e => e.vector !== null);
  const content = { schemaVersion: 'campaign-evidence-profile.v1', profileId: 'profile:' + hash([campaign, selection, snapshot.manifest.contentHash]).slice(0, 24), campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId, campaignContentHash: hash(campaign), snapshotId: snapshot.manifest.snapshotId, snapshotContentHash: snapshot.manifest.contentHash, splitManifestHash: snapshot.splits.contentHash, profileBuilderVersion: 'profile-builder-v1', approvedTargetingText: selection.approvedTargetingText, approvedCreativeVersionIds: campaign.creatives.map(c => c.creativeVersionId).sort(), embeddingSpace: snapshot.manifest.embeddingSpace, observedExamples, contrastExamples, inferredHints, independentPromptFamilyCount, historicalAdvertiserCount, qualityFlags: [...new Set(['association_not_fit_label', ...(!historyReady ? ['thin_profile'] : []), ...inferredHints.flatMap(h => h.qualityFlags)])].sort(), historyStatus: historyReady ? 'ready' : 'unavailable' };
  const profile = { ...content, profileHash: hash(content) }; validateProfile(profile, campaign);
  return freeze(structuredClone(profile));
}
