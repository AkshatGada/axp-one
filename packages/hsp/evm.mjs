import {readFileSync} from 'node:fs';
import {loadHspDependency} from './loader.mjs';
import {check,sameAddress,txHash} from './config.mjs';
import {hash} from '../contracts/index.mjs';
export async function compileRegistry(){const {default:solc}=await loadHspDependency('solc');const source=readFileSync(new URL('../../contracts/hsk/AXPDeliveryRegistry.sol',import.meta.url),'utf8');const input={language:'Solidity',sources:{'AXPDeliveryRegistry.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}};const output=JSON.parse(solc.compile(JSON.stringify(input)));check(!output.errors?.some(e=>e.severity==='error'),'hsp_contract_compile_failed');const c=output.contracts['AXPDeliveryRegistry.sol'].AXPDeliveryRegistry;return {abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,compiler:solc.version(),input,sourceHash:hash(source)};}
export async function evmReaders({qaRpcURL,mainnetRpcURL='https://mainnet.hsk.xyz'}={}){
 const v=await loadHspDependency('viem');const qa=v.createPublicClient({transport:v.http(qaRpcURL??'https://testnet.hsk.xyz',{retryCount:0})}),main=v.createPublicClient({transport:v.http(mainnetRpcURL,{retryCount:0})});
 const balance=async(payer,token)=>{check(await qa.getChainId()===133,'hsp_rpc_chain_mismatch');check(await qa.readContract({address:token,abi:v.erc20Abi,functionName:'decimals'})===6,'hsp_token_decimals');return String(await qa.readContract({address:token,abi:v.erc20Abi,functionName:'balanceOf',args:[payer]}));};
 const verifySignature=async(e,signature,payer)=>{try{const {EIP712Domain,...types}=e.types;return await v.verifyTypedData({address:payer,domain:e.domain,types,primaryType:e.primaryType,message:e.message,signature});}catch{return false;}};
 const verifyTransfer=async t=>{
  check(await qa.getChainId()===133,'hsp_rpc_chain_mismatch');const r=await qa.getTransactionReceipt({hash:t.txHash});check(r.status==='success','hsp_rpc_transaction_failed');
  const finalized=await qa.getBlock({blockTag:'finalized'});check(finalized.number>=r.blockNumber,'hsp_rpc_not_finalized');
  const logs=r.logs.filter(log=>sameAddress(log.address,t.token)).flatMap(log=>{try{const e=v.decodeEventLog({abi:v.erc20Abi,eventName:'Transfer',data:log.data,topics:log.topics});return [{...e.args,logIndex:log.logIndex}];}catch{return [];}});
  const matches=logs.filter(l=>sameAddress(l.from,t.payer)&&sameAddress(l.to,t.payee)&&l.value===BigInt(t.principalRaw));check(matches.length===1,'hsp_rpc_transfer_mismatch');
  return {verified:true,chainId:133,transactionHash:t.txHash,blockNumber:String(r.blockNumber),blockHash:r.blockHash,logIndex:matches[0].logIndex,recipientRaw:String(matches[0].value),finality:'finalized'};
 };
 const expiredAuthorizationUnused=async(e,t)=>{
  check(await qa.getChainId()===133,'hsp_rpc_chain_mismatch');const block=await qa.getBlock({blockTag:'finalized'});const deadline=BigInt(t.protocol==='eip3009'?e.message.validBefore:e.message.deadline);if(block.timestamp<=deadline)return false;
  if(t.protocol==='eip3009'){const abi=[{type:'function',name:'authorizationState',stateMutability:'view',inputs:[{name:'authorizer',type:'address'},{name:'nonce',type:'bytes32'}],outputs:[{type:'bool'}]}];return await qa.readContract({address:t.token,abi,functionName:'authorizationState',args:[t.payer,e.message.nonce],blockNumber:block.number})===false;}
  const nonce=BigInt(e.message.nonce),abi=[{type:'function',name:'nonceBitmap',stateMutability:'view',inputs:[{name:'owner',type:'address'},{name:'wordPos',type:'uint256'}],outputs:[{type:'uint256'}]}];const used=await qa.readContract({address:t.permit2,abi,functionName:'nonceBitmap',args:[t.payer,nonce>>8n],blockNumber:block.number});return (used&(1n<<(nonce&255n)))===0n;
 };
 return {v,qa,main,balance,verifySignature,verifyTransfer,expiredAuthorizationUnused};
}
export async function createRegistryClient({address:registryAddress,registrar,main,artifact=null,maxFeeWei,deployment}){
 const v=await loadHspDependency('viem'),compiled=artifact??await compileRegistry();
 const identity=async()=>{check(deployment?.transactionHash,'hsp_verified_deployment_required');const proof=await verifyRegistryDeployment({transactionHash:deployment.transactionHash,registrar,main});check(sameAddress(proof.address,registryAddress)&&proof.sourceHash===compiled.sourceHash,'hsp_registry_source_mismatch');check(await main.getChainId()===177,'hsp_registry_chain_mismatch');check(sameAddress(await main.readContract({address:registryAddress,abi:compiled.abi,functionName:'registrar'}),registrar),'hsp_registry_registrar_mismatch');};
 const evidence=(row,t)=>({receiptHash:`0x${row.receiptHash}`,paymentReference:`0x${hash([row.flowId,row.paymentRequestId])}`,sourceChainId:133n,token:t.token,payer:t.payer,recipient:t.payee,merchantMicroUsd:BigInt(row.amountBaseUnits),authorizationRaw:BigInt(row.quote.token_total_raw),paymentTransaction:row.txHash,transferLogIndex:BigInt(row.transfer.logIndex)});
 const data=(row,t)=>v.encodeFunctionData({abi:compiled.abi,functionName:'recordEvidence',args:[`0x${hash(row.chargeId)}`,evidence(row,t)]});
 return {
  async prepare(row,t){await identity();const request={from:registrar,to:registryAddress,data:data(row,t),value:'0x0'};await main.call({...request,account:registrar});const gas=await main.estimateGas({...request,account:registrar});const gasPrice=await main.getGasPrice();check(BigInt(maxFeeWei??'0')>0n&&gas*gasPrice<=BigInt(maxFeeWei),'hsp_registry_gas_cap');return {chainId:177,transaction:{...request,gas:v.toHex(gas),gasPrice:v.toHex(gasPrice)},estimatedFeeWei:String(gas*gasPrice),label:'HSK mainnet operator-attested QA evidence anchor',sourceChainId:133};},
  async verify(transactionHash,row,t){check(txHash(transactionHash),'hsp_registry_tx_invalid');await identity();const tx=await main.getTransaction({hash:transactionHash}),r=await main.getTransactionReceipt({hash:transactionHash});check(sameAddress(tx.from,registrar)&&sameAddress(tx.to,registryAddress)&&tx.input===data(row,t)&&r.status==='success','hsp_registry_transaction_mismatch');const block=await main.getBlock({blockTag:'finalized'});check(block.number>=r.blockNumber,'hsp_registry_not_finalized');const commitment=await main.readContract({address:registryAddress,abi:compiled.abi,functionName:'commitments',args:[`0x${hash(row.chargeId)}`]});const field=compiled.abi.find(x=>x.name==='recordEvidence').inputs[1];const expected=v.keccak256(v.encodeAbiParameters([field],[evidence(row,t)]));check(commitment===expected,'hsp_registry_commitment_mismatch');return {verified:true,chainId:177,registry:registryAddress,transactionHash,blockNumber:String(r.blockNumber),commitment,sourceChainId:133,deployment:{transactionHash:deployment.transactionHash,registrar}};}
 };
}

// Generates an unsigned mainnet deployment only. Broadcasting belongs to the user wallet.
export async function prepareRegistryDeployment({registrar,main,maxFeeWei}){
 const v=await loadHspDependency('viem'),artifact=await compileRegistry();check(await main.getChainId()===177,'hsp_registry_chain_mismatch');
 const data=v.encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode,args:[registrar]});const gas=await main.estimateGas({account:registrar,data});const gasPrice=await main.getGasPrice();check(BigInt(maxFeeWei)>0n&&gas*gasPrice<=BigInt(maxFeeWei),'hsp_registry_gas_cap');
 return {chainId:177,registrar,transaction:{from:registrar,data,gas:v.toHex(gas),gasPrice:v.toHex(gasPrice),value:'0x0'},compiler:artifact.compiler,sourceHash:artifact.sourceHash,estimatedFeeWei:String(gas*gasPrice),broadcast:false};
}
export async function verifyRegistryDeployment({transactionHash,registrar,main}){
 const v=await loadHspDependency('viem'),artifact=await compileRegistry();check(await main.getChainId()===177,'hsp_registry_chain_mismatch');const tx=await main.getTransaction({hash:transactionHash}),r=await main.getTransactionReceipt({hash:transactionHash});
 check(tx.to===null&&sameAddress(tx.from,registrar)&&tx.input===v.encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode,args:[registrar]})&&r.status==='success'&&r.contractAddress,'hsp_registry_deployment_mismatch');const block=await main.getBlock({blockTag:'finalized'});check(block.number>=r.blockNumber,'hsp_registry_not_finalized');const code=await main.getCode({address:r.contractAddress});check(code&&code!=='0x','hsp_registry_code_missing');
 return {verified:true,chainId:177,address:r.contractAddress,registrar,transactionHash,blockNumber:String(r.blockNumber),runtimeCodeHash:v.keccak256(code),compiler:artifact.compiler,sourceHash:artifact.sourceHash};
}
