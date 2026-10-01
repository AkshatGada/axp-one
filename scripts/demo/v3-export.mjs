// Read local finalized evidence only. No keys, models, signing or RPC.
import {resolve,join} from 'node:path';
import {readFileSync} from 'node:fs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {writeV3Bundle,restoreV3CapturedRecords} from '../../packages/v3/bundle.mjs';
const root=resolve(import.meta.dirname,'../..'),retriever=loadEvidence(),service=createV3Service({stateDir:join(root,'local-state/v3'),retriever,payee:JSON.parse(readFileSync(join(root,'artifacts/phase4/feasibility-sandbox.json'))).network.payee});
try{
 const callEvidence=service.harness.results(),state=restoreV3CapturedRecords(service.state(),callEvidence),receipts=service.exchange.all('receipt_records'),publishers=service.exchange.all('publishers');
 const restart=JSON.parse(readFileSync(join(root,'artifacts/v3/restart.json')));
 const run={schemaVersion:'axp.v3-run.v1',runId:state.runId,manifest:retriever.manifest,evidence:retriever.publicCatalogue(),state,events:state.exchange.events,receipts,publishers,restart,
  callEvidence,retrieval:state.turns.filter(t=>t.scenario.id==='cached'||t.scenario.id==='offline').flatMap(t=>t.records.filter(r=>r.arm==='history').map(r=>({question:t.question,campaignId:r.campaignId,result:r.retrieval}))),
  chainEvidence:JSON.parse(readFileSync(join(root,'artifacts/v3/chain-check.json'))),limitations:state.limitations,createdAt:new Date().toISOString()};
 const saved=writeV3Bundle(join(root,'artifacts/v3/replay'),run);console.log(JSON.stringify({status:'verified',runId:state.runId,bundleHash:saved.bundleHash,charges:state.exchange.charges.length}));
}finally{service.close();}
