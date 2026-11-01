import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {check} from './config.mjs';
export function operatorSession({password,origin,now=Date.now}){
 check(typeof password==='string'&&password.length>=16,'hsp_operator_password_required');const sessions=new Map();
 const digest=v=>createHash('sha256').update(String(v)).digest();
 const authenticated=req=>{const token=req.headers.cookie?.match(/(?:^|;\s*)axp_hsp_operator=([a-f0-9]{64})(?:;|$)/)?.[1];const expiry=sessions.get(token);return !!expiry&&expiry>now();};
 async function handler(req,res){const path=new URL(req.url,origin).pathname;
  if(path==='/api/hsp/operator/session'&&req.method==='GET'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({authenticated:authenticated(req)}));return true;}
  if(path!=='/api/hsp/operator/login')return false;
  try{check(req.method==='POST'&&req.headers.origin===origin&&req.headers['content-type']==='application/json','origin_invalid',403);let data='';for await(const chunk of req){data+=chunk;check(data.length<1024,'body_too_large',413);}const input=JSON.parse(data);check(timingSafeEqual(digest(input.password),digest(password)),'operator_required',401);const token=randomBytes(32).toString('hex');sessions.set(token,now()+3600000);res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','set-cookie':`axp_hsp_operator=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`});res.end('{"authenticated":true}');}
  catch(e){res.writeHead(e.status??400,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:e.code??'invalid_request'}));}return true;
 }
 return {authenticated,handler};
}
