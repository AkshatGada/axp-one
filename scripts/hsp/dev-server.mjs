// This executable owns only a separate loopback workspace. It never imports a
// production environment file or connects to the account database.
import {createServer,request as proxyRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,existsSync,openSync,writeFileSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createProductService} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {HspStore} from '../../packages/hsp/store.mjs';
import {createHspPayments} from '../../packages/hsp/service.mjs';
import {operatorSession} from '../../packages/hsp/operator.mjs';
import {connectHsp} from '../../packages/hsp/mcp.mjs';
import {evmReaders,createRegistryClient} from '../../packages/hsp/evm.mjs';
import {check} from '../../packages/hsp/config.mjs';
import {budgetProvider} from '../../packages/hsp/provider-budget.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {createProductOrganic} from '../../packages/product/organic.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
check(resolve(process.cwd())===resolve(fileURLToPath(new URL('../../',import.meta.url))),'hsp_run_from_worktree');
const fixture=process.argv.includes('--fixtures'),apiOnly=process.argv.includes('--api-only');
const dir=fixture&&process.env.AXP_HSP_FIXTURE_DIR?resolve(process.env.AXP_HSP_FIXTURE_DIR):resolve('local-state/hsk-hsp',fixture?'fixture':'qa'),port=Number(process.env.AXP_HSP_PORT??3440),uiPort=port+1,origin=`http://127.0.0.1:${port}`;
mkdirSync(dir,{recursive:true,mode:0o700});const lockPath=join(dir,'server.lock');
if(existsSync(lockPath)){const prior=JSON.parse(readFileSync(lockPath));let alive=true;try{process.kill(prior.pid,0);}catch(e){alive=e.code!=='ESRCH';}check(!alive,'hsp_server_already_running');unlinkSync(lockPath);}const lock=openSync(lockPath,'wx',0o600);writeFileSync(lock,JSON.stringify({pid:process.pid}));closeSync(lock);
const store=new HspStore(join(dir,'hsp.sqlite'));let hsp,config,helpers,models={};
try{
 if(fixture){const f=await import('../../packages/hsp/fixtures.mjs');hsp=f.fixtureHsp();config=f.fixtureConfig;models=f.fixtureModels;helpers={expiredAuthorizationUnused:async()=>true,verifySignature:async()=>true,balance:async()=> '9000000',verifyTransfer:async t=>({verified:true,fixture:true,chainId:133,transactionHash:t.txHash,logIndex:0,recipientRaw:t.principalRaw,finality:'finalized'})};}
 else {
  check(process.env.AXP_HSP_RUN_CONFIRMED==='1','hsp_run_confirmation_required');const profile=JSON.parse(readFileSync(process.env.AXP_HSP_PROFILE));
  hsp=await connectHsp({allowlisted:process.env.AXP_HSP_QA_ALLOWLIST_CONFIRMED==='1',profile});config=hsp.config;helpers=await evmReaders({qaRpcURL:process.env.AXP_HSP_RPC_URL});
  if(process.env.AXP_HSP_REGISTRY)helpers.registry=await createRegistryClient({address:process.env.AXP_HSP_REGISTRY,registrar:process.env.AXP_HSP_REGISTRAR,main:helpers.main,maxFeeWei:process.env.AXP_HSP_ANCHOR_MAX_FEE_WEI,deployment:JSON.parse(readFileSync('local-state/hsk-hsp/contract/deployment-verification.json'))});
  if(process.env.AXP_HSP_LIVE_MODELS==='1'){
   check(process.env.AXP_HSP_MODEL_RESERVATION_MICRO_USD,'hsp_model_reservation_required');const reservationMicroUsd=process.env.AXP_HSP_MODEL_RESERVATION_MICRO_USD;
   models={transport:budgetProvider({store,kind:'jev',reservationMicroUsd,provider:createJevHttpTransport({apiKey:process.env.JEV_API_KEY,maxCalls:24})}),organicTransport:budgetProvider({store,kind:'answer',reservationMicroUsd,provider:createProductOrganic({apiKey:process.env.DEEPSEEK_API_KEY})})};
  }
 }
 let payments;const service=createProductService({stateDir:dir,runId:fixture?'hsp-fixture-v1':'hsp-qa-v1',financialMode:'testnet',demoMode:true,dailyModelCap:24,retriever:loadEvidence(),...models,directOptions:{payee:config.payee,token:config.token,ready:true,blocked:()=>Boolean(payments?.blocked()||(store.meta('provider-admissions')??[]).some(r=>r.status==='unknown-usage'))}});
 payments=createHspPayments({exchange:service.exchange,store,config,transport:hsp,...helpers});service.hsp=payments;
 const operator=operatorSession({password:process.env.AXP_HSP_OPERATOR_PASSWORD??(fixture?'fixture-demo-password':null),origin});const api=createProductAPI({service,operator:operator.authenticated});
 const ui=apiOnly?null:spawn(process.execPath,[resolve('apps/product-ui/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(uiPort)],{cwd:resolve('apps/product-ui'),stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_BASE_PATH:'',NEXT_PUBLIC_AXP_HSP_DEMO:'1',NEXT_DIST_DIR:'.next-hsp-dev'}});
 const server=createServer(async(req,res)=>{try{
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end('Host rejected');}
  if(await operator.handler(req,res))return;
  const path=new URL(req.url,origin).pathname;
  if(path.startsWith('/api/accounts')){res.writeHead(404);return res.end('{}');}
  if(path==='/api/product/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify({isolated:true,fixture,network:'hsk-testnet',paymentModel:'direct',execution:hsp.execution}));}
  if(path.startsWith('/api/product')){
   const sdk=path==='/api/product/opportunities'||path==='/api/product/publisher/opportunities'||/^\/api\/product\/awards\/[-\w]+\/(render|fail|status)$/.test(path);
   if(!sdk&&req.method==='POST'&&req.headers.origin!==origin){res.writeHead(403,{'content-type':'application/json'});return res.end('{"error":"origin_invalid"}');}
   if(!sdk&&!operator.authenticated(req)){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":"operator_required"}');}
   if(path==='/api/product/hsp/config'&&req.method==='GET'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify(payments.configuration()));}
   return api.handler(req,res);
  }
  if(apiOnly){res.writeHead(404);return res.end('API only');}const p=proxyRequest({hostname:'127.0.0.1',port:uiPort,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});p.on('error',()=>{res.writeHead(503);res.end('UI starting. Refresh shortly.');});req.pipe(p);
 }catch(e){if(!res.headersSent)res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:e.code??'hsp_unavailable'}));}});
 server.listen(port,'127.0.0.1',()=>console.log(`Isolated AXP HSP ${fixture?'FIXTURE (no chain payments)':'QA'} demo: ${origin}/advertiser-dashboard/`));
 function stop(){server.close();server.closeAllConnections();ui?.kill('SIGTERM');service.close();payments.close();hsp.close?.();unlinkSync(lockPath);}
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
}catch(e){store.close();unlinkSync(lockPath);throw e;}
