import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FixtureAnswerProvider} from '../answer-provider.js';
import {AXPPublisher} from '@axp/publisher-sdk';
import {sampleAward,sampleReceipt} from './dom.js';
import {start,connect,draft,submit,settled,renderBody} from './helpers.js';
function exchange(overrides={}) {
  const award=sampleAward();let requests=0,renders=0,lookups=0;
  return {award,get requests(){return requests;},get renders(){return renders;},get lookups(){return lookups;},
    async requestAd(){requests++;return {status:'awarded',opportunityId:'fixture-opportunity',award,deliveryToken:'fixture-token',financialMode:'synthetic',trace:{privateBuyerContext:'AD_CONTEXT_SENTINEL'}};},
    async lookupOpportunity(){lookups++;return {schemaVersion:'publisher-opportunity-status.v1',status:'unknown'};},
    async lookupDelivery(){lookups++;return {schemaVersion:'publisher-award-status.v1',awardId:award.id,financialMode:'synthetic',status:'reserved',expiresAt:award.expiresAt};},
    async acknowledgeRender(){renders++;return sampleReceipt(award);},...overrides};
}
test('fixture source remains byte-for-byte baseline; provider contract is unchanged',async()=> {
  assert.deepEqual(await readFile(new URL('../answer-provider.js',import.meta.url)),await readFile(new URL('../../../sdk-cleanroom/baseline-app/answer-provider.js',import.meta.url)));
  const p=new FixtureAnswerProvider(),messages=[{role:'user',content:'Hello'}];
  const first=await p.answer({messages});assert.equal(first,await p.answer({messages}));
  assert.match(await p.answer({messages:[...messages,{role:'assistant',content:first},{role:'user',content:'Next'}]}),/previous message was: “Hello”/);
});
test('sharing off and overlong consented question make zero ad requests; organic history server-owned',async t=> {
  const publisher=exchange(),inputs=[];
  const client=await start(t,{publisher,provider:{async answer(input){inputs.push(input);return 'Independent fixture answer';}}});
  assert.equal((await submit(client,draft({content:'Hello',consent:false}))).adState,'sharing_off');
  assert.equal((await submit(client,draft({content:'x'.repeat(1201)}))).adState,'question_too_long');
  assert.equal(publisher.requests,0);assert.equal(inputs[1].messages.length,3);
  assert.ok(!JSON.stringify(inputs).includes('AD_CONTEXT_SENTINEL'));
});
test('answer completes while ad remains blocked; no ad data enters subsequent organic input',async t=> {
  let release;const gate=new Promise(r=>release=r),publisher=exchange(),original=publisher.requestAd,inputs=[];
  publisher.requestAd=async()=>{await gate;return original();};
  const client=await start(t,{publisher,provider:{async answer(value){inputs.push(value);return 'Independent answer';}}});
  const turn=await submit(client);assert.equal(turn.adState,'requesting');assert.equal(turn.answer,'Independent answer');
  release();await client.server.appIdle();await submit(client,draft({content:'Follow up',consent:false}));
  assert.deepEqual(inputs[1].messages.map(m=>m.content),[turn.content,'Independent answer','Follow up']);
  assert.ok(!JSON.stringify(inputs).includes(publisher.award.creative.approvedText));
});
test('same app request is admitted once; conflicting retry cannot mint another turn',async t=> {
  const publisher=exchange(),client=await start(t,{publisher}),body=draft();
  const [one,two]=await Promise.all([submit(client,body),submit(client,body)]);
  assert.equal(one.id,two.id);await client.server.appIdle();assert.equal(publisher.requests,1);
  assert.equal((await client.call('/api/chat',{...body,content:'changed'})).status,409);
  assert.equal((await client.call('/api/chat',{...body,consent:false})).status,409);
});
test('no-fill and unavailable SDK transport fail open with independent answers',async t=> {
  for(const publisher of [exchange({async requestAd(){return {status:'no_fill',opportunityId:'no-fill'};}}),
    new AXPPublisher({apiKey:'fixture-secret',baseURL:'http://127.0.0.1:1/api/product',fetch:async()=>{throw Error('unavailable');}})]) {
    const client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
    assert.match(turn.answer,/Fixture reply/);assert.ok(['no_fill','unknown'].includes(turn.adState));assert.equal(turn.award,undefined);
  }
});
test('unknown/not-found/pending lookups stay explicit; recovery never requests another ad',async t=> {
  for(const status of ['unknown','not_found','pending']) {
    const publisher=exchange({async requestAd(){return {status:'error',error:{code:'network_error'}};},async lookupOpportunity(){return {schemaVersion:'publisher-opportunity-status.v1',status};}});
    const client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
    for(let i=0;i<2;i++){const result=await client.call(`/api/turns/${turn.id}/recover`,{});assert.equal(result.body.turn.adState,status);assert.equal(result.body.turn.award,undefined);}
  }
});
test('session ownership, CSRF and bound render token reject unauthenticated/cross-turn observations',async t=> {
  const publisher=exchange(),client=await start(t,{publisher}),other=await connect(client.base),turn=await settled(client,(await submit(client)).id);
  assert.equal((await other.call(`/api/turns/${turn.id}`)).status,404);
  assert.equal((await client.call('/api/chat',draft(),{'x-app-csrf':'wrong'})).status,403);
  assert.equal((await client.call('/api/chat',draft(),{origin:'http://other.example'})).status,403);
  for(const body of [{...renderBody(turn),deliveryToken:'wrong'},{...renderBody(turn),awardId:'other'},
    {...renderBody(turn),observation:{...renderBody(turn).observation,domInserted:false}},
    {...renderBody(turn),observation:{...renderBody(turn).observation,sponsoredLabelPresent:false}}])
    assert.equal((await client.call(`/api/turns/${turn.id}/render`,body)).status,400);
  assert.equal(publisher.renders,0);
});
test('accepted receipt durable in app; repeated observation uses same charge; history award has no token',async t=> {
  const publisher=exchange(),client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
  const [one,two]=await Promise.all([client.call(`/api/turns/${turn.id}/render`,renderBody(turn)),client.call(`/api/turns/${turn.id}/render`,renderBody(turn))]);
  assert.equal(one.status,200);assert.equal(one.body.charge.id,two.body.charge.id);assert.equal(publisher.renders,1);
  const saved=(await client.call(`/api/turns/${turn.id}`)).body.turn;
  assert.equal(saved.receipt.charge.id,one.body.charge.id);assert.equal(saved.award.id,turn.award.id);assert.equal(saved.deliveryToken,undefined);
});
test('lost/malformed render response stays unknown; blind retry blocked until read-only lookup',async t=> {
  const publisher=exchange({async acknowledgeRender(){throw Object.assign(Error(),{code:'invalid_receipt_response'});}});
  const client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
  assert.equal((await client.call(`/api/turns/${turn.id}/render`,renderBody(turn))).status,502);
  const unknown=(await client.call(`/api/turns/${turn.id}`)).body.turn;
  assert.equal(unknown.deliveryState,'unknown');assert.equal(unknown.receipt,null);assert.equal(unknown.award,undefined);
  assert.equal((await client.call(`/api/turns/${turn.id}/render`,renderBody(turn))).status,409);
});
for(const state of ['expired','failed']) test(`recovery never renders terminal ${state} award`,async t=> {
  const publisher=exchange();publisher.lookupDelivery=async()=>({status:state,schemaVersion:'publisher-award-status.v1',awardId:publisher.award.id,financialMode:'synthetic',expiresAt:publisher.award.expiresAt});
  const client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
  const recovered=(await client.call(`/api/turns/${turn.id}/recover`,{})).body.turn;
  assert.equal(recovered.deliveryState,state);assert.equal(recovered.award,undefined);assert.equal(publisher.requests,1);
});
test('known financial mode, creative and price are checked on recovery AND direct receipt',async t=> {
  for(const field of ['mode','price','creative'])for(const path of ['render','recover']) {
    const publisher=exchange(),receipt=sampleReceipt(publisher.award);
    if(field==='mode'){receipt.financialMode='devnet';receipt.receipt.mode='devnet';receipt.charge.mode='devnet';}
    if(field==='price')receipt.charge.amountBaseUnits='999';if(field==='creative')receipt.receipt.creativeHash='c'.repeat(64);
    publisher.acknowledgeRender=async()=>receipt;publisher.lookupDelivery=async()=>({status:'accepted',result:receipt});
    const client=await start(t,{publisher}),turn=await settled(client,(await submit(client)).id);
    const result=await client.call(`/api/turns/${turn.id}/${path}`,path==='render'?renderBody(turn):{});
    if(path==='render')assert.equal(result.status,502);
    const saved=(await client.call(`/api/turns/${turn.id}`)).body.turn;
    assert.equal(saved.receipt,null);assert.equal(saved.errorCode,'invalid_receipt_response');
  }
});
test('input/provider errors are safe; explicit asset allowlist excludes server, secrets and DB',async t=> {
  const client=await start(t,{provider:{async answer(){throw Error('PRIVATE_SECRET_MARKER');}}});
  for(const body of [null,{},draft({content:' '}),draft({content:'x'.repeat(1601)}),draft({consent:undefined}),draft({requestId:null})])
    assert.equal((await client.call('/api/chat',body)).status,400);
  assert.equal((await client.call('/api/chat',draft({consent:false}))).status,502);
  for(const path of ['/','/app.js','/style.css','/sdk/browser.mjs','/sdk/receipt.mjs','/sdk/errors.mjs']){
    const response=await fetch(`${client.base}${path}`);assert.equal(response.status,200);
    assert.ok(!(await response.text()).includes('PRIVATE_SECRET_MARKER'));assert.match(response.headers.get('content-security-policy'),/default-src 'self'/);
  }
  for(const path of ['/server.js','/answer-provider.js','/store.js','/fault-fetch.js','/package.json','/.state/pilot.sqlite','/sdk/index.mjs','/sdk/financial.mjs','/node_modules/@axp/publisher-sdk/index.mjs','/local-state/sdk-pilot/integrator.env','/%2e%2e/server.js'])
    assert.equal((await fetch(`${client.base}${path}`)).status,404);
});
