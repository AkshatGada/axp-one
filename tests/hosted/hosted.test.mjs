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
