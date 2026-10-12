// Isolated account server; shared synthetic serving is separately opt-in.
// No demo fallback, organic-answer provider or native wallet/payment adapter.
import {createServer,request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {localConfiguration,repositoryRoot} from '../../packages/config/local.mjs';
import {createHostedAccountsAPI} from '../../packages/accounts/hosted.mjs';

const config=localConfiguration(),port=Number(config.AXP_ACCOUNTS_PORT??3495),uiPort=Number(config.AXP_ACCOUNTS_UI_PORT??3496);
if(!Number.isInteger(port)||port<1024||port>65535||!Number.isInteger(uiPort)||uiPort<1024||uiPort>65535||port===uiPort)throw Error('accounts_port_invalid');
const noUI=process.argv.includes('--api-only'),next=resolve(repositoryRoot,'apps/product-ui/node_modules/next/dist/bin/next');
if(!noUI&&!existsSync(next))throw Error('Install workspace dependencies first.');
const api=createHostedAccountsAPI({config:{...config,AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNTS_ORIGIN:config.AXP_ACCOUNTS_ORIGIN??`http://127.0.0.1:${port}`,AXP_HOSTED_DATA_DIR:config.AXP_ACCOUNTS_DATA_DIR??'local-state/accounts'}});
const ui=noUI?null:spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port',String(uiPort)],{
  cwd:resolve(repositoryRoot,'apps/product-ui'),stdio:'inherit',env:{...process.env,NEXT_PUBLIC_BASE_PATH:'',NEXT_DIST_DIR:'.next-product-dev',WATCHPACK_POLLING:'1000'}});
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/accounts'||path.startsWith('/api/accounts/'))return api.handler(req,res);
  // Never fall through to the shared demo backend from an owned-profile console.
  if(path.startsWith('/api/')){res.writeHead(404,{'content-type':'application/json'});return res.end(JSON.stringify({error:'not_found'}));}
  if(noUI){res.writeHead(404);return res.end('Accounts API only');}
  // Confirmation credentials belong only to the browser's explicit callback.
  // The static account shell does not need them; do not leak them into Next logs.
  const uiPath=path==='/account/'||path==='/account'?'/account/':req.url;
  const proxy=httpRequest({hostname:'127.0.0.1',port:uiPort,path:uiPath,method:req.method,headers:req.headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'text/plain'});res.end('Account UI is starting. Refresh shortly.');});req.pipe(proxy);
});
server.listen(port,'127.0.0.1',()=>console.log(`AXP accounts: http://127.0.0.1:${port}/account/\nSupabase: ${api.initError?'configuration required':'configured'}. Shared serving is opt-in and synthetic only when separately configured. Native funding remains disabled.`));
let stopping=false;
function stop(){if(stopping)return;stopping=true;ui?.kill('SIGTERM');server.close();server.closeAllConnections();setTimeout(()=>process.exit(0),250).unref();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
ui?.once('exit',()=>{if(!stopping)stop();});
