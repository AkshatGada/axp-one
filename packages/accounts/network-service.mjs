// Account network only. No demo state, organic-answer provider or payment worker.
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,generateKeyPairSync,createPrivateKey,createPublicKey,createHmac} from 'node:crypto';
import {Exchange} from '../exchange/index.mjs';
import {ContractError,strictObject,hash,baseUnits,signReceipt} from '../contracts/index.mjs';
import {taskContext,CAPABILITIES,secretMatches} from '../product/service.mjs';
import {createProductDecisions} from '../product/decisions.mjs';
import {validateCampaignInput} from './resources.mjs';
import {createAccountFinancialService} from './financial-service.mjs';

const RUN='account-network-v1',fail=(code,status=400)=>{throw new ContractError(code,code,status);};
const id=value=>{if(typeof value!=='string'||!/^[-\w]{1,120}$/.test(value))fail('invalid_id');return value;};
const caps=CAPABILITIES.map(c=>c.id);
// We can enforce declared capability exclusions, but do not have a trusted
// inventory safety-category classifier. A word match on the question is NOT
// an ad-category policy. Unsupported restrictions must suppress serving.
const knownRestriction=value=>caps.includes(value);
const list=value=>{if(!Array.isArray(value)||value.length>17||value.some(v=>!caps.includes(v))||new Set(value).size!==value.length)fail('unsupported_capability');return [...value].sort();};
const exclusions=value=>{if(!Array.isArray(value)||value.length>17||value.some(v=>typeof v!=='string'||!/^[-a-z_]{1,80}$/.test(v))||new Set(value).size!==value.length)fail('invalid_categories');return [...value].sort();};
function normalize(body){
 strictObject(body,['question','sessionId','turnId','placementId','requiredCapabilities','excludedCategories','settlementNetwork'],['question','sessionId','turnId']);
 const {question}=body;if(typeof question!=='string'||!question.trim()||question.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(question))fail('invalid_question');
 if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test(question))fail('private_content');
 if(body.placementId!==undefined&&body.placementId!=='chat-sponsored-card')fail('placement_not_configured');
 const rail=body.settlementNetwork??'solana-devnet';if(!['solana-devnet','tempo-testnet'].includes(rail))fail('settlement_network_invalid');
 return {question:question.trim(),sessionId:id(body.sessionId),turnId:id(body.turnId),placementId:'chat-sponsored-card',settlementNetwork:rail,requiredCapabilities:list(body.requiredCapabilities??[]),excludedCategories:exclusions(body.excludedCategories??[])};
}
function catalogRows(rows){
 if(!Array.isArray(rows)||rows.length>100)fail('network_catalog_invalid',503);
 const seen=new Set();return rows.map(row=>{
  const {campaign:c,advertiser:a,enrollment:e}=row??{};
  if(!c||!a||!e||seen.has(c.id)||a.id!==c.advertiserId||e.campaignId!==c.id||e.organizationId!==c.organizationId||e.enabled!==true||e.financialMode!=='synthetic'||c.version!==e.version||c.status!=='approved'||c.approvedContentHash!==e.approvedContentHash||c.approvedContentHash!==hash(c.input))fail('network_catalog_invalid',503);
  seen.add(c.id);validateCampaignInput(c.input);id(c.id);id(c.advertiserId);
  let site;try{site=new URL(a.website);}catch{fail('network_catalog_invalid',503);}
  if(site.protocol!=='https:'||site.username||site.password||typeof a.name!=='string'||!a.name.trim()||a.name.length>120)fail('network_catalog_invalid',503);
  return {campaign:c,advertiser:{id:a.id,name:a.name,website:site.href},enrollment:e};
 });
}

// App-specific routing is not a separate spending grant. This override retains
// the shared Exchange auction/receipt algorithms and clamps every alias against
// aggregate original-campaign obligations across ALL apps and versions.
class NetworkExchange extends Exchange {
 available(c){
  const local=super.available(c),binding=this.get('network_bindings',c.campaignId);
  if(!binding)return {campaign:'0',channel:'0'};
  const aliases=new Set(this.all('network_bindings').filter(b=>b.campaignId===binding.campaignId).map(b=>b.id));
  const accepted=this.all('charges').filter(a=>aliases.has(a.campaignId)).reduce((n,a)=>n+baseUnits(a.amountBaseUnits),0n);
  const reserved=this.all('awards').filter(a=>aliases.has(a.campaignId)&&a.status==='reserved').reduce((n,a)=>n+baseUnits(a.priceBaseUnits),0n);
  const remaining=baseUnits(c.budgetCapBaseUnits)-accepted-reserved;
  return {campaign:String(remaining<0n?0n:remaining),channel:local.channel};
 }
}

export function createAccountNetworkService({stateDir,catalog,apiKey,transport,retriever,now=Date.now,checkpoint=null,dailyModelCap=50,financialMode='synthetic',financialRepository=null,financialOptions={},origin}={}){
 if(typeof catalog?.networkCampaigns!=='function')fail('network_catalog_required',503);
 if(!['synthetic','devnet'].includes(financialMode)||financialMode==='devnet'&&!financialRepository)fail('account_funding_configuration_required',503);
 const RUN=financialMode==='devnet'?'account-network-native-v1':'account-network-v1';
 mkdirSync(stateDir,{recursive:true,mode:0o700});
 const secretFile=join(stateDir,'network-delivery-secret'),keyFile=join(stateDir,'network-receipt.pem');
 if(!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
 if(!existsSync(keyFile))writeFileSync(keyFile,generateKeyPairSync('ed25519').privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600,flag:'wx'});
 const secret=readFileSync(secretFile,'utf8'),receiptKey=createPrivateKey(readFileSync(keyFile)),publicKeyPEM=createPublicKey(receiptKey).export({format:'pem',type:'spki'});
 const paymentStates=new Map();
 const exchange=new NetworkExchange({dbPath:join(stateDir,'exchange.sqlite'),runId:RUN,mode:financialMode,now,
  networkState:channelId=>financialMode==='devnet'?paymentStates.get(channelId)??null:{phase:exchange.get('channels',channelId)?.status,reconciliationRequired:false}});
 for(const table of ['network_bindings','network_requests','network_admissions','network_versions'])exchange.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
 const buyers=createProductDecisions({exchange,apiKey,transport,retriever,now,dailyCap:dailyModelCap,checkpoint});
 let tail=Promise.resolve();
 const serial=fn=>{const job=tail.then(fn);tail=job.catch(()=>{});return job;};
 const tokenFor=awardId=>createHmac('sha256',secret).update(`${RUN}:${awardId}`).digest('hex');
 const publisherId=app=>`app:${id(app.id)}`,keyId=app=>`network-receipt:${id(app.id)}`;
 function register(app,payee){const p=publisherId(app);exchange.registerPublisher({publisherId:p,publisherKeyId:keyId(app),payee:payee??`synthetic:${p}`,publicKeyPEM});
  if(financialMode==='devnet')return p;
  exchange.registerPublisherSettlementRoute({publisherId:p,settlementNetwork:'tempo-testnet',payee:`synthetic:${p}`,token:'synthetic-pathusd-base-units',decimals:6});return p;}
 const requestKey=(app,input)=>hash([app.id,input.sessionId,input.turnId]);
 const bindingFor=alias=>exchange.require('network_bindings',alias);
 function checkEnrollment(c){
  const aliases=new Set(exchange.all('network_bindings').filter(b=>b.campaignId===c.id).map(b=>b.id));
  const oldVersions=exchange.all('network_versions').filter(v=>v.publicVersionId.startsWith(`${c.id}-v`));
  if(oldVersions.some(v=>v.input.settlementNetwork!==c.input.settlementNetwork))fail('campaign_network_locked',409);
  const obligations=[...exchange.all('charges').filter(a=>aliases.has(a.campaignId)).map(a=>a.amountBaseUnits),
   ...exchange.all('awards').filter(a=>aliases.has(a.campaignId)&&a.status==='reserved'&&a.expiresAt>now()).map(a=>a.priceBaseUnits)].reduce((n,a)=>n+baseUnits(a),0n);
  if(obligations>baseUnits(c.input.budgetCapBaseUnits))fail('cap_below_obligations',409);
 }
 function publicAward(a){
  const binding=bindingFor(a.campaignId),version=exchange.require('network_versions',a.campaignVersionId);
  const {renderTokenHash,...rest}=a;
  return {...rest,campaignId:binding.campaignId,campaignVersionId:version.publicVersionId,brandName:version.advertiser.name,appId:binding.appId};
 }
 function publicCharge(c){const b=bindingFor(c.campaignId),v=exchange.require('network_versions',c.campaignVersionId);return {...c,campaignId:b.campaignId,campaignVersionId:v.publicVersionId,appId:b.appId,settlementNetwork:v.input.settlementNetwork};}
 function bindAward(app,awardId,token){
  id(awardId);const a=exchange.get('awards',awardId);
  if(!a||a.publisherId!==publisherId(app))fail('not_found',404);
  if(!secretMatches(token,tokenFor(awardId)))fail('delivery_token_invalid',403);
  return a;
 }
 async function config(app){let catalogueReady=true,catalogueReason=null,rows=[],fundedRoutes=0;try{
  rows=catalogRows(await catalog.networkCampaigns());
  if(financialMode==='devnet'){const candidates=new Map(rows.map(r=>[r.campaign.id,r.campaign]));
   fundedRoutes=(await financialRepository.list('channel',app.id)).filter(({value:c})=>{const campaign=candidates.get(c.resourceId);return c.counterpartyAppId===app.id&&c.phase==='funded'&&c.open?.status==='finalized'&&c.servingEnabled===true&&c.termsHash===hash(c.terms)&&c.campaignVersion===campaign?.version&&c.campaignContentHash===campaign?.approvedContentHash&&now()<c.terms.applicationDeadlineAt*1000-300000;}).length;}
 }catch(e){catalogueReady=false;catalogueReason=e.code??'network_catalog_unavailable';}
  const restrictionsReady=app.blockedCategories.every(knownRestriction);
  const fundingReady=financialMode!=='devnet'||fundedRoutes>0;
  return {schemaVersion:'publisher-config.v2',contractVersion:'0.2.0',publisherId:publisherId(app),appId:app.id,
  app:{name:app.name,website:app.website},allowedOrigins:app.allowedOrigins,blockedCategories:app.blockedCategories,
  publicKeyPEM,publisherKeyId:keyId(app),expiresAtUnit:'unix_epoch_milliseconds',maxQuestionCharacters:1200,restrictionLimit:17,
  placementId:'chat-sponsored-card',apiBasePath:'/api/accounts/sdk',financialMode,mode:financialMode,servingEnabled:restrictionsReady&&catalogueReady&&fundingReady,recoverySupported:true,keyConfigured:true,
  capabilities:CAPABILITIES,payments:{mode:financialMode,signingEnabled:false,ready:financialMode==='devnet'&&catalogueReady&&fundingReady,signingMode:financialMode==='devnet'?'own_wallet':null,...(financialMode==='devnet'?{fundedRoutes}:{})},engine:buyers.status(),
  catalogue:{ready:catalogueReady,reason:catalogueReason},unsupportedCategories:app.blockedCategories.filter(v=>!knownRestriction(v)),
  ...(!restrictionsReady?{reason:'profile_restriction_unsupported'}:!catalogueReady?{reason:catalogueReason}:!fundingReady?{reason:'app_funding_not_ready'}:{})};}
 async function sync(rows,app){
  let routes=[];
  if(financialMode==='devnet'){
   const records=await financialRepository.list('channel',app.id);
   for(const {value:c} of records){
    if(c.counterpartyAppId!==app.id||c.termsHash!==hash(c.terms))fail('channel_binding_invalid',503);
    paymentStates.set(c.id,{channelId:c.id,runId:RUN,mode:'devnet',network:'solana-devnet',payee:c.terms.payee,phase:c.phase==='funded'?'open':c.phase,
     openStatus:c.open?.status,depositBaseUnits:c.terms.depositBaseUnits,authorizedBaseUnits:c.authorizedBaseUnits,settledBaseUnits:c.paidBaseUnits,refundBaseUnits:c.refundBaseUnits,
     protocolChannelId:c.protocolChannelId??null,termsHash:c.termsHash,closeStatus:c.close?.status??'not_prepared',reconciliationRequired:c.phase.includes('unknown')||c.phase.endsWith('submitted')});
    if(exchange.get('channels',c.id))exchange.syncNetworkChannel(c.id);
   }
   routes=records.map(r=>r.value).filter(c=>c.phase==='funded'&&c.servingEnabled===true&&c.open?.status==='finalized'&&now()<c.terms.applicationDeadlineAt*1000-300000);
   // One app's old channels retain their original payout wallet. A new payout
   // address requires a new app identity in this narrow first native slice.
   const payees=new Set(records.map(r=>r.value.terms.payee));if(payees.size>1)fail('app_payout_route_conflict',409);
   if(!routes.length){exchange.tx(()=>{for(const c of exchange.all('campaigns'))exchange.put('campaigns',c.campaignId,{...c,status:'paused'});});return;}
  }
  const p=register(app,routes[0]?.terms.payee);
  exchange.tx(()=>{for(const c of exchange.all('campaigns'))exchange.put('campaigns',c.campaignId,{...c,status:'paused'});});
  for(const {campaign:c,advertiser} of rows){
   const route=routes.find(r=>r.resourceId===c.id&&r.campaignVersion===c.version&&r.campaignContentHash===c.approvedContentHash);
   if(financialMode==='devnet'&&(!route||c.input.settlementNetwork!=='solana-devnet'))continue;
   // Direct owner database writes cannot turn a rail change or cap reduction
   // into another grant. Existing receipts remain bound to their old terms.
   try{checkEnrollment(c);}catch(e){if(['campaign_network_locked','cap_below_obligations'].includes(e.code))continue;throw e;}
   // Explicit pause/re-enable can capture updated advertiser metadata without
   // editing the campaign. Keep each such public identity snapshot immutable.
   const alias=`cp-${hash([c.id,app.id,...(route?[route.id]:[])]).slice(0,32)}`,channelId=route?.id??`virtual-${alias}`,versionId=`${alias}-v${c.version}-${hash(advertiser).slice(0,12)}`;
   const input=c.input,creative={creativeVersionId:`creative-${versionId}`,approvedText:input.approvedText,destinationURL:advertiser.website,fictional:false,softFitTags:input.declaredCapabilities,evidenceFieldIds:['declaredConstraints']};
   exchange.tx(()=>{
    exchange.put('network_bindings',alias,{id:alias,campaignId:c.id,organizationId:c.organizationId,appId:app.id});
    const old=exchange.get('network_versions',versionId),snapshot={id:versionId,publicVersionId:`${c.id}-v${c.version}`,input,advertiser,approvedContentHash:c.approvedContentHash};
    if(old&&hash(old)!==hash(snapshot))fail('campaign_snapshot_conflict',409);
    exchange.put('network_versions',versionId,snapshot);
   });
   exchange.createChannel({channelId,advertiserId:c.advertiserId,publisherId:p,payee:route?.terms.payee??`synthetic:${p}`,depositBaseUnits:route?.terms.depositBaseUnits??'100000',mode:financialMode,settlementNetwork:input.settlementNetwork});
   if(route)exchange.syncNetworkChannel(channelId);
   const model={campaignId:alias,campaignVersionId:versionId,advertiserId:c.advertiserId,status:'active',allowedIntents:['product_tools'],destination:'global',declaredConstraints:input.declaredCapabilities,
    creatives:[creative],softFitTags:input.declaredCapabilities,maxBidBaseUnits:input.maxBidBaseUnits,budgetCapBaseUnits:input.budgetCapBaseUnits,channelId,policyVersion:'fit_intent_bid_v1',settlementNetwork:input.settlementNetwork};
   // A saved version is immutable; resuming only changes active state, not facts.
   if(exchange.get('campaigns',alias)?.campaignVersionId===versionId)exchange.tx(()=>exchange.put('campaigns',alias,model));
   else exchange.createCampaign(model);
  }
 }
 async function opportunity(app,body){
  const input=normalize(body),key=requestKey(app,input),inputHash=hash(input);
  return serial(async()=>{
   const saved=exchange.get('network_requests',key);
   if(saved){if(saved.inputHash!==inputHash)fail('turn_conflict',409);return {...saved.result,replayed:true};}
   const prior=exchange.get('network_admissions',key);
   if(prior){if(prior.inputHash!==inputHash)fail('turn_conflict',409);fail('opportunity_outcome_unknown',409);}
   if(!Array.isArray(app.blockedCategories)||!app.blockedCategories.every(knownRestriction))fail('profile_restriction_unsupported',503);
   const rows=catalogRows(await catalog.networkCampaigns());
   exchange.expireAwards();await sync(rows,app);
   if(!exchange.get('publishers',publisherId(app))&&financialMode==='devnet'){
    const result={status:'no_fill',opportunityId:`opp-${hash([publisherId(app),input.sessionId,input.turnId]).slice(0,24)}`,financialMode,mode:financialMode,settlementNetwork:input.settlementNetwork,reason:'funded_app_channel_required',replayed:false};
    exchange.tx(()=>{exchange.put('network_requests',key,{id:key,appId:app.id,inputHash,result});exchange.event('account_opportunity_not_admitted',{opportunityId:result.opportunityId,appId:app.id,reason:result.reason});});return result;
   }
   const policy=[...new Set([...input.excludedCategories,...app.blockedCategories.filter(v=>caps.includes(v))])];
   const blockedPolicy=input.excludedCategories.some(v=>!knownRestriction(v));
   const context=taskContext(input.question,input.requiredCapabilities),p=publisherId(app);
   const o=exchange.createOpportunity({publisherId:p,slotId:input.placementId,randomSessionId:input.sessionId,turnId:input.turnId,...context,coarseIntent:blockedPolicy?'blocked':context.coarseIntent,destination:'global',floorBaseUnits:'1000',expiresAt:now()+300000,settlementNetwork:input.settlementNetwork},{idempotencyKey:key});
   exchange.tx(()=>exchange.put('network_admissions',key,{id:key,inputHash,appId:app.id,opportunityId:o.id,status:'pending',at:now()}));
   if(checkpoint)await checkpoint('network_opportunity_admitted');
   const candidates=exchange.eligibleCampaigns(o.id).eligible.filter(c=>c.settlementNetwork===input.settlementNetwork&&!policy.some(v=>c.declaredConstraints.includes(v)));
   const decisions=[];
   for(const c of candidates){const v=exchange.require('network_versions',c.campaignVersionId);decisions.push(await buyers.evaluate(c,{...v.input,brandName:v.advertiser.name,websiteURL:v.advertiser.website},o,input.question));}
   // An edit/pause during model evaluation cannot be admitted from stale facts.
   const current=catalogRows(await catalog.networkCampaigns());await sync(current,app);
   exchange.tx(()=>{for(const c of exchange.all('campaigns'))if(c.settlementNetwork!==input.settlementNetwork||policy.some(v=>c.declaredConstraints.includes(v)))exchange.put('campaigns',c.campaignId,{...c,status:'paused'});});
   const outcome=exchange.runAuction(o.id,decisions),a=outcome.award;
   const result={status:a?'awarded':'no_fill',opportunityId:o.id,financialMode,mode:financialMode,settlementNetwork:input.settlementNetwork,
    ...(a?{award:publicAward(a),deliveryToken:tokenFor(a.id)}:{}),
    execution:buyers.status().execution,reason:a?null:blockedPolicy?'publisher_policy_unavailable':'no_eligible_bid',replayed:false};
   exchange.tx(()=>{exchange.put('network_requests',key,{id:key,appId:app.id,inputHash,result});exchange.put('network_admissions',key,{...exchange.require('network_admissions',key),status:'resolved'});});
   return result;
  });
 }
 function render(app,awardId,body,token){return serial(async()=>{
  const a=bindAward(app,awardId,token);
  if(financialMode==='devnet'&&!exchange.get('charges',`charge-${a.id}`)){
   const c=(await financialRepository.get(`channel:${a.channelId}`))?.value;
   if(!c||!['funded','draining'].includes(c.phase)||c.termsHash!==hash(c.terms)||c.counterpartyAppId!==app.id||now()>=c.terms.applicationDeadlineAt*1000)fail('channel_unavailable',409);
  }
  strictObject(body,['creativeHash','domInserted','sponsoredLabelPresent'],['creativeHash','domInserted','sponsoredLabelPresent']);
  if(body.creativeHash!==a.creativeHash||body.domInserted!==true||body.sponsoredLabelPresent!==true)fail('render_ack_invalid');
  const receipt={schemaVersion:'publisher-receipt.v1',runId:RUN,mode:financialMode,publisherId:publisherId(app),publisherKeyId:keyId(app),awardId:a.id,opportunityId:a.opportunityId,creativeHash:a.creativeHash,nonce:`render-${a.id}`,renderAcknowledgementHash:hash({awardId:a.id,creativeHash:a.creativeHash,domInserted:true,sponsoredLabelPresent:true})};
  const signature=signReceipt(receipt,receiptKey),accepted=exchange.acceptDelivery({receipt,signature});
  return {status:'accepted',financialMode,receipt,signature,receiptHash:hash(receipt),charge:publicCharge(accepted.charge),replayed:accepted.replayed};
 });}
 function failAward(app,awardId,body,token){return serial(()=>{
  const a=bindAward(app,awardId,token);strictObject(body,['reason']);
  if(body.reason!==undefined&&(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>120))fail('invalid_text');
  return {status:'failed',award:publicAward(exchange.failAward(a.id))};
 });}
 function lookupOpportunity(app,body){strictObject(body,['sessionId','turnId'],['sessionId','turnId']);id(body.sessionId);id(body.turnId);
  const key=requestKey(app,body),saved=exchange.get('network_requests',key),schemaVersion='publisher-opportunity-status.v1';
  if(!saved)return {schemaVersion,status:exchange.get('network_admissions',key)?'unknown':'not_found'};
  const a=saved.result.award?exchange.require('awards',saved.result.award.id):null;
  return {schemaVersion,status:'resolved',result:{...saved.result,replayed:true},...(a?{awardStatus:a.status==='reserved'&&a.expiresAt<=now()?'expired':a.status}:{})};
 }
 function lookupDelivery(app,awardId,token){const a=bindAward(app,awardId,token),schemaVersion='publisher-award-status.v1',c=exchange.get('charges',`charge-${a.id}`);
  if(!c)return {schemaVersion,status:a.status==='reserved'&&a.expiresAt<=now()?'expired':a.status,awardId:a.id,expiresAt:a.expiresAt,financialMode};
  const r=exchange.require('receipt_records',c.id);return {schemaVersion,status:'accepted',awardId:a.id,financialMode,result:{status:'accepted',financialMode,receipt:r.receipt,signature:r.signature,receiptHash:r.receiptHash,charge:publicCharge(c),replayed:true}};
 }
 function report({campaignId,appId}){
  const bindings=new Map(exchange.all('network_bindings').filter(b=>(!campaignId||b.campaignId===campaignId)&&(!appId||b.appId===appId)).map(b=>[b.id,b]));
  const charges=exchange.all('charges').filter(c=>bindings.has(c.campaignId)),awards=exchange.all('awards').filter(a=>bindings.has(a.campaignId)&&a.status==='reserved'&&a.expiresAt>now());
  const summary=(cs,as)=>({acceptedBaseUnits:String(cs.reduce((n,c)=>n+baseUnits(c.amountBaseUnits),0n)),reservedBaseUnits:String(as.reduce((n,a)=>n+baseUnits(a.priceBaseUnits),0n)),deliveryCount:cs.length});
  const rail=c=>exchange.require('network_versions',c.campaignVersionId).input.settlementNetwork;
  const bySettlementNetwork=Object.fromEntries(['solana-devnet','tempo-testnet'].map(r=>[r,summary(charges.filter(c=>rail(c)===r),awards.filter(a=>rail(a)===r))]));
  return {schemaVersion:campaignId?'account-campaign-report.v1':'account-app-report.v1',financialMode,...(campaignId?{campaignId}:{appId}),
   // Legacy summary is Solana-only. Never sum USDC and PathUSD units.
   summary:bySettlementNetwork['solana-devnet'],bySettlementNetwork,deliveries:charges.slice(-100).map(c=>{const b=bindings.get(c.campaignId),v=exchange.require('network_versions',c.campaignVersionId);return {awardId:c.awardId,opportunityId:exchange.require('awards',c.awardId).opportunityId,campaignId:b.campaignId,campaignVersionId:v.publicVersionId,appId:b.appId,amountBaseUnits:c.amountBaseUnits,receiptHash:c.receiptHash,acceptedAt:c.acceptedAt,settlementNetwork:v.input.settlementNetwork};})};
 }
 return {ready:true,config,opportunity,render,failAward,lookupOpportunity,lookupDelivery,report,checkEnrollment,engine:buyers.status,exchange,
  financial:financialRepository?store=>createAccountFinancialService({...financialOptions,repository:financialRepository,store,origin,stateDir:join(stateDir,'own-wallet'),exchange,now,checkpoint:checkpoint??(async()=>{})}):null,
  close:()=>exchange.close()};
}
