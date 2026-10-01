import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createV2Client} from '../../packages/v2/client.mjs';
import {createV2Server} from '../../apps/backend/v2.mjs';
import {hash} from '../../packages/contracts/index.mjs';
const fake={manifest:{snapshotId:'client-fixture',contentHash:hash('fixture')},publicCatalogue:()=>({records:[],contentHash:hash('fixture')}),retrieve:()=>({method:'unavailable',fallback:false,sourceHash:hash('fixture'),examples:[],hints:[],profile:null})};
test('thin V2 client matches implemented routes and browsing/preview never invoke providers',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'axp-v2-client-'));let calls=0;const server=createV2Server({stateDir:dir,retriever:fake,transport:async()=>{calls++;throw Error('not expected');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const c=createV2Client({baseURL:`http://127.0.0.1:${server.address().port}`}),b=await c.bootstrap();assert.equal(b.replay,false);assert.equal((await c.state()).financialMode,'synthetic');assert.equal((await c.evidence()).records.length,0);assert.equal((await c.retrieval(0,'v2-clearvault')).method,'unavailable');assert.equal((await c.preview()).modelCalls,0);const state=await c.state(),d=state.drafts[0];await c.saveCampaign({campaignId:d.campaign.campaignId,businessName:d.businessName,creative:d.campaign.creatives[0].approvedText,contextHints:d.contextHints,approved:true});assert.equal(calls,0);assert.ok((await c.state()).drafts.find(x=>x.campaign.campaignId===d.campaign.campaignId).approved);
 const api=JSON.parse(readFileSync(new URL('../../docs/frontend/V2_OPENAPI.json',import.meta.url)));assert.equal(api.openapi,'3.1.0');for(const route of ['/v2/bootstrap','/v2/state','/v2/evidence','/v2/retrieval','/v2/run','/v2/close'])assert.ok(api.paths[route]);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
