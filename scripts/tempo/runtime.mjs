// Explicit Preview-only proof runtime. Normal site builds never import this file.
import {randomUUID,createHash} from 'node:crypto';
import {createKVFromConfig} from '../../packages/hosted/kv.mjs';
import {createHostedProductAPI,productStateKey} from '../../packages/product/hosted.mjs';
import {stateKeyFrom} from '../../packages/hosted/vault.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {createProductOrganic} from '../../packages/product/organic.mjs';
import {officialProvider,inheritProviderExecution} from '../../packages/product/provider-provenance.mjs';
import {createProductDevnetRPC,inspectProductDevnet} from '../../packages/product/native.mjs';
import {createNativeTransport} from '../../packages/payments/sdk-transport.mjs';

export const VERSION='axp.tempo-preview-verification.v1';
export const WORKSPACE='tempo-integration-20261011';
const fail=code=>{throw Object.assign(Error(code),{code,status:503});};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function assertPreview(config,version=VERSION){if(version!==VERSION||config.VERCEL_ENV!=='preview'||config.AXP_PRODUCT_WORKSPACE_ID!==WORKSPACE)fail('verification_preview_required');}
export function validateBudget(budget){
 if(budget?.schemaVersion!=='axp.tempo-verification-budget.v1'||budget.maxUSD!==1||budget.maxJev!==40||budget.maxAnswers!==12||!Number.isSafeInteger(budget.reservedMicroUSD)||budget.reservedMicroUSD<0||budget.reservedMicroUSD>1000000||!Array.isArray(budget.attempts))fail('verification_budget_invalid');
 let reserved=0;for(const a of budget.attempts){if(!['jev','answer'].includes(a.kind)||!['admitted','completed','unknown'].includes(a.status)||a.reservedMicroUSD!==(a.kind==='jev'?15000:30000)||!Number.isFinite(Date.parse(a.at)))fail('verification_budget_invalid');reserved+=a.reservedMicroUSD;}
 if(reserved!==budget.reservedMicroUSD||budget.attempts.filter(a=>a.kind==='jev').length>40||budget.attempts.filter(a=>a.kind==='answer').length>12)fail('verification_budget_invalid');return budget;
}
export const budgetKey=()=>`axp:tempo-preview:${WORKSPACE}:budget:v1`;
const migrationKey=()=>`axp:tempo-preview:${WORKSPACE}:migration:v1`;
export async function installPreviewState({config,kv,manifest}){
 assertPreview(config,manifest?.version);if(manifest?.version!==VERSION||manifest.workspace!==WORKSPACE||!Array.isArray(manifest.snapshots)||manifest.snapshots.length!==2||!Array.isArray(manifest.campaignIds)||manifest.campaignIds.length!==3||manifest.campaignIds.some(id=>typeof id!=='string'||!/^[-\w]+$/.test(id))||new Set(manifest.campaignIds).size!==3)fail('verification_package_invalid');
 validateBudget(manifest.budget);const fingerprint=hash(manifest),marker=JSON.stringify({version:VERSION,fingerprint}),existing=await kv.get(migrationKey());if(existing!==null&&existing!==marker)fail('verification_import_conflict');
 const expectedKeys=new Set(['financial','organic'].map(kind=>productStateKey(WORKSPACE,kind)));
 for(const row of manifest.snapshots){if(!expectedKeys.delete(row.key)||typeof row.value!=='string')fail('verification_package_invalid');const state=JSON.parse(row.value);if(state.schemaVersion!=='axp.hosted-product-state.v1'||state.revision!==1||state.lease!==null||!state.snapshot?.startsWith('v1.'))fail('verification_package_invalid');}
 // A committed migration may have progressed financial obligations. Never
 // recreate an old snapshot or budget if a live key subsequently disappears.
 const initial=await Promise.all(manifest.snapshots.map(row=>kv.get(row.key))),priorBudget=await kv.get(budgetKey());
 if(existing&&(initial.some(value=>value===null)||priorBudget===null))fail('verification_state_missing');
 if(!existing&&(initial.some((value,i)=>value!==null&&value!==manifest.snapshots[i].value)||(priorBudget!==null&&priorBudget!==JSON.stringify(manifest.budget))))fail('verification_import_conflict');
 for(const row of manifest.snapshots){const current=await kv.get(row.key);if(current===null){if(!await kv.compareAndSet(row.key,null,row.value)&&(await kv.get(row.key))!==row.value)fail('verification_import_conflict');}else if(!existing&&current!==row.value)fail('verification_import_conflict');}
 const seed=JSON.stringify(manifest.budget),currentBudget=await kv.get(budgetKey());if(currentBudget===null){if(!await kv.compareAndSet(budgetKey(),null,seed)&&(await kv.get(budgetKey()))!==seed)fail('verification_import_conflict');}else if(!existing&&currentBudget!==seed)fail('verification_import_conflict');else validateBudget(JSON.parse(currentBudget));
 if(!existing&&!await kv.compareAndSet(migrationKey(),null,marker)&&(await kv.get(migrationKey()))!==marker)fail('verification_import_conflict');
}
export function boundedProvider({kv,kind,source,now=Date.now}){
 if(!['jev','answer'].includes(kind)||typeof source!=='function')fail('verification_provider_invalid');
 async function mutate(fn){for(let i=0;i<8;i++){const prior=await kv.get(budgetKey());if(prior===null)fail('verification_budget_missing');const budget=validateBudget(JSON.parse(prior));const result=fn(budget);if(await kv.compareAndSet(budgetKey(),prior,JSON.stringify(budget)))return result;}fail('verification_budget_contention');}
 return inheritProviderExecution(async(...input)=>{
  const id=randomUUID(),reservation=kind==='jev'?15000:30000;
  await mutate(b=>{if(b.attempts.some(a=>a.status==='unknown'||(a.status==='admitted'&&now()-Date.parse(a.at)>60000)))fail('verification_provider_uncertain');if(b.attempts.filter(a=>a.kind===kind).length>=(kind==='jev'?40:12)||b.reservedMicroUSD+reservation>1000000)fail('verification_budget_exhausted');b.attempts.push({id,kind,status:'admitted',reservedMicroUSD:reservation,at:new Date(now()).toISOString()});b.reservedMicroUSD+=reservation;});
  let result;try{result=await source(...input);}catch(error){await mutate(b=>{const a=b.attempts.find(a=>a.id===id);if(!a||a.status!=='admitted')fail('verification_budget_conflict');a.status='unknown';a.reason=typeof error?.code==='string'&&/^[a-z_0-9]+$/.test(error.code)?error.code:'provider_failed';});throw error;}
  await mutate(b=>{const a=b.attempts.find(a=>a.id===id);if(!a||a.status!=='admitted')fail('verification_budget_conflict');a.status='completed';a.completedAt=new Date(now()).toISOString();a.usage=result?.usage??null;});return result;
 },source);
}
export async function createPreviewVerificationHandler({config=process.env,root=process.cwd(),manifest,kv,now=Date.now,serviceOptions={},sources={}}={}){
 assertPreview(config,manifest?.version);kv??=createKVFromConfig(config,{root});if(!kv||typeof kv.compareAndSet!=='function'||(config.VERCEL&&kv.kind!=='blob'))fail('verification_store_required');stateKeyFrom(config,{root,allowLocalKey:false});await installPreviewState({config,kv,manifest});
 const jev=sources.jev??officialProvider((...args)=>createJevHttpTransport({apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,maxCalls:1})(...args),true),organic=sources.answer??officialProvider((...args)=>createProductOrganic({apiKey:config.DEEPSEEK_API_KEY})(...args),true);
 const rpcURL=config.AXP_PRODUCT_DEVNET_RPC_URL,rpc=rpcURL?createProductDevnetRPC(rpcURL):null;
 const api=await createHostedProductAPI({config:{...config,AXP_PRODUCT_JEV_DAILY_CAP:'40'},root,kv,now,serviceOptions:{...serviceOptions,transport:boundedProvider({kv,kind:'jev',source:jev,now}),organicTransport:boundedProvider({kv,kind:'answer',source:organic,now}),tempoOptions:{...serviceOptions.tempoOptions,limits:{maxChannels:2,maxDepositBaseUnits:'50000',aggregateDepositBaseUnits:'100000',aggregateFeeAttoUSD:'1000000000000000000'}},paymentOptions:{...serviceOptions.paymentOptions,...(rpc?{preflight:input=>inspectProductDevnet({...input,rpc}),transportFactory:input=>createNativeTransport({...input,rpcURL})}:{})}}});
 return async(req,res)=>{const path=new URL(req.url,'http://local').pathname.replace(/\/$/,'');if(path!=='/api/product'&&!path.startsWith('/api/product/'))return reject(res,'verification_route_disabled',404);if(req.method==='POST'){const campaign=path.match(/^\/api\/product\/campaigns\/([-\w]+)\/([a-z]+)$/);if(path==='/api/product/campaigns'||(campaign&&(!manifest.campaignIds.includes(campaign[1])||['duplicate','approve'].includes(campaign[2]))))return reject(res,'verification_campaigns_frozen',409);}return api.handler(req,res);};
}
function reject(res,error,status){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error}));}
