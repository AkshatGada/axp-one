// Read-only finality/account checks. Uses saved V3 identities, never signs/broadcasts.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {paymentEvidenceV3} from '../../packages/v3/payments.mjs';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {POLICY} from '../../packages/v3/config.mjs';
const root=resolve(import.meta.dirname,'../..'),dir=join(root,'local-state/v3/acceptance'),frozen=JSON.parse(readFileSync(join(dir,'terms.json'))),store=new SQLitePaymentStore(join(dir,'payments.sqlite'),{readOnly:true});
try{
 const states=store.list(),payments=paymentEvidenceV3(store);assert.equal(states.length,2);assert.equal(new Set(states.map(s=>s.protocolChannelId)).size,2);
 const sdk=await loadNativeSDK();let gross=0n,networkFees=0n,newRent=0n,reclaimed=0n;const channels=[];
 for(const state of states){
  const terms=frozen.channels.find(c=>c.channelId===state.channelId);assert.ok(terms);assert.equal(terms.network,'solana-payment-sandbox');assert.equal(terms.mode,'sandbox');assert.equal(terms.rpc,'https://402.surfnet.dev:8899');assert.equal(state.open.status,'finalized');assert.equal(state.close?.status,'finalized');
  async function rpc(method,params=[]){const r=await fetch(terms.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});assert.ok(r.ok);const body=await r.json();if(body.error)throw Error('sandbox_rpc_error');return body.result;}
  assert.equal(await rpc('getGenesisHash'),terms.genesisHash);
  const receipts=[state.open.receipt,state.close.receipt],statuses=await rpc('getSignatureStatuses',[receipts.map(r=>r.txSignature),{searchTransactionHistory:true}]);assert.ok(statuses.value.every(s=>s?.confirmationStatus==='finalized'&&!s.err));
  const account=(await rpc('getAccountInfo',[state.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value;assert.equal(account?.owner,terms.program);const channel=sdk.generated.getChannelDecoder().decode(Buffer.from(account.data[0],'base64'));
  assert.equal(channel.status,3);assert.equal(channel.deposit,20000n);assert.equal(channel.payer,terms.payer);assert.equal(channel.payee,terms.payee);assert.equal(channel.mint,terms.mint);assert.equal(channel.salt,BigInt(terms.openSalt));
  const [escrow]=await sdk.token.findAssociatedTokenPda({owner:sdk.kit.address(state.protocolChannelId),mint:sdk.kit.address(terms.mint),tokenProgram:sdk.kit.address(terms.tokenProgram)});assert.equal((await rpc('getAccountInfo',[escrow,{encoding:'base64',commitment:'finalized'}])).value,null);
  const payout=BigInt(state.close.receipt.settledBaseUnits),refund=BigInt(state.close.receipt.refundBaseUnits);assert.equal(payout,BigInt(state.authorizedBaseUnits));assert.equal(payout+refund,20000n);assert.ok(payout<=8000n);
  for(const r of receipts){assert.ok(r.evidence);networkFees+=BigInt(r.evidence.networkFeeLamports);newRent+=BigInt(r.evidence.newRentLamports);reclaimed+=BigInt(r.evidence.reclaimedRentLamports);}
  assert.equal(state.close.receipt.evidence.tokenDeltas.publisher,payout.toString());assert.equal(state.close.receipt.evidence.tokenDeltas.payer,refund.toString());
  channels.push({channelId:state.channelId,protocolChannelId:state.protocolChannelId,network:terms.network,rpc:terms.rpc,genesisHash:terms.genesisHash,program:terms.program,mint:terms.mint,openSalt:terms.openSalt,openSignature:state.open.receipt.txSignature,closeSignature:state.close.receipt.txSignature,transactionStatuses:statuses.value,depositBaseUnits:'20000',publisherPayoutBaseUnits:payout.toString(),payerRefundBaseUnits:refund.toString(),remainingChannelRentLamports:String(account.lamports),escrowClosed:true,status:'Distributed',originalTransactions:receipts.map(r=>r.evidence)});
 }
 gross=networkFees+newRent;assert.ok(gross<=BigInt(POLICY.aggregateFeeRentLamports));assert.ok(channels.reduce((n,c)=>n+BigInt(c.publisherPayoutBaseUnits),0n)<=12000n);
 const report={schemaVersion:'axp.v3-chain-check.v1',runId:frozen.runId,financialMode:'sandbox',network:'hosted Solana sandbox',at:new Date().toISOString(),channels,networkFeeLamports:networkFees.toString(),grossNewRentLamports:newRent.toString(),reclaimedRentLamports:reclaimed.toString(),grossFeeAndRentLamports:gross.toString(),feeAndRentCapLamports:POLICY.aggregateFeeRentLamports,payments,allChecksPassed:true};
 writeFileSync(join(root,'artifacts/v3/chain-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'verified',runId:report.runId,channels:channels.length,grossFeeAndRentLamports:gross.toString()}));
}finally{store.close();}
