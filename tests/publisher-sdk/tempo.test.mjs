import test from 'node:test';
import assert from 'node:assert/strict';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';
import {moneyUnit,nativeTransactionURL,isFinalizedNativeTransaction} from '../../packages/publisher-sdk/financial.mjs';

test('SDK forwards explicit rail without adding it to legacy requests or admitting arbitrary networks',async()=>{
 const bodies=[];const sdk=new AXPPublisher({apiKey:'test',fetch:async(url,init)=>{bodies.push(JSON.parse(init.body));return {ok:true,json:async()=>({status:'no_fill',opportunityId:'opp-1'})};}});
 const turn={question:'Compare hardware wallets',sessionId:'s',turnId:'t'};
 await sdk.requestAd(turn);await sdk.requestAd({...turn,settlementNetwork:'tempo-testnet'});
 assert.equal(Object.hasOwn(bodies[0],'settlementNetwork'),false);
 assert.equal(bodies[1].settlementNetwork,'tempo-testnet');
 const invalid=await sdk.requestAd({...turn,settlementNetwork:'tempo-mainnet'});
 assert.equal(invalid.status,'error');assert.equal(bodies.length,2);
});

test('financial presentation isolates currencies and validates reported chain evidence',()=>{
 const transaction={operation:'payout',status:'finalized',finality:'finalized',network:'tempo-testnet',chainId:42431,transactionHash:'0x'+'ab'.repeat(32)};
 assert.equal(moneyUnit('devnet'),'test USDC');assert.equal(moneyUnit('devnet',transaction),'test PathUSD');
 assert.match(nativeTransactionURL(transaction),/^https:\/\/explore\.tempo\.xyz\/tx\/0x/);
 assert.equal(isFinalizedNativeTransaction(transaction),true);
 assert.equal(nativeTransactionURL(transaction,'solana-devnet'),undefined);
 assert.equal(nativeTransactionURL({...transaction,chainId:1}),undefined);
 assert.equal(nativeTransactionURL({...transaction,transactionHash:'https://evil.example'}),undefined);
 assert.equal(isFinalizedNativeTransaction({...transaction,status:'pending'}),false);
 assert.equal(isFinalizedNativeTransaction({...transaction,finality:undefined}),false);
});
