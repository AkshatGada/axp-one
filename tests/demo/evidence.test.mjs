import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEvidenceService} from '../../apps/backend/evidence.mjs';
import {createDemoServer} from '../../apps/backend/server.mjs';

const packet=()=>({schemaVersion:'cached-corpus-result.v1',status:'ready',provenance:{database:'ads',readOnly:true,model:'BAAI/bge-base-en-v1.5',dimension:768,revision:'unrecorded',queryVectorId:42,queryTextHash:'hash',secret:'must-not-escape'},matches:[{promptId:12,promptText:'Hotel booking automation',similarity:.8,vector:[1,2],mappings:[{mappingId:9,creativeId:4,advertiser:'Historical Example',creativeText:'Smart booking.',hint:{id:3,text:'Travel booking tasks',tier:'sparse',modelVersion:'recorded-v1',reconstructionAuc:.7},privateField:'must-not-escape'}]}]});
test('unconfigured source remains unavailable; private or unknown inputs never query',async()=>{
  assert.equal((await createEvidenceService().lookup({prompt:'Hotel booking'})).status,'source_unconfigured');
  let calls=0;const service=createEvidenceService({corpus:{lookup:async()=>{calls++;return packet();}}});
  await assert.rejects(service.lookup({prompt:'Contact private@example.com'}),{code:'background_prompt_required'});
  await assert.rejects(service.lookup({prompt:'Hotel booking',generate:true}),{code:'unknown_field'});assert.equal(calls,0);
});
test('public projection contains provenance and inferred hints, not vectors or arbitrary fields',async()=>{
  const service=createEvidenceService({corpus:{lookup:async(_,options)=>{assert.equal(options.limit,5);assert.ok(options.signal);return packet();}}});
  const r=await service.lookup({prompt:'Hotel booking'});assert.equal(r.provenance.readOnly,true);assert.equal(r.matches[0].mappings[0].hint.semantics,'inferred_targeting_not_advertiser_configuration');
  assert.ok(!JSON.stringify(r).includes('must-not-escape'));assert.ok(!('vector' in r.matches[0]));
});
test('cache miss and source failure do not invent matches or export transport errors',async()=>{
  const missed=packet();missed.status='query_vector_unavailable';missed.matches=[];
  assert.equal((await createEvidenceService({corpus:{lookup:async()=>missed}}).lookup({prompt:'A new prompt'})).matches.length,0);
  await assert.rejects(createEvidenceService({corpus:{lookup:async()=>{throw new Error('PRIVATE KEY or connection details');}}}).lookup({prompt:'Hotel booking'}),{code:'corpus_unavailable'});
  const changed=packet();changed.provenance.readOnly=false;
  await assert.rejects(createEvidenceService({corpus:{lookup:async()=>changed}}).lookup({prompt:'Hotel booking'}),{code:'corpus_response_invalid'});
  const mixed=packet();mixed.provenance.dimension=384;
  await assert.rejects(createEvidenceService({corpus:{lookup:async()=>mixed}}).lookup({prompt:'Hotel booking'}),{code:'corpus_response_invalid'});
  const invented=packet();invented.status='query_vector_unavailable';
  await assert.rejects(createEvidenceService({corpus:{lookup:async()=>invented}}).lookup({prompt:'Hotel booking'}),{code:'corpus_response_invalid'});
});
test('HTTP evidence lookup is nonfinancial and keeps source off the organic-answer path',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'axp-evidence-http-'));let reads=0;
  const server=createDemoServer({stateDir:dir,corpus:{lookup:async()=>{reads++;return packet();}}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`,bootstrap=await(await fetch(origin+'/v1/bootstrap')).json();assert.equal(bootstrap.evidenceSource.enabled,true);
  const before=server.getSession().exchange.report();
  const response=await fetch(origin+'/v1/evidence/lookup',{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':bootstrap.csrf},body:JSON.stringify({prompt:'Hotel booking'})});
  assert.equal(response.status,200);assert.equal((await response.json()).status,'ready');assert.equal(reads,1);assert.deepEqual(server.getSession().exchange.report(),before);
  await server.getSession().turn({prompt:'Find a Singapore hotel',turnId:'separate'});assert.equal(reads,1);
});
test('live opt-in: cached source through HTTP and explicit miss leave exchange unchanged',{skip:process.env.AXP_CACHED_CORPUS_LIVE!=='1',timeout:30000},async t=>{
  const {createCachedCorpus}=await import('../../packages/ml/data_adapter/cached-corpus.mjs');
  const dir=mkdtempSync(join(tmpdir(),'axp-evidence-live-'));
  const server=createDemoServer({stateDir:dir,corpus:createCachedCorpus()});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`,bootstrap=await(await fetch(origin+'/v1/bootstrap')).json();
  const before=server.getSession().exchange.report();
  const lookup=async prompt=>{
    const r=await fetch(origin+'/v1/evidence/lookup',{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':bootstrap.csrf},body:JSON.stringify({prompt})});
    assert.equal(r.status,200);return r.json();
  };
  const hit=await lookup('AI agent travel booking automation');assert.equal(hit.status,'ready');assert.ok(hit.matches.length);assert.equal(hit.provenance.embeddingCalls,0);assert.ok(hit.provenance.sourceVectors.length);
  assert.ok(hit.matches.some(m=>m.mappings.some(a=>a.hint!==null)));
  const miss=await lookup(`AXP deliberately uncached live HTTP ${crypto.randomUUID()}`);assert.equal(miss.status,'query_vector_unavailable');assert.deepEqual(miss.matches,[]);
  assert.deepEqual(server.getSession().exchange.report(),before);
});
