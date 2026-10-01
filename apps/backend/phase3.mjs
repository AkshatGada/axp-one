import {ContractError,hash,validateCampaign,validateDecision} from '../../packages/contracts/index.mjs';
import {PHASE2_CAMPAIGNS,PHASE2_CASES,PHASE2_MANIFEST} from '../../packages/dsp/phase2-fixtures.mjs';
import {createDecisionComparison} from './decisions.mjs';
import {JevDecisionEngine,JEV_MAPPING_VERSION,JEV_QUESTION_VERSION} from '../../packages/ml/engines/jev.mjs';
import {JEV_MODEL} from '../../packages/ml/engines/jev-http.mjs';
import {organicAnswer} from '../../packages/dsp/codex.mjs';

export const PHASE3_RUN_ID='phase3-20261001-acceptance';
export const PHASE3_TASK=PHASE2_CASES.find(c=>c.id==='booking-0');
export const PHASE3_SESSION_ID='phase3-owned-session';
export const PHASE3_TURNS=['placement-one','placement-two'];
export const PHASE3_CAMPAIGNS=PHASE2_CAMPAIGNS.map((c,index)=>({
  campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,advertiserId:c.advertiserId,
  status:'active',allowedIntents:['travel_tools'],destination:'unknown',declaredConstraints:[],
  softFitTags:c.softFitTags,creatives:c.creatives.map(cr=>({...cr,destinationURL:`https://${c.campaignId}.example/`,fictional:true})),
  maxBidBaseUnits:['4000','9000','8000'][index],budgetCapBaseUnits:'20000',channelId:`phase3-channel-${c.campaignId}`,policyVersion:'fit_intent_bid_v1',
}));
PHASE3_CAMPAIGNS.forEach(validateCampaign);

export function phase3Opportunity(prompt,{turnId,now=Date.now(),randomSessionId}={}) {
  if(prompt!==PHASE3_TASK.prompt||!PHASE3_TURNS.includes(turnId)||randomSessionId!==PHASE3_SESSION_ID)throw new ContractError('phase3_frozen_turn_required');
  return {publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId,turnId,
    coarseIntent:'travel_tools',destination:'unknown',taskConstraints:[],
    softPreferences:[...PHASE3_TASK.requiredCapabilities],floorBaseUnits:'1000',expiresAt:now+180000};
}

// A paid-attempt admission is durable before the external call. Reserved/unknown
// attempts are never retried on restart; the operator can inspect their outcome.
function admit(exchange,{id,kind,inputHash,limit}) {
  return exchange.tx(()=>{
    if(exchange.get('model_admissions',id))throw new ContractError('model_attempt_already_admitted',undefined,409);
    if(exchange.all('model_admissions').filter(a=>a.kind===kind).length>=limit)throw new ContractError('phase3_model_limit',undefined,409);
    const admission={id,kind,inputHash,status:'reserved',admittedAt:exchange.now()};
    exchange.put('model_admissions',id,admission);exchange.event(kind==='organic_app'?'model_completion_admitted':'model_call_admitted',admission);return admission;
  });
}
function complete(exchange,id,result){const a=exchange.require('model_admissions',id);exchange.put('model_admissions',id,{...a,...result,completedAt:exchange.now()});exchange.event(a.kind==='organic_app'?'model_completion_delivered':'model_call_completed',{id,kind:a.kind,...result});}

export async function createPhase3Runtime({corpus,transport,answerRunner=organicAnswer,organicRuntime='bundled-cli',now=Date.now,profiles:providedProfiles=null,runId=PHASE3_RUN_ID,campaigns=PHASE3_CAMPAIGNS,financialMode='synthetic',phase='phase3',sessionId=PHASE3_SESSION_ID,opportunityFactory=phase3Opportunity}={}) {
  if(!transport)throw new ContractError('phase3_transport_required');
  const profiles=providedProfiles??await createDecisionComparison({corpus,now}).prepare();
  if(PHASE2_CAMPAIGNS.some(c=>profiles.get(c.campaignId)?.historyStatus!=='ready'))throw new ContractError('phase3_profiles_unavailable');
  const engine=new JevDecisionEngine({transport,model:JEV_MODEL,liveAuthorized:true,transportMode:'live',now});
  const provider={
    beforeTurn(exchange,o){
      exchange.db.exec('CREATE TABLE IF NOT EXISTS model_admissions(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
      if(exchange.runId!==runId||!PHASE3_TURNS.includes(o.turnId))throw new ContractError('phase3_frozen_run_required');
      if(exchange.all('opportunities').length>2)throw new ContractError('phase3_turn_limit');
    },
    async buyer(c,o,exchange){
      const frozen=campaigns.find(x=>x.campaignId===c.campaignId);
      if(!frozen||hash(c)!==hash(frozen))throw new ContractError('phase3_campaign_changed');
      const campaign=PHASE2_CAMPAIGNS.find(x=>x.campaignId===c.campaignId);
      const request={schemaVersion:'decision-request.v1',runId:exchange.runId,mode:financialMode,
        opportunity:{id:o.id,coarseIntent:'travel_tools',destination:null,taskConstraints:{requiredCapabilities:PHASE3_TASK.requiredCapabilities},softPreferences:[],taskText:PHASE3_TASK.prompt},
        campaign,profile:profiles.get(c.campaignId),options:{deadlineAt:new Date(Math.min(o.expiresAt,now()+12000)).toISOString(),rubricVersion:'fit-intent-v1',engineConfigVersion:'phase3-jev-v1'}};
      const id=`jev:${o.id}:${c.campaignVersionId}`;
      admit(exchange,{id,kind:'jev',inputHash:hash(request),limit:6});
      const decision=await engine.scoreOpportunity(request);
      validateDecision(decision,c,o,now(),Date.parse(request.options.deadlineAt));
      complete(exchange,id,{status:decision.engineProvenance.outcome,agentRunId:decision.agentRunId,usage:decision.engineProvenance.usage});
      return decision;
    },
    async answer(input,exchange,o){
      // This is constructed from the frozen user task only. No profile, campaign,
      // advertiser, bid or creative is available to the independent answer path.
      const task={question:PHASE3_TASK.prompt,coarseIntent:input.coarseIntent,requestedCapabilities:input.softPreferences};
      const text=JSON.stringify(task),kind=organicRuntime==='app-bridge'?'organic_app':'organic',id=`${kind}:${o.id}`;
      admit(exchange,{id,kind,inputHash:hash(text),limit:2});
      try{
        const result=await answerRunner(text,organicRuntime==='app-bridge'?{turnId:o.turnId}:{});
        if(typeof result.value?.answer!=='string'||!result.value.answer.trim())throw new ContractError('organic_answer_invalid');
        complete(exchange,id,{status:'completed',provenance:result.provenance});
        return {status:'completed',source:'actual-model',text:result.value.answer,provenance:result.provenance};
      }catch(e){complete(exchange,id,{status:'unavailable',reason:e.code??'agent_execution_failed'});throw e;}
    },
  };
  return {
    sessionOptions:{campaigns,opportunityFactory,providers:{[`${phase}-live`]:provider},now},
    metadata:{phase,actualModels:true,financialMode,runId,task:PHASE3_TASK.prompt,
      randomSessionId:sessionId,turnIds:PHASE3_TURNS,buyerModel:JEV_MODEL,organicModel:'gpt-6.1-sol',organicEffort:'low',
      maxBuyerCalls:6,maxOrganicCalls:2,organicRuntime,caseManifestHash:PHASE2_MANIFEST.caseHash,
      mappingVersion:JEV_MAPPING_VERSION,questionVersion:JEV_QUESTION_VERSION,
      profiles:[...profiles.values()],limitations:['Historical brands are evidence, not enrolled AXP advertisers.','Cached profiles are associations, not proven fit or conversion predictions.','Actual model outputs; financial accounting is synthetic.','Receipt proves owned-app acknowledgement, not attention or absorption.']},
  };
}
