import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {createDecisionComparison} from '../../apps/backend/decisions.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {PHASE2_CASES,PHASE2_MANIFEST} from '../../packages/dsp/phase2-fixtures.mjs';
import {quantile} from '../../packages/ml/evaluation/metrics.mjs';
import {hash} from '../../packages/ml/core.mjs';
import {JEV_MAPPING_VERSION,JEV_QUESTION_VERSION} from '../../packages/ml/engines/jev.mjs';

const live=process.argv.includes('--live-jev');
if(process.argv.slice(2).some(x=>x!=='--live-jev'))throw new Error('unknown_argument');
const transport=live?createJevHttpTransport({apiKey:process.env.TYPESAFE_API_KEY,maxCalls:24}):null;
const service=createDecisionComparison({corpus:createCachedCorpus(),jevTransport:transport});
const results=[],attempts=[];
for(const task of PHASE2_CASES){
  const includeJev=live&&['booking','identity','erp','education'].includes(task.familyId)&&task.rep<2;
  const result=await service.compare({caseId:task.id,includeJev});results.push(result);attempts.push(...result.attempts);
}
const summaries=[];
for(const engine of [...new Set(attempts.map(a=>a.decision.engineProvenance.engine))]){
  const rows=attempts.filter(a=>a.decision.engineProvenance.engine===engine),latencies=rows.map(a=>a.decision.engineProvenance.elapsedMs);
  const valid=rows.filter(a=>a.decision.engineProvenance.outcome==='valid');
  const correct=rows.filter(a=>{const t=PHASE2_CASES.find(t=>t.id===a.caseId);return a.decision.decision===(t.expectedCampaign===a.campaignId?'bid':'skip');});
  const byCase=new Map();for(const a of rows){if(!byCase.has(a.caseId))byCase.set(a.caseId,[]);byCase.get(a.caseId).push(a);}
  const repeats=new Map();for(const [caseId,rs]of byCase){const family=PHASE2_CASES.find(t=>t.id===caseId).familyId;const signature=hash(rs.map(a=>[a.campaignId,a.decision.decision,a.decision.creativeVersionId,a.decision.relevanceLevel]));if(!repeats.has(family))repeats.set(family,[]);repeats.get(family).push(signature);}
  summaries.push({engine,attempted:rows.length,valid:valid.length,abstainedOrFailed:rows.length-valid.length,fixtureAssertionAgreement:correct.length/rows.length,notIndependentAccuracy:true,p50Ms:quantile(latencies,.5),p95Ms:quantile(latencies,.95),p99Ms:quantile(latencies,.99),candidateCount:3,throughput:null,throughputReason:'sequential_case_probe_not_load_benchmark',repeatedFamilyAgreement:[...repeats.values()].filter(xs=>new Set(xs).size===1).length/repeats.size,deadlineSuccess:Object.fromEntries([50,100,250,500].map(ms=>[`${ms}ms`,rows.filter(a=>a.decision.engineProvenance.outcome==='valid'&&a.decision.engineProvenance.elapsedMs<ms).length/rows.length])),cost:engine==='history_jev_v1'?transport.usage():{providerUsd:0,localComputeUsd:null}});
}
const sourcePaths=['packages/ml/engines/jev.mjs','packages/ml/engines/jev-http.mjs','packages/ml/engines/cached-history.mjs','packages/ml/profiles/cached.mjs','apps/backend/decisions.mjs','packages/dsp/phase2-fixtures.mjs'];
const result={schemaVersion:'phase2-benchmark.v1',executedAt:new Date().toISOString(),code:{mappingVersion:JEV_MAPPING_VERSION,questionVersion:JEV_QUESTION_VERSION,hashes:Object.fromEntries(sourcePaths.map(path=>[path,hash(readFileSync(path,'utf8'))]))},manifest:PHASE2_MANIFEST,results,summaries,liveModelExecuted:live,providerUsage:transport?.usage()??null,adoption:'inconclusive_keep_rules_default',limitations:['Fixture agreement is not historical held-out quality, causal lift or conversion prediction.',live?'Only 24 model calls across 8 authored tasks; local arms have 40 authored tasks.':'Local comparator only; zero provider calls.','Corpus lookup/preparation timings reported separately; engine-only latency is not total exchange latency.','Optional trained ML, small/large LLM arms unavailable; no invented comparisons.']};
const dir=join('local-state','phase2',randomUUID());mkdirSync(dir,{recursive:true,mode:0o700});
writeFileSync(join(dir,'result.json'),JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({artifact:join(dir,'result.json'),manifest:result.manifest,summaries,providerUsage:result.providerUsage,adoption:result.adoption},null,2));
