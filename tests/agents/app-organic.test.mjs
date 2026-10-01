import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {hash} from '../../packages/contracts/index.mjs';
import {APP_ORGANIC_PROMPT,createAppOrganicBridge} from '../../packages/dsp/app-organic.mjs';

test('operator-recorded app answer bridge verifies bindings without claiming new CLI execution',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'axp-app-answer-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const bridge=createAppOrganicBridge({directory}),record={schemaVersion:'app-organic-completion.v1',turnId:'placement-one',agentId:'01a0f65e-1e55-7ce2-b8f4-a97a60d15b52',model:'gpt-6.1-sol',effort:'low',suppliedPromptHash:hash(APP_ORGANIC_PROMPT),completedAt:new Date().toISOString(),answer:'Fixture completion, not a real provider call.'};
  await assert.rejects(bridge('',{turnId:'placement-one'}),{code:'app_answer_unavailable'});
  writeFileSync(join(directory,'placement-one.json'),JSON.stringify(record));
  const answer=await bridge('',{turnId:'placement-one'});assert.equal(answer.value.answer,record.answer);assert.equal(answer.provenance.runtime,'isolated-app-agent-operator-bridge');assert.equal(answer.provenance.delivery,'saved completion bridge');assert.ok(answer.provenance.attestation.includes('not cryptographic'));assert.notEqual(answer.provenance.toolUse,'none');
  for(const change of [{model:'other'},{turnId:'placement-two'},{answer:'x'.repeat(1201)},{suppliedPromptHash:hash('other input')},{completedAt:'invalid'},{amount:'1'}]){
    writeFileSync(join(directory,'placement-one.json'),JSON.stringify({...record,...change}));await assert.rejects(bridge('',{turnId:'placement-one'}));
  }
  await assert.rejects(bridge('',{turnId:'../../secret'}),{code:'app_answer_turn_invalid'});
});
