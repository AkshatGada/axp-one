// Operator-only packaging: prepares encrypted data and a bounded Preview wrapper.
// No provider, deployment, KV cloud write, wallet read, signature or transfer.
import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync,readdirSync,statSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createFileKV} from '../../packages/hosted/kv.mjs';
import {createHostedProductWorkspace,productStateKey} from '../../packages/product/hosted.mjs';
import {stateKeyFrom} from '../../packages/hosted/vault.mjs';
import {VERSION,WORKSPACE,assertPreview,validateBudget} from './runtime.mjs';

export async function preparePreviewVerification({config,source,output,scratch}){
 assertPreview(config);source=resolve(source);output=resolve(output);scratch=resolve(scratch);
 if([output,scratch].some(path=>path===source||path.startsWith(source+sep)))throw Error('verification_paths_overlap');
 if(['payment-worker.lock','tempo-payment-worker.lock'].some(name=>existsSync(join(source,name))))throw Error('verification_local_worker_running');
 if(!output.endsWith(`${join('functions','api','index.func')}`)||!existsSync(join(output,'packages/product/hosted.mjs')))throw Error('verification_function_output_required');
 const key=stateKeyFrom(config,{root:process.cwd(),allowLocalKey:false}),budget=validateBudget(JSON.parse(readFileSync(join(source,'verification-budget.json'),'utf8'))),db=new DatabaseSync(join(source,'exchange.sqlite'),{readOnly:true});let campaigns;
 try{const runs=db.prepare('SELECT run,data FROM runs').all();if(runs.length!==1||runs[0].run!=='product-devnet-v1'||JSON.parse(runs[0].data).mode!=='devnet')throw Error('verification_run_mismatch');campaigns=db.prepare('SELECT data FROM product_campaigns WHERE run=?').all('product-devnet-v1').map(r=>JSON.parse(r.data));}finally{db.close();}
 if(campaigns.length!==3||campaigns.filter(c=>c.settlementNetwork==='tempo-testnet').length!==2||campaigns.filter(c=>(c.settlementNetwork??'solana-devnet')==='solana-devnet').length!==1||campaigns.some(c=>!c.approved||BigInt(c.depositBaseUnits)>BigInt(c.settlementNetwork==='tempo-testnet'?'50000':'20000')))throw Error('verification_campaign_bounds');
 const names=readdirSync(source).filter(n=>statSync(join(source,n)).isFile()).sort(),sourceHash=createHash('sha256');for(const name of names){sourceHash.update(name);sourceHash.update(readFileSync(join(source,name)));}sourceHash.update(key);const fingerprint=sourceHash.digest('hex'),target=join(output,'initial-tempo-verification.json');let manifest;
 if(existsSync(target)){manifest=JSON.parse(readFileSync(target,'utf8'));if(manifest.version!==VERSION||manifest.sourceHash!==fingerprint)throw Error('verification_package_exists');}
 else{mkdirSync(scratch,{recursive:true,mode:0o700});const scratchDir=mkdtempSync(join(scratch,'package-'));try{const kv=createFileKV({dir:join(scratchDir,'kv')});const snapshots=[];for(const kind of ['financial','organic']){const workspace=createHostedProductWorkspace({kv,stateKey:key,id:WORKSPACE,kind});await workspace.importDirectory(source);snapshots.push({key:productStateKey(WORKSPACE,kind),value:await kv.get(productStateKey(WORKSPACE,kind))});}manifest={version:VERSION,workspace:WORKSPACE,sourceHash:fingerprint,campaignIds:campaigns.map(c=>c.id),budget,snapshots};writeFileSync(target,JSON.stringify(manifest),{mode:0o600,flag:'wx'});}finally{rmSync(scratchDir,{recursive:true,force:true});}}
 const runtimeDir=join(output,'scripts/tempo');mkdirSync(runtimeDir,{recursive:true});copyFileSync(fileURLToPath(new URL('./runtime.mjs',import.meta.url)),join(runtimeDir,'runtime.mjs'));
 writeFileSync(join(output,'index.mjs'),`import {readFileSync} from 'node:fs';\nimport {createPreviewVerificationHandler} from './scripts/tempo/runtime.mjs';\nconst manifest=JSON.parse(readFileSync(new URL('./initial-tempo-verification.json',import.meta.url),'utf8'));\nlet instance;\nexport default async function(req,res){try{instance??=createPreviewVerificationHandler({manifest}).catch(e=>{instance=null;throw e;});return await (await instance)(req,res);}catch(e){if(!res.headersSent){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:typeof e.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'verification_unavailable'}));}}}\n`,{mode:0o600});
 return {version:VERSION,workspace:WORKSPACE,campaigns:campaigns.length,prepared:true,providerCalls:0,signed:false,deployed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');if(!arg.startsWith('--')||i<3)throw Error('Use --name=value');return [arg.slice(2,i),arg.slice(i+1)];}));if(args.authorized!=='tempo-preview-phase4'||!args.config||!args.source||!args.output||!args.scratch)throw Error('Required --authorized=tempo-preview-phase4 --config=path --source=path --output=functions/api/index.func --scratch=ignored-path');
 console.log(JSON.stringify(await preparePreviewVerification({config:parseEnv(readFileSync(resolve(args.config),'utf8')),source:args.source,output:args.output,scratch:args.scratch})));
}
