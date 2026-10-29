// Approved task-local Agave build. No validator execution or wallet access.
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,openSync,closeSync,existsSync,readFileSync,writeFileSync,unlinkSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {reviewerEnvironment} from '../setup/verify-review.mjs';
import {phase2Resources,checkPhase2Resources} from './phase2-resources.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const state=join(root,'local-state/machine-market');
const tool=join(state,'toolchain'),build=join(state,'build'),logs=join(state,'verification');
const source=join(tool,'agave-loopback-source'),rust=join(tool,'rust-1.97.1');
const action=process.argv[2],expectedCommit='a203300045b405f86c9c84308b2eae76af69ac3b';
if(!['fetch','build','graph'].includes(action))throw Error('usage: phase2-validator-build.mjs fetch|build|graph');
for(const path of [logs,build,join(build,'agave-loopback-tmp')])mkdirSync(path,{recursive:true});
const env={...reviewerEnvironment(),PATH:join(rust,'bin')+':'+reviewerEnvironment().PATH,
  CARGO_HOME:join(tool,'cargo-home'),CARGO_TARGET_DIR:join(build,'agave-loopback'),
  TMPDIR:join(build,'agave-loopback-tmp'),
  RUSTC:join(rust,'bin/rustc'),RUSTDOC:join(rust,'bin/rustdoc'),
  CARGO_BUILD_JOBS:'2',CARGO_INCREMENTAL:'0',CARGO_PROFILE_RELEASE_DEBUG:'0',
  CARGO_PROFILE_RELEASE_SPLIT_DEBUGINFO:'off',CARGO_PROFILE_RELEASE_STRIP:'debuginfo',
  CARGO_PROFILE_DEV_DEBUG:'0',CMAKE_BUILD_PARALLEL_LEVEL:'2',
  LIBCLANG_PATH:'/Library/Developer/CommandLineTools/usr/lib',
  DYLD_LIBRARY_PATH:'/Library/Developer/CommandLineTools/usr/lib',
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',
  CARGO_NET_GIT_FETCH_WITH_CLI:'true',NEXT_TELEMETRY_DISABLED:'1'};
if(action!=='fetch')env.CARGO_NET_OFFLINE='true';
if(action==='graph')env.RUSTC_BOOTSTRAP='1'; // Upstream's read-only selected-binary unit-graph check.
const git=args=>{const r=spawnSync('git',args,{cwd:source,env,encoding:'utf8'});if(r.status!==0)throw Error('source_git_check_failed');return r.stdout;};
if(git(['rev-parse','HEAD']).trim()!==expectedCommit)throw Error('source_commit_mismatch');
const changed=git(['diff','--numstat']).trim().split('\n').sort();
const allowed=['1\t1\tvalidator/src/bin/solana-test-validator.rs','2\t2\ttest-validator/src/lib.rs','1\t1\tudp-client/src/lib.rs'].sort();
if(JSON.stringify(changed)!==JSON.stringify(allowed))throw Error('source_patch_scope_mismatch');
for(const path of ['validator/src/bin/solana-test-validator.rs','test-validator/src/lib.rs','udp-client/src/lib.rs']){
  const before=git(['show','HEAD:'+path]);
  const after=readFileSync(join(source,path),'utf8');
  const expected=before.replaceAll('Ipv4Addr::UNSPECIFIED','Ipv4Addr::LOCALHOST');
  if(after!==expected)throw Error('source_patch_bytes_mismatch');
}
if(existsSync(join(state,'phase1-build.lock')))throw Error('other_heavy_build_active');
const lockPath=join(state,'phase2-validator-build.lock'),lock=openSync(lockPath,'wx',0o600);
writeFileSync(lock,String(process.pid));
const command=join(rust,'bin/cargo');
const manifest=join(source,'validator/Cargo.toml');
const args=action==='fetch'?['fetch','--locked','--target','aarch64-apple-darwin','--manifest-path',manifest]:
  ['build','--locked','--offline','--release','--target','aarch64-apple-darwin','--manifest-path',manifest,'--bin','solana-test-validator','--features','agave-unstable-api','-j','2',...(action==='graph'?['-Z','unstable-options','--unit-graph']:[])];
const logPath=join(logs,'phase2-validator-'+action+'.log');
let child,fd,timer,killTimer,stopped=null,stopDetail=null,before,after;
function budget(){
  const snapshot=phase2Resources();const checked=checkPhase2Resources(snapshot,{reserveBytes:1024**3});
  if(!checked.passed)throw Object.assign(Error('RESOURCE_BUDGET_EXCEEDED'),{code:'RESOURCE_BUDGET_EXCEEDED',detail:checked});
  if(snapshot.totalTaskBytes>19*1024**3||snapshot.databaseAndLogBytes>45*1024**2)throw Object.assign(Error('RESOURCE_HEADROOM_EXHAUSTED'),{code:'RESOURCE_HEADROOM_EXHAUSTED',detail:snapshot});
  return snapshot;
}
function stop(reason,error){
  if(stopped)return;stopped=reason;stopDetail=error?{code:error.code??null,message:error.message,detail:error.detail??null}:null;
  if(child?.pid){try{process.kill(-child.pid,'SIGINT');}catch{}
    killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},10000);}
}
const signal=()=>stop('operator_interrupt');process.on('SIGINT',signal);process.on('SIGTERM',signal);
try{
  before=budget();fd=openSync(logPath,'w',0o600);
  console.log(JSON.stringify({action,sourceCommit:expectedCommit,command,args,logPath,jobs:2,scope:'task-local compiler only; no validator/RPC/funding',resources:before}));
  child=spawn(command,args,{cwd:source,env,stdio:['ignore',fd,fd],detached:true});
  timer=setInterval(()=>{try{budget();}catch(error){stop(['RESOURCE_BUDGET_EXCEEDED','RESOURCE_HEADROOM_EXHAUSTED'].includes(error.code)?error.code:'RESOURCE_MEASUREMENT_UNAVAILABLE',error);}},1000);
  const result=await new Promise(resolve=>{child.once('error',error=>resolve({code:null,signal:null,error:error.message}));child.once('close',(code,signal)=>resolve({code,signal}));});
  if(stopped&&child?.pid){try{process.kill(-child.pid,'SIGKILL');}catch{}}
  clearInterval(timer);clearTimeout(killTimer);closeSync(fd);fd=undefined;
  after=phase2Resources();const text=readFileSync(logPath,'utf8');
  let graphSummary;
  if(action==='graph'&&result.code===0){
    const graph=JSON.parse(text.slice(text.indexOf('{')));
    graphSummary={units:graph.units.length,roots:graph.roots,
      devContextOnlyUnits:graph.units.filter(u=>u.features?.includes('dev-context-only-utils')).map(u=>u.pkg_id)};
    writeFileSync(join(logs,'phase2-validator-unit-graph-summary.json'),JSON.stringify(graphSummary,null,2)+'\n');
    console.log(JSON.stringify(graphSummary));
  }else console.log(text.split('\n').slice(-55).join('\n'));
  const record={action,sourceCommit:expectedCommit,args,result,stopped,stopDetail,before,after,
    logBytes:statSync(logPath).size,logSha256:createHash('sha256').update(text).digest('hex')};
  writeFileSync(join(logs,'phase2-validator-'+action+'-result.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({action,result,stopped,stopDetail,resources:after}));
  process.exitCode=stopped||graphSummary?.devContextOnlyUnits.length?1:(result.code??1);
}finally{
  clearInterval(timer);clearTimeout(killTimer);if(fd!==undefined)closeSync(fd);
  closeSync(lock);unlinkSync(lockPath);process.off('SIGINT',signal);process.off('SIGTERM',signal);
}
