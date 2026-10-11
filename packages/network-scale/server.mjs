import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {secretMatches} from '../product/service.mjs';
export function createBenchmarkServer({coordinator,port=3440,turns=16,concurrencySteps=[1],host='127.0.0.1'}){
  if(host!=='127.0.0.1'||!Number.isInteger(turns)||turns<1||turns>1024||!concurrencySteps.length||concurrencySteps.some(c=>![1,4,8,16].includes(c)))throw Error('benchmark_server_bounds');
  const token=randomBytes(32).toString('hex');let allocations=0,pending=0,stopping=false;
  const json=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  const server=createServer(async(req,res)=>{try{
    const path=new URL(req.url,'http://local').pathname;
    if(req.method==='GET'&&path==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'"});return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AXP private network benchmark</title><style>body{font:16px system-ui;margin:32px;background:#eef2ff;color:#13275a}button{padding:12px 20px}#grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}article{padding:16px;background:white;border:1px solid #b1b9d4;overflow-wrap:anywhere}aside{border-top:1px solid #dde2ed;margin-top:12px;padding-top:12px}[data-sponsored-label]{font-size:12px;font-weight:bold}pre{white-space:pre-wrap}</style><body><h1>Private measured network run</h1><p>Real independent answers, Jev decisions and SDK DOM acknowledgements. Test USDC on Solana Devnet.</p><button id="start">Run ${turns} new turns</button><pre id="status">Ready. Provider calls begin only after Start.</pre><div id="grid"></div><script type="module" src="/client.mjs"></script></body></html>`);}
    if(req.method==='GET'&&path==='/client.mjs'){res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});return res.end(readFileSync(fileURLToPath(new URL('./client.mjs',import.meta.url)),'utf8'));}
    if(req.method==='GET'&&path==='/sdk-browser.mjs'){res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});return res.end(readFileSync(fileURLToPath(new URL('../publisher-sdk/browser.mjs',import.meta.url)),'utf8'));}
    if(req.method==='GET'&&path==='/config')return json(res,200,{token,turns,concurrencySteps,runId:coordinator.journal.get('meta','run').runId});
    if(req.method==='GET'&&path==='/report')return json(res,200,coordinator.export());
    if(req.method!=='POST')return json(res,404,{error:'not_found'});
    if(!secretMatches(req.headers['x-axp-operator'],token)||req.headers.origin!==`http://${req.headers.host}`||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'operator_origin_invalid'});
    if(stopping)return json(res,409,{error:'benchmark_server_stopping'});
    if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'json_required'});
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw Error('body_too_large');chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    pending++;try{
      if(path==='/next'){if(allocations>=turns)return json(res,200,{done:true});const next=coordinator.allocate();if(!next)return json(res,200,{done:true});allocations++;return json(res,200,{turn:next});}
      const match=path.match(/^\/turns\/([\w-]+)\/(run|render)$/);if(!match)return json(res,404,{error:'not_found'});
      const [,id,action]=match;if(action==='run'){if(Object.keys(body).length)return json(res,400,{error:'empty_body_required'});return json(res,200,await coordinator.turn(id));}
      return json(res,200,await coordinator.render(id,body));
    }finally{pending--;}
  }catch(error){const reason=/^[a-z_0-9]+$/.test(error.code??'')?error.code:'benchmark_request_failed';coordinator.journal.event('operator_request_error',{reason});json(res,error.status??500,{error:reason});}});
  return {server,listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve({origin:`http://${host}:${port}`,turns,concurrencySteps}))),
    close:()=>new Promise(resolve=>{stopping=true;server.close(resolve);}),status:()=>({allocations,pending,stopping})};
}
