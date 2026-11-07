// Actual encrypted hosted executor + Arc worker; fixture transport, no RPC,
// paid models, private wallet files or externally valid payment signatures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createHostedArcDemoAPI,ARC_WORKSPACE} from '../../packages/arc/hosted.mjs';
import {productStateKey} from '../../packages/product/hosted.mjs';
import {unpackDirectory} from '../../packages/hosted/vault.mjs';
import {ARC_NETWORK as N} from '../../packages/arc/network.mjs';
import {PRESETS} from '../../packages/product/service.mjs';
import {hash} from '../../packages/contracts/index.mjs';

const ids={payer:`0x${'11'.repeat(20)}`,payee:`0x${'22'.repeat(20)}`};
async function request(api,path,{body,csrf,headers={}}={}) {
  const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{url:'/api/arc'+path,method:body===undefined?'GET':'POST',headers:{host:'arc.example','content-type':'application/json',...(csrf?{'x-axp-csrf':csrf}:{}),...headers}});
  const res={status:0,writeHead(n){this.status=n;},end(body){this.body=JSON.parse(body);}};
  await api.handler(req,res);return res;
}
async function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'axp-arc-hosted-')),key=randomBytes(32),values=new Map(),calls=[],transfers=new Map();
  const kv={kind:'fixture',get:async k=>values.get(k)??null,compareAndSet:async(k,expected,v)=>{if((values.get(k)??null)!==expected)return false;values.set(k,v);return true;}};
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const saved=async()=>{
    const row=JSON.parse(await kv.get(productStateKey(ARC_WORKSPACE))),dir=mkdtempSync(join(root,'inspect-'));
    try{unpackDirectory(row.snapshot,dir,key,{aad:`axp.hosted-product-state.v1:${ARC_WORKSPACE}:financial`});const db=new DatabaseSync(join(dir,'exchange.sqlite'),{readOnly:true});try{return db.prepare('SELECT data FROM arc_payment_channels').all().map(r=>JSON.parse(r.data));}finally{db.close();}}
    finally{rmSync(dir,{recursive:true,force:true});}
  };
  let serial=0,unknown=false;
  const transport={
    inspect:async()=>({compatible:true,chainId:N.chainId,token:N.token,decimals:6,codeHash:'fixture-code',...ids}),
    signNative:async input=>{calls.push('sign:'+input.kind);return {...input,transactionHash:`0x${hash(input)}`,wire:'fixture-only',feeReservationAttoUSD:'1000'};},
    submitNative:async signed=>{const op=(await saved())[0].operations.find(o=>o.kind===signed.kind);assert.equal(op.signed.wire,signed.wire);assert.equal(op.status,'submitting');calls.push('send:'+signed.kind);return {status:'finalized',transactionHash:signed.transactionHash,feeAttoUSD:'100'};},
    lookupNative:async signed=>({status:'finalized',transactionHash:signed.transactionHash,feeAttoUSD:'100'}),
    balances:async()=>({walletBaseUnits:'1000000',gatewayAvailableBaseUnits:'40000'}),
    signPayment:async input=>{calls.push('sign:payment');return {nonce:`fixture-${++serial}`,payloadHash:hash(input),requirements:{amount:input.amountBaseUnits,payTo:ids.payee},payload:{fixture:true}};},
    verifyPayment:async()=>({isValid:true,payer:ids.payer}),
    settlePayment:async signed=>{assert.equal((await saved())[0].payments[0].signed.nonce,signed.nonce);calls.push('settle:'+signed.nonce);if(unknown)throw Error('fixture ambiguous acceptance');const result={success:true,network:N.caip2,payer:ids.payer,transaction:'gateway-'+signed.nonce};transfers.set(signed.nonce,{status:'accepted',transferId:result.transaction,transferStatus:'received'});return result;},
    lookupPayment:async signed=>transfers.get(signed.nonce)??{status:'unknown'},
  };
  const config={AXP_ARC_PREVIEW_LOCAL:'1',AXP_ARC_PREVIEW_ENABLED:'1',AXP_ARC_PREVIEW_STATE_KEY:key.toString('base64')};
  const start=()=>createHostedArcDemoAPI({root,kv,config,arcOptions:{identities:ids,transportFactory:()=>transport}});
  let api=await start(),bootstrap=(await request(api,'/bootstrap')).body;
  const post=(path,body,headers)=>request(api,path,{body,csrf:bootstrap.csrf,headers});
  await post('/account',{name:'Arc hosted fixture',websiteURL:'https://example.test/'});
  const {id,label,exampleQuestion,...draft}=PRESETS[0];
  const c=(await post('/campaigns',{...draft,settlementNetwork:N.network,maxBidBaseUnits:'2000',budgetCapBaseUnits:'8000',depositBaseUnits:'20000'})).body.campaign;
  await post(`/campaigns/${c.id}/approve`,{});assert.equal((await post(`/campaigns/${c.id}/launch`,{})).body.campaign.status,'active');
  return {get api(){return api;},post,kv,values,calls,transfers,config,root,saved,campaign:c,
    unknown:value=>{unknown=value;},restart:async()=>{api=await start();},input:{question:exampleQuestion,sessionId:'hosted-arc',turnId:'one',settlementNetwork:N.network}};
}

test('Arc hosted cold starts preserve exact authorization and receipt, isolate API/state, and gate uncertain resends',async t=>{
  const f=await fixture(t);assert.deepEqual(f.calls,['sign:approve','send:approve','sign:deposit','send:deposit']);
  const config=(await request(f.api,'/publisher/config')).body;
  assert.equal(config.apiBasePath,'/api/arc');assert.equal(config.demonstration.fixtureProviders,true);
  assert.equal(config.settlementNetwork,N.network);assert.equal(await f.kv.get(productStateKey('demo')),null);
  const {settlementNetwork,...answerInput}=f.input;
  const answer=await f.post('/demo/answer',answerInput);assert.equal(answer.status,200);assert.equal(answer.body.answerMode,'fixture');
  const ad=await f.post('/demo/chat',f.input);assert.equal(ad.status,200);assert.equal(ad.body.status,'awarded');
  await f.restart();
  const headers={'x-axp-delivery-token':ad.body.deliveryToken},ack={creativeHash:ad.body.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};
  const receipt=await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers);assert.equal(receipt.status,200);assert.equal(receipt.body.authorization.status,'authorized');
  const nonce=(await f.saved())[0].payments[0].signed.nonce;
  await f.restart();const replay=await f.post(`/demo/awards/${ad.body.award.id}/render`,ack,headers);
  assert.equal(replay.body.signature,receipt.body.signature);assert.equal(f.calls.filter(x=>x==='sign:payment').length,1);
  f.unknown(true);await f.post(`/campaigns/${f.campaign.id}/payout`,{});await f.restart();await f.post(`/campaigns/${f.campaign.id}/payout`,{});
  assert.equal(f.calls.filter(x=>x.startsWith('settle:')).length,1);assert.equal((await f.saved())[0].payments[0].signed.nonce,nonce);
  f.transfers.set(nonce,{status:'accepted',transferId:'recovered-original',transferStatus:'received'});
  await f.post(`/campaigns/${f.campaign.id}/reconcile`,{});await f.restart();
  const before=await f.kv.get(productStateKey(ARC_WORKSPACE)),state=await request(f.api,'/state');
  assert.equal(state.body.campaigns[0].payment.submittedBaseUnits,'2000');assert.equal(state.body.campaigns[0].settledBaseUnits,'0');
  assert.equal(await f.kv.get(productStateKey(ARC_WORKSPACE)),before);
  assert.equal((await f.post('/account',{}, {'x-axp-csrf':'wrong'})).status,403);
  assert.equal((await f.post('/account',{}, {origin:'https://evil.example'})).status,403);
});

test('Arc hosted endpoint stays disabled in Production and on other preview branches',async()=>{
  for(const config of [{VERCEL:'1',VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}, {VERCEL:'1',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'other-branch'},{}]) {
    const api=await createHostedArcDemoAPI({config:{...config,AXP_ARC_PREVIEW_ENABLED:'1'}});
    assert.equal((await request(api,'/health')).body.enabled,false);
    assert.equal((await request(api,'/bootstrap')).status,503);
  }
});
