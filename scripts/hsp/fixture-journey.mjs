// End-to-end HTTP + public SDK fixture journey. No browser, HSP or provider access.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {once} from 'node:events';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';
import {validateReceiptResult} from '../../packages/publisher-sdk/receipt.mjs';
const port=Number(process.env.AXP_HSP_PORT??3440),origin=`http://127.0.0.1:${port}`;
mkdirSync('local-state/hsk-hsp',{recursive:true});const stateDir=mkdtempSync('local-state/hsk-hsp/journey-');
const child=spawn(process.execPath,['scripts/hsp/dev-server.mjs','--fixtures','--api-only'],{stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,AXP_HSP_PORT:String(port),AXP_HSP_FIXTURE_DIR:stateDir}});let serverError='';child.stderr.on('data',b=>{serverError+=b;});
let cookie,csrf;
async function request(path,body,extra={}){const r=await fetch(origin+'/api/product'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',origin,...(csrf?{'x-axp-csrf':csrf}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;}
try{
 let ready=false;for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(serverError);try{const r=await fetch(origin+'/api/product/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert(ready,'fixture server did not start');
 const login=await fetch(origin+'/api/hsp/operator/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password:'fixture-demo-password'})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const bootstrap=await request('/bootstrap');csrf=bootstrap.csrf;await request('/account',{name:'AXP HSP fixture',websiteURL:'https://axp.example/'});
 const {id,label,exampleQuestion,...input}=bootstrap.presets[0];let c=(await request('/campaigns',{...input,settlementNetwork:'hsk-testnet',depositBaseUnits:'0',maxBidBaseUnits:'1000000',budgetCapBaseUnits:'3000000'})).campaign;await request(`/campaigns/${c.id}/approve`,{});c=(await request(`/campaigns/${c.id}/launch`,{})).campaign;assert.equal(c.paymentModel,'direct');
 const sdk=new AXPPublisher({apiKey:readFileSync(`${stateDir}/publisher-api-key`,'utf8'),baseURL:origin+'/api/product'}),summaries=[];
 for(let i=0;i<3;i++){
  const turn={question:exampleQuestion,sessionId:`fixture-session-${i}`,turnId:`fixture-turn-${i}`,settlementNetwork:'hsk-testnet'};
  const answer=await request('/demo/answer',{question:exampleQuestion,sessionId:turn.sessionId,turnId:turn.turnId});assert.equal(answer.answerMode,'fixture');const ad=await sdk.requestAd(turn);assert.equal(ad.status,'awarded',JSON.stringify(ad));
  const observation={creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};const receipt=await sdk.acknowledgeRender({awardId:ad.award.id,deliveryToken:ad.deliveryToken,observation});validateReceiptResult(receipt,{awardId:ad.award.id,creativeHash:ad.award.creativeHash,priceBaseUnits:ad.award.priceBaseUnits,financialMode:'testnet'});
  const id=receipt.charge.id,path=`/payments/${id}`,q=await request(path+'/prepare',{});const signed=await request(path+'/finalize',{quoteId:q.quote.id,signature:`0x${'ab'.repeat(65)}`,signingApproved:true});await request(path+'/submit',{quoteId:q.quote.id,mandateId:signed.mandateId,submissionApproved:true});const paid=await request(path+'/reconcile',{});assert.equal(paid.stage,'finalized');
  const repeat=await sdk.acknowledgeRender({awardId:ad.award.id,deliveryToken:ad.deliveryToken,observation});assert.equal(repeat.charge.id,id);assert.equal(repeat.receiptHash,receipt.receiptHash);const saved=await sdk.lookupOpportunity(turn);assert.equal(saved.result.award.id,ad.award.id);summaries.push({chargeId:id,receiptHash:receipt.receiptHash,status:paid.status});
 }
 assert.equal((await sdk.requestAd({question:exampleQuestion,sessionId:'fixture-four',turnId:'fixture-four',settlementNetwork:'hsk-testnet'})).status,'no_fill');const state=await request('/state');assert.equal(state.campaigns.find(r=>r.id===c.id).settledBaseUnits,'3000000');
 mkdirSync('local-state/hsk-hsp',{recursive:true});writeFileSync('local-state/hsk-hsp/fixture-journey.json',JSON.stringify({execution:'fixture',stateDir,browserUsed:false,paidProviderCalls:0,hspRequests:0,nativeBroadcasts:0,deliveries:summaries,duplicateCharges:0},null,2));console.log(JSON.stringify({execution:'fixture',placements:3,payments:3,replayChecks:3,noFill:true,paidProviderCalls:0,hspRequests:0,nativeBroadcasts:0}));
}finally{if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
