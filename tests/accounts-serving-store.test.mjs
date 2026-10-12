import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createSupabaseAccountStore} from '../packages/accounts/supabase-store.mjs';

const input = extra => ({name: 'Fixture campaign', productDescription: 'Hardware wallet', approvedText: 'Keep keys offline.',
  contextHints: ['offline storage'], declaredCapabilities: ['hardware_wallet'], maxBidBaseUnits: '40',
  budgetCapBaseUnits: '1000', settlementNetwork: 'solana-devnet', ...extra});
const fields = ['campaignId','organizationId','version','approvedContentHash','enabled','financialMode','updatedAt'];
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'axp-serving-'));
  let time = 1000, store = createAccountStore({dir, now: () => time});
  const owners = ['alice', 'bob'].map(id => {
    store.ensureUser({id, email: `${id}@example.test`});
    const org = store.createOrganization(id, {name: id});
    const advertiser = store.saveAdvertiser(id, org.id, {name: id, website: `https://${id}.test`, description: 'Fixture'});
    const campaign = store.saveCampaign(id, org.id, input());
    return {id, org, advertiser, campaign};
  });
  t.after(() => {store.close(); rmSync(dir, {recursive: true, force: true});});
  return {get store() {return store;}, owners, tick() {time++;}, reopen() {store.close(); store = createAccountStore({dir, now: () => time}); return store;}};
}
const error = (fn, code, status) => assert.throws(fn, e => e.code === code && e.status === status);
const set = (s, owner, enabled, expectedVersion = 1) => s.setCampaignServing(owner.id, owner.org.id, owner.campaign.id, {expectedVersion, enabled});
const approve = (s, owner, version = 1) => s.approveCampaign(owner.id, owner.org.id, owner.campaign.id, version);
const read = (s, owner) => s.campaignServing(owner.id, owner.org.id, owner.campaign.id);

test('fixture enrollment requires exact saved approval, preserves original campaign, frozen metadata and restart', t => {
  const f = fixture(t), [a,b] = f.owners, s = f.store;
  assert.equal(read(s,a), null); assert.deepEqual(s.networkCampaigns(), []);
  error(() => set(s,a,true), 'campaign_approval_required', 409);
  assert.equal(read(s,a), null);
  const original = approve(s,a);
  f.tick();
  const enrollment = set(s,a,true);
  assert.deepEqual(Object.keys(enrollment), fields);
  assert.deepEqual(enrollment, {campaignId:a.campaign.id, organizationId:a.org.id, version:1,
    approvedContentHash:original.approvedContentHash, enabled:true, financialMode:'synthetic', updatedAt:1001});
  assert.deepEqual(s.campaign(a.id,a.org.id,a.campaign.id), original, 'enrollment never edits campaigns');
  assert.equal(read(s,b), null);
  assert.deepEqual(s.networkCampaigns(), [{campaign:original, advertiser:{id:a.advertiser.id,name:'alice',website:'https://alice.test/'}, enrollment}]);
  enrollment.enabled = false;
  const result = s.networkCampaigns(); result[0].campaign.input.contextHints.push('mutation'); result[0].advertiser.name = 'mutation';
  assert.equal(read(f.reopen(),a).enabled, true);
  assert.deepEqual(f.store.networkCampaigns()[0].campaign, original);
  f.tick(); set(f.store,a,false);
  assert.deepEqual(f.store.networkCampaigns(), []);
  assert.deepEqual(f.store.campaign(a.id,a.org.id,a.campaign.id), original);
});

test('edits invalidate opt-in; stale approval/enrollment and reapproval cannot resurrect it', t => {
  const f=fixture(t),[a]=f.owners,s=f.store;
  approve(s,a); const old=set(s,a,true);
  const changed=s.saveCampaign(a.id,a.org.id,input(),a.campaign.id);
  assert.equal(changed.version,2); assert.equal(changed.status,'draft');
  assert.equal(read(s,a).enabled,false); assert.equal(read(s,a).version,1);
  assert.equal(read(s,a).approvedContentHash,old.approvedContentHash);
  for(const enabled of [true,false])error(()=>set(s,a,enabled,1),'campaign_version_conflict',409);
  error(()=>approve(s,a,1),'campaign_version_conflict',409);
  error(()=>set(s,a,true,2),'campaign_approval_required',409);
  const disabled=set(s,a,false,2); assert.equal(disabled.approvedContentHash,null);
  approve(s,a,2); assert.deepEqual(s.networkCampaigns(),[]);
  assert.equal(read(f.reopen(),a).enabled,false);
  set(f.store,a,true,2); assert.equal(f.store.networkCampaigns()[0].enrollment.version,2);
  f.store.saveCampaign(a.id,a.org.id,input({approvedText:'A new offer'}),a.campaign.id);
  approve(f.store,a,3); assert.deepEqual(f.store.networkCampaigns(),[]);
});

test('advertiser snapshots stay fixed while enabled; explicit pause/re-enable captures the new profile', t => {
  const f=fixture(t),[a,b]=f.owners,s=f.store;
  approve(s,a);approve(s,b);set(s,a,true);set(s,b,true);
  s.saveAdvertiser(a.id,a.org.id,{name:'New brand',website:'https://new.test',description:'Changed profile'});
  set(s,a,true);
  assert.equal(s.networkCampaigns().find(row=>row.campaign.id===a.campaign.id).advertiser.name,'alice');
  set(s,a,false);assert.equal(s.networkCampaigns().length,1);
  set(s,a,true);
  assert.deepEqual(s.networkCampaigns().find(row=>row.campaign.id===a.campaign.id).advertiser,
    {id:a.advertiser.id,name:'New brand',website:'https://new.test/'});
});

test('foreign owners/org-campaign swaps, malformed and injected enrollment inputs fail without mutation', t => {
  const f=fixture(t),[a,b]=f.owners,s=f.store;
  approve(s,a);
  for(const [user,org,campaign] of [[b.id,a.org.id,a.campaign.id],[b.id,b.org.id,a.campaign.id],[a.id,a.org.id,b.campaign.id],[a.id,'missing',a.campaign.id],[a.id,a.org.id,null]]) {
    error(()=>s.campaignServing(user,org,campaign),'not_found',404);
    error(()=>s.setCampaignServing(user,org,campaign,{enabled:true,expectedVersion:1}),'not_found',404);
  }
  for(const version of [null,undefined,'1',0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1])
    error(()=>s.setCampaignServing(a.id,a.org.id,a.campaign.id,{enabled:true,expectedVersion:version}),'invalid_input',400);
  for(const enabled of [null,undefined,'true',1,0,{}])error(()=>set(s,a,enabled),'invalid_input',400);
  for(const field of ['campaignId','organizationId','advertiserId','approvedContentHash','financialMode','updatedAt','name','budgetCapBaseUnits','ownerId'])
    error(()=>s.setCampaignServing(a.id,a.org.id,a.campaign.id,{enabled:true,expectedVersion:1,[field]:'forged'}),'unknown_field',400);
  assert.equal(read(s,a),null);assert.deepEqual(s.networkCampaigns(),[]);
});

test('fixture catalogue combines owners and rails, explicitly approved/enabled only, bounded at 100', t => {
  const f=fixture(t),[a,b]=f.owners,s=f.store;
  for(let i=0;i<105;i++) {
    const owner=i<99?a:b;
    const c=s.saveCampaign(owner.id,owner.org.id,input({name:`Extra ${i}`,settlementNetwork:i%2?'tempo-testnet':'solana-devnet'}));
    s.approveCampaign(owner.id,owner.org.id,c.id,1);
    s.setCampaignServing(owner.id,owner.org.id,c.id,{enabled:true,expectedVersion:1});
  }
  const result=s.networkCampaigns(); assert.equal(result.length,100);
  assert.equal(new Set(result.map(r=>r.campaign.id)).size,100);
  assert.deepEqual(new Set(result.map(r=>r.campaign.input.settlementNetwork)),new Set(['tempo-testnet','solana-devnet']));
  assert.deepEqual(result,s.networkCampaigns());
});

const uid='10000000-0000-4000-8000-000000000001',orgId='20000000-0000-4000-8000-000000000001',campaignId='30000000-0000-4000-8000-000000000001';
const metadata={campaignId,organizationId:orgId,version:1,approvedContentHash:'a'.repeat(64),enabled:true,financialMode:'synthetic',updatedAt:1000};
function supabase(t, respond=()=>metadata) {
  const calls=[],sessions={close(){},ensureUser(){}};
  const store=createSupabaseAccountStore({sessions,url:'https://fixture.supabase.co',key:'sb_publishable_fixture_0123456789',fetchImpl:async(url,options)=>{
    calls.push({url,options,body:JSON.parse(options.body)});
    const result=await respond(calls.at(-1));return result instanceof Response?result:new Response(JSON.stringify(result));
  }});
  t.after(()=>store.close());
  store.bindIdentity({id:uid,email:'owner@example.test'},'human-fixture-jwt');
  return {store,calls};
}

test('Supabase owner methods use only publishable key + human JWT and the fixed invoker RPC; catalogue is absent', async t => {
  const f=supabase(t,call=>call.body.operation==='campaignServing'?null:{...metadata,advertiser_name:'private snapshot',ledger:'not metadata'}),s=f.store;
  assert.equal(s.networkCampaigns,undefined);
  assert.equal(await s.campaignServing(uid,orgId,campaignId),null);
  assert.deepEqual(await s.setCampaignServing(uid,orgId,campaignId,{expectedVersion:1,enabled:true}),metadata);
  assert.deepEqual(f.calls.map(call=>call.body),[
    {operation:'campaignServing',payload:{orgId,campaignId}},
    {operation:'setCampaignServing',payload:{orgId,campaignId,expectedVersion:1,enabled:true}},
  ]);
  for(const call of f.calls) {
    assert.equal(call.url,'https://fixture.supabase.co/rest/v1/rpc/axp_account_serving_operation');
    assert.equal(call.options.headers.authorization,'Bearer human-fixture-jwt');
    assert.equal(call.options.headers.apikey,'sb_publishable_fixture_0123456789');
    assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);
    assert.equal(Object.hasOwn(call.body.payload,'userId'),false);
  }
});

test('Supabase enrollment validates identities and inputs before I/O and projects only bound valid metadata',async t=>{
  const f=supabase(t),s=f.store;
  error(()=>s.campaignServing('foreign',orgId,campaignId),'authentication_required',401);
  error(()=>s.setCampaignServing(uid,orgId,'bad',{expectedVersion:1,enabled:true}),'not_found',404);
  error(()=>s.setCampaignServing(uid,orgId,campaignId,{expectedVersion:0,enabled:true}),'invalid_input',400);
  error(()=>s.setCampaignServing(uid,orgId,campaignId,{expectedVersion:1,enabled:'true'}),'invalid_input',400);
  error(()=>s.setCampaignServing(uid,orgId,campaignId,{expectedVersion:1,enabled:true,ownerId:uid}),'unknown_field',400);
  assert.equal(f.calls.length,0);
  for(const row of [{},null,{...metadata,campaignId:orgId},{...metadata,organizationId:uid},{...metadata,enabled:1},
    {...metadata,financialMode:'devnet'},{...metadata,approvedContentHash:null},{...metadata,version:0},{...metadata,version:2},
    {...metadata,enabled:false},{...metadata,updatedAt:-1}])
    await assert.rejects(()=>supabase(t,()=>row).store.setCampaignServing(uid,orgId,campaignId,{expectedVersion:1,enabled:true}),/profile_database_invalid/);
});

test('Supabase serving preserves safe stale/approval errors and fails closed on missing migration/transport',async t=>{
  for(const [code,message,expected] of [['PT409','campaign_version_conflict','campaign_version_conflict'],['PT409','campaign_approval_required','campaign_approval_required'],
    ['PT404','not_found','not_found'],['PGRST202','private missing function','profile_database_migration_required'],['42501','private SQL text','profile_database_unavailable']]) {
    const f=supabase(t,()=>new Response(JSON.stringify({code,message,details:'secret'}),{status:code==='PT409'?409:404}));
    await assert.rejects(()=>f.store.setCampaignServing(uid,orgId,campaignId,{expectedVersion:1,enabled:true}),e=>e.message===expected&&e.code===expected);
  }
  await assert.rejects(()=>supabase(t,()=>{throw Error('private secret');}).store.campaignServing(uid,orgId,campaignId),/profile_database_unavailable/);
});
