// Verify the completed replay locally, with every upstream fetch disabled.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createV3Server} from '../../apps/backend/v3.mjs';
import {createClient} from '../../packages/v3/client.mjs';
const root=resolve(import.meta.dirname,'../..'),directory=process.argv[2]?resolve(process.argv[2]):join(root,'artifacts/v3/replay');
const digest=x=>createHash('sha256').update(x).digest('hex');
const files=['manifest.json','run.json'],before=files.map(f=>digest(readFileSync(join(directory,f))));
const originalFetch=globalThis.fetch;let upstreamAttempts=0,requests=0;
for(const k of ['JEV_API_KEY','TYPESAFE_API_KEY','OPENAI_API_KEY','AXP_V3_ENABLE_MODELS','AXP_V3_OPERATOR_SIGN'])delete process.env[k];
globalThis.fetch=()=>{upstreamAttempts++;throw Error('upstream_services_unavailable');};
const server=createV3Server({replayDirectory:directory});assert.equal(server.service,null);
server.listen(0,'127.0.0.1');await once(server,'listening');const baseURL=`http://127.0.0.1:${server.address().port}`;
const fetcher=(...args)=>{requests++;return originalFetch(...args);};
const client=createClient({baseURL,fetcher,replay:true});
try{
 const boot=await client.bootstrap();assert.equal(boot.replay,true);assert.equal(boot.readOnly,true);assert.equal(boot.csrf,null);
 const first=await client.state();assert.equal(first.financialMode,'sandbox');assert.equal(first.replay,true);assert.equal(first.modelEnabled,false);
 for(let i=0;i<3;i++){await client.events();await client.catalogue();assert.equal(digest(JSON.stringify(await client.state())),digest(JSON.stringify(first)));}
 const questions=server.bundle.run.state.turns;
 const methods=[];for(const id of ['cached','offline']){const t=questions.find(t=>t.scenario.id===id),r=await client.retrieval(t.question,'v3-clearvault');assert.ok(r);methods.push(r.method);}assert.deepEqual(methods,['vector','lexical_fallback']);
 const rejected=[];for(const path of ['/v3/campaign','/v3/preview','/v3/turn/request','/v3/turn/run','/v3/awards/recorded/render','/v3/awards/recorded/fail','/v3/replay/run']){const r=await fetcher(`${baseURL}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,405);assert.equal((await r.json()).error,'replay_read_only');rejected.push(path);}
 for(const path of ['/','/app.mjs','/style.css','/client.mjs','/design-system/tokens.css','/design-system/fonts.css','/design-system/fonts/PolySans-Neutral.woff2','/v3/replay/bootstrap','/v3/replay/run','/v3/replay/events'])assert.equal((await fetcher(`${baseURL}${path}`)).status,200);
 await assert.rejects(()=>client.runTurn({}),/replay_read_only/);
 assert.deepEqual(files.map(f=>digest(readFileSync(join(directory,f)))),before);assert.equal(upstreamAttempts,0);
 const report={schemaVersion:'axp.v3-replay-check.v1',observedAt:new Date().toISOString(),runId:server.bundle.run.runId,bundleHash:server.bundle.bundleHash,financialMode:'sandbox',presentation:'recorded_evidence_replay',serviceInstantiated:false,credentialsAbsent:true,upstreamUnavailable:true,upstreamAttempts,requests,retrievalMethods:methods,rejectedMutations:rejected,bundleUnchanged:true,stableRepeatedState:true,newCalls:0,newCharges:0,newSignatures:0,newBroadcasts:0,allChecksPassed:true};
 if(!process.argv[2])writeFileSync(join(root,'artifacts/v3/replay-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{server.close();server.closeAllConnections();globalThis.fetch=originalFetch;}
