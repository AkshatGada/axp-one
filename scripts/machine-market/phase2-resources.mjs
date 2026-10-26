// Read-only task resource checks. Does not start, stop, fund or contact a validator.
import {existsSync,realpathSync,statfsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {reviewerEnvironment} from '../setup/verify-review.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const state=resolve(root,'local-state/machine-market');
const GiB=1024**3,MiB=1024**2;
export const PHASE2_RESOURCE_LIMITS=Object.freeze({
  freeBytes:40_000_000_000,toolBytes:4*GiB,buildBytes:2*GiB,
  ledgerBytes:512*MiB,databaseAndLogBytes:50*MiB,
});

function allocated(path){
  if(!existsSync(path))return 0;
  const base=realpathSync(state),actual=realpathSync(path),part=relative(base,actual);
  if(part==='..'||part.startsWith('../')||isAbsolute(part))throw Error('RESOURCE_PATH_OUTSIDE_TASK');
  const result=spawnSync('du',['-sk',actual],{encoding:'utf8',env:reviewerEnvironment()});
  if(result.status!==0)throw Error('RESOURCE_MEASUREMENT_FAILED');
  const blocks=Number(result.stdout.trim().split(/\s+/)[0]);
  if(!Number.isSafeInteger(blocks)||blocks<0)throw Error('RESOURCE_MEASUREMENT_FAILED');
  return blocks*1024;
}

export function phase2Resources({runDirectory=resolve(state,'phase2-run')}={}){
  const rel=relative(state,resolve(runDirectory));
  if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||rel==='')throw Error('RESOURCE_PATH_OUTSIDE_TASK');
  const fs=statfsSync(root,{bigint:true});
  const ledgerBytes=allocated(resolve(runDirectory,'ledger'));
  const totalRunBytes=allocated(runDirectory);
  return {
    measuredAt:new Date().toISOString(),freeBytes:Number(fs.bavail*fs.bsize),
    toolBytes:allocated(resolve(state,'toolchain')),
    buildBytes:allocated(resolve(state,'build')),
    ledgerBytes,databaseAndLogBytes:Math.max(0,totalRunBytes-ledgerBytes)+allocated(resolve(state,'verification')),
    totalRunBytes,measurement:'allocated filesystem blocks; task paths only',
  };
}

export function checkPhase2Resources(snapshot,{reserveBytes=0}={}){
  if(!Number.isSafeInteger(reserveBytes)||reserveBytes<0)throw Error('INVALID_RESOURCE_RESERVATION');
  const failures=[];
  for(const field of Object.keys(PHASE2_RESOURCE_LIMITS)){
    if(!Number.isSafeInteger(snapshot[field])||snapshot[field]<0)throw Error('INVALID_RESOURCE_MEASUREMENT');
    if(field==='freeBytes'?snapshot[field]-reserveBytes<PHASE2_RESOURCE_LIMITS[field]:snapshot[field]>PHASE2_RESOURCE_LIMITS[field])failures.push(field);
  }
  return {passed:failures.length===0,failures,limits:PHASE2_RESOURCE_LIMITS,reserveBytes,snapshot};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=checkPhase2Resources(phase2Resources());
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.passed?0:1;
}
