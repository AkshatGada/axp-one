// Local execution of the same per-request encrypted snapshot backend intended
// for Preview. Startup imports only on explicit --import-local; never funds.
import {createServer} from 'node:http';
import {request as proxyRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createFileKV} from '../../packages/hosted/kv.mjs';
import {createHostedArcDemoAPI} from '../../packages/arc/hosted.mjs';

const root=resolve('.'),state=resolve('local-state/arc/hosted-local'),keyPath=join(state,'state-key');
mkdirSync(state,{recursive:true,mode:0o700});
if(existsSync(join(state,'CLOUD_OWNER')))throw Error('This financial workspace has moved to Preview. Use the hosted Arc demo; do not restart a second writer.');
if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32).toString('base64'),{mode:0o600,flag:'wx'});
if((statSync(keyPath).mode&0o777)!==0o600)throw Error('Arc local state key must have mode 0600');
const config={AXP_ARC_PREVIEW_ENABLED:'1',AXP_ARC_PREVIEW_LOCAL:'1',AXP_ARC_PREVIEW_STATE_KEY:readFileSync(keyPath,'utf8').trim()};
const kv=createFileKV({dir:join(state,'kv')});
const initialized=await createHostedArcDemoAPI({config,root,kv});
if(initialized.initError)throw Error(initialized.initError);
if(process.argv.includes('--import-local')) {
  for(const workspace of [initialized.financialWorkspace,initialized.organicWorkspace]) {
    if(!(await workspace.inspect()).initialized)await workspace.importDirectory(resolve('local-state/arc/product'));
  }
  const marker=resolve('local-state/arc/product/HOSTED_OWNER');
  if(!existsSync(marker))writeFileSync(marker,'Active workspace moved to local-state/arc/hosted-local. Do not resume this archived financial writer.\n',{mode:0o600,flag:'wx'});
}
if(!(await initialized.financialWorkspace.inspect()).initialized)throw Error('Stop the original Arc demo, then run npm run arc:hosted-local -- --import-local once.');
const port=Number(process.env.AXP_ARC_HOSTED_PORT??3450),uiPort=port+2;
const ui=spawn(process.execPath,[resolve('apps/product-ui/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(uiPort)],
  {cwd:resolve('apps/product-ui'),stdio:'inherit',env:{PATH:process.env.PATH,HOME:process.env.HOME,NEXT_DIST_DIR:'.next-product-dev',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_BASE_PATH:''}});
const server=createServer(async(req,res)=>{
  if(req.url==='/arc/'||req.url==='/arc'){res.writeHead(302,{location:'/arc/advertiser-dashboard/'});return res.end();}
  if(req.url.startsWith('/api/arc')) {
    try{return await (await createHostedArcDemoAPI({config,root,kv})).handler(req,res);}
    catch(e){res.writeHead(503,{'content-type':'application/json'});return res.end(JSON.stringify({error:/^[a-z_0-9]+$/.test(e.code??'')?e.code:'arc_unavailable'}));}
  }
  if(req.url.startsWith('/api/')){res.writeHead(404,{'content-type':'application/json'});return res.end(JSON.stringify({error:'not_found'}));}
  const proxy=proxyRequest({hostname:'127.0.0.1',port:uiPort,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('AXP Arc UI is starting. Refresh shortly.');});req.pipe(proxy);
});
server.listen(port,'127.0.0.1',()=>console.log(`Interactive Arc demo: http://127.0.0.1:${port}/arc/advertiser-dashboard/\nChat: http://127.0.0.1:${port}/arc/publisher-demo/\nPer-request encrypted durable snapshots. Actual Arc Testnet payments; fixture answer/buyer. No funds move on startup.`));
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;ui.kill();server.close();server.closeAllConnections();setTimeout(()=>process.exit(0),250).unref();};
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,stop);
ui.once('exit',()=>{if(!stopping)stop();});
