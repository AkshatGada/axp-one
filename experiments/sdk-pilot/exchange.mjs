import {createServer} from 'node:http';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {jevResponse} from '../../tests/ml/fixtures.mjs';

/** Separate pilot-only lab. Real product routes/ledger, no paid models or wallets. */
export function createPilotLab({stateDir}={}) {
 if(!stateDir)throw new Error('isolated_state_required');
 let fixtureCalls=0,service;
 function start(){service=createProductService({stateDir,runId:'sdk-pilot-v2',financialMode:'synthetic',signingEnabled:false,dailyModelCap:100,transport:async packet=>{fixtureCalls++;return jevResponse(packet,3,2);}});}
 start();
 if(!service.exchange.all('product_campaigns').length){
  service.saveAccount({name:'SDK pilot fixture',websiteURL:'https://fixture.example/'});
  const {id,label,exampleQuestion,...draft}=PRESETS[0];
  const {campaign}=service.saveCampaign({...draft,budgetCapBaseUnits:'100000',depositBaseUnits:'100000'});service.approve(campaign.id);service.launch(campaign.id);
 }
 function evidence(){
  const report=service.exchange.report();
  return {schemaVersion:'sdk-pilot-evidence.v1',runId:'sdk-pilot-v2',financialMode:'synthetic',decisionExecution:'fixture',paidProviderCalls:0,networkPayments:0,fixtureCalls,
   persistedDecisionAdmissions:service.exchange.all('product_decisions').length,
   requests:service.exchange.all('product_requests').map(r=>({input:r.input,opportunityId:r.result.opportunityId,awardId:r.result.award?.id??null,status:r.result.status})),
   awards:report.awards.map(a=>({id:a.id,status:a.status,opportunityId:a.opportunityId,creativeHash:a.creativeHash})),
   charges:report.charges,receiptCount:service.exchange.all('receipt_records').length,
   spendBaseUnits:String(report.charges.reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n)),
   receiptMeaning:'Publisher assertion of insertion and disclosure, not human attention.'};
 }
 const server=createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/__pilot/evidence'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(evidence()));return;}
  await createProductAPI({service,publisherOnly:true}).handler(req,res);
 });
 return {server,get service(){return service;},evidence,restart(){service.close();start();},
  async listen(port=0){await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});return `http://127.0.0.1:${server.address().port}`;},
  async close(){server.closeAllConnections();await new Promise(ok=>server.close(ok));service.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const stateDir=resolve(process.env.PILOT_STATE_DIR??'local-state/sdk-pilot');mkdirSync(stateDir,{recursive:true,mode:0o700});
 const lab=createPilotLab({stateDir}),base=await lab.listen(Number(process.env.PILOT_EXCHANGE_PORT??3472));
 const credentialFile=join(stateDir,'integrator.env');
 if(!existsSync(credentialFile))writeFileSync(credentialFile,`AXP_EXCHANGE_URL=${base}/api/product\nAXP_PUBLISHER_API_KEY=${readFileSync(join(stateDir,'publisher-api-key'),'utf8').trim()}\n`,{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({base,credentialFile,financialMode:'synthetic',execution:'fixture',walletOperations:0}));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{writeFileSync(join(stateDir,'evidence.json'),JSON.stringify(lab.evidence(),null,2));await lab.close();process.exit(0);});
}
