import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '../../packages/client/index.mjs';
import {buildOpenAPI,operations,schemas} from '../../packages/client/schema.mjs';
import {generatedFiles,generate} from '../../packages/client/generate.mjs';
import {validate} from '../../packages/client/validate.mjs';
import {fixtureFiles,loadFrontendFixtures,FIXTURE_IDS,build,buildFrontendFixtures} from '../../scripts/demo/build-frontend-fixtures.mjs';
import {createDemoServer} from '../../apps/backend/server.mjs';

const root=new URL('../../',import.meta.url);
const prompt='Find a hotel in Singapore near Marina Bay, solo traveller, free cancellation.';
const ack=award=>({domInserted:true,sponsoredLabelPresent:true,creativeHash:award.creativeHash});
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

test('single schema source generates checked-in OpenAPI 3.1 and DTOs deterministically',()=>{
  generate({check:true});assert.equal(buildOpenAPI().openapi,'3.1.0');
  assert.deepEqual(JSON.parse(generatedFiles()['openapi.json']),buildOpenAPI());
  for(const schema of Object.values(schemas))assert.ok(schema);
  assert.equal(buildOpenAPI().paths['/v1/campaigns'].post.responses['201'].content['application/json'].schema.$ref,'#/components/schemas/Campaign');
  for(const op of operations.filter(o=>o.method==='POST'))assert.deepEqual(buildOpenAPI().paths[op.path].post.security,[{LocalCSRF:[]}]);
  assert.equal(buildOpenAPI().paths['/v1/opportunities'],undefined);
  assert.equal(buildOpenAPI().paths['/v1/payment-sessions/prepare'],undefined);
});

test('runtime route inventory matches actual server, including regex routes, not planned APIs',()=>{
  const source=readFileSync(new URL('apps/backend/server.mjs',root),'utf8');
  const literal=[...source.matchAll(/path==='([^']+)'/g)].map(m=>m[1]);
  const expected=operations.filter(o=>o.surface==='runtime'&&!o.path.includes('{id}')).map(o=>o.path);
  assert.deepEqual(new Set(literal),new Set(expected));
  const patterns=['/v1/campaigns/{id}/pause','/v1/awards/{id}/render','/v1/awards/{id}/fail','/v1/synthetic-channels/{id}/authorize','/v1/synthetic-channels/{id}/close'];
  assert.deepEqual(operations.filter(o=>o.surface==='runtime'&&o.path.includes('{id}')).map(o=>o.path),patterns);
  assert.ok(source.includes('render|fail'));assert.ok(source.includes('authorize|close'));
});

test('nine sanitized cases: only saved awarded/finalized evidence is recorded_run',()=>{
  build({check:true});const bundle=loadFrontendFixtures();
  assert.deepEqual(bundle.fixtures.map(f=>f.id),FIXTURE_IDS);
  for(const f of bundle.fixtures){
    validate('FrontendFixture',f);
    assert.equal(f.sourceKind,['awarded','finalized'].includes(f.id)?'recorded_run':'synthetic_test');
    assert.equal(f.financialMode,f.sourceKind==='recorded_run'?'sandbox':'synthetic');
    if(f.sourceKind==='synthetic_test')assert.equal(f.source,null);
  }
  const encoded=Object.values(fixtureFiles()).join('\n');
  assert.doesNotMatch(encoded,/PRIVATE KEY|"(?:csrf|privateKey|secretKey|wireBase64|unsignedWireBase64|signature|renderTokenHash)"\s*:/);
  const recorded=JSON.parse(readFileSync(new URL('artifacts/phase4/connected-run.json',root)));
  const awarded=bundle.fixtures.find(f=>f.id==='awarded');
  assert.deepEqual(awarded.response,recorded.turns.find(t=>t.outcome.status==='awarded'));
  const final=bundle.fixtures.find(f=>f.id==='finalized').response;
  assert.equal(final.payment.settledBaseUnits,'6000');assert.equal(final.payment.refundBaseUnits,'14000');
  assert.deepEqual(final.correlations.map(c=>c.charge),recorded.exchange.charges);
  for(const c of final.correlations){assert.equal(c.receiptHash,c.charge.receiptHash);assert.equal(c.recordedOnReplay,true);}
  const competing=bundle.fixtures.find(f=>f.id==='competing_bids');
  assert.equal(competing.sourceKind,'synthetic_test');assert.equal(competing.source,null);
  assert.equal(competing.response.channels.length,2);assert.ok(competing.response.channels.every(c=>c.status==='open'&&c.depositBaseUnits==='20000'));
  validate('Outcome',competing.response.outcome);assert.equal(competing.response.outcome.bids.length,2);assert.equal(competing.response.charges.length,0);
});

test('validator rejects invalid mode, float/negative/overflow amounts and unknown write fields',()=>{
  for(const v of [1,-1,'1.5','-1','01','18446744073709551616'])assert.throws(()=>validate('AmountBaseUnits',v));
  assert.equal(validate('AmountBaseUnits','18446744073709551615'),'18446744073709551615');
  assert.throws(()=>validate('FinancialMode','recorded_evidence_replay'));
  assert.throws(()=>validate('TurnRequest',{prompt,pay:true}));
  assert.throws(()=>validate('ReplayBootstrap',{schemaVersion:'axp.replay.v1',presentationKind:'recorded_evidence_replay',financialMode:'devnet',runId:'test',originalRecordedAt:'test',readOnly:true,bundleHash:'test',steps:[]}));
});

test('fixture generator fails closed if extensible source metadata contains private fields',()=>{
  const connectedRun=JSON.parse(readFileSync(new URL('artifacts/phase4/connected-run.json',root)));
  const paymentState=JSON.parse(readFileSync(new URL('artifacts/phase4/payment-state.json',root)));
  connectedRun.turns.find(t=>t.outcome.status==='awarded').organic.privateKey='test-only-placeholder';
  assert.throws(()=>buildFrontendFixtures({connectedRun,paymentState,sourceHashes:{}}),/private_fixture_field:privateKey/);
});

test('replay refuses all browser writes before fetch, including nonfinancial POST',async()=>{
  let calls=0;const client=createClient({baseURL:'http://127.0.0.1:8788',fetch:async()=>{calls++;return json({});}});
  for(const op of operations.filter(o=>o.name&&o.method==='POST'))await assert.rejects(client[op.name]('id',{}),{code:'replay_read_only'});
  assert.equal(calls,0);
  for(const payment of ['authorize','close','authorizeSynthetic','closeSynthetic','prepareOpen','sign','wallet'])assert.equal(client[payment],undefined);
});

test('local-only transport requires explicit runtime bootstrap and never retries errors',async()=>{
  for(const baseURL of ['https://127.0.0.1:8788','http://external.example','http://user:pass@localhost:8788','http://localhost:8788/redirect','http://localhost:8788/?token=secret'])assert.throws(()=>createClient({baseURL}),{code:'local_origin_required'});
  const calls=[];const client=createClient({baseURL:'http://localhost:8788',surface:'runtime',fetch:async(url,options)=>{calls.push({url,options});return url.endsWith('/bootstrap')?json({csrf:'fake-local-token'}):new Response('{"error":"turn_pending"}',{status:409});}});
  await assert.rejects(client.turn({prompt}),{code:'bootstrap_required'});assert.equal(calls.length,0);
  await client.bootstrap();await assert.rejects(client.pauseCampaign('id/with space'),{code:'turn_pending',status:409});
  assert.equal(calls.length,2);assert.match(calls[1].url,/id%2Fwith%20space\/pause$/);
  assert.equal(calls[1].options.headers['x-axp-csrf'],'fake-local-token');assert.equal(calls[1].options.redirect,'error');
  await assert.rejects(client.replayRun(),{code:'client_surface_mismatch'});assert.equal(calls.length,2);
});

test('fake fetch exercises fixed replay seam and extensible projection without exact nested schema claims',async()=>{
  const bootstrap={schemaVersion:'axp.replay.v1',presentationKind:'recorded_evidence_replay',financialMode:'sandbox',runId:'recorded',originalRecordedAt:'2026-10-01T08:50:22.885Z',readOnly:true,bundleHash:'original-hash',steps:[{id:'delivery',title:'Delivery'}]};
  const projection=Object.fromEntries(['campaigns','turns','evidence','decisions','deliveries','payment','chain','restart','research','limitations'].map(k=>[k,[]]));projection.extension={originalHash:'retained'};
  const client=createClient({baseURL:'http://localhost:8790',fetch:async url=>json(url.endsWith('/bootstrap')?bootstrap:url.endsWith('/run')?projection:loadFrontendFixtures())});
  validate('ReplayBootstrap',await client.replayBootstrap());validate('ReplayRun',await client.replayRun());
  assert.equal((await client.replayRun()).extension.originalHash,'retained');assert.equal((await client.replayFixtures()).fixtures.length,9);
});

test('finite fetch replay sends Last-Event-ID and keeps original event timestamps, with no retry',async()=>{
  let calls=0;const client=createClient({baseURL:'http://localhost:8790',fetch:async(url,options)=>{
    calls++;assert.equal(options.headers['Last-Event-ID'],'7');
    return new Response(': original stream\r\nid: 8\r\ndata: {"seq":8,"at":1790843277739,"type":"original","data":{}}\r\n\r\n');
  }});
  assert.deepEqual(await client.replayEvents('7'),[{id:'8',event:'message',data:{seq:8,at:1790843277739,type:'original',data:{}}}]);assert.equal(calls,1);
});

test('EventSource closes finite replay on EOF/error; runtime retains native reconnect/reset semantics',()=>{
  class FakeEventSource {constructor(url){this.url=url;this.listeners={};this.closed=false;}addEventListener(name,fn){this.listeners[name]=fn;}close(){this.closed=true;}}
  const received=[];const replay=createClient({baseURL:'http://localhost:8790',EventSource:FakeEventSource}).openEvents({onEvent:e=>received.push(e)});
  replay.onmessage({data:'{"seq":1}'});replay.onerror({});assert.equal(replay.closed,true);assert.deepEqual(received,[{seq:1}]);
  let resets=0;const runtime=createClient({baseURL:'http://localhost:8788',surface:'runtime',EventSource:FakeEventSource}).openEvents({onEvent(){},onReset(){resets++;}});
  runtime.listeners.reset();runtime.onerror({});assert.equal(runtime.closed,false);assert.equal(resets,1);runtime.close();
});

async function setup(t,options={}) {
  const directory=mkdtempSync(join(tmpdir(),'axp-frontend-contracts-'));
  const server=createDemoServer({stateDir:directory,runId:'frontend-offline-contract',...options});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(directory,{recursive:true,force:true});});
  const baseURL=`http://127.0.0.1:${server.address().port}`;
  return {server,baseURL,client:createClient({baseURL,surface:'runtime'})};
}

test('actual isolated synthetic server responses match generated contracts across runtime routes',async t=>{
  const {client,baseURL}=await setup(t);
  validate('Health',await client.health());validate('RuntimeBootstrap',await client.bootstrap());
  validate('RuntimeState',await client.state());validate('Cases',await client.decisionCases());validate('JsonObject',await client.recordedDecisions());
  validate('EvidenceResult',await client.lookupEvidence({prompt}));
  const cases=await client.decisionCases();validate('ComparisonResult',await client.compareDecisions({caseId:cases.cases[0].id}));
  const first=validate('TurnResult',await client.turn({prompt,engine:'rules',turnId:'one'}));
  assert.equal(first.outcome.status,'awarded');const award=first.outcome.award;
  const delivery=validate('DeliveryResult',await client.acknowledgeRender(award.id,ack(award)));assert.equal(delivery.replayed,false);
  assert.equal(validate('DeliveryResult',await client.acknowledgeRender(award.id,ack(award))).replayed,true);
  validate('RecordedResults',await client.results());validate('RuntimeState',await client.state());
  const failure=validate('TurnResult',await client.turn({prompt,turnId:'failure'}));validate('Award',await client.failAward(failure.outcome.award.id));
  const nofill=validate('TurnResult',await client.turn({prompt:'Explain what a hotel is.',turnId:'no-fill'}));assert.equal(nofill.outcome.status,'no_fill');
  const campaign=(await client.state()).campaigns[0];validate('Campaign',await client.createCampaign({...campaign,campaignVersionId:'frontend-new-version'}));validate('Campaign',await client.pauseCampaign(campaign.campaignId));
  // These are server-only synthetic fixture operations, never browser methods.
  const csrf=(await client.bootstrap()).csrf;
  for(const action of ['authorize','close']){
    const response=await fetch(`${baseURL}/v1/synthetic-channels/${award.channelId}/${action}`,{method:'POST',headers:{'x-axp-csrf':csrf,'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,200);validate('Channel',await response.json());
  }
  await assert.rejects(client.recoverOrganic({turnId:'one',randomSessionId:'demo-session'}),{code:'app_bridge_required'});
  await assert.rejects(client.turn({prompt,pay:true}),{status:400,code:'unknown_field'});
  const forbidden=await fetch(baseURL+'/v1/demo/reset',{method:'POST',body:'{}'});assert.equal(forbidden.status,403);validate('Error',await forbidden.json());
  const controller=new AbortController();const stream=await fetch(baseURL+'/v1/events',{headers:{'Last-Event-ID':'0'},signal:controller.signal});
  const reader=stream.body.getReader();const chunk=await reader.read();const frames=new TextDecoder().decode(chunk.value).split('\n\n').filter(x=>x.startsWith('id:'));
  for(const frame of frames)validate('RuntimeEvent',JSON.parse(frame.split('\ndata: ')[1]));controller.abort();await reader.cancel().catch(()=>{});
  validate('ResetResult',await client.reset());
});

test('frozen connected configuration is a runtime conflict, not a silently supported campaign/reset action',async t=>{
  const {client}=await setup(t,{demoMetadata:{phase:'phase4',organicRuntime:'app-bridge'}});await client.bootstrap();
  await assert.rejects(client.reset(),{code:'phase3_frozen_configuration',status:409});
  const campaign=(await client.state()).campaigns[0];await assert.rejects(client.createCampaign(campaign),{code:'phase3_frozen_configuration',status:409});
});
