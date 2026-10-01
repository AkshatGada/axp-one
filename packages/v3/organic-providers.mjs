// Bounded organic-answer providers for live V3 runs. Each receives ONLY the
// sponsor-free supplied prompt from organic.request (no ads, evidence, tools).
import {ContractError} from '../contracts/index.mjs';
import {ORGANIC_ENGINES} from './organic.mjs';

export const DEEPSEEK_ORGANIC=Object.freeze({engine:'deepseek-flash-api',model:'deepseek-flash',baseURL:'https://api.deepseek.com',temperature:0.2,maxTokens:8000,timeoutMs:90000});
const fail=code=>{throw new ContractError(code);};

/** DeepSeek OpenAI-compatible chat completions. Model is pinned to deepseek-flash. */
export function createDeepSeekOrganicProvider({apiKey,maxCalls=6,fetchImpl=fetch,now=Date.now}={}) {
  if(typeof apiKey!=='string'||apiKey.length<20)fail('organic_key_unavailable');
  if(!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>6)fail('organic_call_limit_invalid');
  const {model,baseURL,temperature,maxTokens,timeoutMs,engine}=DEEPSEEK_ORGANIC;
  if(model!==ORGANIC_ENGINES[engine].model)fail('organic_model_mismatch');
  let calls=0;
  async function answer({suppliedPrompt}) {
    if(typeof suppliedPrompt!=='string'||!suppliedPrompt.trim()||suppliedPrompt.length>4000)fail('organic_prompt_invalid');
    if(calls>=maxCalls)fail('organic_call_limit');calls++;
    const started=now();
    let response;
    try{response=await fetchImpl(`${baseURL}/chat/completions`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages:[{role:'user',content:suppliedPrompt}],temperature,max_tokens:maxTokens,stream:false})});}
    catch{fail('organic_transport_unavailable');}
    if(!response.ok)fail(`organic_http_${response.status}`);
    let j;try{j=JSON.parse(await response.text());}catch{fail('organic_response_invalid');}
    // Never accept a different (e.g. pro) model, tool calls or a truncated answer.
    if(typeof j?.model!=='string'||!j.model.startsWith(model)||/pro/i.test(j.model))fail('organic_model_mismatch');
    const choice=j.choices?.[0],message=choice?.message;
    if(choice?.finish_reason==='length'){const e=new ContractError('organic_truncated');e.details={completionTokens:j.usage?.completion_tokens??null,reasoningTokens:j.usage?.completion_tokens_details?.reasoning_tokens??null,contentCharacters:message?.content?.length??0};throw e;}
    if(!message||message.tool_calls?.length||choice.finish_reason!=='stop'||typeof message.content!=='string')fail('organic_response_invalid');
    // Plain completion (JSON mode can pad whitespace to the token limit). Accept the
    // JSON object alone, optionally inside one ```json fence; nothing else is kept.
    const fenced=message.content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/),raw=fenced?fenced[1]:message.content.trim();
    let value;try{value=JSON.parse(raw);}catch{fail('organic_response_not_json');}
    if(!value||typeof value.answer!=='string'||Object.keys(value).length!==1||!value.answer.trim())fail('organic_response_shape');
    const u=j.usage??{},usage={inputTokens:u.prompt_tokens,outputTokens:u.completion_tokens,...(Number.isSafeInteger(u.prompt_cache_hit_tokens)?{cachedInputTokens:u.prompt_cache_hit_tokens}:{})};
    if(!Number.isSafeInteger(usage.inputTokens)||!Number.isSafeInteger(usage.outputTokens))fail('organic_usage_missing');
    return {engine,answer:value.answer,agentId:String(j.id),model,providerModel:j.model,effort:ORGANIC_ENGINES[engine].effort,usage,elapsedMs:now()-started};
  }
  answer.calls=()=>calls;
  return answer;
}
