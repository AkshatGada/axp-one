// Single approved local validator supervisor. Does not fund marketplace fixtures.
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {base58Encode} from '../../packages/machine-market/native/codec.mjs';
import {reviewerEnvironment} from '../setup/verify-review.mjs';
import {phase2Resources,checkPhase2Resources} from './phase2-resources.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),state=join(root,'local-state/machine-market');
if(process.argv.length!==3||process.argv[2]!=='start')throw Error('usage: phase2-validator-run.mjs start; explicit current-run resume only, never reset');
process.umask(0o077);
const binary=join(state,'build/agave-loopback/aarch64-apple-darwin/release/solana-test-validator');
const programFile=join(state,'build/sbf/sbpfv3-solana-solana/release/axp_machine_market_program.so');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const binaryHash=hash(binary),programHash=hash(programFile);
if(binaryHash!=='1f135bb21bdd50df55e92f5254120e02e7e7118d428e668270ba8b98acf13dbf'||programHash!=='3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a')throw Error('PINNED_BINARY_MISMATCH');
const build=JSON.parse(readFileSync(join(state,'verification/phase2-validator-build-result.json')));
if(build.result.code!==0||build.stopped||existsSync(join(state,'phase2-validator-build.lock'))||existsSync(join(state,'phase1-build.lock')))throw Error('BUILD_NOT_READY');
const ledger=join(state,'phase2-ledger'),manifestPath=join(state,'phase2-validator-manifest.json');
const resourceOptions={runDirectory:join(state,'phase2-run'),ledgerDirectory:ledger};
function resources(){const snapshot=phase2Resources(resourceOptions),checked=checkPhase2Resources(snapshot,{reserveBytes:1024**3});if(!checked.passed||snapshot.ledgerBytes>9*1024**3||snapshot.totalTaskBytes>19*1024**3||snapshot.databaseAndLogBytes>45*1024**2)throw Object.assign(Error('VALIDATOR_RESOURCE_GUARD'),{detail:checked});return snapshot;}
resources();
let manifest;
if(existsSync(manifestPath)){
  manifest=JSON.parse(readFileSync(manifestPath));
  if(manifest.programHash!==programHash||manifest.ledger!==ledger||manifest.endpoint!=='http://127.0.0.1:18899')throw Error('RUN_MANIFEST_MISMATCH');
  if(manifest.binaryHash!==binaryHash){
    const approval=JSON.parse(readFileSync(join(state,'phase2-validator-binary-approval.json')));
    if(approval.originalManifestSha256!==hash(manifestPath)||approval.initialBinarySha256!==manifest.binaryHash||approval.approvedBinarySha256!==binaryHash||approval.rootAuthorizedSubstitutions!==4)throw Error('BINARY_CONTINUATION_NOT_APPROVED');
  }
}else{
  if(existsSync(ledger))throw Error('LEDGER_WITHOUT_RUN_MANIFEST');
  manifest={schema:'axp.market.local-validator.v1',runId:'phase2-run',createdAt:new Date().toISOString(),
    binaryHash,programHash,program:base58Encode(randomBytes(32)),mintSink:base58Encode(randomBytes(32)),
    endpoint:'http://127.0.0.1:18899',websocket:'ws://127.0.0.1:18900',ledger};
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
}
const configPath=join(state,'phase2-validator-cli.yml');
const config=`json_rpc_url: ${manifest.endpoint}\nwebsocket_url: ${manifest.websocket}\nkeypair_path: ${join(state,'unused-no-wallet.json')}\naddress_labels: {}\ncommitment: finalized\n`;
if(existsSync(configPath)){if(readFileSync(configPath,'utf8')!==config)throw Error('CLI_CONFIG_CHANGED');}
else writeFileSync(configPath,config,{flag:'wx',mode:0o600});
const args=['--config',configPath,'--ledger',ledger,'--bind-address','127.0.0.1',
  '--url',manifest.endpoint,'--rpc-port','18899','--faucet-port','19900','--gossip-port','18000',
  '--dynamic-port-range','18001-18050','--mint',manifest.mintSink,'--faucet-sol','50',
  '--faucet-per-request-sol-cap','5','--faucet-per-time-sol-cap','10','--faucet-time-slice-secs','60',
  '--bpf-program',manifest.program,programFile,'--compute-unit-limit','200000',
  // The CLI defaults to800000 shreds even when omitted. u64::MAX prevents FIFO
  // cleanup under our9GiB supervisor stop; no source/binary patch is needed.
  '--limit-blockstore-size','18446744073709551615','--inflation-fixed','0',
  '--rpc-pubsub-worker-threads','1','--rpc-pubsub-notification-threads','1','--log'];
const lockPath=join(state,'phase2-validator-running.lock'),lock=openSync(lockPath,'wx',0o600);writeFileSync(lock,String(process.pid));
const log=join(state,'verification/phase2-validator-runtime.log'),fd=openSync(log,'a',0o600);
const processPath=join(state,'phase2-validator-process.json');
let child,timer,killTimer,stopped=null,detail=null;
function stop(reason,error){if(stopped)return;stopped=reason;detail=error?{message:error.message,code:error.code??null,detail:error.detail??null}:null;if(child?.pid){try{process.kill(-child.pid,'SIGINT');}catch{}killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},10000);}}
const interrupt=()=>stop('operator_stop');process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
try{
  child=spawn(binary,args,{cwd:root,env:{...reviewerEnvironment(),RUST_LOG:'warn'},stdio:['ignore',fd,fd],detached:true});
  writeFileSync(processPath,JSON.stringify({supervisorPid:process.pid,pid:child.pid,binary,binaryHash,args,startedAt:new Date().toISOString(),state:'starting'},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({pid:child.pid,endpoint:manifest.endpoint,program:manifest.program,binaryHash,scope:'validator only; marketplace fixture funding forbidden until listener/identity verification'}));
  timer=setInterval(()=>{try{resources();}catch(error){stop('resource_check_failed',error);}},1000);
  const result=await new Promise(resolve=>{child.once('error',e=>resolve({code:null,error:e.message}));child.once('close',(code,signal)=>resolve({code,signal}));});
  if(stopped&&child.pid){try{process.kill(-child.pid,'SIGKILL');}catch{}}
  const record={...JSON.parse(readFileSync(processPath)),state:'stopped',endedAt:new Date().toISOString(),result,stopped,detail,resources:phase2Resources(resourceOptions)};
  writeFileSync(processPath,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({result,stopped,detail,resources:record.resources}));
  process.exitCode=stopped==='operator_stop'?0:(result.code??1);
}finally{clearInterval(timer);clearTimeout(killTimer);closeSync(fd);closeSync(lock);unlinkSync(lockPath);process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);}
