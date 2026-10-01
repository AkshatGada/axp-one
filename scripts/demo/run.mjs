import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createSession} from '../../apps/backend/session.mjs';
const runId=`baseline-${randomUUID()}`,session=createSession({runId});
try{
  const prompt='Find a hotel near Marina Bay in Singapore for a solo traveller; free cancellation required.';
  const results=[];for(const turnId of ['placement-one','placement-two']){
    const result=await session.turn({prompt,turnId,engine:'ml-rules',randomSessionId:runId});assert.equal(result.outcome.status,'awarded');const a=result.outcome.award;
    const receipt=session.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash});
    // CLI asserts a fixture render, not an actual browser DOM observation.
    session.exchange.authorizeSynthetic(a.channelId);results.push({result,receipt});
  }
  assert.equal(results[0].result.outcome.award.channelId,results[1].result.outcome.award.channelId);
  const channelId=results[0].result.outcome.award.channelId,settlement=session.exchange.closeSynthetic(channelId);
  const replay=await session.turn({prompt,turnId:'placement-one',engine:'ml-rules',randomSessionId:runId});assert.equal(replay.replayed,true);
  const report={schemaVersion:'baseline-evidence.v1',createdAt:new Date().toISOString(),runId,mode:'synthetic',buyer:'rules_v1',renderEvidence:'CLI fixture acknowledgements; NOT browser DOM',actualModel:false,actualPayment:false,results,settlement,state:session.exchange.report()};
  const dir=resolve('artifacts/baseline');mkdirSync(dir,{recursive:true});const path=join(dir,`${runId}.json`);writeFileSync(path,JSON.stringify(report,null,2));
  process.stdout.write(JSON.stringify({runId,mode:'synthetic',acceptedCharges:report.state.charges.length,settledBaseUnits:settlement.settledBaseUnits,refundBaseUnits:settlement.refundBaseUnits,evidence:path,actualModel:false,actualPayment:false},null,2)+'\n');
}finally{session.close();}
