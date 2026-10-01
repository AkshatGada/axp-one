import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {request} from 'node:http';
import {loadReplayBundle,validateRecordedEvidence,STEPS} from '../../packages/replay/bundle.mjs';
import {createReplayServer} from '../../packages/replay/server.mjs';
import {createClient} from '../../packages/client/index.mjs';
import {validate} from '../../packages/client/validate.mjs';
const root=resolve(import.meta.dirname,'../..'),directory=join(root,'artifacts/phase5/replay');
const bundle=()=>loadReplayBundle(directory);
const sources=b=>({connected:structuredClone(b.sourceFiles['connected-run.json']),chain:structuredClone(b.sourceFiles['chain-check.json']),restart:structuredClone(b.sourceFiles['restart-replay.json']),profiles:structuredClone(b.sourceFiles['source-profiles.json'])});
test('replay verifies six actual decisions, two receipts and one cumulative channel',()=>{
  const b=bundle(),r=b.run;assert.equal(r.financialMode,'sandbox');assert.equal(r.presentationKind,'recorded_evidence_replay');assert.equal(r.decisions.length,6);assert.equal(r.decisions.filter(d=>d.decision==='skip').length,4);assert.equal(r.deliveries.length,2);assert.deepEqual(r.payment.vouchers.map(v=>v.cumulativeAmountBaseUnits),['3000','6000']);assert.equal(r.payment.settledBaseUnits,'6000');assert.equal(r.payment.refundBaseUnits,'14000');assert.equal(STEPS.reduce((a,s)=>a+s.seconds,0),240);
});
test('changed source bytes and bundle traversal paths fail closed',t=>{
  const dir=mkdtempSync(join(tmpdir(),'axp-replay-hash-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));cpSync(directory,dir,{recursive:true});writeFileSync(join(dir,'chain-check.json'),readFileSync(join(dir,'chain-check.json'),'utf8')+' ');assert.throws(()=>loadReplayBundle(dir),/bundle_hash_mismatch/);
  const m=JSON.parse(readFileSync(join(dir,'manifest.json')));m.files['../other.json']='hash';writeFileSync(join(dir,'manifest.json'),JSON.stringify(m));assert.throws(()=>loadReplayBundle(dir));
});
test('correlations reject receipt, voucher, source-profile and settlement mismatches',()=>{
  let s=sources(bundle());s.connected.signedReceipts[0].receipt.creativeHash='changed';assert.throws(()=>validateRecordedEvidence(s),/receipt_correlation/);
  s=sources(bundle());s.connected.payments[0].vouchers[1].cumulativeAmountBaseUnits='9000';assert.throws(()=>validateRecordedEvidence(s),/voucher_correlation/);
  s=sources(bundle());s.profiles.profiles[0].profileHash='wrong';assert.throws(()=>validateRecordedEvidence(s),/profile_provenance/);
  s=sources(bundle());s.chain.transactionStatuses[0].confirmationStatus='confirmed';assert.throws(()=>validateRecordedEvidence(s),/settlement_correlation/);
});
test('offline replay starts with network fetch disabled and no environment credentials',()=>{
  const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('upstream disabled');};try{const server=createReplayServer();assert.equal(server.replayBundle.run.runId,'phase4-20261001-acceptance');assert.ok(!('getSession' in server));}finally{globalThis.fetch=original;}
});
test('replay routes are GET-only; repeated reads never change records or execute adapters',async t=>{
  const server=createReplayServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));const origin=`http://127.0.0.1:${server.address().port}`,initial=JSON.stringify(server.replayBundle.run);
  const boot=await(await fetch(origin+'/v1/replay/bootstrap')).json();assert.equal(boot.readOnly,true);assert.equal(boot.bundleHash,bundle().bundleHash);
  for(let i=0;i<3;i++)for(const path of ['/','/app.mjs','/style.css','/fonts.css','/tokens.css','/v1/replay/run','/v1/replay/bootstrap','/v1/replay/events','/v1/replay/fixtures'])assert.equal((await fetch(origin+path)).status,200,path);
  for(const path of ['/v1/replay/run','/v1/replay/events','/v1/delivery/ack','/v1/conversation/turn','/v1/campaigns'])assert.equal((await fetch(origin+path,{method:'POST',body:'{}'})).status,405);
  const diagnostics=await(await fetch(origin+'/v1/replay/diagnostics')).json();for(const key of ['modelCalls','deliveryAcknowledgements','paymentSigning','paymentBroadcasts'])assert.equal(diagnostics[key],0);
  assert.equal(JSON.stringify(server.replayBundle.run),initial);
  const events=await(await fetch(origin+'/v1/replay/events', {headers:{'Last-Event-ID':'30'}})).text();assert.ok(!events.includes('id: 30\n'));assert.ok(events.includes('id: 32\n'));
  const outside=await new Promise((resolve,reject)=>{const r=request(origin,{headers:{Host:'example.com'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});r.on('error',reject);r.end();});assert.equal(outside,403);
  assert.equal((await fetch(origin+'/artifacts/phase4/connected-run.json')).status,404);
});
test('all navigation code is read-only and synthetic cases retain explicit provenance',()=>{
  const app=readFileSync(join(root,'apps/replay-ui/app.mjs'),'utf8');assert.ok(!/method\s*:\s*['"]POST|delivery\/ack|payment.*sign\(/.test(app));assert.ok(app.includes("f.sourceKind==='recorded_run'"));const f=JSON.parse(readFileSync(join(root,'artifacts/phase5/frontend/fixtures.json'))).fixtures;assert.ok(f.find(x=>x.id==='competing_bids'&&x.sourceKind==='synthetic_test'));for(const id of ['no-fill','failed_delivery','pending','unknown'])assert.equal(f.find(x=>x.id===id)?.sourceKind,'synthetic_test');
});
test('frontend replay client consumes implemented routes, validates fixtures and cannot write',async t=>{
  const server=createReplayServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));let calls=0;const client=createClient({baseURL:`http://127.0.0.1:${server.address().port}`,fetch:(...a)=>{calls++;return fetch(...a);}});
  const bootstrap=await client.replayBootstrap();validate('ReplayBootstrap',bootstrap);
  const r=await client.replayRun();validate('ReplayRun',r);assert.equal(r.financialMode,'sandbox');assert.equal(r.presentationKind,'recorded_evidence_replay');
  const fixtures=await client.replayFixtures();for(const f of fixtures.fixtures)validate('FrontendFixture',f);
  const events=await client.replayEvents('30');assert.deepEqual(events.map(e=>Number(e.id)),[31,32]);
  const before=calls;await assert.rejects(client.acknowledgeRender('anything',{}),{code:'replay_read_only'});assert.equal(calls,before);
});
