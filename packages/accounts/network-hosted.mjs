import {createHostedProductWorkspace} from '../product/hosted.mjs';
import {createAccountNetworkService} from './network-service.mjs';
import {createSupabaseNetworkCatalog} from './network-catalog.mjs';
import {loadEvidence} from '../v2/evidence.mjs';

// Same proven fenced snapshot executor, DIFFERENT identity from demo and sessions.
// The `accounts` storage kind also prohibits importing a product-demo directory.
export function createHostedAccountNetwork({config={},kv,stateKey,catalog,now=Date.now,serviceOptions={}}={}){
 if(config.AXP_ACCOUNT_SERVING_ENABLED!=='1')return {ready:false,reason:'account_serving_not_connected'};
 let workspace,retriever;
 try{
  catalog??=createSupabaseNetworkCatalog({url:config.AXP_SUPABASE_URL,secretKey:config.AXP_NETWORK_SUPABASE_SECRET_KEY});
  retriever=serviceOptions.retriever??loadEvidence();
  workspace=createHostedProductWorkspace({kv,stateKey,id:'axp-account-network-v1',kind:'accounts',now});
 }catch(e){return {ready:false,reason:e.code??'account_serving_configuration_required'};}
 return {ready:true,workspace,async readiness(){
  try{await catalog.networkCampaigns();return {ready:true,reason:null};}catch(e){return {ready:false,reason:e.code??'network_catalog_unavailable'};}
 },async withService(fn){
  return workspace.withState(async({dir,checkpoint})=>{
   const service=createAccountNetworkService({...serviceOptions,stateDir:dir,catalog,retriever,apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,now,dailyModelCap:Number(config.AXP_ACCOUNT_JEV_DAILY_CAP??50),checkpoint});
   try{return await fn(service);}finally{service.close();}
  });
 }};
}
