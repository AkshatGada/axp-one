import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {connect,draft,submit,settled,renderBody} from './helpers.js';
import {fixtureDocument} from './dom.js';
import {createSponsoredCard,createRenderAcknowledger} from '@axp/publisher-sdk/browser';

const enabled=process.env.PILOT_HTTP_TEST==='1';
const app=fileURLToPath(new URL('../',import.meta.url));
const evidenceURL='http://127.0.0.1:3472/__pilot/evidence';
const evidence=async()=>{const r=await fetch(evidenceURL);assert.equal(r.status,200);return r.json();};
function counts(e) {
  return {opportunities:e.requests.length,decisions:e.persistedDecisionAdmissions,fixtureCalls:e.fixtureCalls,
    awards:e.awards.length,charges:e.charges.length,receipts:e.receiptCount,spendBaseUnits:e.spendBaseUnits,
    paidProviderCalls:e.paidProviderCalls,networkPayments:e.networkPayments};
}
async function childApp(t,fault) {
  await mkdir(`${app}/.state`,{recursive:true,mode:0o700});
  const directory=await mkdtemp(`${app}/.state/http-`);
  let child,base;
  async function launch(selectedFault) {
    child=spawn(process.execPath,['server.js'],{cwd:app,env:{...process.env,PORT:'3474',PILOT_STORE:`${directory}/app.sqlite`,PILOT_TRANSPORT_FAULT:selectedFault || ''},stdio:['ignore','pipe','pipe']});
    base=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('test app startup deadline')),5000);
      child.stdout.on('data',data=>{const match=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
      // Never print child environment, stderr or credential-bearing responses.
      child.stderr.on('data',()=>{});child.once('exit',()=>{clearTimeout(timeout);reject(Error('test app exited before ready'));});
    });
  }
  async function stop() {if(child && child.exitCode===null){const exit=once(child,'exit');child.kill('SIGTERM');await exit;}}
  t.after(stop);await launch(fault);
  return {get base(){return base;},directory,stop,async restart(){await stop();await launch();}};
}
function assertNoNewWork(before,after) {assert.deepEqual(counts(after),counts(before));}
function assertFixtureOnly(value) {assert.equal(value.financialMode,'synthetic');assert.equal(value.paidProviderCalls,0);assert.equal(value.networkPayments,0);}

test('actual HTTP: lost opportunity response, APP process restart, original read-only lookup (no new purchase/decision/charge)',{skip:!enabled},async t=>{
  const before=await evidence();assertFixtureOnly(before);
  const processApp=await childApp(t,'lost-opportunity'),client=await connect(processApp.base),body=draft();
  const turn=await settled(client,(await submit(client,body)).id);
  assert.equal(turn.adState,'unknown');assert.equal(turn.errorCode,'network_error');assert.match(turn.answer,/Fixture reply/);
  const admitted=await evidence();
  assert.equal(admitted.requests.length,before.requests.length+1);assert.equal(admitted.persistedDecisionAdmissions,before.persistedDecisionAdmissions+1);
  assert.equal(admitted.charges.length,before.charges.length);
  await processApp.restart();const restored=await connect(processApp.base,client.cookie);
  assert.equal(restored.session.sessionId,client.session.sessionId);assert.equal(restored.session.turns[0].id,turn.id);
  const recovered=(await restored.call(`/api/turns/${turn.id}/recover`,{})).body.turn;
  assert.equal(recovered.adState,'awarded');assert.equal(recovered.deliveryState,'reserved');assert.ok(recovered.award);
  assert.equal((await submit(restored,body)).id,turn.id);
  const after=await evidence();assertNoNewWork(admitted,after);assertFixtureOnly(after);
  t.diagnostic(JSON.stringify({scenario:'lost-opportunity + restart + lookup',before:counts(before),after:counts(after),turnId:turn.id,awardId:recovered.award.id}));
});

for(const fault of ['lost-receipt','malformed-receipt']) test(`actual HTTP: ${fault} after accepted exchange response, APP process restart, original charge recovered`,{skip:!enabled},async t=>{
  const before=await evidence();const processApp=await childApp(t,fault),client=await connect(processApp.base);
  const turn=await settled(client,(await submit(client)).id);assert.equal(turn.adState,'awarded');
  // The DOM is an explicit adapter here, not independent browser insertion proof.
  const document=fixtureDocument(),node=createSponsoredCard({document,award:turn.award});document.body.append(node);
  const acknowledge=createRenderAcknowledger({post:async(_path,observation,deliveryToken)=>{
    const r=await client.call(`/api/turns/${turn.id}/render`,{awardId:turn.award.id,deliveryToken,observation});
    if(r.status!==200)throw Error('delivery_unconfirmed');return r.body;
  }});
  await assert.rejects(acknowledge({node,award:turn.award,deliveryToken:turn.deliveryToken}),/delivery_unconfirmed/);
  const unknown=(await client.call(`/api/turns/${turn.id}`)).body.turn;
  assert.equal(unknown.deliveryState,'unknown');assert.equal(unknown.receipt,null);
  assert.equal(unknown.errorCode,fault==='lost-receipt'?'network_error':'invalid_receipt_response');
  const accepted=await evidence();assert.equal(accepted.requests.length,before.requests.length+1);
  assert.equal(accepted.persistedDecisionAdmissions,before.persistedDecisionAdmissions+1);assert.equal(accepted.charges.length,before.charges.length+1);
  assert.equal(accepted.receiptCount,before.receiptCount+1);
  await processApp.restart();const restored=await connect(processApp.base,client.cookie);
  const recovered=(await restored.call(`/api/turns/${turn.id}/recover`,{})).body.turn;
  assert.equal(recovered.id,turn.id);assert.equal(recovered.deliveryState,'accepted');assert.equal(recovered.receipt.status,'accepted');
  assert.equal(recovered.receipt.receipt.awardId,turn.award.id);assert.equal(recovered.receipt.charge.amountBaseUnits,turn.award.priceBaseUnits);
  assert.equal(recovered.deliveryToken,undefined);assert.equal(recovered.award.id,turn.award.id);
  const receiptId=recovered.receipt.charge.id;assert.equal((await restored.call(`/api/turns/${turn.id}/render`,renderBody(turn))).body.charge.id,receiptId);
  const after=await evidence();assertNoNewWork(accepted,after);assertFixtureOnly(after);
  t.diagnostic(JSON.stringify({scenario:`${fault} + restart + lookup`,before:counts(before),after:counts(after),turnId:turn.id,awardId:turn.award.id,chargeId:receiptId}));
});

test('actual HTTP: browser malformed HTTP200 response permits explicit retry of saved receipt, no extra charge',{skip:!enabled},async t=>{
  const before=await evidence(),processApp=await childApp(t),client=await connect(processApp.base);
  const turn=await settled(client,(await submit(client)).id),document=fixtureDocument(),node=createSponsoredCard({document,award:turn.award});document.body.append(node);
  let posts=0;
  const acknowledge=createRenderAcknowledger({post:async(_path,observation,deliveryToken)=>{
    const r=await client.call(`/api/turns/${turn.id}/render`,{awardId:turn.award.id,deliveryToken,observation});assert.equal(r.status,200);
    // Simulate a malformed fulfilled JSON response between the app and helper.
    return ++posts===1 ? {} : r.body;
  }});
  const args={node,award:turn.award,deliveryToken:turn.deliveryToken};await assert.rejects(acknowledge(args),/invalid_receipt_response/);
  const admitted=await evidence(),receipt=await acknowledge(args);assert.equal(receipt.status,'accepted');await acknowledge(args);assert.equal(posts,2);
  const after=await evidence();assertNoNewWork(admitted,after);assert.equal(after.charges.length,before.charges.length+1);
  t.diagnostic(JSON.stringify({scenario:'malformed browser HTTP200 + explicit same-receipt retry',before:counts(before),after:counts(after),chargeId:receipt.charge.id}));
});

test('actual HTTP: unrelated question no-fill, private routes/assets, no key or buyer context in public assets', {skip:!enabled},async t=>{
  const before=await evidence(),processApp=await childApp(t),client=await connect(processApp.base);
  const off=await submit(client,draft({content:'Hello ordinary chat',consent:false}));assert.equal(off.adState,'sharing_off');assertNoNewWork(before,await evidence());
  const turn=await settled(client,(await submit(client,draft({content:'I need a mobile software wallet, not a developer tool.'}))).id);
  assert.equal(turn.adState,'no_fill');assert.match(turn.answer,/Fixture reply/);
  const after=await evidence();assert.equal(after.charges.length,before.charges.length);assert.equal(after.requests.length,before.requests.length+1);
  process.loadEnvFile(fileURLToPath(new URL('../../../../local-state/sdk-pilot/integrator.env',import.meta.url)));
  const secret=process.env.AXP_PUBLISHER_API_KEY;assert.ok(secret,'server credential available for private asset check');
  for(const path of ['/','/app.js','/style.css','/sdk/browser.mjs','/sdk/receipt.mjs','/sdk/errors.mjs']){
    const r=await fetch(`${client.base}${path}`);assert.equal(r.status,200);const text=await r.text();
    assert.ok(!text.includes(secret),'public asset must not contain credential');
    assert.ok(!text.includes('privateBuyerContext'),'buyer context absent');
  }
  for(const path of ['/server.js','/.state/pilot.sqlite','/local-state/sdk-pilot/integrator.env','/sdk/index.mjs','/sdk/financial.mjs'])
    assert.equal((await fetch(`${client.base}${path}`)).status,404);
  t.diagnostic(JSON.stringify({scenario:'sharing-off + no-fill + private assets',before:counts(before),after:counts(after)}));
});
