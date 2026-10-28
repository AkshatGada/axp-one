/** Fixed synthetic acceptance plan, not another matching engine. No signing/network. */
import {encodeAuthorization,ZERO_KEY,ZERO_HASH} from '../native/codec.mjs';
import {domainHash,orderId,operationId,matchId,deriveMatchPda,deriveOrderUsePda,sha256} from '../native/domain.mjs';
import {buildLegacyMessage} from '../native/transaction.mjs';
import {prepareDeliveryResponse,canonicalSponsorPacket} from '../native/delivery.mjs';
import {DEADLINE_POLICY,validateApplicationSeal} from './deadlines.mjs';
import {validateManifest,hash,deepFreeze} from './manifest.mjs';
import {compileLegacy,createAccount,transfer,budgetInstructions,meta,u32,u64,LOADER,SYSTEM,RENT,CLOCK,demand} from './legacy.mjs';
const plans=new WeakSet();
export const isDevnetPlan=value=>plans.has(value);
export function createDevnetPlan({manifest,elf,content,allowFixture=false,applicationSeal=null}){
 const resolved=validateManifest(manifest,{allowFixture});manifest=resolved.manifest;const {run,series,units,programData}=resolved,i=manifest.identities,d=domainHash(run),source=Buffer.from(content);elf=Buffer.from(elf);demand(elf.length===manifest.elf.bytes&&sha256(elf)===manifest.elf.sha256,'ELF_IDENTITY');demand(source.length===manifest.source.contentBytes&&sha256(source)===manifest.source.resourceHash,'SOURCE_IDENTITY');
 const deferred=manifest.deadlinePolicy===DEADLINE_POLICY,sealed=deferred&&applicationSeal?validateApplicationSeal(applicationSeal,{manifestHash:resolved.manifestHash,program:i.program}):null;demand(deferred||applicationSeal===null,'APPLICATION_SEAL');const applicationReady=!deferred||!!sealed,useBySlot=deferred?sealed?.useBySlot??'1':manifest.useBySlot,readValidUntilSlot=deferred?sealed?.readValidUntilSlot??'2':manifest.readValidUntilSlot;
 const nonce=(a,b)=>hash({runId:manifest.runId,case:a,step:b}),auths=new Map(),actions=new Map(),packet=canonicalSponsorPacket({schema:'axp.sponsor.packet.v1',disclosure:'Sponsored',message:'Owned synthetic fixture; a negative assessment is allowed.'}),campaignId=nonce('D2','campaign');
 function auth(id,actor,value){const n=nonce(id,'authorization'),v={...value,domain:d,actor,nonce:n};if(['BookOrder','SponsoredConsent'].includes(v.kind))v.orderId=orderId({domain:d,actor,nonce:n});const message=encodeAuthorization(v);const a={id,actor,value:v,message:message.toString('base64'),authHash:sha256(message)};auths.set(id,a);return a;}
 const add=(id,a)=>{demand(!actions.has(id),'PLAN_DUPLICATE');actions.set(id,{id,...a});};
 add('buffer:create',{kind:'buffer-create'});for(let offset=0;offset<elf.length;offset+=960)add('write:'+String(offset/960).padStart(3,'0'),{kind:'write',offset,length:Math.min(960,elf.length-offset)});add('deploy:new',{kind:'deploy'});
 for(const role of ['issuer','buyerA','buyerB','sponsor','collector']){add('fixture:fund:'+role,{kind:'fixture-fund',role,amount:role==='collector'?'1000000':'20000000'});add('fixture:sweep:'+role,{kind:'fixture-sweep',role});}
 add('market:init',{kind:'market',instruction:{type:'Init',operationId:operationId({domain:d,type:'Init',marketNonce:run.marketNonce}),marketNonce:run.marketNonce,genesis:run.genesis,matcher:run.matcher,gateway:run.gateway,collector:run.collector,issuer:run.issuer,buyerA:run.buyerA,buyerB:run.buyerB,sponsor:run.sponsor},accounts:{initializer:run.initializer,market:run.market},rentKinds:['market']});
 const terms={seriesId:manifest.seriesId,resourceHash:manifest.source.resourceHash,versionHash:manifest.source.versionHash,format:0,useBySlot,sponsoredPrice:'10000',cap:3,maxTransfers:3,transferable:1,contentBytes:source.length};
 add('series:issue',{kind:'market',instruction:{type:'IssueSeries',operationId:operationId({domain:d,type:'IssueSeries',seriesId:terms.seriesId}),...terms},accounts:{issuer:run.issuer,matcher:run.matcher,market:run.market,series},rentKinds:['series']});
 for(const u of units)add(u.id+':register',{kind:'market',unit:u.id,instruction:{type:'RegisterUnit',operationId:operationId({domain:d,type:'RegisterUnit',unitId:u.unitId}),seriesId:terms.seriesId,serial:u.serial},accounts:{issuer:run.issuer,matcher:run.matcher,market:run.market,series,unit:u.address},rentKinds:['unit']});
 const mandate=auth('D2:campaign',run.sponsor,{kind:'SponsorMandate',campaignId,series,packetHash:packet.packetHash,budget:'10000',perGrant:'10000',maxGrants:1,eligibleCount:1,eligibleKeys:[run.buyerA,ZERO_KEY,ZERO_KEY,ZERO_KEY],validUntilSlot:useBySlot,version:1});
 const trades=[];
 for(const u of units){const count=u.id==='D2'?1:2;let primary;
  for(let index=0;index<count;index++){
   const sponsored=u.id==='D2',seller=index?run.buyerA:run.issuer,buyer=index?run.buyerB:run.buyerA,gross=index?'15000':'10000',id=u.id+':fund:'+index,kind=sponsored?2:index;
   const common={kind:'BookOrder',lane:index,series,refundFace:index?'10000':'0',validUntilSlot:useBySlot,minRemainingAfter:0,tif:0,quantity:1};
   const ask=auth(id+':ask',seller,{...common,side:1,exactUnit:u.address,expectedCursor:String(index),limit:gross});
   const buy=sponsored?auth(id+':consent',buyer,{kind:'SponsoredConsent',campaignId,campaignVersion:1,series,unit:u.address,cursor:'0',amount:gross,sponsor:run.sponsor,packetHash:packet.packetHash,validUntilSlot:useBySlot,assessment:1,nontransferable:1}):auth(id+':bid',buyer,{...common,side:0,exactUnit:ZERO_KEY,expectedCursor:'0',limit:(BigInt(gross)+2000n).toString()});
   const mid=matchId({domain:d,buyOrderId:buy.value.orderId,sellOrderId:ask.value.orderId,unit:u.address,expectedCursor:String(index),gross,fundingKind:kind}),match=deriveMatchPda({...run,matchId:mid}).address;
   const instruction={type:'Fund',operationId:operationId({domain:d,type:'FundMatch',matchId:mid}),matchId:mid,fundingKind:kind,expectedCursor:String(index),expectedRefundFace:index?'10000':'0',gross,buyerLimit:sponsored?gross:buy.value.limit,sellerLimit:gross,buyerValidUntil:useBySlot,sellerValidUntil:useBySlot,minRemainingAfter:0,buyNonce:buy.value.nonce,sellNonce:ask.value.nonce,buyAuthHash:buy.authHash,sellAuthHash:ask.authHash,packetHash:sponsored?packet.packetHash:ZERO_HASH,campaignId:sponsored?campaignId:ZERO_HASH};
   const accounts={market:run.market,series,unit:u.address,match,payer:sponsored?run.sponsor:buyer,beneficiary:buyer,seller,matcher:run.matcher,collector:run.collector,buyUse:deriveOrderUsePda({...run,actor:buyer,nonce:buy.value.nonce}).address,sellUse:deriveOrderUsePda({...run,actor:seller,nonce:ask.value.nonce}).address,...(index?{primaryMatch:primary}: {})};
   add(id,{kind:'market',unit:u.id,instruction,accounts,rentKinds:['match','orderUse','orderUse'],authIds:[...(sponsored?[mandate.id]:[]),ask.id,buy.id],gross,primary:sponsored||index===0?gross:'0',campaign:sponsored?campaignId:null,expectedOwner:seller,expectedCursor:String(index)});trades.push(id);if(!index)primary=match;
  }
  const owner=u.id==='D2'?run.buyerA:run.buyerB,cursor=u.id==='D2'?'1':'2',request=auth(u.id+':delivery',owner,{kind:'DeliveryRequest',unit:u.address,expectedCursor:cursor,series,resourceHash:terms.resourceHash}),requestHash=request.authHash;
  add(u.id+':start',{kind:'market',unit:u.id,instruction:{type:'StartDelivery',operationId:operationId({domain:d,type:'StartDelivery',unit:u.address,requestHash}),expectedCursor:cursor,requestNonce:request.value.nonce,requestHash},accounts:{owner,market:run.market,series,unit:u.address},authIds:[request.id],expectedOwner:owner,expectedCursor:cursor,rentKinds:[]});
  const lockedCursor=(BigInt(cursor)+1n).toString(),final=u.id==='D0',response=final?prepareDeliveryResponse({run,unit:{state:2,series,owner,address:u.address,requestHash},series:{address:series,...terms},content:source}):null,type=final?'FinalizeDelivery':'RefundFailure';
  add(u.id+':terminal',{kind:'market',unit:u.id,instruction:{type,operationId:operationId({domain:d,type,unit:u.address,requestHash}),expectedLockedCursor:lockedCursor,requestHash,...(final?{responseHash:response.responseHash}:{})},accounts:{gateway:run.gateway,market:run.market,series,unit:u.address,primaryMatch:primary,...(final?{issuer:run.issuer,collector:run.collector}:{refundRecipient:u.id==='D2'?run.sponsor:owner})},rentKinds:[],response:response?{bytes:response.bytes.toString('base64'),responseHash:response.responseHash,owner,unit:u.address,requestHash}:null,expectedCursor:lockedCursor,expectedOwner:owner});
  add(u.id+':timeout',{kind:'market',conditional:true,unit:u.id,instruction:{type:'TimeoutRefund',operationId:operationId({domain:d,type:'TimeoutRefund',unit:u.address,requestHash}),expectedLockedCursor:lockedCursor,requestHash},accounts:{caller:run.matcher,market:run.market,series,unit:u.address,primaryMatch:primary,refundRecipient:u.id==='D2'?run.sponsor:owner},rentKinds:[],expectedCursor:lockedCursor,expectedOwner:owner});
  auth(u.id+':read',owner,{kind:'ReadDelivery',unit:u.address,requestHash,consumedCursor:(BigInt(lockedCursor)+1n).toString(),validUntilSlot:readValidUntilSlot});if(final)auth('D0:read-old-owner',run.buyerA,{kind:'ReadDelivery',unit:u.address,requestHash,consumedCursor:'4',validUntilSlot:readValidUntilSlot});
 }
 for(const name of ['wrong-start-owner','missing-owner-signature','foreign-unit-account','stale-start-cursor']){
  const unit=units[0],owner=name==='wrong-start-owner'?run.buyerA:run.buyerB,cursor=name==='stale-start-cursor'?'1':'2',target=name==='foreign-unit-account'?run.collector:unit.address,request=auth('probe:'+name,owner,{kind:'DeliveryRequest',unit:target,expectedCursor:cursor,series,resourceHash:terms.resourceHash});
  add('probe:'+name,{kind:'probe',unit:'D0',instruction:{type:'StartDelivery',operationId:operationId({domain:d,type:'StartDelivery',unit:target,requestHash:request.authHash}),expectedCursor:cursor,requestNonce:request.value.nonce,requestHash:request.authHash},accounts:{owner,market:run.market,series,unit:target},expectedCustomError:name==='stale-start-cursor'?6:2,missingOwner:name==='missing-owner-signature',rentKinds:[],expectedOwner:run.buyerB,expectedCursor:'2'});
 }
 add('buffer:close-aborted',{kind:'buffer-close',conditional:true});
 function get(id){const a=actions.get(id);demand(a,'UNDECLARED_ACTION');demand(applicationReady||['buffer-create','write','deploy','buffer-close'].includes(a.kind),'APPLICATION_DEADLINES_NOT_SEALED');return structuredClone(a);}
 function build(id,{blockhash,rent,fee='0',sweepBalance}={}){
  const a=get(id);let built,cost={fee:String(fee),rent:'0',fixture:'0',gross:a.gross??'0',primary:a.primary??'0'},payer=i.payer;
  if(a.kind==='market'||a.kind==='probe'){
   built=buildLegacyMessage({program:run.program,feePayer:payer,blockhash,instruction:a.instruction,accounts:a.accounts});if(a.missingOwner){const b=Buffer.from(built.message,'base64');demand(b[0]===2,'PROBE_HEADER');b[0]=1;built={...built,message:b.toString('base64'),messageHash:sha256(b),requiredSigners:built.requiredSigners.slice(0,1)};}
   cost.rent=(a.rentKinds??[]).reduce((n,k)=>n+BigInt(rent[k]),0n).toString();
  }else{let ix=[];
   if(a.kind==='buffer-create'){cost.rent=String(rent.programData);ix=[createAccount(payer,i.buffer,cost.rent,37+elf.length,LOADER),{program:LOADER,accounts:[meta(i.buffer,false,true),meta(payer)],data:u32(0)},...budgetInstructions()];}
   if(a.kind==='write')ix=[{program:LOADER,accounts:[meta(i.buffer,false,true),meta(payer,true)],data:Buffer.concat([u32(1),u32(a.offset),u64(a.length),elf.subarray(a.offset,a.offset+a.length)])},...budgetInstructions()];
   if(a.kind==='deploy'){cost.rent=String(rent.program);ix=[createAccount(payer,i.program,cost.rent,36,LOADER),{program:LOADER,accounts:[meta(payer,true,true),meta(programData,false,true),meta(i.program,false,true),meta(i.buffer,false,true),meta(RENT),meta(CLOCK),meta(SYSTEM),meta(payer,true)],data:Buffer.concat([u32(2),u64(elf.length)])},...budgetInstructions()];}
   if(a.kind==='fixture-fund'){cost.fixture=a.amount;ix=[transfer(payer,i[a.role],a.amount)];}
   if(a.kind==='fixture-sweep'){payer=i[a.role];demand(sweepBalance!==undefined&&BigInt(sweepBalance)>BigInt(fee),'SWEEP_BALANCE');ix=[transfer(payer,i.payer,(BigInt(sweepBalance)-BigInt(fee)).toString())];}
   if(a.kind==='buffer-close')ix=[{program:LOADER,accounts:[meta(i.buffer,false,true),meta(payer,false,true),meta(payer,true)],data:u32(5)}];
   built=compileLegacy({payer,blockhash,instructions:ix});
  }
  return {id,kind:a.kind,manifestHash:resolved.manifestHash,...built,blockhash,cost,actionHash:hash(a),feePayer:payer,expectedCustomError:a.expectedCustomError??null};
 }
 const result=deepFreeze({...resolved,applicationReady,applicationSeal:sealed,terms:deepFreeze(terms),packet:deepFreeze(packet.packet),packetHash:packet.packetHash,campaignId,writeIds:[...actions.values()].filter(a=>a.kind==='write').map(a=>a.id),tradeIds:trades,actionIds:[...actions.keys()],authorizationIds:[...auths.keys()],get,authorization(id){demand(applicationReady,'APPLICATION_DEADLINES_NOT_SEALED');const a=auths.get(id);demand(a,'UNDECLARED_AUTHORIZATION');return structuredClone(a);},build,sourceHash:sha256(source)});plans.add(result);return result;
}
