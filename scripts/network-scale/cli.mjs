// Trusted local operator only. Importing/building this harness never executes it.
import {resolve,join} from 'node:path';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {localConfiguration,repositoryRoot} from '../../packages/config/local.mjs';
import {BENCHMARK_PROFILE,PROFILE_HASH} from '../../packages/network-scale/profile.mjs';
import {RunJournal} from '../../packages/network-scale/budget.mjs';
import {benchmarkPreflight,createBenchmarkCoordinator} from '../../packages/network-scale/coordinator.mjs';
import {createBenchmarkServer} from '../../packages/network-scale/server.mjs';
const args=process.argv.slice(2),phase=args.shift()??'plan',flag=name=>args.includes(`--${name}`),arg=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
const envFile=arg('env-file',process.env.AXP_NETWORK_ENV_PATH),config={...localConfiguration(),...(envFile?parseEnv(readFileSync(resolve(envFile),'utf8')):{}),...process.env};
const stateDir=resolve(repositoryRoot,arg('state-dir',config.AXP_NETWORK_STATE_DIR??'local-state/network-scale-2026-10-07')),
  runId=arg('run-id',config.AXP_NETWORK_RUN_ID??'network-scale-2026-10-07-v1'),walletPath=resolve(repositoryRoot,arg('wallet',config.AXP_NETWORK_WALLET_PATH??config.AXP_PRODUCT_DEVNET_WALLET_PATH??'local-state/product/secrets/devnet-wallet.json')),
  rpcURL=config.AXP_NETWORK_DEVNET_RPC_URL,sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repositoryRoot,encoding:'utf8'}).trim();
if(!stateDir.startsWith(resolve(repositoryRoot,'local-state')+'/')||stateDir===resolve(repositoryRoot,'local-state/product'))throw Error('isolated_benchmark_state_required');
const emit=value=>console.log(JSON.stringify(value,null,2));
if(phase==='plan'){const journal=new RunJournal({path:join(stateDir,'coordinator.sqlite'),runId,sourceCommit});try{emit({schemaVersion:'axp.network-scale-plan.v1',runId,status:journal.get('meta','run').status,profileHash:PROFILE_HASH,bounds:BENCHMARK_PROFILE,signaturesCreated:0,providersCalled:0});}finally{journal.close();}}
else if(phase==='preflight'){if(!existsSync(walletPath))throw Error('existing_wallet_required');const result=await benchmarkPreflight({stateDir,walletPath,rpcURL});const journal=new RunJournal({path:join(stateDir,'coordinator.sqlite'),runId,sourceCommit});try{journal.put('meta','preflight',result);journal.event('preflight_checked',{compatible:result.compatible,sdk:result.sdk});emit(result);}finally{journal.close();}}
else {
  if(!['open','run','drain','settle','export','replay','verify-stage'].includes(phase))throw Error('benchmark_phase_unknown');
  const enabled=flag('enable-paid')&&config.AXP_NETWORK_OPERATOR_AUTHORIZED==='1';
  if(['open','run','drain','settle','replay'].includes(phase)&&!enabled)throw Error('trusted_operator_enable_paid_required');
  const coordinator=createBenchmarkCoordinator({stateDir,runId,sourceCommit,apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,organicApiKey:config.DEEPSEEK_API_KEY,walletPath,rpcURL,signingEnabled:enabled});
  try {
    const tracked=execFileSync('git',['ls-files','--','packages','scripts'],{cwd:repositoryRoot,encoding:'utf8'}).trim().split('\n'),
      untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--','packages/network-scale','packages/product/provider-provenance.mjs','scripts/network-scale'],{cwd:repositoryRoot,encoding:'utf8'}).trim().split('\n'),
      sourceHash=createHash('sha256');for(const file of [...new Set([...tracked,...untracked])].filter(Boolean).sort()){if(existsSync(resolve(repositoryRoot,file)))sourceHash.update(file).update(readFileSync(resolve(repositoryRoot,file)));}
    const executionSourceHash=sourceHash.digest('hex'),sourceDirty=Boolean(execFileSync('git',['status','--porcelain','--','packages','scripts'],{cwd:repositoryRoot,encoding:'utf8'}).trim()),prior=coordinator.journal.get('meta','run').executionSourceHash;
    if(['open','run'].includes(phase)){if(prior&&prior!==executionSourceHash)throw Error('benchmark_execution_source_changed');coordinator.journal.update({executionSourceHash,sourceCommit,sourceDirty});}
    if(config.AXP_NETWORK_STOP_AT){if(!Number.isFinite(Date.parse(config.AXP_NETWORK_STOP_AT)))throw Error('benchmark_stop_deadline_invalid');coordinator.journal.update({stopAt:new Date(config.AXP_NETWORK_STOP_AT).toISOString()});}
    if(phase==='open'){if(!coordinator.journal.get('meta','preflight')?.compatible)throw Error('benchmark_preflight_required');emit(await coordinator.open(Number(arg('advertisers',16))));}
    else if(phase==='verify-stage')emit(coordinator.verifyStage(Number(arg('advertisers',16))));
    else if(phase==='drain')emit(await coordinator.drain());
    else if(phase==='settle')emit(await coordinator.settle());
    else if(phase==='replay')emit(await coordinator.replay());
    else if(phase==='export'){const output=resolve(repositoryRoot,arg('output','artifacts/network-scale/run.json'));mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(coordinator.export(),null,2)+'\n');emit({status:'exported',path:output});}
    else if(phase==='run'){
      const server=createBenchmarkServer({coordinator,port:Number(arg('port',3440)),turns:Number(arg('turns',16)),concurrencySteps:arg('concurrency','1').split(',').map(Number)});emit(await server.listen());
      await new Promise(resolve=>{let ending=false;const stop=async()=>{if(ending)return;ending=true;coordinator.journal.event('operator_browser_server_stopping',server.status());await server.close();coordinator.journal.event('operator_browser_server_stopped',server.status());if(!coordinator.journal.get('meta','run').haltReason)coordinator.journal.update({status:coordinator.journal.all('turn').some(t=>['pending','error','allocated','awaiting_render'].includes(t.status))?'partial':'ready'});resolve();};process.once('SIGINT',stop);process.once('SIGTERM',stop);});
    }
  }finally{coordinator.close();}
}
