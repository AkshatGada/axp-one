import { assert, object, space, vector, cosine, sameSpace, freeze } from '../core.mjs';
import { BaseDecisionEngine, intentLevel, participation } from './base.mjs';
import { embeddingText, opportunityText } from '../embeddings/exact.mjs';

export const EMBEDDING_POLICY = freeze({ version: 'embedding-bands-v1', thresholds: [.30, .50, .65], historyWeights: [.60, .40], strongMargin: .05 });
export function textEmbeddingLevel(c) { assert(Number.isFinite(c) && c >= -1 && c <= 1, 'score_invalid'); const s = Math.max(0, c); return s >= .65 ? 3 : s >= .50 ? 2 : s >= .30 ? 1 : 0; }
export function historyEmbeddingLevel(c, p, n) {
  [c, p, n].forEach(x => assert(Number.isFinite(x) && x >= -1 && x <= 1, 'score_invalid'));
  const s = .60*Math.max(0, c) + .40*p, margin = p-n;
  return s >= .65 && margin >= .05 ? 3 : s >= .50 && margin >= 0 ? 2 : s >= .30 ? 1 : 0;
}
export class EmbeddingDecisionEngine extends BaseDecisionEngine {
  constructor({ provider = null, history = false, ...options } = {}) { super(history ? 'history_embedding_v1' : 'embedding_text_v1', options); this.provider = provider; this.history = history; }
  async evaluate(r, signal) {
    assert(this.provider, 'embedding_unavailable'); space(this.provider.embeddingSpace);
    if (this.history) assert(r.profile?.historyStatus === 'ready' && sameSpace(this.provider.embeddingSpace, r.profile.embeddingSpace), 'thin_profile');
    const embed = async text => {
      const v = await this.provider.embed(text, { signal }); object(v, ['embeddingSpace', 'values']); assert(sameSpace(v.embeddingSpace, this.provider.embeddingSpace), 'vector_incompatible'); vector(v.values, this.provider.embeddingSpace.dimension); return v.values;
    };
    const task = await embed(opportunityText(r));
    const candidateLevels = [];
    for (const c of r.campaign.creatives) {
      assert(!signal.aborted, 'decision_timeout');
      const creative = await embed(embeddingText(r, c)), similarity = cosine(task, creative);
      let relevanceLevel = textEmbeddingLevel(similarity);
      if (this.history) {
        const p = r.profile.observedExamples.reduce((sum, e) => sum+cosine(task, e.vector), 0) / r.profile.observedExamples.length;
        const n = Math.max(...r.profile.contrastExamples.map(e => cosine(task, e.vector)));
        relevanceLevel = historyEmbeddingLevel(similarity, p, n);
      }
      candidateLevels.push({ creativeVersionId: c.creativeVersionId, relevanceLevel });
    }
    candidateLevels.sort((a, b) => b.relevanceLevel-a.relevanceLevel || a.creativeVersionId.localeCompare(b.creativeVersionId));
    const best = candidateLevels[0], chosen = r.campaign.creatives.find(c => c.creativeVersionId === best.creativeVersionId);
    assert(chosen.evidenceFieldIds.length > 0, 'evidence_unavailable'); const commercialIntentLevel = intentLevel(r.opportunity);
    return { decision: participation(best.relevanceLevel, commercialIntentLevel), creativeVersionId: chosen.creativeVersionId, relevanceLevel: best.relevanceLevel, commercialIntentLevel, evidenceFieldIds: [...chosen.evidenceFieldIds, ...(this.history ? r.profile.observedExamples.map(e => e.id) : [])], candidateLevels };
  }
}
