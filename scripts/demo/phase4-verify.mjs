// Public finalized evidence only. No wallet keys, signing or submissions.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {verifyReceipt,hash} from '../../packages/contracts/index.mjs';

const e=JSON.parse(readFileSync('artifacts/phase4/connected-run.json','utf8')),frozen=JSON.parse(readFileSync('artifacts/phase4/frozen-environment.json','utf8'));
const terms=frozen.terms,payment=e.payments[0],sdk=await loadNativeSDK();
assert.equal(terms.mode,'sandbox');assert.equal(terms.rpc,'https://402.surfnet.dev:8899');assert.equal(terms.network,'solana-payment-sandbox');
async function rpc(method,params=[]) {const response=await fetch(terms.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});assert.ok(response.ok);const r=await response.json();if(r.error)throw new Error(JSON.stringify(r.error));return r.result;}
assert.equal(await rpc('getGenesisHash'),terms.genesisHash);
assert.equal(payment.phase,'finalized');assert.equal(payment.open.status,'finalized');assert.equal(payment.close.status,'finalized');
assert.equal(payment.depositBaseUnits,'20000');assert.equal(payment.settledBaseUnits,'6000');assert.equal(payment.refundBaseUnits,'14000');
assert.equal(e.exchange.charges.length,2);assert.equal(e.modelAdmissions.filter(x=>x.kind==='jev').length,6);assert.equal(e.modelAdmissions.filter(x=>x.kind==='organic_app').length,2);
let cumulative=0n;for(const c of [...e.exchange.charges].sort((a,b)=>a.sequence-b.sequence)){assert.equal(c.channelId,terms.channelId);assert.ok(BigInt(c.amountBaseUnits)<=4000n);cumulative+=BigInt(c.amountBaseUnits);const v=payment.vouchers.find(v=>v.chargeId===c.id);assert.equal(v.status,'authorized');assert.equal(v.cumulativeAmountBaseUnits,cumulative.toString());const receipt=e.signedReceipts.find(r=>r.chargeId===c.id);assert.ok(receipt);assert.equal(hash(receipt.receipt),c.receiptHash);const publisher=e.publisherIdentities.find(p=>p.publisherId===receipt.receipt.publisherId);assert.ok(verifyReceipt(receipt.receipt,receipt.signature,publisher.publicKeyPEM));}
assert.equal(cumulative,6000n);assert.ok(cumulative<=8000n);
for(const loser of ['agentpass','hotelops']){assert.equal(e.exchange.charges.filter(c=>c.campaignId===loser).length,0);assert.equal(e.exchange.channels.find(c=>c.channelId===`phase4-channel-${loser}`).depositBaseUnits,'0');}
const statuses=await rpc('getSignatureStatuses',[[payment.open.txSignature,payment.close.txSignature],{searchTransactionHistory:true}]);assert.ok(statuses.value.every(s=>s?.confirmationStatus==='finalized'&&!s.err));
const channelAccount=(await rpc('getAccountInfo',[payment.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value;
assert.equal(channelAccount.owner,terms.program);const channel=sdk.generated.getChannelDecoder().decode(Buffer.from(channelAccount.data[0],'base64'));assert.equal(channel.status,3);assert.equal(channel.deposit,20000n);assert.equal(channel.payer,terms.payer);assert.equal(channel.payee,terms.payee);assert.equal(channel.mint,terms.mint);
const [escrow]=await sdk.token.findAssociatedTokenPda({owner:sdk.kit.address(payment.protocolChannelId),mint:sdk.kit.address(terms.mint),tokenProgram:sdk.kit.address(terms.tokenProgram)});
const escrowAccount=(await rpc('getAccountInfo',[escrow,{encoding:'base64',commitment:'finalized'}])).value;assert.equal(escrowAccount,null);
const open=payment.open.evidence,close=payment.close.evidence;
const gross=BigInt(open.networkFeeLamports)+BigInt(open.newRentLamports)+BigInt(close.networkFeeLamports)+BigInt(close.newRentLamports);
assert.ok(gross<=20000000n);
const report={schemaVersion:'axp.phase4-chain-check.v1',runId:e.runId,mode:terms.mode,network:terms.network,rpc:terms.rpc,genesisHash:terms.genesisHash,observedAt:new Date().toISOString(),transactionStatuses:statuses.value,channel:{address:payment.protocolChannelId,owner:channelAccount.owner,status:'Distributed',depositBaseUnits:channel.deposit.toString(),remainingRentLamports:String(channelAccount.lamports),openSlot:channel.openSlot.toString(),settlement:JSON.parse(JSON.stringify(channel.settlement,(_,v)=>typeof v==='bigint'?v.toString():v))},escrow:{address:escrow,closed:true},charges:2,buyerCalls:6,organicAnswers:2,cumulativeBaseUnits:'6000',publisherPayoutBaseUnits:'6000',payerRefundBaseUnits:'14000',networkFeeLamports:(BigInt(open.networkFeeLamports)+BigInt(close.networkFeeLamports)).toString(),grossNewRentLamports:(BigInt(open.newRentLamports)+BigInt(close.newRentLamports)).toString(),reclaimedRentLamports:close.reclaimedRentLamports,grossFeeAndRentLamports:gross.toString(),feeAndRentCapLamports:'20000000',rentBoundary:'Channel PDA and publisher ATA rent remain separate from token refund. No reclaim transaction performed.',links:{open:`https://explorer.solana.com/tx/${payment.open.txSignature}?cluster=custom&customUrl=${encodeURIComponent(terms.rpc)}`,settlement:payment.settlementLink},allChecksPassed:true};
writeFileSync('artifacts/phase4/chain-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
