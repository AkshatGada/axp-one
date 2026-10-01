import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {hash} from '../../packages/contracts/index.mjs';
import {createV2Service} from '../../packages/v2/service.mjs';
import {createV2Server} from '../../apps/backend/v2.mjs';
import {writeV2Bundle,loadV2Bundle} from '../../packages/v2/bundle.mjs';
import {CAMPAIGNS,QUESTIONS,mlCampaign} from '../../packages/v2/config.mjs';
import {jevResponse} from '../ml/fixtures.mjs';
export const fakeRetriever={manifest:{snapshotId:'fixture-v2',contentHash:hash('fixture')},publicCatalogue:()=>({records:[]}),retrieve(task,c){const content={schemaVersion:'retrieved-campaign-profile.v1',profileId:`fixture-${c.campaignId}`,campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,campaignContentHash:hash(c),snapshotId:'fixture-v2',snapshotContentHash:hash('fixture'),retrievalMethod:task===QUESTIONS[0]?'vector':'lexical_fallback',historyStatus:'ready',observedExamples:[{id:'fixture-observation',text:'Synthetic reference only; not a capability declaration.'}],contrastExamples:[],inferredHints:[]};return {method:content.retrievalMethod,fallback:content.retrievalMethod==='lexical_fallback',sourceHash:content.snapshotContentHash,examples:[{id:'fixture-observation'}],hints:[],profile:{...content,profileHash:hash(content)}};}};
function approve(service){for(const d of service.state().drafts)service.saveCampaign({campaignId:d.campaign.campaignId,businessName:d.businessName,creative:d.campaign.creatives[0].approvedText,contextHints:d.contextHints,approved:true});}
function fixtureCounter(){let calls=0;const transport=async p=>{calls++;assert.ok(!JSON.stringify(p).includes('budgetCapBaseUnits'));assert.equal(Object.keys(p.state).includes('campaigns'),false);return p.state.campaign.campaignId==='v2-leatherguard'?jevResponse(p,0,2,'no_fit'):jevResponse(p,p.state.campaign.campaignId==='v2-clearvault'?3:2,2);};return {transport,calls:()=>calls};}
test('V2 fresh paired decisions -> history-only auction -> receipts -> restart -> synthetic accounting -> offline replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'axp-v2-test-')),f=fixtureCounter();let s=createV2Service({stateDir:dir,retriever:fakeRetriever,transport:f.transport});
 try{
  assert.equal((await s.preview()).modelCalls,0);assert.equal(f.calls(),0);approve(s);await s.run();assert.equal(f.calls(),12);
  const state=s.state();assert.equal(state.completed.paired.length,12);assert.equal(state.exchange.opportunities.length,2);assert.equal(state.exchange.charges.length,0);
  assert.ok(state.completed.paired.filter(r=>r.arm==='history'&&r.campaignId==='v2-leatherguard').every(r=>r.decision.decision==='skip'));
  for(const a of state.exchange.awards){assert.equal(a.campaignId,'v2-clearvault');assert.throws(()=>s.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:false,creativeHash:a.creativeHash}));const receipt=s.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash});assert.equal(receipt.charge.amountBaseUnits,'3000');assert.equal(s.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash}).replayed,true);}
  const before=s.state().exchange.charges;s.close();s=createV2Service({stateDir:dir,retriever:fakeRetriever,transport:f.transport});await s.run();assert.equal(f.calls(),12);assert.deepEqual(s.state().exchange.charges,before);
  s.settle();const settled=s.state();assert.equal(settled.exchange.channels.find(c=>c.channelId==='v2-clearvault-channel').settledBaseUnits,'6000');assert.ok(settled.exchange.channels.filter(c=>c.channelId!=='v2-clearvault-channel').every(c=>c.settledBaseUnits==='0'));s.settle();assert.equal(s.state().exchange.charges.length,2);
  const db=new DatabaseSync(join(dir,'paired-harness.sqlite'),{readOnly:true}),frozen=JSON.parse(db.prepare('SELECT data FROM paired_run').get().data),callEvidence={inputs:frozen.inputs,policy:frozen.policy,calls:db.prepare('SELECT data FROM paired_calls ORDER BY rowid').all().map(x=>{const r=JSON.parse(x.data);return {callId:r.callId,slot:r.slot,admitted:r.admitted,request:r.request,payload:r.payload};})};db.close();
  const bundleDir=join(dir,'replay'),run={schemaVersion:'axp.v2-bundle-run.v1',runId:settled.runId,state:settled,callEvidence,manifest:fakeRetriever.manifest,evidence:fakeRetriever.publicCatalogue(),retrieval:[],receipts:s.exchange.all('receipt_records'),publishers:s.exchange.all('publishers'),v1Payment:{runId:'separate-v1',network:'sandbox'}};writeV2Bundle(bundleDir,run);assert.equal(loadV2Bundle(bundleDir).run.state.exchange.charges.length,2);
  const server=createV2Server({replayDirectory:bundleDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const url=`http://127.0.0.1:${server.address().port}`;assert.equal((await fetch(url+'/v2/state').then(r=>r.json())).presentation,'recorded-replay');for(const route of ['/v2/run','/v2/close','/v2/campaign','/v1/awards/x/render'])assert.equal((await fetch(url+route,{method:'POST'})).status,405);}finally{await new Promise(r=>server.close(r));}
 }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('provider failure and failed delivery add no accepted charge; originals retained',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'axp-v2-failure-'));const s=createV2Service({stateDir:dir,retriever:fakeRetriever,transport:async()=>{throw Error('fixture failure');}});
 try{approve(s);await s.run();assert.equal(s.state().exchange.charges.length,0);assert.ok(s.state().completed.paired.every(r=>r.decision.decision==='abstain'));assert.ok(s.state().completed.turns.every(t=>t.outcome.status==='no_fill'));await s.run();assert.equal(s.harness.status().admittedCalls,12);}finally{s.close();rmSync(dir,{recursive:true,force:true});}
 const d=mkdtempSync(join(tmpdir(),'axp-v2-delivery-')),f=fixtureCounter(),other=createV2Service({stateDir:d,retriever:fakeRetriever,transport:f.transport});try{approve(other);await other.run();for(const a of other.state().exchange.awards)other.fail(a.id);assert.equal(other.state().exchange.charges.length,0);other.settle();assert.ok(other.state().exchange.channels.every(c=>c.settledBaseUnits==='0'));}finally{other.close();rmSync(d,{recursive:true,force:true});}
});
