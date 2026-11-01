import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHspDependency} from '../../packages/hsp/loader.mjs';
import {compileRegistry,evmReaders} from '../../packages/hsp/evm.mjs';
// Pure in-process EVM. No listening port, RPC provider or broadcast.
test('registry compiles and enforces immutable registrar, evidence and payment uniqueness on a local EVM',async()=>{
 const {default:ganache}=await loadHspDependency('ganache'),v=await loadHspDependency('viem');const provider=ganache.provider({logging:{quiet:true},chain:{chainId:177},wallet:{deterministic:true}});
 try{const [registrar,other]=await provider.request({method:'eth_accounts',params:[]}),wallet=v.createWalletClient({transport:v.custom(provider)}),client=v.createPublicClient({transport:v.custom(provider)}),artifact=await compileRegistry();
 const deploy=await wallet.deployContract({account:registrar,chain:null,abi:artifact.abi,bytecode:artifact.bytecode,args:[registrar],gas:2000000n});const receipt=await client.waitForTransactionReceipt({hash:deploy}),address=receipt.contractAddress;
 assert.equal((await client.readContract({address,abi:artifact.abi,functionName:'registrar'})).toLowerCase(),registrar.toLowerCase());
 const e={receiptHash:`0x${'11'.repeat(32)}`,paymentReference:`0x${'22'.repeat(32)}`,sourceChainId:133n,token:other,payer:registrar,recipient:other,merchantMicroUsd:1000n,authorizationRaw:1100n,paymentTransaction:`0x${'33'.repeat(32)}`,transferLogIndex:0n},delivery=`0x${'44'.repeat(32)}`;
 const call=(account,id,value)=>wallet.writeContract({account,chain:null,address,abi:artifact.abi,functionName:'recordEvidence',args:[id,value]});
 const checkRevert=async promise=>{try{const tx=await promise;const r=await client.waitForTransactionReceipt({hash:tx});assert.equal(r.status,'reverted');}catch(e){assert.match(String(e),/revert|Unauthorized|Conflicting|InvalidEvidence/);}};
 await checkRevert(call(other,delivery,e));assert.equal((await client.waitForTransactionReceipt({hash:await call(registrar,delivery,e)})).status,'success');
 const saved=await client.readContract({address,abi:artifact.abi,functionName:'commitments',args:[delivery]});assert.notEqual(saved,`0x${'00'.repeat(32)}`);
 assert.equal((await client.waitForTransactionReceipt({hash:await call(registrar,delivery,e)})).logs.length,0);
 await checkRevert(call(registrar,delivery,{...e,merchantMicroUsd:2000n}));await checkRevert(call(registrar,`0x${'55'.repeat(32)}`,e));await checkRevert(call(registrar,`0x${'66'.repeat(32)}`,{...e,sourceChainId:177n,paymentReference:`0x${'77'.repeat(32)}`}));
 assert.equal(artifact.abi.some(x=>x.stateMutability==='payable'),false);
 }finally{await provider.disconnect();}
});
test('EIP-712 signature verifier rejects altered payment data and wrong signer',async()=>{
 const v=await loadHspDependency('viem'),accounts=await loadHspDependency('viem/accounts');const account=accounts.privateKeyToAccount(`0x${'01'.repeat(32)}`),readers=await evmReaders();
 const e={domain:{chainId:133,verifyingContract:`0x${'11'.repeat(20)}`,name:'Fixture',version:'1'},types:{TransferWithAuthorization:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'value',type:'uint256'}]},primaryType:'TransferWithAuthorization',message:{from:account.address,to:`0x${'22'.repeat(20)}`,value:'1000'}};
 const signature=await account.signTypedData(e);assert.equal(await readers.verifySignature(e,signature,account.address),true);assert.equal(await readers.verifySignature({...e,message:{...e.message,value:'2000'}},signature,account.address),false);assert.equal(await readers.verifySignature(e,signature,e.message.to),false);
});
