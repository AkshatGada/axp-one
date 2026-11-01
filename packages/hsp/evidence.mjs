import {hash,verifyReceipt} from '../contracts/index.mjs';
import {check,txHash,validateConfig} from './config.mjs';
export function publicEvidence({exchange,store,execution}){
 check(['fixture','actual-hsp-qa'].includes(execution),'hsp_evidence_execution_invalid');check(store.meta('execution')===execution,'hsp_evidence_execution_mismatch');const config=store.meta('config');check(config,'hsp_configuration_required');
 const rows=store.all();const result={schemaVersion:'axp.hsp-evidence.v1',execution,paymentModel:'direct',paymentChainId:133,registryChainId:177,merchantName:config.merchantName,token:config.token,payer:config.payer,payee:config.payee,decimals:6,generatedAt:new Date().toISOString(),limitations:['App-reported insertion is not attention or conversion proof.','The mainnet registry attests to QA evidence; it does not settle mainnet funds.'],deliveries:rows.map(r=>{
  const c=exchange.require('charges',r.chargeId),record=exchange.require('receipt_records',r.chargeId),publisher=exchange.require('publishers',record.receipt.publisherId);
  check(record.receiptHash===c.receiptHash&&verifyReceipt(record.receipt,record.signature,publisher.publicKeyPEM),'hsp_evidence_receipt_invalid');
  return {chargeId:r.chargeId,amountMicroUsd:r.amountBaseUnits,receiptHash:r.receiptHash,receipt:record.receipt,receiptSignature:record.signature,publisherPublicKey:publisher.publicKeyPEM,flowId:r.flowId??null,paymentRequestId:r.paymentRequestId??null,status:r.status,stage:r.stage,uncertain:r.uncertain,attributionVerified:r.attributionVerified??false,authorizationRaw:r.quote?.token_total_raw??null,feeRaw:r.quote?.feeRaw??null,transactionHash:r.txHash??null,transfer:r.transfer??null,anchor:r.anchor??null};
 })};
 return {...result,contentHash:hash(result)};
}
export function validateEvidence(input){
 check(input?.schemaVersion==='axp.hsp-evidence.v1'&&input.paymentModel==='direct'&&input.paymentChainId===133&&input.registryChainId===177&&input.decimals===6&&['fixture','actual-hsp-qa'].includes(input.execution),'hsp_evidence_invalid');const {contentHash,...body}=input;check(contentHash===hash(body),'hsp_evidence_hash_mismatch');check(Array.isArray(input.deliveries)&&input.deliveries.length<=3,'hsp_evidence_invalid');const ids=new Set(),transactions=new Set();
 for(const d of input.deliveries){check(!ids.has(d.chargeId)&&hash(d.receipt)===d.receiptHash&&verifyReceipt(d.receipt,d.receiptSignature,d.publisherPublicKey),'hsp_evidence_receipt_invalid');ids.add(d.chargeId);check(d.receipt.mode==='testnet'&&/^\d+$/.test(d.amountMicroUsd),'hsp_evidence_invalid');if(d.stage==='finalized'&&!d.uncertain){check(d.status==='payment-finalized'&&d.attributionVerified&&txHash(d.transactionHash)&&d.transfer?.verified&&String(d.transfer.recipientRaw)===d.amountMicroUsd,'hsp_evidence_finality_invalid');check(!transactions.has(d.transactionHash),'hsp_payment_reference_reused');transactions.add(d.transactionHash);}}
 return input;
}
