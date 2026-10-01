import { assert, object, array, id, ids, safeText, string, timestamp, space, vector, hash, textHash, normalizePrompt, freeze, unique, sameSpace } from '../core.mjs';
import { groupedSplits } from '../evidence/splits.mjs';

export const SNAPSHOT_CAPS = freeze({ mappings: 600, advertisers: 60, creatives: 300, families: 200, hints: 60, perAdvertiser: 20 });
const category = 'travel-hospitality';
const seed = 'axp-travel-v1';
const byId = (a, b) => a.id.localeCompare(b.id);
const refs = r => ids(r.sourceRefs, 60);
const eligibleText = r => {
  if (!['public_background', 'fixture'].includes(r.origin) || !r.reviewed || r.sensitive) return false;
  try { safeText(r.text, 2400); return true; } catch { return false; }
};
function validateInput(input) {
  object(input, ['schemaVersion', 'source', 'exportedAt', 'embeddingSpace', 'prompts', 'creatives', 'associations', 'hints', 'vectors']);
  assert(input.schemaVersion === 'snapshot-input.v1'); timestamp(input.exportedAt);
  object(input.source, ['repository', 'schema', 'snapshotTime', 'materialKind']);
  id(input.source.repository); id(input.source.schema);
  assert(input.source.materialKind === 'fixture' || input.source.materialKind === 'reviewed_background');
  if (input.source.snapshotTime !== null) timestamp(input.source.snapshotTime);
  if (input.embeddingSpace !== null) space(input.embeddingSpace);
  array(input.prompts, 1200, p => {
    object(p, ['id', 'text', 'categoryId', 'familyId', 'familyReviewed', 'origin', 'reviewed', 'sensitive', 'sourceRefs']);
    id(p.id); string(p.text); id(p.categoryId); if (p.familyId !== null) id(p.familyId);
    ['familyReviewed', 'reviewed', 'sensitive'].forEach(k => assert(typeof p[k] === 'boolean')); id(p.origin); refs(p);
    assert(p.familyId === null || p.familyReviewed, 'unreviewed_family');
  });
  array(input.creatives, 1200, c => {
    object(c, ['id', 'advertiserGroupId', 'contentHash', 'text', 'categoryId', 'origin', 'reviewed', 'sensitive', 'sourceRefs']);
    id(c.id); id(c.advertiserGroupId); string(c.contentHash, 128); string(c.text); id(c.categoryId); id(c.origin); refs(c);
    ['reviewed', 'sensitive'].forEach(k => assert(typeof c[k] === 'boolean'));
  });
  array(input.associations, 3000, a => {
    object(a, ['id', 'promptId', 'creativeId', 'sourceRefs', 'reportedGeo', 'captureTime']);
    id(a.id); id(a.promptId); id(a.creativeId); refs(a);
    if (a.reportedGeo !== null) { object(a.reportedGeo, ['value', 'semantics']); safeText(a.reportedGeo.value, 80); assert(['reported_site_location', 'source_declared_unknown'].includes(a.reportedGeo.semantics)); }
    if (a.captureTime !== null) timestamp(a.captureTime);
  });
  array(input.hints, 300, h => {
    object(h, ['id', 'creativeId', 'text', 'origin', 'reviewed', 'sensitive', 'sourceRefs', 'model', 'tier', 'supportingEvidenceIds', 'diagnostics']);
    id(h.id); id(h.creativeId); string(h.text); id(h.origin); refs(h); id(h.model);
    ['reviewed', 'sensitive'].forEach(k => assert(typeof h[k] === 'boolean'));
    assert(['sparse', 'holdout', 'leave-one-out'].includes(h.tier)); ids(h.supportingEvidenceIds, 60);
    object(h.diagnostics, ['reconstructionAuc'], []);
    if (h.diagnostics.reconstructionAuc !== undefined) assert(Number.isFinite(h.diagnostics.reconstructionAuc) && h.diagnostics.reconstructionAuc >= 0 && h.diagnostics.reconstructionAuc <= 1);
  });
  array(input.vectors, 2000, v => {
    object(v, ['evidenceId', 'textHash', 'space', 'values', 'normalized']); id(v.evidenceId); string(v.textHash, 128); space(v.space);
    array(v.values, 4096, x => assert(typeof x === 'number' && Number.isFinite(x))); assert(typeof v.normalized === 'boolean');
  });
  const evidenceIds = [...input.prompts, ...input.creatives, ...input.associations, ...input.hints].map(r => r.id); unique(evidenceIds);
  unique(input.vectors.map(v => v.evidenceId));
  const p = new Set(input.prompts.map(r => r.id)), c = new Set(input.creatives.map(r => r.id)), all = new Set(evidenceIds);
  input.associations.forEach(a => assert(p.has(a.promptId) && c.has(a.creativeId), 'dangling_association'));
  input.hints.forEach(h => assert(c.has(h.creativeId) && h.supportingEvidenceIds.every(k => all.has(k)), 'dangling_hint_support'));
  input.vectors.forEach(v => assert(p.has(v.evidenceId) || c.has(v.evidenceId) || input.hints.some(h => h.id === v.evidenceId), 'dangling_vector'));
}

/** Allowlisted in-memory JSON only. Does not open databases, URLs, or sibling repos. */
export function curateSnapshot(raw) {
  validateInput(raw);
  const input = structuredClone(raw);
  const exclusions = { unsafe_or_unreviewed: 0, wrong_category: 0, duplicate_prompt: 0, duplicate_creative: 0, duplicate_association: 0, cap: 0, hint_not_selected: 0, vector_incompatible: 0, vector_unavailable: 0 };
  const promptMap = new Map(), creativeMap = new Map(), prompts = new Map(), creatives = new Map();
  const mergeRefs = (a, b) => [...new Set([...a, ...b])].sort();
  // Exact normalized variants are one evidence record, with the original chosen deterministically.
  for (const p of input.prompts.sort(byId)) {
    if (p.categoryId !== category) { exclusions.wrong_category++; continue; }
    if (!eligibleText(p) || p.sourceRefs.length === 0 || (input.source.materialKind === 'fixture' ? p.origin !== 'fixture' : p.origin !== 'public_background')) { exclusions.unsafe_or_unreviewed++; continue; }
    if (normalizePrompt(p.text).length === 0) { exclusions.unsafe_or_unreviewed++; continue; }
    const normalizedHash = textHash(normalizePrompt(p.text));
    const existing = [...prompts.values()].find(x => x.normalizedHash === normalizedHash);
    if (existing) {
      // Conflicting human-family declarations cannot silently split exact variants.
      if (p.familyId !== null && existing.reviewedFamilyId !== null) assert(p.familyId === existing.reviewedFamilyId, 'family_conflict');
      if (p.familyId !== null) existing.reviewedFamilyId = p.familyId;
      existing.sourceRefs = mergeRefs(existing.sourceRefs, p.sourceRefs); promptMap.set(p.id, existing.id); exclusions.duplicate_prompt++; continue;
    }
    const record = { id: p.id, text: p.text, normalizedHash, reviewedFamilyId: p.familyId, familyId: '', categoryId: category, sourceRefs: [...p.sourceRefs].sort(), qualityFlags: [] };
    prompts.set(p.id, record); promptMap.set(p.id, p.id);
  }
  for (const p of prompts.values()) p.familyId = p.reviewedFamilyId === null ? 'normalized:' + p.normalizedHash : 'reviewed:' + p.reviewedFamilyId;
  for (const c of input.creatives.sort(byId)) {
    if (c.categoryId !== category) { exclusions.wrong_category++; continue; }
    if (!eligibleText(c) || c.sourceRefs.length === 0 || (input.source.materialKind === 'fixture' ? c.origin !== 'fixture' : c.origin !== 'public_background')) { exclusions.unsafe_or_unreviewed++; continue; }
    const existing = [...creatives.values()].find(x => x.contentHash === c.contentHash);
    if (existing) { assert(existing.advertiserGroupId === c.advertiserGroupId && existing.text === c.text, 'content_hash_conflict'); existing.sourceRefs = mergeRefs(existing.sourceRefs, c.sourceRefs); creativeMap.set(c.id, existing.id); exclusions.duplicate_creative++; continue; }
    creatives.set(c.id, { id: c.id, advertiserGroupId: c.advertiserGroupId, contentHash: c.contentHash, text: c.text, categoryId: category, sourceRefs: [...c.sourceRefs].sort(), qualityFlags: [] }); creativeMap.set(c.id, c.id);
  }
  const associations = new Map(), associationMap = new Map();
  for (const a of input.associations.sort(byId)) {
    const promptId = promptMap.get(a.promptId), creativeId = creativeMap.get(a.creativeId);
    if (!promptId || !creativeId || a.sourceRefs.length === 0) { exclusions.unsafe_or_unreviewed++; continue; }
    const key = prompts.get(promptId).familyId + '|' + creativeId;
    const old = associations.get(key);
    const observation = { sourceRefs: [...a.sourceRefs].sort(), reportedGeo: a.reportedGeo, captureTime: a.captureTime };
    if (old) { old.observations.push(observation); old.sourceRefs = mergeRefs(old.sourceRefs, a.sourceRefs); associationMap.set(a.id, old.id); exclusions.duplicate_association++; continue; }
    const record = { id: a.id, promptId, creativeId, sourceRefs: [...a.sourceRefs].sort(), observations: [observation], qualityFlags: ['association_not_fit_label', 'no_observed_ad_not_negative'] };
    associations.set(key, record); associationMap.set(a.id, a.id);
  }
  const buckets = new Map();
  for (const a of associations.values()) {
    const adv = creatives.get(a.creativeId).advertiserGroupId;
    if (!buckets.has(adv)) buckets.set(adv, []); buckets.get(adv).push(a);
  }
  for (const rows of buckets.values()) rows.sort((a, b) => hash([seed, a.id]).localeCompare(hash([seed, b.id])));
  const advertiserOrder = [...buckets.keys()].sort((a, b) => hash([seed, a]).localeCompare(hash([seed, b])));
  const selected = [], selectedP = new Set(), selectedC = new Set(), selectedF = new Set(), selectedA = new Set();
  const counts = new Map();
  for (let round = 0; round < 3000; round++) {
    let visited = false;
    for (const adv of advertiserOrder) {
      const a = buckets.get(adv)[round]; if (!a) continue; visited = true;
      const family = prompts.get(a.promptId).familyId;
      if (selected.length >= SNAPSHOT_CAPS.mappings || (!selectedA.has(adv) && selectedA.size >= SNAPSHOT_CAPS.advertisers) || (!selectedC.has(a.creativeId) && selectedC.size >= SNAPSHOT_CAPS.creatives) || (!selectedF.has(family) && selectedF.size >= SNAPSHOT_CAPS.families) || (counts.get(adv) ?? 0) >= SNAPSHOT_CAPS.perAdvertiser) { exclusions.cap++; continue; }
      selected.push(a); selectedP.add(a.promptId); selectedC.add(a.creativeId); selectedF.add(family); selectedA.add(adv); counts.set(adv, (counts.get(adv) ?? 0)+1);
    }
    if (!visited) break;
  }
  // Retain normalized variant records needed by reviewed families as selected only through mappings.
  const retained = new Set([...selectedP, ...selectedC, ...selected.map(a => a.id)]), hints = [], hintedC = new Set();
  for (const h of input.hints.sort(byId)) {
    const creativeId = creativeMap.get(h.creativeId);
    const support = h.supportingEvidenceIds.map(k => promptMap.get(k) ?? creativeMap.get(k) ?? associationMap.get(k) ?? k);
    if (!eligibleText(h) || h.sourceRefs.length === 0 || !retained.has(creativeId) || support.length === 0 || support.some(k => !retained.has(k)) || hintedC.has(creativeId) || hints.length >= SNAPSHOT_CAPS.hints || (input.source.materialKind === 'fixture' ? h.origin !== 'fixture' : h.origin !== 'public_background')) { exclusions.hint_not_selected++; continue; }
    hints.push({ id: h.id, creativeId, text: h.text, sourceRefs: [...h.sourceRefs].sort(), model: h.model, tier: h.tier, supportingEvidenceIds: [...new Set(support)].sort(), diagnostics: h.diagnostics, qualityFlags: ['inferred_not_observed', ...(h.tier === 'sparse' ? ['sparse_hint'] : [])] }); hintedC.add(creativeId); retained.add(h.id);
  }
  const records = { prompts: [...selectedP].map(k => prompts.get(k)).sort(byId), creatives: [...selectedC].map(k => creatives.get(k)).sort(byId), associations: selected.sort(byId), hints, vectors: [] };
  for (const a of records.associations) {
    a.observations.sort((x, y) => hash(x).localeCompare(hash(y)));
    if (a.observations.some(o => o.reportedGeo === null)) a.qualityFlags.push('geo_unknown');
    if (a.observations.some(o => o.captureTime === null)) a.qualityFlags.push('capture_time_unknown');
  }
  const textRecords = [...records.prompts, ...records.creatives, ...records.hints];
  // A vector can only be reused for the exact retained text; no redaction or normalization mutation.
  for (const r of textRecords) {
    const candidates = input.vectors.filter(v => (promptMap.get(v.evidenceId) ?? creativeMap.get(v.evidenceId) ?? v.evidenceId) === r.id).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
    let accepted;
    for (const v of candidates) {
      try {
        assert(sameSpace(v.space, input.embeddingSpace) && v.textHash === textHash(r.text), 'vector_incompatible'); vector(v.values, v.space.dimension);
        if (v.normalized) assert(Math.abs(Math.hypot(...v.values) - 1) <= 1e-4, 'vector_incompatible');
        accepted = { ...v, evidenceId: r.id }; break;
      } catch { exclusions.vector_incompatible++; }
    }
    if (accepted) records.vectors.push(accepted);
    else { r.qualityFlags.push(candidates.length ? 'vector_incompatible' : 'vector_unavailable'); exclusions.vector_unavailable++; }
  }
  records.vectors.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  const splits = groupedSplits(records, seed);
  const contentHash = hash(records);
  const manifest = { schemaVersion: 'snapshot-manifest.v1', snapshotId: 'snapshot:' + contentHash.slice(0, 24), selectionVersion: 'travel_snapshot_v1', categoryId: category, seed, caps: SNAPSHOT_CAPS, source: input.source, exportedAt: input.exportedAt, ingestionStatus: input.source.materialKind === 'fixture' ? 'fixture_only_real_ingestion_pending' : 'caller_supplied_reviewed_background', counts: { mappings: records.associations.length, advertisers: selectedA.size, creatives: records.creatives.length, promptFamilies: selectedF.size, prompts: records.prompts.length, hints: records.hints.length, vectors: records.vectors.length }, exclusions, contentHash, embeddingSpace: input.embeddingSpace, splitManifestHash: splits.contentHash };
  return freeze({ manifest, records, splits, manifestHash: hash(manifest) });
}
