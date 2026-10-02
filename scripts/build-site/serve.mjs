// Serve .vercel/output locally the way Vercel routes it (subset of Build Output API v3:
// header routes, redirects, function dest, filesystem, check:true, error 404). The /api
// function runs from its own .func directory, so this tests the packaged function itself.
//   node scripts/build-site/serve.mjs [port]      (default 3200; env is passed to the function)
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),out=join(root,'.vercel/output'),staticDir=join(out,'static');
const config=JSON.parse(readFileSync(join(out,'config.json'),'utf8')),port=Number(process.argv[2]??3200);
const fnDir=join(out,'functions/api/index.func'),vc=JSON.parse(readFileSync(join(fnDir,'.vc-config.json'),'utf8'));
const {default:fn}=await import(pathToFileURL(join(fnDir,vc.handler)));
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain','.ico':'image/x-icon','.mp4':'video/mp4','.vtt':'text/vtt','.xml':'application/xml','.srt':'text/plain'};
const fileFor=p=>{const f=resolve(staticDir,'.'+decodeURIComponent(p));return (f===staticDir||f.startsWith(staticDir+sep))&&existsSync(f)&&statSync(f).isFile()?f:null;};
const sub=(dest,m)=>dest.replace(/\$(\d+)/g,(_,i)=>m[Number(i)]??'');

// Local testing only (AXP_SERVE_HARNESS=1): the development delivery harness at /__live/.
const harness=process.env.AXP_SERVE_HARNESS==='1'?{'/__live/':['scripts/hosted/harness/index.html','text/html; charset=utf-8'],'/__live/harness.mjs':['scripts/hosted/harness/harness.mjs','text/javascript'],'/__live/client.mjs':['packages/hosted/client.mjs','text/javascript']}:{};
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');let path=url.pathname,headers={};
  if(harness[path]){res.writeHead(200,{'Content-Type':harness[path][1]});return res.end(readFileSync(join(root,harness[path][0])));}
  const send=(status,file)=>{res.writeHead(status,{...headers,'Content-Type':TYPES[extname(file)]??'application/octet-stream'});res.end(readFileSync(file));};
  // Phases in Vercel's order regardless of their position in the array: main, filesystem, error.
  const sections={main:[]};let cur='main';for(const r of config.routes){if(r.handle){cur=r.handle;sections[cur]??=[];continue;}sections[cur].push(r);}
  const run=async list=>{for(const r of list) {
    const m=path.match(new RegExp(r.src));if(!m)continue;
    if(r.headers&&!r.status)headers={...headers,...r.headers};
    if(r.status&&r.headers?.Location){res.writeHead(r.status,{...headers,Location:r.headers.Location});res.end();return true;}
    if(r.dest==='/api/index'){for(const [k,v] of Object.entries(headers))res.setHeader(k,v);await fn(req,res);return true;}
    if(r.dest){const d=sub(r.dest,m);if(r.check){const f=fileFor(d);if(f){send(200,f);return true;}continue;}path=d;}
    if(!r.continue&&r.dest)break;
  }return false;};
  if(await run(sections.main))return;
  {const f=fileFor(path);if(f)return send(200,f);}
  if(await run(sections.filesystem??[]))return;
  for(const r of sections.error??[]){const m=url.pathname.match(new RegExp(r.src));if(m){const f=fileFor(sub(r.dest,m));if(f)return send(404,f);}}
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');
}).listen(port,'127.0.0.1',()=>console.error(`.vercel/output served at http://127.0.0.1:${port}`));
