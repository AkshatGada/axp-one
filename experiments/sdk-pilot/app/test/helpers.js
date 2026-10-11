import {createChatServer} from '../server.js';
import {randomUUID} from 'node:crypto';
export async function start(t,options={}) {
  const server=createChatServer(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=> {await server.appIdle();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});server.store.close();});
  const client=await connect(`http://127.0.0.1:${server.address().port}`);
  return {...client,server};
}
export async function connect(base,cookie) {
  const response=await fetch(`${base}/api/session`,{headers:cookie ? {cookie} : {}}),session=await response.json();
  cookie=response.headers.get('set-cookie')?.split(';')[0] || cookie;
  return {base,cookie,session,
    async call(path,body,headers={}) {
      const response=await fetch(`${base}${path}`,{method:body===undefined ? 'GET' : 'POST',headers:{cookie,...(body===undefined?{}:{'content-type':'application/json','x-app-csrf':session.csrf}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
      return {status:response.status,body:await response.json()};
    },
  };
}
export const draft=(overrides={})=>({content:'Recommend a developer tool to debug and build a TypeScript API.',consent:true,requestId:randomUUID(),...overrides});
export async function submit(client,body=draft()) {const result=await client.call('/api/chat',body);if(result.status!==200)throw new Error(`chat status ${result.status}`);return result.body.turn;}
export async function settled(client,id) {
  for(let i=0;i<80;i++) {const {body}=await client.call(`/api/turns/${id}`);if(body.turn.adState!=='requesting')return body.turn;await new Promise(r=>setTimeout(r,50));}
  throw new Error('ad did not settle within local test deadline');
}
export const observation=award=>({creativeHash:award.creativeHash,domInserted:true,sponsoredLabelPresent:true});
export const renderBody=turn=>({awardId:turn.award.id,deliveryToken:turn.deliveryToken,observation:observation(turn.award)});
