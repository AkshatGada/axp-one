/** Explicit literal-loopback finalized RPC. No env/config/signing or automatic retries. */
import {reject,publicKeyBytes,decodeAccount,canonicalBase64,ZERO_KEY} from './codec.mjs';
import {sha256,deriveMarketPda,findProgramAddress} from './domain.mjs';
import {natural,base58,unbase58,verifyPersistedTransaction} from './phase2-transport-utils.mjs';
export const BPF_LOADER='BPFLoader2111111111111111111111111111111111';
export const BPF_LOADER_DEPRECATED='BPFLoader1111111111111111111111111111111111';
export const UPGRADEABLE_LOADER='BPFLoaderUpgradeab1e11111111111111111111111';
export function localEndpoint(endpoint){if(typeof endpoint!=='string'||!/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.test(endpoint)||Number(endpoint.split(':').at(-1))>65535)reject('RUN_MISMATCH');return endpoint;}
export function decodeRpcAccount(address,value){
 publicKeyBytes(address);if(value===null)return {address,missing:true};
 if(!value||typeof value!=='object'||typeof value.executable!=='boolean'||!Array.isArray(value.data)||value.data.length!==2||value.data[1]!=='base64')reject('RUN_MISMATCH');
 publicKeyBytes(value.owner);const data=canonicalBase64(value.data[0]);if(data.length>1048576)reject('CAPACITY');
 return {address,owner:value.owner,lamports:natural(value.lamports),executable:value.executable,data,dataHash:sha256(data),missing:false};
}
export function validateMarketAccount(account,run){
 if(account.missing||account.owner!==run.program||account.executable||deriveMarketPda(run).address!==account.address)reject('RUN_MISMATCH');const m=decodeAccount(account.data);
 if(m.kind!=='Market'||m.market!==run.market||account.address!==run.market||m.state!==1)reject('RUN_MISMATCH');
 for(const field of ['initializer','marketNonce','genesis','matcher','gateway','issuer','buyerA','buyerB','sponsor'])if(m[field]!==run[field])reject('RUN_MISMATCH');
 if(m.feeCollector!==run.collector||m.feeBps!==100||m.maxTransfers!==3||m.maxSeries!==16||m.maxUnits!==64||m.maxMatches!==256||m.leaseSlots!=='150'||m.maxGross!=='1000000000')reject('RUN_MISMATCH');return m;
}
export function createLocalRpc({endpoint,run,programBytes,programDeployment,fetchImpl=globalThis.fetch,timeoutMs=5000,maxResponseBytes=4*1024*1024}={}){
 endpoint=localEndpoint(endpoint);if(!run||!Buffer.isBuffer(programBytes)&&!(programBytes instanceof Uint8Array)||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isInteger(maxResponseBytes)||maxResponseBytes<1024||maxResponseBytes>8*1024*1024)reject('INVALID_INPUT');
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
   return {authority:'verified-local-validator',nativeEvidence:true,genesis:run.genesis,program:run.program,market:run.market,contextSlot:coherent.contextSlot,representation,marketAccount:market};
  },
  async sendPersisted(operation,{assertPersisted}={}){
   if(typeof assertPersisted!=='function'||operation?.state!=='SendIntent')reject('PENDING_SETTLEMENT');
   const verified=verifyPersistedTransaction(operation,run);await rpc.inspectRun({requireMarket:operation.instruction.type!=='Init'});const valid=await rpc.blockhashValid(operation.attempt.blockhash);if(!valid.valid||BigInt(await rpc.blockHeight())>BigInt(operation.attempt.lastValidBlockHeight))reject('PENDING_SETTLEMENT');
   // Atomic single-use claim belongs to the core DB. No reusable boolean/read proof.
   if(assertPersisted(operation)!==true)reject('PENDING_SETTLEMENT');
   const signature=await call('sendTransaction',[verified.bytes.toString('base64'),{encoding:'base64',skipPreflight:false,preflightCommitment:'finalized',maxRetries:0}]);if(signature!==verified.signature)reject('RUN_MISMATCH');return {signature,transactionHash:verified.transactionHash};
  },
 };
 return Object.freeze(rpc);
}
