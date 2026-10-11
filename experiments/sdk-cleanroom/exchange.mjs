import {createServer} from 'node:http';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {jevResponse} from '../../tests/ml/fixtures.mjs';
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Actual product API/ledger, fixture decisions and synthetic credits only. */
export function createLab({stateDir,publisherKey,delayMs=0,failRequests=false}={}) {
  if(!stateDir)throw new Error('isolated_state_dir_required');
  let freshFixtureCalls=0;
  const service=createProductService({stateDir,runId:'sdk-cleanroom-v1',publisherKey,
    financialMode:'synthetic',signingEnabled:false,dailyModelCap:100,
    transport:async packet=>{freshFixtureCalls++;
      if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
      return jevResponse(packet,3,2);}});
  if(!service.state().campaigns.length){
    service.saveAccount({name:'Clean-room integration fixtures',websiteURL:'https://fixture.example/'});
    const {id,label,exampleQuestion,...draft}=PRESETS[0];
    const {campaign}=service.saveCampaign({...draft,budgetCapBaseUnits:'100000',depositBaseUnits:'100000'});
    service.approve(campaign.id);service.launch(campaign.id);
  }
  const api=createProductAPI({service});
  function evidence(){const state=service.state();
    return {schemaVersion:'sdk-cleanroom-evidence.v1',runId:'sdk-cleanroom-v1',financialMode:'synthetic',
      decisionExecution:'fixture',organicExecution:'external_app_fixture',networkPayments:0,paidProviderCalls:0,
      freshFixtureCalls,persistedDecisionAdmissions:service.exchange.all('product_decisions').length,
      summary:state.summary,
      campaigns:state.campaigns.map(c=>({id:c.id,brandName:c.brandName,spendBaseUnits:c.spendBaseUnits,reservedBaseUnits:c.reservedBaseUnits})),
      requests:service.exchange.all('product_requests').map(r=>({input:r.input,inputHash:r.inputHash,
        status:r.result.status,opportunityId:r.result.opportunityId,awardId:r.result.award?.id??null})),
      decisions:service.exchange.all('product_decisions').map(r=>({callId:r.callId,packetHash:r.packetHash,packet:r.packet,result:r.result,status:r.status})),
      deliveries:state.deliveries,
      awards:service.exchange.all('awards').map(a=>({id:a.id,opportunityId:a.opportunityId,status:a.status,creativeHash:a.creativeHash})),
      receiptMeaning:'Publisher assertion of exact labelled insertion, not independent view or attention proof.'};}
  const json=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
  const handler=async(req,res)=>{
    const path=new URL(req.url,'http://127.0.0.1').pathname;
    if(req.method==='GET'&&path==='/__lab/evidence')return json(res,200,evidence());
    const allowed=path==='/api/product/publisher/config'||path==='/api/product/opportunities'||/^\/api\/product\/awards\/[-\w]+\/(render|fail)$/.test(path);
    if(!allowed)return json(res,404,{error:'not_found'});
    if(failRequests&&path==='/api/product/opportunities')return json(res,503,{error:'fixture_exchange_unavailable'});
    await api.handler(req,res);
  };
  const server=createServer(handler);
  return {service,server,evidence,
    async listen(port=0){await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});return `http://127.0.0.1:${server.address().port}`;},
    async close(){await new Promise(ok=>server.close(ok));service.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  // Deliberately no dotenv loading, inherited provider keys or native wallets.
  const stateDir=resolve(process.env.CLEANROOM_STATE_DIR??'local-state/sdk-cleanroom');
  mkdirSync(stateDir,{recursive:true,mode:0o700});
  const lab=createLab({stateDir});
  const base=await lab.listen(Number(process.env.CLEANROOM_EXCHANGE_PORT??3470));
  const key=readFileSync(join(stateDir,'publisher-api-key'),'utf8').trim();
  const credentialFile=join(stateDir,'integrator.env');
  if(!existsSync(credentialFile))writeFileSync(credentialFile,`AXP_EXCHANGE_URL=${base}/api/product\nAXP_PUBLISHER_API_KEY=${key}\n`,{mode:0o600,flag:'wx'});
  const save=()=>{const value=lab.evidence();writeFileSync(join(stateDir,'evidence.json'),JSON.stringify({...value,evidenceHash:sha(value)},null,2));};
  console.log(JSON.stringify({base,financialMode:'synthetic',decisionExecution:'fixture',credentialFile}));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{save();await lab.close();process.exit(0);});
}
