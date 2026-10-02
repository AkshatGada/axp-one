// Offline tests for the hosted live-run platform (no network, no keys, no signing).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {createFileKV,createUpstashKV} from '../../packages/hosted/kv.mjs';
import {packDirectory,unpackDirectory,keyedId} from '../../packages/hosted/vault.mjs';
import {generateWallets,validateWallets,base58,publicWallets,materializeWalletFiles} from '../../packages/hosted/wallets.mjs';
import {newRunId,tokenMatches,publicRecord,PUBLIC_FILES} from '../../packages/hosted/runner.mjs';
import {createHostedAPI,hostedSettings} from '../../packages/hosted/api.mjs';
import {createLiveClient,acknowledgeCard,LiveRunError} from '../../packages/hosted/client.mjs';
import {LIVE_RUN_PATTERN} from '../../packages/v3/devnet-live.mjs';

const tmp=()=>mkdtempSync(join(tmpdir(),'axp-hosted-test-'));

test('vault round-trips a run directory and rejects tampering or another run id', () => {
  const dir=tmp(),out=tmp(),key=randomBytes(32);
  mkdirSync(join(dir,'acceptance'),{recursive:true});writeFileSync(join(dir,'acceptance','a.sqlite'),Buffer.from([0,1,2,255]));writeFileSync(join(dir,'run-config.json'),'{"x":1}',{mode:0o600});
  const packed=packDirectory(dir,key,{aad:'run-1'});
  assert.equal(unpackDirectory(packed,out,key,{aad:'run-1'}),2);
  assert.deepEqual(readFileSync(join(out,'acceptance','a.sqlite')),Buffer.from([0,1,2,255]));
  assert.throws(()=>unpackDirectory(packed,tmp(),key,{aad:'run-2'}),/snapshot_authentication_failed/);
  const parts=packed.split('.');parts[3]=Buffer.from('tampered').toString('base64');
  assert.throws(()=>unpackDirectory(parts.join('.'),tmp(),key,{aad:'run-1'}),/snapshot_authentication_failed/);
  assert.throws(()=>unpackDirectory(packed,tmp(),randomBytes(32),{aad:'run-1'}),/snapshot_authentication_failed/);
  assert.equal(keyedId(key,'1.2.3.4'),keyedId(key,'1.2.3.4'));assert.notEqual(keyedId(key,'1.2.3.4'),keyedId(key,'1.2.3.5'));
  for(const d of [dir,out])rmSync(d,{recursive:true,force:true});
});

test('file KV: NX leases, TTL expiry, counters and lists', async () => {
  const dir=tmp(),kv=createFileKV({dir});
  assert.equal(await kv.set('lease','a',{nx:true,ttlSeconds:60}),true);
  assert.equal(await kv.set('lease','b',{nx:true,ttlSeconds:60}),false);
  assert.equal(await kv.get('lease'),'a');assert.equal(await kv.del('lease'),true);
  assert.equal(await kv.set('lease','c',{nx:true,ttlSeconds:0.001}),true);await new Promise(r=>setTimeout(r,20));
  assert.equal(await kv.get('lease'),null);assert.equal(await kv.set('lease','d',{nx:true,ttlSeconds:60}),true);
  assert.equal(await kv.incr('n',10),1);assert.equal(await kv.incr('n',10),2);
  await kv.lpush('l','x',2);await kv.lpush('l','y',2);await kv.lpush('l','z',2);assert.deepEqual(await kv.lrange('l',0,-1),['z','y']);
  rmSync(dir,{recursive:true,force:true});
});

test('Upstash KV sends REST commands with the bearer token', async () => {
  const calls=[];const fetchImpl=async(url,init)=>{calls.push({url,init});const cmd=JSON.parse(init.body);return new Response(JSON.stringify({result:cmd[0]==='SET'?'OK':cmd[0]==='INCR'?1:null}),{status:200});};
  const kv=createUpstashKV({url:'https://example.upstash.io',token:'t0ken',fetchImpl});
  assert.equal(await kv.set('k','v',{ttlSeconds:5,nx:true}),true);await kv.incr('c',60);
  assert.deepEqual(JSON.parse(calls[0].init.body),['SET','k','v','EX','5','NX']);
  assert.equal(calls[0].init.headers.Authorization,'Bearer t0ken');
  assert.deepEqual(calls.slice(1).map(c=>JSON.parse(c.init.body)[0]),['INCR','EXPIRE']);
  assert.throws(()=>createUpstashKV({url:'http://insecure',token:'x'}),/kv_config_invalid/);
});

test('hosted wallets: generation, keypair validation, public projection, private files', () => {
  assert.equal(base58(new Uint8Array(32)),'1'.repeat(32));
  const w=generateWallets();validateWallets(w);
  const bad=structuredClone(w);bad.payers['v3-clearvault-channel'].secret[1]^=1;assert.throws(()=>validateWallets(bad),/wallet_keypair_mismatch|wallet_address_mismatch/);
  const p=publicWallets(w);assert.ok(!JSON.stringify(p).includes('secret'));
  const files=materializeWalletFiles(w,'v3-devnet-live-test');
  try{for(const path of Object.values(files.paths)){const f=JSON.parse(readFileSync(path,'utf8'));assert.equal(f.publisher.address,w.publisher.address);}}finally{files.dispose();}
  assert.ok(Object.values(files.paths).every(p=>!existsSync(p)));
});

test('run ids fit the live-run pattern; run tokens compare by hash; public records hide hashes', () => {
  for(let i=0;i<20;i++)assert.match(newRunId(),LIVE_RUN_PATTERN);
  const token=randomBytes(24).toString('hex'),h=createHashHex(token);
  assert.equal(tokenMatches(token,h),true);assert.equal(tokenMatches(randomBytes(24).toString('hex'),h),false);assert.equal(tokenMatches('short',h),false);
  const r=publicRecord({runId:'v3-devnet-live-x',phase:'delivery',tokenHash:h,ipHash:'abc',status:{awards:[{awardId:'a',status:'reserved'}]},history:[],files:[]});
  assert.equal(r.tokenHash,undefined);assert.equal(r.ipHash,undefined);assert.deepEqual(r.pendingAwards,['a']);
  assert.ok(PUBLIC_FILES.includes('replay/run.json')&&!PUBLIC_FILES.some(f=>/secret|sqlite|pem|terms/.test(f)));
});
import {createHash} from 'node:crypto';
function createHashHex(v){return createHash('sha256').update(v).digest('hex');}

test('settings default to bounded caps', () => {
  const s=hostedSettings({});assert.equal(s.enabled,false);assert.equal(s.dailyCap,20);assert.equal(s.ipDailyCap,3);assert.equal(s.maxActive,1);
  assert.equal(hostedSettings({AXP_LIVE_DAILY_CAP:'999999'}).dailyCap,20);
});

test('API without live enablement: config, refusals and validation through the client', async () => {
  const root=tmp(),kv=createFileKV({dir:join(root,'kv')});
  const api=createHostedAPI({config:{AXP_STATE_KEY:randomBytes(32).toString('base64'),AXP_DEVNET_WALLETS_PATH:join(root,'missing.json')},root,kv,log:()=>{}});
  const server=createServer(api.handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,client=createLiveClient({baseURL:base});
  try {
    const cfg=await client.config();assert.equal(cfg.enabled,false);assert.equal(cfg.configured.wallets,false);assert.equal(cfg.configured.walletError,'wallets_unavailable');
    await assert.rejects(client.start(),e=>e instanceof LiveRunError&&e.code==='live_runs_unconfigured'&&e.status===503);
    const health=await fetch(`${base}/api/health`).then(r=>r.json());assert.equal(health.live,false);
    assert.equal((await fetch(`${base}/api/nope`)).status,404);
    assert.equal((await fetch(`${base}/api/runs`,{method:'DELETE'})).status,405);
    const cross=await fetch(`${base}/api/runs`,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);
    const big=await fetch(`${base}/api/runs`,{method:'POST',body:'x'.repeat(20000)});assert.equal(big.status,413);
    assert.equal((await fetch(`${base}/api/cron/sweep`)).status,403);
  } finally {server.close();rmSync(root,{recursive:true,force:true});}
});

test('acknowledgeCard only posts after the DOM shows the label and the exact creative', async () => {
  const posted=[];const client={render:async(...a)=>{posted.push(a);return {ok:true};}};
  const award={awardId:'award-1',creativeText:'Exact copy',creativeHash:'f'.repeat(64)};
  const node=(label,copy,connected=true)=>({isConnected:connected,querySelector:s=>s==='[data-sponsored-label]'?{textContent:label}:s==='[data-creative-copy]'?{textContent:copy}:null});
  await assert.rejects(acknowledgeCard(client,'r','t',award,node('Sponsored','Exact copy',false)),/card_not_in_document/);
  await assert.rejects(acknowledgeCard(client,'r','t',award,node('Ad','Exact copy')),/sponsored_label_missing/);
  await assert.rejects(acknowledgeCard(client,'r','t',award,node('Sponsored','Edited copy')),/creative_text_mismatch/);
  await acknowledgeCard(client,'r','t',award,node('Sponsored','Exact copy'));
  assert.deepEqual(posted,[['r','award-1',{domInserted:true,sponsoredLabelPresent:true,creativeHash:'f'.repeat(64)},'t']]);
});

// ---------- state machine with a fake engine (no models, no chain) ----------
import {createRunner} from '../../packages/hosted/runner.mjs';
const AWARD='award-00000000-0000-0000-0000-000000000001';
function fakeEngine(behavior={}) {
  return ({liveDir,artifactDir})=>{
    const path=join(liveDir,'fake.json');
    const st=()=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{opened:[],closed:[],awards:[]};
    const save=v=>{mkdirSync(liveDir,{recursive:true});writeFileSync(path,JSON.stringify(v));};
    const ids=['v3-clearvault-channel','v3-keyforge-channel'];
    return {
      prepare:async()=>save(st()),
      openChannel:async id=>{if(behavior.openFails){const e=new Error('rpc_http_429');e.code='rpc_http_429';throw e;}const s=st();s.opened.push(id);save(s);return {status:'finalized'};},
      organicAll:async()=>['cached','offline','repeat','mobile'].map(scenarioId=>({status:'completed',scenarioId})),
      runScenario:async id=>{if(id==='cached'){const s=st();s.awards.push({awardId:AWARD,status:'reserved',creativeHash:'a'.repeat(64),creativeText:'copy'});save(s);}},
      authorizePending:async()=>[],
      publicStatus:()=>({awards:st().awards,turns:[],charges:[],payments:[]}),
      acknowledge:async awardId=>{const s=st();s.awards.find(a=>a.awardId===awardId).status='delivered';save(s);return {chargeId:'charge-1',replayed:false};},
      failAward:async awardId=>{const s=st();s.awards.find(a=>a.awardId===awardId).status='failed';save(s);},
      closeChannel:async id=>{const s=st();if(s.opened.includes(id))s.closed.push(id);save(s);return {status:'finalized'};},
      channelStates:()=>{const s=st();return Object.fromEntries(ids.filter(id=>s.opened.includes(id)).map(id=>[id,{open:'finalized',close:s.closed.includes(id)?'finalized':null}]));},
      verify:async()=>{mkdirSync(artifactDir,{recursive:true});writeFileSync(join(artifactDir,'chain-check.json'),'{"ok":true}');},
      restart:async()=>{},exportBundle:async()=>({bundleHash:'b'.repeat(64),storyGates:{failed:[]},charges:1}),reconcileChannel:async()=>({}),
    };
  };
}
function runnerWith(behavior,{clock}={}) {
  const dir=tmp(),kv=createFileKV({dir}),w=generateWallets(),t={now:Date.now()};
  const runner=createRunner({kv,stateKey:randomBytes(32),wallets:w,config:{},signingEnabled:true,modelsEnabled:true,deliveryWindowSeconds:60,now:clock??(()=>t.now),engineFactory:fakeEngine(behavior)});
  return {runner,kv,t,cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}

test('runner: phases advance under a lease, state persists between steps, browser ack needs the run token', async () => {
  const {runner,kv,cleanup}=runnerWith({});
  try {
    const {record,runToken}=await runner.create({ipHash:'x'});
    const phases=[];for(let i=0;i<3;i++)phases.push((await runner.advance(record.runId)).record.phase);
    assert.deepEqual(phases,['opening','auctions','delivery']);
    const waiting=await runner.advance(record.runId);assert.equal(waiting.record.phase,'delivery');assert.deepEqual(publicRecord(waiting.record).pendingAwards,[AWARD]);
    await assert.rejects(runner.acknowledge(record.runId,AWARD,{},randomBytes(24).toString('hex')),e=>e.code==='run_token_invalid'&&e.status===403);
    await kv.set(`axp:run:${record.runId}:lease`,'other',{nx:true,ttlSeconds:60});
    assert.equal((await runner.advance(record.runId)).busy,true);
    await assert.rejects(runner.acknowledge(record.runId,AWARD,{},runToken),e=>e.code==='run_busy_retry');
    await kv.del(`axp:run:${record.runId}:lease`);
    const ack=await runner.acknowledge(record.runId,AWARD,{},runToken);assert.equal(ack.receipt.chargeId,'charge-1');
    for(const expected of ['closing','finalizing','completed'])assert.equal((await runner.advance(record.runId)).record.phase,expected);
    const done=await runner.getRecord(record.runId);assert.equal(done.bundle.charges,1);assert.ok(done.files.includes('chain-check.json'));
    assert.equal(await runner.file(record.runId,'chain-check.json'),'{"ok":true}\n'.trim());
    assert.equal(await runner.file(record.runId,'acceptance/payments.sqlite'),null);
    assert.equal((await runner.advance(record.runId)).record.phase,'completed');
  } finally {cleanup();}
});

test('runner: an expired delivery window fails the award (no charge) and closes', async () => {
  const {runner,t,cleanup}=runnerWith({});
  try {
    const {record}=await runner.create({ipHash:'x'});
    for(let i=0;i<3;i++)await runner.advance(record.runId);
    t.now+=61_000;
    const r=(await runner.advance(record.runId)).record;assert.equal(r.phase,'closing');
    assert.equal(r.status.awards[0].status,'failed');assert.equal(r.history.at(-1).failedAwards,1);
  } finally {cleanup();}
});

test('runner: repeated open failures abort through closing, never past settlement', async () => {
  const {runner,cleanup}=runnerWith({openFails:true});
  try {
    const {record}=await runner.create({ipHash:'x'});
    let r=(await runner.advance(record.runId)).record;assert.equal(r.phase,'opening');
    for(let i=0;i<4&&r.phase==='opening';i++)r=(await runner.advance(record.runId)).record;
    assert.equal(r.phase,'closing');assert.equal(r.abortReason,'rpc_http_429');
    r=(await runner.advance(record.runId)).record;assert.equal(r.phase,'aborted');
  } finally {cleanup();}
});

// ---------- Vercel Blob backend against an in-memory fake of the Blob REST API ----------
import {createBlobKV,createKVFromConfig} from '../../packages/hosted/kv.mjs';
function fakeBlob() {
  const blobs=new Map();let n=0;const calls=[];
  const err=(status,code,message)=>new Response(JSON.stringify({error:{code,message}}),{status});
  const fetchImpl=async(url,init={})=>{
    const u=new URL(url),h=init.headers??{};calls.push({method:init.method??'GET',url:u.pathname+u.search,h});
    if(u.hostname.endsWith('.private.blob.vercel-storage.com')){
      if(h.authorization!=='Bearer vercel_blob_rw_store1_secret')return new Response('',{status:403});
      const b=blobs.get(u.pathname.slice(1));if(!b)return new Response('',{status:404});
      return new Response(b.body,{status:200,headers:{etag:b.etag}});
    }
    if(init.method==='PUT'){
      const pathname=u.searchParams.get('pathname'),cur=blobs.get(pathname);
      if(h['x-vercel-blob-access']!=='private'||h['x-add-random-suffix']!=='0')return err(400,'bad_request','bad options');
      if(h['x-if-match']){if(!cur||cur.etag!==h['x-if-match'])return err(412,'precondition_failed','etag');}
      else if(cur&&h['x-allow-overwrite']!=='1')return err(400,'bad_request','This blob already exists');
      const etag=`"e${++n}"`;blobs.set(pathname,{body:init.body,etag});return new Response(JSON.stringify({pathname,etag}),{status:200});
    }
    if(init.method==='POST'&&u.pathname.endsWith('/delete')){for(const x of JSON.parse(init.body).urls)blobs.delete(new URL(x).pathname.slice(1));return new Response('{}',{status:200});}
    return err(404,'not_found','');
  };
  return {fetchImpl,blobs,calls};
}

test('Blob KV: create-if-absent leases, expiry takeover, ETag counters, private uncached reads', async () => {
  const f=fakeBlob(),kv=createBlobKV({token:'vercel_blob_rw_store1_secret',fetchImpl:f.fetchImpl});
  assert.equal(await kv.set('axp:run:x:lease','a',{nx:true,ttlSeconds:60}),true);
  assert.equal(await kv.set('axp:run:x:lease','b',{nx:true,ttlSeconds:60}),false);
  assert.equal(await kv.get('axp:run:x:lease'),'a');
  await kv.del('axp:run:x:lease');assert.equal(await kv.get('axp:run:x:lease'),null);
  assert.equal(await kv.set('axp:l','old',{nx:true,ttlSeconds:0.001}),true);await new Promise(r=>setTimeout(r,10));
  assert.equal(await kv.get('axp:l'),null);assert.equal(await kv.set('axp:l','new',{nx:true,ttlSeconds:60}),true);assert.equal(await kv.get('axp:l'),'new');
  const counts=await Promise.all(Array.from({length:5},()=>kv.incr('axp:day:d',100)));
  assert.deepEqual(counts.sort(),[1,2,3,4,5]);assert.equal(await kv.get('axp:day:d'),'5');
  await kv.lpush('axp:runs','r1',2);await kv.lpush('axp:runs','r2',2);await kv.lpush('axp:runs','r3',2);assert.deepEqual(await kv.lrange('axp:runs',0,-1),['r3','r2']);
  await kv.set('axp:run:x','record');await kv.set('axp:run:x:state','snapshot');
  assert.equal(await kv.get('axp:run:x'),'record');assert.equal(await kv.get('axp:run:x:state'),'snapshot');
  assert.ok(f.blobs.has('axp-hosted/axp/run/x.json')&&f.blobs.has('axp-hosted/axp/run/x/state.json'));
  assert.ok(f.calls.filter(c=>c.method==='GET').every(c=>c.url.endsWith('?cache=0')),'reads bypass the cache');
  assert.ok(f.calls.filter(c=>c.method==='PUT').every(c=>c.h['x-vercel-blob-access']==='private'));
  assert.throws(()=>createBlobKV({token:'nope'}),/blob_config_invalid/);
});

test('store selection: Blob preferred, Upstash by config, none on Vercel without a store', () => {
  const blob={BLOB_READ_WRITE_TOKEN:'vercel_blob_rw_store1_secret'},up={KV_REST_API_URL:'https://x.upstash.io',KV_REST_API_TOKEN:'t'};
  assert.equal(createKVFromConfig({...blob,...up},{root:'/tmp'}).kind,'blob');
  assert.equal(createKVFromConfig({...blob,...up,AXP_RUN_STORE:'upstash'},{root:'/tmp'}).kind,'upstash');
  assert.equal(createKVFromConfig(up,{root:'/tmp'}).kind,'upstash');
  assert.equal(createKVFromConfig({VERCEL:'1'},{root:'/tmp'}),null);
});

test('API on Vercel without a store: live off, config and run list still answer 200', async () => {
  const api=createHostedAPI({config:{VERCEL:'1',AXP_LIVE_ENABLED:'1',JEV_API_KEY:'x'.repeat(30),DEEPSEEK_API_KEY:'y'.repeat(30)},root:tmp(),log:()=>{}});
  const cfg=await api.route('GET','/api/live/config',{body:{},ip:'',headers:{}});
  assert.equal(cfg.status,200);assert.equal(cfg.body.enabled,false);assert.equal(cfg.body.configured.storeError,'store_unconfigured');
  assert.deepEqual((await api.route('GET','/api/runs',{body:{},ip:'',headers:{}})).body,{runs:[]});
  await assert.rejects(api.route('POST','/api/runs',{body:{},ip:'',headers:{}}),e=>e.status===503);
});
