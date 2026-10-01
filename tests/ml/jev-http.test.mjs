import test from 'node:test';
import assert from 'node:assert/strict';
import {createJevHttpTransport,JEV_MODEL} from '../../packages/ml/engines/jev-http.mjs';
const key='fixture-not-a-real-key-123456';
const payload={model:JEV_MODEL,state:{task:'Find a travel tool'},questions:{fit:{type:'noul',instructions:'Does it fit?'}}};
test('HTTP transport pins endpoint/model and accounts for actual usage without returning credentials',async()=>{
  let calls=0;const transport=createJevHttpTransport({apiKey:key,maxCalls:1,fetchImpl:async(url,opts)=>{
    calls++;assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(opts.headers.Authorization,`Bearer ${key}`);assert.equal(opts.redirect,'error');assert.ok(opts.signal);
    return new Response(JSON.stringify({model:JEV_MODEL,answers:{},usage:{input_tokens:100,output_tokens:10}}));
  }});
  await transport(payload);assert.equal(calls,1);assert.equal(transport.usage().inputTokens,100);
  assert.ok(!JSON.stringify(transport.usage()).includes(key));await assert.rejects(transport(payload),{code:'jev_call_limit'});assert.equal(calls,1);
});
test('no retries on failure, no key/raw error leakage, oversized payload never sent',async()=>{
  let calls=0;const transport=createJevHttpTransport({apiKey:key,fetchImpl:async()=>{calls++;throw new Error('private '+key);}});
  await assert.rejects(transport(payload),e=>e.code==='jev_transport_unavailable'&&!e.message.includes(key));assert.equal(calls,1);
  await assert.rejects(transport({...payload,state:'a'.repeat(9000)}),{code:'jev_payload_limit'});assert.equal(calls,1);
  await assert.rejects(transport({...payload,model:'jev-latest'}),{code:'jev_model_mismatch'});assert.equal(calls,1);
});
test('HTTP failures remain explicit, successful response size is bounded',async()=>{
  const failed=createJevHttpTransport({apiKey:key,fetchImpl:async()=>new Response('private error',{status:401})});
  await assert.rejects(failed(payload),{code:'jev_http_401'});assert.equal(failed.usage().attempts,1);
  const huge=createJevHttpTransport({apiKey:key,fetchImpl:async()=>new Response('x'.repeat(65537))});
  await assert.rejects(huge(payload),{code:'jev_response_limit'});
});
