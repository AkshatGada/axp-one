import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createSupabaseNetworkCatalog} from '../packages/accounts/network-catalog.mjs';

const id=n=>`${n}0000000-0000-4000-8000-000000000001`;
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const input={name:'Campaign',productDescription:'Hardware wallet',approvedText:'Keep keys offline.',contextHints:['offline storage'],declaredCapabilities:['hardware_wallet'],maxBidBaseUnits:'40',budgetCapBaseUnits:'1000',settlementNetwork:'solana-devnet'};
const approvedContentHash=createHash('sha256').update(canonical(input)).digest('hex');
const campaign={id:id(1),organizationId:id(2),advertiserId:id(3),version:1,status:'approved',input,approvedContentHash,createdAt:1000,updatedAt:1001,servingStatus:'not_connected'};
const advertiser={id:id(3),name:'Snapshot brand',website:'https://brand.test/'};
const enrollment={campaignId:id(1),organizationId:id(2),version:1,approvedContentHash,enabled:true,financialMode:'synthetic',updatedAt:1002};
const row={campaign,advertiser,enrollment};
const secretKey='sb_secret_fixture_0123456789';
function fixture(response=[row]) {
  const calls=[];
  const catalog=createSupabaseNetworkCatalog({url:'https://fixture.supabase.co',secretKey,fetchImpl:async(url,options)=>{
    calls.push({url,options});const result=typeof response==='function'?await response():response;
    return result instanceof Response?result:new Response(JSON.stringify(result));
  }});
  return {catalog,calls};
}
test('real catalogue has only fixed no-argument read capability with separate secret, no human/app Bearer',async()=>{
  const f=fixture();assert.deepEqual(Object.keys(f.catalog),['networkCampaigns']);
  assert.deepEqual(await f.catalog.networkCampaigns(),[row]);
  assert.equal(f.calls[0].url,'https://fixture.supabase.co/rest/v1/rpc/axp_network_campaigns');
  assert.deepEqual(f.calls[0].options.headers,{apikey:secretKey,'content-type':'application/json'});
  assert.equal(f.calls[0].options.body,'{}');assert.equal(f.calls[0].options.method,'POST');
  assert.equal(f.calls[0].options.redirect,'error');assert.ok(f.calls[0].options.signal instanceof AbortSignal);
  assert.deepEqual(await fixture([]).catalog.networkCampaigns(),[]);
});
test('secret-only configuration rejects publishable, human JWT, app key and unsafe URLs before I/O',()=>{
  for(const key of [undefined,null,'','sb_publishable_fixture_0123456789','eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature','axp_app_'+'a'.repeat(64),'sb_secret_short',secretKey+'\n'])
    assert.throws(()=>createSupabaseNetworkCatalog({url:'https://fixture.supabase.co',secretKey:key}),/network_catalog_secret_key_required/);
  for(const url of ['http://fixture.supabase.co','https://evil.test','https://fixture.supabase.co/path','https://fixture.supabase.co/?secret=x','https://fixture.supabase.co/#hash','https://user:secret@fixture.supabase.co'])
    assert.throws(()=>createSupabaseNetworkCatalog({url,secretKey}),/network_catalog_configuration_required/);
});
test('trusted response projects exact DTOs, strips unknown private columns and never aliases upstream state',async()=>{
  const f=fixture([{...row,private_key:secretKey,campaign:{...campaign,ownerId:id(9),budgetLedger:'private'},
    advertiser:{...advertiser,description:'private',organizationId:id(2)},enrollment:{...enrollment,advertiserName:'private',raw_key:'private'}}]);
  const result=await f.catalog.networkCampaigns();assert.deepEqual(result,[row]);
  result[0].campaign.input.contextHints.push('not persistent');
  assert.deepEqual(await f.catalog.networkCampaigns(),[row]);
  assert.equal(JSON.stringify(result).includes(secretKey),false);
});
test('catalogue fails closed on stale, draft, disabled, wrong hash, binding, rail/metadata and >100/duplicate rows',async()=>{
  const invalid=[null,{},[null],[{}],Array(101).fill(row),[row,row],
    [{...row,enrollment:{...enrollment,enabled:false}}],
    [{...row,enrollment:{...enrollment,version:2}}],
    [{...row,enrollment:{...enrollment,campaignId:id(9)}}],
    [{...row,enrollment:{...enrollment,organizationId:id(9)}}],
    [{...row,enrollment:{...enrollment,financialMode:'devnet'}}],
    [{...row,campaign:{...campaign,status:'draft'}}],
    [{...row,campaign:{...campaign,approvedContentHash:'b'.repeat(64)},enrollment:{...enrollment,approvedContentHash:'b'.repeat(64)}}],
    [{...row,campaign:{...campaign,input:{...input,settlementNetwork:'mainnet'}}}],
    [{...row,campaign:{...campaign,input:{...input,approvedText:'Changed'}}}],
    [{...row,campaign:{...campaign,createdAt:-1}}],
    [{...row,advertiser:{...advertiser,id:id(9)}}],
    [{...row,advertiser:{...advertiser,name:''}}],
    [{...row,advertiser:{...advertiser,website:'https://user:secret@brand.test/'}}],
    [{...row,advertiser:{...advertiser,website:'http://brand.test/'}}],
    [{...row,advertiser:{...advertiser,website:'http://localhost:1234/'}}],
  ];
  for(const response of invalid)await assert.rejects(()=>fixture(response).catalog.networkCampaigns(),/network_catalog_invalid/);
});
test('missing migration, denied grant, invalid JSON and network errors never fall back or expose upstream secrets',async()=>{
  for(const [code,status,expected] of [['PGRST202',404,'network_catalog_migration_required'],['42883',404,'network_catalog_migration_required'],['42501',403,'network_catalog_unavailable'],['',401,'network_catalog_unavailable'],['',500,'network_catalog_unavailable']]) {
    const f=fixture(new Response(JSON.stringify({code,message:`SQL includes ${secretKey}`,details:'private JWT'}),{status}));
    await assert.rejects(()=>f.catalog.networkCampaigns(),e=>e.code===expected&&e.message===expected&&e.status===503&&!JSON.stringify(e).includes(secretKey));
  }
  await assert.rejects(()=>fixture(new Response('not JSON')).catalog.networkCampaigns(),/network_catalog_invalid/);
  await assert.rejects(()=>fixture(()=>{throw Error(secretKey);}).catalog.networkCampaigns(),/network_catalog_unavailable/);
});
test('SQL artefacts declare narrow role-only catalogue, owner invoker, explicit revokes and rollback acceptance',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261012_axp_account_serving.sql',import.meta.url),'utf8');
  const acceptance=readFileSync(new URL('../supabase/tests/account_serving.sql',import.meta.url),'utf8');
  assert.match(sql,/axp_account_serving_operation\(operation text,payload jsonb[\s\S]*?security invoker set search_path = ''/);
  assert.match(sql,/axp_network_campaigns\(\) returns jsonb[\s\S]*?security definer set search_path = ''/);
  assert.match(sql,/grant execute on function public\.axp_network_campaigns\(\) to service_role;/);
  assert.doesNotMatch(sql,/grant .* on (?:all|schema)/i);
  assert.doesNotMatch(sql,/grant (?:select|insert|update|delete).* to service_role;/i);
  assert.match(sql,/limit 100/);
  assert.match(acceptance,/rollback;\s*$/);assert.doesNotMatch(acceptance,/^commit;/m);
});
