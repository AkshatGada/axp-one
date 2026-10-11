import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductOrganic, PRODUCT_ORGANIC_MODEL} from '../../packages/product/organic.mjs';
const key='fixture-organic-key-with-no-real-provider-authority';
const completion=(patch={})=>({model:'deepseek-flash-fixture',choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'Independent answer from fixture transport.'})}}],usage:{prompt_tokens:120,completion_tokens:40},...patch});
const response=value=>({ok:true,text:async()=>JSON.stringify(value)});

test('interactive DeepSeek wire uses the supplied sponsor-free prompt, bounded nonthinking completion and exact provenance',async()=>{
  let calls=0,request,time=100;
  const organic=createProductOrganic({apiKey:key,now:()=>time,fetchImpl:async(url,options)=>{calls++;request={url,options};time=130;return response(completion());}});
  const prompt='Answer the fresh user question independently. User question: How should I compare developer tools?';
  const result=await organic({suppliedPrompt:prompt});
  assert.equal(calls,1);assert.equal(request.url,'https://api.deepseek.com/chat/completions');assert.equal(request.options.method,'POST');assert.equal(request.options.redirect,'error');
  assert.equal(request.options.headers.Authorization,`Bearer ${key}`);assert.ok(request.options.signal instanceof AbortSignal);
  const body=JSON.parse(request.options.body);
  assert.equal(body.model,PRODUCT_ORGANIC_MODEL);assert.deepEqual(body.messages,[{role:'user',content:prompt}]);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.max_tokens,1600);assert.equal(body.stream,false);
  assert.equal(result.model,'deepseek-flash');assert.equal(result.providerModel,'deepseek-flash-fixture');assert.deepEqual(result.usage,{inputTokens:120,outputTokens:40});assert.equal(result.elapsedMs,30);
});

test('interactive adapter accepts one fenced JSON answer and never substitutes a canned completion',async()=>{
  const provider=createProductOrganic({apiKey:key,fetchImpl:async()=>response(completion({choices:[{finish_reason:'stop',message:{content:'```json\n{"answer":"An independent fenced fixture answer."}\n```'}}]}))});
  assert.equal((await provider({suppliedPrompt:'Answer this user question.'})).answer,'An independent fenced fixture answer.');
});

test('transport failure and provider HTTP failure make exactly one attempt with no automatic retry',async()=>{
  for(const [fetchFixture,expected] of [[()=>{throw new Error('fixture socket failure');},'organic_transport_unavailable'],[()=>({ok:false,status:429}),'organic_http_429']]){
    let attempts=0;
    const provider=createProductOrganic({apiKey:key,fetchImpl:async()=>{attempts++;return fetchFixture();}});
    await assert.rejects(provider({suppliedPrompt:'A fresh question.'}),error=>error.code===expected);assert.equal(attempts,1);
  }
});

test('wrong model, truncation, tool call, malformed answer, missing usage and echoed key are rejected explicitly',async()=>{
  const cases=[
    [completion({model:'deepseek-pro'}),'organic_model_mismatch'],
    [completion({choices:[{finish_reason:'length',message:{content:'{"answer":"truncated"}'}}]}),'organic_truncated'],
    [completion({choices:[{finish_reason:'stop',message:{content:'{"answer":"tool output"}',tool_calls:[{id:'fixture-call'}]}}]}),'organic_response_invalid'],
    [completion({choices:[{finish_reason:'stop',message:{content:'Plain unstructured fixture output'}}]}),'organic_response_not_json'],
    [completion({choices:[{finish_reason:'stop',message:{content:'{"answer":"fixture","advertiser":"injected"}'}}]}),'organic_response_shape'],
    [completion({usage:{}}),'organic_usage_missing'],
    [completion({choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:key})}}]}),'organic_response_invalid'],
  ];
  for(const [value,expected] of cases){const provider=createProductOrganic({apiKey:key,fetchImpl:async()=>response(value)});await assert.rejects(provider({suppliedPrompt:'A fresh independent question.'}),error=>error.code===expected);}
});
