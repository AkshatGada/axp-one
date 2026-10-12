import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseAccountStore} from '../packages/accounts/supabase-store.mjs';

const user={id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.test'};
const orgId='20000000-0000-4000-8000-000000000001';
function fixture() {
  const calls=[],sessions={ensureUser:u=>u,putSession:x=>x,session:()=>null,deleteSession:()=>{},close:()=>{}};
  const store=createSupabaseAccountStore({sessions,url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_publishable_fixture_key_0123456789',fetchImpl:async(url,options)=>{
    calls.push({url,options,payload:JSON.parse(options.body)});
    return new Response(JSON.stringify({...user,displayName:'Persisted'}));
  }});
  return {store,calls};
}
test('Supabase profile repository requires bound verified identity and sends JWT only to fixed RPC',async()=>{
  const {store,calls}=fixture();
  assert.throws(()=>store.user(user.id),/authentication_required/);
  store.bindIdentity(user,'private-fixture-access');
  assert.equal((await store.ensureUser(user)).displayName,'Persisted');
  assert.equal((await store.user(user.id)).id,user.id);
  assert.equal(calls[0].url,'https://qcejmyhaakoedjaqmcub.supabase.co/rest/v1/rpc/axp_account_operation');
  assert.equal(calls[0].options.headers.authorization,'Bearer private-fixture-access');
  assert.deepEqual(calls[0].payload,{operation:'ensureUser',payload:{}});
  assert.equal(calls[0].options.redirect,'error');
  assert.throws(()=>store.user('10000000-0000-4000-8000-000000000002'),/authentication_required/);
});
test('Supabase operations validate declarations and never send browser ownership fields',async()=>{
  const {store,calls}=fixture();store.bindIdentity(user,'fixture-access');
  assert.throws(()=>store.createOrganization(user.id,{name:'Bad',ownerId:user.id}),/unknown_field/);
  assert.throws(()=>store.saveApp(user.id,orgId,{name:'Bad',website:'javascript:bad',allowedOrigins:[],blockedCategories:[],payout:null}),/invalid_url/);
  await store.saveAdvertiser(user.id,orgId,{name:'Advertiser',website:'https://business.example.test',description:'Own declared offer'});
  assert.deepEqual(calls[0].payload,{operation:'saveAdvertiser',payload:{orgId,input:{name:'Advertiser',website:'https://business.example.test/',description:'Own declared offer'}}});
  assert.throws(()=>store.details(user.id,'not-a-uuid'),/not_found/);
});
test('DB failures have safe codes, do not invoke local profile fallbacks or expose upstream details',async()=>{
  for(const [code,message,status,expected] of [
    ['PGRST202','RPC absent',404,'profile_database_migration_required'],
    ['P0001','not_found',400,'not_found'],
    ['42501','private SQL and secret input',403,'profile_database_unavailable'],
  ]) {
    const store=createSupabaseAccountStore({sessions:{},url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_publishable_fixture_key_0123456789',fetchImpl:async()=>new Response(JSON.stringify({code,message}),{status})});
    store.bindIdentity(user,'fixture-access');
    await assert.rejects(()=>store.user(user.id),e=>e.code===expected&&e.message===expected);
  }
  assert.throws(()=>createSupabaseAccountStore({sessions:{},url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_secret_forbidden'}),/publishable_key/);
});
