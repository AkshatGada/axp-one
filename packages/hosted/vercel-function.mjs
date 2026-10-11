// Vercel Node function for /api/* (packaged by scripts/build-site.mjs as index.mjs; kept out of a
// top-level api/ directory so Vercel's zero-config tracing never builds a second function). Never fails at import:
// a configuration problem turns live runs off and the API still answers.
import {createHostedAPI} from './api.mjs';
import {createHostedProductAPI} from '../product/hosted.mjs';

let productAPI = null;
async function productInstance() {
  // Share initialization on warm invocations; durable mutations remain serialized
  // by the adapter's workspace lease, including across different function instances.
  productAPI ??= createHostedProductAPI().catch(error => {
    productAPI = null;
    throw error;
  });
  return productAPI;
}

let api=null,initError=null;
function instance() {
  if(!api&&!initError){try{api=createHostedAPI();}catch(e){initError=e.code??'init_failed';console.error(JSON.stringify({event:'api_init_failed',code:initError,message:String(e.message).slice(0,200)}));}}
  return api;
}
export default async function handler(req,res) {
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/product'||path.startsWith('/api/product/')) {
    try { return await (await productInstance()).handler(req,res); }
    catch(error) {
      console.error(JSON.stringify({event:'product_api_failed',code:error.code??'product_unavailable'}));
      if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      if(!res.writableEnded)res.end(JSON.stringify({error:'product_unavailable'}));
      return;
    }
  }
  const a=instance();
  if(a)return a.handler(req,res);
  const live=/^\/api\/live(\/config)?\/?$/.test(path),runs=/^\/api\/runs\/?$/.test(path)&&req.method==='GET';
  res.writeHead(live||runs?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(live?{schemaVersion:'axp.hosted-live-config.v1',network:'solana-devnet',enabled:false,configured:{error:initError}}:runs?{runs:[]}:{error:'live_runs_unconfigured'}));
}
