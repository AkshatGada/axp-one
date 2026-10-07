import {BENCHMARK_PROFILE as P} from './profile.mjs';
const percentile=(values,p)=>{const v=values.filter(Number.isFinite).sort((a,b)=>a-b);return v.length?v[Math.max(0,Math.ceil(v.length*p)-1)]:null;};
const latency=values=>({p50:percentile(values,.5),p95:percentile(values,.95),samples:values.filter(Number.isFinite).length});
const sum=(rows,key)=>rows.reduce((n,r)=>n+BigInt(r[key]??'0'),0n).toString();
export function exportRun({journal,workers}){
  const meta=journal.get('meta','run'),turns=journal.all('turn'),decisions=workers.flatMap(w=>w.service.exchange.all('product_decisions').map(d=>({...d,workerId:w.id}))),
    campaignRows=workers.flatMap(w=>w.service.state().campaigns.map(c=>({...c,workerId:w.id}))),channels=campaignRows.filter(c=>c.payment).map(c=>({
      ...c.payment,id:c.payment.channelId,campaignId:c.id,workerId:c.workerId,paymentPhase:c.payment.phase,voucherUpdates:c.payment.vouchers.filter(v=>v.status==='authorized').length})),
    transactions=channels.flatMap(c=>c.transactions).filter(t=>t.signature),answers=workers.flatMap(w=>w.service.exchange.all('product_answers')),
    completedTurns=turns.filter(t=>t.completedAt),start=completedTurns.length?Math.min(...completedTurns.map(t=>Date.parse(t.startedAt))):null,
    end=completedTurns.length?Math.max(...completedTurns.map(t=>Date.parse(t.completedAt))):null;
  const provider=Object.fromEntries(['jev','deepseek'].map(p=>{const t=journal.providerTotals(p);return [p,{attempts:t.attempts,inputTokens:t.inputTokens,outputTokens:t.outputTokens,knownUsd:t.knownNanos/1e9,priceBasis:p==='deepseek'?'conservative_peak_cache_miss_usage_estimate':'reported_input_tokens_at_published_rate',reservedUsd:t.reservedNanos/1e9,unknownAttempts:t.unknownAttempts,pendingAttempts:t.pendingAttempts,terminalUnknownAttempts:t.terminalUnknownAttempts}];}));
  const specimenTurn=turns.find(t=>t.render&&t.result?.answer),award=specimenTurn?.result.opportunity?.award,
    decision=specimenTurn?.result.opportunity.trace.decisions.find(d=>d.campaignVersionId===award.campaignVersionId),campaign=award&&campaignRows.find(c=>c.id===award.campaignId);
  const specimen=specimenTurn?{turnId:specimenTurn.id,campaignId:award.campaignId,channelId:award.channelId,prompt:specimenTurn.question,answer:specimenTurn.result.answer.answer,
    answerMode:specimenTurn.result.answer.answerMode,advertiserMaterialIncluded:false,
    creative:{title:award.brandName,body:award.creative.approvedText,cta:'Visit sponsor',url:award.creative.destinationURL,hash:award.creativeHash},
    decision:decision?{action:decision.decision,reason:decision.reasonCodes.join(', '),fit:decision.relevanceLevel,intent:decision.commercialIntentLevel,execution:decision.engineProvenance.execution}:null,
    authoredHints:campaign.contextHints,evidence:decision?.engineProvenance.retrieval??null,
    receipt:{hash:specimenTurn.render.receiptHash,chargeId:specimenTurn.render.chargeId,...specimenTurn.render.observation,observedAt:specimenTurn.render.observedAt,semantics:'app_insertion_not_human_attention'}}:null;
  return {schemaVersion:'axp.network-scale-run.v1',runId:meta.runId,status:meta.status==='completed'?'completed':['planned','ready','opening','running','draining'].includes(meta.status)?meta.status:'partial',
    execution:meta.execution,network:'solana-devnet',startedAt:meta.startedAt,updatedAt:meta.updatedAt,completedAt:meta.completedAt??null,sourceCommit:meta.sourceCommit,executionSourceHash:meta.executionSourceHash??null,sourceDirty:meta.sourceDirty??null,profileHash:meta.profileHash,haltReason:meta.haltReason??null,
    targets:{advertisers:128,workers:16,publisherTurns:1024,jevCalls:8192},bounds:P,
    measured:{fundedAdvertisers:channels.filter(c=>c.openStatus==='finalized').length,publisherTurnsAttempted:turns.filter(t=>t.startedAt).length,
      publisherTurnsCompleted:completedTurns.length,answersAttempted:answers.length,answersCompleted:answers.filter(a=>a.status==='completed').length,
      jevAttempts:provider.jev.attempts,validDecisions:decisions.filter(d=>d.result?.engineProvenance?.outcome==='valid').length,
      bids:decisions.filter(d=>d.result?.decision==='bid').length,skips:decisions.filter(d=>d.result?.decision==='skip').length,
      abstentions:decisions.filter(d=>d.result?.decision==='abstain').length,acceptedDeliveries:campaignRows.reduce((n,c)=>n+c.deliveryCount,0),
      noFill:turns.filter(t=>t.result?.opportunity?.status==='no_fill').length,errors:turns.filter(t=>t.status==='error').length,
      decisionErrors:decisions.filter(d=>d.status==='failed').length,answerErrors:answers.filter(a=>a.status==='failed').length,
      voucherUpdates:channels.reduce((n,c)=>n+c.voucherUpdates,0),nativeTransactions:transactions.length,finalizedTransactions:transactions.filter(t=>t.finality==='finalized').length,
      peakPublisherConcurrency:journal.get('meta','publisherPeak')?.value??0,peakJevConcurrency:journal.get('meta','peak')?.jev??0,
      latencyMs:{answer:latency(turns.map(t=>t.result?.answer?.elapsedMs)),opportunity:latency(turns.map(t=>t.result?.opportunity?.trace?.timings?.totalMs)),turn:latency(turns.map(t=>t.elapsedMs))},
      throughputTurnsPerSecond:start!==null&&end>start?completedTurns.length/((end-start)/1000):null},
    accounting:{depositBaseUnits:sum(channels,'confirmedDepositBaseUnits'),acceptedBaseUnits:sum(channels,'acceptedBaseUnits'),authorizedBaseUnits:sum(channels,'authorizedBaseUnits'),
      settledBaseUnits:sum(channels,'settledBaseUnits'),refundBaseUnits:sum(channels,'refundBaseUnits'),networkFeeLamports:sum(transactions,'networkFeeLamports'),newRentLamports:sum(transactions,'newRentLamports'),reclaimedRentLamports:sum(transactions,'reclaimedRentLamports'),provider},
    campaigns:campaignRows.map(c=>({id:c.id,name:c.brandName,scope:c.workerId,channelId:c.payment?.channelId??null,funded:c.payment?.openStatus==='finalized',acceptedDeliveries:c.deliveryCount,jevDecisions:decisions.filter(d=>d.result?.campaignVersionId===`${c.id}-v1`).length})),
    channels,events:journal.events(),specimen,replayProof:journal.get('meta','replayProof'),stages:journal.all('stage'),
    limitations:['Measured capacity of one bounded local coordinator and isolated product workers; not production fleet scale.','Fictional advertisers and test USDC on public Solana Devnet, funded by one shared sponsor.','Jev judges fit; the independent DeepSeek answer receives no advertiser material.','Advertiser authored hints differ from retrieved ContextHint observed and inferred evidence; no newly trained model or measured lift.','Accepted receipts establish app insertion and Sponsored disclosure, not human attention or conversion.','Unknown provider attempts retain conservative spend reservations. Targets are approved ceilings, not achieved measurements.']};
}
