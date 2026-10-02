// End-to-end: ONE real live run on Solana Devnet through the hosted API, with the
// delivery acknowledged by a real (headless) Chrome rendering the cards in its DOM.
// Spends real Jev + DeepSeek calls and Devnet test tokens. Requires AXP_E2E_LIVE=1.
//   AXP_E2E_LIVE=1 node scripts/hosted/e2e-live.mjs [--keep-artifacts artifacts/<dir>]
// Optional: AXP_CHROME_BIN, AXP_HOSTED_PORT (default 3197).
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot as root} from '../../packages/config/local.mjs';
import {createLiveClient} from '../../packages/hosted/client.mjs';
import {loadV3Bundle} from '../../packages/v3/bundle.mjs';

if(process.env.AXP_E2E_LIVE!=='1'){console.error('Set AXP_E2E_LIVE=1 to spend real model calls and Devnet test tokens.');process.exit(2);}
const port=Number(process.env.AXP_HOSTED_PORT??3197);
const keepIdx=process.argv.indexOf('--keep-artifacts'),keep=keepIdx>0?process.argv[keepIdx+1]:null;
// --base <url>: use an already running server (e.g. scripts/build-site/serve.mjs with AXP_SERVE_HARNESS=1).
const baseIdx=process.argv.indexOf('--base'),external=baseIdx>0?process.argv[baseIdx+1]:null;
if(keep&&(!/^artifacts\/[\w-]+$/.test(keep)||keep.startsWith('artifacts/v3/')))throw Error('artifact dir must be artifacts/<name>');
const chromeBin=process.env.AXP_CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(),log=(...a)=>console.error(`[${((Date.now()-t0)/1000).toFixed(0)}s]`,...a);

const base=external??`http://127.0.0.1:${port}`;
const server=external?null:spawn(process.execPath,['--no-warnings','scripts/hosted/dev-server.mjs'],{cwd:root,env:{...process.env,AXP_LIVE_ENABLED:'1',AXP_HOSTED_PORT:String(port)},stdio:['ignore','inherit','pipe']});
server?.stderr.on('data',d=>process.stderr.write(`  server| ${d}`));
const profile=mkdtempSync(join(tmpdir(),'axp-chrome-'));let chrome;
const cleanup=()=>{chrome?.kill('SIGTERM');server?.kill('SIGTERM');rmSync(profile,{recursive:true,force:true});};
process.on('exit',cleanup);
try {
  const client=createLiveClient({baseURL:base});
  for(let i=0;;i++){try{await client.config();break;}catch{if(i>40)throw Error('server_not_ready');await sleep(250);}}
  const cfg=await client.config();
  log('config',JSON.stringify({enabled:cfg.enabled,configured:cfg.configured,payers:Object.fromEntries(Object.entries(cfg.payers??{}).map(([k,v])=>[k,{tokenBaseUnits:v.tokenBaseUnits,lamports:v.lamports}]))}));
  if(!cfg.enabled)throw Error('live runs not enabled: check JEV/DeepSeek keys, wallets and funding');
  const before=new Set((await client.list()).map(r=>r.runId));
  chrome=spawn(chromeBin,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,`${base}/__live/#auto=1`],{stdio:'ignore'});
  log('headless Chrome opened the harness; it starts, drives and acknowledges the run');
  let run,last='';
  for(const deadline=Date.now()+25*60*1000;Date.now()<deadline;) {
    await sleep(3000);
    const fresh=(await client.list()).find(r=>!before.has(r.runId));if(!fresh)continue;
    run=await client.status(fresh.runId);
    const line=`${run.runId} ${run.phase}${run.error?` error=${run.error.code}#${run.error.attempt}`:''} charges=${run.status?.charges?.length??0}`;
    if(line!==last){log(line);last=line;}
    if(run.terminal)break;
  }
  if(!run?.terminal)throw Error(`run did not finish: ${run?.phase}`);
  const summary={runId:run.runId,phase:run.phase,abortReason:run.abortReason??null,bundle:run.bundle??null,elapsedSeconds:Math.round((Date.now()-t0)/1000),
    history:run.history.map(h=>`${h.phase}@${h.at}`),
    turns:run.status.turns.map(t=>({scenario:t.scenarioId,outcome:t.outcome?.status,bids:t.outcome?.bids?.map(b=>`${b.advertiser}:${b.amountBaseUnits}`)})),
    charges:run.status.charges.map(c=>`${c.campaignId}:${c.amountBaseUnits}`),
    payments:run.status.payments.map(p=>({advertiser:p.advertiser,settled:p.settledBaseUnits,refund:p.refundBaseUnits,...p.explorer})),
    model:run.status.model};
  if(run.phase==='completed') {
    // Validate the served bundle with the repository's own loader.
    const dir=keep?resolve(root,keep):mkdtempSync(join(tmpdir(),'axp-bundle-'));
    for(const f of run.files){const text=await fetch(`${base}/api/runs/${run.runId}/files/${f}`).then(r=>r.text());const p=join(dir,f);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,text);}
    const b=loadV3Bundle(join(dir,'replay'));summary.validatedBundleHash=b.bundleHash;summary.financialMode=b.manifest.financialMode;summary.storyGates=b.manifest.storyGates;
    if(keep)summary.savedTo=relative(root,dir);else rmSync(dir,{recursive:true,force:true});
  }
  console.log(JSON.stringify(summary,null,2));
  process.exitCode=run.phase==='completed'?0:1;
} catch(e) {console.error('e2e failed:',e.message);process.exitCode=1;}
finally {cleanup();}
