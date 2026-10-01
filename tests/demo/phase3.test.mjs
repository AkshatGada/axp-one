import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createSession} from '../../apps/backend/session.mjs';
import {createDemoServer} from '../../apps/backend/server.mjs';
import {createPhase3Runtime,PHASE3_RUN_ID,PHASE3_TASK,PHASE3_SESSION_ID,PHASE3_TURNS,phase3Opportunity} from '../../apps/backend/phase3.mjs';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {PHASE2_SEED} from '../../packages/dsp/phase2-fixtures.mjs';

// Authored provider doubles: these tests do NOT establish real model behavior.
const corpus=()=>createCachedCorpus({query:async()=>({database:'ads',readOnly:true,model:'BAAI/bge-base-en-v1.5',dimension:768,
  queryTextHash:createHash('sha256').update(PHASE2_SEED.toLowerCase()).digest('hex'),queryVectorId:10,
  matches:[{promptId:20,promptText:PHASE2_SEED,promptVectorId:11,similarity:1,mappings:[
    {mappingId:30,creativeId:26176,advertiser:'Navan',creativeText:'Corporate travel tools',creativeVectorId:12,hint:null},
    {mappingId:31,creativeId:7668,advertiser:'Auth0',creativeText:'Agent authentication',creativeVectorId:13,hint:null},
    {mappingId:32,creativeId:3422,advertiser:'Software Connect',creativeText:'Hotel ERP',creativeVectorId:14,hint:null},
  ]}]} )});
function response(payload,{noFill=false}={}){
  const fit=!noFill&&payload.state.campaign.campaignId==='tripdesk',level=fit?3:0;
  const score=(level,criteria)=>({type:'score',score:level,confidence:1,legend:Object.fromEntries(criteria.map((c,i)=>[i,c])),probabilities:Object.fromEntries(criteria.map((_,i)=>[i,i===level?1:0]))});
  const choice=fit?'tripdesk-creative-v1':'no_fit';
  return {model:payload.model,answers:{relevance:score(level,payload.questions.relevance.criteria),intent:score(2,payload.questions.intent.criteria),creative:{type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(payload.questions.creative.criteria).map(k=>[k,k===choice?1:0]))},sufficient:{type:'noul',noul:1}},usage:{input_tokens:100,output_tokens:10}};
}
const turn=(i=0)=>({prompt:PHASE3_TASK.prompt,engine:'phase3-live',turnId:PHASE3_TURNS[i],randomSessionId:PHASE3_SESSION_ID});
const ack=a=>({domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash});
async function setup(t,{noFill=false,unavailable=false,answerFailure=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'axp-p3-')),inputs=[],organicInputs=[];
  const runtime=await createPhase3Runtime({corpus:corpus(),transport:async p=>{inputs.push(p);if(unavailable)throw new Error('fixture_failure');return response(p,{noFill});},answerRunner:async text=>{organicInputs.push(text);if(answerFailure)throw new Error('fixture_answer_failure');return {value:{answer:'Fixture-independent answer.'},provenance:{model:'fixture-not-real',inputHash:'fixture'}};}});
  const session=createSession({stateDir:dir,runId:PHASE3_RUN_ID,...runtime.sessionOptions});
  t.after(()=>{try{session.close();}catch{}rmSync(dir,{recursive:true,force:true});});
  return {session,runtime,inputs,organicInputs,dir};
}
test('Phase 3 connects own-profile decisions, independent answer, two charges and restart replay (provider doubles)',async t=>{
  const {session:s,runtime,inputs,organicInputs,dir}=await setup(t);
  const first=await s.turn(turn()),a=first.outcome.award;
  assert.equal(a.campaignId,'tripdesk');assert.equal(first.eligibility.eligible.length,3);
  assert.equal(first.attempts.filter(a=>a.decision.decision==='skip').length,2);
  assert.equal(s.exchange.report().charges.length,0); // auction is not delivery
  const firstReceipt=s.acknowledge(a.id,ack(a));assert.equal(firstReceipt.charge.amountBaseUnits,'3000');
  s.exchange.authorizeSynthetic(a.channelId);
  const second=await s.turn(turn(1));assert.equal(second.outcome.award.channelId,a.channelId);
  s.acknowledge(second.outcome.award.id,ack(second.outcome.award));
  assert.equal(s.exchange.authorizeSynthetic(a.channelId).authorizedBaseUnits,'6000');
  for(const loser of ['agentpass','hotelops'])assert.equal(s.exchange.totals({campaignId:loser}).accepted,0n);
  assert.equal(inputs.length,6);assert.equal(organicInputs.length,2);
  for(const p of inputs){const serialized=JSON.stringify(p);assert.ok(!serialized.includes('maxBidBaseUnits'));assert.ok(!serialized.includes('phase3-channel'));assert.ok(!serialized.includes('budgetCapBaseUnits'));const own=p.state.campaign.campaignId;for(const other of ['tripdesk','agentpass','hotelops'].filter(x=>x!==own))assert.ok(!serialized.includes(`fictional-${other}`));}
  for(const text of organicInputs)for(const excluded of ['tripdesk','agentpass','hotelops','Navan','Auth0','profile','creative','channel'])assert.ok(!text.includes(excluded));
  assert.equal(s.exchange.all('model_admissions').length,8);
  s.close();const restarted=createSession({stateDir:dir,runId:PHASE3_RUN_ID,...runtime.sessionOptions});
  try{const replay=await restarted.turn(turn());assert.equal(replay.replayed,true);assert.equal(replay.organic.text,'Fixture-independent answer.');assert.equal(replay.outcome.award.status,'delivered');assert.equal(restarted.acknowledge(a.id,ack(a)).replayed,true);assert.equal(restarted.exchange.report().charges.length,2);assert.equal(inputs.length,6);assert.equal(organicInputs.length,2);}finally{restarted.close();}
});
test('Phase 3 no-fill or failed provider does not charge or block organic answer',async t=>{
  for(const opts of [{noFill:true},{unavailable:true}]){const {session}=await setup(t,opts);const result=await session.turn(turn());assert.equal(result.outcome.status,'no_fill');assert.equal(result.organic.status,'completed');assert.equal(session.exchange.report().charges.length,0);assert.equal(session.exchange.all('model_admissions').length,4);}
});
test('Phase 3 failed render is uncharged; organic failure is not a fabricated answer',async t=>{
  const {session}=await setup(t,{answerFailure:true});const result=await session.turn(turn());assert.equal(result.organic.status,'unavailable');assert.ok(!result.organic.text.includes('Fixture-independent'));const a=result.outcome.award;session.exchange.failAward(a.id);assert.throws(()=>session.acknowledge(a.id,ack(a)),{code:'award_expired'});assert.equal(session.exchange.report().charges.length,0);
});
test('Phase 3 frozen run and durable admission cannot be reopened by changing UI input',async t=>{
  const {session}=await setup(t);
  await assert.rejects(()=>session.turn({...turn(),prompt:'New unapproved task'}),{code:'phase3_frozen_turn_required'});
  await assert.rejects(()=>session.turn({...turn(),turnId:'extra'}),{code:'phase3_frozen_turn_required'});
  const result=await session.turn(turn());
  // Delete only in a fixture to simulate restart between call admission and outcome save.
  session.exchange.db.prepare('DELETE FROM demo_turns WHERE run=?').run(PHASE3_RUN_ID);
  const recovered=await session.turn(turn());assert.equal(recovered.replayed,true);assert.equal(recovered.organic.source,'recovery');
  assert.equal(recovered.outcome.award.id,result.outcome.award.id);
});
test('Phase 3 HTTP configuration and mode labels cannot reset the paid allowance',async t=>{
  const {runtime,dir}=await setup(t);
  // Separate fixture DB, leaving setup session intact.
  const server=createDemoServer({stateDir:join(dir,'http'),runId:PHASE3_RUN_ID,sessionOptions:runtime.sessionOptions,demoMetadata:runtime.metadata});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));});
  const origin=`http://127.0.0.1:${server.address().port}`,bootstrap=await(await fetch(origin+'/v1/bootstrap')).json();
  assert.equal(bootstrap.demo.financialMode,'synthetic');assert.equal(bootstrap.demo.maxBuyerCalls,6);
  const post=(path,data)=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':bootstrap.csrf},body:JSON.stringify(data)});
  assert.equal((await post('/v1/demo/reset',{})).status,409);
  assert.equal((await post('/v1/demo/turn',{...turn(),engine:'codex'})).status,400);
  assert.equal((await post('/v1/demo/turn',turn())).status,200);
  const recorded=await(await fetch(origin+'/v1/demo/results')).json();assert.equal(recorded.mode,'recorded_results_not_fresh_execution');assert.equal(recorded.results.length,1);
});
test('same-model answer recovery preserves original failed turn and never re-auctions or charges',async t=>{
  const {session,dir,runtime,inputs}=await setup(t,{answerFailure:true});
  const original=await session.turn(turn());session.acknowledge(original.outcome.award.id,ack(original.outcome.award));session.close();
  let completions=0;
  const fixed=await createPhase3Runtime({profiles:new Map(runtime.metadata.profiles.map(p=>[p.campaignId,p])),transport:async()=>{throw new Error('must not rerun buyers');},organicRuntime:'app-bridge',answerRunner:async()=>{completions++;return {value:{answer:'Fixture fresh-app answer.'},provenance:{runtime:'fixture-app-completion',model:'fixture-not-real'}};}});
  const recovered=createSession({stateDir:dir,runId:PHASE3_RUN_ID,...fixed.sessionOptions});
  try{
    const result=await recovered.recoverOrganic({turnId:PHASE3_TURNS[0],randomSessionId:PHASE3_SESSION_ID});
    assert.equal(result.originalOrganic.status,'unavailable');assert.equal(result.organic.status,'completed');
    assert.equal(recovered.exchange.all('demo_turns')[0].result.organic.status,'unavailable');assert.equal(recovered.exchange.report().charges.length,1);
    assert.equal(recovered.exchange.report().awards.length,1);assert.equal(recovered.exchange.all('demo_organic_recoveries').length,1);assert.equal(inputs.length,3);
    await recovered.recoverOrganic({turnId:PHASE3_TURNS[0],randomSessionId:PHASE3_SESSION_ID});assert.equal(completions,1);
    const replay=await recovered.turn(turn());assert.equal(replay.organic.text,'Fixture fresh-app answer.');assert.equal(replay.originalOrganic.status,'unavailable');assert.equal(recovered.results()[0].outcome.award.status,'delivered');
  }finally{recovered.close();}
});
