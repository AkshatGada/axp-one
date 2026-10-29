// Read-only validator checks, then one immutable private acceptance options file.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {publicKeyBytes,base58Encode,ZERO_KEY} from '../../packages/machine-market/native/codec.mjs';
import {findProgramAddress} from '../../packages/machine-market/native/domain.mjs';
import {phase2Resources,checkPhase2Resources} from './phase2-resources.mjs';
const root=process.cwd(),state=resolve(root,'local-state/machine-market');
const m=JSON.parse(readFileSync(state+'/phase2-validator-manifest.json'));
const processInfo=JSON.parse(readFileSync(state+'/phase2-validator-process.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const expectedBinary='1f135bb21bdd50df55e92f5254120e02e7e7118d428e668270ba8b98acf13dbf';
if(processInfo.state==='stopped'||processInfo.binaryHash!==expectedBinary)throw Error('VALIDATOR_NOT_RUNNING');
let id=0;
const rpc=async(method,params=[])=>{const r=await fetch(m.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})});const j=await r.json();if(!r.ok||j.error)throw Error('RPC_PREFLIGHT');return j.result;};
try{
  let healthy=false;
  for(let n=0;n<30;n++){try{healthy=await rpc('getHealth')==='ok';}catch{}if(healthy)break;await new Promise(r=>setTimeout(r,500));}
  if(!healthy)throw Error('HEALTH_UNAVAILABLE');
  const sockets=spawnSync('/usr/sbin/lsof',['-nP','-a','-p',String(processInfo.pid),'-i'],{encoding:'utf8'});
  if(sockets.status!==0)throw Error('SOCKET_MEASUREMENT_UNAVAILABLE');
  const raw=sockets.stdout,rows=raw.split('\n').slice(1).filter(Boolean),listeners=[];
  writeFileSync(state+'/verification/phase2-validator-current-sockets.txt',raw,{mode:0o600});
  if(rows.length<3)throw Error('SOCKETS_MISSING');
  for(const line of rows){const match=line.match(/\b(TCP|UDP)\s+(\S+)/);if(!match)throw Error('SOCKET_PARSE');for(const endpoint of match[2].split('->'))if(!/^127\.0\.0\.1:[0-9]+$/.test(endpoint))throw Error('NON_LOOPBACK_SOCKET');const port=Number(match[2].split('->')[0].split(':').at(-1));listeners.push({protocol:match[1].toLowerCase(),address:'127.0.0.1',port,role:port===18899?'rpc':port===18900?'pubsub':port===19900?'faucet':'validator'});}
  for(const port of [18899,18900,19900])if(!listeners.some(r=>r.protocol==='tcp'&&r.port===port))throw Error('REQUIRED_LISTENER_MISSING');
  const service=spawnSync('/usr/sbin/lsof',['-nP','-iTCP:18910','-sTCP:LISTEN'],{encoding:'utf8'});if(service.status===0&&service.stdout.trim())throw Error('ACCEPTANCE_PORT_OCCUPIED');
  const genesisBase58=await rpc('getGenesisHash');if(genesisBase58!=='DiFc6vsemLp95cTNHVEyzGBCKWpKUKR3qRNVLFyM5LQ2')throw Error('GENESIS_CHANGED');
  const program=(await rpc('getAccountInfo',[m.program,{encoding:'base64',commitment:'finalized'}])).value;
  const loader='BPFLoaderUpgradeab1e11111111111111111111111',header=Buffer.from(program.data[0],'base64');
  if(program.owner!==loader||!program.executable||header.length!==36||header.readUInt32LE(0)!==2)throw Error('PROGRAM_LOADER');
  const programData=base58Encode(header.subarray(4));if(findProgramAddress([publicKeyBytes(m.program)],loader).address!==programData)throw Error('PROGRAM_DATA_PDA');
  const pdView=await rpc('getAccountInfo',[programData,{encoding:'base64',commitment:'finalized'}]),pd=pdView.value,bytes=Buffer.from(pd.data[0],'base64');
  const programFile=state+'/build/sbf/sbpfv3-solana-solana/release/axp_machine_market_program.so',elf=readFileSync(programFile);
  if(pd.owner!==loader||pd.executable||bytes.readUInt32LE(0)!==3||bytes.readBigUInt64LE(4)!==0n||bytes[12]!==1||bytes.subarray(13,45).some(Boolean)||!bytes.subarray(45).equals(elf))throw Error('DEPLOYED_BINARY_MISMATCH');
  const resource=phase2Resources();if(!checkPhase2Resources(resource).passed)throw Error('RESOURCE_CAP');
  const proof={schema:'axp.market.validator.readiness.v1',verified:true,loopbackOnly:true,observedAt:new Date().toISOString(),validatorPid:processInfo.pid,validatorBinarySha256:expectedBinary,endpoint:m.endpoint,genesis:publicKeyBytes(genesisBase58).toString('hex'),genesisBase58,program:m.program,programSha256:sha(elf),loader,programData,upgradeAuthority:ZERO_KEY,ledgerDirectory:m.ledger,listeners,socketRows:rows.length,rawSocketSha256:sha(raw),finalizedContextSlot:String(pdView.context.slot),resource};
  writeFileSync(state+'/validator-ready.json',JSON.stringify(proof,null,2)+'\n',{mode:0o600});
  const publicProof={...proof};delete publicProof.ledgerDirectory;writeFileSync(resolve(root,'artifacts/machine-market/phase2/validator-ready.json'),JSON.stringify(publicProof,null,2)+'\n');
  const optionsPath=state+'/phase2-local-options.json';
  if(!existsSync(optionsPath)){
    if(existsSync(state+'/phase2-run'))throw Error('EXISTING_RUN_REQUIRES_RESUME');
    const now=BigInt(await rpc('getSlot',[{commitment:'finalized'}]));
    const sources=Object.fromEntries(['main','consume','sponsored','timing'].map(name=>[name,{file:state+'/phase2-inputs/source-'+name+'.txt',version:'owned-local-'+name+'-v1',format:0}]));
    const options={schema:'axp.market.local.options.v1',bootstrap:{directory:state+'/phase2-run',runId:'phase2-run',endpoint:m.endpoint,serviceOrigin:'http://127.0.0.1:18910',genesis:proof.genesis,program:m.program,programFile,programDeployment:{loader,programData,upgradeAuthority:ZERO_KEY},sources,deadlines:Object.fromEntries(Object.keys(sources).map(name=>[name,(now+4000n).toString()])),readValidUntilSlot:(now+6000n).toString(),maximumWaitMs:1800000,resources:{toolsDirectory:state+'/toolchain',buildDirectory:state+'/build',ledgerDirectory:m.ledger,verificationDirectory:state+'/verification'}}};
    writeFileSync(optionsPath,JSON.stringify(options,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  console.log(JSON.stringify({verified:true,allSocketRowsLoopback:rows.length,genesis:genesisBase58,program:m.program,programHash:proof.programSha256,programData,slot:proof.finalizedContextSlot,ledgerBytes:resource.ledgerBytes,readyForExplicitAcceptance:true}));
}catch(error){
  console.error(error.message);
  const lock=state+'/phase2-validator-running.lock';
  if(existsSync(lock)&&Number(readFileSync(lock,'utf8'))===processInfo.supervisorPid){try{process.kill(processInfo.supervisorPid,'SIGINT');}catch{}}
  process.exitCode=1;
}
