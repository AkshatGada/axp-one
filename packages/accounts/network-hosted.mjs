import {createHostedProductWorkspace} from '../product/hosted.mjs';
import {createAccountNetworkService} from './network-service.mjs';
import {createSupabaseNetworkCatalog} from './network-catalog.mjs';
import {loadEvidence} from '../v2/evidence.mjs';
import {createSupabaseFinancialRepository} from './financial-repository.mjs';

// Same proven fenced snapshot executor, DIFFERENT identity from demo and sessions.
// The `accounts` storage kind also prohibits importing a product-demo directory.
export function createHostedAccountNetwork({config={},kv,stateKey,catalog,now=Date.now,serviceOptions={}}={}){
 if(config.AXP_ACCOUNT_SERVING_ENABLED!=='1')return {ready:false,reason:'account_serving_not_connected'};
 let workspace,retriever,financialRepository;
 const financialMode=config.AXP_ACCOUNT_FINANCIAL_MODE??'synthetic';
 try{
  if(!['synthetic','devnet'].includes(financialMode))throw Object.assign(Error('account_financial_mode_invalid'),{code:'account_financial_mode_invalid'});
  if(config.AXP_ACCOUNT_PAYMENTS_ENABLED==='1')financialRepository=serviceOptions.financialRepository??createSupabaseFinancialRepository({url:config.AXP_SUPABASE_URL,secretKey:config.AXP_NETWORK_SUPABASE_SECRET_KEY});
  if(financialMode==='devnet'&&!financialRepository)throw Object.assign(Error('account_funding_configuration_required'),{code:'account_funding_configuration_required'});
  catalog??=createSupabaseNetworkCatalog({url:config.AXP_SUPABASE_URL,secretKey:config.AXP_NETWORK_SUPABASE_SECRET_KEY});
  retriever=serviceOptions.retriever??loadEvidence();
  workspace=createHostedProductWorkspace({kv,stateKey,id:financialMode==='devnet'?'axp-account-network-native-v1':'axp-account-network-v1',kind:'accounts',now});
 }catch(e){return {ready:false,reason:e.code??'account_serving_configuration_required'};}
 return {ready:true,workspace,financialMode,financialBindings:!!financialRepository,broadcastEnabled:financialMode==='devnet'&&config.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED==='1',async readiness(){
  try{await catalog.networkCampaigns();if(financialRepository)await financialRepository.get('channel:00000000-0000-4000-8000-000000000000');
   return {ready:true,reason:null,financialMode,walletBindings:!!financialRepository,broadcastEnabled:financialMode==='devnet'&&config.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED==='1'};
  }catch(e){return {ready:false,reason:e.code??'network_catalog_unavailable',financialMode,walletBindings:false,broadcastEnabled:false};}
 },async withService(fn){
  return workspace.withState(async({dir,checkpoint})=>{
   const service=createAccountNetworkService({...serviceOptions,financialMode,financialRepository,origin:config.AXP_ACCOUNTS_ORIGIN,
    financialOptions:{broadcastEnabled:financialMode==='devnet'&&config.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED==='1',...serviceOptions.financialOptions},
    stateDir:dir,catalog,retriever,apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,now,dailyModelCap:Number(config.AXP_ACCOUNT_JEV_DAILY_CAP??50),checkpoint});
   try{return await fn(service);}finally{service.close();}
  });
 }};
}
