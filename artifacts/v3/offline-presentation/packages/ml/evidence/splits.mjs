import { assert, hash, freeze } from '../core.mjs';

// Every edge is a leakage relationship, including hint support. Never cut an edge.
export function groupedSplits(records, seed = 'axp-travel-v1') {
  const parent = new Map();
  const add = k => { if (!parent.has(k)) parent.set(k, k); return k; };
  const find = k => { if (parent.get(k) !== k) parent.set(k, find(parent.get(k))); return parent.get(k); };
  const join = (a, b) => { add(a); add(b); const x = find(a), y = find(b); if (x !== y) parent.set(y, x); };
  const evidence = [...records.prompts, ...records.creatives, ...records.associations, ...records.hints];
  const keys = new Set(evidence.map(r => r.id));
  for (const r of evidence) add(r.id);
  for (const p of records.prompts) join(p.id, 'family:' + p.familyId);
  for (const c of records.creatives) { join(c.id, 'advertiser:' + c.advertiserGroupId); join(c.id, 'content:' + c.contentHash); }
  for (const a of records.associations) { join(a.id, a.promptId); join(a.id, a.creativeId); }
  for (const h of records.hints) {
    join(h.id, h.creativeId);
    for (const s of h.supportingEvidenceIds) { assert(keys.has(s), 'dangling_hint_support'); join(h.id, s); }
  }
  const groups = new Map();
  for (const r of evidence) { const key = find(r.id); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r.id); }
  const associationIds = new Set(records.associations.map(a => a.id));
  const components = [...groups.values()].map(ids => {
    ids.sort(); return { id: 'component:' + hash(ids).slice(0, 24), evidenceIds: ids, size: ids.filter(k => associationIds.has(k)).length };
  }).sort((a, b) => b.size - a.size || hash([seed, a.id]).localeCompare(hash([seed, b.id])));
  const total = records.associations.length;
  const largest = components[0]?.size ?? 0;
  let reason = total === 0 ? 'no_observed_associations' : components.filter(c => c.size > 0).length < 3 ? 'insufficient_independent_components' : largest > total * 0.60 ? 'giant_component' : null;
  const sizes = { example: 0, validation: 0, final_test: 0 };
  const targets = { example: total * .60, validation: total * .20, final_test: total * .20 };
  if (!reason) for (const c of components) {
    const split = Object.keys(sizes).sort((a, b) => (targets[b]-sizes[b]) - (targets[a]-sizes[a]) || a.localeCompare(b))[0];
    c.split = split; sizes[split] += c.size;
  }
  if (!reason && Object.values(sizes).some(n => n === 0)) reason = 'empty_partition';
  if (reason) for (const c of components) c.split = 'blocked';
  const assignments = components.flatMap(c => c.evidenceIds.map(evidenceId => ({ evidenceId, componentId: c.id, split: c.split }))).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  const result = { schemaVersion: 'split-manifest.v1', groupingRuleVersion: 'whole-connected-v1', seed, status: reason ? 'blocked' : 'ready', reason, largestComponentAssociations: largest, associationCounts: reason ? null : sizes, components, assignments };
  return freeze({ ...result, contentHash: hash(result) });
}
