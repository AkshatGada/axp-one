export function createClient({baseURL=globalThis.location?.origin,replay=true,fetcher=globalThis.fetch}={}){
 let csrf;
 async function get(path){const r=await fetcher(new URL(path,baseURL),{redirect:'error'});if(!r.ok)throw Error(`http_${r.status}`);return r.json();}
 async function post(path,body){if(replay)throw Error('replay_read_only');if(!csrf)await bootstrap();const r=await fetcher(new URL(path,baseURL),{method:'POST',headers:{'Content-Type':'application/json','x-axp-csrf':csrf},body:JSON.stringify(body),redirect:'error'});const b=await r.json();if(!r.ok)throw Error(b.error??`http_${r.status}`);return b;}
 async function bootstrap(){const b=await get('/v3/bootstrap');csrf=b.csrf;replay=b.replay;return b;}
 return {bootstrap,state:()=>get('/v3/state'),events:()=>get('/v3/events'),catalogue:()=>get('/v3/evidence'),retrieval:(question,campaignId)=>get(`/v3/retrieval?${new URLSearchParams({question,campaignId})}`),saveCampaign:b=>post('/v3/campaign',b),preview:b=>post('/v3/preview',b),requestTurn:b=>post('/v3/turn/request',b),runTurn:b=>post('/v3/turn/run',b),render:(id,b)=>post(`/v3/awards/${id}/render`,b),fail:(id,b)=>post(`/v3/awards/${id}/fail`,b)};
}
