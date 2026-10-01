import {createSession} from '../../apps/backend/session.mjs';
import {hash,ContractError,strictObject,baseUnits} from '../contracts/index.mjs';
import {CAMPAIGNS,NAMES,QUESTIONS,POLICY,mlCampaign,makeOpportunity,organicReference} from './config.mjs';
import {createPairedHarness} from './agents.mjs';

// Own run-scoped SQLite and receipt identity. No wallet/payment adapter is loaded.
export function createV2Service({stateDir,runId='v2-wallet-acceptance',retriever,apiKey,liveEnabled=false,transport,now=Date.now}={}){
 const session=createSession({stateDir,runId,now,campaigns:[]}),ex=session.exchange;
 for(const t of ['v2_drafts','v2_meta'])ex.db.exec(`CREATE TABLE IF NOT EXISTS ${t}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
 for(const c of CAMPAIGNS)if(!ex.get('v2_drafts',c.campaignId))ex.put('v2_drafts',c.campaignId,{campaign:c,name:NAMES[c.campaignId],businessName:NAMES[c.campaignId],contextHints:c.campaignId==='v2-leatherguard'?'Physical card protection; not cryptocurrency storage.':'Self-custody for Ethereum and Solana; compare wallet formats.',approved:false,fictional:true});
 const harness=createPairedHarness({stateDir,runId,retriever,apiKey,liveEnabled,transport,now});
 let running=false;
 const drafts=()=>ex.all('v2_drafts');
 function saveCampaign(body){
  strictObject(body,['campaignId','businessName','creative','contextHints','approved'],['campaignId','businessName','creative','contextHints','approved']);
  if(ex.get('v2_meta','freeze'))throw new ContractError('run_frozen',undefined,409);
  const d=ex.require('v2_drafts',body.campaignId);
  for(const k of ['businessName','creative','contextHints'])if(typeof body[k]!=='string'||!body[k].trim()||body[k].length>(k==='creative'?800:400)||/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(body[k]))throw new ContractError('draft_invalid');
  if(typeof body.approved!=='boolean')throw new ContractError('approval_required');
  if(body.creative.length+body.contextHints.length+34>1200)throw new ContractError('draft_packet_too_large');
  d.businessName=body.businessName;d.contextHints=body.contextHints;d.campaign.creatives[0].approvedText=body.creative;d.approved=body.approved;
  d.campaign.campaignVersionId=`${d.campaign.campaignId}-${hash({creative:body.creative,contextHints:body.contextHints}).slice(0,12)}`;
  d.campaign.creatives[0].creativeVersionId=`${d.campaign.campaignId}-creative-${hash(body.creative).slice(0,12)}`;
  ex.put('v2_drafts',d.campaign.campaignId,d);ex.event('v2_campaign_draft_saved',{campaignId:d.campaign.campaignId,approved:d.approved});return d;
 }
 async function evidence(questionIndex=0,campaignId=CAMPAIGNS[0].campaignId){
  if(!Number.isInteger(questionIndex)||questionIndex<0||questionIndex>=QUESTIONS.length)throw new ContractError('question_invalid');
  const d=ex.require('v2_drafts',campaignId);
  return retriever.retrieve(QUESTIONS[questionIndex],mlCampaign(d.campaign,d.contextHints));
 }
 async function preview(){
  return {execution:'deterministic-reference',modelCalls:0,financialMode:'synthetic',questions:await Promise.all(QUESTIONS.map(async(task,q)=>({task,retrieval:await evidence(q),campaigns:drafts().map(d=>({campaignId:d.campaign.campaignId,declarations:d.campaign.declaredConstraints,policy:!d.campaign.declaredConstraints.includes('crypto_storage')?'Cannot bid for crypto-storage capability it does not declare. Agent still gets an independent opportunity to skip.':'Eligible under the frozen soft-preference task; actual Jev judgment not yet known.'}))}))),policy:POLICY};
 }
 function freeze(){
  const old=ex.get('v2_meta','freeze');if(old)return old;
  const ds=drafts();if(ds.length!==3||ds.some(d=>!d.approved))throw new ContractError('approve_three_fictional_campaigns');
  const frozen={runId,at:now(),questions:QUESTIONS,campaigns:ds.map(d=>d.campaign),drafts:ds,manifest:retriever.manifest,policy:POLICY};frozen.contentHash=hash(frozen);
  ex.tx(()=>ex.put('v2_meta','freeze',frozen));
  // Idempotent creation enables recovery if interrupted between freeze and setup.
  initialize(frozen);return frozen;
 }
 function initialize(frozen){for(const c of frozen.campaigns){ex.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId:'owned-travel-app',payee:'synthetic:owned-travel-publisher',mode:'synthetic',depositBaseUnits:POLICY.depositBaseUnits});ex.createCampaign(c);}}
 async function run(){
  if(running)throw new ContractError('run_in_progress',undefined,409);
  if(!liveEnabled&&!transport&&!ex.get('v2_meta','completed'))throw new ContractError('operator_model_enable_required',undefined,403);
  running=true;try{
   const frozen=freeze();initialize(frozen);
   const opportunities=QUESTIONS.map((task,q)=>{
    const input=makeOpportunity(task,{now:now(),questionIndex:q}),business=`opp-${hash([input.publisherId,input.randomSessionId,input.turnId]).slice(0,24)}`;
    const old=ex.get('opportunities',business);if(old)return old;
    return ex.createOpportunity(input,{idempotencyKey:`v2-question-${q}`});
   });
   const paired=await harness.run({questions:[...QUESTIONS],campaigns:frozen.drafts.map(d=>mlCampaign(d.campaign,d.contextHints)),opportunityIds:opportunities.map(o=>o.id)});
   const items=Array.isArray(paired)?paired:(paired.results??paired.decisions??harness.results());
   if(ex.get('v2_meta','completed'))return state();
   const turns=opportunities.map((o,q)=>{
    const records=items.filter(r=>r.questionIndex===q&&r.arm==='history');
    const effective=[],policyExclusions=[];
    for(const r of records){const c=frozen.campaigns.find(c=>c.campaignId===r.campaignId);if(!r.decision)continue;
     // Never use observed brand capabilities to fill a fictional declaration gap.
     if(r.decision.decision==='bid'&&!c.declaredConstraints.includes('crypto_storage')){policyExclusions.push({campaignId:c.campaignId,reason:'undeclared_crypto_storage',originalDecision:r.decision.decision});continue;}
     effective.push(r.decision);
    }
    const outcome=ex.runAuction(o.id,effective);
    return {questionIndex:q,task:QUESTIONS[q],opportunityId:o.id,organic:organicReference(QUESTIONS[q]),records,policyExclusions,outcome};
   });
   const complete={at:now(),paired:items,turns,execution:transport?'fixture':'actual-jev',financialMode:'synthetic'};
   ex.put('v2_meta','completed',complete);return state();
  }finally{running=false;}
 }
 function state(){
  const complete=ex.get('v2_meta','completed'),report=ex.report();
  return {schemaVersion:'axp.v2-state.v1',runId,presentation:'interactive-reference',financialMode:'synthetic',running,modelEnabled:liveEnabled,model:harness.status(),drafts:drafts(),freeze:ex.get('v2_meta','freeze'),completed:complete,exchange:report,limitations:['Historical evidence is not advertiser enrollment or verified product performance.','Paired decisions are a small demonstration, not targeting accuracy or conversion lift.','Organic response is a sponsor-free deterministic reference, not a fresh LLM answer.','V2 has synthetic accounting only. V1 sandbox payment belongs to a separate original run.','Signed publisher acknowledgement proves an owned-app assertion, not human attention.']};
 }
 function acknowledge(id,body){if(running)throw new ContractError('run_in_progress');return session.acknowledge(id,body);}
 function settle(){if(running)throw new ContractError('run_in_progress');for(const c of ex.all('channels')){ex.authorizeSynthetic(c.channelId);ex.closeSynthetic(c.channelId);}return state();}
 return {saveCampaign,evidence,preview,run,state,acknowledge,settle,fail:id=>ex.failAward(id),harness,exchange:ex,close(){if(running)throw new ContractError('run_in_progress');session.close();}};
}
