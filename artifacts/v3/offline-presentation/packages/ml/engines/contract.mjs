import { assert, object, array, ids, id, safeText, timestamp, hash, freeze, space, vector } from '../core.mjs';
import { validateCachedCampaignProfile } from '../profiles/cached.mjs';

export const RUBRIC = freeze({ version: 'fit-intent-v1', relevance: ['Unrelated service', 'Broad category but different need or soft conflict', 'Relevant general service; specific soft fit incomplete', 'Direct supported task fit and stated soft preferences supported'], intent: ['Educational; no offer seeking', 'Broad exploration', 'Bounded offer comparison or shortlist', 'Find or book offer with destination and concrete feature, dates or event'] });
export const RUBRIC_HASH = hash(RUBRIC);
const INTENTS = ['hotel_booking', 'hotel_comparison', 'travel_tools', 'crypto_wallet_tools', 'informational', 'blocked'];
const CONSTRAINTS = ['destination', 'freeCancellation', 'wheelchairAccessible', 'event', 'dates', 'travellers', 'requiredCapabilities'];
function constraints(value) {
  object(value, CONSTRAINTS, []);
  for (const [key, v] of Object.entries(value)) {
    if (['freeCancellation', 'wheelchairAccessible'].includes(key)) { assert(typeof v === 'boolean'); continue; }
    if (key === 'travellers') { assert(Number.isInteger(v) && v > 0 && v <= 100); continue; }
    if (key === 'requiredCapabilities') { assert(Array.isArray(v), 'capabilities_invalid'); ids(v, 12); continue; }
    if (Array.isArray(v)) { array(v, 12, x => safeText(x, 120)); continue; }
    safeText(v, 120);
  }
}
export function validateCampaign(c) {
  object(c, ['campaignId', 'campaignVersionId', 'advertiserId', 'allowedIntents', 'declaredConstraints', 'creatives', 'softFitTags']);
  id(c.campaignId); id(c.campaignVersionId); id(c.advertiserId); ids(c.allowedIntents, 4); assert(c.allowedIntents.length > 0 && c.allowedIntents.every(k => INTENTS.includes(k)));
  constraints(c.declaredConstraints); ids(c.softFitTags, 20);
  array(c.creatives, 30, creative => {
    object(creative, ['creativeVersionId', 'approvedText', 'softFitTags', 'evidenceFieldIds']);
    id(creative.creativeVersionId); assert(creative.creativeVersionId !== 'no_fit', 'reserved_id'); safeText(creative.approvedText, 1200);
    ids(creative.softFitTags, 20); ids(creative.evidenceFieldIds, 30);
  });
  assert(c.creatives.length > 0); ids(c.creatives.map(x => x.creativeVersionId), 30);
}
export function validateRequest(r) {
  object(r, ['schemaVersion', 'runId', 'mode', 'opportunity', 'campaign', 'profile', 'options']);
  assert(r.schemaVersion === 'decision-request.v1'); id(r.runId); assert(['synthetic', 'sandbox', 'devnet'].includes(r.mode));
  validateCampaign(r.campaign);
  object(r.opportunity, ['id', 'coarseIntent', 'destination', 'taskConstraints', 'softPreferences', 'taskText'], ['id', 'coarseIntent', 'destination', 'taskConstraints', 'softPreferences']);
  if(r.opportunity.taskText !== undefined) safeText(r.opportunity.taskText,1200);
  id(r.opportunity.id); assert(INTENTS.includes(r.opportunity.coarseIntent));
  if (r.opportunity.destination !== null) safeText(r.opportunity.destination, 120);
  constraints(r.opportunity.taskConstraints); ids(r.opportunity.softPreferences, 20);
  object(r.options, ['deadlineAt', 'rubricVersion', 'engineConfigVersion']); timestamp(r.options.deadlineAt); id(r.options.engineConfigVersion);
  assert(r.options.rubricVersion === RUBRIC.version, 'rubric_unavailable');
  if (r.profile !== null) validateProfile(r.profile, r.campaign);
  return r;
}
export function validateProfile(p, campaign) {
  if(p?.schemaVersion === 'retrieved-campaign-profile.v1') {
    object(p, ['schemaVersion','profileId','profileHash','campaignId','campaignVersionId','campaignContentHash','snapshotId','snapshotContentHash','retrievalMethod','historyStatus','observedExamples','contrastExamples','inferredHints']);
    ['profileId','campaignId','campaignVersionId','snapshotId'].forEach(k=>id(p[k]));
    assert(p.campaignId===campaign.campaignId && p.campaignVersionId===campaign.campaignVersionId && p.campaignContentHash===hash(campaign),'profile_campaign_mismatch');
    const {profileHash,...content}=p;assert(profileHash===hash(content),'profile_hash_mismatch');
    assert(/^[a-f0-9]{64}$/.test(p.snapshotContentHash),'snapshot_hash_invalid');
    assert(['vector','lexical_fallback','unavailable'].includes(p.retrievalMethod));
    assert(['ready','unavailable'].includes(p.historyStatus));
    array(p.observedExamples,3,e=>{object(e,['id','text']);id(e.id);safeText(e.text,600);});
    array(p.contrastExamples,0);
    array(p.inferredHints,2,h=>{object(h,['id','text','tier','qualityFlags']);id(h.id);safeText(h.text,600);safeText(h.tier,80);ids(h.qualityFlags,20);});
    ids([...p.observedExamples,...p.inferredHints].map(e=>e.id),5);
    assert([...p.observedExamples,...p.inferredHints].reduce((n,e)=>n+e.text.length,0)<=2400,'profile_text_limit');
    if(p.historyStatus==='ready')assert(p.retrievalMethod!=='unavailable'&&p.observedExamples.length>0,'thin_profile');
    return;
  }
  if(p?.schemaVersion === 'cached-campaign-profile.v1') return validateCachedCampaignProfile(p,campaign);
  object(p, ['schemaVersion', 'profileId', 'profileHash', 'campaignId', 'campaignVersionId', 'campaignContentHash', 'snapshotId', 'snapshotContentHash', 'splitManifestHash', 'profileBuilderVersion', 'approvedTargetingText', 'approvedCreativeVersionIds', 'embeddingSpace', 'observedExamples', 'contrastExamples', 'inferredHints', 'independentPromptFamilyCount', 'historicalAdvertiserCount', 'qualityFlags', 'historyStatus']);
  assert(p.schemaVersion === 'campaign-evidence-profile.v1');
  ['profileId', 'campaignId', 'campaignVersionId', 'snapshotId', 'profileBuilderVersion'].forEach(k => id(p[k]));
  assert(p.campaignId === campaign.campaignId && p.campaignVersionId === campaign.campaignVersionId && p.campaignContentHash === hash(campaign), 'profile_campaign_mismatch');
  const { profileHash, ...content } = p; assert(profileHash === hash(content), 'profile_hash_mismatch');
  safeText(p.approvedTargetingText, 1200); ids(p.approvedCreativeVersionIds, 30);
  assert(hash(p.approvedCreativeVersionIds) === hash(campaign.creatives.map(c => c.creativeVersionId).sort()), 'profile_campaign_mismatch');
  if (p.embeddingSpace !== null) space(p.embeddingSpace);
  const example = e => {
    object(e, ['id', 'familyId', 'historicalAdvertiserGroupId', 'text', 'vector']); id(e.id); id(e.familyId); id(e.historicalAdvertiserGroupId); safeText(e.text, 240);
    if (e.vector !== null) { assert(p.embeddingSpace !== null); vector(e.vector, p.embeddingSpace.dimension); }
  };
  array(p.observedExamples, 5, example); array(p.contrastExamples, 3, example);
  ids([...p.observedExamples, ...p.contrastExamples].map(e => e.id), 8);
  const families = new Set(p.observedExamples.map(e => e.familyId));
  assert(p.contrastExamples.every(e => !families.has(e.familyId)), 'profile_family_overlap');
  assert(p.independentPromptFamilyCount === families.size && p.historicalAdvertiserCount === new Set(p.observedExamples.map(e => e.historicalAdvertiserGroupId)).size);
  array(p.inferredHints, 2, h => { object(h, ['id', 'text', 'tier', 'qualityFlags']); id(h.id); safeText(h.text, 240); assert(['sparse', 'holdout', 'leave-one-out'].includes(h.tier)); ids(h.qualityFlags, 20); });
  ids(p.inferredHints.map(h => h.id), 2);
  ids(p.qualityFlags, 20); assert(['ready', 'unavailable'].includes(p.historyStatus));
  assert([...p.observedExamples, ...p.contrastExamples, ...p.inferredHints].reduce((n, e) => n+e.text.length, 0) <= 2400, 'profile_text_limit');
  if (p.historyStatus === 'ready') assert(families.size >= 3 && p.historicalAdvertiserCount >= 2 && new Set(p.contrastExamples.map(e => e.familyId)).size >= 2 && p.embeddingSpace !== null && [...p.observedExamples, ...p.contrastExamples].every(e => e.vector !== null), 'thin_profile');
}
export function validateDecision(d, r) {
  object(d, ['schemaVersion', 'opportunityId', 'advertiserId', 'campaignVersionId', 'agentRunId', 'decision', 'creativeVersionId', 'relevanceLevel', 'commercialIntentLevel', 'relevance', 'commercialIntent', 'conversionProbability', 'evidenceFieldIds', 'reasonCodes', 'scoreSemantics', 'engineProvenance']);
  assert(d.schemaVersion === 'agent-decision.v1' && d.opportunityId === r.opportunity.id && d.advertiserId === r.campaign.advertiserId && d.campaignVersionId === r.campaign.campaignVersionId, 'decision_binding_invalid');
  id(d.agentRunId); assert(['bid', 'skip', 'abstain'].includes(d.decision)); assert(d.conversionProbability === null && d.scoreSemantics === RUBRIC.version);
  const creative = r.campaign.creatives.find(c => c.creativeVersionId === d.creativeVersionId);
  assert(d.creativeVersionId === null || creative, 'creative_id_invalid');
  for (const [level, score] of [[d.relevanceLevel, d.relevance], [d.commercialIntentLevel, d.commercialIntent]]) assert(level === null ? score === null && d.decision === 'abstain' : Number.isInteger(level) && level >= 0 && level <= 3 && score === level/3, 'score_invalid');
  ids(d.evidenceFieldIds, 60); ids(d.reasonCodes, 20);
  const supplied = new Set([...r.campaign.creatives.flatMap(c => c.evidenceFieldIds), ...(r.profile === null ? [] : [...r.profile.observedExamples, ...(r.profile.contrastExamples??[]), ...r.profile.inferredHints].map(e => e.id))]);
  assert(d.evidenceFieldIds.every(k => supplied.has(k)), 'evidence_id_invalid');
  if (d.decision === 'bid') assert(creative && creative.evidenceFieldIds.length > 0 && creative.evidenceFieldIds.some(k => d.evidenceFieldIds.includes(k)) && d.relevanceLevel >= 2 && d.commercialIntentLevel >= 2, 'bid_invalid');
  if (d.decision === 'skip') assert(d.relevanceLevel !== null && d.commercialIntentLevel !== null && (d.relevanceLevel < 2 || d.commercialIntentLevel < 2), 'skip_invalid');
  const p = d.engineProvenance;
  object(p, ['engine', 'engineVersion', 'engineConfigVersion', 'rubricHash', 'model', 'transportMode', 'profileHash', 'snapshotHash', 'elapsedMs', 'outcome', 'failureReason', 'fallbackOrigin', 'candidateLevels', 'usage']);
  id(p.engine); id(p.engineVersion); assert(p.engineConfigVersion === r.options.engineConfigVersion && p.rubricHash === RUBRIC_HASH);
  if (p.model !== null) id(p.model); if (p.transportMode !== null) assert(['fixture', 'live'].includes(p.transportMode));
  assert(p.profileHash === (r.profile?.profileHash ?? null) && p.snapshotHash === (r.profile?.snapshotContentHash ?? null));
  assert(Number.isFinite(p.elapsedMs) && p.elapsedMs >= 0); assert(['valid', 'unavailable', 'invalid', 'timeout', 'transport_error', 'abstained'].includes(p.outcome));
  if (p.failureReason !== null) id(p.failureReason); if (p.fallbackOrigin !== null) id(p.fallbackOrigin);
  array(p.candidateLevels, 30, x => { object(x, ['creativeVersionId', 'relevanceLevel']); assert(r.campaign.creatives.some(c => c.creativeVersionId === x.creativeVersionId)); assert(Number.isInteger(x.relevanceLevel) && x.relevanceLevel >= 0 && x.relevanceLevel <= 3); });
  ids(p.candidateLevels.map(x => x.creativeVersionId), 30);
  if (p.usage !== null) { object(p.usage, ['inputTokens', 'outputTokens']); assert(Number.isSafeInteger(p.usage.inputTokens) && p.usage.inputTokens >= 0 && Number.isSafeInteger(p.usage.outputTokens) && p.usage.outputTokens >= 0); }
  return d;
}
