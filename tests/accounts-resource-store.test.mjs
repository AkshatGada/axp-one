import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {APP_SCOPES, RESOURCE_LIMITS, createAppKey} from '../packages/accounts/resources.mjs';

const START=1800000000000;
const input=(extra={})=>({name:'Fixture campaign',productDescription:'Hardware wallet',approvedText:'Keep keys offline.',contextHints:['offline storage'],declaredCapabilities:['hardware_wallet'],maxBidBaseUnits:'40',budgetCapBaseUnits:'1000',settlementNetwork:'solana-devnet',...extra});
function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'axp-resource-store-'));
  let time=START,store=createAccountStore({dir,now:()=>time});
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  const owners=['alice','bob'].map(id=>{
    store.ensureUser({id,email:`${id}@example.test`});
    const org=store.createOrganization(id,{name:`${id} org`});
    const advertiser=store.saveAdvertiser(id,org.id,{name:`${id} advertiser`,website:`https://${id}.test`,description:'Declared only'});
    const app=store.saveApp(id,org.id,{name:`${id} app`,website:`https://${id}.test`,allowedOrigins:[`https://${id}.test`],blockedCategories:[id==='alice'?'gambling':'alcohol'],payout:null});
    return {id,org,advertiser,app};
  });
  return {dir,owners,get store(){return store;},time(value){time=value;},reopen(){store.close();store=createAccountStore({dir,now:()=>time});return store;}};
}
const error=(fn,code,status)=>assert.throws(fn,e=>e.code===code&&e.message===code&&e.status===status);
const issue=(f,owner,key=createAppKey())=>({key,credential:f.store.issueAppCredential(owner.id,owner.org.id,owner.app.id,{label:'Server key',keyHash:key.keyHash})});

test('campaigns derive independent advertiser bindings, version every edit, approve exact saved content, and restart',t=>{
  const f=fixture(t),[a,b]=f.owners,s=f.store;
  const ca=s.saveCampaign(a.id,a.org.id,input()),cb=s.saveCampaign(b.id,b.org.id,input({settlementNetwork:'tempo-testnet'}));
  assert.equal(ca.advertiserId,a.advertiser.id);assert.equal(cb.advertiserId,b.advertiser.id);
  assert.equal(ca.version,1);assert.equal(ca.status,'draft');assert.equal(ca.servingStatus,'not_connected');
  const approved=s.approveCampaign(a.id,a.org.id,ca.id,ca.version);
  const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
  assert.equal(approved.approvedContentHash,createHash('sha256').update(canonical(ca.input)).digest('hex'));
  assert.equal(s.approveCampaign(a.id,a.org.id,ca.id,1).version,1);
  f.time(START+1000);
  const changed=s.saveCampaign(a.id,a.org.id,input(),ca.id);
  assert.equal(changed.version,2);assert.equal(changed.status,'draft');assert.equal(changed.approvedContentHash,null);
  error(()=>s.approveCampaign(a.id,a.org.id,ca.id,1),'campaign_version_conflict',409);
  assert.equal(s.campaign(a.id,a.org.id,ca.id).status,'draft');
  assert.equal(s.campaign(a.id,a.org.id,ca.id).approvedContentHash,null);
  for(const invalid of [undefined,null,0,-1,1.5,'2',Infinity,Number.MAX_SAFE_INTEGER+1])error(()=>s.approveCampaign(a.id,a.org.id,ca.id,invalid),'invalid_input',400);
  assert.equal(changed.createdAt,START);assert.equal(changed.updatedAt,START+1000);
  assert.deepEqual(s.campaigns(b.id,b.org.id),[cb]);
  changed.input.contextHints.push('Mutation is not persistence');
  assert.deepEqual(f.reopen().campaign(a.id,a.org.id,ca.id).input,input());
});

test('foreign/missing resources, app-org swaps, and ownership/version/status/hash injection fail closed',t=>{
  const f=fixture(t),[a,b]=f.owners,s=f.store,c=s.saveCampaign(a.id,a.org.id,input()),{credential}=issue(f,a);
  const other=s.createOrganization(a.id,{name:'Other org'});
  for(const orgId of [a.org.id,'missing',null]) {
    for(const fn of [()=>s.campaigns(b.id,orgId),()=>s.campaign(b.id,orgId,c.id),()=>s.saveCampaign(b.id,orgId,input(),c.id),()=>s.approveCampaign(b.id,orgId,c.id),()=>s.appCredentials(b.id,orgId,a.app.id),()=>s.issueAppCredential(b.id,orgId,a.app.id,{label:'Bad',keyHash:'a'.repeat(64)}),()=>s.revokeAppCredential(b.id,orgId,a.app.id,credential.id),()=>s.rotateAppCredential(b.id,orgId,a.app.id,credential.id,{label:'Bad',keyHash:'b'.repeat(64)})])error(fn,'not_found',404);
  }
  for(const orgId of [other.id,b.org.id]) {
    const owner=orgId===other.id?a:b;
    error(()=>s.campaign(owner.id,orgId,c.id),'not_found',404);
    error(()=>s.appCredentials(owner.id,orgId,a.app.id),'not_found',404);
    error(()=>s.revokeAppCredential(owner.id,orgId,owner.app.id,credential.id),'not_found',404);
  }
  for(const field of ['id','userId','ownerId','advertiserId','organizationId','version','status','approvedContentHash','servingStatus'])error(()=>s.saveCampaign(a.id,a.org.id,input({[field]:'forged'})),'unknown_field',400);
  error(()=>s.issueAppCredential(a.id,a.org.id,a.app.id,{label:'Bad',keyHash:'a'.repeat(64),appId:b.app.id}),'unknown_field',400);
  error(()=>s.issueAppCredential(a.id,a.org.id,a.app.id,{label:'Bad',keyHash:createAppKey().apiKey}),'invalid_input',400);
  error(()=>s.saveCampaign(a.id,other.id,input()),'not_found',404);
});

test('credentials are hash-only, isolated per app, stable after restart, and resolve current restrictions',t=>{
  const f=fixture(t),[a,b]=f.owners,{credential:ca,key:ka}=issue(f,a),{credential:cb,key:kb}=issue(f,b);
  assert.equal(ca.publisherId,`app:${a.app.id}`);assert.deepEqual(ca.scopes,APP_SCOPES);
  assert.equal(ca.expiresAt,START+RESOURCE_LIMITS.keyLifetimeMs);assert.equal(ca.revokedAt,null);
  assert.deepEqual(f.store.appCredentials(a.id,a.org.id,a.app.id),[ca]);
  assert.deepEqual(f.store.resolveAppCredential(ka.keyHash),{credential:ca,app:a.app});
  assert.equal(f.store.resolveAppCredential(ka.apiKey),null);assert.equal(f.store.resolveAppCredential('x'.repeat(64)),null);
  const reopened=f.reopen();
  assert.deepEqual(reopened.resolveAppCredential(kb.keyHash),{credential:cb,app:b.app});
  const app=reopened.saveApp(a.id,a.org.id,{name:'Updated',website:'https://alice.test',allowedOrigins:['https://new.test'],blockedCategories:['politics'],payout:null},a.app.id);
  assert.deepEqual(reopened.resolveAppCredential(ka.keyHash).app,app);
  const dto=JSON.stringify([reopened.appCredentials(a.id,a.org.id,a.app.id),reopened.resolveAppCredential(ka.keyHash)]);
  for(const secret of [ka.apiKey,kb.apiKey,ka.keyHash,kb.keyHash,'keyHash','key_hash'])assert.equal(dto.includes(secret),false);
  f.store.close();
  const bytes=readFileSync(join(f.dir,'accounts.sqlite'));
  assert.equal(bytes.includes(Buffer.from(ka.apiKey)),false);assert.equal(bytes.includes(Buffer.from(ka.keyHash)),true);
});

test('active quota is app-specific, rotation at cap atomic, duplicate/invalid rotations roll back, revocation irreversible',t=>{
  const f=fixture(t),[a,b]=f.owners,first=issue(f,a),keys=[first];
  for(let i=1;i<10;i++)keys.push(issue(f,a));
  error(()=>issue(f,a),'limit_exceeded',409);assert.ok(issue(f,b).credential);
  const duplicate=keys[1].key.keyHash;
  error(()=>f.store.rotateAppCredential(a.id,a.org.id,a.app.id,first.credential.id,{label:'Duplicate',keyHash:duplicate}),'credential_hash_conflict',409);
  error(()=>f.store.rotateAppCredential(a.id,a.org.id,a.app.id,first.credential.id,{label:'Invalid',keyHash:'bad'}),'invalid_input',400);
  assert.notEqual(f.store.resolveAppCredential(first.key.keyHash),null);
  const key=createAppKey(),rotated=f.store.rotateAppCredential(a.id,a.org.id,a.app.id,first.credential.id,{label:'Replacement',keyHash:key.keyHash});
  assert.notEqual(rotated.id,first.credential.id);assert.equal(f.store.resolveAppCredential(first.key.keyHash),null);
  assert.equal(f.store.appCredentials(a.id,a.org.id,a.app.id).filter(k=>k.revokedAt===null).length,10);
  error(()=>f.store.rotateAppCredential(a.id,a.org.id,a.app.id,first.credential.id,{label:'Again',keyHash:createAppKey().keyHash}),'credential_not_active',409);
  const revoked=f.store.revokeAppCredential(a.id,a.org.id,a.app.id,rotated.id);f.time(START+1000);
  assert.deepEqual(f.store.revokeAppCredential(a.id,a.org.id,a.app.id,rotated.id),revoked);
  assert.equal(f.store.resolveAppCredential(key.keyHash),null);
  const db=new DatabaseSync(join(f.dir,'accounts.sqlite'));
  try {assert.throws(()=>db.prepare('UPDATE account_app_credentials SET revokedAt=NULL WHERE id=?').run(rotated.id),/immutable_credential/);}finally{db.close();}
  assert.equal(f.reopen().resolveAppCredential(key.keyHash),null);
});

test('expiry boundary denies resolution/rotation, releases quota, and campaign quota permits edits only',t=>{
  const f=fixture(t),[a]=f.owners,keys=[];
  for(let i=0;i<10;i++)keys.push(issue(f,a));
  f.time(START+RESOURCE_LIMITS.keyLifetimeMs-1);assert.notEqual(f.store.resolveAppCredential(keys[0].key.keyHash),null);
  f.time(START+RESOURCE_LIMITS.keyLifetimeMs);assert.equal(f.store.resolveAppCredential(keys[0].key.keyHash),null);
  error(()=>f.store.rotateAppCredential(a.id,a.org.id,a.app.id,keys[0].credential.id,{label:'Expired',keyHash:createAppKey().keyHash}),'credential_not_active',409);
  assert.ok(issue(f,a).credential);
  const first=f.store.saveCampaign(a.id,a.org.id,input());
  for(let i=1;i<100;i++)f.store.saveCampaign(a.id,a.org.id,input({name:`Campaign ${i}`}));
  error(()=>f.store.saveCampaign(a.id,a.org.id,input()),'limit_exceeded',409);
  assert.equal(f.store.saveCampaign(a.id,a.org.id,input(),first.id).version,2);
});

test('resource validator rejects private content, money/shape overflows and unsupported capabilities without mutation',t=>{
  const f=fixture(t),[a]=f.owners;
  for(const [extra,code] of [[{approvedText:'private@example.test'},'private_content'],[{maxBidBaseUnits:'4001'},'spend_limit_exceeded'],[{budgetCapBaseUnits:'100001'},'spend_limit_exceeded'],[{maxBidBaseUnits:1},'spend_limit_exceeded'],[{contextHints:['same','same']},'invalid_input'],[{name:'😀'.repeat(61)},'invalid_input'],[{declaredCapabilities:['unsupported']},'invalid_input'],[{settlementNetwork:'mainnet'},'invalid_input']])error(()=>f.store.saveCampaign(a.id,a.org.id,input(extra)),code,400);
  assert.deepEqual(f.store.campaigns(a.id,a.org.id),[]);
});
