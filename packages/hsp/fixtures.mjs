// Explicit synthetic HSP transport. Never import this as a live fallback.
export function jevResponse(payload, relevance = 3, intent = 3, chosen = Object.keys(payload.questions.creative.criteria)[0]) {
  const scored = (n, criteria) => ({ type: 'score', score: n, confidence: 1, legend: Object.fromEntries(criteria.map((x, i) => [i, x])), probabilities: Object.fromEntries(criteria.map((_, i) => [i, i === n ? 1 : 0])) });
  return { model: payload.model, answers: { relevance: scored(relevance, payload.questions.relevance.criteria), intent: scored(intent, payload.questions.intent.criteria), creative: { type: 'choice', choice: chosen, confidence: 1, probabilities: Object.fromEntries(Object.keys(payload.questions.creative.criteria).map(k => [k, k === chosen ? 1 : 0])) }, sufficient: { type: 'noul', noul: .95 } }, usage: { input_tokens: 100, output_tokens: 20 } };
}

export const fixtureConfig={network:'hsk-testnet',networkValue:'fixture-hsk-133',chainId:133,token:`0x${'11'.repeat(20)}`,decimals:6,protocol:'eip3009',coin:'USDC',merchantName:'AXP',payer:`0x${'22'.repeat(20)}`,payee:`0x${'33'.repeat(20)}`};
export const fixtureModels={transport:Object.assign(async packet=>jevResponse(packet,3,3),{execution:'fixture'}),organicTransport:Object.assign(async()=>({answer:'This independent example answer is a fixture. Compare your requirements and verify product capabilities before choosing.',model:'fixture-answer'}),{execution:'fixture'})};
export function fixtureHsp(now=Date.now){const calls=[];let queryStatus='payment-finalized';return {execution:'fixture',calls,setStatus:value=>{queryStatus=value;},async invoke(name,{terms:t,row,quote}){
 calls.push(name);
 if(name==='create_order')return {flow_id:`fixture-${row.cartId}`,payment_request_id:`request-${row.cartId}`};
 if(name==='get_order')return {flow_id:row.flowId,payment_request_id:row.paymentRequestId,merchant_name:t.merchantName,pay_to:t.payee,amountUsd:`${BigInt(row.amountBaseUnits)/1000000n}.${String(BigInt(row.amountBaseUnits)%1000000n).padStart(6,'0')}`};
 if(name==='estimate_fee')return {feeRaw:'100'};
 if(name==='prepare_payment')return {chainId:133,token:t.token,protocol:t.protocol,payer:t.payer,pay_to:t.payee,payment_request_id:row.paymentRequestId,merchantAmountUsd:`${BigInt(row.amountBaseUnits)/1000000n}.${String(BigInt(row.amountBaseUnits)%1000000n).padStart(6,'0')}`,token_total_raw:String(BigInt(row.amountBaseUnits)+100n),principalRaw:row.amountBaseUnits,feeRaw:'100',quote_expires_at:new Date(now()+300000).toISOString(),cart_hash:row.receiptHash,payment_payload:{fixture:true},payment_mandate_contents:{fixture:true},eip712:{domain:{chainId:133,verifyingContract:t.token,name:'Fixture token',version:'1'},types:{TransferWithAuthorization:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'value',type:'uint256'},{name:'validAfter',type:'uint256'},{name:'validBefore',type:'uint256'},{name:'nonce',type:'bytes32'}]},primaryType:'TransferWithAuthorization',message:{from:t.payer,to:t.payee,value:String(BigInt(row.amountBaseUnits)+100n),validAfter:'0',validBefore:String(Math.floor((now()+300000)/1000)),nonce:`0x${row.receiptHash}`}}};
 if(name==='finalize_payment')return {payment_mandate_json:{fixture:true,cartHash:quote.cart_hash}};
 if(name==='submit_payment')return {status:'payment-submitted'};
 if(name==='query_payment')return {status:queryStatus,attribution_verified:true,flow_id:row.flowId,payment_request_id:row.paymentRequestId,merchant_name:t.merchantName,payer_address:t.payer,to_pay_address:t.payee,chainId:133,token:t.token,tx_signature:`0x${row.receiptHash}`,status_reason:'fixture failure'};
 throw Error('fixture_tool_invalid');
 }};}
