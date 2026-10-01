import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {createDecisionComparison} from '../../apps/backend/decisions.mjs';
import {createDemoServer} from '../../apps/backend/server.mjs';
import {PHASE2_SEED} from '../../packages/dsp/phase2-fixtures.mjs';

const digest=text=>createHash('sha256').update(text.toLowerCase().trim().replace(/\s+/gu,' ')).digest('hex');
function fixtureCorpus({miss=false,unapprovedOnly=false}={}) {
  return createCachedCorpus({query:async()=>{
    // Query receives a pre-rendered fixed statement rather than arbitrary fields.
    return {database:'ads',readOnly:true,model:'BAAI/bge-base-en-v1.5',dimension:768,queryTextHash:digest(PHASE2_SEED),queryVectorId:miss?null:10,matches:miss?[]:[{promptId:20,promptText:PHASE2_SEED,promptVectorId:11,similarity:1,mappings:[
      {mappingId:30,creativeId:unapprovedOnly?99999:26176,advertiser:'Navan',creativeText:'Observed corporate travel tools',creativeVectorId:12,hint:null},
      {mappingId:31,creativeId:7668,advertiser:'Auth0',creativeText:'Observed agent authentication',creativeVectorId:13,hint:null},
      {mappingId:32,creativeId:3422,advertiser:'Software Connect',creativeText:'Observed hotel ERP selection',creativeVectorId:14,hint:null},
    ]}]};
  }});
}

test('comparison binds three fictional profiles and produces advisory decisions, not auction writes',async()=>{
  const service=createDecisionComparison({corpus:fixtureCorpus()});
  const result=await service.compare({caseId:'booking_cache-0'});
  assert.equal(result.preparationError,null);assert.equal(result.mode,'nonfinancial_comparison');
  assert.equal(result.profiles.length,3);assert.equal(result.attempts.length,6);
  assert.equal(result.profiles.find(p=>p.campaignId==='tripdesk').observedExamples[0].advertiser,'Navan');
  for(const engine of ['rules_v1','cached_history_v1']){
    const rows=result.attempts.filter(a=>a.decision.engineProvenance.engine===engine);
    assert.equal(rows.length,3);assert.equal(rows.find(a=>a.campaignId==='tripdesk').decision.decision,'bid');
    assert.equal(rows.find(a=>a.campaignId==='agentpass').decision.decision,'skip');
    assert.equal(rows.find(a=>a.campaignId==='hotelops').decision.decision,'skip');
  }
  assert.equal(result.providerUsage,null);assert.equal(result.caseManifest.historicalHeldOut,false);
  assert.ok(!('award' in result));assert.ok(!('charge' in result));
});
test('same-brand unapproved creative is not admitted into a frozen advertiser profile',async()=>{
  const result=await createDecisionComparison({corpus:fixtureCorpus({unapprovedOnly:true})}).compare({caseId:'booking_cache-0'});
  const p=result.profiles.find(p=>p.campaignId==='tripdesk');
  assert.deepEqual(p.sourceCreativeIds,[]);assert.deepEqual(p.observedExamples,[]);
  assert.equal(p.historyStatus,'unavailable');
  assert.equal(result.attempts.find(a=>a.campaignId==='tripdesk'&&a.decision.engineProvenance.engine==='cached_history_v1').decision.decision,'abstain');
});
test('source failure or a cache miss remains explicit while local rules remain available',async()=>{
  for(const corpus of [null,fixtureCorpus({miss:true})]){
    const result=await createDecisionComparison({corpus}).compare({caseId:'booking_cache-0'});
    const cached=result.attempts.filter(a=>a.decision.engineProvenance.engine==='cached_history_v1');
    assert.ok(cached.every(a=>a.decision.decision==='abstain'));
    assert.equal(result.attempts.find(a=>a.campaignId==='tripdesk'&&a.decision.engineProvenance.engine==='rules_v1').decision.decision,'bid');
  }
  await assert.rejects(createDecisionComparison().compare({caseId:'invented'}),{code:'case_unavailable'});
});
test('HTTP comparison rejects provider spending and leaves the exchange ledger untouched',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'axp-decision-http-'));
  const server=createDemoServer({stateDir:dir,corpus:fixtureCorpus()});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const bootstrap=await(await fetch(origin+'/v1/bootstrap')).json();
  const cases=await(await fetch(origin+'/v1/decisions/cases')).json();
  assert.equal(cases.cases.length,10);assert.equal(cases.liveEnabled,false);
  const recorded=await(await fetch(origin+'/v1/decisions/recorded')).json();
  assert.equal(recorded.mode,'recorded_comparison_not_live_execution');
  assert.equal(recorded.initialComparison.jev.valid,0);assert.equal(recorded.totalProviderUsage.calls,28);
  const before=server.getSession().exchange.report();
  const post=body=>fetch(origin+'/v1/decisions/compare',{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':bootstrap.csrf},body:JSON.stringify(body)});
  const denied=await post({caseId:'booking_cache-0',includeJev:true});assert.equal(denied.status,400);
  const comparison=await post({caseId:'booking_cache-0'});assert.equal(comparison.status,200);
  assert.equal((await comparison.json()).attempts.length,6);
  assert.deepEqual(server.getSession().exchange.report(),before);
});
test('public recorded summary reconciles to actual saved attempts when local evidence is present',()=>{
  const summary=JSON.parse(readFileSync(new URL('../../artifacts/phase2/summary.json',import.meta.url),'utf8'));
  if(!existsSync(summary.initialComparison.artifact))return;
  const initial=JSON.parse(readFileSync(summary.initialComparison.artifact,'utf8'));
  assert.equal(summary.initialComparison.caseHash,initial.manifest.caseHash);
  const jev=initial.summaries.find(s=>s.engine==='history_jev_v1');
  assert.equal(jev.valid,summary.initialComparison.jev.valid);
  assert.equal(jev.attempted,summary.initialComparison.jev.actualProviderCalls);
  for(const recorded of summary.diagnosticCorrection.successfulDecisions){
    const actual=JSON.parse(readFileSync(recorded.artifact,'utf8'));
    for(const key of ['caseId','campaignId'])assert.equal(recorded[key],actual[key]);
    for(const key of ['decision','relevanceLevel','commercialIntentLevel','creativeVersionId'])assert.equal(recorded[key],actual.decision[key]);
    assert.equal(recorded.profileHash,actual.decision.engineProvenance.profileHash);
    assert.equal(recorded.engineElapsedMs,actual.decision.engineProvenance.elapsedMs);
  }
  const probes=readdirSync('local-state/phase2/probes').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(join('local-state/phase2/probes',f),'utf8')));
  assert.equal(probes.length,4);
  const allUsage=[initial.providerUsage,...probes.map(p=>p.usage)];
  assert.equal(summary.totalProviderUsage.calls,allUsage.reduce((n,u)=>n+u.attempts,0));
  assert.equal(summary.totalProviderUsage.inputTokens,allUsage.reduce((n,u)=>n+u.inputTokens,0));
  assert.equal(summary.totalProviderUsage.outputTokens,allUsage.reduce((n,u)=>n+u.outputTokens,0));
  assert.ok(Math.abs(summary.totalProviderUsage.estimatedUsd-allUsage.reduce((n,u)=>n+u.estimatedProviderUsd,0))<1e-12);
});
test('live opt-in: real DB-backed profile and cached decisions preserve exchange state',{skip:process.env.AXP_CACHED_CORPUS_LIVE!=='1',timeout:30000},async()=>{
  const result=await createDecisionComparison({corpus:createCachedCorpus()}).compare({caseId:'booking_cache-0'});
  assert.equal(result.preparationError,null);assert.equal(result.profiles.length,3);
  assert.ok(result.profiles.every(p=>p.historyStatus==='ready'));
  const cached=result.attempts.filter(a=>a.decision.engineProvenance.engine==='cached_history_v1');
  assert.equal(cached.length,3);assert.ok(cached.every(a=>a.decision.engineProvenance.outcome==='valid'));
  assert.equal(cached.find(a=>a.campaignId==='tripdesk').decision.decision,'bid');
  assert.ok(cached.filter(a=>a.campaignId!=='tripdesk').every(a=>a.decision.decision==='skip'));
});
