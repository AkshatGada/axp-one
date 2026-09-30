import test from 'node:test';
import assert from 'node:assert/strict';
import { curateSnapshot, buildCampaignProfile, createExactIndex, hash, textHash, SNAPSHOT_CAPS } from '../../packages/ml/index.mjs';
import { snapshotInput, bayCampaign } from './fixtures.mjs';

test('C01 strict export rejects unknown fields at all boundaries and dangling references', () => {
  for (const mutate of [x => x.rawResponses = [], x => x.prompts[0].email = 'x', x => x.creatives[0].destinationURL = 'https://fixture.example', x => x.associations[0].requestId = 'private', x => x.vectors[0].credential = 'private', x => x.associations[0].promptId = 'missing']) {
    const input = snapshotInput(); mutate(input); assert.throws(() => curateSnapshot(input));
  }
});
test('D01/D03 normalized duplicates merge associations and source provenance', () => {
  const input = snapshotInput();
  input.prompts.push({ ...input.prompts[0], id: 'p-dup', text: '  FIND  hotel offer for fictional trip 0  ', sourceRefs: ['fixture/duplicate-p'] });
  input.associations.push({ ...input.associations[0], id: 'a-duplicate', promptId: 'p-dup', sourceRefs: ['fixture/duplicate-m'] });
  const s = curateSnapshot(input); assert.equal(s.manifest.counts.prompts, 10); assert.equal(s.manifest.counts.mappings, 10);
  const row = s.records.associations.find(a => a.creativeId === 'c0'); assert.equal(row.sourceRefs.length, 2); assert.equal(row.observations.length, 2);
});
test('D02/D10 reviewed paraphrases and historical advertiser groups never cross splits', () => {
  const input = snapshotInput();
  input.prompts[0].familyId = input.prompts[1].familyId = 'reviewed-paraphrase'; input.prompts[0].familyReviewed = input.prompts[1].familyReviewed = true;
  input.creatives[2].advertiserGroupId = input.creatives[3].advertiserGroupId = 'shared-advertiser';
  const s = curateSnapshot(input); assert.equal(s.splits.status, 'ready');
  const assignment = new Map(s.splits.assignments.map(a => [a.evidenceId, a]));
  assert.equal(assignment.get('p0').componentId, assignment.get('p1').componentId);
  assert.equal(assignment.get('c2').componentId, assignment.get('c3').componentId);
  for (const a of s.records.associations) assert.equal(assignment.get(a.promptId).split, assignment.get(a.creativeId).split);
  const families = new Map(), advertisers = new Map();
  for (const p of s.records.prompts) { const split = assignment.get(p.id).split; assert(!families.has(p.familyId) || families.get(p.familyId) === split); families.set(p.familyId, split); }
  for (const c of s.records.creatives) { const split = assignment.get(c.id).split; assert(!advertisers.has(c.advertiserGroupId) || advertisers.get(c.advertiserGroupId) === split); advertisers.set(c.advertiserGroupId, split); }
});
test('D04/D05/D06 distinct content retained; unknown geography and no-fit labels stay unknown', () => {
  const s = curateSnapshot(snapshotInput()); assert.equal(s.records.creatives.length, 10);
  assert(s.records.associations.every(a => a.qualityFlags.includes('geo_unknown') && a.qualityFlags.includes('capture_time_unknown') && a.qualityFlags.includes('association_not_fit_label') && a.qualityFlags.includes('no_observed_ad_not_negative')));
  assert.equal(s.manifest.source.snapshotTime, null); assert.equal(s.manifest.ingestionStatus, 'fixture_only_real_ingestion_pending');
  const empty = snapshotInput(); empty.associations = []; const e = curateSnapshot(empty); assert.equal(e.records.creatives.length, 0); assert.equal(e.splits.reason, 'no_observed_associations');
});
test('D07 sparse hints retain diagnostic semantics and support links', () => {
  const input = snapshotInput(); input.hints.push({ id: 'hint0', creativeId: 'c0', text: 'Fictional inferred travel need', origin: 'fixture', reviewed: true, sensitive: false, sourceRefs: ['fixture/hint0'], model: 'fixture-model-v1', tier: 'sparse', supportingEvidenceIds: ['p0', 'a-link0'], diagnostics: { reconstructionAuc: .9 } });
  const s = curateSnapshot(input); assert.deepEqual(s.records.hints[0].qualityFlags.filter(k => !k.startsWith('vector')), ['inferred_not_observed', 'sparse_hint']);
  assert.equal(s.splits.assignments.find(a => a.evidenceId === 'hint0').componentId, s.splits.assignments.find(a => a.evidenceId === 'p0').componentId);
});
test('D08/D09 incompatible revision/dimension and changed exact text do not reuse vectors', () => {
  for (const mutate of [x => x.vectors[0].space = { ...x.embeddingSpace, dimension: 384 }, x => x.vectors[0].space = { ...x.embeddingSpace, revision: 'different' }, x => x.prompts[0].text = 'Changed approved prompt', x => x.vectors[0].values = [0, 0]]) {
    const input = snapshotInput(); mutate(input); const s = curateSnapshot(input); assert(!s.records.vectors.some(v => v.evidenceId === 'p0')); assert(s.records.prompts.find(p => p.id === 'p0').qualityFlags.includes('vector_incompatible'));
  }
});
test('unsafe, sensitive and uncertain-origin material omitted, with no cached-vector laundering', () => {
  for (const mutate of [x => x.prompts[0].text = 'Find hotel for person@private.example', x => x.prompts[0].sensitive = true, x => x.prompts[0].reviewed = false, x => x.prompts[0].origin = 'uncertain']) {
    const input = snapshotInput(); mutate(input); const s = curateSnapshot(input); assert(!s.records.prompts.some(p => p.id === 'p0')); assert(!s.records.vectors.some(v => v.evidenceId === 'p0')); assert(s.manifest.exclusions.unsafe_or_unreviewed > 0);
  }
});
test('D11 giant connected corpus blocks held-out study and profile building', () => {
  const input = snapshotInput(); input.creatives.forEach(c => c.advertiserGroupId = 'one-advertiser');
  const s = curateSnapshot(input); assert.equal(s.splits.status, 'blocked'); assert(s.splits.assignments.every(a => a.split === 'blocked'));
  assert.throws(() => buildCampaignProfile(bayCampaign, s, { approvedTargetingText: 'Hotel stays', observedAssociationIds: [], contrastAssociationIds: [], inferredHintIds: [] }), /split_infeasible/);
});
test('D12 snapshot and splits independent of input ordering; manifest hashes reproduce', () => {
  const input = snapshotInput(); const first = curateSnapshot(input);
  for (const k of ['prompts', 'creatives', 'associations', 'vectors']) input[k].reverse();
  const second = curateSnapshot(input); assert.deepEqual(first, second); assert.equal(first.manifest.contentHash, hash(first.records));
  assert(Object.isFrozen(first.records.prompts[0]));
});
test('selection enforces advertiser, family, creative and per-advertiser ceilings', () => {
  const input = snapshotInput(240); const s = curateSnapshot(input);
  for (const [field, cap] of [['mappings', 'mappings'], ['advertisers', 'advertisers'], ['creatives', 'creatives'], ['promptFamilies', 'families'], ['hints', 'hints']]) assert(s.manifest.counts[field] <= SNAPSHOT_CAPS[cap]);
  const single = snapshotInput(30); single.creatives.forEach(c => c.advertiserGroupId = 'one'); assert.equal(curateSnapshot(single).manifest.counts.mappings, 20);
});
test('profiles use example partition only and enforce thin-evidence unavailability', () => {
  const s = curateSnapshot(snapshotInput(20));
  const allowed = s.splits.assignments.filter(a => a.split === 'example').map(a => a.evidenceId);
  const associations = s.records.associations.filter(a => allowed.includes(a.id));
  const selection = { approvedTargetingText: 'Fictional Singapore hotel stays', observedAssociationIds: associations.slice(0, 3).map(a => a.id), contrastAssociationIds: associations.slice(3, 5).map(a => a.id), inferredHintIds: [] };
  const p = buildCampaignProfile(bayCampaign, s, selection); assert.equal(p.historyStatus, 'ready'); assert.equal(p.independentPromptFamilyCount, 3); assert.equal(p.historicalAdvertiserCount, 3);
  assert.equal(p.profileHash, buildCampaignProfile(bayCampaign, s, selection).profileHash);
  const held = s.records.associations.find(a => !allowed.includes(a.id)); assert.throws(() => buildCampaignProfile(bayCampaign, s, { ...selection, observedAssociationIds: [held.id] }), /held_out_evidence/);
  const thin = buildCampaignProfile(bayCampaign, s, { ...selection, observedAssociationIds: [associations[0].id] }); assert.equal(thin.historyStatus, 'unavailable'); assert(thin.qualityFlags.includes('thin_profile'));
  const index = createExactIndex(s); assert(index.search([1, 0], 30).every(r => allowed.includes(r.evidenceId)));
});
test('profile packet rejects truncation, family overlap and corrupted snapshot hash', () => {
  const s = curateSnapshot(snapshotInput()); const allowed = s.splits.assignments.filter(a => a.split === 'example').map(a => a.evidenceId); const association = s.records.associations.find(a => allowed.includes(a.id));
  const selection = { approvedTargetingText: 'Hotel stays', observedAssociationIds: [association.id], contrastAssociationIds: [association.id], inferredHintIds: [] };
  assert.throws(() => buildCampaignProfile(bayCampaign, s, selection));
  const corrupt = structuredClone(s); corrupt.records.prompts[0].text = 'corrupt'; assert.throws(() => buildCampaignProfile(bayCampaign, corrupt, { ...selection, contrastAssociationIds: [] }), /snapshot_hash_mismatch/);
});
