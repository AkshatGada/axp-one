import {validateCampaign,validateDecision as validateExchangeDecision} from '../contracts/index.mjs';
import {validateRequest,validateDecision,RUBRIC} from '../ml/index.mjs';

// Explicit seam: exchange declarations are arrays; ML declarations are typed objects.
// Only advertiser-owned, non-financial fields enter the decision request.
export function makeDecisionRequest(campaign,opportunity,{runId,profile=null,now=Date.now(),deadlineMs=10000}={}) {
  validateCampaign(campaign);
  const constraints=items=>({destination:campaign.destination,...(items.includes('free_cancellation')?{freeCancellation:true}:{}),...(items.includes('wheelchair_accessible')?{wheelchairAccessible:true}:{})});
  const request={schemaVersion:'decision-request.v1',runId,mode:opportunity.mode??'synthetic',
    opportunity:{id:opportunity.id,coarseIntent:opportunity.coarseIntent,destination:opportunity.destination==='unknown'?null:opportunity.destination,taskConstraints:{...constraints(opportunity.taskConstraints),destination:opportunity.destination},softPreferences:opportunity.softPreferences??[]},
    campaign:{campaignId:campaign.campaignId,campaignVersionId:campaign.campaignVersionId,advertiserId:campaign.advertiserId,allowedIntents:campaign.allowedIntents,declaredConstraints:constraints(campaign.declaredConstraints),creatives:campaign.creatives.map(({creativeVersionId,approvedText,softFitTags=[],evidenceFieldIds=[]})=>({creativeVersionId,approvedText,softFitTags,evidenceFieldIds})),softFitTags:campaign.softFitTags??[]},profile,
    options:{deadlineAt:new Date(Math.min(opportunity.expiresAt,now+deadlineMs)).toISOString(),rubricVersion:RUBRIC.version,engineConfigVersion:'axp-demo-rules-v1'}};
  validateRequest(request);return request;
}
export async function runDecisionEngine(engine,request) {
  const decision=await engine.scoreOpportunity(request);validateDecision(decision,request);return decision;
}

export function validateEngineForExchange(decision,campaign,opportunity,request,now=Date.now()) {
  validateDecision(decision,request);
  // History IDs cannot silently become trusted exchange evidence. That binding
  // will be registered by the backend when actual profiles are integrated.
  return validateExchangeDecision(decision,campaign,opportunity,now,Date.parse(request.options.deadlineAt));
}
