import {randomUUID} from 'node:crypto';
import {hash,baseUnits,strictObject} from '../contracts/index.mjs';
import {LIMITS,check,validateConfig,address,sameAddress,txHash,usd} from './config.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const OPEN=new Set(['payment-submitted','payment-verified','payment-processing','payment-included','payment-timeout']);
const TERMINAL=new Set(['payment-safe','payment-finalized','payment-failed']);
export function createHspPayments({exchange,store,config,transport,verifySignature,balance,verifyTransfer,expiredAuthorizationUnused,registry=null,now=Date.now,checkpoint=async()=>{},limits=LIMITS}){
 const terms=validateConfig(config),old=store.meta('config');check(!old||old.configHash===terms.configHash,'hsp_frozen_configuration_changed');store.meta('config',terms);
 const execution=transport?.execution??'unavailable';const priorExecution=store.meta('execution');check(!priorExecution||priorExecution===execution,'hsp_execution_changed');store.meta('execution',execution);
 let tail=Promise.resolve();
 const serial=fn=>{const job=tail.then(async()=>{store.lock();try{return await fn();}finally{store.unlock();}});tail=job.catch(()=>{});return job;};
 const persist=async(row,reason)=>{row.updatedAt=now();store.save(row);await checkpoint(reason);return row;};
 const read=id=>{const row=store.get(id);check(row,'hsp_payment_not_found',404);return row;};
 const blocked=()=>Boolean(store.meta('lease'))||store.all().some(r=>r.uncertain||['creating','preparing','finalizing','submitting'].includes(r.stage)||OPEN.has(r.status)||r.status==='payment-safe');
 const invoke=async(name,vars)=>{check(transport?.invoke,'hsp_access_or_schema_review_required',503);return transport.invoke(name,clone(vars));};
 function bind(id){const charge=exchange.require('charges',id),award=exchange.require('awards',charge.awardId),receipt=exchange.require('receipt_records',id);check(charge.mode==='testnet'&&charge.settlementNetwork==='hsk-testnet'&&sameAddress(award.payee,terms.payee),'hsp_charge_binding');check(receipt.receiptHash===charge.receiptHash&&award.priceBaseUnits===charge.amountBaseUnits,'hsp_receipt_binding');return {charge,award,receipt};}
 function publicRow(row){if(!row)return {stage:'accepted-unpaid',status:'not-prepared',paymentModel:'direct',network:'hsk-testnet',chainId:133};const {quote,signature,mandate,history,...safe}=row;return {...safe,...(quote?{quote:{id:row.quoteId,payer:quote.payer,pay_to:quote.pay_to,token_total_raw:quote.token_total_raw,principalRaw:quote.principalRaw,feeRaw:quote.feeRaw,quote_expires_at:quote.quote_expires_at,token:terms.token,decimals:6,...(row.stage==='quote-ready'?{eip712:quote.eip712}:{})}}:{}),network:'hsk-testnet',chainId:133,paymentModel:'direct',token:terms.token,payer:terms.payer,payee:terms.payee,merchantName:terms.merchantName};}
 function validateQuote(q,row){
  check(q&&sameAddress(q.payer,terms.payer)&&sameAddress(q.pay_to,terms.payee)&&q.chainId===133&&sameAddress(q.token,terms.token)&&q.protocol===terms.protocol,'hsp_quote_binding');
  check(q.payment_request_id===row.paymentRequestId&&q.merchantAmountUsd===usd(row.amountBaseUnits),'hsp_quote_price_mismatch');
  const total=baseUnits(q.token_total_raw),principal=baseUnits(q.principalRaw),fee=baseUnits(q.feeRaw);
  check(principal===baseUnits(row.amountBaseUnits)&&total===principal+fee,'hsp_quote_amount_mismatch');
  check(Number.isFinite(Date.parse(q.quote_expires_at))&&Date.parse(q.quote_expires_at)>now()&&Date.parse(q.quote_expires_at)<=now()+301000,'hsp_quote_expired');
  const e=q.eip712;check(e?.domain&&Number(e.domain.chainId)===133&&e.types&&e.message&&address(e.domain.verifyingContract),'hsp_typed_data_invalid');
  const deadline=terms.protocol==='eip3009'?e.message.validBefore:e.message.deadline;check(baseUnits(String(deadline))>BigInt(Math.floor(now()/1000))&&baseUnits(String(deadline))<=BigInt(Math.ceil(Date.parse(q.quote_expires_at)/1000)),'hsp_authorization_expiry_mismatch');
  if(terms.protocol==='eip3009'){check(baseUnits(String(e.message.validAfter))<=BigInt(Math.floor(now()/1000))&&/^0x[0-9a-fA-F]{64}$/.test(e.message.nonce),'hsp_authorization_nonce_invalid');}else check(/^(0|[1-9][0-9]*)$/.test(String(e.message.nonce))&&BigInt(e.message.nonce)<2n**256n&&(typeof e.message.nonce!=='number'||Number.isSafeInteger(e.message.nonce)),'hsp_authorization_nonce_invalid');
  const nonce=String(e.message.nonce);check(!store.all().some(other=>other.chargeId!==row.chargeId&&(String(other.quote?.eip712?.message?.nonce)===nonce||other.quote?.cart_hash===q.cart_hash)),'hsp_authorization_reused');
  if(terms.protocol==='eip3009')check(e.primaryType==='TransferWithAuthorization'&&sameAddress(e.domain.verifyingContract,terms.token)&&sameAddress(e.message.from,terms.payer)&&sameAddress(e.message.to,terms.payee)&&String(e.message.value)===q.token_total_raw,'hsp_typed_data_binding');
  else check(e.primaryType==='PermitTransferFrom'&&sameAddress(e.domain.verifyingContract,terms.permit2)&&sameAddress(e.message.permitted?.token,terms.token)&&String(e.message.permitted?.amount)===q.token_total_raw&&sameAddress(e.message.spender,terms.spender),'hsp_typed_data_binding');
  check(typeof q.cart_hash==='string'&&/^[0-9a-fA-F]{64}$/.test(q.cart_hash)&&q.payment_payload&&q.payment_mandate_contents,'hsp_quote_shape');
  const otherFees=store.all().filter(r=>r.chargeId!==row.chargeId).reduce((n,r)=>n+baseUnits(r.feeReservation??'0'),0n);
  check(otherFees+fee<=baseUnits(limits.fees),'hsp_fee_cap');return fee;
 }
 async function prepareInside(id){
  const {charge}=bind(id);let row=store.get(id);
  if(row?.quote&&Date.parse(row.quote.quote_expires_at)>now()&&row.stage==='quote-ready')return publicRow(row);
  check(!row?.uncertain&&!row?.submittedAt&&!row?.signature&&!row?.mandate,'hsp_reconciliation_required');
  check(!store.all().some(r=>r.chargeId!==id&&(r.uncertain||OPEN.has(r.status)||r.status==='payment-safe')),'hsp_reconciliation_required');
  if(!row){const rows=store.all();check(rows.length<limits.payments&&baseUnits(charge.amountBaseUnits)<=baseUnits(limits.perPayment)&&rows.reduce((n,r)=>n+baseUnits(r.amountBaseUnits),0n)+baseUnits(charge.amountBaseUnits)<=baseUnits(limits.principal),'hsp_principal_cap');
   row={chargeId:id,receiptHash:charge.receiptHash,amountBaseUnits:charge.amountBaseUnits,cartId:`axp-${randomUUID()}`,stage:'creating',status:'not-prepared',uncertain:false,createdAt:now(),configHash:terms.configHash};
   await persist(row,'hsp_before_create');
   try{const order=await invoke('create_order',{terms,row,amountUsd:usd(row.amountBaseUnits)});check(typeof order.flow_id==='string'&&order.flow_id&&typeof order.payment_request_id==='string'&&order.payment_request_id,'hsp_order_shape');row.flowId=order.flow_id;row.paymentRequestId=order.payment_request_id;row.stage='order-created';await persist(row,'hsp_order_created');}
   catch(e){row.uncertain=true;row.error=e.code??'hsp_order_unknown';await persist(row,'hsp_order_unknown');throw e;}
  }
  check(row.flowId&&row.paymentRequestId,'hsp_order_unknown');
  row.stage='preparing';await persist(row,'hsp_before_prepare');
  try{const order=await invoke('get_order',{terms,row});check(order.flow_id===row.flowId&&order.payment_request_id===row.paymentRequestId&&order.merchant_name===terms.merchantName&&sameAddress(order.pay_to,terms.payee)&&order.amountUsd===usd(row.amountBaseUnits),'hsp_order_binding');
   const fee=await invoke('estimate_fee',{terms,row,order});const quote=await invoke('prepare_payment',{terms,row,order,fee});const reserve=validateQuote(quote,row);
   check(typeof balance==='function'&&baseUnits(await balance(terms.payer,terms.token))>=baseUnits(quote.token_total_raw),'hsp_insufficient_balance');
   row.quote=quote;row.quoteId=hash(quote);row.feeReservation=String(reserve);row.stage='quote-ready';row.uncertain=false;row.error=null;await persist(row,'hsp_quote_ready');return publicRow(row);
  }catch(e){row.stage='preparation-blocked';row.error=e.code??'hsp_prepare_failed';await persist(row,'hsp_prepare_blocked');throw e;}
 }
 const prepare=id=>serial(()=>prepareInside(id));
 async function reprepare(id,input){strictObject(input,['quoteId','refreshApproved'],['quoteId','refreshApproved']);return serial(async()=>{
  const row=read(id);bind(id);check(input.refreshApproved===true&&input.quoteId===row.quoteId,'hsp_refresh_approval_required');
  check(row.stage==='authorization-signed'&&!row.submittedAt&&!row.uncertain&&Date.parse(row.quote.quote_expires_at)<=now(),'hsp_reconciliation_required');
  check(typeof expiredAuthorizationUnused==='function'&&await expiredAuthorizationUnused(row.quote.eip712,terms),'hsp_authorization_not_expired_on_chain');
  row.history=[...(row.history??[]),{quote:row.quote,quoteId:row.quoteId,signature:row.signature,mandate:row.mandate,mandateId:row.mandateId}];delete row.signature;delete row.mandate;delete row.mandateId;row.stage='order-created';await persist(row,'hsp_expired_authorization_retained');return prepareInside(id);
 });}
 async function finalize(id,input){strictObject(input,['quoteId','signature','signingApproved'],['quoteId','signature','signingApproved']);return serial(async()=>{
  const row=read(id);bind(id);check(input.signingApproved===true&&input.quoteId===row.quoteId,'hsp_signing_approval_required');
  if(row.stage==='authorization-signed'&&row.signature===input.signature)return publicRow(row);
  check(row.stage==='quote-ready'&&!row.uncertain,'hsp_payment_state');validateQuote(row.quote,row);
  check(typeof input.signature==='string'&&/^0x[0-9a-fA-F]{130}$/.test(input.signature),'hsp_signature_invalid');
  check(typeof verifySignature==='function'&&await verifySignature(row.quote.eip712,input.signature,terms.payer),'hsp_signature_invalid');
  row.signature=input.signature;row.stage='finalizing';await persist(row,'hsp_before_finalize');
  try{const value=await invoke('finalize_payment',{terms,row,quote:row.quote,signature:input.signature});check(value.payment_mandate_json&&(typeof value.payment_mandate_json==='object'||typeof value.payment_mandate_json==='string'),'hsp_finalize_shape');row.mandate=value.payment_mandate_json;row.mandateId=hash(row.mandate);row.stage='authorization-signed';await persist(row,'hsp_authorization_signed');return publicRow(row);}
  catch(e){row.uncertain=true;row.error=e.code??'hsp_finalize_unknown';await persist(row,'hsp_finalize_unknown');throw e;}
 });}
 async function submit(id,input){strictObject(input,['quoteId','mandateId','submissionApproved'],['quoteId','mandateId','submissionApproved']);return serial(async()=>{
  const row=read(id);bind(id);check(input.submissionApproved===true&&input.quoteId===row.quoteId&&input.mandateId===row.mandateId,'hsp_submission_approval_required');
  check(row.stage==='authorization-signed'&&!row.uncertain&&!row.submittedAt,'hsp_reconciliation_required');validateQuote(row.quote,row);
  check(baseUnits(await balance(terms.payer,terms.token))>=baseUnits(row.quote.token_total_raw),'hsp_insufficient_balance');row.stage='submitting';row.submittedAt=now();await persist(row,'hsp_before_submit');
  try{const value=await invoke('submit_payment',{terms,row,mandate:row.mandate});check(value.status==='payment-submitted','hsp_submit_unexpected');row.status=value.status;row.stage='submitted';row.uncertain=false;await persist(row,'hsp_submitted');return publicRow(row);}
  catch(e){row.uncertain=true;row.error=e.code??'hsp_submit_unknown';await persist(row,'hsp_submit_unknown');throw e;}
 });}
 async function reconcile(id){return serial(async()=>{
  const row=read(id);bind(id);check(row.flowId&&row.paymentRequestId,'hsp_order_unknown');
  check(!row.queriedAt||now()-row.queriedAt>=15000,'hsp_poll_too_soon',429);row.queriedAt=now();await persist(row,'hsp_before_query');
  try{const q=await invoke('query_payment',{terms,row});check(typeof q.status==='string','hsp_query_shape');
   row.status=q.status;row.attributionVerified=q.attribution_verified===true;row.txHash=q.tx_signature||null;
   check(q.flow_id===row.flowId&&q.payment_request_id===row.paymentRequestId&&q.merchant_name===terms.merchantName&&sameAddress(q.payer_address,terms.payer)&&sameAddress(q.to_pay_address,terms.payee)&&q.chainId===133&&sameAddress(q.token,terms.token),'hsp_query_binding');
   check(OPEN.has(q.status)||TERMINAL.has(q.status),'hsp_unknown_status');row.uncertain=false;row.stage=q.status==='payment-finalized'?'finalized':q.status==='payment-failed'?'failed':q.status==='payment-safe'?'safe':'submitted';row.error=q.status==='payment-failed'?(typeof q.status_reason==='string'?q.status_reason:'payment-failed'):null;
   if(q.status==='payment-finalized'){
    check(row.attributionVerified&&txHash(row.txHash),'hsp_finality_evidence_missing');check(!store.all().some(r=>r.chargeId!==id&&r.txHash===row.txHash),'hsp_payment_reference_reused');
    check(typeof verifyTransfer==='function','hsp_rpc_verifier_required');row.transfer=await verifyTransfer({...terms,txHash:row.txHash,principalRaw:row.amountBaseUnits,totalRaw:row.quote.token_total_raw});check(row.transfer?.verified===true,'hsp_transfer_unverified');
    exchange.tx(()=>{const charge=exchange.require('charges',id);exchange.put('charges',id,{...charge,status:'settled'});});
   }
   await persist(row,'hsp_queried');return publicRow(row);
  }catch(e){row.uncertain=true;row.error=e.code??'hsp_query_failed';await persist(row,'hsp_query_unknown');throw e;}
 });}
 async function anchorPrepare(id){return serial(async()=>{const row=read(id);check(!row.uncertain&&row.stage==='finalized'&&row.attributionVerified&&row.transfer?.verified,'hsp_anchor_requires_finality');check(registry,'hsp_registry_not_configured',503);row.anchorPlan=await registry.prepare(row,terms);await persist(row,'hsp_anchor_prepared');return row.anchorPlan;});}
 async function anchorReconcile(id,input){strictObject(input,['transactionHash'],['transactionHash']);return serial(async()=>{const row=read(id);check(row.anchorPlan&&txHash(input.transactionHash),'hsp_anchor_plan_required');row.anchor=await registry.verify(input.transactionHash,row,terms);check(row.anchor?.verified===true,'hsp_anchor_unverified');await persist(row,'hsp_anchor_verified');return publicRow(row);});}
 return {prepare,reprepare,finalize,submit,reconcile,anchorPrepare,anchorReconcile,blocked,lookup:id=>{bind(id);return publicRow(store.get(id));},list:()=>store.all().map(publicRow),configuration:()=>({network:'hsk-testnet',chainId:133,payer:terms.payer,payee:terms.payee,token:terms.token,decimals:6,merchantName:terms.merchantName,protocol:terms.protocol,execution:transport?.execution??'unavailable'}),close:()=>store.close()};
}
