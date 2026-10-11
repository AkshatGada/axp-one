// One local demo origin. Native signing is an explicit server capability, never a browser flag.
import {createServer,request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {localConfiguration,repositoryRoot} from '../../packages/config/local.mjs';
import {createProductService} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';

const config=localConfiguration(),port=Number(config.AXP_PRODUCT_PORT??3430),uiPort=Number(config.AXP_PRODUCT_UI_PORT??3432);
const noUI=process.argv.includes('--api-only');
const next=resolve(repositoryRoot,'apps/product-ui/node_modules/next/dist/bin/next');
if(!noUI&&!existsSync(next))throw Error('Install workspace dependencies first.');
const service=createProductService({stateDir:resolve(repositoryRoot,config.AXP_PRODUCT_STATE_DIR??'local-state/product'),
  publisherKey:config.AXP_PUBLISHER_API_KEY,apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,
  organicApiKey:config.DEEPSEEK_API_KEY,retriever:loadEvidence(),dailyModelCap:Number(config.AXP_PRODUCT_JEV_DAILY_CAP??50),demoMode:config.AXP_PRODUCT_DEMO_MODE==='1',financialMode:config.AXP_PRODUCT_FINANCIAL_MODE??'synthetic',signingEnabled:config.AXP_PRODUCT_DEVNET_SIGN==='1',walletPath:resolve(repositoryRoot,config.AXP_PRODUCT_DEVNET_WALLET_PATH??'local-state/product/secrets/devnet-wallet.json'),runId:config.AXP_PRODUCT_FINANCIAL_MODE==='devnet'?'product-devnet-v1':'product-workspace-v1'});
const api=createProductAPI({service});
const ui=noUI?null:spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port',String(uiPort)],{
  cwd:resolve(repositoryRoot,'apps/product-ui'),stdio:'inherit',env:{...process.env,NEXT_PUBLIC_BASE_PATH:'',NEXT_DIST_DIR:'.next-product-dev',WATCHPACK_POLLING:'1000'}});
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/product'||path.startsWith('/api/product/'))return api.handler(req,res);
  if(noUI){res.writeHead(404);return res.end('API-only server');}
  const proxy=httpRequest({hostname:'127.0.0.1',port:uiPort,path:req.url,method:req.method,headers:req.headers},upstream=>{
    res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);
  });
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'text/plain'});res.end('The UI is starting. Refresh in a moment.');});
  req.pipe(proxy);
});
server.on('upgrade',(req,socket,head)=>{
  socket.on('error',()=>socket.destroy());
  const proxy=httpRequest({hostname:'127.0.0.1',port:uiPort,path:req.url,headers:req.headers});
  proxy.on('upgrade',(res,upstream,upstreamHead)=>{upstream.on('error',()=>{socket.destroy();upstream.destroy();});socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(res.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);if(head.length)upstream.write(head);if(upstreamHead.length)socket.write(upstreamHead);socket.pipe(upstream).pipe(socket);});
  proxy.on('error',()=>socket.destroy());proxy.end();
});
server.listen(port,'127.0.0.1',()=>console.log(`AXP product demo: http://127.0.0.1:${port}/advertiser-dashboard/\nPublisher: http://127.0.0.1:${port}/publisher-demo/\nFinancial mode: ${service.financialMode==='devnet'?'Solana Devnet test USDC':'synthetic test credits'}. Jev: ${service.engine().ready?'configured':'unavailable'}.`));
let stopping=false;
function stop(){if(stopping)return;stopping=true;ui?.kill('SIGTERM');server.close();server.closeAllConnections();service.close();setTimeout(()=>process.exit(0),250).unref();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
ui?.once('exit',code=>{if(!stopping){console.error(`UI exited (${code}).`);stop();}});
