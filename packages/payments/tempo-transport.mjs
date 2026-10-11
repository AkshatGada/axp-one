import {randomBytes} from 'node:crypto';
import {loadTempoSDK} from './tempo-sdk.mjs';
import {readTempoWallet,tempoCheck} from './tempo-wallet.mjs';

export const TEMPO_NETWORK=Object.freeze({network:'tempo-testnet',chainId:42431,rpc:'https://rpc.moderato.tempo.xyz',escrow:'0x4d50500000000000000000000000000000000000',token:'0x20c0000000000000000000000000000000000000',tokenSymbol:'PathUSD',decimals:6,explorer:'https://explore.testnet.tempo.xyz'});
export const TEMPO_LIMITS=Object.freeze({maxChannels:8,maxDepositBaseUnits:'200000',maxBudgetBaseUnits:'100000',maxBidBaseUnits:'4000',aggregateDepositBaseUnits:'2000000',aggregateChargeBaseUnits:'800000',maxCharges:100,maxTransactionFeeAttoUSD:'100000000000000000',aggregateFeeAttoUSD:'1000000000000000000'});
export function validateTempoRPCURL(value){let u;try{u=new URL(value);}catch{tempoCheck(false,'tempo_rpc_url_invalid');}tempoCheck((u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))&&!u.username&&!u.password&&!u.hash,'tempo_rpc_url_invalid');return u.href;}
const serializable=x=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?{$bigint:v.toString()}:v));
const hydrated=x=>JSON.parse(JSON.stringify(x),(_,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&typeof v.$bigint==='string'?BigInt(v.$bigint):v);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const tokenABI=[{type:'function',name:'decimals',stateMutability:'view',inputs:[],outputs:[{type:'uint8'}]},{type:'function',name:'symbol',stateMutability:'view',inputs:[],outputs:[{type:'string'}]},{type:'function',name:'balanceOf',stateMutability:'view',inputs:[{type:'address'}],outputs:[{type:'uint256'}]}];
const domainTypes={EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}]};
const bigintText=x=>typeof x==='bigint'?x.toString():null;

/** Real Sessions v2 primitives only. This transport never owns ledger truth,
 * persistence, automatic retries, keys in snapshots, or HTTP content charging. */
export async function createTempoNativeTransport({walletPath,rpcURL=TEMPO_NETWORK.rpc,sdkRoot,sdkProvider=loadTempoSDK,now=Date.now,limits=TEMPO_LIMITS}={}){
 const sdk=await sdkProvider(sdkRoot),{viem,actions,accounts,chains,viemTempo,Session}=sdk;
 const {Chain,Channel,Voucher,escrowAbi}=Session.Precompile,wallet=readTempoWallet(walletPath),payer=accounts.privateKeyToAccount(wallet.sponsor.privateKey),payee=accounts.privateKeyToAccount(wallet.publisher.privateKey),chain=chains.tempoModerato;
 const rpc=validateTempoRPCURL(rpcURL),transport=viem.http(rpc,{retryCount:0,timeout:15000}),client=viem.createPublicClient({chain,transport}),signClient=viem.createWalletClient({chain,transport});
 const readToken=(name,args=[],blockNumber)=>actions.readContract(client,{address:TEMPO_NETWORK.token,abi:tokenABI,functionName:name,args,...(blockNumber===undefined?{}:{blockNumber})});
 const balances=async blockNumber=>({payerBaseUnits:String(await readToken('balanceOf',[payer.address],blockNumber)),publisherBaseUnits:String(await readToken('balanceOf',[payee.address],blockNumber))});
 function bind(terms){tempoCheck(terms.network===TEMPO_NETWORK.network&&terms.chainId===TEMPO_NETWORK.chainId&&same(terms.token,TEMPO_NETWORK.token)&&same(terms.escrow,TEMPO_NETWORK.escrow)&&same(terms.payer,payer.address)&&same(terms.payee,payee.address),'tempo_terms_mismatch');}
 async function inspect({terms,depositBaseUnits='0',operation='open'}={}){
  if(terms)bind(terms);tempoCheck(await actions.getChainId(client)===TEMPO_NETWORK.chainId,'tempo_chain_mismatch');
  const [decimals,symbol,domainSeparator]=await Promise.all([readToken('decimals'),readToken('symbol'),actions.readContract(client,{address:TEMPO_NETWORK.escrow,abi:escrowAbi,functionName:'domainSeparator'})]);
  tempoCheck(Number(decimals)===6&&symbol==='PathUSD','tempo_token_invalid');const expectedDomain=viem.hashDomain({domain:Voucher.getVoucherDomain(TEMPO_NETWORK.escrow,TEMPO_NETWORK.chainId),types:domainTypes});tempoCheck(same(domainSeparator,expectedDomain),'tempo_voucher_domain_mismatch');
  await Chain.getChannelState(client,`0x${'0'.repeat(64)}`,TEMPO_NETWORK.escrow);const b=await balances();if(operation==='open')tempoCheck(BigInt(b.payerBaseUnits)>=BigInt(depositBaseUnits),'tempo_insufficient_balance');
  return {schemaVersion:'axp.tempo-preflight.v1',compatible:true,network:TEMPO_NETWORK.network,chainId:TEMPO_NETWORK.chainId,token:TEMPO_NETWORK.token,tokenSymbol:symbol,decimals:Number(decimals),escrow:TEMPO_NETWORK.escrow,domainSeparator,balances:b,sdk:sdk.manifest,signed:false,broadcast:false};
 }
 async function prepare({kind,terms,channel,cumulativeAmountBaseUnits='0',voucher=null,operationId}){
  bind(terms);await inspect({terms,depositBaseUnits:terms.depositBaseUnits,operation:kind});const signer=kind==='open'?payer:payee;
  let args,descriptor=channel?.descriptor??null;const target=BigInt(cumulativeAmountBaseUnits);
  if(kind==='open')args=[terms.payee,terms.operator,terms.token,BigInt(terms.depositBaseUnits),terms.salt,terms.authorizedSigner];
  else{tempoCheck(descriptor&&same(Channel.computeId({...descriptor,chainId:terms.chainId,escrow:terms.escrow}),channel.protocolChannelId),'tempo_channel_binding');tempoCheck(voucher&&Voucher.verifyVoucher(terms.escrow,terms.chainId,{channelId:channel.protocolChannelId,cumulativeAmount:target,signature:voucher.signature},terms.authorizedSigner),'tempo_voucher_invalid');args=kind==='payout'?[descriptor,target,voucher.signature]:[descriptor,target,target,voucher.signature];}
  const data=viem.encodeFunctionData({abi:escrowAbi,functionName:kind==='payout'?'settle':kind,args});
  // TIP-1009 uses transaction-bound expiring nonces; one worker serializes the
  // shared sponsor. The random past validAfter and frozen salt prevent collisions.
  const second=Math.floor(now()/1000),validAfter=Math.max(0,second-60-Number(BigInt(`0x${randomBytes(4).toString('hex')}`)%1000000n));
  const prepared=await actions.prepareTransactionRequest(signClient,{account:signer,calls:[{to:terms.escrow,data}],nonceKey:'expiring',feeToken:terms.token,validAfter,validBefore:second+25});
  const fee=BigInt(prepared.gas??0)*BigInt(prepared.maxFeePerGas??0);tempoCheck(fee>0n&&fee<=BigInt(limits.maxTransactionFeeAttoUSD),'tempo_fee_cap');
  const {account:_account,chain:_chain,...request}=prepared;
  await actions.call(client,{...request,account:signer.address});
  if(kind==='open')descriptor={payer:terms.payer,payee:terms.payee,operator:terms.operator,token:terms.token,salt:terms.salt,authorizedSigner:terms.authorizedSigner,expiringNonceHash:Channel.computeExpiringNonceHash(request,{sender:terms.payer})};
  const protocolChannelId=Channel.computeId({...descriptor,chainId:terms.chainId,escrow:terms.escrow});
  return {id:operationId,kind,descriptor,protocolChannelId,request:serializable(request),signer:signer.address,validBefore:Number(prepared.validBefore),cumulativeAmountBaseUnits,priorSettledBaseUnits:channel?.settledBaseUnits??'0',estimatedFeeAttoUSD:fee.toString(),beforeBalances:await balances(),preparedAt:second};
 }
 async function sign({terms,plan}){
  bind(terms);tempoCheck(Math.floor(now()/1000)<plan.validBefore,'tempo_unsigned_plan_expired');const signer=plan.kind==='open'?payer:payee;tempoCheck(same(plan.signer,signer.address),'tempo_signer_mismatch');
  const request=hydrated(plan.request),wire=await signer.signTransaction({...request,account:signer,chainId:terms.chainId},{serializer:chain.serializers.transaction});
  const signed={wire,transactionHash:viem.keccak256(wire),estimatedFeeAttoUSD:plan.estimatedFeeAttoUSD,validBefore:plan.validBefore};validate({terms,plan,signed});return signed;
 }
 function validate({terms,plan,signed}){
  bind(terms);tempoCheck(/^0x[0-9a-f]+$/i.test(signed.wire??'')&&same(viem.keccak256(signed.wire),signed.transactionHash),'tempo_transaction_identity_mismatch');const transaction=viemTempo.Transaction.deserialize(signed.wire),request=hydrated(plan.request);
  tempoCheck(transaction.chainId===terms.chainId&&same(transaction.feeToken,terms.token)&&transaction.validBefore===plan.validBefore&&transaction.calls.length===1&&same(transaction.calls[0].to,terms.escrow)&&same(transaction.calls[0].data,request.calls[0].data),'tempo_transaction_terms_mismatch');
  const envelope=viemTempo.Transaction.z_SignatureEnvelope,tx=viemTempo.Transaction.z_TxEnvelopeTempo,payload=tx.getSignPayload(transaction),signer=envelope.extractAddress({payload,signature:transaction.signature});tempoCheck(same(signer,plan.signer)&&envelope.verify(transaction.signature,{address:signer,payload}),'tempo_transaction_signature_invalid');
  if(plan.kind==='open'){const opened=Chain.validateOpenCredentialTransaction({chainId:terms.chainId,escrowContract:terms.escrow,expectedAuthorizedSigner:terms.authorizedSigner,expectedChannelId:plan.protocolChannelId,expectedCurrency:terms.token,expectedExpiringNonceHash:plan.descriptor.expiringNonceHash,expectedOperator:terms.operator,expectedPayee:terms.payee,expectedPayer:terms.payer,serializedTransaction:signed.wire});tempoCheck(opened.openDeposit===BigInt(terms.depositBaseUnits)&&same(opened.descriptor.salt,terms.salt),'tempo_open_amount_mismatch');}
  else{const decoded=viem.decodeFunctionData({abi:escrowAbi,data:transaction.calls[0].data}),target=BigInt(plan.cumulativeAmountBaseUnits);tempoCheck(decoded.functionName===(plan.kind==='payout'?'settle':'close'),'tempo_transaction_terms_mismatch');const [descriptor,amount,third,fourth]=decoded.args,signature=plan.kind==='payout'?third:fourth;tempoCheck(same(Channel.computeId({...descriptor,chainId:terms.chainId,escrow:terms.escrow}),plan.protocolChannelId)&&amount===target&&(plan.kind==='payout'||third===target)&&Voucher.verifyVoucher(terms.escrow,terms.chainId,{channelId:plan.protocolChannelId,cumulativeAmount:target,signature},terms.authorizedSigner),'tempo_settlement_binding');}
  tempoCheck(BigInt(transaction.gas)*BigInt(transaction.maxFeePerGas)<=BigInt(plan.estimatedFeeAttoUSD),'tempo_fee_cap');
  return transaction;
 }
 async function signVoucher({terms,protocolChannelId,cumulativeAmountBaseUnits}){
  bind(terms);const message={channelId:protocolChannelId,cumulativeAmount:BigInt(cumulativeAmountBaseUnits)},signature=await Voucher.signVoucher(signClient,payer,message,terms.escrow,terms.chainId);const result={signature,signatureType:'TIP-1020-secp256k1',signer:payer.address,channelId:protocolChannelId,cumulativeAmountBaseUnits};tempoCheck(verifyVoucher({terms,voucher:result}),'tempo_voucher_invalid');return result;
 }
 function verifyVoucher({terms,voucher}){bind(terms);return Voucher.verifyVoucher(terms.escrow,terms.chainId,{channelId:voucher.channelId,cumulativeAmount:BigInt(voucher.cumulativeAmountBaseUnits),signature:voucher.signature},terms.authorizedSigner);}
 async function submit(input){const tx=validate(input);tempoCheck(Math.floor(now()/1000)<input.plan.validBefore,'tempo_signed_transaction_expired');await Chain.simulateCredentialTransaction({client,transaction:tx});tempoCheck(typeof input.beforeBroadcast==='function','tempo_broadcast_fence_required');await input.beforeBroadcast();tempoCheck(Math.floor(now()/1000)<input.plan.validBefore,'tempo_signed_transaction_expired');const hash=await actions.sendRawTransaction(client,{serializedTransaction:input.signed.wire});tempoCheck(same(hash,input.signed.transactionHash),'tempo_transaction_identity_mismatch');return lookup(input);}
 async function lookup({terms,plan,signed}){
  validate({terms,plan,signed});let receipt;try{receipt=await actions.getTransactionReceipt(client,{hash:signed.transactionHash});}catch(e){if(e?.name==='TransactionReceiptNotFoundError')return {status:'unknown',transactionHash:signed.transactionHash};throw e;}
  tempoCheck(same(receipt.transactionHash,signed.transactionHash),'tempo_transaction_identity_mismatch');
  const [finalized,block]=await Promise.all([actions.getBlock(client,{blockTag:'finalized'}),actions.getBlock(client,{blockNumber:receipt.blockNumber})]);if(finalized.number<receipt.blockNumber||!same(block.hash,receipt.blockHash))return {status:'submitted',transactionHash:signed.transactionHash};
  if(receipt.status==='reverted'){const feeAttoUSD=receipt.gasUsed*receipt.effectiveGasPrice;return {status:'failed',finality:'finalized',transactionHash:signed.transactionHash,reasonCode:'tempo_transaction_reverted',blockNumber:String(receipt.blockNumber),blockHash:receipt.blockHash,feeAsset:terms.token,feeAttoUSD:feeAttoUSD.toString(),feeAmountBaseUnits:((feeAttoUSD+999999999999n)/1000000000000n).toString(),gasUsed:bigintText(receipt.gasUsed),effectiveGasPrice:bigintText(receipt.effectiveGasPrice)};}
  const filtered={logs:receipt.logs.filter(log=>same(log.address,terms.escrow))};const event=Chain.getChannelEvent(filtered,plan.kind==='open'?'ChannelOpened':plan.kind==='payout'?'Settled':'ChannelClosed',plan.protocolChannelId);
  tempoCheck(same(event.args.payer,terms.payer)&&same(event.args.payee,terms.payee),'tempo_event_parties_mismatch');
  const target=BigInt(plan.cumulativeAmountBaseUnits),prior=BigInt(plan.priorSettledBaseUnits),deposit=BigInt(terms.depositBaseUnits),state=await Chain.readbackWithRetry(()=>Chain.getChannelState(client,plan.protocolChannelId,terms.escrow,receipt.blockNumber));
  let publisherDeltaBaseUnits='0',refundBaseUnits='0',settledBaseUnits=prior.toString();
  if(plan.kind==='open'){const fields=Chain.readChannelOpenedReceiptFields(event);Chain.validateChannelOpenedReceipt({chainId:terms.chainId,descriptor:plan.descriptor,emittedChannelId:fields.channelId,emittedDeposit:fields.deposit,emittedExpiringNonceHash:fields.expiringNonceHash,escrow:terms.escrow,expectedChannelId:plan.protocolChannelId,openDeposit:deposit});Chain.validateOpenReadbackState({emittedDeposit:fields.deposit,state});tempoCheck(same(event.args.token,terms.token)&&same(event.args.authorizedSigner,terms.authorizedSigner),'tempo_event_terms_mismatch');}
  else if(plan.kind==='payout'){const fields=Chain.readSettledReceiptFields(event);tempoCheck(fields.newSettled===target&&fields.deltaPaid===target-prior&&state.settled===target&&state.deposit===deposit&&state.closeRequestedAt===0,'tempo_payout_amount_mismatch');publisherDeltaBaseUnits=fields.deltaPaid.toString();settledBaseUnits=target.toString();}
  else{const fields=Chain.readChannelClosedReceiptFields(event);tempoCheck(fields.settledToPayee===target&&fields.refundedToPayer===deposit-target,'tempo_close_amount_mismatch');tempoCheck(state.deposit===0n,'tempo_close_state_mismatch');publisherDeltaBaseUnits=(target-prior).toString();refundBaseUnits=fields.refundedToPayer.toString();settledBaseUnits=target.toString();}
  const after=await balances(receipt.blockNumber),feeAttoUSD=receipt.gasUsed*receipt.effectiveGasPrice;
  return {status:'finalized',finality:'finalized',transactionHash:signed.transactionHash,protocolChannelId:plan.protocolChannelId,depositBaseUnits:terms.depositBaseUnits,settledBaseUnits,publisherDeltaBaseUnits,refundBaseUnits,blockNumber:String(receipt.blockNumber),blockHash:receipt.blockHash,feeAsset:terms.token,feeAttoUSD:feeAttoUSD.toString(),feeAmountBaseUnits:((feeAttoUSD+999999999999n)/1000000000000n).toString(),gasUsed:bigintText(receipt.gasUsed),effectiveGasPrice:bigintText(receipt.effectiveGasPrice),tokenDeltas:{payerObservedBaseUnits:(BigInt(after.payerBaseUnits)-BigInt(plan.beforeBalances.payerBaseUnits)).toString(),publisherObservedBaseUnits:(BigInt(after.publisherBaseUnits)-BigInt(plan.beforeBalances.publisherBaseUnits)).toString(),publisherPaymentBaseUnits:publisherDeltaBaseUnits,refundBaseUnits},state:{settledBaseUnits:String(state.settled),depositBaseUnits:String(state.deposit),closeRequestedAt:state.closeRequestedAt}};
 }
 return {inspect,prepare,sign,validate,submit,lookup,signVoucher,verifyVoucher,identities:{payer:payer.address.toLowerCase(),payee:payee.address.toLowerCase()},network:TEMPO_NETWORK,sdk:sdk.manifest};
}
