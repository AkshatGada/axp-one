import {resolve,join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {hash} from '../../packages/contracts/index.mjs';
import {loadV2Bundle} from '../../packages/v2/bundle.mjs';
const root=resolve(import.meta.dirname,'../..'),url=process.argv[2]??'http://127.0.0.1:8793';
if(!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(url))throw Error('loopback_only');
const get=async p=>{const r=await fetch(url+p);if(!r.ok)throw Error('http_'+r.status);return r.json();};
const b=await get('/v2/bootstrap'),before=await get('/v2/state');
const summary=s=>({runId:s.runId,admitted:s.model.admittedCalls,completedAt:s.completed.at,chargesHash:hash(s.exchange.charges),channelsHash:hash(s.exchange.channels),eventsHash:hash(s.exchange.events),decisionsHash:hash(s.completed.paired)});
const original=summary(before);
let readOnly=true;
if(!b.replay){
 if(before.modelEnabled)throw Error('restart_check_requires_provider_disabled');
 const post=async(p,body={})=>{const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':b.csrf},body:JSON.stringify(body)});if(!r.ok)throw Error('http_'+r.status);return r.json();};
 await post('/v2/run');
 for(const a of before.exchange.awards){const result=await post(`/v1/awards/${a.id}/render`,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash});if(!result.replayed)throw Error('duplicate_not_replayed');}
 await post('/v2/close');readOnly=false;
}else{
 for(const route of ['/v2/run','/v2/campaign','/v2/close','/v1/awards/x/render']){const r=await fetch(url+route,{method:'POST',body:'{}'});if(r.status!==405)throw Error('replay_mutation_allowed');}
 for(let i=0;i<3;i++)for(const route of ['/v2/state','/v2/evidence','/v2/retrieval?question=0&campaign=v2-clearvault','/v2/retrieval?question=1&campaign=v2-clearvault','/v2/v1-payment'])await get(route);
}
const after=summary(await get('/v2/state'));if(hash(original)!==hash(after))throw Error('restart_replay_changed_state');
const bundle=loadV2Bundle(join(root,'artifacts/v2/replay'));
const checks={schemaVersion:'axp.v2-check.v1',observedAt:new Date().toISOString(),kind:readOnly?'credential-free-read-only-replay':'fresh-process-provider-disabled-recovery',bundleHash:bundle.bundleHash,before:original,after,newModelCalls:0,newCharges:0,newPayments:0,unchanged:true,postRequestsRejected:readOnly};
writeFileSync(join(root,`artifacts/v2/${readOnly?'offline-replay':'restart-replay'}.json`),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
