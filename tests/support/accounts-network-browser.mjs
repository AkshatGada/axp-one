// Explicit isolated browser acceptance. Four fictional fixture identities;
// injected Jev responses, synthetic accounting, no configuration/env loading.
import {createServer,request} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createAccountStore} from '../../packages/accounts/store.mjs';
import {createAccountNetworkService} from '../../packages/accounts/network-service.mjs';
import {createFixtureFinancialRepository} from '../../packages/accounts/financial-repository.mjs';
import {createAccountsAPI} from '../../packages/accounts/api.mjs';
import {repositoryRoot} from '../../packages/config/local.mjs';
import {fixtureAPI,providerFixture,setup,input,accept,origin,authFixture} from './account-network-fixture.mjs';

if(process.env.AXP_ACCOUNT_BROWSER_FIXTURE!=='1'||process.env.VERCEL)throw Error('explicit_local_fixture_only');
const dir=mkdtempSync(join(tmpdir(),'axp-network-browser-')),store=createAccountStore({dir:join(dir,'accounts')});
const finance=process.argv.includes('--finance'),financialRepository=finance?createFixtureFinancialRepository({path:join(dir,'financial.sqlite')}):null;
const service=createAccountNetworkService({stateDir:join(dir,'network'),catalog:store,transport:providerFixture(),
 ...(finance?{financialMode:'devnet',financialRepository,origin,financialOptions:{broadcastEnabled:false,
  preflight:async()=>{throw Object.assign(Error('fixture_native_preflight_unavailable'),{code:'fixture_native_preflight_unavailable',status:503});},
  transportFactory:async()=>{throw Error('fixture_native_payments_disabled');}}}:{})});
const api=finance?createAccountsAPI({store,provider:authFixture(),origin,network:{ready:true,financialBindings:true,financialMode:'devnet',broadcastEnabled:false,
 readiness:async()=>({ready:true,financialMode:'devnet',walletBindings:true,broadcastEnabled:false}),withService:fn=>fn(service)}}):fixtureAPI(store,service),seed=await setup(api);
// Browser reports inspect one real fixture-ledger receipt produced via the SDK.
if(!finance)await accept(seed.sdks[0],await seed.sdks[0].requestAd(input()));
const ui=spawn(process.execPath,[resolve(repositoryRoot,'apps/product-ui/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3504'],{
 cwd:resolve(repositoryRoot,'apps/product-ui'),stdio:'inherit',env:{PATH:process.env.PATH,HOME:process.env.HOME,NEXT_PUBLIC_BASE_PATH:'',NEXT_DIST_DIR:'.next-account-network-fixture',WATCHPACK_POLLING:'1000'}});
const server=createServer(async(req,res)=>{
 if(!finance&&req.url==='/fixture-chat/'){
  res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end(readFileSync(new URL('./account-journey.html',import.meta.url)));
 }
 if(!finance&&['/fixture-sdk/browser.mjs','/fixture-sdk/receipt.mjs','/fixture-sdk/errors.mjs'].includes(req.url)){
  res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});return res.end(readFileSync(resolve(repositoryRoot,'packages/publisher-sdk',req.url.split('/').pop())));
 }
 if(!finance&&req.url.startsWith('/api/fixture-chat/')){
  try{
   if(req.method!=='POST'||req.headers.origin!==origin)throw Error('fixture_origin_invalid');
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('fixture_body_limit');}
   const body=JSON.parse(raw),path=req.url.slice('/api/fixture-chat'.length);
   let result;if(path==='/opportunities')result=await seed.sdks[0].requestAd(body);
   else{const award=path.match(/^\/awards\/([-\w]+)\/render$/);if(!award)throw Error('fixture_route_invalid');
    result=await seed.sdks[0].acknowledgeRender({awardId:award[1],...body});}
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify(result));
  }catch{res.writeHead(400,{'content-type':'application/json'});return res.end('{"error":"fixture_request_invalid"}');}
 }
 if(req.url.startsWith('/api/accounts/'))return api.handler(req,res);
 if(req.url.startsWith('/api/')){res.writeHead(404);return res.end();}
 const proxy=request({hostname:'127.0.0.1',port:3504,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
 proxy.on('error',()=>{res.writeHead(503);res.end('Fixture UI starting');});req.pipe(proxy);
});
server.listen(3503,'127.0.0.1',()=>console.log(`FIXTURE ONLY — no cloud, emails, wallets or providers: ${origin}/account/`));
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;ui.kill('SIGTERM');server.close();server.closeAllConnections();service.close();store.close();financialRepository?.close();rmSync(dir,{recursive:true,force:true});setTimeout(()=>process.exit(0),250).unref();};
process.once('SIGINT',stop);process.once('SIGTERM',stop);ui.once('exit',stop);
