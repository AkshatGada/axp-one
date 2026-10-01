import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {createDecisionComparison} from '../../apps/backend/decisions.mjs';
import {createJevHttpTransport,JEV_MODEL} from '../../packages/ml/engines/jev-http.mjs';
import {buildJevRequest,validateJevResponse,JevDecisionEngine,JEV_MAPPING_VERSION,JEV_QUESTION_VERSION} from '../../packages/ml/engines/jev.mjs';
import {PHASE2_CASES,PHASE2_CAMPAIGNS} from '../../packages/dsp/phase2-fixtures.mjs';

// One explicit diagnostic per invocation, at most four total in this phase.
const [caseId,campaignId]=process.argv.slice(2);
if(process.argv.length!==4)throw new Error('expected_case_and_campaign');
const task=PHASE2_CASES.find(c=>c.id===caseId),campaign=PHASE2_CAMPAIGNS.find(c=>c.campaignId===campaignId);
if(!task||!campaign)throw new Error('frozen_case_required');
const root='local-state/phase2/probes';mkdirSync(root,{recursive:true,mode:0o700});
if(readdirSync(root).filter(x=>x.endsWith('.json')).length>=4)throw new Error('phase2_probe_limit');
const path=join(root,`${randomUUID()}.json`);
// Reserve the call slot before any provider invocation; no automatic retries.
writeFileSync(path,JSON.stringify({status:'reserved',caseId,campaignId}),{mode:0o600});
const profiles=await createDecisionComparison({corpus:createCachedCorpus()}).prepare();
const request={schemaVersion:'decision-request.v1',runId:'phase2-diagnostic',mode:'synthetic',opportunity:{id:`task-${task.id}`,coarseIntent:task.coarseIntent,destination:null,taskConstraints:{requiredCapabilities:task.requiredCapabilities},softPreferences:[],taskText:task.prompt},campaign,profile:profiles.get(campaignId),options:{deadlineAt:new Date(Date.now()+12000).toISOString(),rubricVersion:'fit-intent-v1',engineConfigVersion:'phase2-diagnostic-v1'}};
const payload=buildJevRequest(request,JEV_MODEL);
const transport=createJevHttpTransport({apiKey:process.env.TYPESAFE_API_KEY,maxCalls:1});
const started=performance.now();
let response=null,validated=null,error=null;
const observedTransport=async(...args)=>{response=await transport(...args);return response;};
const decision=await new JevDecisionEngine({transport:observedTransport,model:JEV_MODEL,liveAuthorized:true}).scoreOpportunity(request);
try{if(response)validated=validateJevResponse(response,payload);}catch(e){error=e.code??'transport_error';}
const result={schemaVersion:'phase2-probe.v1',caseId,campaignId,payload,response,validated,decision,error,elapsedMs:performance.now()-started,usage:transport.usage(),mappingVersion:JEV_MAPPING_VERSION,questionVersion:JEV_QUESTION_VERSION,executedAt:new Date().toISOString()};
writeFileSync(path,JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({artifact:path,caseId,campaignId,response,validated,decision,error,elapsedMs:result.elapsedMs,usage:result.usage},null,2));
