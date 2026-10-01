import test from 'node:test';
import assert from 'node:assert/strict';
import {Exchange} from '../../packages/exchange/index.mjs';
import {createSession} from '../../apps/backend/session.mjs';
import {PHASE4_CAMPAIGNS,PHASE4_RUN_ID,PHASE4_SESSION_ID} from '../../apps/backend/phase4.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('network mode requires a trusted adapter and only finalized open funds auction eligibility',()=>{
  assert.throws(()=>new Exchange({mode:'sandbox'}),{code:'network_adapter_required'});
  const dir=mkdtempSync(join(tmpdir(),'axp-network-test-'));let status='submitted';
  const options={stateDir:dir,runId:PHASE4_RUN_ID,mode:'sandbox',publisherPayee:'fixture-payee',campaigns:PHASE4_CAMPAIGNS,
    networkState:id=>id==='phase4-channel-tripdesk'?{channelId:id,runId:PHASE4_RUN_ID,mode:'sandbox',phase:'open',openStatus:status,depositBaseUnits:'20000',authorizedBaseUnits:'0',settledBaseUnits:'0',refundBaseUnits:'0',protocolChannelId:'fixture-native-channel',termsHash:'fixture-terms',closeStatus:null}:null};
  const session=createSession(options);
  try {
    const e=session.exchange,o=e.createOpportunity({publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId:PHASE4_SESSION_ID,turnId:'one',coarseIntent:'travel_tools',destination:'unknown',taskConstraints:[],softPreferences:[],floorBaseUnits:'1000',expiresAt:Date.now()+10000},{idempotencyKey:'one'});
    assert.equal(e.decisionCandidates(o.id).eligible.length,3);assert.equal(e.eligibleCampaigns(o.id).eligible.length,0);
    status='finalized';e.syncNetworkChannel('phase4-channel-tripdesk');assert.deepEqual(e.eligibleCampaigns(o.id).eligible.map(c=>c.campaignId),['tripdesk']);
    assert.equal(e.get('channels','phase4-channel-agentpass').depositBaseUnits,'0');
    assert.throws(()=>e.authorizeSynthetic('phase4-channel-tripdesk'),{code:'network_adapter_required'});
  }finally{session.close();rmSync(dir,{recursive:true,force:true});}
});
