/** Lead-only composition. No validator launcher, implicit execution or key discovery. */
import {fork} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,lstatSync,realpathSync,existsSync,openSync,writeFileSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {canonical} from '../../packages/contracts/index.mjs';
import {localEndpoint} from '../../packages/machine-market/native/rpc.mjs';
import {createTradingHandler} from '../../packages/machine-market/native/service.mjs';
import {createBootstrapDriver,measureBootstrapResources} from './phase2-bootstrap.mjs';
import {runAcceptance,validateRunConfiguration} from './phase2-acceptance.mjs';
import {attachAcceptanceWorker,remoteAcceptanceContext} from './phase2-acceptance-worker.mjs';
import {installAcceptanceCrash} from './phase2-acceptance-crash.mjs';
import {hash} from './phase2-acceptance-schedule.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const SELF=fileURLToPath(import.meta.url);
const PRIVATE=join(ROOT,'local-state/machine-market');
const CONTROL='axp.local.acceptance.launch.v1';
export class LocalAcceptanceError extends Error{constructor(code){super(code);this.code=code;}}
const demand=(ok,code)=>{if(!ok)throw new LocalAcceptanceError(code);};
const safeCode=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{1,64}$/.test(value)?value:'LOCAL_ACCEPTANCE_FAILED';
export function sanitizeChildEnvironment(env=process.env){const fields=['PATH','TMPDIR','TMP','TEMP','LANG','LC_ALL','TZ','SystemRoot'];return {...Object.fromEntries(fields.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]])),AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED:'0',NEXT_TELEMETRY_DISABLED:'1'};}
function alive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
function taskPath(parent,path,{mustExist=true}={}){demand(typeof path==='string'&&isAbsolute(path),'EXPLICIT_TASK_PATH');const base=realpathSync(parent),full=resolve(path),part=relative(base,full);demand(part&&part!=='..'&&!part.startsWith('../')&&!isAbsolute(part),'EXPLICIT_TASK_PATH');if(mustExist){demand(realpathSync(full)===full&&!lstatSync(full).isSymbolicLink(),'EXPLICIT_TASK_PATH');}else demand(realpathSync(dirname(full))===dirname(full),'EXPLICIT_TASK_PATH');return full;}
function privateJSON(parent,path,maximum=256*1024){path=taskPath(parent,path);const s=lstatSync(path);demand(s.isFile()&&s.size<=maximum&&(s.mode&0o077)===0,'PRIVATE_CONFIGURATION_REQUIRED');return JSON.parse(readFileSync(path,'utf8'));}
function timeout(promise,ms,code){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new LocalAcceptanceError(code)),ms);})]).finally(()=>clearTimeout(timer));}
const identity=config=>hash({runId:config.runId,run:config.run,programSha256:config.programSha256});
/** Metadata is supplied only AFTER lead-owned OS listener/binary verification. */
export function validateValidatorReadiness(metadata,expected,{isProcessAlive=alive}={}){
 demand(metadata?.schema==='axp.market.validator.readiness.v1'&&metadata.verified===true&&metadata.loopbackOnly===true,'VALIDATOR_READINESS_REQUIRED');localEndpoint(metadata.endpoint);
 for(const name of ['genesis','program','programSha256'])demand(metadata[name]===(expected[name]??expected.run?.[name]),'VALIDATOR_IDENTITY_MISMATCH');demand(metadata.endpoint===expected.endpoint&&metadata.loader===expected.loader&&metadata.ledgerDirectory===expected.ledgerDirectory,'VALIDATOR_IDENTITY_MISMATCH');
 demand(/^[a-f0-9]{64}$/.test(metadata.validatorBinarySha256)&&Number.isSafeInteger(metadata.validatorPid)&&metadata.validatorPid>0&&isProcessAlive(metadata.validatorPid),'VALIDATOR_PROCESS_REQUIRED');
 demand(Array.isArray(metadata.listeners)&&metadata.listeners.length>=3&&metadata.listeners.length<=128,'VALIDATOR_LISTENERS_REQUIRED');for(const row of metadata.listeners)demand(row&&row.address==='127.0.0.1'&&['tcp','udp'].includes(row.protocol)&&Number.isInteger(row.port)&&row.port>0&&row.port<=65535,'VALIDATOR_NON_LOOPBACK_LISTENER');
 for(const role of ['rpc','pubsub','faucet'])demand(metadata.listeners.some(row=>row.role===role&&row.protocol==='tcp'),'VALIDATOR_LISTENERS_REQUIRED');const rpcPort=Number(new URL(expected.endpoint).port);demand(metadata.listeners.some(row=>row.role==='rpc'&&row.port===rpcPort),'VALIDATOR_LISTENERS_REQUIRED');
 if(expected.serviceOrigin){localEndpoint(expected.serviceOrigin);const port=Number(new URL(expected.serviceOrigin).port);demand(!metadata.listeners.some(row=>row.protocol==='tcp'&&row.port===port),'SERVICE_PORT_CONFLICT');}
 return structuredClone(metadata);
}
/** No process spawning until caller has closed its bootstrap writer. */
export function createOwnedServiceLauncher({config,readinessPath,readinessHash,validatorPid,logDirectory,forkImpl=fork,environment=process.env,waitMs=15000,onStopped}={}){
 demand(Number.isInteger(waitMs)&&waitMs>=10&&waitMs<=30000,'LAUNCH_TIMEOUT');const expected=identity(config),records=new Map();let active=null;
 async function stop(){const record=active;if(!record)return {exited:true};if(!record.exited){try{if(record.child.connected)record.child.send({protocol:CONTROL,type:'shutdown'},()=>{});else record.child.kill('SIGTERM');}catch{record.child.kill('SIGTERM');}try{await timeout(record.exit,waitMs,'CHILD_SHUTDOWN_TIMEOUT');}catch{record.child.kill('SIGKILL');await timeout(record.exit,waitMs,'CHILD_SHUTDOWN_TIMEOUT');}}if(active===record)active=null;onStopped?.();return {exited:true,pid:record.pid,signal:record.outcome.signal,code:record.outcome.code};}
 return {
  async start({configIdentity=expected,crashSpec=null,recoverStaleLock=false}={}){
   demand(configIdentity===expected,'CHILD_RUN_IDENTITY');demand(!active||active.exited,'CURRENT_WRITER_STILL_ALIVE');if(crashSpec)demand(['after-signed-persistence','after-send','resolved-before-http'].includes(crashSpec.point)&&/^[a-f0-9]{64}$/.test(crashSpec.operationId),'CRASH_SPEC');
   const logPath=join(logDirectory,'acceptance-service-'+randomUUID()+'.log'),fd=openSync(logPath,'wx',0o600);let closedLog=false,written=0;const closeLog=()=>{if(!closedLog){closedLog=true;fsyncSync(fd);closeSync(fd);}};let child;
   try{child=forkImpl(SELF,['--child'],{cwd:ROOT,execArgv:[],env:sanitizeChildEnvironment(environment),stdio:['ignore','ignore','pipe','ipc']});}catch{closeLog();throw new LocalAcceptanceError('CHILD_START_FAILED');}
   if(!Number.isSafeInteger(child.pid)||child.pid<1||child.pid===validatorPid){closeLog();throw new LocalAcceptanceError('CHILD_PROCESS_IDENTITY');}let resolveExit;const record={child,pid:child.pid,exited:false,outcome:null,exit:new Promise(r=>resolveExit=r)};records.set(record.pid,record);active=record;
   child.stderr?.on('data',data=>{const bytes=Buffer.from(data),room=Math.max(0,65536-written);if(room){const part=bytes.subarray(0,room);writeFileSync(fd,part);written+=part.length;}});child.stderr?.on('error',()=>{});
   child.once('exit',(code,signal)=>{record.exited=true;record.outcome={pid:record.pid,code,signal};closeLog();resolveExit(record.outcome);});
   const ready=new Promise((resolveReady,reject)=>{child.once('error',()=>{closeLog();reject(new LocalAcceptanceError('CHILD_START_FAILED'));});child.on('message',message=>{if(message?.protocol!==CONTROL)return;if(message.type==='failed'){reject(new LocalAcceptanceError(safeCode(message.code)));return;}if(message.type==='ready'){if(message.pid!==record.pid||message.identityHash!==expected||message.readinessHash!==readinessHash||message.origin!==config.serviceOrigin||message.loopbackHost!=='127.0.0.1'||message.writerOwned!==true){reject(new LocalAcceptanceError('CHILD_READY_MISMATCH'));return;}resolveReady({child,pid:record.pid,identityHash:expected});}});record.exit.then(()=>reject(new LocalAcceptanceError('CHILD_EXITED_BEFORE_READY')));});
   try{child.send({protocol:CONTROL,type:'start',directory:config.privateRoot,readinessPath,readinessHash,identityHash:expected,recoverStaleLock,crashSpec});return await timeout(ready,waitMs,'CHILD_READY_TIMEOUT');}catch(error){await stop();throw error;}
  },
  stop,
  async waitExit({pid}){const record=records.get(pid);demand(record,'CHILD_NOT_OWNED');return record.exit;},
 };
}
/** Runtime child entry. Dependencies are injected only in local unit tests. */
export async function startAcceptanceChild(request,{privateParent=PRIVATE,bootstrapDriver=createBootstrapDriver(),serverFactory=createServer,handlerFactory=createTradingHandler,channel=process,processObject=process,isProcessAlive=alive,killSelf=(pid,signal)=>process.kill(pid,signal),exit=code=>process.exit(code)}={}){
 demand(request?.protocol===CONTROL&&request.type==='start'&&typeof channel.send==='function','CHILD_CONTROL_PROTOCOL');const keys=['protocol','type','directory','readinessPath','readinessHash','identityHash','recoverStaleLock','crashSpec'];demand(Object.keys(request).every(k=>keys.includes(k)),'CHILD_CONTROL_PROTOCOL');
 const config=privateJSON(privateParent,join(taskPath(privateParent,request.directory),'acceptance-config.json')),manifest=privateJSON(privateParent,join(request.directory,'bootstrap-config.json')),readiness=privateJSON(privateParent,request.readinessPath);demand(hash(readiness)===request.readinessHash&&identity(config)===request.identityHash,'CHILD_RUN_IDENTITY');validateValidatorReadiness(readiness,{...config,loader:manifest.programDeployment.loader,ledgerDirectory:manifest.resources.ledgerDirectory},{isProcessAlive});
 const session=await bootstrapDriver.resume({directory:request.directory,execute:true,recoverStaleLock:request.recoverStaleLock===true});let server,stopping=false,shutdownTask;
 function shutdown(){if(shutdownTask)return shutdownTask;stopping=true;shutdownTask=(async()=>{try{if(server)await new Promise(resolveClosed=>server.close(resolveClosed));}finally{session.close();}})();return shutdownTask;}
 try{
  demand(identity(session.config)===request.identityHash,'CHILD_RUN_IDENTITY');
  installAcceptanceCrash({store:session.context.store,armed:request.crashSpec,privateRoot:config.privateRoot,markerDirectory:config.privateRoot,kill:(pid,signal)=>{demand(pid===processObject.pid&&signal==='SIGKILL','OWNED_CRASH_ONLY');killSelf(pid,signal);}});
  const gated=attachAcceptanceWorker({store:session.context.store,service:session.context.service,repository:session.context.repository,channel});const handler=handlerFactory({service:gated.service,origin:config.serviceOrigin});server=serverFactory((req,res)=>{if(stopping){res.writeHead(503,{'content-type':'application/json'});res.end('{"code":"SERVICE_STOPPING"}');return;}return handler(req,res);});server.requestTimeout=30000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
  const port=Number(new URL(config.serviceOrigin).port);await new Promise((resolveListen,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port,exclusive:true},resolveListen);});const address=server.address();demand(address?.address==='127.0.0.1'&&address.port===port,'SERVICE_NON_LOOPBACK_LISTENER');
  const stopAndExit=()=>shutdown().then(()=>exit(0),()=>exit(1));channel.on('message',message=>{if(message?.protocol===CONTROL&&message.type==='shutdown')stopAndExit();});channel.on('disconnect',stopAndExit);processObject.on?.('SIGTERM',stopAndExit);
  channel.send({protocol:CONTROL,type:'ready',pid:processObject.pid,identityHash:request.identityHash,readinessHash:request.readinessHash,origin:config.serviceOrigin,loopbackHost:'127.0.0.1',writerOwned:true});return {shutdown,server,session,gated};
 }catch{await shutdown();throw new LocalAcceptanceError('CHILD_SERVICE_START_FAILED');}
}
export function loadLocalAcceptanceOptions({newConfigPath,privateParent=PRIVATE}){
 const input=privateJSON(privateParent,newConfigPath);demand(input.schema==='axp.market.local.options.v1'&&input.bootstrap,'LOCAL_OPTIONS_SCHEMA');const options={...input.bootstrap};taskPath(privateParent,options.directory,{mustExist:false});const file=taskPath(privateParent,options.programFile);demand(lstatSync(file).isFile()&&lstatSync(file).size<=1048576,'PROGRAM_FILE');options.programBytes=readFileSync(file);delete options.programFile;const sources={};for(const [id,source]of Object.entries(options.sources??{})){const path=taskPath(privateParent,source.file);demand(lstatSync(path).isFile()&&lstatSync(path).size<=16384,'SOURCE_FILE');sources[id]={version:source.version,format:source.format,content:readFileSync(path)};}options.sources=sources;return options;
}
export function createLocalAcceptanceRunner({privateParent=PRIVATE,bootstrapDriver=createBootstrapDriver(),forkImpl=fork,acceptance=runAcceptance,isProcessAlive=alive,measureResources=measureBootstrapResources,waitMs=15000,environment=process.env}={}){
 return {
  async run({execute=false,newConfigPath,directory,resume=false,readinessPath,recoverStaleLock=false}={}){
   demand(execute===true,'EXPLICIT_EXECUTION_REQUIRED');demand(resume?!newConfigPath&&typeof directory==='string':typeof newConfigPath==='string'&&!directory,'EXPLICIT_RUN_MODE');let options,configHint,manifest;
   if(resume){directory=taskPath(privateParent,directory);configHint=privateJSON(privateParent,join(directory,'acceptance-config.json'));manifest=privateJSON(privateParent,join(directory,'bootstrap-config.json'));}
   else{options=loadLocalAcceptanceOptions({newConfigPath,privateParent});directory=options.directory;configHint={...options,programSha256:hash(options.programBytes)};manifest={programDeployment:options.programDeployment,resources:options.resources};}
   const readiness=privateJSON(privateParent,readinessPath);validateValidatorReadiness(readiness,{...configHint,loader:manifest.programDeployment.loader,ledgerDirectory:manifest.resources.ledgerDirectory},{isProcessAlive});const readinessHash=hash(readiness);let initial,handles,launcher;
   try{
    initial=resume?await bootstrapDriver.resume({directory,execute:true,recoverStaleLock}):await bootstrapDriver.create({...options,execute:true});const config=initial.config;validateRunConfiguration(config);validateValidatorReadiness(readiness,{...config,loader:manifest.programDeployment.loader,ledgerDirectory:manifest.resources.ledgerDirectory},{isProcessAlive});const rpc=initial.context.rpc,observer=initial.context.observer,operatorToken=initial.context.operatorToken;
    initial.close();initial=null;handles=await bootstrapDriver.openHandles({directory,execute:true});
    const journal={snapshot:()=>privateJSON(privateParent,config.journalPath,2*1024*1024)},signers=handles.bindProbeSigners({filename:join(directory,'acceptance-native-probes.sqlite'),journal});
    const resourceReadout=async()=>{const r=await measureResources({directory,resources:manifest.resources}),n=key=>{const value=Number(r[key]);demand(Number.isSafeInteger(value)&&value>=0,'RESOURCE_MEASUREMENTS');return value;};return {freeBytes:r.freeBytes,toolsBytes:n('toolBytes'),buildBytes:n('buildBytes'),totalTaskBytes:n('totalTaskBytes'),ledgerBytes:n('ledgerBytes'),dbAndLogsBytes:n('dbLogBytes')};};
    launcher=createOwnedServiceLauncher({config,readinessPath,readinessHash,validatorPid:readiness.validatorPid,logDirectory:taskPath(privateParent,manifest.resources.verificationDirectory),forkImpl,waitMs,environment});const baseContext={rpc,observer,operatorToken,signAuthorization:handles.signAuthorization,signers,bindProbeSigners:handles.bindProbeSigners,launcher,resourceReadout,control:{measureResources:resourceReadout}};
    const child=await launcher.start({configIdentity:identity(config),recoverStaleLock:false});const context=remoteAcceptanceContext({...child,baseContext});return await acceptance({configPath:join(directory,'acceptance-config.json'),context,execute:true,resume,recoverStaleLock});
   }finally{try{if(launcher)await launcher.stop({preserveDatabase:true,preserveLedger:true});}finally{initial?.close();handles?.close();}}
  },
 };
}
const help='Usage (lead only; validator already verified and running):\n  node phase2-local-acceptance.mjs --execute --new-config <private-options.json> --readiness <validator-ready.json>\n  node phase2-local-acceptance.mjs --execute --resume <same-private-run> --readiness <validator-ready.json> [--recover-stale-lock]\nDefault/--help is read-only. No validator launcher, reset, public RPC or signature refresh.\n';
export function parseLocalArguments(args){if(args.length===0||args.length===1&&args[0]==='--help')return {help:true};if(args.length===1&&args[0]==='--child')return {child:true};const result={};for(let i=0;i<args.length;i++){const a=args[i];if(a==='--execute'){demand(!result.execute,'CLI_ARGUMENTS');result.execute=true;}else if(a==='--recover-stale-lock'){demand(!result.recoverStaleLock,'CLI_ARGUMENTS');result.recoverStaleLock=true;}else if(['--new-config','--resume','--readiness'].includes(a)){const field={'--new-config':'newConfigPath','--resume':'directory','--readiness':'readinessPath'}[a];demand(!result[field]&&typeof args[i+1]==='string'&&!args[i+1].startsWith('--'),'CLI_ARGUMENTS');result[field]=resolve(args[++i]);if(a==='--resume')result.resume=true;}else throw new LocalAcceptanceError('CLI_ARGUMENTS');}demand(result.execute&&result.readinessPath&&!!result.newConfigPath!==!!result.directory,'CLI_ARGUMENTS');return result;}
if(process.argv[1]&&resolve(process.argv[1])===SELF){
 try{const options=parseLocalArguments(process.argv.slice(2));if(options.help)process.stdout.write(help);else if(options.child){demand(typeof process.send==='function','CHILD_IPC_REQUIRED');process.once('message',request=>startAcceptanceChild(request).catch(()=>{process.send?.({protocol:CONTROL,type:'failed',code:'CHILD_SERVICE_START_FAILED'});process.exitCode=1;process.disconnect?.();}));}else createLocalAcceptanceRunner().run(options).then(result=>{process.stdout.write(JSON.stringify({schema:'axp.market.local.result.v1',complete:result.complete===true,evidenceHash:result.evidenceHash??null})+'\n');},error=>{process.stderr.write(safeCode(error?.code)+'\n');process.exitCode=1;});}catch{process.stderr.write(help);process.exitCode=2;}
}
