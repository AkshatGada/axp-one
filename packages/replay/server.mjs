import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReplayBundle} from './bundle.mjs';

const repo=resolve(fileURLToPath(new URL('../..',import.meta.url)));
export function createReplayServer({root=repo,bundleDirectory=join(root,'artifacts/phase5/replay')}={}) {
  const bundle=loadReplayBundle(bundleDirectory),run=bundle.run,files={'/':['apps/replay-ui/index.html','text/html'],'/app.mjs':['apps/replay-ui/app.mjs','text/javascript'],'/style.css':['apps/replay-ui/style.css','text/css'],'/tokens.css':['design-system/tokens.css','text/css'],'/fonts.css':['design-system/fonts.css','text/css']};
  const names=['PolySans-Neutral','PolySans-Median','PolySans-Bulky','PolySans-SlimWide','PolySans-NeutralWide','PolySans-MedianWide','PolySans-NeutralMono','PolySans-MedianMono'];
  for(const name of names)files[`/fonts/${name}.woff2`]=[`design-system/fonts/${name}.woff2`,'font/woff2'];
  const counters={requests:0,modelCalls:0,deliveryAcknowledgements:0,paymentSigning:0,paymentBroadcasts:0};
  const server=createServer((req,res)=>{
    counters.requests++;const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const port=server.address().port;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return json(403,{error:'loopback_host_required'});
      res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
      if(req.method!=='GET'){res.setHeader('Allow','GET');return json(405,{error:'recorded_replay_read_only'});}
      const url=new URL(req.url,`http://127.0.0.1:${port}`),path=url.pathname;
      if(files[path]){const [file,type]=files[path];res.writeHead(200,{'Content-Type':type});res.end(readFileSync(join(root,file)));return;}
      if(path==='/health')return json(200,{status:'ok',presentationKind:'recorded_evidence_replay',financialMode:run.financialMode,readOnly:true});
      if(path==='/v1/replay/bootstrap')return json(200,{schemaVersion:'axp.replay.v1',presentationKind:run.presentationKind,financialMode:run.financialMode,runId:run.runId,originalRecordedAt:run.originalRecordedAt,readOnly:true,bundleHash:bundle.bundleHash,steps:run.steps.map(({id,title})=>({id,title}))});
      if(path==='/v1/replay/run')return json(200,run);
      if(path==='/v1/replay/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});let cursor=Number(req.headers['last-event-id']??0);if(!Number.isSafeInteger(cursor)||cursor<0)cursor=0;for(const event of run.events)if(event.seq>cursor)res.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);res.end();return;}
      if(path==='/v1/replay/fixtures'){const list=JSON.parse(readFileSync(join(root,'artifacts/phase5/frontend/fixtures.json'),'utf8'));return json(200,list);}
      if(path==='/v1/replay/diagnostics')return json(200,{...counters,readOnly:true,scope:'This process has no execution adapters; counts describe this server only.'});
      return json(404,{error:'not_found'});
    }catch{return json(500,{error:'replay_unavailable'});}
  });
  server.replayBundle=bundle;return server;
}
