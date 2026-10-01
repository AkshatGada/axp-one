import {join} from 'node:path';
import {mkdirSync} from 'node:fs';
import {createSession} from '../../apps/backend/session.mjs';
import {SQLitePaymentStore} from '../payments/store.mjs';
import {hash,ContractError,strictObject,baseUnits} from '../contracts/index.mjs';
import {CAMPAIGNS,SCENARIOS,POLICY,CAPABILITIES,mlCampaign,exchangeCampaign,makeOpportunity} from './config.mjs';
import {createOrganicBridge} from './organic.mjs';
import {createV3Harness} from './agents.mjs';
import {projectV3NetworkState,paymentEvidenceV3} from './payments.mjs';
import {v3RunPolicy} from './bundle.mjs';

export function createV3Service({stateDir,runId='v3-wallet-acceptance',retriever,apiKey,liveEnabled=false,transport,now=Date.now,payee,financialMode:GM='sandbox',organicEngine}={}){
 if(!['sandbox','devnet'].includes(GM))throw new ContractError('financial_mode_invalid');
 const acceptanceDir=join(stateDir,'acceptance');mkdirSync(acceptanceDir,{recursive:true,mode:0o700});const paymentStore=new SQLitePaymentStore(join(acceptanceDir,'payments.sqlite'));
 const session=createSession({stateDir:acceptanceDir,runId,campaigns:[],mode:GM,publisherPayee:payee,networkState:id=>projectV3NetworkState(paymentStore,id),now}),ex=session.exchange;
 const labSession=createSession({stateDir:join(stateDir,'laboratory'),runId:`${runId}-laboratory`,campaigns:[],now}),lab=labSession.exchange;
 for(const db of [ex,lab])for(const t of ['v3_meta','v3_drafts','v3_turns'])db.db.exec(`CREATE TABLE IF NOT EXISTS ${t}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
 const organic=createOrganicBridge({exchange:ex,runId,now,...(organicEngine?{engine:organicEngine}:{})}),harness=createV3Harness({stateDir:acceptanceDir,runId,retriever,apiKey,liveEnabled,transport,now});
 for(const c of CAMPAIGNS)if(!lab.get('v3_drafts',c.campaignId))lab.put('v3_drafts',c.campaignId,{campaign:c,businessName:c.displayName,contextHints:c.contextHints,approved:false,fictional:true,version:1});
 let running=false;
 const drafts=()=>lab.all('v3_drafts');
 function saveCampaign(body){
  strictObject(body,['campaignId','businessName','creative','contextHints','approved','status','maxBidBaseUnits','budgetCapBaseUnits','declaredConstraints'],['campaignId']);
  if(running)throw new ContractError('run_in_progress');const d=lab.require('v3_drafts',body.campaignId),c=structuredClone(d.campaign);
  for(const k of ['businessName','creative','contextHints'])if(Object.hasOwn(body,k)){if(typeof body[k]!=='string'||!body[k].trim()||body[k].length>(k==='creative'?800:400)||/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(body[k]))throw new ContractError('draft_invalid');if(k==='creative')c.creatives[0].approvedText=body[k];else d[k]=body[k];}
  if(body.status){if(!['active','paused'].includes(body.status))throw new ContractError('status_invalid');c.status=body.status;}
  for(const k of ['maxBidBaseUnits','budgetCapBaseUnits'])if(Object.hasOwn(body,k)){const n=baseUnits(body[k]);if(n>BigInt(k==='maxBidBaseUnits'?POLICY.maxBidBaseUnits:POLICY.totalCapBaseUnits))throw new ContractError('spend_cap');c[k]=body[k];}
  if(body.declaredConstraints){if(!Array.isArray(body.declaredConstraints)||body.declaredConstraints.some(x=>!CAPABILITIES.includes(x))||new Set(body.declaredConstraints).size!==body.declaredConstraints.length)throw new ContractError('capability_invalid');c.declaredConstraints=body.declaredConstraints;c.softFitTags=body.declaredConstraints;c.creatives[0].softFitTags=body.declaredConstraints;}
  if(Object.hasOwn(body,'approved')){if(typeof body.approved!=='boolean')throw new ContractError('approval_invalid');d.approved=body.approved;}
  if(c.creatives[0].approvedText.length+d.contextHints.length+34>1200)throw new ContractError('packet_too_large');
  d.version++;c.campaignVersionId=`${c.campaignId}-${hash({body,version:d.version}).slice(0,12)}`;c.creatives[0].creativeVersionId=`${c.campaignId}-creative-${hash({text:c.creatives[0].approvedText,version:d.version}).slice(0,12)}`;d.campaign=c;
  lab.put('v3_drafts',c.campaignId,d);lab.event('v3_campaign_version_created',{campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,laboratoryOnly:!!ex.get('v3_meta','freeze')});return d;
 }
 function freeze(){
  const prior=ex.get('v3_meta','freeze');if(prior)return prior;const ds=drafts();if(ds.length!==3||ds.some(d=>!d.approved||d.campaign.status!=='active'))throw new ContractError('approve_three_active_campaigns');
  for(const c of ds.slice(0,2).map(d=>d.campaign))if(!['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'].every(k=>c.declaredConstraints.includes(k)))throw new ContractError('frozen_story_capabilities');
  const f={runId,at:now(),drafts:ds,campaigns:ds.map(d=>exchangeCampaign(d.campaign)),scenarios:SCENARIOS,manifest:retriever.manifest,policy:v3RunPolicy(GM,organicEngine)};f.contentHash=hash(f);ex.put('v3_meta','freeze',f);initialize(f);ex.event('v3_run_frozen',{contentHash:f.contentHash});return f;
 }
 function initialize(f){for(const c of f.campaigns){if(!ex.get('channels',c.channelId))ex.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId:'owned-travel-app',payee,depositBaseUnits:'0',mode:GM});ex.syncNetworkChannel(c.channelId);if(!ex.get('campaigns',c.campaignId))ex.createCampaign(c);}}
 function turnInput({scenarioId,turnId,question,mandatoryCapabilities,financialMode=GM}){
  if(![GM,'synthetic'].includes(financialMode))throw new ContractError('financial_mode_invalid');const scenario=SCENARIOS.find(s=>s.id===scenarioId);
  if(financialMode===GM){if(!scenario)throw new ContractError('guided_scenario_required');return {scenario,turnId:`v3-${scenario.id}`,question:scenario.question,mandatoryCapabilities:scenario.mandatoryCapabilities,financialMode};}
  if(typeof turnId!=='string'||!/^lab-[\w-]{1,60}$/.test(turnId))throw new ContractError('laboratory_turn_invalid');makeOpportunity(question,{turnId,mandatoryCapabilities});if(!Array.isArray(mandatoryCapabilities)||mandatoryCapabilities.some(x=>!CAPABILITIES.includes(x)))throw new ContractError('capability_invalid');return {scenario:null,turnId,question,mandatoryCapabilities,financialMode};
 }
 function requestTurn(body){const input=turnInput(body),db=input.financialMode===GM?ex:lab,prior=db.get('v3_turns',input.turnId),inputHash=hash(input);if(prior){if(prior.inputHash!==inputHash)throw new ContractError('turn_conflict',undefined,409);return {...prior,organic:organic.get(input.turnId)};}
  if(input.financialMode==='synthetic'&&lab.all('v3_turns').length>=2)throw new ContractError('laboratory_allowance_exhausted');
  const r={...input,inputHash,status:'waiting_organic',requestedAt:now()};organic.request(input);db.put('v3_turns',input.turnId,r);return {...r,organic:organic.get(input.turnId)};
 }
 function preview(body){const input=turnInput(body),ds=drafts();return {financialMode:'synthetic',execution:'deterministic-reference',providerCalls:0,task:input.question,campaigns:ds.map(d=>({campaignId:d.campaign.campaignId,version:d.campaign.campaignVersionId,approved:d.approved,eligible:d.campaign.status==='active'&&input.mandatoryCapabilities.every(k=>d.campaign.declaredConstraints.includes(k)),policyExclusions:input.mandatoryCapabilities.filter(k=>!d.campaign.declaredConstraints.includes(k)),retrieval:retriever.retrieve(input.question,mlCampaign(d.campaign,d.contextHints))}))};}
 async function runTurn(body){
  if(running)throw new ContractError('run_in_progress',undefined,409);const req=requestTurn(body),db=req.financialMode===GM?ex:lab;
  if(req.status==='completed'){
   if(req.scenario?.id==='mobile'&&req.records?.length===0&&req.outcome?.status==='no_fill'&&req.execution!=='deterministic-policy'){const {organic:ignored,...saved}=req;db.put('v3_turns',req.turnId,{...saved,execution:'deterministic-policy'});}
   return state();
  }if(organic.get(req.turnId)?.status!=='completed')throw new ContractError('organic_waiting',undefined,409);
  const policyOnly=req.financialMode===GM&&req.scenario.id==='mobile';
  if(!liveEnabled&&!transport&&!policyOnly)throw new ContractError('operator_model_enable_required',undefined,403);
  const f=req.financialMode===GM?freeze():null,ds=f?f.drafts:drafts();if(ds.some(d=>!d.approved))throw new ContractError('campaign_approval_required');
  if(f)initialize(f);else for(const d of ds){const c=exchangeCampaign(d.campaign);if(!lab.get('channels',c.channelId))lab.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId:'owned-travel-app',payee:'synthetic:owned-travel-publisher',depositBaseUnits:'20000',mode:'synthetic'});lab.createCampaign(c);}
  if(f&&req.scenario.id!=='mobile')for(const c of f.campaigns.filter(c=>c.campaignId!=='v3-leatherguard'))if(projectV3NetworkState(paymentStore,c.channelId)?.openStatus!=='finalized')throw new ContractError('two_finalized_deposits_required');
  if(f&&req.scenario.id==='repeat'&&['v3-cached','v3-offline'].some(id=>ex.get('v3_turns',id)?.status!=='completed'))throw new ContractError('first_two_turns_required');
  running=true;try{
   const old=db.all('opportunities').find(o=>o.turnId===req.turnId),input=makeOpportunity(req.question,{turnId:req.turnId,randomSessionId:f?'v3-wallet-session':'v3-laboratory-session',now:now(),mandatoryCapabilities:req.mandatoryCapabilities});if(old)input.expiresAt=old.expiresAt;
   const o=db.createOpportunity(input,{idempotencyKey:req.turnId}),q=req.scenario?.questionIndex??(4+lab.all('v3_turns').findIndex(t=>t.turnId===req.turnId));
   const category=f?(req.scenario.paired?'paired':'repeat'):'laboratory',arms=f&&req.scenario.paired?['text_only','history']:['history'];
   const noFill=f&&req.scenario.id==='mobile';
   const slots=noFill?[]:ds.flatMap(d=>arms.map(arm=>({slotId:`${req.turnId}:${d.campaign.campaignVersionId}:${arm}`,question:req.question,questionIndex:q,arm,campaign:mlCampaign(d.campaign,d.contextHints),opportunityId:o.id,category})));
   const records=slots.length?await harness.runSlots({slots}):[];const items=Array.isArray(records)?records:(records.results??[]),history=items.filter(r=>r.arm==='history');
   const eligibility=db.decisionCandidates(o.id),excluded=new Set(eligibility.excluded.map(x=>x.campaignId)),effective=history.filter(r=>r.decision&&!excluded.has(r.campaignId)).map(r=>r.decision);
   const outcome=db.runAuction(o.id,effective);
   db.put('v3_turns',req.turnId,{...req,status:'completed',opportunityId:o.id,records:items,eligibility,outcome,completedAt:now(),execution:noFill?'deterministic-policy':transport?'fixture':'actual-jev'});
  }finally{running=false;}
  return state();
 }
 function acknowledge(id,body,financialMode=GM){const target=financialMode===GM?session:labSession;if(financialMode===GM&&!ex.get('charges',`charge-${id}`)){const totals=ex.all('charges');if(totals.length>=3||totals.reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n)+BigInt(ex.require('awards',id).priceBaseUnits)>12000n)throw new ContractError('aggregate_charge_cap');}return target.acknowledge(id,body);}
 function state(){const f=ex.get('v3_meta','freeze');if(f)initialize(f);const decorate=(db)=>db.all('v3_turns').map(t=>({...t,status:t.status==='waiting_organic'&&organic.get(t.turnId)?.status==='completed'?'ready':t.status,organic:organic.get(t.turnId),outcome:t.outcome?.award?{...t.outcome,award:db.get('awards',t.outcome.award.id)}:t.outcome}));return {schemaVersion:'axp.v3-state.v1',runId,presentation:'interactive-reference',financialMode:GM,running,modelEnabled:liveEnabled,model:harness.status(),organicAllowance:organic.status(),drafts:drafts(),freeze:f,turns:decorate(ex),laboratory:{financialMode:'synthetic',turns:decorate(lab),exchange:lab.report()},exchange:ex.report(),payments:paymentEvidenceV3(paymentStore,{runId,mode:GM}),limitations:['Fictional campaigns; product capabilities are advertiser declarations.','Real historical observations/inferred hints are not advertiser enrollment or targeting lift.',(GM==='devnet'?'Each fictional advertiser has its own disposable Devnet test wallet; both are operated by the same demo operator.':'Same disposable test payer represents both advertisers; not independent wallets.'),...(GM==='devnet'?['Public Solana Devnet with Devnet test USDC; not mainnet or real money.','Organic completions use an isolated, operator-recorded model bridge (see each answer\'s provenance).']:['Hosted Solana sandbox, not Devnet or mainnet.','Organic completions use an operator-recorded isolated app-agent bridge.']),'Owned-app delivery acknowledgement is not human attention, ad absorption or endorsement.']};}
 return {saveCampaign,freeze,requestTurn,runTurn,preview,state,organic,evidence:(question,campaignId)=>{const d=lab.require('v3_drafts',campaignId);return retriever.retrieve(question,mlCampaign(d.campaign,d.contextHints));},acknowledge,fail:(id,mode=GM)=>(mode===GM?ex:lab).failAward(id),harness,exchange:ex,labExchange:lab,paymentStore,close(){if(running)throw new ContractError('run_in_progress');harness.close?.();session.close();labSession.close();paymentStore.close();}};
}
