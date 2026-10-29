// Read-only task resource checks. Does not start, stop, fund or contact a validator.
import {existsSync,realpathSync,statfsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {reviewerEnvironment} from '../setup/verify-review.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const state=resolve(root,'local-state/machine-market');
const GiB=1024**3,MiB=1024**2;
let recoveredMeasurementRaces=0;
const measurementNotes=[];
export const PHASE2_RESOURCE_LIMITS=Object.freeze({
  freeBytes:40_000_000_000,totalTaskBytes:20*GiB,
  ledgerBytes:10*GiB,databaseAndLogBytes:50*MiB,
});

function allocated(path){
  if(!existsSync(path))return 0;
  const base=realpathSync(state),actual=realpathSync(path),part=relative(base,actual);
  if(part==='..'||part.startsWith('../')||isAbsolute(part))throw Error('RESOURCE_PATH_OUTSIDE_TASK');
  for(let attempt=1;attempt<=3;attempt++){
    const result=spawnSync('du',['-sk',actual],{encoding:'utf8',env:reviewerEnvironment(),timeout:2000});
    const stderr=(result.stderr??'').trim();
    const disappeared=stderr.length>0&&stderr.split('\n').every(line=>/^du: .+: No such file or directory$/.test(line));
    if(result.status!==0){
      const detail={path:relative(state,actual),attempt,status:result.status,signal:result.signal??null,
        stderr:stderr.replaceAll(state,'<TASK>').slice(0,2000),error:result.error?.message??null};
      if(disappeared&&attempt<3){recoveredMeasurementRaces++;measurementNotes.push(detail);if(measurementNotes.length>8)measurementNotes.shift();continue;}
      throw Object.assign(Error('RESOURCE_MEASUREMENT_FAILED'),{code:'RESOURCE_MEASUREMENT_FAILED',detail});
    }
    const blocks=Number(result.stdout.trim().split(/\s+/)[0]);
    if(!Number.isSafeInteger(blocks)||blocks<0)throw Object.assign(Error('INVALID_RESOURCE_MEASUREMENT'),{code:'INVALID_RESOURCE_MEASUREMENT'});
    return blocks*1024;
  }
}

export function phase2Resources({runDirectory=resolve(state,'phase2-run'),ledgerDirectory=resolve(state,'phase2-ledger')}={}){
  for(const path of [runDirectory,ledgerDirectory]){
    const rel=relative(state,resolve(path));
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||rel==='')throw Error('RESOURCE_PATH_OUTSIDE_TASK');
  }
  const fs=statfsSync(root,{bigint:true});
  const ledgerBytes=allocated(ledgerDirectory);
  const totalRunBytes=allocated(runDirectory);
  const ledgerRelative=relative(resolve(runDirectory),resolve(ledgerDirectory));
  const ledgerInsideRun=ledgerRelative!== '..'&&!ledgerRelative.startsWith('../')&&!isAbsolute(ledgerRelative);
  const toolBytes=allocated(resolve(state,'toolchain'));
  const buildBytes=allocated(resolve(state,'build'));
  return {
    measuredAt:new Date().toISOString(),freeBytes:Number(fs.bavail*fs.bsize),
    toolBytes,buildBytes,combinedToolBuildBytes:toolBytes+buildBytes,totalTaskBytes:allocated(state),
    ledgerBytes,databaseAndLogBytes:Math.max(0,totalRunBytes-(ledgerInsideRun?ledgerBytes:0))+allocated(resolve(state,'verification')),
    totalRunBytes,measurement:'allocated filesystem blocks; task paths only',
    recoveredMeasurementRaces,measurementNotes:[...measurementNotes],
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
