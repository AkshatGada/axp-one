// Public RPC fixtures only: exercise the real preflight gates with no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV3PaymentEnvironment,V3_NETWORK} from '../../packages/payments/v3-feasibility.mjs';

function fixture({tokens='14000',lamports=15268080}={}) {
  const methods=[],programBytes=Buffer.alloc(36);programBytes.writeUInt32LE(2);
  const loader='BPFLoaderUpgradeab1e11111111111111111111111';
  const dataAddress='fake:program-data',treasury='Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP';
  const sdkProvider=async()=>({manifest:{sourceCommit:'fake:commit',packageVersion:'fake:version'},
    kit:{address:x=>x,getAddressDecoder:()=>({decode:()=>dataAddress})},
    token:{findAssociatedTokenPda:async({owner})=>[`ata:${owner}`]},generated:{getChannelEncoder:()=>({fixedSize:256})}});
  const rpcCall=async(method,params)=>{
    methods.push(method);
    if(method==='getGenesisHash')return V3_NETWORK.genesisHash;
    if(method==='getBalance')return {value:lamports};
    if(method==='getMinimumBalanceForRentExemption')return 2000000;
    assert.equal(method,'getAccountInfo','no simulations, signing, funding or broadcast RPC');
    const address=params[0];
    if(address===V3_NETWORK.program)return {value:{executable:true,owner:loader,data:[programBytes.toString('base64'),'base64']}};
    if(address===dataAddress)return {value:{owner:loader,data:[Buffer.from('fake:deployed-bytes').toString('base64'),'base64']}};
    if(address===V3_NETWORK.mint)return {value:{owner:V3_NETWORK.tokenProgram,data:{parsed:{type:'mint',info:{decimals:6,isInitialized:true}}}}};
    const owner=address.slice(4);assert.ok([V3_NETWORK.payer,V3_NETWORK.payee,treasury].includes(owner));
    return {value:{owner:V3_NETWORK.tokenProgram,data:{parsed:{info:{owner,mint:V3_NETWORK.mint,state:'initialized',tokenAmount:{amount:owner===V3_NETWORK.payer?tokens:'0',decimals:6}}}}}};
  };
  return {sdkProvider,rpcCall,methods};
}

test('token shortfall is balance-blocked before unsigned simulation; not SDK-incompatible',async()=>{
  const f=fixture(),result=await inspectV3PaymentEnvironment({...f,simulate:true});
  assert.equal(result.reasonCode,'insufficient_test_balances');assert.equal(result.zeroCloseCompatibility,'blocked_insufficient_test_balance');
  assert.equal(result.balances.payerBaseUnits,'14000');assert.equal(result.balances.payerLamports,'15268080');
  assert.equal(result.simulation,undefined);assert.equal(f.methods.includes('simulateTransaction'),false);
});

test('rent/fee shortfall also gates before simulation; identity-only recheck allows remaining deposit calculation',async()=>{
  const f=fixture({tokens:'40000',lamports:1000});
  assert.equal((await inspectV3PaymentEnvironment({...f,simulate:true})).zeroCloseCompatibility,'blocked_insufficient_test_balance');
  const current=await inspectV3PaymentEnvironment({...f,simulate:false});
  assert.equal(current.status,'checked');assert.equal(current.compatible,true);assert.equal(current.balancesSufficient,false);
  assert.equal(current.zeroCloseCompatibility,'unknown');assert.equal(f.methods.includes('simulateTransaction'),false);
});

test('current program-data changes fail the frozen deployment guard without simulation',async()=>{
  const f=fixture({tokens:'40000'}),prior=await inspectV3PaymentEnvironment({...f,simulate:false});
  assert.equal(prior.status,'checked');
  const rejected=await inspectV3PaymentEnvironment({...f,simulate:false,expected:{...prior,programDataHash:'changed'}});
  assert.equal(rejected.reasonCode,'deployment_changed');assert.equal(rejected.compatible,false);assert.equal(f.methods.includes('simulateTransaction'),false);
});
