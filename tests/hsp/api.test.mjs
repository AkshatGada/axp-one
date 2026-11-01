import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createProductAPI} from '../../packages/product/api.mjs';
import {operatorSession} from '../../packages/hsp/operator.mjs';
import {once} from 'node:events';
async function server(t,handler){const s=createServer(handler);s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>{s.close();s.closeAllConnections();});return `http://127.0.0.1:${s.address().port}`;}
test('payment API requires operator authority and exact origin/CSRF; GET performs no external mutation',async t=>{
 const calls=[];const service={hsp:{lookup:id=>({stage:'accepted-unpaid',id}),prepare:async id=>{calls.push(id);return {stage:'quote-ready'};}}};
 const api=createProductAPI({service,csrf:'test-csrf',operator:req=>req.headers.authorization==='fixture-operator'});const origin=await server(t,api.handler),path='/api/product/payments/charge-award-fixture';
 assert.equal((await fetch(origin+path)).status,401);assert.equal((await fetch(origin+path,{headers:{authorization:'fixture-operator'}})).status,200);assert.equal(calls.length,0);
 const headers={authorization:'fixture-operator','content-type':'application/json','x-axp-csrf':'test-csrf',origin};
 assert.equal((await fetch(origin+path+'/prepare',{method:'POST',headers:{...headers,origin:'https://foreign.example'},body:'{}'})).status,403);
 assert.equal((await fetch(origin+path+'/prepare',{method:'POST',headers:{...headers,'x-axp-csrf':'wrong'},body:'{}'})).status,403);
 // No Origin must be rejected, even with a captured CSRF and operator credential.
 const {origin:omitted,...noOrigin}=headers;assert.equal((await fetch(origin+path+'/prepare',{method:'POST',headers:noOrigin,body:'{}'})).status,403);
 assert.equal((await fetch(origin+path+'/prepare',{method:'POST',headers,body:'{"payer":"arbitrary"}'})).status,400);
 assert.equal((await fetch(origin+path+'/prepare',{method:'POST',headers,body:'{}'})).status,200);assert.equal(calls.length,1);
});
test('operator cookie is HttpOnly/SameSite and login rejects cross-origin and wrong passwords',async t=>{
 let session;const origin=await server(t,async(req,res)=>{if(!await session.handler(req,res)){res.writeHead(404);res.end();}});session=operatorSession({origin,password:'fixture-password-long'});
 const send=(password,source=origin)=>fetch(origin+'/api/hsp/operator/login',{method:'POST',headers:{origin:source,'content-type':'application/json'},body:JSON.stringify({password})});
 assert.equal((await send('wrong')).status,401);assert.equal((await send('fixture-password-long','https://foreign.example')).status,403);const r=await send('fixture-password-long');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);const cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await (await fetch(origin+'/api/hsp/operator/session',{headers:{cookie}})).json()).authenticated,true);
});
