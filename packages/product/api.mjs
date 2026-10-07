import {randomBytes} from 'node:crypto';
import {ContractError} from '../contracts/index.mjs';
import {CAPABILITIES,PRESETS,LIMITS,secretMatches} from './service.mjs';

export function createProductAPI({service}) {
  const csrf=randomBytes(32).toString('hex');
  const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  async function read(req) {
    if(!req.headers['content-type']?.startsWith('application/json'))throw new ContractError('json_required',undefined,415);
    let bytes=0;const chunks=[];
    for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw new ContractError('body_too_large',undefined,413);chunks.push(chunk);}
    try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ContractError('invalid_json');}
  }
  const browser=(req)=>{
    if(!secretMatches(req.headers['x-axp-csrf'],csrf))throw new ContractError('csrf_invalid',undefined,403);
    const origin=req.headers.origin;
    if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)throw new ContractError('origin_invalid',undefined,403);
    if(req.headers['sec-fetch-site']==='cross-site')throw new ContractError('origin_invalid',undefined,403);
  };
  const publisher=req=>{if(!service.authenticate(req.headers['x-axp-publisher-key']))throw new ContractError('publisher_key_invalid',undefined,401);};
  async function handler(req,res) {
    try {
      const path=new URL(req.url,'http://local').pathname.replace(/^\/api\/product/,'').replace(/\/$/,'')||'/';
      let value;
      if(req.method==='GET') {
        if(path==='/bootstrap')value={csrf,mode:service.financialMode,financialMode:service.financialMode,payments:service.payments(),engine:service.engine(),demo:service.demo(),capabilities:CAPABILITIES,presets:PRESETS,limits:service.limits};
        else if(path==='/state')value=service.state();
        else if(path==='/publisher/config')value=service.publisherConfig();
        else throw new ContractError('not_found',undefined,404);
      } else if(req.method==='POST') {
        const sdk=path==='/opportunities'||/^\/awards\//.test(path);
        if(sdk)publisher(req);else browser(req);
        const body=await read(req);
        if(path==='/account')value=service.saveAccount(body);
        else if(path==='/campaigns')value=service.saveCampaign(body);
        else if(path==='/opportunities'||path==='/demo/chat')value=await service.opportunity(body);
        else if(path==='/demo/answer')value=await service.answer(body);
        else {
          const campaign=path.match(/^\/campaigns\/([-\w]+)\/(approve|launch|pause|resume|duplicate|settle|preview|authorize|reconcile)$/);
          const award=path.match(/^\/(?:demo\/)?awards\/([-\w]+)\/(render|fail)$/);
          if(campaign){
            const [,id,action]=campaign;
            if(action==='preview')value=service.preview(id,body);
            else {if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new ContractError('empty_body_required');
              value=action==='approve'?service.approve(id):action==='launch'?await service.launch(id):await service.campaignAction(id,action);}
          } else if(award){const [,id,action]=award;value=action==='render'?await service.render(id,body,req.headers['x-axp-delivery-token']):service.failAward(id,body,req.headers['x-axp-delivery-token']);}
          else throw new ContractError('not_found',undefined,404);
        }
      } else throw new ContractError('method_not_allowed',undefined,405);
      send(res,200,value);
    } catch(e) {
      // Only stable internal error codes are public; no provider bodies or keys.
      const code=typeof e.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'internal_error';
      send(res,e.status??(code==='internal_error'?500:400),{error:code});
    }
  }
  return {handler};
}
