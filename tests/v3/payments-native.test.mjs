// Pinned native SDK, unsigned fixtures only. Never RPC or external wallet files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {V3_NETWORK} from '../../packages/payments/v3-feasibility.mjs';

test('native zero close omits voucher/precompile and compiles seal/distribute unsigned', {skip:!existsSync('local-state/phase4-sdk/manifest.json')},async()=>{
  const {kit,onChain}=await loadNativeSDK();
  const channel='11111111111111111111111111111111';
  const seal=onChain.buildSettleAndSealInstructions({channelId:channel,merchantSigner:kit.createNoopSigner(kit.address(V3_NETWORK.payee)),programId:kit.address(V3_NETWORK.program)});
  assert.equal(seal.requiresEd25519Precompile,false);assert.equal(seal.instructions.length,1);
  assert.equal(seal.instructions[0].data.at(-1),0,'native hasVoucher=0, not an invented signed zero voucher');
  const distribute=await onChain.buildDistributeInstruction({channelState:{channelId:channel,payer:V3_NETWORK.payer,payee:V3_NETWORK.payee},mint:V3_NETWORK.mint,rentPayer:V3_NETWORK.payer,tokenProgram:V3_NETWORK.tokenProgram,splits:[],programId:kit.address(V3_NETWORK.program)});
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayer(V3_NETWORK.payer,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({blockhash:channel,lastValidBlockHeight:1n},m),m=>kit.appendTransactionMessageInstructions([...seal.instructions,distribute],m));
  const transaction=kit.compileTransaction(message);
  assert.ok(Object.values(transaction.signatures).every(s=>s===null||s.every(b=>b===0)));
  assert.equal(message.instructions.length,2);assert.ok(Object.hasOwn(transaction.signatures,V3_NETWORK.payer));assert.ok(Object.hasOwn(transaction.signatures,V3_NETWORK.payee));
});

test('same persisted salt/open slot deterministically derives identity; two salts differ', {skip:!existsSync('local-state/phase4-sdk/manifest.json')},async()=>{
  const {kit,paymentChannels}=await loadNativeSDK();
  const request={amount:'1',currency:V3_NETWORK.mint,recipient:V3_NETWORK.payee,methodDetails:{network:'mainnet',channelProgram:V3_NETWORK.program,recentBlockhash:'11111111111111111111111111111111',recentSlot:'1',gracePeriodSeconds:900,feePayer:false}};
  const parameters={request,payer:V3_NETWORK.payer,authorizedSigner:V3_NETWORK.payer,deposit:'20000',salt:'100',tokenProgram:V3_NETWORK.tokenProgram,programAddress:kit.address(V3_NETWORK.program)};
  const first=await paymentChannels.derivePaymentChannelOpen(parameters),again=await paymentChannels.derivePaymentChannelOpen(parameters),second=await paymentChannels.derivePaymentChannelOpen({...parameters,salt:'101'});
  assert.equal(first.channelId,again.channelId);assert.notEqual(first.channelId,second.channelId);
});
