// Public API-only export. No wallet/env/private snapshots or payment signatures.
import {writeFileSync} from 'node:fs';
import {ARC_NETWORK as network} from '../../packages/arc/network.mjs';
const origin=new URL(process.argv[2]??''),output=process.argv[3];
if(origin.protocol!=='https:'||!origin.hostname.endsWith('.vercel.app')||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Use the approved Vercel Preview origin.');
if(!/^artifacts\/arc\/[a-z0-9-]+\.json$/.test(output??''))throw Error('Use a new artifacts/arc/name.json output.');
const response=await fetch(new URL('/api/arc/state',origin),{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Arc state unavailable');
const state=await response.json();if(state.schemaVersion!=='axp.product-state.v1'||state.financialMode!=='devnet')throw Error('Unexpected Arc state.');
const receiptFields=['blockHash','blockNumber','chainId','effectiveGasPrice','feeAmountBaseUnits','feeAsset','feeAttoUSD','finality','gasUsed','network','status','transactionHash'];
const channels=state.campaigns.filter(c=>c.settlementNetwork==='arc-testnet'&&c.payment?.channelId).map(c=>{
  const p=c.payment;return {campaignVersionId:c.id+'-v1',allocationId:p.channelId,payer:p.payer,publisher:p.payee,
    depositBaseUnits:c.depositBaseUnits,phase:p.phase,
    nativeOperations:p.transactions.filter(t=>['approve','open'].includes(t.operation)).map(t=>({kind:t.operation==='open'?'deposit':'approve',status:t.status,transactionHash:t.transactionHash,receipt:Object.fromEntries(receiptFields.filter(k=>t[k]!==undefined).map(k=>[k,t[k]]))})),
    payments:p.payments.filter(x=>x.transferId).map(x=>({chargeId:x.chargeId,receiptHash:x.receiptHash,authorizationHash:x.payloadHash,amountBaseUnits:x.amountBaseUnits,status:x.status,transferId:x.transferId,gatewayAccepted:['accepted','finalized'].includes(x.status),transferStatus:x.transferStatus,batchProof:x.batchProof})),
    unsubmitted:p.payments.filter(x=>!x.transferId).map(x=>({chargeId:x.chargeId,receiptHash:x.receiptHash,authorizationHash:x.payloadHash,amountBaseUnits:x.amountBaseUnits,status:x.status}))};
});
const payments=channels.flatMap(c=>c.payments),unsubmitted=channels.flatMap(c=>c.unsubmitted);
const evidence={schemaVersion:'axp.arc-evidence.v1',observedAt:new Date().toISOString(),origin:origin.origin,network,
  execution:{providers:'fixture',actualModelCalls:0,actualModelSpendMicroUSD:'0',domInsertionReceipts:state.deliveries.length},
  receipts:state.deliveries.map(d=>d.receipt).filter(Boolean),publisherPublicKeyPEM:state.publisher.publicKeyPEM,
  totals:{depositedBaseUnits:channels.filter(c=>c.nativeOperations.some(o=>o.kind==='deposit'&&o.status==='finalized')).reduce((n,c)=>n+BigInt(c.depositBaseUnits),0n).toString(),
    acceptedDeliveryBaseUnits:[...payments,...unsubmitted].reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    gatewayAcceptedBaseUnits:payments.filter(p=>p.gatewayAccepted).reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    batchFinalizedBaseUnits:payments.filter(p=>p.status==='finalized').reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    nativeFeeAttoUSD:channels.flatMap(c=>c.nativeOperations).reduce((n,o)=>n+BigInt(o.receipt.feeAttoUSD??'0'),0n).toString(),withdrawnBaseUnits:'0',refundedBaseUnits:'0'},channels,
  limitations:['Recorded public API observation, not a new provider or payment operation.','Unsubmitted authorizations remain listed separately and are not Gateway acceptance.','Gateway attributes transfers to batches; RPC independently verifies their batch receipts.','Unused funds remain in Gateway; no withdrawal/refund performed.']};
writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({saved:output,nativeOperations:channels.flatMap(c=>c.nativeOperations).length,transfers:payments.length,unsubmitted:unsubmitted.length,providerCalls:0,signaturesCreated:0,broadcasts:0}));
