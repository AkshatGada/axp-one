import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createAccountsAPI} from '../packages/accounts/api.mjs';
import {createHostedAccountsAPI} from '../packages/accounts/hosted.mjs';
import {AXPPublisher} from '../packages/publisher-sdk/index.mjs';
import {CAMPAIGN_CAPABILITIES,validateCampaignInput} from '../packages/accounts/resources.mjs';
import {CAPABILITIES} from '../packages/product/service.mjs';

const origin='http://127.0.0.1:3503';
const users=['advertiser-a','advertiser-b','app-a','app-b'].map((name,i)=>({id:`10000000-0000-4000-8000-00000000000${i+1}`,email:`${name}@example.test`}));
function providerFixture(now) {
  const calls=[];
  const byId=id=>users.find(u=>u.id===id);
  const data=u=>({user:u,accessToken:`access-${u.id}`,refreshToken:`refresh-${u.id}`,expiresAt:now()+3600000});
  return {calls,async signin({email}){const u=users.find(u=>u.email===email);if(!u)throw Error('fixture identity required');return data(u);},async getUser(token){calls.push('getUser');return byId(token.slice(7));},async refresh(token){return data(byId(token.slice(8)));},async signout(){}};
}
async function call(api,path,{method='GET',body,headers={},cookie,csrf,sdk=false}={}) {
  const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{url:`/api/accounts${path}`,method,
    headers:{host:'127.0.0.1:3503',...(method==='POST'?{'content-type':'application/json',...(!sdk?{origin}:{})}:{}),...(cookie?{cookie}:{}),...(csrf?{'x-axp-csrf':csrf}:{}),...headers}});
  const out={status:0,headers:{},writeHead(status,headers){this.status=status;this.headers=headers;},end(text){this.body=JSON.parse(text);}};
  await api.handler(req,out);return out;
}
async function login(api,user) {
  const out=await call(api,'/auth/signin',{method:'POST',body:{email:user.email,password:'explicit-fixture-password'}});
  assert.equal(out.status,200);const cookie=out.headers['set-cookie'].split(';')[0];
  const session=await call(api,'/session',{cookie});return {cookie,csrf:session.body.csrf};
}
async function org(api,auth,name) {
  const out=await call(api,'/organizations',{...auth,method:'POST',body:{name}});assert.equal(out.status,201);return out.body.organization.id;
}
const input={name:'Independent campaign',productDescription:'Hardware wallet with offline key storage.',approvedText:'Sponsored: inspect the independently approved offer.',contextHints:['When comparing hardware wallets.'],declaredCapabilities:['hardware_wallet','offline_key_storage'],maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000',settlementNetwork:'solana-devnet'};
const appInput=name=>({name,website:'https://app.example.test/',allowedOrigins:['https://app.example.test'],blockedCategories:['gambling'],payout:null});
function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'axp-owned-api-'));let clock=Date.now();
  const now=()=>clock,store=createAccountStore({dir,now}),provider=providerFixture(now),api=createAccountsAPI({store,provider,origin,now});
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return {api,store,provider,advance:ms=>{clock+=ms;}};
}

test('owned API: two advertisers have private versioned campaigns; app-only accounts cannot invent advertiser ownership',async t=>{
  const {api}=fixture(t),a=await login(api,users[0]),b=await login(api,users[1]),p=await login(api,users[2]);
  const oa=await org(api,a,'Advertiser A'),ob=await org(api,b,'Advertiser B'),op=await org(api,p,'App owner');
  for(const [auth,id,name] of [[a,oa,'A'],[b,ob,'B']])assert.equal((await call(api,`/organizations/${id}/advertiser`,{...auth,method:'POST',body:{name,website:`https://${name.toLowerCase()}.example.test`,description:'Test declaration'}})).status,200);
  const made=await call(api,`/organizations/${oa}/campaigns`,{...a,method:'POST',body:input});assert.equal(made.status,201);
  const ca=made.body.campaign;assert.equal(ca.organizationId,oa);assert.equal(ca.version,1);assert.equal(ca.status,'draft');assert.equal(ca.servingStatus,'not_connected');
  assert.equal((await call(api,`/organizations/${ob}/campaigns`,b)).body.campaigns.length,0);
  for(const auth of [b,p])assert.equal((await call(api,`/organizations/${oa}/campaigns`,auth)).status,404);
  assert.equal((await call(api,`/organizations/${ob}/campaigns/${ca.id}`,b)).status,404);
  assert.equal((await call(api,`/organizations/${oa}/campaigns/${ca.id}/approve`,{...b,method:'POST',body:{expectedVersion:1}})).status,404);
  const approved=await call(api,`/organizations/${oa}/campaigns/${ca.id}/approve`,{...a,method:'POST',body:{expectedVersion:1}});assert.equal(approved.status,200);assert.equal(approved.body.campaign.status,'approved');assert.match(approved.body.campaign.approvedContentHash,/^[a-f0-9]{64}$/);
  const edit=await call(api,`/organizations/${oa}/campaigns/${ca.id}`,{...a,method:'POST',body:{...input,approvedText:'A changed approved creative.'}});assert.equal(edit.status,200);assert.equal(edit.body.campaign.version,2);assert.equal(edit.body.campaign.status,'draft');assert.equal(edit.body.campaign.approvedContentHash,null);
  const stale=await call(api,`/organizations/${oa}/campaigns/${ca.id}/approve`,{...a,method:'POST',body:{expectedVersion:1}});assert.equal(stale.status,409);assert.equal(stale.body.error,'campaign_version_conflict');
  const unchanged=await call(api,`/organizations/${oa}/campaigns/${ca.id}`,a);assert.equal(unchanged.body.campaign.status,'draft');assert.equal(unchanged.body.campaign.version,2);
  for(const body of [{},{expectedVersion:0},{expectedVersion:'2'},{expectedVersion:1.5},{expectedVersion:2147483648},{expectedVersion:2,version:2}])assert.equal((await call(api,`/organizations/${oa}/campaigns/${ca.id}/approve`,{...a,method:'POST',body})).status,400);
  for(const extra of [{organizationId:ob},{advertiserId:'forged'},{ownerId:users[1].id},{status:'active'},{version:99},{approvedContentHash:'a'.repeat(64)}])assert.equal((await call(api,`/organizations/${oa}/campaigns`,{...a,method:'POST',body:{...input,...extra}})).status,400);
  assert.equal((await call(api,`/organizations/${op}/campaigns`,{...p,method:'POST',body:input})).status,404);
  assert.equal((await call(api,`/organizations/${oa}/campaigns/${ca.id}/launch`,{...a,method:'POST',body:{}})).status,404);
  const caps=(await call(api,'/session',a)).body.capabilities;assert.equal(caps.campaignDrafts,true);assert.equal(caps.appCredentials,true);assert.equal(caps.campaignServing,false);assert.equal(caps.nativeFunding,false);
});

test('owned SDK: independent apps get bound credentials; genuine SDK fails open until serving exists; revoke/rotate/expiry enforced',async t=>{
  const {api,provider,advance}=fixture(t),a=await login(api,users[2]),b=await login(api,users[3]);
  const oa=await org(api,a,'App A owner'),ob=await org(api,b,'App B owner');
  const aa=(await call(api,`/organizations/${oa}/apps`,{...a,method:'POST',body:appInput('App A')})).body.app;
  const ab=(await call(api,`/organizations/${ob}/apps`,{...b,method:'POST',body:appInput('App B')})).body.app;
  const route=`/organizations/${oa}/apps/${aa.id}/credentials`;
  assert.equal((await call(api,route,{...b,method:'POST',body:{label:'foreign'}})).status,404);
  assert.equal((await call(api,`/organizations/${ob}/apps/${aa.id}/credentials`,b)).status,404);
  assert.equal((await call(api,route,{...a,method:'POST',body:{label:'forged',appId:ab.id}})).status,400);
  const issued=await call(api,route,{...a,method:'POST',body:{label:'App A integration'}});assert.equal(issued.status,201);assert.match(issued.body.apiKey,/^axp_app_[a-f0-9]{64}$/);
  const key=issued.body.apiKey,id=issued.body.credential.id;
  assert.equal(issued.body.credential.appId,aa.id);assert.equal(issued.body.credential.organizationId,oa);
  const listed=await call(api,route,a);assert.equal(listed.body.credentials.length,1);assert.ok(!JSON.stringify(listed.body).includes(key));assert.ok(!JSON.stringify(listed.body).includes('keyHash'));
  assert.equal((await call(api,`/organizations/${ob}/apps/${ab.id}/credentials`,b)).body.credentials.length,0);
  const headers={'x-axp-publisher-key':key},callsBefore=provider.calls.length;
  const config=await call(api,'/sdk/publisher/config',{headers});assert.equal(config.status,200);assert.equal(config.body.publisherId,`app:${aa.id}`);assert.equal(config.body.appId,aa.id);assert.deepEqual(config.body.blockedCategories,['gambling']);assert.equal(config.body.financialMode,'unfunded');assert.equal(config.body.servingEnabled,false);assert.equal(provider.calls.length,callsBefore);
  assert.equal((await call(api,'/sdk/publisher/config',{headers:{...headers,origin}})).status,403);
  assert.equal((await call(api,'/sdk/publisher/config')).status,401);
  const sdk=new AXPPublisher({apiKey:key,baseURL:`${origin}/api/accounts/sdk`,fetch:async(url,options)=>{
    const result=await call(api,new URL(url).pathname.slice('/api/accounts'.length),{sdk:true,method:options.method,headers:options.headers,body:options.body?JSON.parse(options.body):undefined});
    return new Response(JSON.stringify(result.body),{status:result.status});
  }});
  assert.deepEqual(await sdk.requestAd({question:'Compare hardware wallets.',sessionId:'s',turnId:'t'}),{status:'error',error:{code:'account_serving_not_connected',status:503}});
  await assert.rejects(()=>sdk.lookupOpportunity({sessionId:'s',turnId:'t'}),e=>e.code==='account_serving_not_connected');
  assert.equal((await call(api,`${route}/${id}/rotate`,{...b,method:'POST',body:{label:'foreign'}})).status,404);
  const rotated=await call(api,`${route}/${id}/rotate`,{...a,method:'POST',body:{label:'Replacement'}});assert.equal(rotated.status,200);assert.notEqual(rotated.body.apiKey,key);
  assert.equal((await call(api,'/sdk/publisher/config',{headers})).status,401);
  const headers2={'x-axp-publisher-key':rotated.body.apiKey};assert.equal((await call(api,'/sdk/publisher/config',{headers:headers2})).status,200);
  assert.equal((await call(api,`${route}/${id}/rotate`,{...a,method:'POST',body:{label:'Again'}})).status,409);
  assert.equal((await call(api,`${route}/${rotated.body.credential.id}/revoke`,{...a,method:'POST',body:{}})).status,200);
  assert.equal((await call(api,'/sdk/publisher/config',{headers:headers2})).status,401);
  const expiring=await call(api,route,{...a,method:'POST',body:{label:'Expiry test'}});assert.equal(expiring.status,201);advance(30*86400000+1);
  assert.equal((await call(api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':expiring.body.apiKey}})).status,401);
});

test('owned resources: durable hosted restart preserves campaigns/keys; logout invalidates owner access, not app server key',async()=>{
  const values=new Map(),kv={kind:'fixture',get:async k=>values.get(k)??null,compareAndSet:async(k,old,next)=>{if((values.get(k)??null)!==old)return false;values.set(k,next);return true;}};
  const config={AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNTS_ORIGIN:origin,AXP_STATE_KEY:Buffer.alloc(32,23).toString('base64')},provider=providerFixture(Date.now);
  let api=createHostedAccountsAPI({config,provider,kv});const auth=await login(api,users[0]),o=await org(api,auth,'Durable test');
  await call(api,`/organizations/${o}/advertiser`,{...auth,method:'POST',body:{name:'Owned',website:'https://owned.example.test',description:'Fixture'}});
  const c=(await call(api,`/organizations/${o}/campaigns`,{...auth,method:'POST',body:input})).body.campaign;
  const app=(await call(api,`/organizations/${o}/apps`,{...auth,method:'POST',body:appInput('Durable app')})).body.app;
  const key=(await call(api,`/organizations/${o}/apps/${app.id}/credentials`,{...auth,method:'POST',body:{label:'Durable key'}})).body.apiKey;
  api=createHostedAccountsAPI({config,provider,kv});
  assert.equal((await call(api,`/organizations/${o}/campaigns/${c.id}`,auth)).body.campaign.id,c.id);
  assert.equal((await call(api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':key}})).body.appId,app.id);
  assert.ok(!JSON.stringify([...values]).includes(key));
  assert.equal((await call(api,'/auth/signout',{...auth,method:'POST',body:{}})).status,200);
  assert.equal((await call(api,`/organizations/${o}/campaigns`,auth)).status,401);
  assert.equal((await call(api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':key}})).status,200);
});

test('campaign contract: matches existing capability IDs and enforces integer caps/normalized uniqueness',()=>{
  assert.deepEqual(CAMPAIGN_CAPABILITIES,CAPABILITIES.map(c=>c.id));
  for(const patch of [{maxBidBaseUnits:'0'},{maxBidBaseUnits:'0.004'},{maxBidBaseUnits:'4001'},{budgetCapBaseUnits:'3999'},{budgetCapBaseUnits:'100001'},{contextHints:['same',' same ']},{declaredCapabilities:['invented']},{settlementNetwork:'mainnet'}])assert.throws(()=>validateCampaignInput({...input,...patch}));
  assert.deepEqual(validateCampaignInput(input),input);
});
