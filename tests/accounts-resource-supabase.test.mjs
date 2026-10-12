import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSupabaseAccountStore} from '../packages/accounts/supabase-store.mjs';
import {APP_SCOPES, createAppKey} from '../packages/accounts/resources.mjs';

const id=n=>`${n}0000000-0000-4000-8000-000000000001`;
const user={id:id(1),email:'owner@example.test'},orgId=id(2),appId=id(3),campaignId=id(4),keyId=id(5),advertiserId=id(6);
const input={name:'Fixture campaign',productDescription:'Hardware wallet',approvedText:'Keep keys offline.',contextHints:['offline storage'],declaredCapabilities:['hardware_wallet'],maxBidBaseUnits:'40',budgetCapBaseUnits:'1000',settlementNetwork:'solana-devnet'};
const campaign={id:campaignId,organizationId:orgId,advertiserId,version:1,status:'draft',input,approvedContentHash:null,createdAt:1000,updatedAt:1000,servingStatus:'not_connected'};
const credential={id:keyId,organizationId:orgId,appId,publisherId:`app:${appId}`,label:'Server',scopes:[...APP_SCOPES],createdAt:1000,expiresAt:2592001000,revokedAt:null};
const app={id:appId,organizationId:orgId,name:'Fixture app',website:'https://app.test/',allowedOrigins:['https://app.test'],blockedCategories:['gambling'],payout:null,createdAt:1000,updatedAt:1000};
function fixture(respond) {
  const calls=[],sessions={close(){},ensureUser(){},putSession(){},session(){},deleteSession(){}};
  const store=createSupabaseAccountStore({sessions,url:'https://fixture.supabase.co',key:'sb_publishable_fixture_0123456789',fetchImpl:async(url,options)=>{
    const call={url,options,body:JSON.parse(options.body)};calls.push(call);
    const result=respond?await respond(call):call.body.operation?.includes('Campaign')||['campaign','campaigns'].includes(call.body.operation)
      ?call.body.operation==='campaigns'?[campaign]:campaign
      :call.body.operation==='appCredentials'?[credential]:credential;
    return result instanceof Response?result:new Response(JSON.stringify(result));
  }});
  return {store,calls};
}
const bound=f=>{f.store.bindIdentity(user,'private-fixture-jwt');return f;};

test('all eight owner methods use only the fixed invoker RPC and verified JWT, never caller ownership',async()=>{
  const f=bound(fixture()),s=f.store,key=createAppKey();
  assert.deepEqual(await s.campaigns(user.id,orgId),[campaign]);
  assert.deepEqual(await s.campaign(user.id,orgId,campaignId),campaign);
  assert.deepEqual(await s.saveCampaign(user.id,orgId,input),campaign);
  await s.saveCampaign(user.id,orgId,input,campaignId);
  await s.approveCampaign(user.id,orgId,campaignId,1);
  assert.deepEqual(await s.appCredentials(user.id,orgId,appId),[credential]);
  await s.issueAppCredential(user.id,orgId,appId,{label:'Server',keyHash:key.keyHash});
  await s.revokeAppCredential(user.id,orgId,appId,keyId);
  await s.rotateAppCredential(user.id,orgId,appId,keyId,{label:'Server',keyHash:key.keyHash});
  assert.deepEqual(f.calls.map(c=>c.body.operation),['campaigns','campaign','saveCampaign','saveCampaign','approveCampaign','appCredentials','issueAppCredential','revokeAppCredential','rotateAppCredential']);
  assert.deepEqual(f.calls[2].body,{operation:'saveCampaign',payload:{orgId,input,campaignId:null}});
  assert.deepEqual(f.calls[4].body,{operation:'approveCampaign',payload:{orgId,campaignId,expectedVersion:1}});
  assert.deepEqual(f.calls[8].body,{operation:'rotateAppCredential',payload:{orgId,appId,keyId,input:{label:'Server',keyHash:key.keyHash}}});
  for(const call of f.calls) {
    assert.equal(call.url,'https://fixture.supabase.co/rest/v1/rpc/axp_account_resource_operation');
    assert.equal(call.options.headers.authorization,'Bearer private-fixture-jwt');
    assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);
    assert.equal(Object.hasOwn(call.body.payload,'userId'),false);assert.equal(JSON.stringify(call.body).includes(key.apiKey),false);
  }
});

test('unbound/forged identity, malformed IDs and forged resource input never reach database',()=>{
  const f=fixture(),s=f.store,key=createAppKey();
  assert.throws(()=>s.campaigns(user.id,orgId),/authentication_required/);
  s.bindIdentity(user,'private-jwt');
  for(const fn of [()=>s.campaigns(id(9),orgId),()=>s.campaign(id(9),orgId,campaignId),()=>s.issueAppCredential(id(9),orgId,appId,{label:'Server',keyHash:key.keyHash}),()=>s.revokeAppCredential(id(9),orgId,appId,keyId)])assert.throws(fn,/authentication_required/);
  for(const fn of [()=>s.campaign(user.id,orgId,'bad'),()=>s.appCredentials(user.id,orgId,'bad'),()=>s.revokeAppCredential(user.id,orgId,appId,'bad')])assert.throws(fn,/not_found/);
  for(const field of ['ownerId','advertiserId','organizationId','version','status','approvedContentHash'])assert.throws(()=>s.saveCampaign(user.id,orgId,{...input,[field]:'forged'}),/unknown_field/);
  assert.throws(()=>s.issueAppCredential(user.id,orgId,appId,{label:'Server',keyHash:key.apiKey}),/invalid_input/);
  assert.throws(()=>s.rotateAppCredential(user.id,orgId,appId,keyId,{label:'Server',keyHash:key.keyHash,publisherId:'forged'}),/unknown_field/);
  assert.equal(f.calls.length,0);
});

test('approval carries expected version; stale approvals preserve safe conflict and invalid versions never call DB',async()=>{
  const f=bound(fixture(()=>new Response(JSON.stringify({code:'PT409',message:'campaign_version_conflict'}),{status:409})));
  for(const invalid of [undefined,null,0,-1,1.1,'1',Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>f.store.approveCampaign(user.id,orgId,campaignId,invalid),/invalid_input/);
  assert.equal(f.calls.length,0);
  await assert.rejects(()=>f.store.approveCampaign(user.id,orgId,campaignId,1),e=>e.code==='campaign_version_conflict'&&e.status===409);
  assert.deepEqual(f.calls[0].body,{operation:'approveCampaign',payload:{orgId,campaignId,expectedVersion:1}});
});

test('resolver is anonymous fixed hash-only capability, DTO includes actual app restrictions and no secrets',async()=>{
  const key=createAppKey(),f=fixture(()=>({credential:{...credential,keyHash:key.keyHash,apiKey:key.apiKey},app:{...app,ownerId:user.id},key_hash:key.keyHash}));
  const result=await f.store.resolveAppCredential(key.keyHash);
  assert.deepEqual(result,{credential,app});
  assert.equal(f.calls[0].url,'https://fixture.supabase.co/rest/v1/rpc/axp_resolve_app_credential');
  assert.deepEqual(f.calls[0].body,{key_hash:key.keyHash});
  assert.equal(Object.hasOwn(f.calls[0].options.headers,'authorization'),false);
  f.store.bindIdentity(user,'private-jwt');await f.store.resolveAppCredential(key.keyHash);
  assert.equal(Object.hasOwn(f.calls[1].options.headers,'authorization'),false,'owner token never expands resolver capability');
  for(const invalid of [key.apiKey,'a'.repeat(63),'A'.repeat(64),'%','',null,{},0])assert.equal(await f.store.resolveAppCredential(invalid),null);
  assert.equal(f.calls.length,2);
  for(const value of [key.apiKey,key.keyHash,'keyHash','key_hash','ownerId'])assert.equal(JSON.stringify(result).includes(value),false);
  assert.equal(await fixture(()=>null).store.resolveAppCredential(key.keyHash),null);
});

test('owner credential DTO projections exclude hashes/raw keys even if upstream mistakenly includes them',async()=>{
  const key=createAppKey(),f=bound(fixture(call=>call.body.operation==='appCredentials'?[{...credential,key_hash:key.keyHash,apiKey:key.apiKey}]:{...credential,keyHash:key.keyHash,apiKey:key.apiKey}));
  assert.deepEqual(await f.store.appCredentials(user.id,orgId,appId),[credential]);
  for(const operation of ['issueAppCredential','rotateAppCredential']) {
    const args=operation==='issueAppCredential'?[user.id,orgId,appId,{label:'Server',keyHash:key.keyHash}]:[user.id,orgId,appId,keyId,{label:'Server',keyHash:key.keyHash}];
    assert.deepEqual(await f.store[operation](...args),credential);
  }
});

test('foreign/missing, revoked rotation, quotas, migration and transport errors stay safe without fallback',async()=>{
  for(const [responseStatus,code,message,expected,status] of [
    [404,'PT404','not_found','not_found',404],[409,'PT409','credential_not_active','credential_not_active',409],
    [409,'PT409','credential_hash_conflict','credential_hash_conflict',409],[409,'PT409','limit_exceeded','limit_exceeded',409],
    [401,'PT401','unauthorized','auth_rejected',401],[429,'','private quota context','profile_database_rate_limited',429],
    [404,'PGRST202','missing RPC with private JWT','profile_database_migration_required',503],
    [403,'42501','SQL key_hash=private-input; token=secret','profile_database_unavailable',503],
  ]) {
    const f=bound(fixture(()=>new Response(JSON.stringify({code,message,details:'private SQL',hint:'private JWT'}),{status:responseStatus})));
    await assert.rejects(()=>f.store.rotateAppCredential(user.id,orgId,appId,keyId,{label:'Server',keyHash:'a'.repeat(64)}),e=>e.code===expected&&e.message===expected&&e.status===status&&!JSON.stringify(e).includes('private'));
  }
  const unavailable=fixture(()=>{throw Error('private upstream credential');});
  await assert.rejects(()=>unavailable.store.resolveAppCredential('a'.repeat(64)),/profile_database_unavailable/);
  const invalid=bound(fixture(()=>new Response('not JSON')));
  await assert.rejects(()=>invalid.store.campaigns(user.id,orgId),/profile_database_invalid/);
});

test('malformed resource DTOs and cross-bound resolver DTOs fail closed',async()=>{
  for(const response of [{credential:{...credential,appId:id(9)},app},{credential:{...credential,organizationId:id(9)},app},{credential:{...credential,scopes:['admin']},app},{credential:{id:keyId},app}]) {
    const f=fixture(()=>response);
    await assert.rejects(()=>f.store.resolveAppCredential('a'.repeat(64)),/profile_database_invalid/);
  }
  await assert.rejects(()=>bound(fixture(()=>({}))).store.campaign(user.id,orgId,campaignId),/profile_database_invalid/);
  await assert.rejects(()=>bound(fixture(()=>({...campaign,servingStatus:'enabled'}))).store.campaign(user.id,orgId,campaignId),/profile_database_invalid/);
});

test('migration/acceptance are authored artifacts with explicit security and rollback gates, not execution evidence',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261012_axp_account_resources.sql',import.meta.url),'utf8');
  const acceptance=readFileSync(new URL('../supabase/tests/account_resources.sql',import.meta.url),'utf8');
  assert.match(sql,/axp_account_resource_operation\(operation text,payload jsonb/);
  assert.match(sql,/axp_resolve_app_credential\(key_hash text\)[\s\S]*?security definer set search_path = ''/);
  assert.match(sql,/view public\.axp_account_credential_metadata with\(security_invoker=true\)/);
  assert.match(sql,/grant select\(id,organization_id,app_id,label,created_at,expires_at,revoked_at\)/);
  assert.doesNotMatch(sql,/grant select\([^;]*key_hash/);
  assert.match(acceptance,/rollback;\s*$/);
  assert.doesNotMatch(acceptance,/^commit;/m);
});
