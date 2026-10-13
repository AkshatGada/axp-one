// Read-only: no credentials, signing, broadcasts or model calls.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createProductDevnetRPC,network} from '../../packages/product/native.mjs';
const record=JSON.parse(readFileSync(process.argv[2]??'artifacts/accounts/devnet-acceptance.json','utf8'));
assert.equal(record.schemaVersion,'axp.account-devnet-acceptance.v1');
for(const field of ['genesisHash','mint','program'])assert.equal(record[field],network[field]);
assert.equal(record.network,'solana-devnet');
const rpc=createProductDevnetRPC(network.rpc);
assert.equal(await rpc('getGenesisHash'),network.genesisHash);
assert.equal(record.transactions.length,2);
assert.deepEqual(record.transactions.map(t=>t.operation),['open','close']);
assert.equal(new Set(record.transactions.map(t=>t.signature)).size,2);
const statuses=(await rpc('getSignatureStatuses',[record.transactions.map(t=>t.signature),{searchTransactionHistory:true}])).value;
const sum=(rows,owner)=>rows.filter(b=>b.mint===network.mint&&b.owner===owner).reduce((n,b)=>n+BigInt(b.uiTokenAmount.amount),0n);
for(const [i,proof] of record.transactions.entries()){
 assert.equal(proof.status,'finalized');assert.ok(statuses[i]);
 assert.equal(statuses[i].err,null);assert.equal(statuses[i].confirmationStatus,'finalized');assert.equal(statuses[i].slot,proof.slot);
 const tx=await rpc('getTransaction',[proof.signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:0}]);
 assert.ok(tx);assert.equal(tx.meta.err,null);assert.equal(tx.slot,proof.slot);assert.equal(String(tx.meta.fee),proof.networkFeeLamports);
 assert.ok(tx.transaction.message.accountKeys.some(k=>(k.pubkey??k)===network.program));
 for(const [role,owner] of [['payer',record.payer],['publisher',record.publisher],['treasury',network.treasuryOwner]])assert.equal(String(sum(tx.meta.postTokenBalances,owner)-sum(tx.meta.preTokenBalances,owner)),proof.tokenDeltas[role]);
 assert.equal(proof.tokenDeltas.payer,i===0?'-20000':'12000');assert.equal(proof.tokenDeltas.publisher,i===0?'0':'8000');assert.equal(proof.tokenDeltas.treasury,'0');
}
assert.equal(record.depositBaseUnits,'20000');assert.equal(record.acceptedPlacements,2);
assert.equal(record.acceptedBaseUnits,'8000');assert.equal(record.authorizedBaseUnits,record.acceptedBaseUnits);assert.equal(record.paidBaseUnits,record.acceptedBaseUnits);
assert.equal(BigInt(record.paidBaseUnits)+BigInt(record.refundBaseUnits),BigInt(record.depositBaseUnits));
assert.ok(BigInt(record.feeAndRentLamports)<=20000000n);
assert.equal(record.channelAccountClosed,true);
assert.equal((await rpc('getAccountInfo',[record.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value,null);
console.log(JSON.stringify({status:'verified',network:record.network,channels:1,transactions:2,paidBaseUnits:record.paidBaseUnits,refundBaseUnits:record.refundBaseUnits,signed:false,broadcast:false,scope:'chain assertions only; local UI/auth/cleanup are documented acceptance observations'}));
