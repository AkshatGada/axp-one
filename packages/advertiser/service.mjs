import {randomUUID} from 'node:crypto';
import {ContractError,strictObject,hash,baseUnits,computeBid} from '../contracts/index.mjs';
import {createSession} from '../../apps/backend/session.mjs';
import {EvidenceDecisionEngine,compareDecisions} from './decision-engine.mjs';

export const CAPABILITIES=['travel_booking','expense_management','policy_enforcement','agent_identity','authentication','hotel_erp','expert_shortlist'];
export const PRESETS=[
  {id:'tripdesk',name:'Corporate travel',brandName:'TripDesk',websiteURL:'https://tripdesk.example/',productDescription:'Corporate travel booking and automatic expense capture for teams.',approvedText:'TripDesk brings team travel booking and automatic expense capture together.',contextHints:['For teams comparing corporate travel booking and automated expense tools.'],declaredCapabilities:['travel_booking','expense_management','policy_enforcement']},
  {id:'agentpass',name:'Agent identity',brandName:'AgentPass',websiteURL:'https://agentpass.example/',productDescription:'Authentication and identity for AI travel agents.',approvedText:'AgentPass manages authentication and identity for AI travel agents.',contextHints:['For developers comparing authentication for AI travel agents.'],declaredCapabilities:['agent_identity','authentication']},
  {id:'hotelops',name:'Hotel operations',brandName:'HotelOps',websiteURL:'https://hotelops.example/',productDescription:'Hotel ERP comparison and expert vendor shortlists.',approvedText:'HotelOps helps hotel operators compare ERP software with expert shortlists.',contextHints:['For hotel operators comparing ERP vendors and management software.'],declaredCapabilities:['hotel_erp','expert_shortlist']},
];
function text(v,max=1200){if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))throw new ContractError('invalid_text');return v.trim();}
function list(v,choices=null,max=12){if(!Array.isArray(v)||v.length>max||new Set(v).size!==v.length)throw new ContractError('invalid_list');return v.map(x=>{text(x,500);if(choices&&!choices.includes(x))throw new ContractError('unsupported_option');return x;});}
function url(v){text(v,400);let u;try{u=new URL(v);}catch{throw new ContractError('invalid_url');}if(u.protocol!=='https:'||u.username||u.password)throw new ContractError('invalid_url');return u.href;}
function id(v){if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,120}$/u.test(v))throw new ContractError('invalid_id');return v;}
function tokens(s){return new Set((s.toLowerCase().match(/[a-z]{3,}/g)??[]).filter(w=>!['the','and','for','with','that','this','from','tool','tools'].includes(w)));}

// Fixed authored demo taxonomy, not an LLM or a reconstruction of ChatGPT ranking.
export function simulationOpportunity(prompt,{turnId,randomSessionId,now=Date.now()}={}){
  text(prompt,2000);
  const s=prompt.toLowerCase().replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g,'[private]');
  const needs=[];
  if(/\b(expense|expenses|receipt|receipts)\b/.test(s))needs.push('expense_management');
  if(/\b(authentication|authenticate|identity|oauth)\b/.test(s))needs.push('authentication','agent_identity');
  if(/\b(erp|hotel operations|hotel management|vendor shortlist)\b/.test(s))needs.push('hotel_erp','expert_shortlist');
  if(/\b(booking|bookings|book|corporate travel)\b/.test(s)&&!/not (a )?(corporate )?(booking|travel booking)/.test(s))needs.push('travel_booking');
  if(/\b(policy enforcement|enforce policy)\b/.test(s))needs.push('policy_enforcement');
  const educational=/^(explain|what is|what are|tell me the history)\b/.test(s),blocked=/\b(medical diagnosis|political affiliation|sexual orientation|passport|ssn)\b/.test(s);
  const required=[...(/\b(must|require|requires|need|needs|only)\b/.test(s)?needs:[])];
  return {publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId:id(randomSessionId??'simulation-session'),turnId:id(turnId??randomUUID()),coarseIntent:blocked?'blocked':educational?'informational':needs.length?'travel_tools':'unknown',destination:'global',taskConstraints:[...new Set(required)],softPreferences:[...new Set(needs)],floorBaseUnits:'1000',expiresAt:now+180000};
}

export function simulationDecision(c,o,{draft=null,evidence=[]}={}){
  const needs=o.softPreferences,matched=needs.filter(x=>c.declaredConstraints.includes(x));
  const fit=matched.length===0?0:matched.length===needs.length?3:2;
  const intent=o.coarseIntent==='travel_tools'?2:0,decision=fit>=2&&intent>=2?'bid':'skip';
  const cr=c.creatives[0];
  // Historical evidence supports inspectable campaign preparation, not a learned
  // conversion model or an independent task-fit label. No provenance laundering.
  const hintWords=tokens((draft?.contextHints??[]).join(' '));
  const supporting=evidence.filter(r=>tokens(r.promptText).intersection(hintWords).size>0).map(r=>r.id);
  return {schemaVersion:'agent-decision.v1',opportunityId:o.id,advertiserId:c.advertiserId,campaignVersionId:c.campaignVersionId,agentRunId:`sim-${hash([o.id,c.campaignVersionId]).slice(0,24)}`,decision,creativeVersionId:cr.creativeVersionId,relevanceLevel:fit,commercialIntentLevel:intent,relevance:fit/3,commercialIntent:intent/3,conversionProbability:null,evidenceFieldIds:['declaredConstraints'],reasonCodes:[fit===0?'offer_does_not_match_task':'declared_capability_fit'],scoreSemantics:'fit-intent-v1',engineProvenance:{engine:'advertiser-simulation-rules-v1',mode:'deterministic_simulation',model:null,status:'completed',matchedCapabilities:matched,contextHints:draft?.contextHints??[],supportingHistoricalEvidenceIds:supporting,evidenceRole:'campaign_preparation_reference_not_conversion_or_fit_groundtruth'}};
}

const fields=['draftId','name','brandName','websiteURL','productDescription','approvedText','contextHints','declaredCapabilities','evidenceIds','maxBidBaseUnits','budgetCapBaseUnits','depositBaseUnits','approved'];
function validateDraft(input,catalogue){
  strictObject(input,fields,fields.filter(k=>k!=='draftId'));
  const d={...input,draftId:input.draftId?id(input.draftId):`draft-${randomUUID()}`};
  for(const k of ['name','brandName'])d[k]=text(d[k],120);
  d.websiteURL=url(d.websiteURL);d.productDescription=text(d.productDescription,1200);d.approvedText=text(d.approvedText,500);
  d.contextHints=list(d.contextHints,null,6);d.declaredCapabilities=list(d.declaredCapabilities,CAPABILITIES,7);d.evidenceIds=list(d.evidenceIds,null,12);
  if(!d.declaredCapabilities.length)throw new ContractError('capabilities_required');
  if(d.evidenceIds.some(x=>!catalogue.records.some(r=>r.id===x)))throw new ContractError('unknown_evidence');
  if(typeof d.approved!=='boolean')throw new ContractError('approval_required');
  const bid=baseUnits(d.maxBidBaseUnits),cap=baseUnits(d.budgetCapBaseUnits),deposit=baseUnits(d.depositBaseUnits);
  if(bid<1000n||bid>1000000n||cap<bid||cap>10000000n||deposit<cap||deposit>10000000n)throw new ContractError('invalid_demo_budget');
  return d;
}

export function createAdvertiserSimulation({stateDir,runId='advertiser-simulation-v1',catalogue,now=Date.now}={}){
  if(!catalogue||!Array.isArray(catalogue.records))throw new ContractError('evidence_catalogue_required');
  const session=createSession({stateDir,runId,campaigns:[],opportunityFactory:simulationOpportunity,now});
  const e=session.exchange;
  const evidenceEngine=new EvidenceDecisionEngine({catalogue});
  for(const table of ['sim_accounts','sim_drafts','sim_campaign_meta'])e.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
  const draftCampaign=d=>({campaignId:`campaign-${d.draftId}`,campaignVersionId:`campaign-${d.draftId}-v1`,advertiserId:'fictional-demo-advertiser',status:'active',allowedIntents:['travel_tools'],destination:'global',declaredConstraints:d.declaredCapabilities,creatives:[{creativeVersionId:`creative-${d.draftId}-v1`,approvedText:d.approvedText,destinationURL:d.websiteURL,fictional:true,softFitTags:d.declaredCapabilities,evidenceFieldIds:['declaredConstraints']}],softFitTags:d.declaredCapabilities,maxBidBaseUnits:d.maxBidBaseUnits,budgetCapBaseUnits:d.budgetCapBaseUnits,channelId:`sim-channel-${d.draftId}`,policyVersion:'fit_intent_bid_v1'});
  function saveAccount(input){strictObject(input,['accountName','brandName','websiteURL'],['accountName','brandName','websiteURL']);const a={accountId:'fictional-demo-advertiser',accountName:text(input.accountName,120),brandName:text(input.brandName,120),websiteURL:url(input.websiteURL),fictional:true,identityVerification:'not_performed_demo_only',mode:'synthetic'};return e.tx(()=>e.put('sim_accounts',a.accountId,a));}
  function saveDraft(input){const d=validateDraft(input,catalogue);return e.tx(()=>{const old=e.get('sim_drafts',d.draftId);if(old?.launchedCampaignId)throw new ContractError('launched_draft_immutable',undefined,409);return e.put('sim_drafts',d.draftId,{...d,updatedAt:now(),launchedCampaignId:null});});}
  function launch(draftId){return e.tx(()=>{
    if(!e.get('sim_accounts','fictional-demo-advertiser'))throw new ContractError('complete_onboarding',undefined,409);
    const d=e.require('sim_drafts',id(draftId));if(d.launchedCampaignId)return {campaign:e.require('campaigns',d.launchedCampaignId),replayed:true};
    if(!d.approved)throw new ContractError('creative_not_approved',undefined,409);
    // Exchange mutators each own durable, idempotent transactions. This local
    // synchronous launcher does not nest BEGINs or claim atomic multi-step launch.
    return d;
  });}
  function launchCampaign(draftId){
    const result=launch(draftId);if(result.campaign)return result;
    const d=result,c=draftCampaign(d);
    e.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId:'owned-travel-app',payee:'synthetic:owned-travel-publisher',depositBaseUnits:d.depositBaseUnits,mode:'synthetic'});
    e.createCampaign(c);
    e.tx(()=>{e.put('sim_campaign_meta',c.campaignId,{...d,campaignId:c.campaignId,evidenceContentHash:catalogue.contentHash,fictional:true,decisionEngine:'context-evidence-decision-v1'});e.put('sim_drafts',d.draftId,{...d,launchedCampaignId:c.campaignId});});
    return {campaign:c,replayed:false};
  }
  function preview(input){strictObject(input,['draftId','prompt'],['draftId','prompt']);const d=e.require('sim_drafts',id(input.draftId)),c=draftCampaign(d),o={...simulationOpportunity(input.prompt,{turnId:'preview',now:now()}),id:'preview-only'};
    const excluded=o.coarseIntent!=='travel_tools'?'noncommercial_or_unsupported_task':o.taskConstraints.some(x=>!c.declaredConstraints.includes(x))?'missing_constraint':null;
    const selected=catalogue.records.filter(r=>d.evidenceIds.includes(r.id));
    const decision=excluded?null:evidenceEngine.scoreOpportunity({campaign:c,opportunity:o,draft:d,prompt:input.prompt});
    return {mode:'synthetic',presentation:'fresh_deterministic_simulation',previewOnly:true,opportunity:o,excluded,decision,bid:decision?computeBid(decision,c,d.budgetCapBaseUnits,d.depositBaseUnits,o.floorBaseUnits):{status:'no_bid',reason:excluded},selectedEvidence:selected,limitations:['Preview does not reserve budget or create a placement.','Scores are uncalibrated evidence-informed lexical heuristics, not fresh Jev output or conversion predictions.']};
  }
  function compare(input){
    strictObject(input,['draftId','campaignId','prompt'],['prompt']);
    if(Boolean(input.draftId)===Boolean(input.campaignId))throw new ContractError('one_campaign_or_draft_required');
    const d=input.draftId?e.require('sim_drafts',id(input.draftId)):e.require('sim_campaign_meta',id(input.campaignId));
    const c=input.draftId?draftCampaign(d):e.require('campaigns',id(input.campaignId));
    const channel=input.campaignId?e.require('channels',c.channelId):null;
    const eligible=c.status==='active'&&(!channel||channel.status==='open');
    const available=eligible?(input.campaignId?e.available(c):{campaign:d.budgetCapBaseUnits,channel:d.depositBaseUnits}):{campaign:'0',channel:'0'};
    const opportunity={...simulationOpportunity(input.prompt,{turnId:'compare',now:now()}),id:'comparison-only'};
    return {...compareDecisions({campaign:c,opportunity,draft:d,prompt:input.prompt,catalogue,availableCampaign:available.campaign,availableChannel:available.channel}),fundingEligibility:{eligible,campaignStatus:c.status,channelStatus:channel?.status??'draft_only',reason:eligible?null:c.status!=='active'?'campaign_not_active':'channel_not_open'}};
  }
  async function turn(input){strictObject(input,['prompt','turnId','randomSessionId'],['prompt','turnId','randomSessionId']);id(input.turnId);id(input.randomSessionId);
    return session.turn({...input,engine:'rules'},{buyer:(c,o)=>{const d=e.require('sim_campaign_meta',c.campaignId);return evidenceEngine.scoreOpportunity({campaign:c,opportunity:o,draft:d,prompt:input.prompt});},answer:o=>({status:'completed',source:'deterministic-reference-not-llm',text:o.coarseIntent==='travel_tools'?'Compare the declared capabilities, integration effort, cancellation terms and support before choosing a tool. Check expense capture, approval workflows and data export against your requirements. This reference answer is generated from task fields only; it receives no advertiser creative.':'This task has no supported commercial placement. A real publisher assistant would answer independently; this simulator makes no LLM call.',inputProjection:{coarseIntent:o.coarseIntent,taskConstraints:o.taskConstraints,softPreferences:o.softPreferences},advertiserMaterialIncluded:false})});
  }
  function campaignStatus(input){strictObject(input,['campaignId','status'],['campaignId','status']);const c=e.require('campaigns',id(input.campaignId));if(input.status==='paused')return e.pauseCampaign(c.campaignId);if(input.status!=='active')throw new ContractError('invalid_status');if(e.require('channels',c.channelId).status!=='open')throw new ContractError('channel_closed',undefined,409);return e.createCampaign({...c,campaignVersionId:`${c.campaignId}-${randomUUID()}`,status:'active'});}
  function state(){e.expireAwards();const report=e.report();return {...report,presentation:'fresh_deterministic_simulation',account:e.get('sim_accounts','fictional-demo-advertiser'),drafts:e.all('sim_drafts'),campaignDetails:e.all('sim_campaign_meta'),results:session.results(),summaries:report.campaigns.map(c=>{const {accepted,reserved}=e.totals({campaignId:c.campaignId});const channel=e.require('channels',c.channelId);return {campaignId:c.campaignId,status:c.status,acceptedBaseUnits:accepted.toString(),reservedBaseUnits:reserved.toString(),availableBaseUnits:e.available(c).campaign,authorizedBaseUnits:channel.authorizedBaseUnits,settledBaseUnits:channel.settledBaseUnits,refundBaseUnits:channel.refundBaseUnits,deliveries:report.charges.filter(x=>x.campaignId===c.campaignId).length};}),limitations:['Fictional advertiser onboarding; no identity verification or real enrollment.','Deterministic simulated buyers and organic reference answer, not fresh model execution.','Synthetic accounting only: no native voucher, blockchain transfer or wallet connection.','Owned-app receipt asserts insertion and disclosure, not human attention.','Historical ContextHint evidence is separate from your approved ad and inferred hints are hypotheses.']};}
  return {catalogue,session,saveAccount,saveDraft,launchCampaign,preview,compare,turn,campaignStatus,state,acknowledge:(awardId,data)=>session.acknowledge(awardId,data),failAward:id=>e.failAward(id),authorize:id=>e.authorizeSynthetic(id),settle:id=>e.closeSynthetic(id),close:()=>session.close()};
}
