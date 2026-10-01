import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {loadV3Bundle} from '../../packages/v3/bundle.mjs';
import {sanitized} from '../../packages/v2/bundle.mjs';
import {SCENARIOS,POLICY} from '../../packages/v3/config.mjs';
const root=resolve(import.meta.dirname,'../..');
const assets={'/':['apps/v3-ui/index.html','text/html'],'/app.mjs':['apps/v3-ui/app.mjs','text/javascript'],'/style.css':['apps/v3-ui/style.css','text/css'],'/client.mjs':['packages/v3/client.mjs','text/javascript'],'/design-system/tokens.css':['design-system/tokens.css','text/css'],'/design-system/fonts.css':['design-system/fonts.css','text/css']};
for(const font of ['Neutral','Median','Bulky','SlimWide','NeutralWide','MedianWide','NeutralMono','MedianMono'])assets[`/design-system/fonts/PolySans-${font}.woff2`]=[`design-system/fonts/PolySans-${font}.woff2`,'font/woff2'];
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});const publicValue=sanitized(value);if(value?.schemaVersion==='axp.v3-bootstrap.v1')publicValue.csrf=value.csrf;res.end(JSON.stringify(publicValue));};
export function createV3Server({stateDir=join(root,'local-state/v3'),runId='v3-wallet-acceptance',retriever,apiKey,liveEnabled=false,transport,replayDirectory=null,payee,now,financialMode='sandbox',organicEngine}={}){
 const bundle=replayDirectory?loadV3Bundle(replayDirectory):null,GM=bundle?bundle.manifest.financialMode:financialMode;
 retriever=bundle?null:retriever??loadEvidence({directory:join(root,'artifacts/v2/evidence')});
 payee=bundle?null:payee??JSON.parse(readFileSync(join(root,'artifacts/phase4/feasibility-sandbox.json'))).network.payee;
 const service=bundle?null:createV3Service({stateDir,runId,retriever,apiKey,liveEnabled,transport,payee,now,financialMode:GM,organicEngine}),csrf=randomBytes(24).toString('hex');
 const server=createServer(async(req,res)=>{try{
  const host=req.headers.host,hosts=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];if(!hosts.includes(host))throw new ContractError('local_host_required',undefined,403);
  const u=new URL(req.url,`http://${host}`),path=u.pathname;res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  if(bundle&&req.method!=='GET')throw new ContractError('replay_read_only',undefined,405);
  if(req.method==='GET'){
   if(assets[path]){const [p,t]=assets[path];res.writeHead(200,{'Content-Type':t});return res.end(readFileSync(join(root,p)));}
   if(path==='/health')return json(res,200,{status:'ok',financialMode:GM,replay:!!bundle,modelEnabled:!!service&&liveEnabled});
   if(path==='/v3/bootstrap'||path==='/v3/replay/bootstrap')return json(res,200,{schemaVersion:'axp.v3-bootstrap.v1',csrf:bundle?null:csrf,replay:!!bundle,readOnly:!!bundle,runId:bundle?bundle.run.runId:runId,financialMode:GM,scenarios:SCENARIOS,policy:bundle?bundle.run.state.freeze.policy:POLICY,manifest:bundle?.run.manifest??retriever.manifest});
   if(path==='/v3/state'||path==='/v3/replay/run')return json(res,200,bundle?{...bundle.run.state,presentation:'recorded_evidence_replay',replay:true,modelEnabled:false,running:false,bundleHash:bundle.bundleHash}:service.state());
   if(path==='/v3/events'||path==='/v3/replay/events')return json(res,200,bundle?bundle.run.events:service.exchange.report().events);
   if(path==='/v3/evidence')return json(res,200,bundle?bundle.run.evidence:retriever.publicCatalogue());
   if(path==='/v3/retrieval'){const question=u.searchParams.get('question'),campaignId=u.searchParams.get('campaignId');return json(res,200,bundle?bundle.run.retrieval.find(r=>r.question===question&&r.campaignId===campaignId)?.result??null:service.evidence(question,campaignId));}
  }
  if(req.method!=='POST')throw new ContractError('not_found',undefined,404);
  if(req.headers['x-axp-csrf']!==csrf)throw new ContractError('operator_token_required',undefined,403);
  if(req.headers.origin&&!hosts.some(h=>req.headers.origin===`http://${h}`))throw new ContractError('origin_rejected',undefined,403);
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw new ContractError('body_too_large',undefined,413);}let b;try{b=JSON.parse(raw||'{}');}catch{throw new ContractError('invalid_json');}
  if(path==='/v3/campaign')return json(res,200,service.saveCampaign(b));
  if(path==='/v3/preview')return json(res,200,service.preview(b));
  if(path==='/v3/turn/request')return json(res,200,service.requestTurn(b));
  if(path==='/v3/turn/run')return json(res,200,await service.runTurn(b));
  const match=path.match(/^\/v3\/awards\/([-\w]+)\/(render|fail)$/);if(match){const {financialMode=GM,...body}=b;if(![GM,'synthetic'].includes(financialMode))throw new ContractError('financial_mode_invalid');if(match[2]==='fail'){strictObject(body,[]);return json(res,200,service.fail(match[1],financialMode));}strictObject(body,['domInserted','sponsoredLabelPresent','creativeHash'],['domInserted','sponsoredLabelPresent','creativeHash']);return json(res,200,service.acknowledge(match[1],body,financialMode));}
  throw new ContractError('not_found',undefined,404);
 }catch(e){json(res,e.status??400,{error:e.code??'internal_error'});}});
 server.service=service;server.bundle=bundle;server.on('close',()=>service?.close());return server;
}
