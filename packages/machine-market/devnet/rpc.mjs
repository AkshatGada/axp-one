/** Separate pinned Devnet transport. Existing literal-loopback adapter is untouched. */
import {reject,publicKeyBytes,canonicalBase64,ZERO_KEY} from '../native/codec.mjs';
import {sha256,findProgramAddress} from '../native/domain.mjs';
import {natural,base58,unbase58} from '../native/phase2-transport-utils.mjs';
import {decodeRpcAccount,validateMarketAccount,BPF_LOADER,BPF_LOADER_DEPRECATED,UPGRADEABLE_LOADER} from '../native/rpc.mjs';
import {isDevnetPlan} from './plan.mjs';
import {hash} from './manifest.mjs';
import {GENESIS,devnetEndpoint} from './manifest.mjs';
import {demand,validateEnvelope} from './legacy.mjs';
export function createDevnetRpc({plan,endpoint,run,programBytes,programDeployment,manifestHash,executionGate=null,provenance='public-devnet-rpc',fetchImpl=globalThis.fetch,timeoutMs=5000,maxResponseBytes=4*1024*1024}={}){
 demand(isDevnetPlan(plan),'REVIEWED_PLAN_REQUIRED');if(plan.manifest.provenance==='ephemeral-offline-fixture')demand(typeof fetchImpl==='function'&&fetchImpl!==globalThis.fetch&&provenance==='injected-offline-rpc','OFFLINE_TRANSPORT_REQUIRED');else demand(fetchImpl===globalThis.fetch&&provenance==='public-devnet-rpc','LIVE_TRANSPORT_OVERRIDE_FORBIDDEN');demand(hash(run)===hash(plan.run)&&manifestHash===plan.manifestHash,'MANIFEST_IDENTITY');demand(hash(Buffer.from(programBytes))===plan.manifest.elf.sha256&&programDeployment?.loader===UPGRADEABLE_LOADER&&programDeployment.programData===plan.programData&&programDeployment.upgradeAuthority===plan.manifest.identities.payer,'PROGRAM_AUTHORITY');
 endpoint=devnetEndpoint(endpoint);if(!run||!Buffer.isBuffer(programBytes)&&!(programBytes instanceof Uint8Array)||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isInteger(maxResponseBytes)||maxResponseBytes<1024||maxResponseBytes>8*1024*1024)reject('INVALID_INPUT');
 demand(typeof manifestHash==='string'&&/^[a-f0-9]{64}$/.test(manifestHash),'MANIFEST_HASH');demand(run.genesis===publicKeyBytes(GENESIS).toString('hex'),'DEVNET_GENESIS_REQUIRED');
 run=Object.freeze(structuredClone(run));programBytes=Buffer.from(programBytes);if(programBytes.length<64||programBytes.length>1048576||!programBytes.subarray(0,4).equals(Buffer.from([127,69,76,70])))reject('RUN_MISMATCH');
 const programHash=sha256(programBytes);let nextId=1;
 async function call(method,params){
  const id=nextId++,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);timer.unref?.();
  try{
   const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
   if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))reject('PENDING_SETTLEMENT');
   const reader=response.body?.getReader();if(!reader)reject('RUN_MISMATCH');const chunks=[];let total=0;
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maxResponseBytes){await reader.cancel();reject('CAPACITY');}chunks.push(value);}
   let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reject('RUN_MISMATCH');}
   if(value?.jsonrpc!=='2.0'||value.id!==id||Object.hasOwn(value,'error')||!Object.hasOwn(value,'result'))reject('PENDING_SETTLEMENT');return value.result;
  }catch(error){if(error?.code&&['RUN_MISMATCH','PENDING_SETTLEMENT','CAPACITY'].includes(error.code))throw error;reject('PENDING_SETTLEMENT');}finally{clearTimeout(timer);}
 }
 const commitment={commitment:'finalized'};
 const rpc={endpoint,run,programHash,
  async accounts(addresses,{minContextSlot='0'}={}){natural(minContextSlot);if(BigInt(minContextSlot)>BigInt(Number.MAX_SAFE_INTEGER))reject('RUN_MISMATCH');if(!Array.isArray(addresses)||addresses.length<1||addresses.length>100||new Set(addresses).size!==addresses.length)reject('INVALID_INPUT');addresses.forEach(publicKeyBytes);const value=await call('getMultipleAccounts',[addresses,{...commitment,encoding:'base64',minContextSlot:Number(minContextSlot)}]);const contextSlot=natural(value?.context?.slot);if(BigInt(contextSlot)<BigInt(minContextSlot)||!Array.isArray(value?.value)||value.value.length!==addresses.length)reject('RUN_MISMATCH');return {contextSlot,accounts:value.value.map((a,i)=>decodeRpcAccount(addresses[i],a))};},
  async slot(){return natural(await call('getSlot',[commitment]));},
  async blockHeight(){return natural(await call('getBlockHeight',[commitment]));},
  async latestBlockhash(){const v=await call('getLatestBlockhash',[commitment]);publicKeyBytes(v?.value?.blockhash);return {blockhash:v.value.blockhash,lastValidBlockHeight:natural(v.value.lastValidBlockHeight),contextSlot:natural(v.context.slot)};},
  async feeForMessage(message){const bytes=Buffer.isBuffer(message)?message:canonicalBase64(message);if(bytes.length>1232)reject('CAPACITY');const v=await call('getFeeForMessage',[bytes.toString('base64'),{...commitment,encoding:'base64'}]);if(v?.value===null)reject('PENDING_SETTLEMENT');return {fee:natural(v.value),contextSlot:natural(v.context.slot)};},
  async rentForLength(length){if(!Number.isInteger(length)||length<0||length>1048576)reject('INVALID_INPUT');return natural(await call('getMinimumBalanceForRentExemption',[length,commitment]));},
  async transaction(signature){unbase58(signature,64);return call('getTransaction',[signature,{...commitment,encoding:'base64',maxSupportedTransactionVersion:0}]);},
  async signatureStatus(signature){unbase58(signature,64);const v=await call('getSignatureStatuses',[[signature],{searchTransactionHistory:true}]);if(!Array.isArray(v?.value)||v.value.length!==1)reject('RUN_MISMATCH');return {contextSlot:natural(v.context.slot),value:v.value[0]};},
  async blockhashValid(blockhash){publicKeyBytes(blockhash);const v=await call('isBlockhashValid',[blockhash,commitment]);if(typeof v?.value!=='boolean')reject('RUN_MISMATCH');return {contextSlot:natural(v.context.slot),valid:v.value};},
  async inspectRun({requireMarket=true,minContextSlot='0'}={}){
   const genesis=await call('getGenesisHash',[]);if(unbase58(genesis,32).toString('hex')!==run.genesis)reject('RUN_MISMATCH');
   const view=await rpc.accounts([run.program,...(requireMarket?[run.market]:[])],{minContextSlot});const p=view.accounts[0];if(p.missing||!p.executable)reject('RUN_MISMATCH');let representation,coherent=view;
   if([BPF_LOADER,BPF_LOADER_DEPRECATED].includes(p.owner)){
    if(programDeployment?.loader&&programDeployment.loader!==p.owner||!p.data.equals(programBytes))reject('RUN_MISMATCH');representation={loader:p.owner,programData:null,programHash,paddingBytes:0};
   }else if(p.owner===UPGRADEABLE_LOADER){
    if(!programDeployment||programDeployment.loader!==UPGRADEABLE_LOADER||!Object.hasOwn(programDeployment,'upgradeAuthority')||p.data.length!==36||p.data.readUInt32LE(0)!==2)reject('RUN_MISMATCH');
    const address=base58(p.data.subarray(4));if(address!==programDeployment.programData||findProgramAddress([publicKeyBytes(run.program)],UPGRADEABLE_LOADER).address!==address)reject('RUN_MISMATCH');
    const pdview=await rpc.accounts([run.program,address,...(requireMarket?[run.market]:[])],{minContextSlot:view.contextSlot});coherent=pdview;const currentProgram=pdview.accounts[0],pd=pdview.accounts[1];if(currentProgram.missing||currentProgram.owner!==p.owner||!currentProgram.executable||!currentProgram.data.equals(p.data))reject('RUN_MISMATCH');
    if(pd.missing||pd.owner!==UPGRADEABLE_LOADER||pd.executable||pd.data.length<45+programBytes.length||pd.data.readUInt32LE(0)!==3)reject('RUN_MISMATCH');
    const tag=pd.data[12];if(![0,1].includes(tag))reject('RUN_MISMATCH');const authority=tag===1?base58(pd.data.subarray(13,45)):null;
    if(authority!==programDeployment.upgradeAuthority||tag===0&&pd.data.subarray(13,45).some(Boolean)||pd.data.readBigUInt64LE(4)>BigInt(pdview.contextSlot)||!pd.data.subarray(45,45+programBytes.length).equals(programBytes)||pd.data.subarray(45+programBytes.length).some(Boolean))reject('RUN_MISMATCH');
    representation={loader:p.owner,programData:address,upgradeAuthority:authority,programHash,paddingBytes:pd.data.length-45-programBytes.length};
   }else reject('RUN_MISMATCH');
   const market=requireMarket?validateMarketAccount(coherent.accounts[coherent===view?1:2],run):null;
   return {authority:provenance,nativeEvidence:provenance==='public-devnet-rpc',genesis:run.genesis,program:run.program,market:run.market,contextSlot:coherent.contextSlot,representation,marketAccount:market};
  },
  async verifyNetwork(){const genesis=await call('getGenesisHash',[]);demand(genesis===GENESIS,'DEVNET_GENESIS_REQUIRED');return genesis;},
  async submitOperation(operation,{assertPersisted}={}){
   if(plan.manifest.provenance!=='ephemeral-offline-fixture')demand(plan.manifest.authorization.financialRootGo===true,'ACTION_TIME_APPROVAL_REQUIRED');
   demand(operation?.manifestHash===manifestHash&&operation.state==='SendIntent'&&typeof assertPersisted==='function','DURABLE_SEND_REQUIRED');
   const expected=plan.build(operation.id,operation.quote);demand(expected.kind===operation.kind&&expected.message===operation.message&&expected.messageHash===operation.messageHash&&hash(expected.requiredSigners)===hash(operation.requiredSigners),'SEND_POLICY_MISMATCH');
   const signed=validateEnvelope({...operation,transaction:operation.attempt?.transaction});demand(signed.signature===operation.attempt.signature,'SIGNED_MESSAGE_MISMATCH');
   await rpc.verifyNetwork();const valid=await rpc.blockhashValid(operation.blockhash);demand(valid.valid&&BigInt(await rpc.blockHeight())<=BigInt(operation.quote.lastValidBlockHeight),'EXPIRED');
   demand(executionGate&&typeof executionGate.assertAllowed==='function','ACTION_TIME_APPROVAL_REQUIRED');
   const allowed=await executionGate.assertAllowed({network:'solana-devnet',endpoint,genesis:GENESIS,manifestHash,operationId:operation.id,messageHash:operation.messageHash,signature:signed.signature,kind:operation.kind,stage:'send'});demand(allowed===true,'ACTION_TIME_APPROVAL_REQUIRED');demand(assertPersisted(operation)===true,'DURABLE_SEND_REQUIRED');
   const signature=await call('sendTransaction',[signed.transaction,{encoding:'base64',preflightCommitment:'finalized',skipPreflight:operation.kind==='probe',maxRetries:0}]);demand(signature===signed.signature,'RPC_SIGNATURE_MISMATCH');return signature;
  },
 };
 return Object.freeze(rpc);
}
