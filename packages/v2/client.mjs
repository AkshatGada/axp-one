// Thin caller of implemented backend routes; no scoring, ledger or signing.
export function createV2Client({baseURL='',fetchImpl=fetch}={}){
 let token=null,replay=false;
 async function get(path){const r=await fetchImpl(baseURL+path);const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
 async function post(path,body={}){if(replay)throw Error('replay_read_only');const r=await fetchImpl(baseURL+path,{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':token},body:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
 return {async bootstrap(){const b=await get('/v2/bootstrap');token=b.csrf;replay=b.replay;return b;},state:()=>get('/v2/state'),evidence:()=>get('/v2/evidence'),retrieval:(question,campaign)=>get(`/v2/retrieval?question=${question}&campaign=${encodeURIComponent(campaign)}`),v1Payment:()=>get('/v2/v1-payment'),saveCampaign:d=>post('/v2/campaign',d),preview:()=>post('/v2/preview'),run:()=>post('/v2/run'),closeAccounting:()=>post('/v2/close'),acknowledge:(awardId,ack)=>post(`/v1/awards/${encodeURIComponent(awardId)}/render`,ack),failDelivery:awardId=>post(`/v1/awards/${encodeURIComponent(awardId)}/fail`)};
}
