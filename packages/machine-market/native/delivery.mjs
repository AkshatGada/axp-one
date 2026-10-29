/** Owner-bound immutable delivery; no key handles, signing, external source fetches or timers. */
import {canonical} from '../../contracts/index.mjs';
import {reject,decimal,ZERO_HASH,ZERO_KEY,ACCOUNT_SCHEMAS} from './codec.mjs';
import {domainHash,sha256,deliveryIdentity,canonicalResponse,verifyAuthorization,operationId} from './domain.mjs';
import {validateNativeAccount} from './observations.mjs';
const TYPES=['text/plain','text/markdown','application/json','text/csv'];
function strictJSON(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))reject('INVALID_INPUT');return;}
 if(Array.isArray(value)){value.forEach(strictJSON);return;}
 if(value&&Object.getPrototypeOf(value)===Object.prototype){for(const [key,item]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))reject('INVALID_INPUT');strictJSON(item);}return;}
 reject('INVALID_INPUT');
}
export function canonicalSponsorPacket(packet){
 let value=packet;
 if(typeof packet==='string'){try{value=JSON.parse(packet);}catch{reject('INVALID_INPUT');}if(canonical(value)!==packet)reject('INVALID_INPUT');}
 strictJSON(value);const bytes=Buffer.from(canonical(value),'utf8');if(bytes.length>2048)reject('CAPACITY');return {packet:value,bytes,packetHash:sha256(bytes)};
}
/** Explicit immutable, owned fixture material; no filesystem/env or external fetch fallback. */
export function createImmutableSources({sources=[],packets=[]}={}){
 if(!Array.isArray(sources)||sources.length>16||!Array.isArray(packets)||packets.length>16)reject('CAPACITY');
 const content=new Map(),sponsor=new Map();
 for(const item of sources){if(content.has(item.series))reject('NONCE_CONFLICT');const bytes=Buffer.from(item.content);if(bytes.length>16384)reject('CAPACITY');content.set(item.series,bytes);}
 for(const item of packets){if(sponsor.has(item.campaignId))reject('NONCE_CONFLICT');sponsor.set(item.campaignId,canonicalSponsorPacket(item.packet).bytes.toString('utf8'));}
 return Object.freeze({getSeriesSource(series){const bytes=content.get(series);return bytes?Buffer.from(bytes):null;},getSponsorPacket(id){return sponsor.get(id)??null;}});
}
export function prepareDeliveryResponse({run,unit,series,content,sponsorPacket,campaignId,packetHash}){
 if(unit.state!==2||unit.series!==series.address||unit.owner===undefined||unit.requestHash===ZERO_HASH)reject('PENDING_SETTLEMENT');
 if(content===null||content===undefined)reject('INCOMPATIBLE');
 const bytes=typeof content==='string'?Buffer.from(content,'utf8'):Buffer.from(content??[]);if(bytes.length>16384||bytes.length!==series.contentBytes||sha256(bytes)!==series.resourceHash)reject('INCOMPATIBLE');
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{reject('INCOMPATIBLE');}
 let sponsored=null;
 if(unit.sponsored===1){const packet=canonicalSponsorPacket(sponsorPacket);if(packet.packetHash!==packetHash||typeof campaignId!=='string'||!/^[0-9a-f]{64}$/.test(campaignId))reject('INCOMPATIBLE');sponsored={campaignId,packetHash,packet:packet.packet,disclosure:'Sponsored'};}
 else if(sponsorPacket!==undefined||campaignId!==undefined||packetHash!==undefined)reject('INCOMPATIBLE');
 const domain=domainHash(run),deliveryId=deliveryIdentity({domain,unit:unit.address,requestHash:unit.requestHash});
 const response={schema:'axp.delivery.v2',domain,unit:unit.address,owner:unit.owner,requestHash:unit.requestHash,deliveryId,resourceHash:series.resourceHash,versionHash:series.versionHash,contentType:TYPES[series.format],content:text,sponsored};
 if(!response.contentType)reject('INVALID_INPUT');return {...canonicalResponse(response),response,deliveryId};
}
export function verifyDeliveryRelease({run,unit,series,responseBytes,envelope,currentSlot,primary}){
 if(unit.state!==3||unit.series!==series.address)reject('PENDING_SETTLEMENT');
 const auth=verifyAuthorization({...envelope,domain:domainHash(run),allowedActors:[unit.owner],kind:'ReadDelivery',currentSlot});const a=auth.value;
 if(a.unit!==unit.address||a.requestHash!==unit.requestHash||a.consumedCursor!==unit.cursor)reject('INVALID_AUTH');
 const bytes=Buffer.from(responseBytes??[]);if(bytes.length>65536||sha256(bytes)!==unit.responseHash)reject('RUN_MISMATCH');
 let response;try{response=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{reject('RUN_MISMATCH');}
 if(canonical(response)!==bytes.toString('utf8')||response.schema!=='axp.delivery.v2'||response.domain!==domainHash(run)||response.unit!==unit.address||response.owner!==unit.owner||response.requestHash!==unit.requestHash||response.resourceHash!==series.resourceHash||response.versionHash!==series.versionHash||response.contentType!==TYPES[series.format]||typeof response.content!=='string'||sha256(Buffer.from(response.content))!==series.resourceHash||response.deliveryId!==deliveryIdentity({domain:response.domain,unit:unit.address,requestHash:unit.requestHash}))reject('RUN_MISMATCH');
 if(unit.sponsored===1){if(!primary||response.sponsored?.campaignId!==primary.campaignId||response.sponsored?.packetHash!==primary.packetHash)reject('RUN_MISMATCH');if(response.sponsored?.disclosure!=='Sponsored'||canonicalSponsorPacket(response.sponsored.packet).packetHash!==response.sponsored.packetHash)reject('RUN_MISMATCH');}else if(response.sponsored!==null)reject('RUN_MISMATCH');
 // Deliberately no Series.useBy check: this retrieves the same committed response.
 return {bytes,response,responseHash:unit.responseHash,deliveryId:response.deliveryId};
}

/** repository is the core FULL-sync private-response/source adapter; execute never runs inside its transaction. */
export function createDeliveryCoordinator({run,rpc,repository,privateStore,admitOperation,executeOperation}){
 if(!repository||!privateStore||typeof privateStore.preparePrivateResponse!=='function'||typeof privateStore.readPrivateResponse!=='function'||typeof admitOperation!=='function'||typeof executeOperation!=='function')reject('INVALID_INPUT');
 async function nativeUnit(address){
  const first=await rpc.accounts([run.market,address]);validateNativeAccount(first.accounts[0],run,{kind:'Market'});const u=validateNativeAccount(first.accounts[1],run,{kind:'Unit'});if(!u)reject('INVALID_INPUT');
  const view=await rpc.accounts([run.market,address,u.series,...(u.primaryMatch&&u.primaryMatch!==ZERO_KEY?[u.primaryMatch]:[])],{minContextSlot:first.contextSlot});
  validateNativeAccount(view.accounts[0],run,{kind:'Market'});const unit=validateNativeAccount(view.accounts[1],run,{kind:'Unit'}),series=validateNativeAccount(view.accounts[2],run,{kind:'Series'});if(!unit||!series||unit.series!==series.address)reject('RUN_MISMATCH');
  const primary=view.accounts[3]?validateNativeAccount(view.accounts[3],run,{kind:'Match'}):null;if(unit.state!==0&&(!primary||primary.tradeKind===1||primary.unit!==unit.address||primary.gross!==unit.refundFace))reject('RUN_MISMATCH');return {unit,series,primary,contextSlot:view.contextSlot};
 }
 return Object.freeze({
  async process({unit:address,requestHash,idempotencyKey}){
   await rpc.inspectRun();const current=await nativeUnit(address),{unit,series,primary}=current;
   if(unit.requestHash!==requestHash)reject('INVALID_AUTH');if(unit.state!==2)reject('PENDING_SETTLEMENT');
   let prepared;let failed=false;const original=typeof privateStore.getPrivateResponse==='function'?privateStore.getPrivateResponse({unit:address,requestHash}):null;
   if(typeof privateStore.observeNativeUnit==='function'){const wire=value=>Object.fromEntries(['kind','state','market',...ACCOUNT_SCHEMAS[value.kind].fields.map(([name])=>name)].map(name=>[name,value[name]]));privateStore.observeNativeUnit({address,unit:wire(unit),unitOwner:run.program,primaryMatch:wire(primary),receiptOwner:run.program,contextSlot:current.contextSlot,verified:true});}
   try{
    const source=original?original.response.content:repository.getSeriesSource(series.address);const sponsor=unit.sponsored?(original?original.response.sponsored?.packet:repository.getSponsorPacket(primary.campaignId)):null;
    prepared=prepareDeliveryResponse({run,unit,series,content:source,...(unit.sponsored?{sponsorPacket:sponsor,campaignId:primary.campaignId,packetHash:primary.packetHash}:{})});
   }catch(error){if(!['INCOMPATIBLE','INVALID_INPUT'].includes(error?.code))throw error;failed=true;}
   if(original&&(!prepared||original.owner!==unit.owner||original.responseHash!==prepared.responseHash||!Buffer.from(original.bytes).equals(prepared.bytes)))reject('RUN_MISMATCH');
   if(!failed){
    const durable=privateStore.preparePrivateResponse({unit:address,owner:unit.owner,requestHash,response:prepared.response});
    if(!durable||durable.responseHash!==prepared.responseHash||durable.deliveryId!==prepared.deliveryId)reject('RUN_MISMATCH');
   }
   const currentSlot=await rpc.slot();if(BigInt(currentSlot)>=BigInt(unit.lockDeadlineSlot))reject('EXPIRED');
   const type=failed?'RefundFailure':'FinalizeDelivery';
   if(!failed){const bytes=Buffer.from(prepared.responseBytes??prepared.bytes??[]);if(sha256(bytes)!==prepared.responseHash)reject('RUN_MISMATCH');}
   const id=operationId({domain:domainHash(run),type,unit:address,requestHash});
   const operation=await admitOperation({id,type,unit:address,requestHash,expectedLockedCursor:unit.cursor,...(!failed?{responseHash:prepared.responseHash}:{}),idempotencyKey,contextSlot:current.contextSlot,accounts:{gateway:run.gateway,market:run.market,series:series.address,unit:address,primaryMatch:unit.primaryMatch,...(failed?{refundRecipient:unit.sponsored?unit.sponsorRefundKey:unit.owner}:{issuer:series.issuer,collector:run.collector})}});
   // Core has already committed the private response; only now may it enter its durable signing fence.
   return executeOperation(operation.id);
  },
  async monitor({units}){if(!Array.isArray(units)||units.length>64)reject('CAPACITY');const results=[];for(const address of units){const {unit}=await nativeUnit(address);if(unit.state===2)results.push(await this.process({unit:address,requestHash:unit.requestHash,idempotencyKey:'monitor-'+unit.requestHash}));}return results;},
  async read(envelope){
   await rpc.inspectRun();const auth=verifyAuthorization({...envelope,domain:domainHash(run),kind:'ReadDelivery'});const current=await nativeUnit(auth.value.unit);
   const currentSlot=await rpc.slot();const saved=privateStore.readPrivateResponse(envelope,{currentSlot});if(!saved)reject('PENDING_SETTLEMENT');
   return verifyDeliveryRelease({run,...current,responseBytes:saved.responseBytes??saved.bytes,envelope,currentSlot});
  },
 });
}
