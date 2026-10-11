import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync,readFileSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {hash} from '../../packages/contracts/index.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

async function fixture(t,{transport,checkpoint,publisherOnly=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'axp-pilot-recovery-'));let clock=Date.now(),calls=0,service,server;
 const options={stateDir:dir,publisherKey:'pilot-key',now:()=>clock,checkpoint,transport:async packet=>{calls++;return transport?transport(packet):jevResponse(packet,3,2);}};
 function start(){service=createProductService(options);}
 start();service.saveAccount({name:'pilot fixture',websiteURL:'https://fixture.example/'});
 const {id,label,exampleQuestion,...draft}=PRESETS[0],campaign=service.saveCampaign({...draft,budgetCapBaseUnits:'100000',depositBaseUnits:'100000'}).campaign;
 service.approve(campaign.id);service.launch(campaign.id);
 let base='http://127.0.0.1/api/product';
 const handler=(req,res)=>createProductAPI({service,publisherOnly}).handler(req,res);
 if(process.env.AXP_SDK_HTTP_TEST==='1'){
  server=createServer(handler);await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});base=`http://127.0.0.1:${server.address().port}/api/product`;
 }
 async function request(path,{method='GET',body,key='pilot-key',token}={}){
  const headers={'content-type':'application/json','x-axp-publisher-key':key,...(token?{'x-axp-delivery-token':token}:{})};
  if(server){const res=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
  const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);req.url='/api/product'+path;req.method=method;req.headers={...headers,host:'127.0.0.1'};
  let status,value;await handler(req,{writeHead(s){status=s;},end(b){value=JSON.parse(b);}});return {status,body:value};
 }
 t.after(async()=>{if(server){server.closeAllConnections();await new Promise(ok=>server.close(ok));}service.close();rmSync(dir,{recursive:true,force:true});});
 return {dir,get service(){return service;},request,input:{question:exampleQuestion,sessionId:'session-pilot',turnId:'turn-pilot'},calls:()=>calls,advance:ms=>{clock+=ms;},restart:()=>{service.close();start();}};
}
const observe=ad=>({creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true});
const lookup=input=>`/publisher/opportunities?sessionId=${input.sessionId}&turnId=${input.turnId}`;

test('lost opportunity/receipt responses recover after restart through authenticated reads, without new charges or calls',async t=>{
 const f=await fixture(t);
 assert.equal((await f.request(lookup(f.input))).body.status,'not_found');
 // Treat the POST response as lost: recovery caller retains only session/turn.
 await f.request('/opportunities',{method:'POST',body:f.input});f.restart();
 const before=hash(f.service.exchange.report()),found=(await f.request(lookup(f.input))).body;
 assert.equal(found.status,'resolved');assert.equal(found.awardStatus,'reserved');assert.equal(hash(f.service.exchange.report()),before);
 const ad=found.result,receipt=(await f.request(`/awards/${ad.award.id}/render`,{method:'POST',token:ad.deliveryToken,body:observe(ad)})).body;
 f.restart();const acceptedBefore=hash(f.service.exchange.report());
 for(let n=0;n<3;n++){
  const status=(await f.request(`/awards/${ad.award.id}/status`,{token:ad.deliveryToken})).body;
  assert.equal(status.status,'accepted');assert.equal(status.result.charge.id,receipt.charge.id);assert.equal(status.result.signature,receipt.signature);assert.equal(status.result.receiptHash,receipt.receiptHash);
 }
 assert.equal(hash(f.service.exchange.report()),acceptedBefore);assert.equal(f.calls(),1);assert.equal(f.service.exchange.all('charges').length,1);
 assert.equal((await f.request(`/awards/${ad.award.id}/render`,{method:'POST',token:ad.deliveryToken,body:observe(ad)})).body.charge.id,receipt.charge.id);
});

test('publisher key scopes, rotation/revocation and wrong-workspace keys fail closed; token survives rotation',async t=>{
 const f=await fixture(t),other=await fixture(t),ad=(await f.request('/opportunities',{method:'POST',body:f.input})).body;
 const read=f.service.credentials.issue({label:'read-only',scopes:['opportunities:read','delivery:read']});
 assert.equal((await f.request(lookup(f.input),{key:read.apiKey})).status,200);
 assert.equal((await f.request('/opportunities',{method:'POST',body:{...f.input,turnId:'denied'},key:read.apiKey})).status,401);
 const foreign=other.service.credentials.issue();assert.equal((await f.request(lookup(f.input),{key:foreign.apiKey})).status,401);
 const original=f.service.credentials.list().find(k=>k.label==='initial operator key');
 const rotated=f.service.credentials.rotate(original.id);f.restart();
 assert.equal((await f.request(lookup(f.input))).status,401);
 assert.equal((await f.request(`/awards/${ad.award.id}/status`,{key:rotated.apiKey,token:'wrong'})).status,403);
 assert.equal((await f.request(`/awards/${ad.award.id}/render`,{method:'POST',key:rotated.apiKey,token:ad.deliveryToken,body:observe(ad)})).body.status,'accepted');
 f.service.credentials.revoke(rotated.keyId);f.restart();assert.equal((await f.request(lookup(f.input),{key:rotated.apiKey})).status,401);
 const stored=JSON.stringify(f.service.exchange.all('product_publisher_keys'));assert.equal(stored.includes(rotated.apiKey),false);assert.equal(stored.includes(read.apiKey),false);assert.equal(f.calls(),1);
});

test('pending admission is read-only; interrupted admission becomes unknown and is never reissued',async t=>{
 let release,entered;const held=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
 const f=await fixture(t,{transport:async packet=>{entered();await held;return jevResponse(packet,3,2);}});
 const promise=f.request('/opportunities',{method:'POST',body:f.input});await ready;
 assert.equal((await f.request(lookup(f.input))).body.status,'pending');release();await promise;
 const crashInput={...f.input,turnId:'crashed'},key=hash([crashInput.sessionId,crashInput.turnId]);
 const normalized={...crashInput,placementId:'chat-sponsored-card',requiredCapabilities:[],excludedCategories:[]};
 f.service.exchange.put('product_request_admissions',key,{inputHash:hash(normalized),status:'pending'});f.restart();
 const before=hash(f.service.exchange.report());assert.equal((await f.request(lookup(crashInput))).body.status,'unknown');
 const retry=await f.request('/opportunities',{method:'POST',body:crashInput});assert.equal(retry.status,409);assert.equal(retry.body.error,'opportunity_outcome_unknown');
 assert.equal(f.calls(),1);assert.equal(hash(f.service.exchange.report()),before);
});

test('expired/failed awards and no-fill stay terminal; GET status cannot expire, charge or repurchase',async t=>{
 const f=await fixture(t),ad=(await f.request('/opportunities',{method:'POST',body:f.input})).body;
 f.advance(300001);const before=hash(f.service.exchange.report());
 assert.equal((await f.request(lookup(f.input))).body.awardStatus,'expired');assert.equal((await f.request(`/awards/${ad.award.id}/status`,{token:ad.deliveryToken})).body.status,'expired');assert.equal(hash(f.service.exchange.report()),before);
 const expired=await f.request(`/awards/${ad.award.id}/render`,{method:'POST',token:ad.deliveryToken,body:observe(ad)});assert.equal(expired.status,409);
 const next=(await f.request('/opportunities',{method:'POST',body:{...f.input,turnId:'failed'}})).body;
 assert.equal((await f.request(`/awards/${next.award.id}/fail`,{method:'POST',token:next.deliveryToken,body:{reason:'not_inserted'}})).body.status,'failed');
 assert.equal((await f.request(`/awards/${next.award.id}/status`,{token:next.deliveryToken})).body.status,'failed');
 const input={...f.input,turnId:'no-fill',requiredCapabilities:['mobile_software_wallet']};await f.request('/opportunities',{method:'POST',body:input});
 assert.equal((await f.request(lookup(input))).body.result.status,'no_fill');assert.equal(f.service.exchange.all('charges').length,0);
});

test('canonical restriction order/whitespace is stable, lookup cannot cross sessions or take arbitrary financial inputs',async t=>{
 const f=await fixture(t),a={...f.input,question:` ${f.input.question} `,requiredCapabilities:['software_development','solana']};
 await f.request('/opportunities',{method:'POST',body:a});
 const replay=await f.request('/opportunities',{method:'POST',body:{...a,question:f.input.question,requiredCapabilities:['solana','software_development']}});assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);
 assert.equal((await f.request(lookup({...a,sessionId:'another'}))).body.status,'not_found');
 assert.equal((await f.request(lookup(a)+'&amount=100')).status,400);assert.equal((await f.request(lookup(a)+'&turnId=another')).status,400);
 assert.equal((await f.request(lookup(a),{key:'wrong'})).status,401);assert.equal(f.service.exchange.all('charges').length,0);
});

test('dedicated pilot mode exposes only configuration and authenticated SDK routes, not public workspace or dashboard mutations',async t=>{
 const f=await fixture(t,{publisherOnly:true});
 assert.equal((await f.request('/publisher/config')).body.contractVersion,'0.2.0');
 for(const path of ['/state','/bootstrap'])assert.equal((await f.request(path)).status,404);
 for(const path of ['/account','/campaigns','/demo/chat','/demo/answer'])assert.equal((await f.request(path,{method:'POST',body:{}})).status,404);
 assert.equal((await f.request('/opportunities',{method:'POST',body:f.input,key:'wrong'})).status,401);
 assert.equal((await f.request('/opportunities',{method:'POST',body:f.input})).body.status,'awarded');
 assert.equal((await f.request(lookup(f.input))).body.status,'resolved');
});

test('legacy saved token and unsorted canonical input remain usable without rewriting historical rows',async t=>{
 const f=await fixture(t),input={...f.input,requiredCapabilities:['software_development','solana']};
 await f.request('/opportunities',{method:'POST',body:input});
 const key=hash([input.sessionId,input.turnId]),saved=f.service.exchange.get('product_requests',key);
 saved.input.requiredCapabilities.reverse();saved.inputHash=hash(saved.input);f.service.exchange.put('product_requests',key,saved);
 const before=hash(saved);assert.equal((await f.request('/opportunities',{method:'POST',body:input})).body.replayed,true);assert.equal(hash(f.service.exchange.get('product_requests',key)),before);
 const next=(await f.request('/opportunities',{method:'POST',body:{...f.input,turnId:'legacy'}})).body;
 const legacyKey=hash([f.input.sessionId,'legacy']),row=f.service.exchange.get('product_requests',legacyKey);row.result.deliveryToken='legacy-bound-capability';f.service.exchange.put('product_requests',legacyKey,row);f.restart();
 assert.equal((await f.request(`/awards/${next.award.id}/status`,{token:'legacy-bound-capability'})).body.status,'reserved');
});

test('operator CLI provisions/revokes an ignored scoped credential without printing it or invoking providers',async t=>{
 const f=await fixture(t);
 const invoke=(...args)=>spawnSync(process.execPath,['scripts/product/publisher-key.mjs',...args,'--state-dir',f.dir],{encoding:'utf8'});
 const issued=invoke('issue','--out','publisher.env','--scopes','opportunities:read,delivery:read');assert.equal(issued.status,0,issued.stderr);
 const record=JSON.parse(issued.stdout),text=readFileSync(join(f.dir,'publisher.env'),'utf8'),key=text.match(/^AXP_PUBLISHER_API_KEY=(.+)$/m)[1];
 assert.equal((statSync(join(f.dir,'publisher.env')).mode&0o777),0o600);assert.equal(issued.stdout.includes(key),false);
 assert.equal((await f.request(lookup(f.input),{key})).status,200);
 assert.equal((await f.request('/opportunities',{method:'POST',body:f.input,key})).status,401);
 const revoked=invoke('revoke','--key-id',record.keyId);assert.equal(revoked.status,0,revoked.stderr);f.restart();assert.equal((await f.request(lookup(f.input),{key})).status,401);
 assert.equal(f.calls(),0);
});
