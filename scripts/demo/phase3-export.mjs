import {writeFileSync,mkdirSync} from 'node:fs';
import {createSession} from '../../apps/backend/session.mjs';
import {PHASE3_RUN_ID,PHASE3_CAMPAIGNS,PHASE3_TASK,phase3Opportunity} from '../../apps/backend/phase3.mjs';
import {baseUnits,hash} from '../../packages/contracts/index.mjs';

// Read existing outcomes only; no providers, network, acknowledgements or signer.
const session=createSession({stateDir:'local-state/phase3',runId:PHASE3_RUN_ID,campaigns:PHASE3_CAMPAIGNS,opportunityFactory:phase3Opportunity});
try{
  const state=session.exchange.report(),results=session.results(),admissions=session.exchange.all('model_admissions');
  const decisions=results.flatMap(r=>r.attempts.map(a=>a.decision).filter(Boolean));
  const channels=[...new Set(state.charges.map(c=>c.channelId))];
  const checks={
    twoActualOrganicAnswers:results.length===2&&results.every(r=>r.organic.status==='completed'&&r.organic.provenance?.model==='gpt-6.1-sol'&&['none','not_requested'].includes(r.organic.provenance?.toolUse)),
    sixActualBuyerDecisions:decisions.length===6&&decisions.every(d=>d.engineProvenance.model==='jev-1.13.0'&&d.engineProvenance.transportMode==='live'&&d.engineProvenance.outcome==='valid'),
    genuineEligibleSkip:results.some(r=>r.attempts.some(a=>r.eligibility.eligible.includes(a.campaignId)&&a.decision?.decision==='skip'&&a.decision.engineProvenance.outcome==='valid')),
    twoAcceptedChargesOneChannel:state.charges.length===2&&channels.length===1&&new Set(state.charges.map(c=>c.awardId)).size===2,
    losingCampaignsUncharged:state.campaigns.filter(c=>!state.charges.some(x=>x.campaignId===c.campaignId)).every(c=>session.exchange.totals({campaignId:c.campaignId}).accepted===0n),
    cumulativeAuthorization:channels.length===1&&baseUnits(state.channels.find(c=>c.channelId===channels[0]).authorizedBaseUnits)===state.charges.reduce((n,c)=>n+baseUnits(c.amountBaseUnits),0n),
    noRealSettlement:state.channels.every(c=>c.txSignature===null&&c.settledBaseUnits==='0'),
    boundedAttempts:admissions.filter(a=>a.kind==='jev').length<=6&&admissions.filter(a=>a.kind==='organic').length<=1&&admissions.filter(a=>a.kind==='organic_app').length<=2,
  };
  const usage=admissions.filter(a=>a.kind==='jev').reduce((u,a)=>({calls:u.calls+1,inputTokens:u.inputTokens+(a.usage?.inputTokens??0),outputTokens:u.outputTokens+(a.usage?.outputTokens??0),unknownUsageCalls:u.unknownUsageCalls+(a.usage?0:1)}),{calls:0,inputTokens:0,outputTokens:0,unknownUsageCalls:0});
  const evidence={schemaVersion:'phase3-connected-evidence.v1',createdAt:new Date().toISOString(),runId:PHASE3_RUN_ID,
    mode:'actual_models_synthetic_accounting',task:PHASE3_TASK,checks,phase3ChecksPassed:Object.values(checks).every(Boolean),
    actualPayment:false,renderEvidence:'Owned browser SDK DOM insertion/disclosure acknowledgement, publisher backend signed receipt; not independent viewability proof.',
    researchConclusion:'Phase 2 did not establish history or Jev superiority; rules remain the default outside this bounded integration.',
    buyerUsage:{...usage,estimatedKnownProviderUsd:usage.inputTokens*.042/1e6,excludesCodexAndLocalCompute:true,notInvoice:true},
    admissions,results,state,limitations:['Fictional advertiser declarations, not verified product capabilities.','No endorsement, attention, hidden context absorption or conversion evidence.','No MPP/channel settlement, x402 transfer or deployed service in this run.','Same-Mac publisher/operator is a demo trust boundary.']};
  mkdirSync('artifacts/phase3',{recursive:true});
  writeFileSync('artifacts/phase3/connected-run.json',JSON.stringify({...evidence,contentHash:hash(evidence)},null,2));
  console.log(JSON.stringify({evidence:'artifacts/phase3/connected-run.json',checks,charges:state.charges.length,buyerUsage:evidence.buyerUsage},null,2));
}finally{session.close();}
