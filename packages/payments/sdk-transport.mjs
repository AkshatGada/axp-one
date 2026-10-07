import {openSync,readFileSync,closeSync,fstatSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadNativeSDK} from './sdk-loader.mjs';
import {NativeSessionStore} from './native-store.mjs';
import {signPreparedWire} from './unsigned-transaction.mjs';
import {testWalletPath} from '../config/local.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
// Per-network treasury owner compiled into that cluster's program build. The pinned
// SDK always derives the mainnet owner's ATA; the Devnet build rejects it (Custom
// 2401). Devnet value observed from successful on-chain distributes, see
// docs/build/DEVNET_FEASIBILITY.md. Sandbox (mainnet fork) keeps the SDK owner.
const SDK_TREASURY='Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP';
export const NETWORK_ENVIRONMENTS=Object.freeze({devnet:Object.freeze({rpc:'https://api.devnet.solana.com',genesis:'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',mint:'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',treasuryOwner:'4zTeC5mVqWLruDexgU2mV66p9t5vCA9JyiZqdGDUspap'}),sandbox:Object.freeze({rpc:'https://402.surfnet.dev:8899',genesis:'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',treasuryOwner:SDK_TREASURY})});
const allowed=NETWORK_ENVIRONMENTS;
const PROGRAM='CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const DISTRIBUTE_TREASURY_INDEX=6;
/** Point the SDK-built distribute at the network's treasury ATA. No-op when equal. */
export function retargetDistributeTreasury({instruction,sdkTreasuryAta,treasuryAta}) {
  if(sdkTreasuryAta===treasuryAta)return instruction;
  if(instruction?.accounts?.[DISTRIBUTE_TREASURY_INDEX]?.address!==sdkTreasuryAta)throw new Error('distribute_layout_mismatch');
  return {...instruction,accounts:instruction.accounts.map((a,i)=>i===DISTRIBUTE_TREASURY_INDEX?{...a,address:treasuryAta}:a)};
}
export function assertUnsignedPlanFresh({currentBlockHeight,lastValidBlockHeight,blockhashValid}){if(blockhashValid!==true||!Number.isSafeInteger(currentBlockHeight)||!Number.isSafeInteger(Number(lastValidBlockHeight))||BigInt(currentBlockHeight)+20n>=BigInt(lastValidBlockHeight)){const e=Error('unsigned_plan_expired');e.code='unsigned_plan_expired';throw e;}return true;}
export async function createNativeTransport({terms,statePath,walletPath=testWalletPath(),rpcURL}) {
  const environment=allowed[terms.mode];
  if(!environment||terms.rpc!==environment.rpc||terms.genesisHash!==environment.genesis||terms.mint!==environment.mint||terms.program!==PROGRAM||terms.tokenProgram!==TOKEN)throw new Error('frozen_environment_mismatch');
  let endpoint=terms.rpc;
  if(rpcURL!==undefined){const url=new URL(rpcURL);if(terms.mode!=='devnet'||url.username||url.password||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))))throw new Error('devnet_rpc_url_invalid');endpoint=url.href;}
  const depositBaseUnits=terms.depositBaseUnits??'20000';
  if(!/^[1-9][0-9]*$/.test(depositBaseUnits)||BigInt(depositBaseUnits)>10000000n)throw new Error('deposit_invalid');
  const deposit=BigInt(depositBaseUnits);
  const sdk=await loadNativeSDK(),{kit,token,generated,paymentChannels,sessionClient,sessionServer,onChain,voucher: voucherSDK}=sdk;
  // HTTP 429 (public RPC rate limit) is retried with the IDENTICAL request body; for
  // sendTransaction that is the same signed wire, so no new identity can arise.
  async function rpc(method,params=[]) {const body=JSON.stringify({jsonrpc:'2.0',id:1,method,params});let response;for(let attempt=0;;attempt++){response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});if(response.status!==429||attempt>=4)break;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}if(!response.ok)throw new Error(`rpc_http_${response.status}`);const data=await response.json();if(data.error)throw new Error(`${method}:${JSON.stringify(data.error)}`);return data.result;}
  if(await rpc('getGenesisHash')!==terms.genesisHash)throw new Error('genesis_mismatch');
  const program=(await rpc('getAccountInfo',[terms.program,{encoding:'base64',commitment:'finalized'}])).value;
  if(!program?.executable||sha(Buffer.from(program.data[0],'base64'))!==terms.programAccountHash)throw new Error('deployment_changed');
  if(rpcURL!==undefined){const bytes=Buffer.from(program.data[0],'base64');if(bytes.readUInt32LE(0)!==2)throw new Error('deployment_changed');const address=kit.getAddressDecoder().decode(bytes.subarray(4,36)),pd=(await rpc('getAccountInfo',[address,{encoding:'base64',commitment:'finalized'}])).value;if(!terms.programDataHash||pd?.owner!==program.owner||sha(Buffer.from(pd.data[0],'base64'))!==terms.programDataHash)throw new Error('deployment_changed');}
  // Load the ignored local wallet only at an explicit signing call, never
  // during construction, unsigned preflight, lookup or reconciliation.
  let signerCache;
  async function signers() {
  if(signerCache)return signerCache;
  const fd=openSync(walletPath,constants.O_RDONLY|constants.O_NOFOLLOW);let wallet;
  try {const stat=fstatSync(fd);if((stat.mode&0o777)!==0o600||stat.uid!==process.getuid()||!stat.isFile())throw new Error('wallet_permissions');wallet=JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
  const payer=await kit.createKeyPairSignerFromBytes(Uint8Array.from(wallet.sponsor.secret));
  const payee=await kit.createKeyPairSignerFromBytes(Uint8Array.from(wallet.publisher.secret));wallet=null;
  if(payer.address!==terms.payer||payee.address!==terms.payee)throw new Error('disposable_identity_mismatch');
  signerCache={payer,payee};return signerCache;
  }
  const store=new NativeSessionStore(statePath);
  const assertPlanFresh=async({plan})=>{const currentBlockHeight=await rpc('getBlockHeight',[{commitment:'confirmed'}]),valid=await rpc('isBlockhashValid',[plan.latest.value.blockhash,{commitment:'confirmed'}]);return assertUnsignedPlanFresh({currentBlockHeight,lastValidBlockHeight:plan.latest.value.lastValidBlockHeight,blockhashValid:valid.value});};
  const routes=sessionServer.session.routes({store,currency:terms.mint,network:terms.mode==='sandbox'?'mainnet':'devnet',settlementWindowSeconds:60n});
  const ata=async owner=>(await token.findAssociatedTokenPda({owner:kit.address(owner),mint:kit.address(terms.mint),tokenProgram:kit.address(TOKEN)}))[0];
  const TREASURY=environment.treasuryOwner;
  const accounts={payer:await ata(terms.payer),payee:await ata(terms.payee),treasury:await ata(TREASURY),sdkTreasury:await ata(SDK_TREASURY)};
  const balance=async address=>{const a=(await rpc('getAccountInfo',[address,{encoding:'base64',commitment:'finalized'}])).value;return a?BigInt(Buffer.from(a.data[0],'base64').readBigUInt64LE(64)).toString():'0';};
  const snapshot=async()=>({payerBaseUnits:await balance(accounts.payer),publisherBaseUnits:await balance(accounts.payee),payerLamports:String((await rpc('getBalance',[terms.payer,{commitment:'finalized'}])).value)});
  const unsignedWire=(instructions,latest)=>{const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayer(terms.payer,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions(instructions,m));return kit.getBase64EncodedWireTransaction(kit.compileTransaction(message));};
  async function estimated(wire,additionalRent) {const tx=kit.getTransactionDecoder().decode(Buffer.from(wire,'base64'));const fee=(await rpc('getFeeForMessage',[Buffer.from(tx.messageBytes).toString('base64'),{commitment:'confirmed'}])).value;if(fee===null)throw new Error('blockhash_expired');const cost=BigInt(fee)+additionalRent;if(cost>20000000n)throw new Error('fee_cap_exceeded');const simulation=await rpc('simulateTransaction',[wire,{encoding:'base64',sigVerify:false,commitment:'confirmed'}]);if(simulation.value.err)throw new Error(`transaction_simulation_failed:${JSON.stringify(simulation.value.err)}`);return {fee:String(fee),cost:cost.toString(),units:simulation.value.unitsConsumed};}
  async function unsignedClose(plan) {
    const unsignedPayer=kit.createNoopSigner(kit.address(terms.payer)),unsignedPayee=kit.createNoopSigner(kit.address(terms.payee)),setup=[];
    let rent=0n;
    for(const [owner,account] of [[terms.payee,accounts.payee],[TREASURY,accounts.treasury]])if(!(await rpc('getAccountInfo',[account,{commitment:'finalized',encoding:'base64'}])).value){
      setup.push(token.getCreateAssociatedTokenIdempotentInstruction({payer:unsignedPayer,ata:account,owner:kit.address(owner),mint:kit.address(terms.mint),tokenProgram:kit.address(TOKEN)}));rent+=BigInt(await rpc('getMinimumBalanceForRentExemption',[165]));
    }
    const seal=onChain.buildSettleAndSealInstructions({channelId:plan.protocolChannelId,merchantSigner:unsignedPayee,programId:kit.address(PROGRAM),...(plan.finalVoucher?{voucher:{authorizedSigner:terms.payer,signed:plan.finalVoucher}}:{})});
    const distribute=retargetDistributeTreasury({instruction:await onChain.buildDistributeInstruction({channelState:{channelId:plan.protocolChannelId,payer:terms.payer,payee:terms.payee},mint:terms.mint,rentPayer:terms.payer,tokenProgram:TOKEN,splits:[],programId:kit.address(PROGRAM)}),sdkTreasuryAta:accounts.sdkTreasury,treasuryAta:accounts.treasury});
    const wire=unsignedWire([...setup,...seal.instructions,distribute],plan.latest),estimate=await estimated(wire,rent);
    return {unsignedWireBase64:wire,estimatedFeeAndRentLamports:estimate.cost,simulation:estimate};
  }
  async function lookup({plan,signed},kind) {
    const status=(await rpc('getSignatureStatuses',[[signed.txSignature],{searchTransactionHistory:true}])).value[0];
    if(!status)return {status:'unknown',txSignature:signed.txSignature};
    if(status.err)return {status:'failed',txSignature:signed.txSignature};
    if(status.confirmationStatus!=='finalized')return {status:'submitted',txSignature:signed.txSignature};
    const transaction=await rpc('getTransaction',[signed.txSignature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]);
    if(!transaction?.meta||transaction.meta.err)throw new Error('finalized_transaction_unavailable');
    const meta=transaction.meta,keys=transaction.transaction.message.accountKeys;
    const tokenAmount=(rows,owner)=>(rows??[]).filter(x=>x.mint===terms.mint&&x.owner===owner).reduce((sum,x)=>sum+BigInt(x.uiTokenAmount.amount),0n);
    const deltas={payer:(tokenAmount(meta.postTokenBalances,terms.payer)-tokenAmount(meta.preTokenBalances,terms.payer)).toString(),publisher:(tokenAmount(meta.postTokenBalances,terms.payee)-tokenAmount(meta.preTokenBalances,terms.payee)).toString(),treasury:(tokenAmount(meta.postTokenBalances,TREASURY)-tokenAmount(meta.preTokenBalances,TREASURY)).toString()};
    const newRent=meta.postBalances.reduce((sum,x,i)=>sum+(keys[i]!==terms.payer&&meta.preBalances[i]===0?BigInt(x):0n),0n);
    const reclaimed=meta.preBalances.reduce((sum,x,i)=>sum+(keys[i]!==terms.payer&&meta.postBalances[i]===0?BigInt(x):0n),0n);
    const exactTokens=rows=>(rows??[]).map(({uiTokenAmount,...record})=>({...record,uiTokenAmount:{amount:uiTokenAmount.amount,decimals:uiTokenAmount.decimals,uiAmountString:uiTokenAmount.uiAmountString}}));
    const evidence={txSignature:signed.txSignature,slot:transaction.slot,blockTime:transaction.blockTime,finality:'finalized',tokenDeltas:deltas,networkFeeLamports:String(meta.fee),newRentLamports:newRent.toString(),reclaimedRentLamports:reclaimed.toString(),accounts:keys,preBalances:meta.preBalances,postBalances:meta.postBalances,preTokenBalances:exactTokens(meta.preTokenBalances),postTokenBalances:exactTokens(meta.postTokenBalances),logs:meta.logMessages,postSnapshot:await snapshot()};
    if(kind==='open') {
      const account=(await rpc('getAccountInfo',[plan.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value;
      if(account?.owner!==PROGRAM)throw new Error('channel_owner_mismatch');
      const channel=generated.getChannelDecoder().decode(Buffer.from(account.data[0],'base64'));
      if(channel.payer!==terms.payer||channel.payee!==terms.payee||channel.mint!==terms.mint||channel.authorizedSigner!==terms.payer||channel.deposit!==deposit||channel.openSlot!==BigInt(plan.open.openSlot)||channel.salt!==BigInt(plan.open.salt)||deltas.payer!==`-${depositBaseUnits}`)throw new Error('channel_open_evidence_mismatch');
      // Native open verifier + verified finalized chain account establish session.
      // HTTP challenge authentication is not exposed by this trusted local worker.
      await store.updateChannel(plan.protocolChannelId,current=>current??{schemaVersion:1,channelId:plan.protocolChannelId,authorizedSigner:terms.payer,payer:terms.payer,rentPayer:terms.payer,deposit,cumulative:0n,spentAmount:0n,settledOnChain:0n,sealed:false,openSlot:BigInt(plan.open.openSlot),openingChallengeId:plan.challengeId,committedDeliveries:[],pendingDeliveries:[],processedUses:[],nextDeliverySequence:0n,voucherSigner:'client'});
      return {status:'finalized',txSignature:signed.txSignature,finality:'finalized',protocolChannelId:plan.protocolChannelId,depositBaseUnits,evidence};
    }
    if(deltas.publisher!==plan.watermark.cumulativeAmountBaseUnits||deltas.payer!==(deposit-BigInt(plan.watermark.cumulativeAmountBaseUnits)).toString()||deltas.treasury!=='0')throw new Error('settlement_balance_mismatch');
    await store.updateChannel(plan.protocolChannelId,current=>({...current,sealed:true,settledOnChain:BigInt(plan.watermark.cumulativeAmountBaseUnits),settledSignature:signed.txSignature}));
    return {status:'finalized',txSignature:signed.txSignature,finality:'finalized',settledBaseUnits:deltas.publisher,refundBaseUnits:deltas.payer,publisherDeltaBaseUnits:deltas.publisher,feeAndRentLamports:(BigInt(meta.fee)+newRent).toString(),evidence};
  }
  async function submit(input,kind) {const signature=await rpc('sendTransaction',[input.signed.wireBase64,{encoding:'base64',skipPreflight:false,maxRetries:0,preflightCommitment:'confirmed'}]);if(signature!==input.signed.txSignature)throw new Error('submission_identity_mismatch');for(let i=0;i<20;i++){const receipt=await lookup(input,kind);if(receipt.status==='finalized'||receipt.status==='failed')return receipt;await new Promise(r=>setTimeout(r,500));}return {status:'submitted',txSignature:signature};}
  async function reserveDelivery({channel,charge}) {const response=await routes.deliveries(new Request('http://127.0.0.1/__402/session/deliveries',{method:'POST',body:JSON.stringify({sessionId:channel.protocolChannelId,deliveryId:charge.id,amount:charge.amountBaseUnits,expiresAt:terms.voucherExpiresAt,proof:{acceptedReceiptHash:charge.acceptedReceiptHash}})}));const directive=await response.json();if(!response.ok)throw new Error(`native_reservation:${JSON.stringify(directive)}`);return {deliveryId:charge.id,amountBaseUnits:charge.amountBaseUnits,nativeDirective:directive};}
  async function commitReceipt(input,submitCommit) {if(!await voucherSDK.verifyVoucherSignature({signatureBase58:input.voucher.signature,signerBase58:terms.payer,voucher:input.voucher.voucher}))throw new Error('native_voucher_signature_invalid');if(submitCommit){const response=await routes.commit(new Request('http://127.0.0.1/__402/session/commit',{method:'POST',body:JSON.stringify({deliveryId:input.intent.charge.id,voucher:input.voucher})}));const receipt=await response.json();if(!response.ok||receipt.amount!==input.intent.charge.amountBaseUnits||receipt.cumulative!==input.intent.cumulativeAmountBaseUnits)throw new Error(`native_commit:${JSON.stringify(receipt)}`);}const state=await store.getChannel(input.channel.protocolChannelId),record=state?.committedDeliveries.find(d=>d.deliveryId===input.intent.charge.id);if(!record||record.voucherSignature!==input.voucher.signature||record.amount.toString()!==input.intent.charge.amountBaseUnits||record.cumulative.toString()!==input.intent.cumulativeAmountBaseUnits)return {status:'unknown'};return {status:'authorized',deliveryId:record.deliveryId,incrementBaseUnits:record.amount.toString(),cumulativeAmountBaseUnits:record.cumulative.toString(),payloadHash:input.voucher.payloadHash};}
  return {
    evidenceLabel:'native_mpp_test_network',snapshot,assertPlanFresh,close:()=>store.close(),
    async prepareOpen() {const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);const request={amount:'1',currency:terms.mint,recipient:terms.payee,suggestedDeposit:depositBaseUnits,minimumDeposit:depositBaseUnits,methodDetails:{network:terms.mode==='sandbox'?'mainnet':'devnet',channelProgram:PROGRAM,tokenProgram:TOKEN,recentBlockhash:latest.value.blockhash,recentSlot:String(latest.context.slot),feePayer:false,gracePeriodSeconds:900,voucherSigner:'client',distributionSplits:[]}};const parameters={request,payer:terms.payer,authorizedSigner:terms.payer,deposit:depositBaseUnits,salt:terms.openSalt??String(Date.now()),programAddress:kit.address(PROGRAM),tokenProgram:TOKEN};const open=await paymentChannels.buildOpenPaymentChannelTransaction({...parameters,signer:kit.createNoopSigner(kit.address(terms.payer))});const rent=BigInt(await rpc('getMinimumBalanceForRentExemption',[generated.getChannelEncoder().fixedSize]))+BigInt(await rpc('getMinimumBalanceForRentExemption',[165]));const estimate=await estimated(open.transaction,rent);return {protocolChannelId:open.channelId,request,open,latest,challengeId:sha(JSON.stringify(request)),before:await snapshot(),unsignedWireBase64:open.transaction,estimatedFeeAndRentLamports:estimate.cost,simulation:estimate};},
    async signOpen({plan}) {await assertPlanFresh({plan});const {payer}=await signers();const wire=await signPreparedWire({kit,plan,signers:[payer]});const open=plan.open,payload={...open,depositAmount:open.deposit,gracePeriodSeconds:open.gracePeriod,transaction:wire,authorizedSigner:terms.payer};await onChain.verifyOpenTx({openPayload:payload,expected:{authorizedSigner:terms.payer,channelProgram:PROGRAM,currency:terms.mint,feePayer:terms.payer,minimumDeposit:deposit,mint:terms.mint,network:terms.mode==='sandbox'?'mainnet':'devnet',openSlot:BigInt(plan.open.openSlot),recentBlockhash:plan.latest.value.blockhash,recipient:terms.payee,rentPayer:terms.payer,splits:[],tokenProgram:TOKEN}});return {wireBase64:wire,txSignature:onChain.transactionSignatureFromWire(wire),blockhash:plan.latest.value.blockhash,lastValidBlockHeight:String(plan.latest.value.lastValidBlockHeight),estimatedFeeAndRentLamports:plan.estimatedFeeAndRentLamports,simulation:plan.simulation};},
    submitOpen:input=>submit(input,'open'),lookupOpen:input=>lookup(input,'open'),reserveDelivery,
    async prepareVoucher({channel,intent}) {const {payer}=await signers();const session=new sessionClient.ActiveSession({channelId:channel.protocolChannelId,signer:payer,cumulative:BigInt(intent.previousAmountBaseUnits),expiresAt:terms.voucherExpiresAt});const signed=await session.prepareVoucher(BigInt(intent.cumulativeAmountBaseUnits));return {...signed,payloadHash:sha(voucherSDK.encodeVoucherMessageLoose(signed.voucher))};},
    commitVoucher:input=>commitReceipt(input,true),lookupCommit:input=>commitReceipt(input,false),
    async prepareClose({channel,finalVoucher,watermark}) {
      const state=await store.getChannel(channel.protocolChannelId),zero=terms.zeroChargeClose===true&&watermark.cumulativeAmountBaseUnits==='0';
      if(!state||state.sealed||state.cumulative.toString()!==watermark.cumulativeAmountBaseUnits||state.pendingDeliveries.length
        ||(zero?(finalVoucher!==undefined||state.highestVoucherSignature!==undefined||state.committedDeliveries.length!==0):state.highestVoucherSignature!==finalVoucher?.signature))throw new Error('native_not_drained');
      await store.updateChannel(channel.protocolChannelId,current=>({...current,closeRequestedAt:BigInt(Math.floor(Date.now()/1000))}));
      const plan={protocolChannelId:channel.protocolChannelId,...(finalVoucher?{finalVoucher}:{}),watermark,latest:await rpc('getLatestBlockhash',[{commitment:'confirmed'}]),before:await snapshot()};return {...plan,...await unsignedClose(plan)};
    },
    async signClose({plan}) {await assertPlanFresh({plan});const {payer,payee}=await signers();const wire=await signPreparedWire({kit,plan,signers:[payer,payee]});return {wireBase64:wire,txSignature:onChain.transactionSignatureFromWire(wire),blockhash:plan.latest.value.blockhash,lastValidBlockHeight:String(plan.latest.value.lastValidBlockHeight),estimatedFeeAndRentLamports:plan.estimatedFeeAndRentLamports,simulation:plan.simulation};},
    submitClose:input=>submit(input,'close'),lookupClose:input=>lookup(input,'close'),
  };
}
