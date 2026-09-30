import { assert, object, space, vector, sameSpace, freeze, cosine, textHash, hash, safeText } from '../core.mjs';

export { cosine };
export function embeddingText(request, creative) {
  // Identical preparation in both arms. History is an independent similarity term.
  return JSON.stringify({ allowedIntents: request.campaign.allowedIntents, declarations: request.campaign.declaredConstraints, campaignTags: request.campaign.softFitTags, creative: creative.approvedText, creativeTags: creative.softFitTags });
}
export function opportunityText(request) { return JSON.stringify(request.opportunity); }

/** Small exact index. Construction can restrict rows to the example partition. */
export function createExactIndex(snapshot) {
  assert(snapshot.manifest.contentHash === hash(snapshot.records) && snapshot.manifest.splitManifestHash === snapshot.splits.contentHash, 'snapshot_hash_mismatch');
  const { contentHash, ...splitContent } = snapshot.splits; assert(contentHash === hash(splitContent), 'split_hash_mismatch');
  assert(snapshot.splits.status === 'ready', 'split_infeasible');
  space(snapshot.manifest.embeddingSpace);
  const allowed = new Set(snapshot.splits.assignments.filter(a => a.split === 'example').map(a => a.evidenceId));
  const rows = snapshot.records.vectors.filter(v => allowed.has(v.evidenceId)).map(v => { assert(sameSpace(v.space, snapshot.manifest.embeddingSpace), 'vector_incompatible'); vector(v.values, v.space.dimension); return structuredClone(v); });
  return freeze({ embeddingSpace: snapshot.manifest.embeddingSpace, size: rows.length, search(query, limit = 5) {
    assert(Number.isInteger(limit) && limit >= 1 && limit <= 30); vector(query, snapshot.manifest.embeddingSpace.dimension);
    return rows.map(r => ({ evidenceId: r.evidenceId, cosine: cosine(query, r.values) })).sort((a, b) => b.cosine-a.cosine || a.evidenceId.localeCompare(b.evidenceId)).slice(0, limit);
  } });
}

/** Exact cache only; absent texts are unavailable. No implicit model install or download. */
export function createCachedEmbeddingProvider(embeddingSpace, records) {
  space(embeddingSpace); assert(Array.isArray(records) && records.length <= 1000);
  const cache = new Map();
  for (const r of records) {
    object(r, ['textHash', 'text', 'space', 'values']); safeText(r.text, 65536);
    assert(r.textHash === textHash(r.text) && sameSpace(r.space, embeddingSpace), 'vector_incompatible'); vector(r.values, embeddingSpace.dimension);
    assert(!cache.has(r.textHash), 'duplicate_id'); cache.set(r.textHash, r.values.slice());
  }
  return freeze({ embeddingSpace: structuredClone(embeddingSpace), async embed(text) {
    const values = cache.get(textHash(text)); assert(values, 'vector_unavailable'); return { embeddingSpace: structuredClone(embeddingSpace), values: values.slice() };
  } });
}
