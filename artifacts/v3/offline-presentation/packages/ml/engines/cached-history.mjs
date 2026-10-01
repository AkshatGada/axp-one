import { assert, freeze } from '../core.mjs';
import { validateCachedCampaignProfile, validateCachedLookupResult, screenedCachedAssociations } from '../profiles/cached.mjs';
import { BaseDecisionEngine, intentLevel, participation } from './base.mjs';

// Frozen demo heuristic. Associations are neither fit labels nor conversion probabilities.
export const CACHED_ASSOCIATION_HEURISTIC = freeze({ version: 'cached-association-bands-v1', thresholds: [0.3, 0.5, 0.7] });
export function associationLevel(similarity) { return similarity >= .7 ? 3 : similarity >= .5 ? 2 : similarity >= .3 ? 1 : 0; }

export class CachedHistoryDecisionEngine extends BaseDecisionEngine {
  constructor({ lookup, ...options } = {}) {
    super('cached_history_v1', { ...options, model: null });
    assert(lookup === undefined || typeof lookup === 'function', 'lookup_adapter_invalid');
    this.lookup = lookup;
  }
  async evaluate(r, signal) {
    assert(r.profile?.schemaVersion === 'cached-campaign-profile.v1', 'cached_profile_unavailable');
    validateCachedCampaignProfile(r.profile, r.campaign);
    assert(r.profile.historyStatus === 'ready', 'cached_profile_unavailable');
    assert(typeof r.opportunity.taskText === 'string' && r.opportunity.taskText.trim().length > 0, 'task_text_unavailable');
    const required = r.opportunity.taskConstraints.requiredCapabilities ?? [];
    const declaredCapabilities = r.campaign.declaredConstraints.requiredCapabilities ?? [];
    assert(Array.isArray(required) && Array.isArray(declaredCapabilities), 'capabilities_invalid');
    assert(typeof this.lookup === 'function', 'cached_lookup_unavailable');
    const lookup = await this.lookup(r.opportunity.taskText, { limit: 5, signal });
    validateCachedLookupResult(lookup, r.opportunity.taskText);
    assert(lookup.status === 'ready', 'query_vector_unavailable');
    const rows = screenedCachedAssociations(lookup).filter(x => r.profile.sourceCreativeIds.includes(x.mapping.creativeId));
    // An available query with no own associations is a scored skip, not a cache miss.
    const similarity = rows.length ? Math.max(...rows.map(x => x.match.similarity)) : -1;
    const level = associationLevel(similarity), o = r.opportunity, campaign = r.campaign;
    const declared = new Set(declaredCapabilities);
    const candidateLevels = campaign.creatives.map(c => {
      const tags = new Set(c.softFitTags);
      let relevanceLevel = campaign.allowedIntents.includes(o.coarseIntent) ? level : 0;
      if (required.some(t => !declared.has(t) || !tags.has(t)) || o.softPreferences.some(t => tags.has('not:'+t))) relevanceLevel = Math.min(relevanceLevel, 1);
      else if (o.softPreferences.some(t => !tags.has(t))) relevanceLevel = Math.min(relevanceLevel, 2);
      return { creativeVersionId: c.creativeVersionId, relevanceLevel };
    }).sort((a, b) => b.relevanceLevel-a.relevanceLevel || a.creativeVersionId.localeCompare(b.creativeVersionId));
    const best = candidateLevels[0], creative = campaign.creatives.find(c => c.creativeVersionId === best.creativeVersionId);
    assert(creative.evidenceFieldIds.length > 0, 'evidence_unavailable');
    // Citation requires the same frozen mapping, prompt and creative; name overlap is insufficient.
    const observed = r.profile.observedExamples.filter(e => rows.some(x => x.match.promptId === e.promptId && x.match.promptText === e.text && x.mapping.mappingId === e.mappingId && x.mapping.creativeId === e.creativeId && x.mapping.advertiser === e.advertiser));
    const hints = r.profile.inferredHints.filter(h => rows.some(x => x.mapping.creativeId === h.creativeId && `source:hint:${x.mapping.hint?.id}` === h.id && x.mapping.hint.text === h.text && x.mapping.hint.tier === h.tier && x.mapping.hint.modelVersion === h.modelVersion));
    const commercialIntentLevel = intentLevel(o);
    return {
      decision: participation(best.relevanceLevel, commercialIntentLevel), creativeVersionId: creative.creativeVersionId,
      relevanceLevel: best.relevanceLevel, commercialIntentLevel, candidateLevels,
      evidenceFieldIds: [...new Set([...creative.evidenceFieldIds, ...observed.map(e => e.id), ...hints.map(h => h.id)])],
      reasonCodes: [CACHED_ASSOCIATION_HEURISTIC.version, 'association_not_fit_label', 'no_independent_fit_labels', rows.length ? 'own_cached_association' : 'no_own_cached_association'],
    };
  }
}
