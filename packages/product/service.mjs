import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID,randomBytes,generateKeyPairSync,createPrivateKey,createPublicKey,createHmac,timingSafeEqual} from 'node:crypto';
import {Exchange} from '../exchange/index.mjs';
import {ContractError,strictObject,hash,baseUnits,computeBid,signReceipt} from '../contracts/index.mjs';
import {createProductDecisions} from './decisions.mjs';
import {createProductOrganic,PRODUCT_ORGANIC_MODEL} from './organic.mjs';
import {createProductPayments} from './payments.mjs';
import {NATIVE_LIMITS} from './native.mjs';
import {providerExecution} from './provider-provenance.mjs';
import {isBenchmarkProfile} from '../network-scale/profile.mjs';

export const CAPABILITIES=Object.freeze([
 ['crypto_storage','Crypto custody','Store cryptocurrency and manage private keys.'],
 ['hardware_wallet','Hardware wallets','A physical device for key storage and signing.'],
 ['offline_key_storage','Offline key storage','Keep private keys offline.'],
 ['mobile_software_wallet','Mobile wallets','Software wallets that work without a hardware device.'],
 ['ethereum','Ethereum','Declared Ethereum support.'],['solana','Solana','Declared Solana support.'],
 ['travel_booking','Travel booking','Book flights, stays or business travel.'],
 ['expense_management','Expense management','Capture receipts and manage business expenses.'],
 ['policy_enforcement','Travel policies','Apply approval and travel policy controls.'],
 ['authentication','Authentication','Sign-in and authentication infrastructure.'],
 ['agent_identity','Agent identity','Identity and access for AI agents.'],
 ['software_development','Developer tools','Build, debug and ship software.'],
 ['online_learning','Online learning','Courses and guided learning.'],
 ['project_management','Project management','Plan work and coordinate teams.'],
 ['design_tools','Design tools','Create visual designs and prototypes.'],
 ['productivity','Productivity','Organize and automate everyday work.'],
 ['ecommerce','E-commerce','Tools for online stores and selling.'],
].map(([id,label,description])=>Object.freeze({id,label,description})));
export const LIMITS=Object.freeze({floorBaseUnits:'1000',maxBidBaseUnits:'1000000',maxBudgetBaseUnits:'10000000',frequencyCap:2});
const fields=['name','brandName','websiteURL','productDescription','approvedText','contextHints','declaredCapabilities','maxBidBaseUnits','budgetCapBaseUnits','depositBaseUnits'];
const defaults={name:'',brandName:'',websiteURL:'',productDescription:'',approvedText:'',contextHints:[],declaredCapabilities:[],maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000',depositBaseUnits:'20000'};
export const PRESETS=Object.freeze([
 {id:'developer',label:'Developer tools',exampleQuestion:'Recommend a developer tool to debug and build a TypeScript API.',name:'Developer tools launch',brandName:'StackPilot',websiteURL:'https://stackpilot.example/',productDescription:'Developer tools for debugging TypeScript APIs and shipping software.',approvedText:'Debug your TypeScript API with StackPilot. Trace errors, inspect requests and ship with confidence.',contextHints:['When developers compare tools for debugging a TypeScript API or building software.'],declaredCapabilities:['software_development']},
 {id:'wallet',label:'Hardware wallet',exampleQuestion:'Compare hardware wallets for Ethereum and Solana with offline key storage.',name:'Self-custody launch',brandName:'ClearVault',websiteURL:'https://clearvault.example/',productDescription:'A hardware wallet with offline key storage and declared Ethereum and Solana support.',approvedText:'Keep your keys offline with ClearVault. A hardware wallet for Ethereum and Solana self-custody.',contextHints:['When people compare hardware wallets for Ethereum and Solana or offline key storage.'],declaredCapabilities:['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana']},
 {id:'travel',label:'Business travel',exampleQuestion:'Compare corporate travel booking tools with automatic expense capture.',name:'Business travel launch',brandName:'TripDesk',websiteURL:'https://tripdesk.example/',productDescription:'Corporate travel booking and automatic expense capture for teams.',approvedText:'Bring team travel booking and expense capture together with TripDesk.',contextHints:['When teams compare corporate travel booking and automated expense management.'],declaredCapabilities:['travel_booking','expense_management']},
].map(p=>Object.freeze({...defaults,...p})));
export const DEMO_ADVERTISER=Object.freeze({...defaults,name:'HarborKey launch',brandName:'HarborKey',websiteURL:'https://harborkey.example/',productDescription:'A hardware wallet with offline key storage and declared Ethereum and Solana support.',approvedText:'Keep your keys offline with HarborKey. A hardware wallet for Ethereum and Solana self-custody.',contextHints:['When people compare hardware wallets for Ethereum and Solana or offline key storage.','Skip mobile-only software wallet requests; this offer requires a hardware device.'],declaredCapabilities:['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],maxBidBaseUnits:'4000',budgetCapBaseUnits:'16000',depositBaseUnits:'20000'});
const fail=(code,status=400)=>{throw new ContractError(code,code,status);};
const id=v=>{if(typeof v!=='string'||!/^[-\w]{1,120}$/.test(v))fail('invalid_id');return v;};
function text(v,max,empty=false){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v)||(!empty&&!v.trim()))fail('invalid_text');return v.trim();}
function website(v,empty=false){text(v,500,empty);if(!v&&empty)return '';let u;try{u=new URL(v);}catch{fail('invalid_url');}if(u.protocol!=='https:'||u.username||u.password)fail('invalid_url');return u.href;}
function list(v,choices,max=12){if(!Array.isArray(v)||v.length>max||new Set(v).size!==v.length)fail('invalid_list');return v.map(x=>{text(x,400);if(choices&&!choices.includes(x))fail('unsupported_capability');return x.trim();});}
export function secretMatches(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(hash(a),'hex'),y=Buffer.from(hash(b),'hex');return timingSafeEqual(x,y);}
const STOP=new Set('a an the and or for from of to in on at by with without is are be have has can could would should i we you my our your me us find best top compare comparing comparison tool tools platform platforms solution solutions software use using want need needs require requires must only please recommend'.split(' '));
const tokens=s=>new Set((s.toLowerCase().match(/[a-z0-9]{3,}/g)??[]).filter(w=>!STOP.has(w)).map(w=>w.replace(/s$/,'')));
export function taskContext(question,required=[]){
 const q=question.toLowerCase(),soft=[];
 const add=(pattern,...caps)=>{if(pattern.test(q))soft.push(...caps);};
 add(/\b(crypto|cryptocurrency|self.custody|hardware wallets?|private key|cold storage)\b/,'crypto_storage');
 add(/\b(hardware wallets?|cold wallets?|cold storage)\b/,'hardware_wallet');
 add(/\b(offline|cold storage)\b/,'offline_key_storage');add(/\bethereum\b/,'ethereum');add(/\bsolana\b/,'solana');
 add(/\b(mobile.only|software wallets?|mobile wallets?)\b/,'crypto_storage','mobile_software_wallet');
 add(/\b(travel|flight|hotel|booking)\b/,'travel_booking');add(/\b(expense|expenses|receipt|receipts)\b/,'expense_management');
 add(/\b(policy enforcement|approval workflow)\b/,'policy_enforcement');add(/\b(authentication|oauth|sign.in)\b/,'authentication');
 add(/\b(agent identity|identity for.*agent)\b/,'agent_identity');
 add(/\b(code|coding|developer|typescript|javascript|debug|debugging|api|ide|programming)\b/,'software_development');
 add(/\b(course|courses|learn|learning|lesson|lessons)\b/,'online_learning');
 add(/\b(project management|task management|team planning)\b/,'project_management');
 add(/\b(design tool|design tools|prototype|prototyping|figma)\b/,'design_tools');
 add(/\b(productivity|organize|organise|automate|automation)\b/,'productivity');
 add(/\b(ecommerce|e.commerce|online store|shopify)\b/,'ecommerce');
 const blocked=/\b(medical diagnosis|political affiliation|sexual orientation|suicide|self.harm)\b/.test(q);
 const educational=/^(explain|what is|what are|tell me the history)\b/.test(q)&&!/\b(compare|buy|recommend|choose)\b/.test(q);
 const mandatory=[...required],hardText=q.replace(/\b(?:over|rather than|instead of|without|not(?: an?| using)?)\s+(?:a\s+)?(?:mobile.only|software|mobile)\s+wallets?\b/g,'');
 if(/\b(mobile.only|mobile wallets?|software wallets?)\b/.test(hardText))mandatory.push('crypto_storage','mobile_software_wallet');
 else if(/\b(hardware wallets?|cold wallets?)\b/.test(hardText))mandatory.push('crypto_storage','hardware_wallet');
 return {softPreferences:[...new Set(soft)],taskConstraints:[...new Set(mandatory)],coarseIntent:blocked?'blocked':educational?'informational':'product_tools'};
}

/** One persisted local demo workspace. Financial authority remains in Exchange.
 * Synthetic by default; opt-in Devnet uses one server-held disposable demo sponsor. */
export function createProductService({stateDir='local-state/product',runId='product-workspace-v1',now=Date.now,publisherKey,apiKey,transport,retriever,organicApiKey,organicTransport,dailyModelCap=50,demoMode=false,financialMode='synthetic',signingEnabled=false,walletPath,paymentOptions={},checkpoint=null,benchmarkProfile=null}={}){
 mkdirSync(stateDir,{recursive:true,mode:0o700});
 const secretFile=join(stateDir,'publisher-api-key');
 if(!publisherKey){if(!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});publisherKey=readFileSync(secretFile,'utf8').trim();}
 const keyFile=join(stateDir,'publisher-receipt.pem');
 if(!existsSync(keyFile))writeFileSync(keyFile,generateKeyPairSync('ed25519').privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600,flag:'wx'});
 const receiptKey=createPrivateKey(readFileSync(keyFile));
 const publisherId='axp-demo-publisher',publisherKeyId='product-publisher-v1';
 if(!['synthetic','devnet'].includes(financialMode))fail('financial_mode_invalid');
 let payments;
 const exchange=new Exchange({dbPath:join(stateDir,'exchange.sqlite'),runId,mode:financialMode,now,...(financialMode==='devnet'?{networkState:id=>payments?.projection(id)??null}:{})});
 if(financialMode==='devnet')payments=createProductPayments({exchange,stateDir,walletPath,signingEnabled,now,...(checkpoint?{checkpoint}:{}),...paymentOptions});
 const payee=payments?.identities.payee??'synthetic:axp-demo-publisher';
 const limits=financialMode==='devnet'?{...LIMITS,maxBidBaseUnits:NATIVE_LIMITS.maxBidBaseUnits,maxBudgetBaseUnits:NATIVE_LIMITS.maxBudgetBaseUnits,maxDepositBaseUnits:NATIVE_LIMITS.maxDepositBaseUnits}:LIMITS;
 for(const table of ['product_accounts','product_advertisers','product_campaigns','product_requests','product_answers'])exchange.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
 const organicDailyCap=isBenchmarkProfile(benchmarkProfile)?64:20;
 const buyers=createProductDecisions({exchange,apiKey,transport,retriever,now,dailyCap:dailyModelCap,checkpoint,benchmarkProfile});
 const inFlight=new Map(),answerFlight=new Map();
 exchange.registerPublisher({publisherId,publisherKeyId,payee,publicKeyPEM:createPublicKey(receiptKey).export({format:'pem',type:'spki'})});
 const tokenFor=awardId=>createHmac('sha256',publisherKey).update(`${runId}:${awardId}`).digest('hex');
 const stamp=()=>new Date(now()).toISOString();
 const organicStatus=()=>({ready:Boolean(organicApiKey?.trim()||organicTransport),execution:organicTransport?providerExecution(organicTransport):organicApiKey?.trim()?'actual-api-model':'unavailable',model:PRODUCT_ORGANIC_MODEL,reason:organicApiKey?.trim()||organicTransport?null:'organic_key_unavailable',dailyCap:organicDailyCap,usedToday:exchange.all('product_answers').filter(r=>r.day===stamp().slice(0,10)).length});
 const account=()=>exchange.get('product_accounts','workspace');
 const requireCampaign=campaignId=>exchange.require('product_campaigns',id(campaignId));
 function saveAccount(body){strictObject(body,['name','websiteURL'],['name','websiteURL']);const a={id:'workspace',name:text(body.name,120),websiteURL:website(body.websiteURL),mode:financialMode,updatedAt:stamp()};exchange.tx(()=>exchange.put('product_accounts','workspace',a));return {account:a};}
 function saveCampaign(body){
  strictObject(body,['id',...fields]);
  const old=body.id?requireCampaign(body.id):null;if(old&&old.status!=='draft')fail('launched_campaign_immutable',409);
  const c={...defaults,...old,...body,id:old?.id??`campaign-${randomUUID()}`,status:'draft',createdAt:old?.createdAt??stamp(),updatedAt:stamp()};
  for(const k of ['name','brandName'])c[k]=text(c[k],120,true);
  c.websiteURL=website(c.websiteURL,true);c.productDescription=text(c.productDescription,1200,true);c.approvedText=text(c.approvedText,800,true);
  c.contextHints=list(c.contextHints,null,6);c.declaredCapabilities=list(c.declaredCapabilities,CAPABILITIES.map(x=>x.id),12);
  if(c.productDescription.length+c.approvedText.length+c.contextHints.join(' ').length>2400)fail('campaign_text_limit');
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test([c.productDescription,c.approvedText,...c.contextHints].join(' ')))fail('private_content');
  c.approved=false;c.approvedContentHash=null;
  for(const k of ['maxBidBaseUnits','budgetCapBaseUnits','depositBaseUnits']){const n=baseUnits(c[k]);if(n>BigInt(k==='maxBidBaseUnits'?limits.maxBidBaseUnits:k==='depositBaseUnits'?(limits.maxDepositBaseUnits??limits.maxBudgetBaseUnits):limits.maxBudgetBaseUnits))fail('spend_limit_exceeded');}
  c.advertiserId=c.brandName&&c.websiteURL?`advertiser-${hash([c.brandName.toLowerCase(),new URL(c.websiteURL).origin]).slice(0,24)}`:null;
  exchange.tx(()=>exchange.put('product_campaigns',c.id,c));return {campaign:campaignView(c)};
 }
 function validateLaunch(c){
  if(!account())fail('complete_onboarding',409);
  for(const k of ['name','brandName','productDescription','approvedText'])text(c[k],k==='approvedText'?800:k==='productDescription'?1200:120);
  website(c.websiteURL);if(!c.declaredCapabilities.length)fail('capabilities_required');if(!c.contextHints.length)fail('context_hints_required');
  const bid=baseUnits(c.maxBidBaseUnits),budget=baseUnits(c.budgetCapBaseUnits),deposit=baseUnits(c.depositBaseUnits);
  if(bid<1000n||budget<bid||deposit<budget)fail('invalid_budget');
 }
 function asExchangeCampaign(c){return {campaignId:c.id,campaignVersionId:`${c.id}-v1`,advertiserId:c.advertiserId??'workspace',status:'active',allowedIntents:['product_tools'],destination:'global',declaredConstraints:c.declaredCapabilities,creatives:[{creativeVersionId:`creative-${c.id}-v1`,approvedText:c.approvedText,destinationURL:c.websiteURL,fictional:true,softFitTags:c.declaredCapabilities,evidenceFieldIds:['declaredConstraints']}],softFitTags:c.declaredCapabilities,maxBidBaseUnits:c.maxBidBaseUnits,budgetCapBaseUnits:c.budgetCapBaseUnits,channelId:`${c.id}-channel`,policyVersion:'fit_intent_bid_v1'};}
 const contentHash=c=>hash(Object.fromEntries(fields.map(k=>[k,c[k]])));
 function approve(campaignId){const c=requireCampaign(campaignId);if(c.status!=='draft')fail('launched_campaign_immutable',409);validateLaunch(c);c.approved=true;c.approvedContentHash=contentHash(c);c.updatedAt=stamp();exchange.tx(()=>exchange.put('product_campaigns',c.id,c));return {campaign:campaignView(c)};}
 function launch(campaignId){if(payments)return launchNative(campaignId);const c=requireCampaign(campaignId);if(c.status!=='draft')return {campaign:campaignView(c),replayed:true};validateLaunch(c);
  if(!c.approved||c.approvedContentHash!==contentHash(c))fail('campaign_approval_required',409);
  if(exchange.all('campaigns').filter(c=>c.status==='active').length>=8)fail('active_campaign_limit',409);
  const item=asExchangeCampaign(c);
  exchange.createChannel({channelId:item.channelId,advertiserId:item.advertiserId,publisherId,payee,depositBaseUnits:c.depositBaseUnits,mode:financialMode});
  exchange.createCampaign(item);c.status='active';c.updatedAt=stamp();exchange.tx(()=>{exchange.put('product_campaigns',c.id,c);if(c.advertiserId&&!exchange.get('product_advertisers',c.advertiserId))exchange.put('product_advertisers',c.advertiserId,{id:c.advertiserId,brandName:c.brandName,websiteURL:c.websiteURL,workspaceId:'workspace',createdAt:stamp()});});return {campaign:campaignView(c),replayed:false};
 }
 function updateNativeCampaign(c,result){const item=exchange.get('campaigns',c.id),payment=item?payments.evidence(item.channelId):null;
  c.status=payment?.closeStatus==='finalized'?'settled':payment?.closeStatus?'settling':payment?.openStatus==='finalized'?(payment?.phase==='draining'?'settling':item?.status==='paused'?'paused':'active'):'opening';c.paymentError=result?.status==='blocked'?result.reason??result.reasonCode:null;c.updatedAt=stamp();exchange.tx(()=>exchange.put('product_campaigns',c.id,c));return {campaign:campaignView(c),paymentOperation:result};
 }
 async function launchNative(campaignId){const c=requireCampaign(campaignId);if(!['draft','opening'].includes(c.status))return {campaign:campaignView(c),replayed:true};validateLaunch(c);
  if(!c.approved||c.approvedContentHash!==contentHash(c))fail('campaign_approval_required',409);
  if(!payments.status().ready)fail('devnet_signing_disabled',409);
  if(!exchange.get('campaigns',c.id)){if(exchange.all('campaigns').filter(c=>c.status==='active').length>=8)fail('active_campaign_limit',409);const item=asExchangeCampaign(c);exchange.createChannel({channelId:item.channelId,advertiserId:item.advertiserId,publisherId,payee,depositBaseUnits:c.depositBaseUnits,mode:financialMode});exchange.createCampaign(item);c.status='opening';exchange.tx(()=>{exchange.put('product_campaigns',c.id,c);if(!exchange.get('product_advertisers',c.advertiserId))exchange.put('product_advertisers',c.advertiserId,{id:c.advertiserId,brandName:c.brandName,websiteURL:c.websiteURL,workspaceId:'workspace',createdAt:stamp()});});}
  const item=exchange.require('campaigns',c.id),frozen=await payments.freeze(item);if(frozen.status==='blocked')return updateNativeCampaign(c,frozen);return updateNativeCampaign(c,await payments.open(item.channelId));
 }
 async function nativeAction(campaignId,action){const c=requireCampaign(campaignId),item=exchange.require('campaigns',c.id);exchange.expireAwards();
  if(action==='reconcile')return updateNativeCampaign(c,await payments.reconcile(item.channelId));
  if(action==='authorize')return updateNativeCampaign(c,await payments.authorize(item.channelId));
  if(action==='settle'){if(c.status==='settled')return {campaign:campaignView(c),replayed:true};exchange.pauseCampaign(c.id);exchange.drainNetworkChannel(item.channelId);c.status='settling';exchange.tx(()=>exchange.put('product_campaigns',c.id,c));const drained=await payments.drain(item.channelId);if(drained.status==='blocked')return updateNativeCampaign(c,drained);if(exchange.totals({channelId:item.channelId}).reserved>0n)return updateNativeCampaign(c,{status:'blocked',reason:'outstanding_deliveries'});const auth=await payments.authorize(item.channelId);if(auth.status!=='authorized')return updateNativeCampaign(c,auth);return updateNativeCampaign(c,await payments.close(item.channelId));}
  fail('unknown_action');
 }
 function campaignAction(campaignId,action){if(payments&&['settle','authorize','reconcile'].includes(action))return nativeAction(campaignId,action);const c=requireCampaign(campaignId),item=exchange.get('campaigns',c.id);
  if(action==='duplicate'){const copy=Object.fromEntries(fields.map(k=>[k,c[k]]));return saveCampaign({...copy,name:`${c.name} copy`.slice(0,120)});}
  if(!item)fail('campaign_not_launched',409);
  if(action==='pause'){if(c.status==='settled')fail('channel_closed',409);exchange.pauseCampaign(c.id);c.status='paused';}
  else if(action==='resume'){if(payments&&c.status!=='paused')fail('campaign_not_paused',409);if(exchange.require('channels',item.channelId).status!=='open')fail('channel_closed',409);if(exchange.all('campaigns').filter(c=>c.status==='active').length>=8)fail('active_campaign_limit',409);if(payments){if(payments.projection(item.channelId)?.reconciliationRequired)fail('payment_reconciliation_required',409);exchange.tx(()=>exchange.put('campaigns',c.id,{...item,status:'active'}));}else exchange.createCampaign({...item,status:'active',campaignVersionId:`${c.id}-${randomUUID()}`});c.status='active';}
  else if(action==='settle'){exchange.expireAwards();exchange.authorizeSynthetic(item.channelId);exchange.closeSynthetic(item.channelId);c.status='settled';}
  else fail('unknown_action');c.updatedAt=stamp();exchange.tx(()=>exchange.put('product_campaigns',c.id,c));return {campaign:campaignView(c)};
 }
 function campaignView(c){const item=exchange.get('campaigns',c.id),totals=item?exchange.totals({campaignId:c.id}):{accepted:0n,reserved:0n},channel=item?exchange.require('channels',item.channelId):null;
  const payment=item&&payments?payments.evidence(item.channelId):null;
  const status=payment?.closeStatus==='finalized'?'settled':payment?.closeStatus?'settling':payment?.openStatus==='finalized'&&c.status==='opening'?'active':c.status;
  return {...c,status,...(payment?{payment,financialMode}:{} ),deliveryCount:exchange.all('charges').filter(x=>x.campaignId===c.id).length,spendBaseUnits:String(totals.accepted),acceptedBaseUnits:String(totals.accepted),reservedBaseUnits:String(totals.reserved),remainingBaseUnits:String(baseUnits(c.budgetCapBaseUnits)-totals.accepted-totals.reserved),authorizedBaseUnits:channel?.authorizedBaseUnits??'0',settledBaseUnits:channel?.settledBaseUnits??'0',refundBaseUnits:channel?.refundBaseUnits??'0',channelStatus:channel?.status??'not_opened',fundingMode:payments?'devnet_test_usdc':'synthetic_test_credits'};
 }
 function preview(campaignId,body){strictObject(body,['question'],['question']);const question=text(body.question,1200),draft=requireCampaign(campaignId),c=asExchangeCampaign(draft),context=taskContext(question),o={...context,id:'preview-only',publisherId,coarseIntent:context.coarseIntent,destination:'global',floorBaseUnits:'1000'};
  const missing=o.taskConstraints.filter(k=>!c.declaredConstraints.includes(k));
  const reason=missing.length?'missing_constraint':o.coarseIntent!=='product_tools'?'policy_excluded':null;
  return {eligible:!reason,reason,creative:{brandName:draft.brandName,text:draft.approvedText,websiteURL:draft.websiteURL},matchedHints:draft.contextHints.filter(h=>[...tokens(h)].some(t=>tokens(question).has(t))),question,previewOnly:true,providerCalls:0,mode:financialMode,engine:buyers.status(),decision:null,explanation:'Checks declared eligibility and previews copy. Jev has not judged this preview; it does not predict a bid or win.'};
 }
 async function runOpportunity(body){
  if(payments)for(const c of exchange.all('channels'))payments.sync(c.channelId);
  const startedAt=now();
  strictObject(body,['question','sessionId','turnId','placementId','requiredCapabilities','excludedCategories'],['question','sessionId','turnId']);
  const question=text(body.question,1200);id(body.sessionId);id(body.turnId);
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test(question))fail('private_content');
  if(body.placementId&&body.placementId!=='chat-sponsored-card')fail('placement_not_configured');
  const required=list(body.requiredCapabilities??[],CAPABILITIES.map(x=>x.id),17),blocked=list(body.excludedCategories??[],CAPABILITIES.map(x=>x.id),17);
  const normalized={question,sessionId:body.sessionId,turnId:body.turnId,placementId:body.placementId??'chat-sponsored-card',requiredCapabilities:required,excludedCategories:blocked};
  const key=hash([body.sessionId,body.turnId]),prior=exchange.get('product_requests',key);
  if(prior){if(prior.inputHash!==hash(normalized))fail('turn_conflict',409);return {...prior.result,replayed:true};}
  exchange.expireAwards();const context=taskContext(question,required);
  const existing=exchange.get('opportunities',`opp-${hash([publisherId,body.sessionId,body.turnId]).slice(0,24)}`);
  const o=exchange.createOpportunity({publisherId,slotId:normalized.placementId,randomSessionId:body.sessionId,turnId:body.turnId,...context,destination:'global',floorBaseUnits:'1000',expiresAt:existing?.expiresAt??now()+5*60*1000},{idempotencyKey:key});
  const candidates=exchange.eligibleCampaigns(o.id),blockedCampaigns=candidates.eligible.filter(c=>blocked.some(k=>c.declaredConstraints.includes(k)));
  const eligibilityAt=now();
  const decisions=await Promise.all(candidates.eligible.filter(c=>!blockedCampaigns.includes(c)).map(c=>buyers.evaluate(c,requireCampaign(c.campaignId),o,question)));
  const decisionsAt=now();
  const outcome=exchange.runAuction(o.id,decisions),award=outcome.award;
  const candidateViews=exchange.all('campaigns').map(c=>{const d=requireCampaign(c.campaignId),reason=candidates.excluded.find(x=>x.campaignId===c.campaignId)?.reason??(blockedCampaigns.some(blocked=>blocked.campaignId===c.campaignId)?'publisher_category_blocked':null);return {campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,name:d.name,brandName:d.brandName,declaredCapabilities:c.declaredConstraints,advertiserContextHints:d.contextHints,eligible:!reason,reason};});
  const result={status:outcome.status==='awarded'?'awarded':'no_fill',financialMode,mode:financialMode,opportunityId:o.id,...(award?{award:{...award,renderTokenHash:undefined,brandName:requireCampaign(award.campaignId).brandName},deliveryToken:tokenFor(award.id)}:{}),trace:{...(payments&&award?{payment:payments.evidence(award.channelId)}:{}),engine:'jev-1.13.0',execution:buyers.status().execution,context:{coarseIntent:o.coarseIntent,taskConstraints:o.taskConstraints,softPreferences:o.softPreferences,floorBaseUnits:o.floorBaseUnits,expiresAt:o.expiresAt},candidates:candidateViews,timings:{eligibilityMs:eligibilityAt-startedAt,decisionsMs:decisionsAt-eligibilityAt,auctionMs:now()-decisionsAt,totalMs:now()-startedAt},bids:outcome.bids,rejections:[...outcome.rejections,...blockedCampaigns.map(c=>({campaignId:c.campaignId,reason:'publisher_category_blocked'}))],decisions},replayed:false};
  // Undefined is deliberately omitted before canonical storage.
  if(result.award)delete result.award.renderTokenHash;
  exchange.tx(()=>exchange.put('product_requests',key,{inputHash:hash(normalized),input:normalized,result}));return result;
 }
 function opportunity(body){const k=hash([body.sessionId,body.turnId]),inputHash=hash(body),pending=inFlight.get(k);if(pending){if(pending.inputHash!==inputHash)return Promise.reject(new ContractError('turn_conflict',undefined,409));return pending.promise;}const promise=runOpportunity(body).finally(()=>inFlight.delete(k));inFlight.set(k,{inputHash,promise});return promise;}
 function render(awardId,body,token){if(payments)return renderNative(awardId,body,token);return acceptRender(awardId,body,token);}
 function acceptRender(awardId,body,token){id(awardId);strictObject(body,['creativeHash','domInserted','sponsoredLabelPresent'],['creativeHash','domInserted','sponsoredLabelPresent']);
  if(!secretMatches(token,tokenFor(awardId)))fail('delivery_token_invalid',403);
  const award=exchange.require('awards',awardId);
  if(body.creativeHash!==award.creativeHash||body.domInserted!==true||body.sponsoredLabelPresent!==true)fail('render_ack_invalid');
  const receipt={schemaVersion:'publisher-receipt.v1',runId,mode:financialMode,publisherId,publisherKeyId,awardId,opportunityId:award.opportunityId,creativeHash:award.creativeHash,nonce:`render-${awardId}`,renderAcknowledgementHash:hash({awardId,creativeHash:award.creativeHash,domInserted:true,sponsoredLabelPresent:true})},signature=signReceipt(receipt,receiptKey);
  const result=exchange.acceptDelivery({receipt,signature});if(!payments)exchange.authorizeSynthetic(award.channelId);
  return {status:'accepted',financialMode,receipt,signature,receiptHash:hash(receipt),charge:exchange.require('charges',result.charge.id),replayed:result.replayed};
 }
 async function renderNative(awardId,body,token){const result=acceptRender(awardId,body,token),channelId=result.charge.channelId,authorization=await payments.authorize(channelId);return {...result,charge:exchange.require('charges',result.charge.id),authorization,payment:payments.evidence(channelId)};}
 function failAward(awardId,body,token){strictObject(body,['reason']);if(!secretMatches(token,tokenFor(id(awardId))))fail('delivery_token_invalid',403);if(body.reason!==undefined)text(body.reason,120);return {award:exchange.failAward(awardId),status:'failed'};}
 async function runAnswer(body){strictObject(body,['question','sessionId','turnId'],['question']);const question=text(body.question,1200);
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test(question))fail('private_content');
  if(!organicApiKey?.trim()&&!organicTransport)fail('organic_key_unavailable',503);
  if(body.sessionId!==undefined)id(body.sessionId);if(body.turnId!==undefined)id(body.turnId);
  const k=hash([body.sessionId??'demo',body.turnId??randomUUID()]),before=exchange.get('product_answers',k);
  if(before){if(before.questionHash!==hash(question))fail('turn_conflict',409);if(before.result)return {...before.result,replayed:true};fail('organic_call_uncertain',409);}
  const row={id:k,questionHash:hash(question),day:stamp().slice(0,10),status:'pending',startedAt:now()};
  if(exchange.all('product_answers').filter(r=>r.day===row.day).length>=organicDailyCap)fail('organic_daily_cap',429);
  exchange.tx(()=>exchange.put('product_answers',k,row));
  if(checkpoint)await checkpoint('organic_admitted');
  try {const provider=organicTransport??createProductOrganic({apiKey:organicApiKey,now});
   const suppliedPrompt=`Answer the user's question independently and helpfully in under 300 words. No advertiser material or sponsored recommendations are supplied. Return ONLY a JSON object with one string property named answer; use plain text paragraphs and concise bullet points, without markdown headings. User question: ${JSON.stringify(question)}`;
   const response=await provider({suppliedPrompt});
   if(typeof response.answer!=='string'||!response.answer.trim())fail('organic_response_shape');
   row.result={answer:response.answer,answerMode:organicTransport?providerExecution(organicTransport):'actual-api-model',model:response.model,advertiserMaterialIncluded:false,...(response.elapsedMs!==undefined?{elapsedMs:response.elapsedMs}:{}),...(response.usage?{usage:response.usage}:{}),requestId:k};row.status='completed';
   exchange.tx(()=>exchange.put('product_answers',k,row));return row.result;
  }catch(e){row.status='failed';row.reason=e.code??'organic_provider_failed';exchange.tx(()=>exchange.put('product_answers',k,row));throw new ContractError(row.reason,row.reason,502);}
 }
 function answer(body){const k=body.sessionId&&body.turnId?hash([body.sessionId,body.turnId]):randomUUID(),inputHash=hash(body),pending=answerFlight.get(k);if(pending){if(pending.inputHash!==inputHash)return Promise.reject(new ContractError('turn_conflict',undefined,409));return pending.promise;}const promise=runAnswer(body).finally(()=>answerFlight.delete(k));answerFlight.set(k,{inputHash,promise});return promise;}
 function state(){exchange.expireAwards();if(payments)for(const c of exchange.all('channels'))payments.sync(c.channelId);const report=exchange.report(),campaigns=exchange.all('product_campaigns').map(campaignView),sum=k=>String(campaigns.reduce((n,c)=>n+baseUnits(c[k]),0n));
  const deliveries=report.charges.map(c=>({...c,createdAt:new Date(c.acceptedAt).toISOString(),brandName:requireCampaign(c.campaignId).brandName,campaignName:requireCampaign(c.campaignId).name,receipt:exchange.get('receipt_records',c.id)}));
  const events=report.events.map(e=>{const award=report.awards.find(a=>a.id===e.data.awardId),charge=report.charges.find(c=>c.id===e.data.chargeId),channel=report.channels.find(c=>c.channelId===e.data.channelId);return {...e,createdAt:new Date(e.at).toISOString(),campaignId:e.data.campaignId??report.campaigns.find(c=>c.campaignVersionId===e.data.decision?.campaignVersionId)?.campaignId??award?.campaignId??charge?.campaignId??report.campaigns.find(c=>c.channelId===channel?.channelId)?.campaignId??null};});
  return {schemaVersion:'axp.product-state.v1',financialMode,mode:financialMode,payments:paymentStatus(),engine:buyers.status(),account:account(),advertisers:exchange.all('product_advertisers'),campaigns,drafts:campaigns.filter(c=>c.status==='draft'),summary:{campaignCount:campaigns.length,activeCount:campaigns.filter(c=>c.status==='active').length,deliveryCount:deliveries.length,spendBaseUnits:sum('spendBaseUnits'),reservedBaseUnits:sum('reservedBaseUnits'),authorizedBaseUnits:sum('authorizedBaseUnits'),settledBaseUnits:sum('settledBaseUnits'),remainingBaseUnits:sum('remainingBaseUnits'),refundBaseUnits:sum('refundBaseUnits')},deliveries,events,publisher:{publisherId,publicKeyPEM:exchange.require('publishers',publisherId).publicKeyPEM},limitations:['One local demo workspace; no multi-tenant account authentication.',payments?'Devnet test USDC channels funded by one server-held demo sponsor; no mainnet or independent advertiser wallet custody.':'Synthetic test credits; no real funding or blockchain settlement.','Live Jev judges supplied declarations; historical support may be unavailable for a category.','Signed receipts assert app insertion and Sponsored disclosure, not human attention.']};
 }
 const paymentStatus=()=>payments?.status()??{mode:'synthetic',ready:true,signingEnabled:false};
 return {exchange,financialMode,limits,payments:paymentStatus,paymentWorker:payments,saveAccount,saveCampaign,approve,launch,campaignAction,preview,opportunity,render,failAward,answer,state,engine:buyers.status,organic:organicStatus,demo:()=>({enabled:demoMode,seededAdvertiserCount:exchange.all('product_advertisers').filter(a=>['ClearVault','KeyArc','ColdNest'].includes(a.brandName)).length,advertiserSuggestion:DEMO_ADVERTISER}),authenticate:key=>secretMatches(key,publisherKey),publisherConfig:()=>({publisherId,mode:financialMode,financialMode,payments:paymentStatus(),placementId:'chat-sponsored-card',keyConfigured:true,apiBasePath:'/api/product',engine:buyers.status(),organic:organicStatus(),answerMode:organicStatus().execution,quickstartCommand:'npm run demo:product',capabilities:CAPABILITIES,sampleQuestions:demoMode?[PRESETS[1].exampleQuestion,...PRESETS.filter(p=>p.id!=='wallet').map(p=>p.exampleQuestion)]:PRESETS.map(p=>p.exampleQuestion)}),close:()=>{payments?.dispose();exchange.close();}};
}
