// Explicit operator-only bounded verification. Never imported by deployed routes.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {createProductService} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {createProductOrganic} from '../../packages/product/organic.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {inheritProviderExecution} from '../../packages/product/provider-provenance.mjs';
import {createProductDevnetRPC,inspectProductDevnet,walletIdentities} from '../../packages/product/native.mjs';
import {createTempoNativeTransport} from '../../packages/payments/tempo-transport.mjs';
import {createNativeTransport} from '../../packages/payments/sdk-transport.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(x=>{const i=x.indexOf('=');if(!x.startsWith('--')||i<3)throw Error('Use --name=value');return [x.slice(2,i),x.slice(i+1)];}));
if(args.authorized!=='tempo-phase4')throw Error('Explicit --authorized=tempo-phase4 is required. Read docs/product/TEMPO.md and verify remaining approved bounds.');
for(const k of ['config','wallet','tempo-wallet','state','static'])if(!args[k])throw Error(`Required: --${k}=path`);
const config=parseEnv(readFileSync(resolve(args.config),'utf8')),state=resolve(args.state),wallet=resolve(args.wallet),tempoWallet=resolve(args['tempo-wallet']),staticRoot=resolve(args.static);
if(state===resolve(config.AXP_PRODUCT_STATE_DIR??'local-state/product'))throw Error('Verification must use isolated state');
mkdirSync(state,{recursive:true,mode:0o700});
const budgetPath=join(state,'verification-budget.json'),hashFile=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const originalWalletHashes={solana:hashFile(wallet),tempo:hashFile(tempoWallet)};
const budget=existsSync(budgetPath)?JSON.parse(readFileSync(budgetPath,'utf8')):{schemaVersion:'axp.tempo-verification-budget.v1',maxUSD:1,maxJev:40,maxAnswers:12,reservedMicroUSD:0,attempts:[],walletHashes:originalWalletHashes};
if(JSON.stringify(budget.walletHashes)!==JSON.stringify(originalWalletHashes))throw Error('Verification wallet identities changed');
for(const row of budget.attempts)if(row.status==='admitted'){row.status='unknown';row.reason='process_interrupted';}
const save=()=>writeFileSync(budgetPath,JSON.stringify(budget,null,2),{mode:0o600});save();
function bounded(provider,kind,reservation){return inheritProviderExecution(async(...input)=>{
 if(budget.attempts.some(a=>a.status==='unknown'))throw Object.assign(Error('Unresolved provider attempt'),{code:'verification_provider_uncertain'});
 if(budget.attempts.filter(a=>a.kind===kind).length>=(kind==='jev'?budget.maxJev:budget.maxAnswers)||budget.reservedMicroUSD+reservation>1000000)throw Object.assign(Error('Verification budget exhausted'),{code:'verification_budget_exhausted'});
 const row={kind,status:'admitted',reservedMicroUSD:reservation,at:new Date().toISOString()};budget.attempts.push(row);budget.reservedMicroUSD+=reservation;save();
 try{const result=await provider(...input);row.status='completed';row.usage=result.usage??null;save();return result;}catch(e){row.status='unknown';row.reason=e.code??'provider_failed';save();throw e;}
},provider);}
const rpcURL=config.AXP_NETWORK_DEVNET_RPC_URL??config.AXP_PRODUCT_DEVNET_RPC_URL;
const rpc=createProductDevnetRPC(rpcURL);
const service=createProductService({stateDir:state,runId:'product-devnet-v1',financialMode:'devnet',signingEnabled:true,walletPath:wallet,tempoEnabled:true,tempoSigningEnabled:true,tempoWalletPath:tempoWallet,dailyModelCap:40,organicApiKey:config.DEEPSEEK_API_KEY,
 transport:bounded(createJevHttpTransport({apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,maxCalls:28}),'jev',15000),
 organicTransport:bounded(createProductOrganic({apiKey:config.DEEPSEEK_API_KEY}),'answer',30000),retriever:loadEvidence(),
 paymentOptions:{preflight:input=>inspectProductDevnet({...input,rpc}),transportFactory:input=>createNativeTransport({...input,rpcURL})},
 tempoOptions:{transportFactory:createTempoNativeTransport,limits:{maxChannels:2,maxDepositBaseUnits:'50000',aggregateDepositBaseUnits:'100000',aggregateFeeAttoUSD:'1000000000000000000'}},
});
const api=createProductAPI({service});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/product')){
  // Fund only the predeclared two Tempo and one Solana verification channels.
  if(req.method==='POST'&&path==='/api/product/campaigns'){
   const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
    try{const b=JSON.parse(Buffer.concat(chunks));if(!b.id){const rows=service.state().campaigns,rail=b.settlementNetwork??'solana-devnet';if(rows.filter(c=>c.settlementNetwork===rail).length>=(rail==='tempo-testnet'?2:1)||BigInt(b.depositBaseUnits??'0')>BigInt(rail==='tempo-testnet'?'50000':'20000'))throw Error();}
     // Restore the consumed body as the normal API readable request.
     import('node:stream').then(({Readable})=>api.handler(Object.assign(Readable.from(chunks),{url:req.url,method:req.method,headers:req.headers}),res));
    }catch{res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({error:'verification_channel_bound'}));}
   });return;
  }
  return api.handler(req,res);
 }
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 let file=resolve(staticRoot,`.${decodeURIComponent(path)}`);if(!file.startsWith(staticRoot+sep)&&file!==staticRoot){res.writeHead(404);return res.end();}
 if(existsSync(file)&&statSync(file).isDirectory())file=join(file,'index.html');
 if(!existsSync(file)){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(readFileSync(file));
});
server.listen(Number(args.port??3460),'127.0.0.1',()=>console.log(`Bounded verification: http://127.0.0.1:${args.port??3460}/publisher-demo/`));
let stopping=false;function stop(){if(stopping)return;stopping=true;server.close();server.closeAllConnections();service.close();save();if(hashFile(wallet)!==originalWalletHashes.solana||hashFile(tempoWallet)!==originalWalletHashes.tempo)process.exitCode=1;}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
