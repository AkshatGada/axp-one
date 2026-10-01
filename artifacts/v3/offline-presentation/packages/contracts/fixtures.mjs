export function campaignFixtures() {
  return [
    ['baystay','Singapore','4000','20000','Singapore stays near Marina Bay for solo visitors, with free cancellation.',['solo','marina-bay']],
    ['marinarooms','Singapore','5000','25000','Singapore rooms with free cancellation.',[]],
    ['alpinestay','Switzerland','9000','45000','Swiss mountain stays with free cancellation.',[]],
  ].map(([id,destination,maxBidBaseUnits,budgetCapBaseUnits,approvedText,softFitTags])=>({
    campaignId:id,campaignVersionId:`${id}-v1`,advertiserId:`adv-${id}`,status:'active',allowedIntents:['hotel_booking','hotel_comparison'],destination,declaredConstraints:['free_cancellation'],
    creatives:[{creativeVersionId:`${id}-creative-v1`,approvedText,destinationURL:`https://${id}.example/`,softFitTags,evidenceFieldIds:['destination','declaredConstraints'],fictional:true}],
    softFitTags,maxBidBaseUnits,budgetCapBaseUnits,channelId:`channel-${id}`,policyVersion:'fit_intent_bid_v1'
  }));
}
export function opportunityFixture(now=Date.now(),turnId='turn-1') {
  return {publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId:'demo-session',turnId,coarseIntent:'hotel_booking',destination:'Singapore',taskConstraints:['free_cancellation'],softPreferences:['solo','marina-bay'],floorBaseUnits:'1000',expiresAt:now+60000};
}
export function decisionFixture(campaign,opportunity,{relevanceLevel=3,commercialIntentLevel=3,decision='bid'}={}) {
  return {schemaVersion:'agent-decision.v1',opportunityId:opportunity.id,advertiserId:campaign.advertiserId,campaignVersionId:campaign.campaignVersionId,agentRunId:`fixture-${campaign.campaignId}-${opportunity.id}`,decision,creativeVersionId:campaign.creatives[0].creativeVersionId,relevanceLevel,commercialIntentLevel,relevance:relevanceLevel/3,commercialIntent:commercialIntentLevel/3,conversionProbability:null,evidenceFieldIds:['destination'],reasonCodes:['fixture_declared_fit'],scoreSemantics:'fit-intent-v1',engineProvenance:{engine:'fixture',mode:'synthetic',model:null}};
}
