import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {hash,verifyReceipt} from '../contracts/index.mjs';
import {validateCatalogue} from '../v2/evidence.mjs';
import {sanitized} from '../v2/bundle.mjs';
import {validateDecision,validateProfile} from '../ml/engines/contract.mjs';
import {buildJevRequest,validateJevResponse} from '../ml/engines/jev.mjs';
import {participation} from '../ml/engines/base.mjs';
import {mlCampaign,SCENARIOS,POLICY} from './config.mjs';
import {organicPrompt} from './organic.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const equal=(a,b,code)=>{if(hash(a)!==hash(b))throw Error(code);};
// Exchange storage canonicalizes object-key order. Original harness rows retain
// provider/request serialization. Restore only after semantic identity checks;
// do not regenerate packet bytes or raw response hashes.
export function restoreV3CapturedRecords(state,calls){
 if(!Array.isArray(calls)||new Set(calls.map(r=>r.slotId)).size!==calls.length)throw Error('v3_capture_binding');
 const result=structuredClone(state),records=result.turns.flatMap(t=>t.records??[]);
 if(records.length!==calls.length)throw Error('v3_capture_binding');
 for(const t of result.turns)t.records=(t.records??[]).map(r=>{const original=calls.find(c=>c.slotId===r.slotId);if(!original)throw Error('v3_capture_binding');equal(original,r,'v3_capture_binding');return structuredClone(original);});
 return result;
}
export function validateV3DecisionRecords(run){
 const frozen=run.state.freeze,records=run.state.turns.flatMap(t=>t.records??[]),seen=new Set();
 if(records.filter(r=>r.category==='paired').length!==12||records.filter(r=>r.category==='repeat').length!==3)throw Error('v3_decision_matrix');
 for(const r of records){
  const t=run.state.turns.find(t=>t.opportunityId===r.opportunityId),d=frozen.drafts.find(d=>d.campaign.campaignId===r.campaignId);
  if(!t||!d||seen.has(r.slotId)||r.question!==t.question||r.questionIndex!==t.scenario.questionIndex||r.campaignVersionId!==d.campaign.campaignVersionId||!['text_only','history'].includes(r.arm))throw Error('v3_slot_binding');seen.add(r.slotId);
  const q=r.request;if(!q||q.runId!==run.runId||q.mode!=='sandbox'||q.opportunity.id!==t.opportunityId||q.opportunity.taskText!==t.question)throw Error('v3_request_binding');
  equal(q.campaign,mlCampaign(d.campaign,d.contextHints),'v3_campaign_request');
  equal(r.packet,buildJevRequest(q,POLICY.model),'v3_packet_request');
  if(r.packetHash!==hash(r.packet)||r.packetBytes!==JSON.stringify(r.packet)||r.packetBytesHash!==sha(r.packetBytes)||r.requestHash!==hash({packet:r.packet,bindings:r.bindings,inputHash:r.inputHash}))throw Error('v3_packet_hash');
  const bindings=r.bindings;if(bindings.runId!==run.runId||bindings.slotId!==r.slotId||bindings.opportunityId!==t.opportunityId||bindings.campaignHash!==hash(q.campaign)||bindings.manifestHash!==hash(run.manifest)||bindings.questionHash!==sha(t.question))throw Error('v3_packet_binding');
  if(r.arm==='text_only'){if(r.retrieval!==null||q.profile!==null)throw Error('v3_baseline_history');}
  else if(q.profile){
   validateProfile(q.profile,q.campaign);equal(q.profile,r.retrieval.profile,'v3_retrieval_profile');
   if(r.retrieval.sourceHash!==run.evidence.contentHash||bindings.sourceHash!==r.retrieval.sourceHash||q.profile.snapshotId!==run.manifest.snapshotId||r.retrieval.examples.length>3||r.retrieval.hints.length>2)throw Error('v3_source_binding');
   for(const x of r.retrieval.examples){const src=run.evidence.records.find(s=>s.id===x.id);if(!src||src.promptId!==x.promptId||src.creativeId!==x.creativeId||x.text!==`Historical reference, not this campaign's capabilities. Prompt: ${src.promptText}\nObserved creative: ${src.creativeText}`)throw Error('v3_observed_example_binding');}
   for(const h of r.retrieval.hints){const src=run.evidence.hints.find(s=>s.id===h.id);if(!src||h.text!==`Inferred historical targeting hypothesis; not a campaign declaration. ${src.text}`||!r.retrieval.examples.some(x=>x.hintIds.includes(h.id)))throw Error('v3_inferred_hint_binding');}
   equal(q.profile.observedExamples,r.retrieval.examples.map(({id,text})=>({id,text})),'v3_compact_examples');equal(q.profile.inferredHints,r.retrieval.hints.map(({id,text,tier,qualityFlags})=>({id,text,tier,qualityFlags})),'v3_compact_hints');
  }else if(r.status!=='unavailable')throw Error('v3_missing_history');
  validateDecision(r.decision,q);if(r.decision.engineProvenance.transportMode!=='live')throw Error('v3_actual_transport_required');
  if(r.status==='completed'){
   if(!r.admitted||!r.responseReceived||!r.rawOutput||r.rawOutputHash!==sha(JSON.stringify(r.rawOutput)))throw Error('v3_response_required');
   const j=validateJevResponse(r.rawOutput,r.packet),choice=j.sufficient?j.creativeVersionId:null,decision=!j.sufficient?'abstain':choice===null?'skip':participation(j.relevanceLevel,j.commercialIntentLevel);
   const levels={relevanceLevel:j.sufficient?j.relevanceLevel:null,commercialIntentLevel:j.sufficient?j.commercialIntentLevel:null};
   if(r.decision.decision!==decision||r.decision.creativeVersionId!==choice||r.decision.engineProvenance.model!==POLICY.model||r.decision.relevanceLevel!==levels.relevanceLevel||r.decision.commercialIntentLevel!==levels.commercialIntentLevel||r.decision.relevance!==(levels.relevanceLevel===null?null:levels.relevanceLevel/3)||r.decision.commercialIntent!==(levels.commercialIntentLevel===null?null:levels.commercialIntentLevel/3)||r.decision.conversionProbability!==null)throw Error('v3_response_mapping');
   equal(r.usage,j.usage,'v3_response_usage');equal(r.decision.engineProvenance.usage,j.usage,'v3_response_usage');
   equal(r.decision.evidenceFieldIds,choice===null?[]:q.campaign.creatives.find(c=>c.creativeVersionId===choice).evidenceFieldIds,'v3_response_evidence');
  }else if(!['failed','uncertain','unavailable'].includes(r.status)||r.decision.decision!=='abstain')throw Error('v3_unavailable_mapping');
 }
 for(const t of run.state.turns.filter(t=>t.scenario.id!=='mobile'))for(const d of frozen.drafts)for(const arm of t.scenario.paired?['text_only','history']:['history'])if(!records.some(r=>r.opportunityId===t.opportunityId&&r.campaignVersionId===d.campaign.campaignVersionId&&r.arm===arm))throw Error('v3_missing_matrix_slot');
 if(run.state.model.admittedCalls>24||run.state.model.categories.paired.admitted>12||run.state.model.categories.repeat.admitted>3||run.state.model.categories.laboratory.admitted>6||run.state.model.categories.correction.admitted>3)throw Error('v3_model_cap');
 return true;
}
export function validateV3ReplayRetrieval(run){const expected=run.state.turns.filter(t=>['cached','offline'].includes(t.scenario.id)).flatMap(t=>t.records.filter(r=>r.arm==='history').map(r=>({question:t.question,campaignId:r.campaignId,result:r.retrieval})));equal(run.retrieval,expected,'v3_replay_retrieval_binding');return true;}
export function validateV3Run(run){
 if(run.schemaVersion!=='axp.v3-run.v1'||run.state.runId!==run.runId||run.state.financialMode!=='sandbox')throw Error('v3_run_binding');
 validateCatalogue(run.evidence);const s=run.state,ex=s.exchange,f=s.freeze,{contentHash,...frozen}=f??{};if(!f||contentHash!==hash(frozen)||hash(run.manifest)!==hash(f.manifest))throw Error('v3_freeze_hash');
 equal(f.policy,POLICY,'v3_policy_binding');equal(f.scenarios,SCENARIOS,'v3_scenario_binding');
 const completed=s.turns.filter(t=>t.status==='completed');if(completed.length!==4||completed.some(t=>t.organic?.status!=='completed'||t.organic.question!==t.question||t.organic.suppliedPrompt!==organicPrompt(t.question)||t.organic.inputHash!==hash(t.organic.suppliedPrompt)||t.organic.provenance?.model!=='gpt-6.1-sol'||t.organic.provenance.effort!=='low'||t.organic.advertiserMaterialReceived!==false))throw Error('v3_organic_binding');
 validateV3DecisionRecords(run);
 validateV3ReplayRetrieval(run);
 if(!completed.some(t=>(t.outcome?.bids?.length??0)>=2))throw Error('v3_genuine_competition_required');
 const mobile=completed.find(t=>t.scenario?.id==='mobile');if(!mobile||mobile.outcome?.status!=='no_fill'||mobile.records.length!==0)throw Error('v3_mobile_no_fill');
 if(ex.charges.length!==3||ex.charges.reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n)>12000n)throw Error('v3_three_accepted_placements');
 for(const c of ex.charges){const a=ex.awards.find(a=>a.id===c.awardId),r=run.receipts.find(r=>r.chargeId===c.id),p=run.publishers.find(p=>p.publisherId===a?.publisherId);if(!a||!r||!p||c.channelId!==a.channelId||c.campaignVersionId!==a.campaignVersionId||c.amountBaseUnits!==a.priceBaseUnits||hash(r.receipt)!==c.receiptHash||r.receipt.creativeHash!==a.creativeHash||r.receipt.opportunityId!==a.opportunityId||r.receipt.awardId!==a.id||r.receipt.runId!==run.runId||r.receipt.mode!=='sandbox'||!verifyReceipt(r.receipt,r.signature,p.publicKeyPEM))throw Error('v3_delivery_correlation');}
 if(s.payments.length!==2||new Set(s.payments.map(p=>p.protocolChannelId)).size!==2)throw Error('v3_two_native_channels');
 for(const p of s.payments){const charges=ex.charges.filter(c=>c.channelId===p.channelId).sort((a,b)=>a.sequence-b.sequence),total=charges.reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n);if(p.openStatus!=='finalized'||p.closeStatus!=='finalized'||p.close?.status!=='finalized'||BigInt(p.depositBaseUnits)!==20000n||total>8000n||BigInt(p.authorizedBaseUnits)!==total||BigInt(p.settledBaseUnits)!==total||BigInt(p.refundBaseUnits)+total!==20000n)throw Error('v3_settlement_conservation');let cumulative=0n;if(p.vouchers.length!==charges.length)throw Error('v3_voucher_count');for(const [i,v]of p.vouchers.entries()){cumulative+=BigInt(charges[i].amountBaseUnits);if(v.chargeId!==charges[i].id||BigInt(v.cumulativeAmountBaseUnits)!==cumulative||!v.payloadHash||!['authorized','committed'].includes(v.status))throw Error('v3_voucher_correlation');}}
 if(!s.payments.some(p=>p.vouchers.length>=2))throw Error('v3_multiple_increments');
 const chain=run.chainEvidence;if(!chain?.allChecksPassed||chain.runId!==run.runId||chain.financialMode!=='sandbox'||chain.channels?.length!==2||BigInt(chain.grossFeeAndRentLamports)>20000000n||BigInt(chain.networkFeeLamports)+BigInt(chain.grossNewRentLamports)!==BigInt(chain.grossFeeAndRentLamports))throw Error('v3_chain_evidence_required');
 for(const p of s.payments){const c=chain.channels.find(c=>c.channelId===p.channelId);if(!c||c.protocolChannelId!==p.protocolChannelId||c.openSignature!==p.open.txSignature||c.closeSignature!==p.close.txSignature||c.depositBaseUnits!==p.depositBaseUnits||c.publisherPayoutBaseUnits!==p.settledBaseUnits||c.payerRefundBaseUnits!==p.refundBaseUnits||c.status!=='Distributed'||!c.escrowClosed||!c.transactionStatuses.every(s=>s?.confirmationStatus==='finalized'&&!s.err))throw Error('v3_chain_correlation');}
 if(!run.restart||run.restart.beforeHash!==run.restart.afterHash||run.restart.newCalls!==0||run.restart.newCharges!==0||run.restart.newSignatures!==0||run.restart.newBroadcasts!==0)throw Error('v3_restart_evidence');
 const text=JSON.stringify(run);if(/-----BEGIN .*PRIVATE KEY|apikey_[A-Za-z0-9_]{20,}|"(?:csrf|apiKey|privateKey|vector|wireBase64|unsignedWireBase64|secretKey|highestVoucherSignature)"\s*:/.test(text))throw Error('v3_private_material');return true;
}
export function writeV3Bundle(directory,run){run=sanitized(run);validateV3Run(run);mkdirSync(directory,{recursive:true});const bytes=Buffer.from(JSON.stringify(run,null,2));writeFileSync(join(directory,'run.json'),bytes);const manifest={schemaVersion:'axp.v3-manifest.v1',runId:run.runId,createdAt:new Date().toISOString(),financialMode:'sandbox',presentation:'recorded_evidence_replay',files:{'run.json':sha(bytes)}};writeFileSync(join(directory,'manifest.json'),JSON.stringify(manifest,null,2));return loadV3Bundle(directory);}
export function loadV3Bundle(directory){const bytes=readFileSync(join(directory,'manifest.json')),manifest=JSON.parse(bytes);if(manifest.schemaVersion!=='axp.v3-manifest.v1'||Object.keys(manifest.files).join()!=='run.json'||manifest.financialMode!=='sandbox')throw Error('v3_manifest_invalid');const raw=readFileSync(join(directory,'run.json'));if(sha(raw)!==manifest.files['run.json'])throw Error('v3_bundle_hash');const run=JSON.parse(raw);validateV3Run(run);if(run.runId!==manifest.runId)throw Error('v3_manifest_binding');return {run,manifest,bundleHash:sha(bytes)};}
