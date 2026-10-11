// Preview packaging and cross-shard admission use fixtures only, never providers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,statSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Readable} from 'node:stream';
import {preparePreviewVerification} from '../../scripts/tempo/prepare-preview-verification.mjs';
import {VERSION,WORKSPACE,installPreviewState,budgetKey,boundedProvider,createPreviewVerificationHandler,readPreviewVerification,assertPreview} from '../../scripts/tempo/runtime.mjs';
import {productStateKey} from '../../packages/product/hosted.mjs';
import {unpackDirectory} from '../../packages/hosted/vault.mjs';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';

const budget=()=>({schemaVersion:'axp.tempo-verification-budget.v1',maxUSD:1,maxJev:40,maxAnswers:12,reservedMicroUSD:0,attempts:[]});
const config=()=>({VERCEL_ENV:'preview',AXP_PRODUCT_WORKSPACE_ID:WORKSPACE,AXP_STATE_KEY:randomBytes(32).toString('base64'),AXP_PRODUCT_ENABLED:'1',AXP_PRODUCT_FINANCIAL_MODE:'devnet'});
const temporary=t=>{const dir=mkdtempSync(join(tmpdir(),'axp-tempo-preview-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};
function memory(){const values=new Map();return {values,kind:'fixture',get:async key=>values.get(key)??null,compareAndSet:async(key,expected,value)=>{if((values.get(key)??null)!==expected)return false;values.set(key,value);return true;}};}
function manifest(){return {version:VERSION,workspace:WORKSPACE,campaignIds:['tempo-live','tempo-zero','sol-regression'],sourceHash:'offline-fixture',budget:budget(),snapshots:['financial','organic'].map(kind=>({key:productStateKey(WORKSPACE,kind),value:JSON.stringify({schemaVersion:'axp.hosted-product-state.v1',snapshot:'v1.fixture',revision:1,lease:null})}))};}
function seededBudget(kv,b){kv.values.set(budgetKey(),JSON.stringify(b));}
const code=expected=>error=>error.code===expected||error.message===expected;

test('Preview migration refuses production, wrong namespace, version and conflicting state before writes',async()=>{
 for(const c of [{...config(),VERCEL_ENV:'production'},{...config(),AXP_PRODUCT_WORKSPACE_ID:'demo'}]){const kv=memory();await assert.rejects(installPreviewState({config:c,kv,manifest:manifest()}),code('verification_preview_required'));assert.equal(kv.values.size,0);}
 const kv=memory(),m=manifest();await assert.rejects(installPreviewState({config:config(),kv,manifest:{...m,version:'other'}}),code('verification_preview_required'));assert.equal(kv.values.size,0);
 kv.values.set(m.snapshots[1].key,'unrelated existing financial history');await assert.rejects(installPreviewState({config:config(),kv,manifest:m}),code('verification_import_conflict'));assert.equal(kv.values.size,1);
 assert.throws(()=>assertPreview(config(),'wrong'),code('verification_preview_required'));
});

test('Preview seed is CAS-idempotent and cold starts preserve progressed financial state and budget',async()=>{
 const kv=memory(),m=manifest(),c=config();await Promise.all([installPreviewState({config:c,kv,manifest:m}),installPreviewState({config:c,kv,manifest:m})]);assert.equal(kv.values.size,4);
 const state=JSON.stringify({...JSON.parse(m.snapshots[0].value),revision:50,snapshot:'v1.progressed-obligations'});kv.values.set(m.snapshots[0].key,state);
 const progressed=budget();progressed.attempts.push({kind:'jev',status:'unknown',reservedMicroUSD:15000,at:new Date().toISOString()});progressed.reservedMicroUSD=15000;seededBudget(kv,progressed);
 await installPreviewState({config:c,kv,manifest:m});assert.equal(await kv.get(m.snapshots[0].key),state);assert.deepEqual(JSON.parse(await kv.get(budgetKey())),progressed);
 await assert.rejects(installPreviewState({config:c,kv,manifest:{...m,sourceHash:'different-source'}}),code('verification_import_conflict'));
 kv.values.delete(m.snapshots[0].key);await assert.rejects(installPreviewState({config:c,kv,manifest:m}),code('verification_state_missing'));assert.equal(await kv.get(m.snapshots[0].key),null);
});

test('cross-shard CAS budget admits one of concurrent final answer slots and preserves full reservations',async()=>{
 const kv=memory(),b=budget();for(let i=0;i<11;i++)b.attempts.push({kind:'answer',status:'completed',reservedMicroUSD:30000,at:new Date().toISOString()});b.reservedMicroUSD=330000;seededBudget(kv,b);let calls=0;
 const run=boundedProvider({kv,kind:'answer',source:async()=>{calls++;await Promise.resolve();return {usage:{inputTokens:10}};}}),results=await Promise.allSettled([run({}),run({})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'verification_budget_exhausted');
 const saved=JSON.parse(await kv.get(budgetKey()));assert.equal(saved.reservedMicroUSD,360000);assert.equal(saved.attempts.length,12);assert.equal(saved.attempts.at(-1).status,'completed');
});

test('failed provider has one call and permanent unknown reservation; stale in-flight state blocks both providers',async()=>{
 const kv=memory();seededBudget(kv,budget());let calls=0;const failed=boundedProvider({kv,kind:'jev',source:async()=>{calls++;throw Object.assign(Error('private provider text'),{code:'provider_timeout'});}});await assert.rejects(failed({}),code('provider_timeout'));
 const saved=JSON.parse(await kv.get(budgetKey()));assert.equal(saved.reservedMicroUSD,15000);assert.equal(saved.attempts[0].status,'unknown');assert.equal(saved.attempts[0].reason,'provider_timeout');
 await assert.rejects(failed({}),code('verification_provider_uncertain'));assert.equal(calls,1);
 const b=budget();b.reservedMicroUSD=30000;b.attempts=[{kind:'answer',status:'admitted',reservedMicroUSD:30000,at:'2026-10-11T00:00:00Z'}];seededBudget(kv,b);
 await assert.rejects(boundedProvider({kv,kind:'jev',now:()=>Date.parse('2026-10-11T00:01:01Z'),source:async()=>{calls++;}})({}),code('verification_provider_uncertain'));assert.equal(calls,1);
});

async function packagedFixture(t){
 const root=temporary(t),source=join(root,'source'),output=join(root,'functions/api/index.func'),scratch=join(root,'scratch'),c=config();mkdirSync(join(output,'packages/product'),{recursive:true});writeFileSync(join(output,'packages/product/hosted.mjs'),'// copied build fixture');
 // Real local product service creates valid publisher identity and drafts; only
 // payment readiness is stubbed because packaging must never sign or broadcast.
 const ids={payer:'offline-sol-payer',payee:'offline-sol-payee'},worker=()=>({identities:ids,status:()=>({ready:false,signingEnabled:false,...ids}),projection:()=>null,evidence:()=>null,dispose(){}});
 const service=createProductService({stateDir:source,runId:'product-devnet-v1',financialMode:'devnet',paymentOptions:{solanaFactory:worker}});service.saveAccount({name:'Offline proof workspace',websiteURL:'https://example.test/'});
 const idsCreated=[];for(const network of ['tempo-testnet','tempo-testnet','solana-devnet']){const {id,label,exampleQuestion,...draft}=PRESETS[0],item=service.saveCampaign({...draft,settlementNetwork:network,depositBaseUnits:network==='tempo-testnet'?'50000':'20000'}).campaign;service.approve(item.id);idsCreated.push(item.id);}service.close();
 writeFileSync(join(source,'verification-budget.json'),JSON.stringify(budget()),{mode:0o600});writeFileSync(join(source,'operator-private.txt'),'NEVER INCLUDE THIS OPERATOR SECRET',{mode:0o600});mkdirSync(join(source,'secrets'));writeFileSync(join(source,'secrets/wallet.json'),'NEVER INCLUDE WALLET PRIVATE KEY');
 await preparePreviewVerification({config:c,source,output,scratch});return {root,source,output,scratch,config:c,manifest:JSON.parse(readFileSync(join(output,'initial-tempo-verification.json'),'utf8')),ids:idsCreated,worker};
}

test('stopped fixture packaging encrypts both shards, preserves receipt/key identity, excludes secrets and safely reuses exact package',async t=>{
 const f=await packagedFixture(t),path=join(f.output,'initial-tempo-verification.json'),before=readFileSync(path,'utf8');assert.equal(statSync(path).mode&0o777,0o600);assert.equal(f.manifest.campaignIds.length,3);assert.ok(existsSync(join(f.output,'scripts/tempo/runtime.mjs')));assert.ok(!before.includes('PRIVATE KEY'));assert.ok(!before.includes('NEVER INCLUDE'));
 for(const row of f.manifest.snapshots){const kind=row.key.includes(':organic:')?'organic':'financial',dir=join(f.root,kind);mkdirSync(dir);unpackDirectory(JSON.parse(row.value).snapshot,dir,Buffer.from(f.config.AXP_STATE_KEY,'base64'),{aad:`axp.hosted-product-state.v1:${WORKSPACE}:${kind}`});assert.equal(readFileSync(join(dir,'publisher-receipt.pem'),'utf8'),readFileSync(join(f.source,'publisher-receipt.pem'),'utf8'));assert.equal(readFileSync(join(dir,'publisher-api-key'),'utf8'),readFileSync(join(f.source,'publisher-api-key'),'utf8'));assert.equal(existsSync(join(dir,'secrets')),false);assert.equal(existsSync(join(dir,'operator-private.txt')),false);}
 await preparePreviewVerification({config:f.config,source:f.source,output:f.output,scratch:f.scratch});assert.equal(readFileSync(path,'utf8'),before);
 writeFileSync(join(f.source,'tempo-payment-worker.lock'),'fixture process');await assert.rejects(preparePreviewVerification({config:f.config,source:f.source,output:f.output,scratch:f.scratch}),code('verification_local_worker_running'));
});

test('Preview wrapper freezes campaign edits and unknown payment IDs while allowing imported launch; GET never calls providers',async t=>{
 const f=await packagedFixture(t),kv=memory();f.config.AXP_PRODUCT_DEVNET_SIGN='1';let providerCalls=0,launches=0;const worker=()=>({...f.worker(),status:()=>({ready:true,signingEnabled:true}),async freeze(){launches++;return {status:'blocked',reason:'offline_no_signer'};}});
 const handler=await createPreviewVerificationHandler({config:f.config,root:f.root,manifest:f.manifest,kv,sources:{jev:async()=>{providerCalls++;},answer:async()=>{providerCalls++;}},serviceOptions:{paymentOptions:{identities:{payer:'offline-sol-payer',payee:'offline-sol-payee'},solanaFactory:worker}}});
 async function request(path,body,csrf){const req=Object.assign(Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]),{url:`/api/product${path}`,method:body===undefined?'GET':'POST',headers:{host:'example.test','content-type':'application/json',...(csrf?{'x-axp-csrf':csrf}:{})}}),res={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};await handler(req,res);return res;}
 const boot=await request('/bootstrap');assert.equal(boot.status,200);const csrf=boot.body.csrf;
 for(const path of ['/campaigns',`/campaigns/${f.ids[0]}/approve`,`/campaigns/${f.ids[0]}/duplicate`,'/campaigns/unlisted/close'])assert.equal((await request(path,{},csrf)).body.error,'verification_campaigns_frozen');
 const key=productStateKey(WORKSPACE),prior=await kv.get(key);assert.equal((await request('/state')).status,200);assert.equal(await kv.get(key),prior);assert.equal(providerCalls,0);
 const before=new Map(kv.values),proof=await request('/verification');assert.equal(proof.status,200);assert.equal(proof.body.version,VERSION);assert.equal(proof.body.workspace,WORKSPACE);assert.deepEqual([...proof.body.campaignIds].sort(),[...f.ids].sort());assert.equal(proof.body.verificationBounds.tempo.maxChannels,2);assert.equal(proof.body.verificationBounds.solana.importedCampaigns,1);assert.equal(proof.body.budget.reservedMicroUSD,0);assert.equal(proof.body.packageFingerprint.length,64);assert.deepEqual(kv.values,before);assert.equal(providerCalls,0);assert.equal(launches,0);assert.equal((await request('/verification',{},csrf)).status,405);assert.deepEqual(kv.values,before);
 const launch=await request(`/campaigns/${f.ids[2]}/launch`,{},csrf);assert.notEqual(launch.body.error,'verification_campaigns_frozen');assert.equal(launches,1);assert.equal(providerCalls,0);
});

test('Preview verification redacts arbitrary budget fields, reads latest usage and never writes KV',async()=>{
 const kv=memory(),m=manifest(),c=config();await installPreviewState({config:c,kv,manifest:m});const b=budget();b.reservedMicroUSD=15000;b.attempts=[{kind:'jev',status:'completed',reservedMicroUSD:15000,at:'2026-10-11T00:00:00Z',completedAt:'2026-10-11T00:00:01Z',secret:'PRIVATE PROVIDER BODY',usage:{input_tokens:50,output_tokens:10,apiKey:'PRIVATE PROVIDER KEY',prompt:'PRIVATE QUESTION',bad_tokens:-1}}];b.walletHashes={private:'PRIVATE WALLET HASH'};seededBudget(kv,b);const before=new Map(kv.values);kv.compareAndSet=()=>{throw Error('read proof must never write');};
 const proof=await readPreviewVerification({config:c,kv,manifest:m});assert.deepEqual(proof.budget.counts,{jev:1,answer:0,completed:1,admitted:0,unknown:0});assert.deepEqual(proof.budget.attempts[0].usage,{input_tokens:50,output_tokens:10});assert.equal(proof.budget.reservedMicroUSD,15000);assert.equal(JSON.stringify(proof).includes('PRIVATE'),false);assert.equal(JSON.stringify(proof).includes('v1.fixture'),false);assert.deepEqual(kv.values,before);
 await assert.rejects(readPreviewVerification({config:{...c,VERCEL_ENV:'production'},kv,manifest:m}),code('verification_preview_required'));assert.deepEqual(kv.values,before);
});

test('packaging refuses wrong run and oversized collateral without touching destination',async t=>{
 const f=await packagedFixture(t);rmSync(join(f.output,'initial-tempo-verification.json'));const db=new DatabaseSync(join(f.source,'exchange.sqlite'));const row=db.prepare('SELECT id,data FROM product_campaigns LIMIT 1').get(),campaign=JSON.parse(row.data);campaign.depositBaseUnits='50001';db.prepare('UPDATE product_campaigns SET data=? WHERE id=?').run(JSON.stringify(campaign),row.id);db.close();await assert.rejects(preparePreviewVerification({config:f.config,source:f.source,output:f.output,scratch:f.scratch}),code('verification_campaign_bounds'));assert.equal(existsSync(join(f.output,'initial-tempo-verification.json')),false);
});
