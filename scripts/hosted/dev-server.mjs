// Local server for the hosted site + live-run API (no Vercel CLI needed).
//   /api/*      packages/hosted/api.mjs (same handler as the hosted function)
//   /__live/    development harness page (start, drive, render + acknowledge)
//   /mvp/*      apps/product-ui/out   (or <AXP_SITE_DIR>/mvp)
//   /*          apps/marketing/out    (or <AXP_SITE_DIR>)
// Env: AXP_HOSTED_PORT (default 3100), AXP_SITE_DIR (merged single-site build), plus
// the live-run settings in .env.example. Binds 127.0.0.1 only.
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve,extname,sep} from 'node:path';
import {repositoryRoot as root,localConfiguration} from '../../packages/config/local.mjs';
import {createHostedAPI} from '../../packages/hosted/api.mjs';

const config=localConfiguration(),port=Number(config.AXP_HOSTED_PORT??3100);
const api=createHostedAPI({config});
const site=config.AXP_SITE_DIR?resolve(root,config.AXP_SITE_DIR):null;
const mounts=[
  ['/__live/client.mjs',join(root,'packages/hosted/client.mjs')],
  ['/__live/',join(root,'scripts/hosted/harness')],
  ['/mvp/',site?join(site,'mvp'):join(root,'apps/product-ui/out')],
  ['/',site??join(root,'apps/marketing/out')],
];
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain','.ico':'image/x-icon','.mp4':'video/mp4','.vtt':'text/vtt','.srt':'text/plain','.xml':'application/xml'};
function staticFile(pathname) {
  for(const [prefix,target] of mounts) {
    if(!pathname.startsWith(prefix)&&pathname!==prefix.replace(/\/$/,''))continue;
    if(!target.endsWith(sep)&&existsSync(target)&&statSync(target).isFile())return pathname===prefix?target:null;
    const base=resolve(target),rel=decodeURIComponent(pathname.slice(prefix.length));let p=resolve(base,rel);
    if(p!==base&&!p.startsWith(base+sep))return null;
    for(const c of [p,join(p,'index.html'),`${p}.html`])if(existsSync(c)&&statSync(c).isFile())return c;
    return null;
  }
  return null;
}
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname.startsWith('/api/')||url.pathname==='/api')return api.handler(req,res);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  if(url.pathname==='/__live'){res.writeHead(308,{Location:'/__live/'});return res.end();}
  const file=staticFile(url.pathname);
  if(!file){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('not found (build the apps first: see README)');}
  res.writeHead(200,{'Content-Type':TYPES[extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(readFileSync(file));
});
server.listen(port,'127.0.0.1',()=>console.error(`AXP hosted dev server http://127.0.0.1:${port}  (live runs ${api.live?'ENABLED':'disabled'}; store ${api.runner?'ready':'unconfigured'})\n  harness: http://127.0.0.1:${port}/__live/`));
// AXP_LIVE_ENABLED=1 but not live: say what is missing (names only, never values).
if(api.settings.enabled&&!api.live){
  const missing=[];
  if(!(config.JEV_API_KEY||config.TYPESAFE_API_KEY))missing.push('JEV_API_KEY');
  if(!config.DEEPSEEK_API_KEY)missing.push('DEEPSEEK_API_KEY');
  if(!api.runner)missing.push('Devnet wallets (node scripts/hosted/wallets.mjs init, or AXP_DEVNET_WALLETS_PATH / AXP_DEVNET_WALLETS)');
  console.error(`  AXP_LIVE_ENABLED=1 but live runs are off; missing: ${missing.join(', ')}. Set them in .env.local (README step 3).`);
}
// Local stand-in for the hosted cron: move abandoned runs along (delivery window, closing).
const sweeper=setInterval(()=>api.sweep().then(r=>r.length&&console.error(JSON.stringify({sweep:r}))).catch(()=>{}),30000);sweeper.unref();
for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>{server.close();server.closeAllConnections();process.exit(0);});
