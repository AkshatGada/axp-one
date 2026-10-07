// Offline serverless fault/concurrency tests. No sockets, provider calls, wallets
// from disk, token transfers or real chain signatures are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {createFileKV,createBlobKV,createUpstashKV} from '../../packages/hosted/kv.mjs';
import {unpackDirectory} from '../../packages/hosted/vault.mjs';
import {createHostedProductWorkspace,createHostedProductAPI,productStateKey} from '../../packages/product/hosted.mjs';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

function memoryKV() {
 const values=new Map();return {kind:'fixture',values,async get(k){return values.get(k)??null;},async compareAndSet(k,expected,v){if((values.get(k)??null)!==expected)return false;values.set(k,v);return true;}};
}
function temp(t){const p=mkdtempSync(join(tmpdir(),'axp-product-hosted-test-'));t.after(()=>rmSync(p,{recursive:true,force:true}));return p;}
const code=expected=>e=>e.code===expected;
async function request(api,path,{method='GET',body,headers={}}={}) {
 const req=Object.assign(Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]),{url:`/api/product${path}`,method,headers:{host:'demo.example',...(method==='POST'?{'content-type':'application/json'}:{}),...headers}});
 const res={status:0,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers;return this;},end(body){this.body=JSON.parse(body);}};
 await api.handler(req,res);return res;
}
function config(key,extra={}){return {AXP_PRODUCT_ENABLED:'1',AXP_STATE_KEY:key.toString('base64'),AXP_PRODUCT_DEMO_MODE:'1',...extra};}
async function apiFixture(t,options={}) {
 const kv=memoryKV(),key=randomBytes(32),root=temp(t);let modelCalls=0,answerCalls=0;
 const serviceOptions={transport:async packet=>{modelCalls++;return jevResponse(packet,3,3);},organicTransport:async()=>{answerCalls++;return {answer:'Independent fixture answer',model:'fixture'};},...options.serviceOptions};
 const start=()=>createHostedProductAPI({root,kv,config:config(key,options.config),serviceOptions,now:options.now});
 let api=await start();let bootstrap=await request(api,'/bootstrap');assert.equal(bootstrap.status,200);
 const post=(path,body,headers={})=>request(api,path,{method:'POST',body,headers:{'x-axp-csrf':bootstrap.body.csrf,...headers}});
 await post('/account',{name:'Offline hosted fixture',websiteURL:'https://fixture.example/'});
 const {id,label,exampleQuestion,...draft}=PRESETS[0];
 return {kv,key,root,get api(){return api;},post,question:exampleQuestion,draft,modelCalls:()=>modelCalls,answerCalls:()=>answerCalls,async restart(){api=await start();},async launch(){const saved=await post('/campaigns',draft);assert.equal(saved.status,200);const id=saved.body.campaign.id;await post(`/campaigns/${id}/approve`,{});const result=await post(`/campaigns/${id}/launch`,{});assert.equal(result.status,200);return result.body.campaign;}};
}
async function inspectSnapshot(t,kv,key,kind='financial') {
 const row=JSON.parse(await kv.get(productStateKey('demo',kind))),dir=temp(t);
 unpackDirectory(row.snapshot,dir,key,{aad:`axp.hosted-product-state.v1:demo:${kind}`});return {row,dir};
}
function dbRow(path,table) {const db=new DatabaseSync(path,{readOnly:true});try{return db.prepare(`SELECT * FROM ${table}`).all().map(row=>JSON.parse(row.data??row.body));}finally{db.close();}}

test('hosted workspace persists across cold starts and fences stale lease owners',async t=>{
 const kv=memoryKV(),key=randomBytes(32);let clock=10000;
 const a=createHostedProductWorkspace({kv,stateKey:key,now:()=>clock,leaseMs:1000}),b=createHostedProductWorkspace({kv,stateKey:key,now:()=>clock,leaseMs:1000});
 let release,entered;const held=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
 const stale=a.withState(async({dir,checkpoint})=>{writeFileSync(join(dir,'balance'),'old');await checkpoint();entered();await held;writeFileSync(join(dir,'balance'),'stale');await checkpoint();});
 await ready;await assert.rejects(b.withState(()=>{}),code('product_busy_retry'));
 clock+=1001;await b.withState(({dir})=>{assert.equal(readFileSync(join(dir,'balance'),'utf8'),'old');writeFileSync(join(dir,'balance'),'successor');});
 release();await assert.rejects(stale,code('product_lease_lost'));
 await b.withState(({dir})=>assert.equal(readFileSync(join(dir,'balance'),'utf8'),'successor'));
 assert.equal((await b.inspect()).busy,false);
});

test('hosted API keeps CSRF identity, campaigns, award and exactly-once receipt across invocation recreation',async t=>{
 const f=await apiFixture(t),c=await f.launch(),input={question:f.question,sessionId:'fixture',turnId:'one'};
 const ad=await f.post('/demo/chat',input);assert.equal(ad.body.status,'awarded');assert.equal(f.modelCalls(),1);
 await f.restart();const replay=await f.post('/demo/chat',input);assert.equal(replay.body.award.id,ad.body.award.id);assert.equal(f.modelCalls(),1);
 const headers={'x-axp-delivery-token':ad.body.deliveryToken},ack={creativeHash:ad.body.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};
 const delivered=await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers);assert.equal(delivered.status,200);
 await f.restart();const again=await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers);assert.equal(again.body.replayed,true);assert.equal(again.body.charge.id,delivered.body.charge.id);
 const state=await request(f.api,'/state');assert.equal(state.body.deliveries.length,1);assert.equal(state.body.campaigns.find(x=>x.id===c.id).spendBaseUnits,ad.body.award.priceBaseUnits);
 const {row}=await inspectSnapshot(t,f.kv,f.key);assert.equal(row.lease,null);assert.ok(!row.snapshot.includes('Keep your keys')&&!row.snapshot.includes('publisher-receipt'));
});

test('DeepSeek and Jev admissions checkpoint before providers; answer shard proceeds during held auction',async t=>{
 let release,entered;const held=new Promise(r=>release=r),ready=new Promise(r=>entered=r);let f,observed=0;
 f=await apiFixture(t,{serviceOptions:{transport:async packet=>{
   const {dir}=await inspectSnapshot(t,f.kv,f.key);const rows=dbRow(join(dir,'exchange.sqlite'),'product_decisions');assert.equal(rows[0].status,'pending');assert.equal(rows[0].admitted,true);observed++;entered();await held;return jevResponse(packet,3,3);
 },organicTransport:async()=>{const {dir}=await inspectSnapshot(t,f.kv,f.key,'organic');const rows=dbRow(join(dir,'exchange.sqlite'),'product_answers');assert.equal(rows[0].status,'pending');return {answer:'Independent fixture while auction waits',model:'fixture'};}}});
 await f.launch();const input={question:f.question,sessionId:'fixture',turnId:'parallel'};
 const auction=f.post('/demo/chat',input);await ready;
 const busy=await request(f.api,'/state');assert.equal(busy.status,429);assert.equal(busy.body.error,'product_busy_retry');
 const answer=await f.post('/demo/answer',input);assert.equal(answer.status,200);assert.equal(answer.body.answer,'Independent fixture while auction waits');
 release();assert.equal((await auction).body.status,'awarded');assert.equal(observed,1);
});

test('cold retry of a lease-expired admitted model call never pays the provider again or overwrites a successor',async t=>{
 let clock=Date.parse('2026-10-07T12:00:00Z'),release,entered;const held=new Promise(r=>release=r),ready=new Promise(r=>entered=r);let calls=0;
 const f=await apiFixture(t,{now:()=>clock,serviceOptions:{transport:async packet=>{calls++;entered();await held;return jevResponse(packet,3,3);}}});
 await f.launch();const input={question:f.question,sessionId:'fixture',turnId:'uncertain'};
 const old=f.post('/demo/chat',input);await ready;clock+=240001;await f.restart();
 const retry=await f.post('/demo/chat',input);assert.equal(retry.status,200);assert.equal(retry.body.status,'no_fill');assert.equal(retry.body.trace.decisions[0].reasonCodes[0],'call_uncertain');assert.equal(calls,1);
 release();assert.equal((await old).status,503);assert.equal((await f.post('/demo/chat',input)).body.status,'no_fill');assert.equal(calls,1);
});

test('failed snapshot persistence prevents model calls and successful API output',async t=>{
 let calls=0;const f=await apiFixture(t,{serviceOptions:{organicTransport:async()=>{calls++;return {answer:'unreachable',model:'fixture'};}}});
 const cas=f.kv.compareAndSet;let changes=0;
 f.kv.compareAndSet=async(...args)=>{changes++;if(changes===3)throw Object.assign(Error('storage unavailable'),{code:'blob_unavailable'});return cas(...args);};
 const answer=await f.post('/demo/answer',{question:f.question,sessionId:'failure',turnId:'one'});assert.equal(answer.status,503);assert.equal(calls,0);
});

test('daily answer and Jev caps survive cold starts, and request/auth/config boundaries reject before side effects',async t=>{
 const f=await apiFixture(t,{config:{AXP_PRODUCT_JEV_DAILY_CAP:'1'}});await f.launch();
 for(let i=0;i<2;i++){await f.post('/demo/chat',{question:f.question,sessionId:`s${i}`,turnId:'one'});await f.restart();}assert.equal(f.modelCalls(),1);
 for(let i=0;i<20;i++){const answer=await f.post('/demo/answer',{question:f.question,sessionId:'answers',turnId:`t${i}`});assert.equal(answer.status,200);}
 await f.restart();assert.equal((await f.post('/demo/answer',{question:f.question,sessionId:'answers',turnId:'over'})).status,429);assert.equal(f.answerCalls(),20);
 assert.equal((await f.post('/account',{}, {origin:'https://evil.example'})).status,403);
 assert.equal((await f.post('/account','x'.repeat(17000))).status,413);
 assert.equal((await f.post('/account',{}, {'x-axp-csrf':'bad'})).status,403);
 assert.equal((await f.post('/opportunities',{question:f.question,sessionId:'sdk',turnId:'one'})).status,401);
 const off=await createHostedProductAPI({root:f.root,config:{VERCEL:'1',AXP_PRODUCT_ENABLED:'1'}});const health=await request(off,'/health');assert.equal(health.status,200);assert.equal(health.body.enabled,false);assert.equal((await request(off,'/state')).status,503);
});

test('migration imports persisted identity/economics once and refuses an active local worker or arbitrary secrets',async t=>{
 const source=temp(t),service=createProductService({stateDir:source});service.saveAccount({name:'migration fixture',websiteURL:'https://fixture.example/'});service.close();
 writeFileSync(join(source,'operator-secret'),'must not import');const kv=memoryKV(),key=randomBytes(32),w=createHostedProductWorkspace({kv,stateKey:key});
 writeFileSync(join(source,'payment-worker.lock'),'{}');await assert.rejects(w.importDirectory(source),code('product_local_worker_running'));rmSync(join(source,'payment-worker.lock'));
 assert.equal((await w.importDirectory(source)).imported,true);await assert.rejects(w.importDirectory(source),code('product_workspace_already_exists'));
 await w.withState(({dir})=>{assert.equal(existsSync(join(dir,'operator-secret')),false);const restored=createProductService({stateDir:dir});assert.equal(restored.state().account.name,'migration fixture');restored.close();});
});

function fakeBlob() {
 const blobs=new Map();let n=0;const calls=[];const err=(status,code)=>new Response(JSON.stringify({error:{code,message:code}}),{status});
 return {calls,fetchImpl:async(url,init={})=>{const u=new URL(url),h=init.headers??{};calls.push({url,init});const path=u.hostname.endsWith('.private.blob.vercel-storage.com')?u.pathname.slice(1):u.searchParams.get('pathname'),cur=blobs.get(path);
  if(init.method!=='PUT')return cur?new Response(cur.body,{headers:{etag:cur.etag}}):new Response('',{status:404});
  if(h['x-if-match']&&cur?.etag!==h['x-if-match'])return err(412,'precondition_failed');if(!h['x-if-match']&&cur&&h['x-allow-overwrite']!=='1')return err(409,'precondition_failed');
  blobs.set(path,{body:init.body,etag:`"e${++n}"`});return new Response('{}');}};
}
test('Blob and file exact-value CAS admit one contender and keep stale writers out',async t=>{
 const f=fakeBlob(),blob=createBlobKV({token:'vercel_blob_rw_store1_fixture',fetchImpl:f.fetchImpl}),file=createFileKV({dir:temp(t)});
 for(const kv of [blob,file]){assert.equal(await kv.compareAndSet('state',null,'one'),true);assert.equal(await kv.compareAndSet('state',null,'wrong'),false);const writes=await Promise.all([kv.compareAndSet('state','one','two'),kv.compareAndSet('state','one','three')]);assert.equal(writes.filter(Boolean).length,1);assert.equal(await kv.compareAndSet('state','one','stale'),false);assert.notEqual(await kv.get('state'),'stale');}
 assert.ok(f.calls.filter(x=>x.init.method==='PUT').slice(1).every(x=>x.init.headers['x-if-match']));
});
test('Upstash exact-value CAS uses one atomic EVAL, never a separate GET/SET',async()=>{
 const calls=[];const kv=createUpstashKV({url:'https://fixture.upstash.io',token:'fixture',fetchImpl:async(url,init)=>{calls.push(JSON.parse(init.body));return new Response('{"result":1}');}});
 assert.equal(await kv.compareAndSet('state',null,'next'),true);assert.equal(calls.length,1);assert.equal(calls[0][0],'EVAL');assert.equal(calls[0][2],'1');assert.deepEqual(calls[0].slice(3),['state','0','','next']);
});

function nativeFixtureTransport(t,fRef,calls,controls={}) {
 return async({terms})=>{
  const id=terms.channelId,protocolChannelId=`fixture-native:${id}`;
  const wire=kind=>({wireBase64:Buffer.from(`fixture-${kind}:${id}`).toString('base64'),txSignature:`fixture-signature-${kind}:${id}`,blockhash:'fixture-blockhash',lastValidBlockHeight:'12345',estimatedFeeAndRentLamports:'1000'});
  const persisted=async()=>{const f=fRef(),{dir}=await inspectSnapshot(t,f.kv,f.key);return dbRow(join(dir,'payments.sqlite'),'c06_payment_state').find(s=>s.channelId===id);};
  const record=name=>calls.push(name);
  const openReceipt=input=>({status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,protocolChannelId,depositBaseUnits:terms.depositBaseUnits});
  const closeReceipt=input=>({status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,settledBaseUnits:input.plan.watermark.cumulativeAmountBaseUnits,publisherDeltaBaseUnits:input.plan.watermark.cumulativeAmountBaseUnits,refundBaseUnits:String(BigInt(terms.depositBaseUnits)-BigInt(input.plan.watermark.cumulativeAmountBaseUnits)),feeAndRentLamports:'1000'});
  const commitReceipt=input=>({status:'authorized',deliveryId:input.intent.charge.id,incrementBaseUnits:input.intent.charge.amountBaseUnits,cumulativeAmountBaseUnits:input.intent.cumulativeAmountBaseUnits,payloadHash:input.intent.payloadHash});
  return {
   evidenceLabel:'synthetic_transport_fake',
   async prepareOpen(){record('prepareOpen');return {protocolChannelId,estimatedFeeAndRentLamports:'1000'};},
   async signOpen(){record('signOpen');assert.equal((await persisted()).open.status,'signing');return wire('open');},
   async submitOpen(input){record('submitOpen');const state=await persisted();assert.equal(state.open.status,'submitting');assert.deepEqual(state.open.signed,input.signed);if(controls.loseOpenAck)throw Error('fixture lost response after submission');return openReceipt(input);},
   async lookupOpen(input){record('lookupOpen');return openReceipt(input);},
   async reserveDelivery({charge}){record('reserveDelivery');return {deliveryId:charge.id,amountBaseUnits:charge.amountBaseUnits};},
   async prepareVoucher({intent}){record('prepareVoucher');return {signature:`fixture-voucher:${intent.sequence}`,signatureType:'ed25519',signer:terms.payer,voucher:{channelId:protocolChannelId,cumulativeAmount:intent.cumulativeAmountBaseUnits,expiresAt:terms.voucherExpiresAt}};},
   async commitVoucher(input){record('commitVoucher');const intent=(await persisted()).intents.at(-1);assert.equal(intent.status,'commit_pending');assert.deepEqual(intent.voucher,input.voucher);return commitReceipt(input);},
   async lookupCommit(input){record('lookupCommit');return commitReceipt(input);},
   async prepareClose(input){record('prepareClose');return {protocolChannelId,estimatedFeeAndRentLamports:'1000',watermark:input.watermark};},
   async signClose(){record('signClose');assert.equal((await persisted()).close.status,'signing');return wire('close');},
   async submitClose(input){record('submitClose');const state=await persisted();assert.equal(state.close.status,'submitting');assert.deepEqual(state.close.signed,input.signed);return closeReceipt(input);},
   async lookupClose(input){record('lookupClose');return closeReceipt(input);},
  };
 };
}
async function hostedNative(t,controls={}) {
 let f;const calls=[];
 f=await apiFixture(t,{config:{AXP_PRODUCT_FINANCIAL_MODE:'devnet',AXP_PRODUCT_DEVNET_SIGN:'1'},serviceOptions:{paymentOptions:{identities:{payer:'fixture-payer',payee:'fixture-publisher'},preflight:async()=>({compatible:true,simulation:{err:null},programAccountHash:'a'.repeat(64),programDataHash:'b'.repeat(64),balances:{payerBaseUnits:'20000000',payerLamports:'5000000000'}}),transportFactory:nativeFixtureTransport(t,()=>f,calls,controls)}}});
 return {...f,get api(){return f.api;},calls};
}
test('native hosted flow checkpoints exact signed open/close bytes and voucher before external operations; cold receipt replay is economic no-op',async t=>{
 const f=await hostedNative(t),c=await f.launch();assert.equal(c.status,'active');
 const ad=await f.post('/demo/chat',{question:f.question,sessionId:'fixture',turnId:'native'});assert.equal(ad.body.status,'awarded');
 const ack={creativeHash:ad.body.award.creativeHash,domInserted:true,sponsoredLabelPresent:true},headers={'x-axp-delivery-token':ad.body.deliveryToken};
 const delivered=await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers);assert.equal(delivered.body.authorization.status,'authorized');
 const closed=await f.post(`/campaigns/${c.id}/settle`,{});assert.equal(closed.body.campaign.status,'settled');assert.equal(closed.body.campaign.settledBaseUnits,ad.body.award.priceBaseUnits);assert.equal(BigInt(closed.body.campaign.settledBaseUnits)+BigInt(closed.body.campaign.refundBaseUnits),20000n);
 await f.restart();const before=f.calls.length;assert.equal((await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers)).body.replayed,true);assert.equal((await f.post(`/campaigns/${c.id}/settle`,{})).body.replayed,true);assert.equal(f.calls.length,before);
 assert.equal(f.calls.filter(x=>x==='signOpen').length,1);assert.equal(f.calls.filter(x=>x==='submitOpen').length,1);assert.equal(f.calls.filter(x=>x==='prepareVoucher').length,1);assert.equal(f.calls.filter(x=>x==='submitClose').length,1);
});
test('unknown hosted native open survives cold start and only looks up persisted signature, with no second signer/broadcast',async t=>{
 const f=await hostedNative(t,{loseOpenAck:true}),c=await f.launch();assert.equal(c.status,'opening');assert.equal(c.payment.reconciliationRequired,true);
 await f.restart();const recovered=await f.post(`/campaigns/${c.id}/reconcile`,{});assert.equal(recovered.body.campaign.status,'active');
 assert.equal(f.calls.filter(x=>x==='signOpen').length,1);assert.equal(f.calls.filter(x=>x==='submitOpen').length,1);assert.equal(f.calls.filter(x=>x==='lookupOpen').length,1);
});

test('organic migration preserves paid-call counters and completed answer identity from financial local run',async t=>{
 const source=temp(t);let calls=0;
 const service=createProductService({stateDir:source,organicTransport:async()=>{calls++;return {answer:'Migrated old answer',model:'fixture'};}});
 const body={question:PRESETS[0].exampleQuestion,sessionId:'old-session',turnId:'old-turn'};
 await service.answer(body);service.close();
 const kv=memoryKV(),key=randomBytes(32),w=createHostedProductWorkspace({kv,stateKey:key,kind:'organic'});await w.importDirectory(source);
 await w.withState(async({dir})=>{const restored=createProductService({stateDir:dir,runId:'product-organic-v1',organicTransport:async()=>{calls++;return {answer:'must not happen',model:'fixture'};}});try{assert.equal(restored.organic().usedToday,1);const replay=await restored.answer(body);assert.equal(replay.answer,'Migrated old answer');assert.equal(replay.replayed,true);assert.equal(calls,1);}finally{restored.close();}});
});
