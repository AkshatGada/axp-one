import {randomUUID} from 'node:crypto';
import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {hash} from '../../packages/ml/core.mjs';
import {RuleDecisionEngine} from '../../packages/ml/engines/rules.mjs';
import {JevDecisionEngine} from '../../packages/ml/engines/jev.mjs';
import {JEV_MODEL} from '../../packages/ml/engines/jev-http.mjs';
import {buildCachedCampaignProfile} from '../../packages/ml/profiles/cached.mjs';
import {CachedHistoryDecisionEngine} from '../../packages/ml/engines/cached-history.mjs';
import {PHASE2_SEED,PHASE2_CAMPAIGNS,PHASE2_SELECTIONS,PHASE2_CASES,PHASE2_MANIFEST} from '../../packages/dsp/phase2-fixtures.mjs';

export function createDecisionComparison({corpus=null,jevTransport=null,now=Date.now}={}) {
  let preparing=null;
  const lookupCache=new Map();
  const lookupEvents=[];
  async function lookup(text,{signal}={}) {
    if(!corpus)throw new ContractError('corpus_unavailable');
    const started=performance.now(),cached=lookupCache.has(text);
    if(!cached){
      const result=await corpus.lookup(text,{limit:5,signal});
      lookupCache.set(text,result);
    }
    lookupEvents.push({queryHash:hash(text),cache:cached?'axp_run_memory':'source_db',elapsedMs:performance.now()-started,status:lookupCache.get(text).status});
    return lookupCache.get(text);
  }
  async function prepare() {
    if(!preparing)preparing=(async()=>{
      const evidence=await lookup(PHASE2_SEED);
      const profiles=new Map();
      for(const c of PHASE2_CAMPAIGNS){
        const selection=PHASE2_SELECTIONS[c.campaignId];
        const ids=[...new Set(evidence.matches.flatMap(p=>p.mappings.filter(a=>selection.sourceCreativeIds.includes(a.creativeId)&&a.advertiser===selection.advertiser).map(a=>a.creativeId)))].slice(0,5);
        profiles.set(c.campaignId,buildCachedCampaignProfile(c,{approvedTargetingText:selection.target,selectedCreativeIds:ids},evidence));
      }
      return profiles;
    })().catch(e=>{preparing=null;throw e;});
    return preparing;
  }
  async function compare(input) {
    strictObject(input,['caseId','includeJev'],['caseId']);
    const task=PHASE2_CASES.find(c=>c.id===input.caseId);
    if(!task)throw new ContractError('case_unavailable');
    if(input.includeJev!==undefined&&typeof input.includeJev!=='boolean')throw new ContractError('invalid_live_option');
    const started=performance.now(),runId=`comparison-${randomUUID()}`,lookupStart=lookupEvents.length;
    let profiles=null,preparationError=null;
    try{profiles=await prepare();}catch{preparationError='cached_source_unavailable';}
    const preparationElapsedMs=performance.now()-started;
    const attempts=[];
    for(const campaign of PHASE2_CAMPAIGNS){
      const profile=profiles?.get(campaign.campaignId)??null;
      const request={schemaVersion:'decision-request.v1',runId,mode:'synthetic',opportunity:{id:`task-${task.id}`,coarseIntent:task.coarseIntent,destination:null,taskConstraints:{requiredCapabilities:task.requiredCapabilities},softPreferences:[],taskText:task.prompt},campaign,profile,options:{deadlineAt:new Date(now()+12000).toISOString(),rubricVersion:'fit-intent-v1',engineConfigVersion:'phase2-cached-v1'}};
      const engines=[new RuleDecisionEngine({now}),new CachedHistoryDecisionEngine({lookup,now})];
      if(input.includeJev)engines.push(new JevDecisionEngine({transport:jevTransport,model:JEV_MODEL,liveAuthorized:!!jevTransport,transportMode:'live',now}));
      for(const engine of engines){
        // Deadlines cover this actual invocation, not earlier sequential engines.
        request.options.deadlineAt=new Date(now()+12000).toISOString();
        const decision=await engine.scoreOpportunity(request);
        attempts.push({caseId:task.id,campaignId:campaign.campaignId,eligible:true,decision});
      }
    }
    return {schemaVersion:'phase2-comparison.v1',runId,mode:'nonfinancial_comparison',task,caseManifest:PHASE2_MANIFEST,preparationElapsedMs,totalElapsedMs:performance.now()-started,preparationError,lookupEvents:lookupEvents.slice(lookupStart),profiles:profiles?[...profiles.values()]:[],attempts,providerUsage:jevTransport?.usage?.()??null,limitations:['All campaigns fictional; source brands are historical evidence only.','Fixture assertions are not human-reviewed historical fit labels.','Cached-history is an association heuristic, not trained ranking or conversion prediction.','No auction, reservation, delivery or payment is triggered.','Uncached query remains unavailable; no new embeddings generated.']};
  }
  return {compare,prepare,get sourceEnabled(){return corpus!==null;},get liveEnabled(){return jevTransport!==null;},cases:PHASE2_CASES,manifest:PHASE2_MANIFEST};
}
