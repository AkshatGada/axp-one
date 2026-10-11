// Product UI regression lab: real routes and ledger, fixture providers, no wallets.
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createProductService, PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {jevResponse} from '../../tests/ml/fixtures.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const port=Number(process.env.SDK_SMOKE_PORT??3480);
const stateDir=mkdtempSync(resolve(tmpdir(),'axp-sdk-product-smoke-'));
let fixtureCalls=0;
const organicInputs=[];
const service=createProductService({stateDir,runId:'sdk-product-merge-smoke',financialMode:'synthetic',signingEnabled:false,
  transport:async packet=>{fixtureCalls++;return jevResponse(packet,3,2);},
  organicTransport:async request=>{organicInputs.push(request);return {answer:'Regression fixture answer: compare network support, offline signing and recovery before choosing a wallet. For unrelated questions, use independent guidance. This answer is not from a live model.',model:'fixture-organic'};}});
service.saveAccount({name:'SDK merge regression fixture',websiteURL:'https://fixture.example/'});
const {id,label,exampleQuestion,...draft}=PRESETS[1];
const {campaign}=service.saveCampaign(draft);service.approve(campaign.id);service.launch(campaign.id);
// Contract-level UI fixture: the existing UI requires the live-answer wire marker.
// Only this test facade maps it; persisted service provenance remains "fixture".
// Model text identifies the stub, never live-model evidence.
const api=createProductAPI({service:{...service,
  publisherConfig(){const c=service.publisherConfig();return {...c,organic:{...c.organic,execution:'actual-api-model',model:'REGRESSION FIXTURE — no live model'}};},
  async answer(body){return {...await service.answer(body),answerMode:'actual-api-model',regressionFixture:true};}}});
// Deliberately do not load .env.local or construct a native payment worker.
const staticRoot=resolve(root,'apps/product-ui/.next-product-build');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(req.method==='GET'&&path==='/__sdk-merge/evidence'){
    const report=service.exchange.report();
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
    return res.end(JSON.stringify({financialMode:'synthetic',execution:'fixture',paidProviderCalls:0,walletOperations:0,fixtureCalls,organicInputs,
      campaigns:service.state().campaigns,summary:service.state().summary,awards:report.awards,charges:report.charges}));
  }
  if(path==='/api/product'||path.startsWith('/api/product/'))return api.handler(req,res);
  try{
    let file=resolve(staticRoot,`.${decodeURIComponent(path)}`);
    if(!file.startsWith(staticRoot+sep)&&file!==staticRoot)throw Error('invalid_path');
    if(statSync(file).isDirectory())file=resolve(file,'index.html');
    const body=readFileSync(file);
    res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({base:`http://127.0.0.1:${port}`,stateDir,financialMode:'synthetic',execution:'fixture',walletOperations:0})));
let stopping=false;
function stop(){if(stopping)return;stopping=true;server.closeAllConnections();server.close(()=>{service.close();process.exit(0);});}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
