import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createSession} from '../../apps/backend/session.mjs';
import {PHASE3_CAMPAIGNS,PHASE3_RUN_ID,PHASE3_SESSION_ID,PHASE3_TASK,PHASE3_TURNS,phase3Opportunity} from '../../apps/backend/phase3.mjs';
import {hash} from '../../packages/contracts/index.mjs';

let calls=0;
const forbidden=async()=>{calls++;throw new Error('replay_must_not_call_model');};
// Open the real saved run in a new process. No live model adapter exists here.
const session=createSession({stateDir:'local-state/phase3',runId:PHASE3_RUN_ID,campaigns:PHASE3_CAMPAIGNS,
  opportunityFactory:phase3Opportunity,providers:{'phase3-live':{buyer:forbidden,answer:forbidden}}});
try{
  const before=session.exchange.report(),admissionsBefore=session.exchange.all('model_admissions');
  assert.equal(before.charges.length,2);
  const replays=[];
  for(const turnId of PHASE3_TURNS){
    const result=await session.turn({prompt:PHASE3_TASK.prompt,engine:'phase3-live',turnId,randomSessionId:PHASE3_SESSION_ID});
    assert.equal(result.replayed,true);assert.equal(result.organic.status,'completed');
    const a=result.outcome.award;assert.equal(a.status,'delivered');
    const receipt=session.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash});
    assert.equal(receipt.replayed,true);replays.push({turnId,opportunityId:result.opportunityId,awardId:a.id,chargeId:receipt.charge.id,replayed:true});
  }
  const after=session.exchange.report(),admissionsAfter=session.exchange.all('model_admissions');
  assert.equal(calls,0);assert.deepEqual(after,before);assert.deepEqual(admissionsAfter,admissionsBefore);
  const report={schemaVersion:'phase3-restart-replay.v1',createdAt:new Date().toISOString(),runId:PHASE3_RUN_ID,
    mode:'recorded_results_no_new_model_execution',newModelCalls:calls,newCharges:after.charges.length-before.charges.length,
    beforeStateHash:hash(before),afterStateHash:hash(after),beforeAdmissionsHash:hash(admissionsBefore),afterAdmissionsHash:hash(admissionsAfter),replays,passed:true};
  mkdirSync('artifacts/phase3',{recursive:true});writeFileSync('artifacts/phase3/restart-replay.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{session.close();}
