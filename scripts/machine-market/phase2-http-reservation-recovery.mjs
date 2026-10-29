/** Checkpointed continuation of the one interrupted pre-trade HTTP case. */
import {decodeAuthorization,canonicalBase64} from '../../packages/machine-market/native/codec.mjs';
import {hash} from './phase2-acceptance-schedule.mjs';
const demand=(ok,code)=>{if(!ok)throw Error(code);};
const proof=(id,evidence,assertions)=>({id,status:'passed',evidenceHashes:evidence.map(hash),assertions});
export async function recoverHttpReservations({config,context,journal,runtime,recovery,bid}){
 demand(recovery?.schema==='axp.market.http-reservation.recovery.v1'&&recovery.originalStepId==='concrete:http-reservations'&&/^[a-f0-9]{64}$/.test(recovery.originalJournalSha256),'HTTP_RECOVERY_BINDING');
 const original=journal.get(recovery.originalStepId);demand(original&&original.state==='Prepared'&&!original.result,'HTTP_RECOVERY_ORIGINAL_CHANGED');
 const repeated=bid('same-nonce','10000'),decoded=decodeAuthorization(canonicalBase64(repeated.authorization));
 demand(decoded.orderId===recovery.carriedOrderId&&recovery.carriedOrderVersion===1&&recovery.carriedHoldLamports==='10000','HTTP_RECOVERY_LIABILITY');
 const rootId='recovery:http-reservations';
 return runtime.step(rootId,{kind:'checkpointed-partial-http-recovery',originalStepId:recovery.originalStepId,originalJournalSha256:recovery.originalJournalSha256,carriedOrderId:recovery.carriedOrderId,carriedHoldLamports:'10000'},async()=>{
  const results=[];
  results.push(await runtime.step('recovery:http-carried-duplicate',{kind:'same-original-order-two-http-keys',orderId:decoded.orderId,carriedHoldLamports:'10000'},async()=>{
   const before=await context.store.captureWallet(config.run.buyerA),order=await context.store.getOrder(decoded.orderId);demand(order.state==='Open'&&order.version===1&&before.held==='10000','HTTP_RECOVERY_LIABILITY');
   const same=await Promise.all([runtime.http('/orders',repeated),runtime.http('/orders',{...repeated,idempotencyKey:repeated.idempotencyKey+'-alias'})]);
   demand(same.every(r=>r.value.orderId===decoded.orderId&&r.value.state==='Open')&&(await context.store.captureWallet(config.run.buyerA)).held==='10000','NONCE_DUPLICATE_HOLD');
   const evidence=same.map(r=>r.evidence);return {evidence,proofs:['T2:same-nonce-http-key','T3:http-same-nonce-race'].map(id=>proof(id,evidence,['both-real-concurrent-retries-return-original-order','one-original-carried-reservation','no-new-order-or-principal']))};
  }));
  const cancelId='recovery:http-carried-cancel',capture=journal.get(cancelId)?.intent?.capture??await context.store.captureWallet(config.run.buyerA);
  results.push(await runtime.step(cancelId,{kind:'release-original-reservation-once',orderId:decoded.orderId,capture},async()=>{
   const order=await context.store.getOrder(decoded.orderId),env=runtime.envelope('http-reservations','same-nonce-cancel',order.actor,{kind:'Cancel',originalOrderId:order.id,originalNonce:order.nonce,originalAuthHash:order.authHash,expectedOrderVersion:String(recovery.carriedOrderVersion)});
   const cancelled=await runtime.http('/orders/cancel',env);demand(cancelled.value.state==='Cancelled','HTTP_RECOVERY_CANCEL');let refused=false;
   try{await context.store.admitAuthorization(bid('watermark-new','10000'),{currentSlot:await context.rpc.slot(),walletContext:capture});}catch(error){refused=error.code==='STALE_CURSOR';}
   demand(refused&&(await context.store.captureWallet(config.run.buyerA)).held==='0','STALE_WALLET_CAPTURE_ACCEPTED');
   return {evidence:[cancelled.evidence],proofs:[proof('T3:wallet-watermark',[cancelled.evidence],['original-hold-released-once','pre-cancellation-wallet-version-refused'])]};
  }));
  const pairId='recovery:http-shared-pair',pairIntent=journal.get(pairId)?.intent??{kind:'new-explicit-recovery-http-race',amount:(BigInt((await context.store.captureWallet(config.run.buyerA)).available)*3n/5n).toString()};
  const pairEnvs=['a','b'].map(name=>bid('recovery-shared-'+name,pairIntent.amount));
  const pair=await runtime.step(pairId,pairIntent,async()=>{
   demand((await context.store.captureWallet(config.run.buyerA)).held==='0','HTTP_RECOVERY_UNEXPECTED_HOLD');
   const responses=await Promise.all(pairEnvs.map(env=>runtime.http('/orders',env,{expected:[200,409]})));demand(responses.filter(r=>r.evidence.status===200).length===1&&responses.filter(r=>r.evidence.status===409).length===1,'SHARED_BALANCE_RACE');
   const winner=responses.findIndex(r=>r.evidence.status===200),order=responses[winner].value;demand((await context.store.captureWallet(config.run.buyerA)).held===pairIntent.amount,'HTTP_RECOVERY_SHARED_HOLD');
   const evidence=responses.map(r=>r.evidence);return {evidence,winner,winnerVersion:order.version,proofs:[proof('T3:http-shared-balance-race',evidence,['separately-declared-recovery-requests','two-real-concurrent-http-requests','one-reservation-one-refusal'])]};
  });results.push(pair);
  results.push(await runtime.step('recovery:http-shared-cancel',{kind:'release-recovery-shared-hold',winner:pair.winner,amount:pairIntent.amount},async()=>{
   const order=await context.store.getOrder(decodeAuthorization(canonicalBase64(pairEnvs[pair.winner].authorization)).orderId),env=runtime.envelope('http-reservations','recovery-shared-cancel',order.actor,{kind:'Cancel',originalOrderId:order.id,originalNonce:order.nonce,originalAuthHash:order.authHash,expectedOrderVersion:String(pair.winnerVersion)}),cancelled=await runtime.http('/orders/cancel',env);
   demand(cancelled.value.state==='Cancelled'&&(await context.store.captureWallet(config.run.buyerA)).held==='0','HOLDS_NOT_RELEASED');return {evidence:[cancelled.evidence],proofs:[]};
  }));
  results.push(await runtime.step('recovery:http-ioc',{kind:'resume-original-unsubmitted-ioc'},async()=>{
   const response=await runtime.http('/orders',bid('ioc','10000',{tif:1}));demand(response.value.state==='NoFill'&&(await context.store.captureWallet(config.run.buyerA)).held==='0','IOC_RESTED');return {evidence:[response.evidence],proofs:[proof('T1:ioc-gtc',[response.evidence],['IOC-never-rested','all-carried-and-recovery-holds-zero'])]};
  }));
  return {evidence:results.flatMap(r=>r.evidence),proofs:results.flatMap(r=>r.proofs),originalInterruptedStepPreserved:true,originalJournalSha256:recovery.originalJournalSha256,finalHeldLamports:'0'};
 });
}
