import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createLab} from './exchange.mjs';
import {createChatServer} from './app/server.js';
import {AXPPublisher} from './app/vendor/publisher-sdk/index.mjs';

async function fixture({delayMs=0,timeoutMs=1000,failRequests=false}={}){
  const publisherKey=randomUUID();
  const lab=createLab({stateDir:mkdtempSync(join(tmpdir(),'sdk-app-connected-')),publisherKey,delayMs,failRequests});
  const exchangeURL=await lab.listen();
  const inputs=[];
  const server=createChatServer({publisher:new AXPPublisher({apiKey:publisherKey,baseURL:`${exchangeURL}/api/product`,timeoutMs}),
    provider:{async answer(input){inputs.push(structuredClone(input));return 'Independent fixture answer';}}});
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const base=`http://127.0.0.1:${server.address().port}`;
  const init=await fetch(`${base}/api/axp/session`,{method:'POST',headers:{origin:base,'content-type':'application/json','x-app-init':'1'},body:'{}'});
  const cookie=init.headers.get('set-cookie').split(';')[0],session=await init.json();
  async function post(path,body){
    const response=await fetch(`${base}${path}`,{method:'POST',headers:{origin:base,cookie,'x-app-csrf':session.csrf,'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  }
  const chat=(question,submissionId=randomUUID())=>post('/api/chat',{messages:[{role:'user',content:question}],axp:{csrf:session.csrf,submissionId}});
  return {lab,base,post,chat,inputs,publisherKey,async close(){await new Promise(ok=>server.close(ok));await lab.close();}};
}

test('independent app → unmodified SDK → actual HTTP product API → signed receipt and one charge',async()=>{
  const f=await fixture();
  try{
    const question='Recommend a developer tool to debug a TypeScript API.';
    const submissionId=randomUUID();
    const reply=await f.chat(question,submissionId);
    assert.equal(reply.status,200);assert.equal(reply.body.answer,'Independent fixture answer');
    const turnId=reply.body.axp.turnId;
    const ad=(await f.post('/api/axp/placement',{turnId})).body;
    assert.equal(ad.status,'awarded');assert.equal(ad.trace,undefined);
    const binding={turnId,awardId:ad.award.id,deliveryToken:ad.deliveryToken};
    const observation={creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};
    const receipt=(await f.post('/api/axp/render',{...binding,observation})).body;
    assert.equal(receipt.status,'accepted');assert.equal(receipt.financialMode,'synthetic');
    const duplicate=(await f.post('/api/axp/render',{...binding,observation})).body;
    assert.equal(duplicate.charge.id,receipt.charge.id);assert.equal(duplicate.replayed,true);
    assert.equal((await f.chat(question,submissionId)).body.axp.turnId,turnId);
    assert.equal(f.lab.evidence().freshFixtureCalls,1);
    assert.equal(f.lab.evidence().summary.deliveryCount,1);
    assert.equal(f.lab.evidence().summary.spendBaseUnits,receipt.charge.amountBaseUnits);
    assert.ok(f.lab.evidence().deliveries[0].receipt);
    for(const path of ['/','/app.js','/sponsorship.js','/vendor/publisher-sdk/browser.mjs']){
      const response=await fetch(`${f.base}${path}`);assert.equal(response.status,200);
      assert.ok(!(await response.text()).includes(f.publisherKey));
    }
    const nofill=await f.chat('Compare hardware wallets for Ethereum and Solana.');
    assert.equal((await f.post('/api/axp/placement',{turnId:nofill.body.axp.turnId})).body.status,'no_fill');
    const unrendered=await f.chat(question);
    const failedAd=(await f.post('/api/axp/placement',{turnId:unrendered.body.axp.turnId})).body;
    assert.equal(failedAd.status,'awarded');
    const failure=await f.post('/api/axp/fail',{turnId:unrendered.body.axp.turnId,awardId:failedAd.award.id,deliveryToken:failedAd.deliveryToken});
    assert.equal(failure.body.status,'failed');
    assert.equal(f.lab.evidence().summary.deliveryCount,1);assert.equal(f.lab.evidence().summary.reservedBaseUnits,'0');
    assert.ok(f.inputs.every(input=>Object.keys(input).join(',')==='messages'));
    assert.ok(!JSON.stringify(f.inputs).includes(ad.award.creative.approvedText));
    assert.ok(!JSON.stringify(f.inputs).includes(f.publisherKey));
  }finally{await f.close();}
});

test('actual SDK error/timeout does not block app answer or produce an accepted charge',async()=>{
  for(const config of [{failRequests:true},{delayMs:120,timeoutMs:20}]){
    const f=await fixture(config);
    try{
      const reply=await f.chat('Compare developer tools for a TypeScript API.');
      assert.equal(reply.body.answer,'Independent fixture answer');
      const result=await f.post('/api/axp/placement',{turnId:reply.body.axp.turnId});
      assert.equal(result.body.status,'error');
      assert.equal(f.lab.evidence().summary.deliveryCount,0);
      // A timed-out purchase can still create a reservation upstream. Do not
      // infer cancellation or issue a replacement opportunity; expiry handles it.
    }finally{await f.close();}
  }
});
