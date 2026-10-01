import {randomUUID} from 'node:crypto';
import {ownCampaign} from '../contracts/index.mjs';

export function sanitizedOpportunity(prompt,{turnId,now=Date.now(),randomSessionId='demo-session'}={}) {
  if(typeof prompt!=='string'||prompt.length>2000)throw new Error('invalid_prompt');
  // Only coarse declared fields survive. No transcript, identifier or inferred location.
  const text=prompt.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[private]').toLowerCase();
  const destination=/switzerland|swiss/.test(text)?'Switzerland':/singapore|marina bay|token2049/.test(text)?'Singapore':'unknown';
  const coarseIntent=/explain|what is|what a hotel/.test(text)?'informational':/compare|comparison/.test(text)?'hotel_comparison':/find|book|hotel|stay/.test(text)?'hotel_booking':'unknown';
  return {publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId,turnId:turnId??randomUUID(),coarseIntent,destination,taskConstraints:[...(/free cancellation/.test(text)?['free_cancellation']:[]),...(/wheelchair|accessible/.test(text)?['wheelchair_accessible']:[])],softPreferences:[...(/solo|one traveller|one traveler/.test(text)?['solo']:[]),...(/marina bay/.test(text)?['marina-bay']:[])],floorBaseUnits:'1000',expiresAt:now+180000};
}
export function ruleBuyer(campaign,opportunity) {
  const c=ownCampaign(campaign),soft=opportunity.softPreferences??[];
  const scored=c.creatives.map(cr=>{
    const tags=cr.softFitTags??[];
    const conflict=soft.includes('solo')&&(/group|teams/.test(cr.approvedText.toLowerCase())||tags.includes('group'));
    return {cr,level:conflict?1:soft.length&&soft.every(t=>tags.includes(t))?3:2};
  }).sort((a,b)=>b.level-a.level||a.cr.creativeVersionId.localeCompare(b.cr.creativeVersionId));
  const {cr,level}=scored[0];const intent=opportunity.coarseIntent==='hotel_booking'?3:opportunity.coarseIntent==='hotel_comparison'?2:0;
  return {schemaVersion:'agent-decision.v1',opportunityId:opportunity.id,advertiserId:c.advertiserId,campaignVersionId:c.campaignVersionId,agentRunId:`rules-${randomUUID()}`,decision:level>=2&&intent>=2?'bid':'skip',creativeVersionId:cr.creativeVersionId,relevanceLevel:level,commercialIntentLevel:intent,relevance:level/3,commercialIntent:intent/3,conversionProbability:null,evidenceFieldIds:['destination'],reasonCodes:[level===1?'soft_fit_conflict':'declared_fit'],scoreSemantics:'fit-intent-v1',engineProvenance:{engine:'rules',model:null,mode:'deterministic',status:'completed'}};
}
