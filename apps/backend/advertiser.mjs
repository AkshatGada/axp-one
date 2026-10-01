import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {createAdvertiserSimulation,CAPABILITIES,PRESETS} from '../../packages/advertiser/service.mjs';
import {loadEvidence,searchEvidence} from '../../packages/advertiser/evidence.mjs';

const repo=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const assets={'/':['apps/advertiser-ui/index.html','text/html'],'/app.mjs':['apps/advertiser-ui/app.mjs','text/javascript'],'/style.css':['apps/advertiser-ui/style.css','text/css'],'/publisher.mjs':['packages/publisher/client.mjs','text/javascript'],'/design-system/tokens.css':['design-system/tokens.css','text/css'],'/design-system/fonts.css':['design-system/fonts.css','text/css']};
for(const font of ['Neutral','Median','Bulky','SlimWide','NeutralWide','MedianWide','NeutralMono','MedianMono'])assets[`/design-system/fonts/PolySans-${font}.woff2`]=[`design-system/fonts/PolySans-${font}.woff2`,'font/woff2'];
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function createAdvertiserServer({stateDir=join(repo,'local-state/advertiser-simulation'),runId='advertiser-simulation-v1',catalogue=loadEvidence(join(repo,'artifacts/advertiser/evidence.json')),now}={}){
  const sim=createAdvertiserSimulation({stateDir,runId,catalogue,now}),csrf=randomBytes(24).toString('hex');
  const server=createServer(async(req,res)=>{try{
    const hosts=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];
    if(!hosts.includes(req.headers.host))throw new ContractError('local_host_required',undefined,403);
    const path=new URL(req.url,`http://${req.headers.host}`).pathname;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    if(req.method==='GET'){
      if(assets[path]){const [file,type]=assets[path];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(join(repo,file)));}
      if(path==='/health')return json(res,200,{status:'ok',mode:'synthetic',paymentsEnabled:false,modelCallsEnabled:false});
      if(path==='/v1/advertiser/bootstrap')return json(res,200,{csrf,runId,mode:'synthetic',presentation:'fresh_deterministic_simulation',capabilities:CAPABILITIES,presets:PRESETS,evidence:{sourceMode:catalogue.sourceMode,capturedAt:catalogue.capturedAt,contentHash:catalogue.contentHash,records:catalogue.records.length,inventory:catalogue.inventory,limitations:catalogue.limitations},routesVersion:'advertiser-simulation.v1'});
      if(path==='/v1/advertiser/state')return json(res,200,sim.state());
      if(path==='/v1/advertiser/evidence'){const u=new URL(req.url,`http://${req.headers.host}`);return json(res,200,{...searchEvidence(catalogue,{query:u.searchParams.get('q')??'',limit:12}),limitations:catalogue.limitations});}
    }
    if(req.method!=='POST')throw new ContractError('not_found',undefined,404);
    if(req.headers['x-axp-csrf']!==csrf)throw new ContractError('operator_token_required',undefined,403);
    if(req.headers.origin&&!hosts.some(h=>req.headers.origin===`http://${h}`))throw new ContractError('origin_rejected',undefined,403);
    let raw='';for await(const b of req){raw+=b;if(Buffer.byteLength(raw)>32768)throw new ContractError('body_too_large',undefined,413);}
    let body;try{body=JSON.parse(raw||'{}');}catch{throw new ContractError('invalid_json');}
    if(path==='/v1/advertiser/account')return json(res,200,sim.saveAccount(body));
    if(path==='/v1/advertiser/drafts')return json(res,200,sim.saveDraft(body));
    if(path==='/v1/advertiser/preview')return json(res,200,sim.preview(body));
    if(path==='/v1/advertiser/compare')return json(res,200,sim.compare(body));
    if(path==='/v1/advertiser/turn')return json(res,200,await sim.turn(body));
    if(path==='/v1/advertiser/campaign-status')return json(res,200,sim.campaignStatus(body));
    let m=path.match(/^\/v1\/advertiser\/drafts\/([-a-zA-Z0-9_]+)\/launch$/);if(m){strictObject(body,[]);return json(res,200,sim.launchCampaign(m[1]));}
    m=path.match(/^\/v1\/awards\/([-a-zA-Z0-9_]+)\/(render|fail)$/);if(m){if(m[2]==='fail'){strictObject(body,[]);return json(res,200,sim.failAward(m[1]));}strictObject(body,['domInserted','sponsoredLabelPresent','creativeHash'],['domInserted','sponsoredLabelPresent','creativeHash']);return json(res,200,sim.acknowledge(m[1],body));}
    m=path.match(/^\/v1\/advertiser\/channels\/([-a-zA-Z0-9_]+)\/(authorize|close)$/);if(m){strictObject(body,[]);return json(res,200,m[2]==='authorize'?sim.authorize(m[1]):sim.settle(m[1]));}
    throw new ContractError('not_found',undefined,404);
  }catch(error){if(!res.headersSent)json(res,error.status??500,{error:error.code??'internal_error'});else res.end();}});
  server.simulation=sim;server.on('close',()=>sim.close());return server;
}
