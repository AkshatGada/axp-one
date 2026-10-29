// Local Phase1 build runner: isolated caches, bounded outputs, no validator/RPC.
import {mkdirSync,statfsSync,existsSync,readFileSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {reviewerEnvironment} from '../setup/verify-review.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const action=process.argv[2];
if(!['lock','fetch','test','sbf'].includes(action))throw Error('usage: phase1-rust.mjs lock|fetch|test|sbf');
const state=join(root,'local-state/machine-market');
const tool=join(state,'toolchain');
const build=join(state,'build');
const logs=join(state,'verification');
for(const directory of [tool,build,logs])mkdirSync(directory,{recursive:true});
const fs=statfsSync(root,{bigint:true});
if(fs.bavail*fs.bsize<40_000_000_000n+2n*1024n**3n)throw Error('disk_floor');
function size(path){if(!existsSync(path))return 0;const r=spawnSync('du',['-sk',path],{encoding:'utf8'});if(r.status!==0)throw Error('size_check_failed');return Number(r.stdout.trim().split(/\s+/)[0])*1024;}
function caps(){if(size(tool)>4*1024**3||size(build)>2*1024**3)throw Error('task_resource_cap');}
caps();
const lockPath=join(state,'phase1-build.lock');
const lock=openSync(lockPath,'wx',0o600);writeFileSync(lock,String(process.pid));
const manifest=join(root,'programs/machine-market/Cargo.toml');
const env={...reviewerEnvironment(),CARGO_HOME:join(tool,'cargo-home'),CARGO_TARGET_DIR:join(build,'host'),CARGO_BUILD_JOBS:'2',CARGO_INCREMENTAL:'0',CARGO_PROFILE_DEV_DEBUG:'0',CARGO_PROFILE_TEST_DEBUG:'0'};
let command='cargo';
let args=action==='lock'?['generate-lockfile','--manifest-path',manifest]:action==='fetch'?['fetch','--locked','--manifest-path',manifest]:['test','--locked','--offline','--manifest-path',manifest,'--','--test-threads=1'];
if(action==='sbf'){
 const platform=join(tool,'platform-tools-v1.57');
 command=join(platform,'rust/bin/cargo');
 Object.assign(env,{RUSTC:join(platform,'rust/bin/rustc'),RUSTDOC:join(platform,'rust/bin/rustdoc'),PATH:join(platform,'rust/bin')+':'+env.PATH,CC:join(platform,'llvm/bin/clang'),AR:join(platform,'llvm/bin/llvm-ar'),OBJDUMP:join(platform,'llvm/bin/llvm-objdump'),OBJCOPY:join(platform,'llvm/bin/llvm-objcopy'),CARGO_TARGET_DIR:join(build,'sbf'),CARGO_TARGET_SBPFV3_SOLANA_SOLANA_RUSTFLAGS:'-Zremap-cwd-prefix= -C link-arg=-z -C link-arg=defs'});
 args=['build','--locked','--offline','--release','--target','sbpfv3-solana-solana','--manifest-path',manifest,'-j','2'];
}
const log=join(logs,'phase1-rust-'+action+'.log');
const fd=openSync(log,'w',0o600);
try{
 console.log(JSON.stringify({action,command,args,log,scope:'local compiler/unit checks only; no validator or RPC'}));
 const result=spawnSync(command,args,{cwd:root,env,stdio:['ignore',fd,fd]});
 closeSync(fd);
 const output=readFileSync(log,'utf8');
 console.log(output.split('\n').slice(-65).join('\n'));
 if(result.error)console.log(result.error.message);
 caps();
 // The SBF compiler can emit an unsafe stack-frame diagnostic and still exit 0.
 const unsafeSbf=action==='sbf'&&/(overflows the maximum allowed frame space|exceeding the maximum stack offset|stack offset[^\n]*(?:exceeded|max)|^error(?:\[|:))/im.test(output);
 if(unsafeSbf)console.error('SBF verification failed: compiler error or unsafe stack-frame diagnostic in build log.');
 process.exitCode=unsafeSbf?1:(result.status??1);
}finally{closeSync(lock);unlinkSync(lockPath);}
