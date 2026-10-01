import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {hash,verifyReceipt,computeBid} from '../contracts/index.mjs';
import {validateDecision,validateProfile} from '../ml/engines/contract.mjs';
import {buildJevRequest,validateJevResponse} from '../ml/engines/jev.mjs';
import {participation} from '../ml/engines/base.mjs';
import {mlCampaign,QUESTIONS,POLICY,organicReference} from './config.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
export function sanitized(value){return JSON.parse(JSON.stringify(value,(key,v)=>['renderTokenHash','csrf','apiKey','vector','embedding','privateKey','wireBase64','unsignedWireBase64'].includes(key)?undefined:v));}
function requireEqual(a,b,code){if(hash(a)!==hash(b))throw Error(code);}
function validateDecisions(run){
 const s=run.state,f=s.freeze,m=s.model,e=run.callEvidence,items=s.completed.paired,turns=s.completed.turns;
 if(!e||e.calls?.length!==12||turns?.length!==2)throw Error('v2_decision_evidence_required');
 const {contentHash,...frozen}=f;requireEqual(contentHash,hash(frozen),'v2_freeze_hash');
 requireEqual(f.questions,QUESTIONS,'v2_questions');requireEqual(f.policy,POLICY,'v2_policy');requireEqual(f.manifest,run.manifest,'v2_manifest');
 requireEqual(e.inputs,{questions:QUESTIONS,campaigns:f.drafts.map(d=>mlCampaign(d.campaign,d.contextHints)),opportunityIds:turns.map(t=>t.opportunityId),manifest:run.manifest,policy:e.policy},'v2_frozen_inputs');
 requireEqual(m.inputHash,hash(e.inputs),'v2_input_hash');requireEqual(m.policyHash,hash(e.policy),'v2_policy_hash');requireEqual(m.manifestHash,hash(run.manifest),'v2_manifest_hash');
 if(e.policy.transportMode==='live'){const {contentHash,...content}=run.evidence;requireEqual(contentHash,hash(content),'v2_catalogue_hash');const {contentHash:mh,...manifest}=run.manifest;requireEqual(mh,hash(manifest),'v2_evidence_manifest_hash');}
 const slots=new Set();let admitted=0,completed=0,unavailable=0,failed=0,uncertain=0,inputTokens=0,outputTokens=0,unknown=0;
 for(const r of items){
  const c=f.campaigns.find(c=>c.campaignId===r.campaignId),turn=turns[r.questionIndex];
  if(!c||!turn||!['text_only','history'].includes(r.arm)||r.task!==QUESTIONS[r.questionIndex]||r.campaignVersionId!==c.campaignVersionId)throw Error('v2_slot_binding');
  const slot=JSON.stringify([r.questionIndex,c.campaignVersionId,r.arm]);if(slots.has(slot))throw Error('v2_slot_duplicate');slots.add(slot);
  const original=e.calls.find(x=>x.slot===slot),request=original?.request,d=r.decision;
  if(!original||r.callId!==original.callId||r.callId!=='v2-call:'+hash([run.runId,slot]).slice(0,32)||!request||request.runId!==run.runId||request.mode!=='synthetic'||request.opportunity.id!==turn.opportunityId||request.opportunity.taskText!==r.task)throw Error('v2_call_binding');
  requireEqual(request.campaign,e.inputs.campaigns.find(c=>c.campaignId===r.campaignId),'v2_campaign_request');
  validateDecision(d,request);requireEqual(original.payload,buildJevRequest(request,e.policy.model),'v2_payload_binding');
  requireEqual(r.requestHash,hash({payload:original.payload,opportunityId:turn.opportunityId,arm:r.arm,inputHash:m.inputHash}),'v2_request_hash');
  if(r.arm==='text_only'){if(request.profile!==null||r.retrieval!==null)throw Error('v2_baseline_history');}
  else{
   const retrieval=r.retrieval;if(!retrieval||retrieval.sourceHash!==(run.evidence.contentHash??request.profile?.snapshotContentHash))throw Error('v2_history_source');
   if(request.profile){validateProfile(request.profile,request.campaign);requireEqual(request.profile,retrieval.profile,'v2_history_profile');if(request.profile.snapshotId!==run.manifest.snapshotId||request.profile.historyStatus!=='ready'||request.profile.observedExamples.length>3||request.profile.inferredHints.length>2)throw Error('v2_history_limits');}
   else if(r.status!=='unavailable')throw Error('v2_history_missing');
   if(e.policy.transportMode==='live'){
    for(const x of retrieval.examples){const src=run.evidence.records.find(src=>src.id===x.id);if(!src||src.creativeId!==x.creativeId||src.promptId!==x.promptId||x.text!==`Historical reference, not this campaign's capabilities. Prompt: ${src.promptText}\nObserved creative: ${src.creativeText}`)throw Error('v2_observed_example_binding');}
    for(const h of retrieval.hints){const src=run.evidence.hints.find(src=>src.id===h.id);if(!src||h.text!==`Inferred historical targeting hypothesis; not a campaign declaration. ${src.text}`||!retrieval.examples.some(x=>x.hintIds.includes(h.id)))throw Error('v2_inferred_hint_binding');}
    requireEqual(retrieval.profile.observedExamples,retrieval.examples.map(({id,text})=>({id,text})),'v2_compact_examples');requireEqual(retrieval.profile.inferredHints,retrieval.hints.map(({id,text,tier,qualityFlags})=>({id,text,tier,qualityFlags})),'v2_compact_hints');
   }
  }
  const p=d.engineProvenance;if(p.profileHash!==(request.profile?.profileHash??null)||p.snapshotHash!==(request.profile?.snapshotContentHash??null)||p.transportMode!==e.policy.transportMode)throw Error('v2_decision_provenance');
  if(original.admitted){admitted++;if(r.admittedAt===null)throw Error('v2_admission');if(r.usage){inputTokens+=r.usage.inputTokens;outputTokens+=r.usage.outputTokens;}else unknown++;}
  else if(r.admittedAt!==null||r.rawOutput!==null||r.status!=='unavailable')throw Error('v2_unadmitted_response');
  if(r.status==='completed'){
   completed++;if(!original.admitted||!r.rawOutput||!r.responseReceived)throw Error('v2_response_required');
   const j=validateJevResponse(r.rawOutput,original.payload);requireEqual(r.usage,j.usage,'v2_usage');requireEqual(p.usage,j.usage,'v2_provenance_usage');
   const choice=j.sufficient?j.creativeVersionId:null,expected=!j.sufficient?'abstain':choice===null?'skip':participation(j.relevanceLevel,j.commercialIntentLevel);
   if(d.decision!==expected||d.creativeVersionId!==choice||d.relevanceLevel!==(j.sufficient?j.relevanceLevel:null)||d.commercialIntentLevel!==(j.sufficient?j.commercialIntentLevel:null)||p.model!==e.policy.model)throw Error('v2_response_mapping');
   if(d.agentRunId!=='agent:'+hash([run.runId,turn.opportunityId,c.campaignVersionId,p.engine,request.options.engineConfigVersion]).slice(0,24))throw Error('v2_agent_identity');
  }else if(r.status==='unavailable'){unavailable++;if(d.decision!=='abstain'||r.rawOutput!==null)throw Error('v2_unavailable_mapping');}
  else if(r.status==='failed')failed++;else if(['admitted','uncertain'].includes(r.status))uncertain++;else throw Error('v2_pending_slot');
 }
 for(const q of [0,1])for(const c of f.campaigns)for(const a of ['text_only','history'])if(!slots.has(JSON.stringify([q,c.campaignVersionId,a])))throw Error('v2_matrix');
 for(const [key,value]of Object.entries({maxCalls:12,plannedCalls:12,admittedCalls:admitted,admitted,remainingCalls:12-admitted,remaining:12-admitted,completedCalls:completed,unavailableCalls:unavailable,failedCalls:failed,uncertainCalls:uncertain,pendingCalls:0}))if(m[key]!==value)throw Error('v2_model_counts');
 requireEqual(m.usage,{inputTokens,outputTokens,unknownUsageCalls:unknown},'v2_usage_counts');
 const spent=new Map();
 for(const [q,t]of turns.entries()){
  if(t.questionIndex!==q||t.task!==QUESTIONS[q])throw Error('v2_turn_binding');requireEqual(t.organic,organicReference(t.task),'v2_organic_reference');
  requireEqual(t.records,items.filter(r=>r.questionIndex===q&&r.arm==='history'),'v2_history_auction_records');
  const expectedBids=[];
  for(const r of t.records){const c=f.campaigns.find(c=>c.campaignId===r.campaignId),d=r.decision,bids=t.outcome.bids.filter(b=>b.campaignId===c.campaignId);
   if(d.decision!=='bid'||!c.declaredConstraints.includes('crypto_storage')){if(bids.length)throw Error('v2_nonbid_auction');continue;}
   const o=s.exchange.opportunities.find(o=>o.id===t.opportunityId),used=spent.get(c.campaignId)??0n;
   const price=computeBid(d,c,(BigInt(c.budgetCapBaseUnits)-used).toString(),(20000n-used).toString(),o.floorBaseUnits);
   if(price.status!=='bid'){if(bids.length)throw Error('v2_bid_unavailable');continue;}
   if(bids.length!==1)throw Error('v2_bid_required');const b=bids[0];
   for(const [key,value]of Object.entries({agentRunId:d.agentRunId,opportunityId:t.opportunityId,campaignVersionId:c.campaignVersionId,advertiserId:c.advertiserId,creativeVersionId:d.creativeVersionId,amountBaseUnits:price.amountBaseUnits,bidPolicyVersion:price.bidPolicyVersion}))if(b[key]!==value)throw Error('v2_bid_binding');expectedBids.push(b);
  }
  expectedBids.sort((a,b)=>BigInt(a.amountBaseUnits)===BigInt(b.amountBaseUnits)?a.campaignId.localeCompare(b.campaignId):BigInt(a.amountBaseUnits)>BigInt(b.amountBaseUnits)?-1:1);
  const award=s.exchange.awards.find(a=>a.opportunityId===t.opportunityId),win=expectedBids[0];
  if(!win){if(award||t.outcome.status!=='no_fill')throw Error('v2_false_award');continue;}
  if(!award||award.winningBidId!==win.id||award.priceBaseUnits!==win.amountBaseUnits||award.campaignId!==win.campaignId||t.outcome.award.id!==award.id||t.outcome.status!=='awarded')throw Error('v2_award_binding');
  const c=f.campaigns.find(c=>c.campaignId===win.campaignId);if(award.channelId!==c.channelId||award.campaignVersionId!==c.campaignVersionId||award.creativeVersionId!==win.creativeVersionId)throw Error('v2_award_campaign');requireEqual(award.creative,c.creatives.find(x=>x.creativeVersionId===win.creativeVersionId),'v2_award_creative');requireEqual(award.creativeHash,hash(award.creative),'v2_creative_hash');spent.set(c.campaignId,(spent.get(c.campaignId)??0n)+BigInt(win.amountBaseUnits));
 }
}
export function validateV2Run(run){
 if(run.schemaVersion!=='axp.v2-bundle-run.v1'||run.state.runId!==run.runId||run.state.financialMode!=='synthetic')throw Error('v2_run_binding');
 const state=run.state,ex=state.exchange,items=state.completed?.paired??[];
 if(items.length!==12||new Set(items.map(x=>x.callId)).size!==12||!state.freeze)throw Error('paired_run_incomplete');
 validateDecisions(run);
 if(ex.charges.length<1)throw Error('accepted_placement_required');
 for(const c of ex.charges){const award=ex.awards.find(a=>a.id===c.awardId),receipt=run.receipts.find(r=>r.chargeId===c.id),pub=run.publishers.find(p=>p.publisherId===award?.publisherId);
  if(!award||!receipt||!pub||c.campaignId!==award.campaignId||c.campaignVersionId!==award.campaignVersionId||c.channelId!==award.channelId||c.runId!==run.runId||c.mode!=='synthetic'||hash(receipt.receipt)!==c.receiptHash||!verifyReceipt(receipt.receipt,receipt.signature,pub.publicKeyPEM)||receipt.receipt.runId!==run.runId||receipt.receipt.mode!=='synthetic'||receipt.receipt.creativeHash!==award.creativeHash||receipt.receipt.opportunityId!==award.opportunityId||receipt.receipt.awardId!==award.id||award.priceBaseUnits!==c.amountBaseUnits)throw Error('v2_receipt_correlation');
 }
 for(const channel of ex.channels){const total=ex.charges.filter(c=>c.channelId===channel.channelId).reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n);if(total>8000n||total>BigInt(channel.depositBaseUnits))throw Error('v2_spend_cap');if(channel.status==='finalized'&&(BigInt(channel.settledBaseUnits)!==total||BigInt(channel.refundBaseUnits)+total!==BigInt(channel.depositBaseUnits)||channel.txSignature!==null))throw Error('v2_synthetic_accounting');}
 if(run.v1Payment.runId===run.runId||run.v1Payment.mode==='devnet'||run.v1Payment.network==='devnet')throw Error('v1_payment_mode_confusion');
 const text=JSON.stringify(run);if(/-----BEGIN .*PRIVATE KEY|apikey_[A-Za-z0-9_]{20,}|"(?:csrf|apiKey|privateKey|vector|wireBase64|unsignedWireBase64)"\s*:/.test(text))throw Error('bundle_private_material');
 return true;
}
export function writeV2Bundle(directory,run){run=sanitized(run);validateV2Run(run);mkdirSync(directory,{recursive:true});const bytes=Buffer.from(JSON.stringify(run,null,2));writeFileSync(join(directory,'run.json'),bytes);const manifest={schemaVersion:'axp.v2-replay-manifest.v1',runId:run.runId,createdAt:new Date().toISOString(),presentation:'recorded-replay',financialMode:'synthetic',files:{'run.json':digest(bytes)}};writeFileSync(join(directory,'manifest.json'),JSON.stringify(manifest,null,2));return loadV2Bundle(directory);}
export function loadV2Bundle(directory){const bytes=readFileSync(join(directory,'manifest.json')),manifest=JSON.parse(bytes);if(manifest.schemaVersion!=='axp.v2-replay-manifest.v1'||Object.keys(manifest.files).join()!=='run.json')throw Error('v2_manifest_invalid');const contents=readFileSync(join(directory,'run.json'));if(digest(contents)!==manifest.files['run.json'])throw Error('v2_bundle_hash');const run=JSON.parse(contents);validateV2Run(run);if(run.runId!==manifest.runId)throw Error('v2_manifest_binding');return {run,manifest,bundleHash:digest(bytes)};}
