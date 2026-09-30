import { assert } from '../core.mjs';
import { BaseDecisionEngine, intentLevel, participation } from './base.mjs';

// Tags are operator supplied, not inferred user demographics. Contradictions take precedence.
export function ruleRelevance(opportunity, campaign, creative) {
  if (!campaign.allowedIntents.includes(opportunity.coarseIntent)) return 0;
  const text = creative.approvedText.toLowerCase();
  if (!/\b(hotels?|rooms?|stays?|accommodations?|lodging)\b/u.test(text)) return 0;
  const tags = new Set(creative.softFitTags);
  const preferences = opportunity.softPreferences;
  const conflict = preferences.some(p => tags.has('not:' + p) || (p === 'solo' && (tags.has('group') || /\b(group|teams)\b/u.test(text))) || (p === 'group' && tags.has('solo')));
  if (conflict) return 1;
  const direct = opportunity.destination !== null && text.includes(opportunity.destination.toLowerCase());
  if (direct && preferences.length > 0 && preferences.every(p => tags.has(p))) return 3;
  return 2;
}
export class RuleDecisionEngine extends BaseDecisionEngine {
  constructor(options) { super('rules_v1', options); }
  async evaluate(r) {
    const commercialIntentLevel = intentLevel(r.opportunity);
    const candidateLevels = r.campaign.creatives.map(c => ({ creativeVersionId: c.creativeVersionId, relevanceLevel: ruleRelevance(r.opportunity, r.campaign, c) })).sort((a, b) => b.relevanceLevel-a.relevanceLevel || a.creativeVersionId.localeCompare(b.creativeVersionId));
    const best = candidateLevels[0], creative = r.campaign.creatives.find(c => c.creativeVersionId === best.creativeVersionId);
    assert(creative.evidenceFieldIds.length > 0, 'evidence_unavailable');
    return { decision: participation(best.relevanceLevel, commercialIntentLevel), creativeVersionId: creative.creativeVersionId, relevanceLevel: best.relevanceLevel, commercialIntentLevel, evidenceFieldIds: creative.evidenceFieldIds, candidateLevels };
  }
}
