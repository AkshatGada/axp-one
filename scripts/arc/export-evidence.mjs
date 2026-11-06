// Read-only SQLite export with an explicit public allowlist. No network or keys.
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {mkdirSync, writeFileSync} from 'node:fs';
import {ARC_NETWORK} from '../../packages/arc/network.mjs';
const db = new DatabaseSync(resolve('local-state/arc/product/exchange.sqlite'), {readOnly:true});
const rows = db.prepare('SELECT data FROM arc_payment_channels WHERE run=?').all('arc-mumbai-v1').map(r=>JSON.parse(r.data));
const count = table => db.prepare(`SELECT count(*) AS n FROM ${table} WHERE run=?`).get('arc-mumbai-v1').n;
const channels = rows.map(s=>({campaignVersionId:s.terms.campaignVersionId,allocationId:s.channelId,payer:s.terms.payer,publisher:s.terms.payee,
  depositBaseUnits:s.terms.depositBaseUnits,phase:s.phase,closeRequested:s.closeRequested,
  nativeOperations:s.operations.map(o=>({kind:o.kind,status:o.status,transactionHash:o.signed?.transactionHash,receipt:o.receipt,
    previousObservationStatuses:(o.observations??[]).map(x=>x.previousStatus)})),
  payments:s.payments.map(p=>({chargeId:p.chargeId,receiptHash:p.receiptHash,authorizationHash:p.signed?.payloadHash,
    amountBaseUnits:p.amountBaseUnits,status:p.status,transferId:p.lookup?.transferId??p.gatewayResult?.transaction??null,
    gatewayAccepted:p.gatewayResult?.success===true,transferStatus:p.lookup?.transferStatus??null,batchProof:p.lookup?.batchProof??null})),
}));
const result={schemaVersion:'axp.arc-evidence.v1',observedAt:new Date().toISOString(),network:ARC_NETWORK,
  execution:{providers:'fixture',actualModelCalls:0,actualModelSpendMicroUSD:'0',domInsertionReceipts:count('charges'),startedPublisherTurns:count('opportunities'),preparedIndependentAnswers:count('product_answers'),
    note:'One original no-fill from a malformed fixture buyer response remains preserved. Other provider responses are fixtures; payment and chain outcomes are actual.'},
  receipts:db.prepare('SELECT data FROM receipt_records WHERE run=?').all('arc-mumbai-v1').map(r=>JSON.parse(r.data)),
  publisherPublicKeyPEM:JSON.parse(db.prepare('SELECT data FROM publishers WHERE run=? AND id=?').get('arc-mumbai-v1','axp-demo-publisher').data).publicKeyPEM,
  totals:{depositedBaseUnits:channels.reduce((n,c)=>n+(c.nativeOperations.some(o=>o.kind==='deposit'&&o.status==='finalized')?BigInt(c.depositBaseUnits):0n),0n).toString(),
    acceptedDeliveryBaseUnits:channels.flatMap(c=>c.payments).reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    gatewayAcceptedBaseUnits:channels.flatMap(c=>c.payments).filter(p=>p.gatewayAccepted).reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    batchFinalizedBaseUnits:channels.flatMap(c=>c.payments).filter(p=>p.status==='finalized').reduce((n,p)=>n+BigInt(p.amountBaseUnits),0n).toString(),
    nativeFeeAttoUSD:channels.flatMap(c=>c.nativeOperations).reduce((n,o)=>n+BigInt(o.receipt?.feeAttoUSD??'0'),0n).toString(),withdrawnBaseUnits:'0',refundedBaseUnits:'0'},channels,
  studio:{appId:'0c07e997-5564-4b38-94f9-099ea3e95393',url:'https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393',
    unusedEscrow:{address:'0x1ea0491f04873b012c0c19bf5da96030bd8d1c05',transactionHash:'0x624283d89bfea4ee7edb4533152d7bb5acf91f7ef0bb0ae3c16642e4dbb81e16',status:'success',feeAttoUSD:'36564850000000000',funded:false,usedByIntegration:false}},
  limitations:['Gateway acceptance is not batch finality.','Gateway links each transfer ID to a batch; RPC verifies that transaction, not the offchain attribution independently.','Unused funds remain in the payer Gateway balance. No withdrawal or refund is claimed.','No production deployment, repository push/publication or ETHGlobal submission was performed.']};
db.close();
const output=process.argv[2];
if(output){if(!/^artifacts\/arc\/[a-z0-9-]+\.json$/.test(output))throw Error('Use a sanitized artifacts/arc/name.json destination.');mkdirSync('artifacts/arc',{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(`Saved public Arc evidence to ${output}`);}else console.log(JSON.stringify(result,null,2));
