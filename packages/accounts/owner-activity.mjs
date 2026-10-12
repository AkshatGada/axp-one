// Read-only saved-ledger projections, never raw questions or provider packets.
export function ownerActivity(exchange, bindings, {campaignId,appId}, now) {
 const decisions=new Map();
 const versions=new Map(exchange.all('network_versions').map(v=>[v.id,v]));
 // Retain completed decisions invalidated by a later edit/pause before auction.
 for(const row of exchange.all('product_decisions')){
  const d=row.result,c=d&&exchange.get('campaign_versions',d.campaignVersionId);
  if(c)decisions.set(`${d.opportunityId}:${c.campaignId}`,d);
 }
 for(const row of exchange.db.prepare("SELECT data FROM events WHERE run=? AND type='buyer_decision' ORDER BY seq").all(exchange.runId)){
  const {opportunityId,decision}=JSON.parse(row.data),c=exchange.get('campaign_versions',decision.campaignVersionId);
  if(c)decisions.set(`${opportunityId}:${c.campaignId}`,decision);
 }
 const activity=[];
 // Use durable event sequence, not hash IDs or SQLite rowids (hosted snapshots
 // may reinsert rows in ID order). Both admitted and unfunded turns have events.
 const sequence=new Map(exchange.db.prepare("SELECT seq,data FROM events WHERE run=? AND type IN ('opportunity_created','account_opportunity_not_admitted') ORDER BY seq").all(exchange.runId)
  .map(row=>[JSON.parse(row.data).opportunityId,row.seq]));
 const requests=exchange.all('network_requests').sort((a,b)=>(sequence.get(a.result.opportunityId)??0)-(sequence.get(b.result.opportunityId)??0)||a.id.localeCompare(b.id));
 for(const request of requests){
  if(appId&&request.appId!==appId)continue;
  const result=request.result,o=exchange.get('opportunities',result.opportunityId),outcome=o?.outcome;
  const winning=outcome?.award,award=winning?exchange.get('awards',winning.id):null;
  const aliases=campaignId?[...bindings.values()].filter(b=>b.appId===request.appId).map(b=>b.id):[winning?.campaignId??null];
  for(const alias of aliases){
   const bid=outcome?.bids.find(b=>b.campaignId===alias),rejection=outcome?.rejections.find(r=>r.campaignId===alias);
   const decision=decisions.get(`${result.opportunityId}:${alias}`);
   if(campaignId&&!bid&&!rejection&&!decision)continue;
   const won=alias!==null&&winning?.campaignId===alias,binding=bindings.get(alias);
   const execution=decision?.engineProvenance?.execution;
   const unavailable=['unavailable','failed','uncertain'].includes(decision?.engineProvenance?.outcome);
   const disposition=won?'won':bid?'lost':decision?.decision==='skip'?'skipped':unavailable?'unavailable':decision?.decision==='abstain'?'abstained':rejection?'excluded':'no_fill';
   const version=versions.get(bid?.campaignVersionId??decision?.campaignVersionId);
   activity.push({opportunityId:result.opportunityId,appId:request.appId,campaignId:binding?.campaignId??null,
    campaignVersionId:version?.publicVersionId??null,settlementNetwork:result.settlementNetwork,
    disposition,decision:decision?.decision??(campaignId?'not_called':'not_reported'),
    execution:['actual-api-model','fixture','unavailable'].includes(execution)?execution:null,
    reasonCodes:[...new Set([...(rejection?[rejection.reason]:[]),...(decision?.reasonCodes??(result.reason?[result.reason]:[]))])],
    bidBaseUnits:bid?.amountBaseUnits??null,awardId:won?award?.id??null:null,
    deliveryStatus:!won?'not_awarded':award?.status==='delivered'?'accepted':award?.status==='failed'?'failed':award?.status==='expired'||award?.expiresAt<=now?'expired':'reserved'});
  }
 }
 return {activity:activity.slice(-100).reverse(),activityTotal:activity.length};
}
