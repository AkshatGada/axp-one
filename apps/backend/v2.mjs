import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {createV2Service} from '../../packages/v2/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {loadV2Bundle} from '../../packages/v2/bundle.mjs';
import {QUESTIONS,NAMES,POLICY} from '../../packages/v2/config.mjs';
const root=resolve(import.meta.dirname,'../..');
const assets={'/':['apps/v2-ui/index.html','text/html'],'/app.mjs':['apps/v2-ui/app.mjs','text/javascript'],'/style.css':['apps/v2-ui/style.css','text/css'],'/publisher.mjs':['packages/publisher/client.mjs','text/javascript'],'/design-system/tokens.css':['design-system/tokens.css','text/css'],'/design-system/fonts.css':['design-system/fonts.css','text/css']};
for(const font of ['Neutral','Median','Bulky','SlimWide','NeutralWide','MedianWide','NeutralMono','MedianMono'])assets[`/design-system/fonts/PolySans-${font}.woff2`]=[`design-system/fonts/PolySans-${font}.woff2`,'font/woff2'];
const json=(r,s,v)=>{r.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store'});r.end(JSON.stringify(v));};
export function createV2Server({stateDir=join(root,'local-state/v2-wallet'),runId='v2-wallet-acceptance',retriever,apiKey,liveEnabled=false,transport,replayDirectory=null,now}={}){
 const bundle=replayDirectory?loadV2Bundle(replayDirectory):null;
 retriever=bundle?null:retriever??loadEvidence({directory:join(root,'artifacts/v2/evidence')});
 const sim=bundle?null:createV2Service({stateDir,runId,retriever,apiKey,liveEnabled,transport,now}),csrf=randomBytes(24).toString('hex');
 const server=createServer(async(req,res)=>{try{
  const host=req.headers.host,hosts=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];
  if(!hosts.includes(host))throw new ContractError('local_host_required',undefined,403);
  const url=new URL(req.url,`http://${host}`),path=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  if(req.method==='GET'){
   if(assets[path]){const [p,t]=assets[path];res.writeHead(200,{'Content-Type':t});return res.end(readFileSync(join(root,p)));}
   if(path==='/health')return json(res,200,{status:'ok',financialMode:'synthetic',presentation:bundle?'recorded-replay':'interactive-reference',modelEnabled:!!sim&&liveEnabled});
   if(path==='/v2/bootstrap')return json(res,200,{csrf:bundle?null:csrf,questions:QUESTIONS,names:NAMES,policy:POLICY,replay:!!bundle,manifest:bundle?.run.manifest??retriever.manifest});
   if(path==='/v2/state')return json(res,200,bundle?{...bundle.run.state,presentation:'recorded-replay',modelEnabled:false,running:false,bundleHash:bundle.bundleHash}:sim.state());
   if(path==='/v2/evidence')return json(res,200,bundle?bundle.run.evidence:retriever.publicCatalogue());
   if(path==='/v2/retrieval'){const q=Number(url.searchParams.get('question')??0),campaign=url.searchParams.get('campaign')??'v2-clearvault';if(bundle)return json(res,200,bundle.run.retrieval.find(x=>x.questionIndex===q&&x.campaignId===campaign)?.result??null);return json(res,200,await sim.evidence(q,campaign));}
   if(path==='/v2/v1-payment')return json(res,200,bundle?.run.v1Payment??JSON.parse(readFileSync(join(root,'artifacts/phase5/replay/chain-check.json'))));
  }
  if(req.method!=='POST')throw new ContractError('not_found',undefined,404);
  if(bundle)throw new ContractError('replay_read_only',undefined,405);
  if(req.headers['x-axp-csrf']!==csrf)throw new ContractError('operator_token_required',undefined,403);
  if(req.headers.origin&&!hosts.some(h=>req.headers.origin===`http://${h}`))throw new ContractError('origin_rejected',undefined,403);
  let raw='';for await(const b of req){raw+=b;if(Buffer.byteLength(raw)>16384)throw new ContractError('body_too_large',undefined,413);}
  let body;try{body=JSON.parse(raw||'{}');}catch{throw new ContractError('invalid_json');}
  if(path==='/v2/campaign')return json(res,200,sim.saveCampaign(body));
  if(path==='/v2/preview'){strictObject(body,[]);return json(res,200,await sim.preview());}
  if(path==='/v2/run'){strictObject(body,[]);return json(res,200,await sim.run());}
  if(path==='/v2/close'){strictObject(body,[]);return json(res,200,sim.settle());}
  const match=path.match(/^\/v1\/awards\/([-\w]+)\/(render|fail)$/);
  if(match){if(match[2]==='fail'){strictObject(body,[]);return json(res,200,sim.fail(match[1]));}strictObject(body,['domInserted','sponsoredLabelPresent','creativeHash'],['domInserted','sponsoredLabelPresent','creativeHash']);return json(res,200,sim.acknowledge(match[1],body));}
  throw new ContractError('not_found',undefined,404);
 }catch(e){json(res,e.status??400,{error:e.code??'internal_error'});}});
 server.simulation=sim;server.bundle=bundle;server.on('close',()=>sim?.close());return server;
}
