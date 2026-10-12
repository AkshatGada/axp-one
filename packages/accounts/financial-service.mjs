// Account-native authority. No wallet files, demo signers or browser ledger.
import {randomUUID,randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {mkdirSync} from 'node:fs';
import {hash,strictObject,baseUnits} from '../contracts/index.mjs';
import {network,inspectProductDevnet} from '../product/native.mjs';
import {solanaAddress,verifyWalletProof,walletChallengeMessage} from './wallet-proof.mjs';
import {createExternalSolanaTransport} from './external-solana-transport.mjs';

const fail=(code,status=400)=>{throw Object.assign(Error(code),{code,status});};
const key=(kind,id)=>`${kind}:${id}`;
const safeFields=['id','resourceId','organizationId','ownerId','purpose','network','address','verifiedAt'];
const walletDTO=v=>Object.fromEntries(safeFields.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
const amount=(v,max)=>{if(typeof v!=='string'||!/^[1-9][0-9]*$/.test(v)||BigInt(v)>BigInt(max))fail('amount_invalid');return v;};
const empty=()=>({charges:[],acceptedBaseUnits:'0',reservedBaseUnits:'0'});
const uuid=v=>{if(typeof v!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v))fail('not_found',404);return v;};

export function createAccountFinancialService({repository,store,origin,stateDir,exchange=null,
 now=Date.now,preflight=inspectProductDevnet,transportFactory=createExternalSolanaTransport,
 broadcastEnabled=false,checkpoint=async()=>{}}={}){
 if(!repository||!store||!origin||!stateDir)fail('account_funding_configuration_required',503);
 const u=new URL(origin);if(u.origin!==origin||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))fail('origin_invalid');
 mkdirSync(stateDir,{recursive:true,mode:0o700});
 let tail=Promise.resolve();const serial=fn=>{const job=tail.then(fn);tail=job.catch(()=>{});return job;};
 async function resource(actor,orgId,resourceId,purpose){
  uuid(orgId);uuid(resourceId);
  if(purpose==='funding')return store.campaign(actor,orgId,resourceId);
  const details=await store.details(actor,orgId),app=details.apps.find(a=>a.id===resourceId);if(!app)fail('not_found',404);return app;
 }
 async function wallet(actor,orgId,resourceId,purpose){
  await resource(actor,orgId,resourceId,purpose);const record=await repository.get(key(`wallet:${purpose}`,resourceId));
  if(!record)return null;const w=record.value;if(w.ownerId!==actor||w.organizationId!==orgId)fail('not_found',404);return walletDTO(w);
 }
 async function challenge(actor,orgId,resourceId,purpose,body){return serial(async()=>{
  strictObject(body,['address','network'],['address','network']);await resource(actor,orgId,resourceId,purpose);
  if(body.network!=='solana-devnet')fail('own_wallet_network_unavailable',503);
  const address=solanaAddress(body.address),id=randomUUID(),at=now();
  const outstanding=(await repository.list('wallet_challenge',resourceId)).filter(r=>r.value.expiresAt>at&&!r.value.consumedAt);
  if(outstanding.length>=5)fail('wallet_challenge_limit',409);
  const value={kind:'wallet_challenge',id,resourceId,organizationId:orgId,ownerId:actor,purpose,network:body.network,address,origin,nonce:randomBytes(32).toString('hex'),createdAt:at,expiresAt:at+300000,consumedAt:null};
  value.message=walletChallengeMessage(value);await repository.create(key('wallet-challenge',id),value);
  return {challengeId:id,message:value.message,encoding:'utf8',signatureEncoding:'base58',expiresAt:value.expiresAt,address,network:body.network,purpose};
 });}
 async function verifyWallet(actor,orgId,resourceId,purpose,body){return serial(async()=>{
  strictObject(body,['challengeId','signature'],['challengeId','signature']);uuid(body.challengeId);await resource(actor,orgId,resourceId,purpose);
  let record=await repository.get(key('wallet-challenge',body.challengeId));const c=record?.value;
  if(!c||c.ownerId!==actor||c.organizationId!==orgId||c.resourceId!==resourceId||c.purpose!==purpose||c.origin!==origin)fail('not_found',404);
  if(c.message!==walletChallengeMessage(c)||c.network!=='solana-devnet')fail('wallet_challenge_invalid',409);
  const proofHash=verifyWalletProof({address:c.address,message:c.message,signature:body.signature});
  if(c.consumedAt&&c.proofHash!==proofHash)fail('wallet_challenge_used',409);
  if(!c.consumedAt&&c.expiresAt<=now())fail('wallet_challenge_expired',409);
  // Consume BEFORE installing authority. An uncertain CAS never refreshes or
  // recreates a proof; retry completes the same immutable verified binding.
  const bindingKey=key(`wallet:${purpose}`,resourceId),previous=await repository.get(bindingKey);
  const binding=c.verifiedBinding??{kind:'wallet_binding',id:c.id,resourceId,organizationId:orgId,ownerId:actor,purpose,network:c.network,address:c.address,verifiedAt:Math.max(now(),(previous?.value.verifiedAt??0)+1)};
  if(!c.consumedAt)record=await repository.cas(record.key,record.revision,{...c,consumedAt:now(),proofHash,verifiedBinding:binding});
  const old=await repository.get(bindingKey);
  if(old&&old.value.verifiedAt<binding.verifiedAt)await repository.cas(bindingKey,old.revision,binding);else if(!old)await repository.create(bindingKey,binding);
  return walletDTO(binding);
 });}
 async function owned(actor,orgId,channelId){
  uuid(channelId);const record=await repository.get(key('channel',channelId));if(!record)fail('not_found',404);
  const c=record.value;
  if(c.ownerId===actor&&c.organizationId===orgId){await resource(actor,orgId,c.resourceId,'funding');return {record,role:'payer'};}
  if(c.counterpartyOwnerId===actor&&c.counterpartyOrgId===orgId){await resource(actor,orgId,c.counterpartyAppId,'payout');return {record,role:'payee'};}
  fail('not_found',404);
 }
 function projection(c){return {id:c.id,campaignId:c.resourceId,campaignVersion:c.campaignVersion,appId:c.counterpartyAppId,
  financialMode:'devnet',settlementNetwork:'solana-devnet',asset:'USDC',decimals:6,signingMode:'own_wallet',
  payer:c.terms.payer,payee:c.terms.payee,depositBaseUnits:c.terms.depositBaseUnits,chargeCapBaseUnits:c.terms.chargeCapBaseUnits,
  termsHash:c.termsHash,phase:c.phase,protocolChannelId:c.protocolChannelId??null,authorizedBaseUnits:c.authorizedBaseUnits,
  servingEnabled:c.servingEnabled===true,
  pendingAuthorizationStatus:c.pendingVoucher?.status??null,
  paidBaseUnits:c.paidBaseUnits,refundBaseUnits:c.refundBaseUnits,feeAndRentLamports:c.feeAndRentLamports,
  openStatus:c.open?.status??'not_prepared',closeStatus:c.close?.status??'not_prepared',
  openTransaction:c.open?.signed?.txSignature??null,closeTransaction:c.close?.signed?.txSignature??null,
  requiresReconciliation:['open_submitted','close_submitted','authorization_unknown','preparation_unknown'].includes(c.phase),createdAt:c.createdAt};}
 async function list(actor,orgId,resourceId,purpose){await resource(actor,orgId,resourceId,purpose);
  return {channels:(await repository.list('channel',resourceId)).filter(r=>purpose==='funding'?r.value.ownerId===actor&&r.value.organizationId===orgId:r.value.counterpartyOwnerId===actor&&r.value.counterpartyOrgId===orgId).map(r=>projection(r.value))};}
 async function freeze(actor,orgId,campaignId,body){return serial(async()=>{
  strictObject(body,['expectedVersion','appId','depositBaseUnits'],['expectedVersion','appId','depositBaseUnits']);
  uuid(body.appId);const campaign=await resource(actor,orgId,campaignId,'funding');
  if(campaign.version!==body.expectedVersion)fail('campaign_version_conflict',409);
  if(campaign.status!=='approved'||campaign.approvedContentHash!==hash(campaign.input))fail('campaign_approval_required',409);
  if(campaign.input.settlementNetwork!=='solana-devnet')fail('own_wallet_network_unavailable',503);
  const payer=(await repository.get(key('wallet:funding',campaignId)))?.value,payee=(await repository.get(key('wallet:payout',body.appId)))?.value;
  if(!payer||payer.ownerId!==actor||payer.organizationId!==orgId||!payee||payer.network!=='solana-devnet'||payee.network!=='solana-devnet')fail('verified_wallet_required',409);
  if(payer.address===payee.address)fail('payer_payee_must_differ',409);
  amount(body.depositBaseUnits,'200000');if(BigInt(body.depositBaseUnits)<BigInt(campaign.input.budgetCapBaseUnits))fail('deposit_below_campaign_cap');
  const prior=await repository.list('channel',campaignId);
  if(prior.some(r=>r.value.counterpartyAppId===body.appId))fail('channel_binding_exists',409);
  if(prior.length>=8)fail('channel_limit',409);
  if((await repository.list('channel',body.appId)).some(r=>r.value.terms.payee!==payee.address))fail('app_payout_route_conflict',409);
  // Terms creation never signs, opens or transfers. Deployment/mint preflight
  // remains an injected, read-only dependency; no default managed signer.
  const inspected=await preflight({payer:payer.address,payee:payee.address,depositBaseUnits:body.depositBaseUnits,simulate:true});
  if(inspected.compatible!==true||!inspected.programAccountHash||!inspected.programDataHash)fail('payment_compatibility_unavailable',503);
  const latest=await resource(actor,orgId,campaignId,'funding');if(latest.version!==campaign.version||latest.approvedContentHash!==campaign.approvedContentHash)fail('campaign_version_conflict',409);
  const id=randomUUID(),at=now(),terms={...network,channelId:id,runId:'account-network-native-v1',mode:'devnet',network:'solana-devnet',
   advertiserId:campaign.advertiserId,campaignVersionId:`${campaign.id}-v${campaign.version}`,payer:payer.address,payee:payee.address,
   authorizedSigner:payer.address,depositBaseUnits:body.depositBaseUnits,chargeCapBaseUnits:campaign.input.budgetCapBaseUnits,
   maxBidBaseUnits:campaign.input.maxBidBaseUnits,openSalt:randomBytes(8).readBigUInt64LE().toString(),
   programAccountHash:inspected.programAccountHash,programDataHash:inspected.programDataHash,compatibilityHash:hash(inspected),
   voucherExpiresAt:Math.floor(at/1000)+86400,applicationDeadlineAt:Math.floor(at/1000)+79200,zeroChargeClose:true};
  const value={kind:'channel',id,resourceId:campaignId,organizationId:orgId,ownerId:actor,counterpartyAppId:body.appId,
   counterpartyOrgId:payee.organizationId,counterpartyOwnerId:payee.ownerId,campaignVersion:campaign.version,
   campaignContentHash:campaign.approvedContentHash,terms,termsHash:hash(terms),createdAt:at,phase:'frozen',
   authorizedBaseUnits:'0',paidBaseUnits:'0',refundBaseUnits:'0',feeAndRentLamports:'0',vouchers:[],servingEnabled:false};
  await repository.create(key('channel',id),value);return projection(value);
 });}
 const driver=async c=>transportFactory({terms:c.terms,statePath:join(stateDir,`${c.id}.sqlite`)});
 const save=(record,value)=>repository.cas(record.key,record.revision,value);
 function obligations(c){
  if(!exchange)return empty();
  const charges=exchange.all('charges').filter(v=>v.channelId===c.id),awards=exchange.all('awards').filter(v=>v.channelId===c.id&&v.status==='reserved'&&v.expiresAt>now());
  for(const charge of charges){const a=exchange.require('awards',charge.awardId);if(charge.mode!=='devnet'||charge.runId!==c.terms.runId||a.payee!==c.terms.payee||a.publisherId!==`app:${c.counterpartyAppId}`)fail('ledger_binding_invalid',409);}
  return {charges,acceptedBaseUnits:charges.reduce((n,v)=>n+baseUnits(v.amountBaseUnits),0n).toString(),reservedBaseUnits:awards.reduce((n,v)=>n+baseUnits(v.priceBaseUnits),0n).toString()};
 }
 async function feeGuard(c,plan,replacingKind=null){
  amount(plan.estimatedFeeAndRentLamports,'20000000');
  const all=await repository.list('channel',c.resourceId);
  const used=all.reduce((n,r)=>n+BigInt(r.value.feeAndRentLamports)+BigInt(r.value.open?.status==='finalized'||r.value.id===c.id&&replacingKind==='open'?'0':r.value.open?.plan?.estimatedFeeAndRentLamports??'0')+BigInt(r.value.close?.status==='finalized'||r.value.id===c.id&&replacingKind==='close'?'0':r.value.close?.plan?.estimatedFeeAndRentLamports??'0'),0n);
  if(used+BigInt(plan.estimatedFeeAndRentLamports)>20000000n)fail('aggregate_fee_cap_exceeded',409);
 }
 async function execute(actor,orgId,channelId,action,body={}){return serial(async()=>{
  let {record,role}=await owned(actor,orgId,channelId);let c=record.value;
  if(c.termsHash!==hash(c.terms))fail('channel_terms_corrupt',409);
  const payerOnly=['open/prepare','open/sign','voucher/prepare','voucher/sign','serving'];
  if(payerOnly.includes(action)&&role!=='payer')fail('not_found',404);
  if(action==='serving'){
   strictObject(body,['expectedVersion','enabled'],['expectedVersion','enabled']);
   if(body.expectedVersion!==c.campaignVersion||typeof body.enabled!=='boolean')fail('campaign_version_conflict',409);
   const campaign=await resource(actor,orgId,c.resourceId,'funding');
   if(body.enabled&&(c.phase!=='funded'||campaign.version!==c.campaignVersion||campaign.approvedContentHash!==c.campaignContentHash))fail('channel_state_conflict',409);
   return {channel:projection((await save(record,{...c,servingEnabled:body.enabled})).value)};
  }
  const d=await driver(c);try{
   if(action==='open/prepare'||action==='close/prepare'){
    strictObject(body,[],[]);const closing=action.startsWith('close'),kind=closing?'close':'open';
    const previous=c[kind];let history=previous?.history??[];
    // Preparing is unsigned and has no payment side effect. An interrupted
    // preparation can retry the same frozen obligation. Signed unknown attempts
    // are never replaced based on a timeout or a missing RPC response.
    if(previous?.signed)fail('reconcile_existing_attempt',409);
    if(previous?.plan){
     try{await d.assertPlanFresh({plan:previous.plan});return {channel:projection(c),signing:signingPayload(c,kind)};}
     catch(e){if(e.code!=='unsigned_plan_expired')throw e;}
     if(history.length>=16)fail('unsigned_refresh_limit',409);
     const {history:oldHistory,...archived}=previous;history=[...history,{...archived,retiredAt:now(),reason:'unsigned_plan_expired'}];
    }
    const interrupted=c.phase==='preparation_unknown'&&previous?.status==='preparing';
    if(!closing&&!['frozen','awaiting_open_signature'].includes(c.phase)&&!interrupted||closing&&!['funded','draining'].includes(c.phase)&&!interrupted)fail('channel_state_conflict',409);
    if(closing){const o=obligations(c);if(o.reservedBaseUnits!=='0'||o.acceptedBaseUnits!==c.authorizedBaseUnits||c.pendingVoucher)fail('close_not_drained',409);}
    if(!closing){const campaign=await resource(actor,orgId,c.resourceId,'funding');if(campaign.version!==c.campaignVersion||campaign.approvedContentHash!==c.campaignContentHash)fail('campaign_version_conflict',409);}
    record=await save(record,{...c,phase:'preparation_unknown',...(closing?{servingEnabled:false}:{}),[kind]:{status:'preparing',history}});c=record.value;
    if(closing)await restoreNative(d,c);
    const final=c.vouchers.at(-1),plan=closing?await d.prepareClose({channel:{channelId:c.id,protocolChannelId:c.protocolChannelId},...(final?{finalVoucher:final.voucher}:{}),watermark:{cumulativeAmountBaseUnits:c.authorizedBaseUnits}}):await d.prepareOpen();
    await feeGuard(c,plan,kind);record=await save(record,{...c,phase:closing?'draining':'awaiting_open_signature',[kind]:{status:'prepared',plan,history}});await checkpoint('account_unsigned_plan_saved');
    return {channel:projection(record.value),signing:signingPayload(record.value,kind)};
   }
   if(action==='open/sign'||action==='close/sign'){
    strictObject(body,['wireBase64'],['wireBase64']);if(typeof body.wireBase64!=='string'||body.wireBase64.length>20000)fail('transaction_invalid');
    const kind=action.startsWith('close')?'close':'open',attempt=c[kind];if(!attempt?.plan)fail('plan_required',409);
    if(attempt.signed)fail('reconcile_existing_attempt',409);
    if(kind==='open'&&c.phase!=='awaiting_open_signature'||kind==='close'&&c.phase!=='draining')fail('channel_state_conflict',409);
    await d.assertPlanFresh({plan:attempt.plan});
    if(kind==='close'){
     const result=await d.collectCloseSignature({plan:attempt.plan,wireBase64:body.wireBase64,previousWireBase64:attempt.partialWire??null,signerAddress:role==='payer'?c.terms.payer:c.terms.payee});
     record=await save(record,{...c,close:{...attempt,partialWire:result.wireBase64}});c=record.value;
     if(!result.complete)return {channel:projection(c),signing:signingPayload(c,kind)};
     body={wireBase64:result.wireBase64};
    }
    const signed=kind==='open'?await d.acceptSignedOpen({plan:attempt.plan,wireBase64:body.wireBase64}):await d.acceptSignedClose({plan:attempt.plan,wireBase64:body.wireBase64});
    if(!broadcastEnabled)fail('account_payment_broadcast_disabled',503);
    record=await save(record,{...c,phase:`${kind}_submitted`,[kind]:{...c[kind],signed,status:'unknown'}});
    await checkpoint('account_signed_transaction_saved');
    const receipt=await d[kind==='open'?'submitOpen':'submitClose']({plan:attempt.plan,signed});
    return {channel:projection((await recordReceipt(record,kind,receipt)).value)};
   }
   if(action==='reconcile'){
    strictObject(body,[],[]);
    if(c.pendingVoucher?.voucher){
     await restoreNative(d,c);const p=c.pendingVoucher;
     const receipt=await d.recoverVoucher(voucherInput(c,p));
     await checkpoint('account_native_authorization_recovered');
     return {channel:projection((await finishVoucher(record,receipt)).value)};
    }
    const kind=c.close?.signed?'close':c.open?.signed?'open':null;if(!kind)fail('no_reconcilable_attempt',409);
    const attempt=c[kind],receipt=await d[kind==='open'?'lookupOpen':'lookupClose']({plan:attempt.plan,signed:attempt.signed});
    return {channel:projection((await recordReceipt(record,kind,receipt)).value)};
   }
   if(action==='voucher/prepare'){
    strictObject(body,[],[]);
    const interrupted=c.phase==='authorization_unknown'&&c.pendingVoucher?.status==='preparing'&&!c.pendingVoucher.voucher;
    if(c.phase!=='funded'&&!interrupted)fail('channel_state_conflict',409);
    if(c.pendingVoucher?.prepared)return {channel:projection(c),signing:voucherPayload(c.pendingVoucher)};
    const o=obligations(c);if(BigInt(o.acceptedBaseUnits)>BigInt(c.terms.chargeCapBaseUnits)||BigInt(o.acceptedBaseUnits)>BigInt(c.terms.depositBaseUnits))fail('charge_cap_exceeded',409);
    const next=interrupted?o.charges.find(v=>v.id===c.pendingVoucher.chargeId):o.charges.filter(v=>!c.vouchers.some(p=>p.chargeId===v.id)).sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id))[0];if(!next){if(interrupted)fail('ledger_binding_invalid',409);return {channel:projection(c),signing:null};}
    const intent={charge:{id:next.id,amountBaseUnits:next.amountBaseUnits,acceptedReceiptHash:next.receiptHash},previousAmountBaseUnits:c.authorizedBaseUnits,cumulativeAmountBaseUnits:(BigInt(c.authorizedBaseUnits)+BigInt(next.amountBaseUnits)).toString()};
    if(interrupted&&hash(intent)!==hash(c.pendingVoucher.intent))fail('ledger_binding_invalid',409);
    if(!interrupted){record=await save(record,{...c,phase:'authorization_unknown',pendingVoucher:{chargeId:next.id,intent,status:'preparing'}});c=record.value;}
    await restoreNative(d,c);
    const channel={channelId:c.id,protocolChannelId:c.protocolChannelId}, {reservation,prepared}=await d.resumeVoucherPreparation({channel,intent});
    record=await save(record,{...c,phase:'funded',pendingVoucher:{chargeId:next.id,intent,reservation,prepared,status:'prepared'}});await checkpoint('account_voucher_request_saved');
    return {channel:projection(record.value),signing:voucherPayload(record.value.pendingVoucher)};
   }
   if(action==='voucher/sign'){
    strictObject(body,['signature'],['signature']);const p=c.pendingVoucher;if(!p?.prepared||p.voucher)fail('reconcile_existing_attempt',409);
    if(now()>=c.terms.applicationDeadlineAt*1000)fail('application_deadline',409);
    const o=obligations(c);if(!o.charges.some(v=>v.id===p.chargeId&&v.receiptHash===p.intent.charge.acceptedReceiptHash&&v.amountBaseUnits===p.intent.charge.amountBaseUnits))fail('ledger_binding_invalid',409);
    const voucher=await d.acceptSignedVoucher({prepared:p.prepared,signature:body.signature});
    record=await save(record,{...c,phase:'authorization_unknown',pendingVoucher:{...p,voucher,status:'unknown'}});await checkpoint('account_signed_voucher_saved');
    const receipt=await d.commitVoucher(voucherInput(record.value,record.value.pendingVoucher));await checkpoint('account_native_authorization_saved');
    return {channel:projection((await finishVoucher(record,receipt)).value)};
   }
   fail('not_found',404);
  }finally{d.close?.();}
 });}
 const voucherInput=(c,p)=>({channel:{channelId:c.id,protocolChannelId:c.protocolChannelId},intent:p.intent,reservation:p.reservation,voucher:p.voucher});
 async function restoreNative(d,c){
  if(!c.open?.signed||c.open.status!=='finalized')fail('funding_evidence_invalid',409);
  const receipt=await d.lookupOpen({plan:c.open.plan,signed:c.open.signed});
  if(receipt.status!=='finalized'||receipt.protocolChannelId!==c.protocolChannelId||receipt.depositBaseUnits!==c.terms.depositBaseUnits)fail('funding_evidence_invalid',409);
  // The private financial record survives hosted snapshot rollback. Replay
  // only its exact already-signed authorizations in original cumulative order.
  let previous='0';
  for(const saved of c.vouchers){
   const intent={charge:{id:saved.chargeId,amountBaseUnits:saved.receipt.incrementBaseUnits},previousAmountBaseUnits:previous,cumulativeAmountBaseUnits:saved.receipt.cumulativeAmountBaseUnits};
   const charge=obligations(c).charges.find(v=>v.id===saved.chargeId);
   if(!charge||charge.amountBaseUnits!==intent.charge.amountBaseUnits)fail('ledger_binding_invalid',409);
   intent.charge.acceptedReceiptHash=charge.receiptHash;
   const replayed=await d.recoverVoucher({channel:{channelId:c.id,protocolChannelId:c.protocolChannelId},intent,voucher:saved.voucher});
   if(replayed.status!=='authorized'||replayed.deliveryId!==saved.chargeId||replayed.payloadHash!==saved.voucher.payloadHash||replayed.cumulativeAmountBaseUnits!==intent.cumulativeAmountBaseUnits)fail('authorization_evidence_invalid',409);
   previous=intent.cumulativeAmountBaseUnits;
  }
  if(previous!==c.authorizedBaseUnits)fail('authorization_evidence_invalid',409);
 }
 function signingPayload(c,kind){const a=c[kind];return {kind,termsHash:c.termsHash,wireBase64:a.partialWire??a.plan.unsignedWireBase64,
  requiredSigners:kind==='open'?[c.terms.payer]:[c.terms.payer,c.terms.payee],estimatedFeeAndRentLamports:a.plan.estimatedFeeAndRentLamports};}
 const voucherPayload=p=>p.prepared?{kind:'voucher',chargeId:p.chargeId,previousAmountBaseUnits:p.intent.previousAmountBaseUnits,cumulativeAmountBaseUnits:p.intent.cumulativeAmountBaseUnits,...p.prepared}:null;
 async function finishVoucher(record,receipt){const c=record.value,p=c.pendingVoucher;
  if(receipt.status!=='authorized')return record;
  if(receipt.deliveryId!==p.chargeId||receipt.incrementBaseUnits!==p.intent.charge.amountBaseUnits||receipt.cumulativeAmountBaseUnits!==p.intent.cumulativeAmountBaseUnits||receipt.payloadHash!==p.voucher.payloadHash)fail('authorization_evidence_invalid',409);
  return save(record,{...c,phase:'funded',authorizedBaseUnits:receipt.cumulativeAmountBaseUnits,pendingVoucher:null,vouchers:[...c.vouchers,{chargeId:p.chargeId,voucher:p.voucher,receipt}]});
 }
 async function recordReceipt(record,kind,receipt){const c=record.value,attempt=c[kind];
  if(receipt.txSignature!==attempt.signed.txSignature)fail('transaction_identity_mismatch',409);
  if(attempt.status==='finalized')return record;
  if(receipt.status!=='finalized')return save(record,{...c,[kind]:{...attempt,status:receipt.status==='failed'?'failed':'unknown',receipt}});
  if(receipt.finality!=='finalized')fail('payment_not_finalized',409);
  if(kind==='open'){
   if(receipt.depositBaseUnits!==c.terms.depositBaseUnits||receipt.protocolChannelId!==attempt.plan.protocolChannelId)fail('funding_evidence_invalid',409);
   return save(record,{...c,phase:'funded',protocolChannelId:receipt.protocolChannelId,feeAndRentLamports:(BigInt(receipt.evidence?.networkFeeLamports??attempt.plan.estimatedFeeAndRentLamports)+BigInt(receipt.evidence?.newRentLamports??'0')).toString(),open:{...attempt,status:'finalized',receipt}});
  }
  if(receipt.settledBaseUnits!==c.authorizedBaseUnits||receipt.publisherDeltaBaseUnits!==c.authorizedBaseUnits||receipt.refundBaseUnits!==(BigInt(c.terms.depositBaseUnits)-BigInt(c.authorizedBaseUnits)).toString())fail('payout_evidence_invalid',409);
  return save(record,{...c,phase:'finalized',paidBaseUnits:receipt.settledBaseUnits,refundBaseUnits:receipt.refundBaseUnits,feeAndRentLamports:(BigInt(c.feeAndRentLamports)+BigInt(receipt.feeAndRentLamports)).toString(),close:{...attempt,status:'finalized',receipt}});
 }
 async function fundedRoutes(appId){return (await repository.list('channel',appId)).filter(r=>r.value.counterpartyAppId===appId&&r.value.phase==='funded'&&r.value.servingEnabled===true&&r.value.open?.status==='finalized').map(r=>structuredClone(r.value));}
 return {wallet,challenge,verifyWallet,freeze,list,execute,fundedRoutes,projection,repository,broadcastEnabled};
}
