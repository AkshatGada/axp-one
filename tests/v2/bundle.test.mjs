import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateV2Run} from '../../packages/v2/bundle.mjs';
const original=JSON.parse(readFileSync(new URL('../../artifacts/v2/replay/run.json',import.meta.url)));
test('offline actual V2 chain validates without provider, keys or database',()=>assert.equal(validateV2Run(original),true));
const history=r=>r.state.completed.paired.find(x=>x.questionIndex===0&&x.campaignId==='v2-clearvault'&&x.arm==='history');
const unavailable=r=>r.state.completed.paired.find(x=>x.status==='unavailable');
for(const [name,mutate]of [
 ['misbound decision opportunity',r=>history(r).decision.opportunityId='different-opportunity'],
 ['missing turns',r=>delete r.state.completed.turns],
 ['false model counts',r=>{r.state.model.admittedCalls=12;r.state.model.unavailableCalls=0;}],
 ['false actual completion',r=>{unavailable(r).status='completed';unavailable(r).rawOutput={model:'jev-1.13.0'};}],
 ['missing historical packet',r=>history(r).retrieval=null],
 ['missing original response',r=>history(r).rawOutput=null],
 ['false charged campaign',r=>r.state.exchange.charges[0].campaignId='v2-pocketkey'],
 ['changed original scores',r=>history(r).rawOutput.answers.relevance.score=0],
 ['changed model packet',r=>r.callEvidence.calls[1].payload.state.evidence=null],
 ['baseline bid substituted',r=>r.state.completed.turns[0].outcome.bids[0].agentRunId=r.state.completed.paired[0].decision.agentRunId],
 ['false winning bid',r=>r.state.exchange.awards[0].winningBidId='invented'],
 ['changed amount',r=>r.state.completed.turns[0].outcome.bids[0].amountBaseUnits='3000'],
 ['changed creative',r=>r.state.exchange.awards[0].creative.approvedText='Invented creative'],
 ['missing call admission',r=>r.callEvidence.calls[0].admitted=false],
 ['changed usage',r=>r.state.model.usage.inputTokens++],
 ['extra baseline charge',r=>{r.state.exchange.charges.push({...r.state.exchange.charges[0],id:'invented-charge',campaignId:'v2-pocketkey'});}],
])test(`replay rejects ${name}`,()=>{const r=structuredClone(original);mutate(r);assert.throws(()=>validateV2Run(r));});
