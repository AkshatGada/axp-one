import {assert,object} from '../core.mjs';
import {JEV_ENDPOINT} from './jev.mjs';
import {officialProvider} from '../../product/provider-provenance.mjs';

export const JEV_MODEL='jev-1.13.0';
export const JEV_INPUT_USD_PER_MILLION=0.042;

// No SDK retries, aliases, alternate endpoint, wallet or model-held budget.
export function createJevHttpTransport({apiKey,maxCalls=24,fetchImpl=fetch}={}) {
  assert(typeof apiKey==='string'&&apiKey.length>20,'jev_key_unavailable');
  assert(Number.isInteger(maxCalls)&&maxCalls>0&&maxCalls<=28,'call_limit_invalid');
  let attempts=0,inputTokens=0,outputTokens=0,usageRecorded=0;
  const transport=async(payload,{signal}={})=>{
    object(payload,['model','state','questions']);assert(payload.model===JEV_MODEL,'jev_model_mismatch');
    const body=JSON.stringify(payload);assert(Buffer.byteLength(body)<=8192,'jev_payload_limit');
    assert(attempts<maxCalls,'jev_call_limit');attempts++;
    const bounded=signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000);
    let response;
    try{response=await fetchImpl(JEV_ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body,signal:bounded,redirect:'error'});}
    catch{assert(false,bounded.aborted?'decision_timeout':'jev_transport_unavailable');}
    assert(response.ok,`jev_http_${response.status}`);
    const text=await response.text();assert(Buffer.byteLength(text)<=65536,'jev_response_limit');
    let result;try{result=JSON.parse(text);}catch{assert(false,'jev_response_invalid');}
    if(Number.isSafeInteger(result?.usage?.input_tokens)&&result.usage.input_tokens>=0&&Number.isSafeInteger(result?.usage?.output_tokens)&&result.usage.output_tokens>=0){inputTokens+=result.usage.input_tokens;outputTokens+=result.usage.output_tokens;usageRecorded++;}
    return result;
  };
  transport.usage=()=>({attempts,maxCalls,inputTokens,outputTokens,unknownUsageAttempts:attempts-usageRecorded,knownProviderUsd:inputTokens*JEV_INPUT_USD_PER_MILLION/1e6,estimatedProviderUsd:attempts===usageRecorded?inputTokens*JEV_INPUT_USD_PER_MILLION/1e6:null,priceSource:'https://docs.typesafe.ai/models',priceCheckedAt:'2026-10-01',excludesLocalCompute:true});
  return officialProvider(transport,fetchImpl===fetch);
}
