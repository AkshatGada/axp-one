import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {createSession} from './session.mjs';
import {createEvidenceService} from './evidence.mjs';
import {createDecisionComparison} from './decisions.mjs';

const repo=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const staticFiles={'/':['apps/reference-ui/index.html','text/html'],'/app.mjs':['apps/reference-ui/app.mjs','text/javascript'],'/style.css':['apps/reference-ui/style.css','text/css'],'/publisher.mjs':['packages/publisher/client.mjs','text/javascript']};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const b of req){s+=b;if(s.length>32768)throw new ContractError('body_too_large',undefined,413);}try{return JSON.parse(s||'{}');}catch{throw new ContractError('invalid_json');}}

export function createDemoServer({stateDir=join(repo,'local-state/demo'),runId='local-demo',sessionOptions={},corpus=null,demoMetadata=null,networkReport=null}={}) {
  let session=createSession({stateDir,runId,...sessionOptions});
  const evidence=createEvidenceService({corpus});
  const decisions=createDecisionComparison({corpus});
  const csrf=randomBytes(24).toString('hex'),streams=new Set();
  const server=createServer(async(req,res)=>{
    try {
      const port=server.address().port;
      const hosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      if(!hosts.includes(req.headers.host))throw new ContractError('local_host_required',undefined,403);
      const url=new URL(req.url,`http://127.0.0.1:${port}`),path=url.pathname;
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
      if(req.method==='GET'){
        if(staticFiles[path]){const [file,type]=staticFiles[path];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(readFileSync(join(repo,file)));return;}
        if(path==='/health')return json(res,200,{status:'ok',mode:session.exchange.mode,realPayments:session.exchange.mode!=='synthetic'});
        if(path==='/v1/bootstrap')return json(res,200,{csrf,runId:session.exchange.runId,mode:session.exchange.mode,demo:demoMetadata,evidenceSource:{enabled:evidence.enabled,database:evidence.enabled?'ads':null,readOnly:true,embeddingGeneration:false},engines:demoMetadata?[{id:`${demoMetadata.phase}-live`,label:`Actual Jev buyers + independent Codex answer — bounded ${demoMetadata.phase}`}]:[{id:'rules',label:'Deterministic reference'},{id:'codex',label:'Codex — runtime availability required'}],limitations:[session.exchange.mode==='synthetic'?'No actual MPP settlement':'Only finalized network receipts are settlement evidence; signing is operator terminal only','Receipt asserts reference-app delivery, not attention']});
        if(path==='/v1/state'){if(session.exchange.mode!=='synthetic')for(const c of session.exchange.all('channels'))session.exchange.syncNetworkChannel(c.channelId);return json(res,200,{...session.exchange.report(),...(networkReport?{payments:networkReport()}: {})});}
        if(path==='/v1/demo/results')return json(res,200,{runId:session.exchange.runId,mode:'recorded_results_not_fresh_execution',results:session.results()});
        if(path==='/v1/decisions/cases')return json(res,200,{manifest:decisions.manifest,cases:decisions.cases.filter(c=>c.rep===0),liveEnabled:false,sourceEnabled:decisions.sourceEnabled});
        if(path==='/v1/decisions/recorded')return json(res,200,JSON.parse(readFileSync(join(repo,'artifacts/phase2/summary.json'),'utf8')));
        if(path==='/v1/events'){
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
          let cursor=Number(req.headers['last-event-id']??0),eventRun=session.exchange.runId;
          if(!Number.isSafeInteger(cursor)||cursor<0)cursor=0;
          const tick=()=>{if(eventRun!==session.exchange.runId){eventRun=session.exchange.runId;cursor=0;res.write('event: reset\ndata: {}\n\n');}for(const event of session.exchange.report().events)if(event.seq>cursor){res.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);cursor=event.seq;}};
          tick();const timer=setInterval(tick,500);streams.add(res);res.on('close',()=>{clearInterval(timer);streams.delete(res);});return;
        }
      }
      if(req.method!=='POST')throw new ContractError('not_found',undefined,404);
      if(req.headers['x-axp-csrf']!==csrf)throw new ContractError('local_operator_token_required',undefined,403);
      if(req.headers.origin&&!hosts.some(h=>req.headers.origin===`http://${h}`))throw new ContractError('origin_rejected',undefined,403);
      const data=await body(req);
      if(path==='/v1/evidence/lookup')return json(res,200,await evidence.lookup(data));
      if(path==='/v1/decisions/compare'){
        // The reference UI never spends provider credits; live comparison is a
        // separately bounded operator CLI run, not an agent-exposed purchase.
        strictObject(data,['caseId'],['caseId']);return json(res,200,await decisions.compare(data));
      }
      if(path==='/v1/demo/turn'){strictObject(data,['prompt','engine','turnId','randomSessionId'],['prompt']);if(demoMetadata&&data.engine!==`${demoMetadata.phase}-live`)throw new ContractError('phase3_engine_required');return json(res,200,await session.turn(data));}
      if(path==='/v1/phase3/recover-organic'){strictObject(data,['turnId','randomSessionId'],['turnId','randomSessionId']);if(!demoMetadata||demoMetadata.organicRuntime!=='app-bridge')throw new ContractError('app_bridge_required');return json(res,200,await session.recoverOrganic(data));}
      if(demoMetadata&&['/v1/demo/reset','/v1/campaigns'].includes(path))throw new ContractError('phase3_frozen_configuration',undefined,409);
      if(path==='/v1/demo/reset'){strictObject(data,[]);if(session.active)throw new ContractError('turn_pending',undefined,409);session.close();session=createSession({stateDir,runId:`demo-${randomUUID()}`,...sessionOptions});return json(res,200,{runId:session.exchange.runId,mode:'synthetic',historyPreserved:true});}
      if(path==='/v1/campaigns')return json(res,201,session.exchange.createCampaign(data));
      let m=path.match(/^\/v1\/campaigns\/([^/]+)\/pause$/);if(m){strictObject(data,[]);return json(res,200,session.exchange.pauseCampaign(decodeURIComponent(m[1])));}
      m=path.match(/^\/v1\/awards\/([^/]+)\/(render|fail)$/);
      if(m){const id=decodeURIComponent(m[1]);if(m[2]==='fail'){strictObject(data,[]);return json(res,200,session.exchange.failAward(id));}strictObject(data,['domInserted','sponsoredLabelPresent','creativeHash'],['domInserted','sponsoredLabelPresent','creativeHash']);return json(res,200,session.acknowledge(id,data));}
      m=path.match(/^\/v1\/synthetic-channels\/([^/]+)\/(authorize|close)$/);
      if(m){strictObject(data,[]);const id=decodeURIComponent(m[1]);return json(res,200,m[2]==='authorize'?session.exchange.authorizeSynthetic(id):session.exchange.closeSynthetic(id));}
      throw new ContractError('not_found',undefined,404);
    }catch(e){if(!res.headersSent)json(res,e.status??500,{error:e.code??'internal_error'});else res.end();}
  });
  server.getSession=()=>session;
  server.on('close',()=>{for(const res of streams)res.end();session.close();});
  return server;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.AXP_PORT??8788);
  let corpus=null;
  if(process.env.AXP_CORPUS_DB){
    if(process.env.AXP_CORPUS_DB!=='ads')throw new ContractError('corpus_database_not_allowed');
    const {createCachedCorpus}=await import('../../packages/ml/data_adapter/cached-corpus.mjs');
    corpus=createCachedCorpus();
  }
  const server=createDemoServer({stateDir:process.env.AXP_STATE_DIR,runId:process.env.AXP_RUN_ID??'local-demo',corpus});
  server.listen(port,'127.0.0.1',()=>process.stdout.write(`AXP local reference console: http://127.0.0.1:${port}\nMode: synthetic. No real token transfers.\n`));
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close();server.closeAllConnections();});
}
