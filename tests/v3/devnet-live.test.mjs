// Offline: DeepSeek organic provider (mock fetch), engine-bound organic bridge,
// devnet service mode and live-run helpers. No network, keys or SDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDeepSeekOrganicProvider,DEEPSEEK_ORGANIC} from '../../packages/v3/organic-providers.mjs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {v3RunPolicy} from '../../packages/v3/bundle.mjs';
import {POLICY} from '../../packages/v3/config.mjs';
import {buildLiveTerms,assertLiveRunId} from '../../packages/v3/devnet-live.mjs';

const KEY='fake-test-key-not-a-real-secret-000';
const reply=(over={})=>({id:'f6a0c7d2-1111-4222-8333-944455556666',model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({answer:'General guidance.'})}}],usage:{prompt_tokens:210,completion_tokens:90,prompt_cache_hit_tokens:0},...over});
function mock(body,status=200){const calls=[];const f=async(url,init)=>{calls.push({url,init:{...init,body:JSON.parse(init.body)}});return {ok:status<300,status,text:async()=>JSON.stringify(body)};};f.calls=calls;return f;}

test('deepseek provider sends only the sponsor-free prompt to deepseek-flash, low temperature, no tools', async () => {
  const f=mock(reply()),answer=createDeepSeekOrganicProvider({apiKey:KEY,fetchImpl:f,maxCalls:2});
  const r=await answer({suppliedPrompt:'Return ONLY JSON. User task: x'});
  assert.equal(f.calls[0].url,'https://api.deepseek.com/chat/completions');
  const b=f.calls[0].init.body;assert.equal(b.model,'deepseek-flash');assert.equal(b.temperature,DEEPSEEK_ORGANIC.temperature);
  assert.deepEqual(b.messages,[{role:'user',content:'Return ONLY JSON. User task: x'}]);assert.equal(b.tools,undefined);assert.equal(b.response_format,undefined);
  assert.equal(r.answer,'General guidance.');assert.equal(r.engine,'deepseek-flash-api');assert.deepEqual(r.usage,{inputTokens:210,outputTokens:90,cachedInputTokens:0});
  assert.ok(!JSON.stringify(r).includes(KEY));
  await answer({suppliedPrompt:'p'});await assert.rejects(answer({suppliedPrompt:'p'}),/organic_call_limit/);
  const fenced=await createDeepSeekOrganicProvider({apiKey:KEY,fetchImpl:mock(reply({choices:[{finish_reason:'stop',message:{content:'```json\n{"answer":"Fenced."}\n```'}}]}))})({suppliedPrompt:'p'});assert.equal(fenced.answer,'Fenced.');
  await assert.rejects(createDeepSeekOrganicProvider({apiKey:KEY,fetchImpl:mock(reply({choices:[{finish_reason:'stop',message:{content:'Sure! {"answer":"x"}'}}]}))})({suppliedPrompt:'p'}),/organic_response_not_json/);
});

test('deepseek provider rejects pro models, tool calls, truncation, extra fields and HTTP errors', async () => {
  const run=body=>createDeepSeekOrganicProvider({apiKey:KEY,fetchImpl:mock(body)})({suppliedPrompt:'p'});
  await assert.rejects(run(reply({model:'deepseek-v4-pro'})),/organic_model_mismatch/);
  await assert.rejects(run(reply({choices:[{finish_reason:'tool_calls',message:{content:'',tool_calls:[{}]}}]})),/organic_response_invalid/);
  await assert.rejects(run(reply({choices:[{finish_reason:'length',message:{content:'{"answer":"x"}'}}]})),/organic_truncated/);
  await assert.rejects(run(reply({choices:[{finish_reason:'stop',message:{content:'{"answer":"x","ad":"y"}'}}]})),/organic_response_shape/);
  await assert.rejects(createDeepSeekOrganicProvider({apiKey:KEY,fetchImpl:mock({},500)})({suppliedPrompt:'p'}),/organic_http_500/);
  assert.throws(()=>createDeepSeekOrganicProvider({apiKey:''}),/organic_key_unavailable/);
});

test('devnet service binds run mode and deepseek organic engine; recorded defaults unchanged', async t => {
  const dir=mkdtempSync(join(tmpdir(),'axp-live-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const s=createV3Service({stateDir:dir,runId:'v3-devnet-live-test',retriever:loadEvidence(),payee:'fake:payee',financialMode:'devnet',organicEngine:'deepseek-flash-api'});
  try {
    for(const d of s.state().drafts)s.saveCampaign({campaignId:d.campaign.campaignId,approved:true});
    const f=s.freeze();assert.equal(f.policy.financialMode,'devnet');assert.equal(f.policy.organicModel,'deepseek-flash');
    assert.deepEqual(f.policy,v3RunPolicy('devnet','deepseek-flash-api'));assert.equal(s.state().financialMode,'devnet');
    assert.throws(()=>s.requestTurn({scenarioId:'cached',financialMode:'sandbox'}),/financial_mode_invalid/);
    const r=s.requestTurn({scenarioId:'cached',financialMode:'devnet'}).organic;
    assert.equal(r.model,'deepseek-flash');assert.equal(r.engine,'deepseek-flash-api');assert.ok(!/ClearVault|KeyForge|Sponsored/.test(r.suppliedPrompt));
    const body={turnId:r.turnId,requestId:r.requestId,inputHash:r.inputHash,agentId:'f6a0c7d2-1111-4222-8333-944455556666',model:'deepseek-flash',effort:r.effort,answer:'General guidance.',completedAt:new Date(0).toISOString(),usage:{inputTokens:1,outputTokens:2}};
    assert.throws(()=>s.organic.complete({...body,engine:'codex-cli-exec'}),/organic_completion_invalid/);
    const done=s.organic.complete(body);assert.equal(done.provenance.engine,'deepseek-flash-api');assert.equal(done.provenance.execution,'actual-api-model');
  } finally {s.close();}
  assert.equal(v3RunPolicy('sandbox'),POLICY);
});

test('live terms helper binds devnet, caps and a live run id', () => {
  assert.throws(()=>assertLiveRunId('v3-wallet-acceptance'),/live_run_id_invalid/);
  const h='b'.repeat(64),t=buildLiveTerms({runId:'v3-devnet-live-x',campaign:{channelId:'v3-keyforge-channel',advertiserId:'a',campaignVersionId:'v',maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000'},payer:'p1',payee:'p2',openSalt:'7',now:100,programAccountHash:h,programDataHash:h,compatibilityHash:h});
  assert.equal(t.mode,'devnet');assert.equal(t.runId,'v3-devnet-live-x');assert.equal(t.zeroChargeClose,true);assert.equal(t.depositBaseUnits,'20000');
  assert.throws(()=>buildLiveTerms({runId:'v3-devnet-live-x',campaign:{channelId:'v3-leatherguard-channel'},payer:'a',payee:'b',openSalt:'1',now:1,programAccountHash:h,programDataHash:h,compatibilityHash:h}),/channel_not_allowed/);
});
