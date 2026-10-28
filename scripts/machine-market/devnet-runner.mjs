/** Minimal one-run launch/binding entry. Execution requires the authorized run reference. */
import {existsSync,readFileSync,writeFileSync,realpathSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {manifestTemplate,hash,GENESIS,ENDPOINT} from '../../packages/machine-market/devnet/manifest.mjs';
import {createDevnetPlan} from '../../packages/machine-market/devnet/plan.mjs';
import {createDevnetRunner} from '../../packages/machine-market/devnet/runner.mjs';
import {createDevnetResourceProbe} from '../../packages/machine-market/devnet/resources.mjs';
import {canonicalOperatingFile,openScopedHostSigner} from '../../packages/machine-market/devnet/host-signer.mjs';
import {DatabaseSync} from 'node:sqlite';
import {DEADLINE_POLICY,assertRunNotClosed} from '../../packages/machine-market/devnet/deadlines.mjs';
import {demand} from '../../packages/machine-market/devnet/legacy.mjs';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'artifacts/machine-market/devnet-implementation'),args=process.argv.slice(2);
let signer,runner;
function publicJSON(file,value){writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o644});}
function privateJSON(file,value){const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}}
function options(values){const o={};for(let n=0;n<values.length;n+=2){demand(['--manifest','--state-dir','--root-go'].includes(values[n])&&values[n+1]&&!o[values[n]],'CLI_ARGUMENTS');o[values[n]]=values[n+1];}return o;}
try{
 const command=args[0];if(args.length===0||command==='--help'){process.stdout.write('Devnet MVP: --manifest-template | --check-binding --manifest FILE --state-dir DIR | --execute --manifest FILE --state-dir DIR --root-go APPROVED_REFERENCE\nCheck binding signs/broadcasts nothing. Execute and --recover-expired-unsent require the authorized financial run reference.\n');process.exit(0);}if(command==='--manifest-template'){process.stdout.write(JSON.stringify(manifestTemplate(),null,2)+'\n');process.exit(0);}
 demand(['--check-binding','--execute','--recover-expired-unsent'].includes(command),'CLI_ARGUMENTS');const o=options(args.slice(1));if(command!=='--check-binding')demand(typeof o['--root-go']==='string'&&o['--root-go'].length>0,'ROOT_FINANCIAL_GO_REQUIRED');demand(o['--manifest']&&o['--state-dir'],'CLI_ARGUMENTS');
 const prepared=JSON.parse(readFileSync(resolve(o['--manifest']),'utf8')),state=realpathSync(resolve(o['--state-dir'])),marker=JSON.parse(readFileSync(join(root,'local-state/machine-market/devnet-execution/preparation.json')));demand(marker.status==='complete'&&marker.generatedCount===7&&marker.runId===prepared.runId&&state===resolve(root,marker.storageDirectoryRelative),'PREPARED_RUN_REQUIRED');
 const filename=join(state,'devnet.sqlite');if(command!=='--check-binding')assertRunNotClosed(filename);
 const operatingFile=canonicalOperatingFile(root);
 if(command==='--check-binding'){signer=openScopedHostSigner({preparedManifest:prepared,stateDirectory:state,operatingFile,checkOnly:true});publicJSON(join(out,'host-binding-check.json'),signer.summary);console.log(JSON.stringify(signer.summary));}
 else{
  const seal=join(state,'execution-manifest.sealed.json');let manifest;
  if(existsSync(seal)){manifest=JSON.parse(readFileSync(seal));demand(manifest.authorization.rootGoReference===o['--root-go'],'ROOT_GO_REFERENCE_CHANGED');}
  else{demand(prepared.deadlinePolicy===DEADLINE_POLICY,'DEADLINES_MUST_FOLLOW_DEPLOYMENT');const rpc=async(method)=>{const r=await fetch(ENDPOINT,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:method==='getSlot'?[{commitment:'finalized'}]:[]})}),j=await r.json();demand(r.ok&&!j.error,'PREFLIGHT_UNAVAILABLE');return j.result;};demand(await rpc('getGenesisHash')===GENESIS,'DEVNET_GENESIS_REQUIRED');const slot=await rpc('getSlot');demand(Number.isSafeInteger(slot)&&slot>0,'SLOT_REQUIRED');manifest=structuredClone(prepared);demand(manifest.useBySlot===null&&manifest.readValidUntilSlot===null,'DEADLINE_POLICY');manifest.authorization={...manifest.authorization,financialRootGo:true,keyPreparationPending:false,rootGoReference:o['--root-go']};privateJSON(seal,manifest);publicJSON(join(out,'execution-manifest.sealed.json'),manifest);}
  const elf=readFileSync(join(root,'local-state/machine-market/build/sbf/sbpfv3-solana-solana/release/axp_machine_market_program.so')),content=readFileSync(join(state,'source.utf8'));
  let applicationSeal=null;if(existsSync(filename)){const db=new DatabaseSync(filename,{readOnly:true});try{const row=db.prepare("SELECT data FROM checkpoints WHERE id='application-deadlines'").get();if(row)applicationSeal=JSON.parse(row.data);}finally{db.close();}}
  let plan;
  function open(sealed){plan=createDevnetPlan({manifest,elf,content,applicationSeal:sealed});signer=openScopedHostSigner({preparedManifest:prepared,executionManifest:manifest,stateDirectory:state,operatingFile,plan,rootGoReference:o['--root-go']});const executionGate={assertAllowed(request){return request.manifestHash===plan.manifestHash&&request.genesis===GENESIS&&request.endpoint===ENDPOINT&&(plan.actionIds.includes(request.operationId)||plan.authorizationIds.includes(request.operationId));}};runner=createDevnetRunner({manifest,elf,content,filename,measureResources:createDevnetResourceProbe({taskStateRoot:join(root,'local-state/machine-market'),runDirectory:state}),capabilities:signer,executionGate,applicationSeal:sealed});}
  open(applicationSeal);
  if(command==='--recover-expired-unsent'){const recovered=[];for(const id of plan.writeIds){let op;try{op=runner.journal.get(id);}catch(e){if(e.code==='ACTION_MISSING')continue;throw e;}if(['Prepared','Signed'].includes(op.state)&&!op.sends.length)recovered.push(await runner.recoverExpiredUnsent(id,{explicit:true}));}publicJSON(join(out,'expired-unsent-recovery.json'),{recovered,summary:runner.journal.summary()});console.log(JSON.stringify({recovered,summary:runner.journal.summary()}));}
  else{
   if(manifest.deadlinePolicy===DEADLINE_POLICY&&!applicationSeal){await runner.deploy();applicationSeal=await runner.sealApplicationDeadlines();runner.close();signer.close();runner=null;signer=null;const privateSeal=join(state,'application-deadlines.sealed.json');if(!existsSync(privateSeal))privateJSON(privateSeal,applicationSeal);else demand(hash(JSON.parse(readFileSync(privateSeal)))===hash(applicationSeal),'APPLICATION_SEAL_CHANGED');const publicSeal=join(out,'application-deadlines.sealed.json');if(!existsSync(publicSeal))publicJSON(publicSeal,applicationSeal);else demand(hash(JSON.parse(readFileSync(publicSeal)))===hash(applicationSeal),'APPLICATION_SEAL_CHANGED');open(applicationSeal);}
   const result=manifest.deadlinePolicy===DEADLINE_POLICY?await runner.runApplication():await runner.run();publicJSON(join(out,'live-result.json'),result);console.log(JSON.stringify({completedCases:result.completedCases,manifestHash:plan.manifestHash,applicationSeal,summary:result.summary}));
  }
 }
}catch(error){const code=/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'DEVNET_MVP_STOPPED';process.stderr.write(JSON.stringify({stopped:true,code})+'\n');process.exitCode=1;}finally{try{runner?.close();}finally{signer?.close();}}
