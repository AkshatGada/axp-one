import {resolve,join} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createV2Service} from '../../packages/v2/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {writeV2Bundle} from '../../packages/v2/bundle.mjs';
import {loadReplayBundle} from '../../packages/replay/bundle.mjs';
import {QUESTIONS} from '../../packages/v2/config.mjs';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'artifacts/v2'),retriever=loadEvidence({directory:join(out,'evidence')});
const service=createV2Service({stateDir:join(root,'local-state/v2-wallet'),retriever});
try{
 const state=service.state(),v1=loadReplayBundle(join(root,'artifacts/phase5/replay')),retrieval=[];
 for(let q=0;q<QUESTIONS.length;q++)for(const d of state.drafts)retrieval.push({questionIndex:q,campaignId:d.campaign.campaignId,result:await service.evidence(q,d.campaign.campaignId)});
 const db=new DatabaseSync(join(root,'local-state/v2-wallet/paired-harness.sqlite'),{readOnly:true});
 let callEvidence;try{const frozen=JSON.parse(db.prepare('SELECT data FROM paired_run').get().data);callEvidence={inputs:frozen.inputs,policy:frozen.policy,calls:db.prepare('SELECT data FROM paired_calls ORDER BY rowid').all().map(x=>{const r=JSON.parse(x.data);return {callId:r.callId,slot:r.slot,admitted:r.admitted,request:r.request,payload:r.payload};})};}finally{db.close();}
 const run={schemaVersion:'axp.v2-bundle-run.v1',runId:state.runId,createdAt:new Date().toISOString(),manifest:retriever.manifest,state,callEvidence,evidence:retriever.publicCatalogue(),retrieval,receipts:service.exchange.all('receipt_records'),publishers:service.exchange.all('publishers'),v1Payment:{...v1.run.chain,originalRunId:v1.run.runId,runId:v1.run.runId,originalFinancialMode:'sandbox',presentation:'separate-recorded-example',payment:v1.run.payment,bundleHash:v1.bundleHash},research:{claim:'AXP uses real conversational-ad observations and inferred targeting evidence to inform advertiser-agent placement decisions.',pairedDemonstrationOnly:true,supervisedTraining:false,embeddingGeneration:false,chatgptReplication:false}};
 const b=writeV2Bundle(join(out,'replay'),run);mkdirSync(join(out,'frontend'),{recursive:true});writeFileSync(join(out,'frontend/states.json'),JSON.stringify({schemaVersion:'axp.v2-fixtures.v1',recordedRunId:state.runId,actualRecordedState:state,syntheticExamples:[{state:'no_fill',provenance:'synthetic-test',charges:[]},{state:'failed_delivery',provenance:'synthetic-test',charges:[]},{state:'provider_unavailable',provenance:'synthetic-test',decision:'abstain',charges:[]}],financialMode:'synthetic'},null,2));
 console.log(JSON.stringify({runId:state.runId,bundleHash:b.bundleHash,charges:state.exchange.charges.length,model:state.model},null,2));
}finally{service.close();}
