import { textHash } from '../../packages/ml/index.mjs';

export const embeddingSpace = { model: 'fixture-model', revision: 'fixture-v1', dimension: 2 };
export function snapshotInput(n = 10) {
  const prompts = [], creatives = [], associations = [], vectors = [];
  for (let i = 0; i < n; i++) {
    prompts.push({ id: 'p'+i, text: 'Find hotel offer for fictional trip '+i, categoryId: 'travel-hospitality', familyId: null, familyReviewed: false, origin: 'fixture', reviewed: true, sensitive: false, sourceRefs: ['fixture/p'+i] });
    creatives.push({ id: 'c'+i, advertiserGroupId: 'a'+i, contentHash: 'content-'+i, text: 'Fictional hotel offer '+i, categoryId: 'travel-hospitality', origin: 'fixture', reviewed: true, sensitive: false, sourceRefs: ['fixture/c'+i] });
    associations.push({ id: 'a-link'+i, promptId: 'p'+i, creativeId: 'c'+i, sourceRefs: ['fixture/m'+i], reportedGeo: null, captureTime: null });
    for (const r of [prompts[i], creatives[i]]) vectors.push({ evidenceId: r.id, textHash: textHash(r.text), space: embeddingSpace, values: [.8, .6], normalized: true });
  }
  return { schemaVersion: 'snapshot-input.v1', source: { repository: 'synthetic-fixtures', schema: 'fixture-v1', snapshotTime: null, materialKind: 'fixture' }, exportedAt: '2026-09-30T12:00:00Z', embeddingSpace, prompts, creatives, associations, hints: [], vectors };
}
export const bayCampaign = {
  campaignId: 'baystay', campaignVersionId: 'baystay-v1', advertiserId: 'baystay-advertiser', allowedIntents: ['hotel_booking', 'hotel_comparison'], declaredConstraints: { destination: 'Singapore', freeCancellation: true }, softFitTags: [],
  creatives: [{ creativeVersionId: 'bay-solo-v1', approvedText: 'Singapore stays near Marina Bay for solo visitors, with free cancellation.', softFitTags: ['solo', 'near_marina_bay'], evidenceFieldIds: ['bay-solo-v1.text', 'baystay-v1.freeCancellation'] }],
};
export const marinaCampaign = {
  campaignId: 'marinarooms', campaignVersionId: 'marinarooms-v1', advertiserId: 'marinarooms-advertiser', allowedIntents: ['hotel_booking', 'hotel_comparison'], declaredConstraints: { destination: 'Singapore', freeCancellation: true }, softFitTags: [],
  creatives: [{ creativeVersionId: 'marina-general-v1', approvedText: 'Singapore rooms with free cancellation.', softFitTags: [], evidenceFieldIds: ['marina-general-v1.text'] }, { creativeVersionId: 'marina-group-v1', approvedText: 'Conference group hotel blocks for teams.', softFitTags: ['group'], evidenceFieldIds: ['marina-group-v1.text'] }],
};
export function request(campaign = bayCampaign) {
  return structuredClone({ schemaVersion: 'decision-request.v1', runId: 'fixture-run', mode: 'synthetic', opportunity: { id: 'opp-1', coarseIntent: 'hotel_booking', destination: 'Singapore', taskConstraints: { event: 'TOKEN2049', freeCancellation: true }, softPreferences: ['solo', 'near_marina_bay'] }, campaign, profile: null, options: { deadlineAt: '2100-01-01T00:00:00Z', rubricVersion: 'fit-intent-v1', engineConfigVersion: 'fixture-v1' } });
}
export function jevResponse(payload, relevance = 3, intent = 3, chosen = Object.keys(payload.questions.creative.criteria)[0]) {
  const scored = (n, criteria) => ({ type: 'score', score: n, confidence: 1, legend: Object.fromEntries(criteria.map((x, i) => [i, x])), probabilities: Object.fromEntries(criteria.map((_, i) => [i, i === n ? 1 : 0])) });
  return { model: payload.model, answers: { relevance: scored(relevance, payload.questions.relevance.criteria), intent: scored(intent, payload.questions.intent.criteria), creative: { type: 'choice', choice: chosen, confidence: 1, probabilities: Object.fromEntries(Object.keys(payload.questions.creative.criteria).map(k => [k, k === chosen ? 1 : 0])) }, sufficient: { type: 'noul', noul: .95 } }, usage: { input_tokens: 100, output_tokens: 20 } };
}
