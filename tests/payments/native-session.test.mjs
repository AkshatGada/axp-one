import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {NativeSessionStore} from '../../packages/payments/native-store.mjs';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {signPreparedWire} from '../../packages/payments/unsigned-transaction.mjs';

test('native open builds unsigned, then signs the exact estimated message (ephemeral fixture only)',{skip:!existsSync('local-state/phase4-sdk/manifest.json')},async()=>{
  const sdk=await loadNativeSDK(),signer=await sdk.kit.generateKeyPairSigner(),recipient=(await sdk.kit.generateKeyPairSigner()).address;
  const request={amount:'1',currency:'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',recipient,methodDetails:{network:'devnet',channelProgram:'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',recentBlockhash:'11111111111111111111111111111111',recentSlot:'1',feePayer:false,gracePeriodSeconds:900}};
  const open=await sdk.paymentChannels.buildOpenPaymentChannelTransaction({request,signer:sdk.kit.createNoopSigner(signer.address),authorizedSigner:signer.address,deposit:'20000',salt:'1'});
  const unsigned=sdk.kit.getTransactionDecoder().decode(Buffer.from(open.transaction,'base64'));assert.ok(Object.values(unsigned.signatures).every(s=>s===null||s.every(b=>b===0)));
  let calls=0;const counted={...signer,async signTransactions(txs){calls++;return signer.signTransactions(txs);}};
  await assert.rejects(()=>signPreparedWire({kit:sdk.kit,plan:{unsignedWireBase64:open.transaction},signers:[counted]}),/unsigned_preflight_required/);assert.equal(calls,0);
  const wire=await signPreparedWire({kit:sdk.kit,plan:{unsignedWireBase64:open.transaction,simulation:{cost:'1000'},estimatedFeeAndRentLamports:'1000'},signers:[counted]});
  const signed=sdk.kit.getTransactionDecoder().decode(Buffer.from(wire,'base64'));assert.deepEqual(signed.messageBytes,unsigned.messageBytes);assert.equal(calls,1);assert.ok(Object.values(signed.signatures).every(s=>s?.length===64&&!s.every(b=>b===0)));
  await sdk.onChain.verifyOpenTx({openPayload:{...open,transaction:wire,depositAmount:'20000',gracePeriodSeconds:900,authorizedSigner:signer.address},expected:{authorizedSigner:signer.address,channelProgram:request.methodDetails.channelProgram,currency:request.currency,feePayer:signer.address,minimumDeposit:20000n,mint:request.currency,network:'devnet',openSlot:1n,recentBlockhash:request.methodDetails.recentBlockhash,recipient,rentPayer:signer.address,splits:[],tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'}});
});

test('native durable store retains bigint watermarks and unknown fields across restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'axp-native-test-'));let store=new NativeSessionStore(join(dir,'native.sqlite'));
  try{await store.updateChannel('test',()=>({schemaVersion:1,channelId:'test',cumulative:9007199254740993n,extra:{future:'retained'}}));store.close();store=new NativeSessionStore(join(dir,'native.sqlite'));assert.equal((await store.getChannel('test')).cumulative,9007199254740993n);assert.equal((await store.getChannel('test')).extra.future,'retained');await Promise.all([1,2].map(()=>store.updateChannel('test',async s=>({...s,cumulative:s.cumulative+1n}))));assert.equal((await store.getChannel('test')).cumulative,9007199254740995n);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('native cooperative closure signs saved unsigned message with both fixture signers; no RPC', {skip:!existsSync('local-state/phase4-sdk/manifest.json')},async()=>{
  const sdk=await loadNativeSDK(),payer=await sdk.kit.generateKeyPairSigner(),payee=await sdk.kit.generateKeyPairSigner(),channel=(await sdk.kit.generateKeyPairSigner()).address,program=sdk.kit.address('CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX');
  const session=new sdk.sessionClient.ActiveSession({channelId:channel,signer:payer,cumulative:0n,expiresAt:Math.floor(Date.now()/1000)+3600});const voucher=await session.prepareVoucher(6000n);
  const seal=sdk.onChain.buildSettleAndSealInstructions({channelId:channel,merchantSigner:sdk.kit.createNoopSigner(payee.address),programId:program,voucher:{authorizedSigner:payer.address,signed:voucher}});
  const distribute=await sdk.onChain.buildDistributeInstruction({channelState:{channelId:channel,payer:payer.address,payee:payee.address},mint:'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',rentPayer:payer.address,tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',splits:[],programId:program});
  const message=sdk.kit.pipe(sdk.kit.createTransactionMessage({version:0}),m=>sdk.kit.setTransactionMessageFeePayer(payer.address,m),m=>sdk.kit.setTransactionMessageLifetimeUsingBlockhash({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:1n},m),m=>sdk.kit.appendTransactionMessageInstructions([...seal.instructions,distribute],m));
  const unsigned=sdk.kit.compileTransaction(message),wire=await signPreparedWire({kit:sdk.kit,plan:{unsignedWireBase64:sdk.kit.getBase64EncodedWireTransaction(unsigned),simulation:{cost:'15000'},estimatedFeeAndRentLamports:'15000'},signers:[payer,payee]});
  const signed=sdk.kit.getTransactionDecoder().decode(Buffer.from(wire,'base64'));assert.deepEqual(Buffer.from(signed.messageBytes),Buffer.from(unsigned.messageBytes));assert.ok(signed.signatures[payer.address]?.some(b=>b!==0));assert.ok(signed.signatures[payee.address]?.some(b=>b!==0));assert.equal(sdk.onChain.transactionSignatureFromWire(wire).length>0,true);
});

test('pinned native session routes verify two cumulative vouchers and exact commit replay (ephemeral fixture signer, not chain evidence)',{skip:!existsSync('local-state/phase4-sdk/manifest.json')},async()=>{
  const sdk=await loadNativeSDK(),signer=await sdk.kit.generateKeyPairSigner(),channelId=(await sdk.kit.generateKeyPairSigner()).address;
  const store=new NativeSessionStore(':memory:'),expiresAt=Math.floor(Date.now()/1000)+3600;
  try {
    await store.updateChannel(channelId,()=>({schemaVersion:1,channelId,authorizedSigner:signer.address,payer:signer.address,rentPayer:signer.address,deposit:20000n,cumulative:0n,spentAmount:0n,settledOnChain:0n,sealed:false,committedDeliveries:[],pendingDeliveries:[],processedUses:[],nextDeliverySequence:0n,voucherSigner:'client'}));
    const routes=sdk.sessionServer.session.routes({store,currency:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',network:'mainnet',settlementWindowSeconds:60n});
    let previous=0n;
    for(const [deliveryId,total] of [['first',3000n],['second',6000n]]) {
      const reserved=await routes.deliveries(new Request('http://localhost/__402/session/deliveries',{method:'POST',body:JSON.stringify({sessionId:channelId,deliveryId,amount:'3000',expiresAt})}));assert.equal(reserved.status,200);
      const session=new sdk.sessionClient.ActiveSession({channelId,signer,cumulative:previous,expiresAt});
      const voucher=await session.prepareVoucher(total);assert.equal(sdk.voucher.encodeVoucherMessageLoose(voucher.voucher).byteLength,50);
      const req=()=>new Request('http://localhost/__402/session/commit',{method:'POST',body:JSON.stringify({deliveryId,voucher})});
      const committed=await(await routes.commit(req())).json();assert.equal(committed.status,'committed');assert.equal(committed.cumulative,total.toString());
      const replay=await(await routes.commit(req())).json();assert.equal(replay.status,'replayed');assert.equal(replay.cumulative,total.toString());previous=total;
    }
    const state=await store.getChannel(channelId);assert.equal(state.cumulative,6000n);assert.equal(state.spentAmount,6000n);assert.equal(state.committedDeliveries.length,2);
    await store.updateChannel(channelId,s=>({...s,closeRequestedAt:BigInt(Math.floor(Date.now()/1000))}));
    const rejected=await routes.deliveries(new Request('http://localhost/__402/session/deliveries',{method:'POST',body:JSON.stringify({sessionId:channelId,deliveryId:'extra',amount:'1',expiresAt})}));assert.equal(rejected.status,400);
  }finally {store.close();}
});
