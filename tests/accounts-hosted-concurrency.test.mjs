// Offline account-only serverless concurrency. No sockets, cloud credentials,
// paid providers, native transports or financial signatures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostedAccountsAPI} from '../packages/accounts/hosted.mjs';
import {productStateKey} from '../packages/product/hosted.mjs';
import {authFixture,providerFixture,origin,setup,call,input,accept,sdk} from './support/account-network-fixture.mjs';

function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function fixture(){
  const values=new Map(),packets=[];let clock=Date.now();const now=()=>clock;
  const kv={kind:'fixture',get:async k=>values.get(k)??null,
    compareAndSet:async(k,old,next)=>{if((values.get(k)??null)!==old)return false;values.set(k,next);return true;}};
  const control={entered:null,release:null};
  const transport=async packet=>{
    if(control.entered){const entered=control.entered;control.entered=null;entered.resolve();await control.release.promise;}
    return providerFixture(packets)(packet);
  };
  const config={AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNT_SERVING_ENABLED:'1',AXP_ACCOUNTS_ORIGIN:origin,
    AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED:'0',AXP_STATE_KEY:Buffer.alloc(32,43).toString('base64')};
  const create=()=>createHostedAccountsAPI({config,provider:authFixture(now),kv,now,networkOptions:{serviceOptions:{transport}}});
  const api=create(),resources=await setup(api);
  return {api,resources,packets,values,create,control,kv,advance:ms=>clock+=ms,
    hold(){control.entered=deferred();control.release=deferred();return control.entered.promise;},
    release(){control.release.resolve();}};
}
const networkKey=productStateKey('axp-account-network-v1','accounts');
const sessionsKey=productStateKey('axp-accounts-v1','accounts');

test('hosted account reports, configuration and saved delivery lookup stay readable during an auction',async()=>{
  const f=await fixture(),s=f.resources;
  const old=await s.sdks[0].requestAd(input('accepted'));
  const receipt=await accept(s.sdks[0],old);
  const entered=f.hold(),pending=s.sdks[0].requestAd(input('held'));
  await entered;
  try{
    const held=await f.kv.get(networkKey);
    assert.ok(JSON.parse(held).lease);
    const checks=[
      [`/sdk/publisher/config`,{headers:{'x-axp-publisher-key':s.keys[1].apiKey}}],
      [`/sdk/publisher/opportunities?sessionId=same-session&turnId=accepted`,{headers:{'x-axp-publisher-key':s.keys[0].apiKey}}],
      [`/sdk/awards/${old.award.id}/status`,{headers:{'x-axp-publisher-key':s.keys[0].apiKey,'x-axp-delivery-token':old.deliveryToken}}],
      [`/organizations/${s.orgs[0]}/campaigns/${s.campaigns[0].id}/report`,s.auths[0]],
      [`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/report`,s.auths[2]],
      [`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/integration`,s.auths[2]],
    ];
    // Human session verification remains serialized; serving snapshots must not
    // compete with the still-admitted model request's network writer lease.
    const results=[];for(const [path,options] of checks)results.push(await call(f.api,path,options));
    assert.deepEqual(results.map(r=>r.status),checks.map(()=>200));
    assert.equal(results[2].body.result.receiptHash,receipt.receiptHash);
    for(const r of results.slice(3,5))assert.equal(r.body.deliveries[0].receiptHash,receipt.receiptHash);
    assert.ok(await f.kv.get(networkKey)===held,'readers must not save, renew or release the serving lease');
  }finally{f.release();await pending;}
});

test('hosted SDK does not hold or modify the human session lease; logout remains independent',async()=>{
  const f=await fixture(),s=f.resources,before=await f.kv.get(sessionsKey);
  const entered=f.hold(),pending=s.sdks[0].requestAd(input('while-owner-signs-out'));
  await entered;
  try{
    assert.ok(await f.kv.get(sessionsKey)===before,'SDK must not acquire or rewrite the session snapshot');
    const out=await call(f.api,'/auth/signout',{...s.auths[2],method:'POST',body:{}});
    assert.equal(out.status,200,JSON.stringify(out.body));
    const session=await call(f.api,'/session',{cookie:s.auths[2].cookie});
    assert.equal(session.body.authenticated,false);
    const config=await call(f.api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':s.keys[0].apiKey}});
    assert.equal(config.status,200,'signing out does not revoke the independent SDK credential');
  }finally{f.release();await pending;}
});

test('hosted competing app writes fail busy and explicit same-turn retry preserves caps and exactly-once charge',async()=>{
  const f=await fixture(),s=f.resources,entered=f.hold();
  const pending=s.sdks[0].requestAd(input('parallel'));
  await entered;
  let busy;
  try{
    busy=await call(f.api,'/sdk/opportunities',{sdk:true,method:'POST',headers:{'x-axp-publisher-key':s.keys[1].apiKey},body:input('parallel')});
    assert.equal(busy.status,429);assert.equal(busy.body.error,'product_busy_retry');
  }finally{f.release();}
  const first=await pending,second=await s.sdks[1].requestAd(input('parallel'));
  assert.equal(first.status,'awarded');assert.equal(second.status,'awarded');
  assert.notEqual(first.award.id,second.award.id);
  const a=await accept(s.sdks[0],first),b=await accept(s.sdks[1],second),calls=f.packets.length;
  assert.notEqual(a.charge.id,b.charge.id);
  const fresh=sdk(f.create(),s.keys[0].apiKey);
  const replay=await fresh.requestAd(input('parallel'));
  assert.equal(replay.award.id,first.award.id);
  assert.equal((await accept(fresh,replay)).charge.id,a.charge.id);
  const report=await call(f.api,`/organizations/${s.orgs[0]}/campaigns/${s.campaigns[0].id}/report`,s.auths[0]);
  assert.equal(report.body.summary.acceptedBaseUnits,'8000');assert.equal(report.body.summary.reservedBaseUnits,'0');
  assert.equal(report.body.deliveries.length,2);assert.equal(f.packets.length,calls);
  assert.equal(JSON.parse(await f.kv.get(networkKey)).lease,null);
});

test('parallel hosted SDK reads are write-free and retain app/token/browser isolation',async()=>{
  const f=await fixture(),s=f.resources,award=await s.sdks[0].requestAd(input('lookup'));
  await accept(s.sdks[0],award);
  const snapshots=new Map(f.values),calls=f.packets.length;
  const requests=[
    ['/sdk/publisher/config',{'x-axp-publisher-key':s.keys[0].apiKey}],
    [`/sdk/awards/${award.award.id}/status`,{'x-axp-publisher-key':s.keys[0].apiKey,'x-axp-delivery-token':award.deliveryToken}],
    [`/sdk/awards/${award.award.id}/status`,{'x-axp-publisher-key':s.keys[1].apiKey,'x-axp-delivery-token':award.deliveryToken}],
    [`/sdk/awards/${award.award.id}/status`,{'x-axp-publisher-key':s.keys[0].apiKey,'x-axp-delivery-token':'wrong'}],
    ['/sdk/publisher/config',{'x-axp-publisher-key':s.keys[0].apiKey,origin}],
  ];
  const results=await Promise.all(requests.map(([path,headers])=>call(f.api,path,{headers})));
  assert.deepEqual(results.map(r=>r.status),[200,200,404,403,403]);
  assert.ok([...snapshots].every(([key,value])=>f.values.get(key)===value)&&f.values.size===snapshots.size,'SDK reads must not rewrite either snapshot');assert.equal(f.packets.length,calls);
});

test('unreleased serving lease preserves readable saved outcomes and resumes after expiry without a second admission',async()=>{
  const f=await fixture(),s=f.resources,cas=f.kv.compareAndSet;
  f.kv.compareAndSet=async(key,old,next)=>{
    if(key===networkKey&&JSON.parse(next).lease===null)return false;
    return cas(key,old,next);
  };
  const award=await s.sdks[0].requestAd(input('saved-before-release-loss')),calls=f.packets.length;
  assert.equal(award.status,'awarded');assert.ok(JSON.parse(await f.kv.get(networkKey)).lease);
  const recovered=await s.sdks[0].lookupOpportunity({sessionId:'same-session',turnId:'saved-before-release-loss'});
  assert.equal(recovered.result.award.id,award.award.id);
  const busy=await call(f.api,'/sdk/opportunities',{sdk:true,method:'POST',headers:{'x-axp-publisher-key':s.keys[0].apiKey},body:input('saved-before-release-loss')});
  assert.equal(busy.status,429);assert.equal(f.packets.length,calls);
  f.kv.compareAndSet=cas;f.advance(240001);
  const replay=await sdk(f.create(),s.keys[0].apiKey).requestAd(input('saved-before-release-loss'));
  assert.equal(replay.award.id,award.award.id);assert.equal(f.packets.length,calls);
  assert.equal(JSON.parse(await f.kv.get(networkKey)).lease,null);
});
