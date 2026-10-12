import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createAccountsAPI} from '../packages/accounts/api.mjs';
import {createHostedAccountsAPI} from '../packages/accounts/hosted.mjs';
import {createSupabaseAuth} from '../packages/accounts/supabase.mjs';

const origin='http://127.0.0.1:3495';
const uid='10000000-0000-4000-8000-000000000001',uid2='10000000-0000-4000-8000-000000000002';
function providerFixture(clock) {
  const calls=[];let down=false,who=uid;
  const user=id=>({id,email:id===uid?'alice@example.com':'bob@example.com'});
  const data=id=>({user:user(id),accessToken:`access-${id}`,refreshToken:`refresh-${id}`,expiresAt:clock()+3600000});
  return {calls,setDown:v=>{down=v;},setWho:v=>{who=v;},
    async signup(v){calls.push(['signup',v.email]);return {confirmationRequired:true};},
    async signin(v){calls.push(['signin',v.email]);return data(v.email==='alice@example.com'?uid:uid2);},
    async confirm(){return data(uid);},
    async getUser(token){calls.push(['user']);if(down)throw Object.assign(Error(),{code:'auth_provider_unavailable',status:503});return user(who===uid?token.slice(7):who);},
    async refresh(token){calls.push(['refresh']);if(down)throw Object.assign(Error(),{code:'auth_provider_unavailable',status:503});return data(token.slice(8));},
    async signout(){calls.push(['signout']);if(down)throw Error('unavailable');},
  };
}
async function invoke(api,path,{method='GET',body,headers={},cookie,csrf}={}) {
  const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{url:'/api/accounts'+path,method,headers:{host:'127.0.0.1:3495',...(method==='POST'?{origin,'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(csrf?{'x-axp-csrf':csrf}:{}),...headers}});
  const out={status:0,headers:{},writeHead(s,h){this.status=s;this.headers=h;},end(text){this.body=JSON.parse(text);}};
  await api.handler(req,out);return out;
}
function local(t) {
  const dir=mkdtempSync(join(tmpdir(),'axp-account-test-'));let now=1000000000000;
  const store=createAccountStore({dir,now:()=>now}),provider=providerFixture(()=>now),api=createAccountsAPI({store,provider,origin,now:()=>now});
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return {store,provider,api,advance:ms=>{now+=ms;}};
}
async function login(api,email='alice@example.com') {
  const r=await invoke(api,'/auth/signin',{method:'POST',body:{email,password:'correct horse battery staple'}});
  assert.equal(r.status,200);assert.deepEqual(r.body,{signedIn:true});
  assert.match(r.headers['set-cookie'],/HttpOnly; SameSite=Lax/);
  const cookie=r.headers['set-cookie'].split(';')[0],session=await invoke(api,'/session',{cookie});
  assert.equal(session.body.authenticated,true);return {cookie,csrf:session.body.csrf,user:session.body.user};
}

test('accounts: verified people own organizations; foreign IDs cannot read or mutate profiles',async t=>{
  const {api}=local(t),alice=await login(api),bob=await login(api,'bob@example.com');
  const org=await invoke(api,'/organizations',{...alice,method:'POST',body:{name:'Alice Co'}});assert.equal(org.status,201);
  const id=org.body.organization.id;
  assert.equal((await invoke(api,`/organizations/${id}`,bob)).status,404);
  assert.equal((await invoke(api,`/organizations/${id}/advertiser`,{...bob,method:'POST',body:{name:'Takeover',website:'https://evil.example',description:'x'}})).status,404);
  const a=await invoke(api,`/organizations/${id}/advertiser`,{...alice,method:'POST',body:{name:'Alice Ads',website:'https://alice.example',description:'Owner profile'}});assert.equal(a.status,200);
  const app=await invoke(api,`/organizations/${id}/apps`,{...alice,method:'POST',body:{name:'Alice Chat',website:'https://chat.example',allowedOrigins:['https://chat.example'],blockedCategories:['gambling'],payout:null}});assert.equal(app.status,201);
  const detail=await invoke(api,`/organizations/${id}`,alice);assert.equal(detail.body.apps.length,1);assert.equal(detail.body.advertiser.name,'Alice Ads');
  assert.equal((await invoke(api,'/profile',{...alice,method:'POST',body:{displayName:'x',userId:bob.user.id}})).status,400);
  assert.equal((await invoke(api,'/organizations',{...alice,method:'POST',body:{name:'x',ownerId:bob.user.id}})).status,400);
  assert.equal((await invoke(api,'/session',alice)).body.capabilities.nativeFunding,false);
});

test('accounts: same-origin login and session-bound CSRF protect mutations',async t=>{
  const {api}=local(t);
  const bad=await invoke(api,'/auth/signin',{method:'POST',headers:{origin:'https://evil.example'},body:{email:'alice@example.com',password:'longenoughpassword'}});assert.equal(bad.status,403);
  const a=await login(api);
  assert.equal((await invoke(api,'/profile',{cookie:a.cookie,method:'POST',body:{displayName:'Alice'}})).status,403);
  assert.equal((await invoke(api,'/profile',{...a,method:'POST',headers:{'x-axp-csrf':'wrong'},body:{displayName:'Alice'}})).status,403);
  assert.equal((await invoke(api,'/session',{...a,headers:{'sec-fetch-site':'cross-site'}})).status,403);
  assert.equal((await invoke(api,'/profile',{...a,method:'POST',body:{displayName:'Alice'}})).body.user.displayName,'Alice');
});

test('accounts: native 56-hex confirmation hash reaches provider unchanged; malformed hashes do not',async t=>{
  const {api,provider}=local(t),confirm=provider.confirm,received=[];
  provider.confirm=async token=>{received.push(token);return confirm(token);};
  const token='ab'.repeat(28);
  const good=await invoke(api,'/auth/confirm',{method:'POST',body:{tokenHash:token}});
  assert.equal(good.status,200);assert.deepEqual(good.body,{signedIn:true});
  assert.deepEqual(received,[token]);assert.match(good.headers['set-cookie'],/HttpOnly/);
  for(const invalid of ['a'.repeat(64),'g'.repeat(56),'short']){
    assert.equal((await invoke(api,'/auth/confirm',{method:'POST',body:{tokenHash:invalid}})).status,400);
  }
  assert.deepEqual(received,[token]);
});

test('accounts: refresh re-verifies identity, logout works during provider outage',async t=>{
  const {api,provider,advance}=local(t),a=await login(api);
  advance(3600000);
  assert.equal((await invoke(api,'/session',a)).body.authenticated,true);
  assert.equal(provider.calls.filter(x=>x[0]==='refresh').length,1);
  provider.setDown(true);
  assert.equal((await invoke(api,'/auth/signout',{...a,method:'POST',body:{}})).status,200);
  provider.setDown(false);
  assert.deepEqual((await invoke(api,'/session',a)).body,{authenticated:false});
});

test('accounts: changed provider identity, uncertain refresh and absolute expiry fail closed',async t=>{
  const {api,provider,advance}=local(t);let a=await login(api);
  provider.setWho(uid2);assert.equal((await invoke(api,'/session',a)).status,401);
  provider.setWho(uid);assert.deepEqual((await invoke(api,'/session',a)).body,{authenticated:false});
  a=await login(api);advance(3600000);provider.setDown(true);
  assert.equal((await invoke(api,'/session',a)).status,503);provider.setDown(false);
  assert.deepEqual((await invoke(api,'/session',a)).body,{authenticated:false});
  a=await login(api);advance(604800001);assert.deepEqual((await invoke(api,'/session',a)).body,{authenticated:false});
});

test('accounts hosted: durable encrypted restart, no cookie on failed snapshot save',async()=>{
  const values=new Map();let deny=false;
  const kv={kind:'fixture',get:async k=>values.get(k)??null,compareAndSet:async(k,old,value)=>{if(deny||((values.get(k)??null)!==old))return false;values.set(k,value);return true;}};
  const config={AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNTS_ORIGIN:origin,AXP_STATE_KEY:Buffer.alloc(32,19).toString('base64')},provider=providerFixture(Date.now);
  let api=createHostedAccountsAPI({config,kv,provider});const a=await login(api);
  assert.equal((await invoke(api,'/organizations',{...a,method:'POST',body:{name:'Durable'}})).status,201);
  api=createHostedAccountsAPI({config,kv,provider});assert.equal((await invoke(api,'/session',a)).body.organizations[0].name,'Durable');
  const persisted=JSON.stringify([...values]);assert.ok(!persisted.includes('access-'));assert.ok(!persisted.includes('refresh-'));assert.ok(!persisted.includes('alice@example.com'));
  deny=true;const failed=await invoke(api,'/auth/signin',{method:'POST',body:{email:'alice@example.com',password:'longenoughpassword'}});assert.notEqual(failed.status,200);assert.equal(failed.headers['set-cookie'],undefined);
});

test('accounts: absent configuration is unavailable, never a fixture sign-in',async()=>{
  const api=createHostedAccountsAPI({config:{}});
  assert.equal((await invoke(api,'/health')).body.enabled,false);
  assert.equal((await invoke(api,'/auth/signin',{method:'POST',body:{}})).status,503);
});

test('accounts API awaits asynchronous database profile operations and binds only verified identities',async t=>{
  const {store,provider}=local(t),bindings=[];
  const asyncStore={profileStore:'supabase',bindIdentity(user,token){bindings.push([user.id,token]);}};
  for(const name of ['ensureUser','user','updateProfile','organizations','createOrganization','organization','details','saveAdvertiser','saveApp','putSession','session','deleteSession']) {
    asyncStore[name]=async(...args)=>{await Promise.resolve();return store[name](...args);};
  }
  const api=createAccountsAPI({store:asyncStore,provider,origin,now:()=>1000000000000});
  const a=await login(api);
  assert.equal((await invoke(api,'/health')).body.profileStore,'supabase');
  assert.equal((await invoke(api,'/profile',{...a,method:'POST',body:{displayName:'Async profile'}})).body.user.displayName,'Async profile');
  const org=await invoke(api,'/organizations',{...a,method:'POST',body:{name:'Async organization'}});
  assert.equal(org.status,201);
  assert.equal((await invoke(api,`/organizations/${org.body.organization.id}`,a)).body.organization.name,'Async organization');
  assert.ok(bindings.length>=4);assert.ok(bindings.every(([id,token])=>id===uid&&token===`access-${uid}`));
});

test('hosted profiles cannot enable the SQLite fixture store on Vercel',async()=>{
  const api=createHostedAccountsAPI({config:{AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNTS_PROFILE_STORE:'sqlite-fixture',VERCEL:'1',AXP_ACCOUNTS_ORIGIN:origin},provider:providerFixture(Date.now)});
  assert.equal(api.initError,'profile_database_configuration_required');
  assert.equal((await invoke(api,'/health')).body.enabled,false);
  const realProvider=createHostedAccountsAPI({config:{AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNTS_PROFILE_STORE:'sqlite-fixture',AXP_ACCOUNTS_ORIGIN:origin}});
  assert.equal(realProvider.initError,'profile_database_configuration_required');
});

test('Supabase adapter: authoritative /user required; provider secrets never returned',async()=>{
  const calls=[];
  const p=createSupabaseAuth({url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_publishable_fixture_key_0123456789',fetchImpl:async(url,opts)=>{
    calls.push({url,opts});
    return new Response(JSON.stringify(url.includes('/user')?{id:uid,email:'alice@example.com',email_confirmed_at:'2026-10-12T00:00:00Z'}:{access_token:'token',refresh_token:'refresh',expires_in:3600}),{status:200});
  }});
  const result=await p.signin({email:'alice@example.com',password:'longenoughpassword'});assert.equal(result.user.id,uid);assert.equal(calls.length,2);assert.match(calls[1].url,/\/auth\/v1\/user$/);assert.equal(calls[1].opts.headers.authorization,'Bearer token');assert.equal(calls[0].opts.redirect,'error');
  assert.throws(()=>createSupabaseAuth({url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_secret_notallowed'}),/publishable/);
  const invalid=createSupabaseAuth({url:'https://qcejmyhaakoedjaqmcub.supabase.co',key:'sb_publishable_fixture_key_0123456789',fetchImpl:async()=>new Response(JSON.stringify({id:uid,email:'alice@example.com'}))});
  await assert.rejects(()=>invalid.getUser('unverified'),/confirmed_email_required/);
});
