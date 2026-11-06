// Independent READ-ONLY proof verification. No wallet, provider credential,
// signing, approval, deposit or payment submission is loaded or called.
import {readFileSync} from 'node:fs';
import {hash, verifyReceipt} from '../../packages/contracts/index.mjs';
import {ARC_NETWORK as N, arcCheck as check, sameAddress as same} from '../../packages/arc/network.mjs';
import {loadArcSDK} from '../../packages/arc/sdk.mjs';
const evidence=JSON.parse(readFileSync(process.argv[2]??'artifacts/arc/gateway-accepted.json','utf8'));
const {viem:v,client:c}=loadArcSDK();
check(evidence.schemaVersion==='axp.arc-evidence.v1'&&evidence.network.chainId===N.chainId,'arc_evidence_network');
const rpc=v.createPublicClient({chain:c.CHAIN_CONFIGS.arcTestnet.chain,transport:v.http(N.rpc,{retryCount:0,timeout:15000})});
check(await rpc.getChainId()===N.chainId,'arc_chain_mismatch');
check(await rpc.readContract({address:N.token,abi:v.erc20Abi,functionName:'decimals'})===6,'arc_token_decimals');
let native=0,payments=0,finalized=0;
for(const record of evidence.receipts??[])check(hash(record.receipt)===record.receiptHash&&verifyReceipt(record.receipt,record.signature,evidence.publisherPublicKeyPEM),'arc_receipt_signature');
for(const channel of evidence.channels){
  for(const op of channel.nativeOperations){
    if(op.status!=='finalized')continue;
    const [tx,receipt]=await Promise.all([rpc.getTransaction({hash:op.transactionHash}),rpc.getTransactionReceipt({hash:op.transactionHash})]);
    check(receipt.status==='success'&&same(receipt.from,channel.payer),'arc_funding_receipt');
    const expectedTo=op.kind==='approve'?N.token:N.gatewayWallet;
    check(['approve','deposit'].includes(op.kind)&&same(tx.to,expectedTo)&&(tx.value??0n)===0n,'arc_funding_recipient');
    const abi=op.kind==='approve'?v.erc20Abi:v.parseAbi(['function deposit(address token,uint256 value)']);
    const decoded=v.decodeFunctionData({abi,data:tx.input});
    check(decoded.functionName===op.kind&&same(decoded.args[0],op.kind==='approve'?N.gatewayWallet:N.token)&&decoded.args[1]===BigInt(channel.depositBaseUnits),'arc_funding_amount');
    check(String(receipt.gasUsed*receipt.effectiveGasPrice)===op.receipt.feeAttoUSD&&receipt.blockHash===op.receipt.blockHash,'arc_funding_fee');native++;
  }
  for(const payment of channel.payments){
    check(payment.transferId&&/^[0-9a-f-]{36}$/i.test(payment.transferId),'arc_transfer_id');
    const response=await fetch(`https://gateway-api-testnet.circle.com/v1/x402/transfers/${payment.transferId}`,{redirect:'error',signal:AbortSignal.timeout(15000)});
    check(response.ok,'arc_transfer_lookup');const transfer=await response.json();
    check(transfer.id===payment.transferId&&same(transfer.fromAddress,channel.payer)&&same(transfer.toAddress,channel.publisher)&&transfer.amount===payment.amountBaseUnits&&transfer.token==='USDC'&&transfer.sendingNetwork===N.caip2&&transfer.recipientNetwork===N.caip2,'arc_transfer_binding');
    check(transfer.status!=='failed','arc_transfer_failed');payments++;
    if(transfer.status==='completed'&&/^0x[0-9a-f]{64}$/i.test(transfer.txHash??'')){
      const receipt=await rpc.getTransactionReceipt({hash:transfer.txHash});
      check(receipt.status==='success'&&same(receipt.to,N.gatewayWallet),'arc_batch_receipt');finalized++;
    }
    console.log(JSON.stringify({transferId:transfer.id,amountBaseUnits:transfer.amount,currentStatus:transfer.status,batchTransactionHash:transfer.txHash??null}));
  }
}
console.log(JSON.stringify({status:'passed',network:N.network,nativeTransactionsVerified:native,paymentsVerified:payments,currentlyBatchFinalized:finalized,publicReceiptSignaturesVerified:evidence.receipts?.length??0,signaturesCreated:0,broadcasts:0,providerCalls:0}));
