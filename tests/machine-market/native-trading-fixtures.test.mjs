// Ephemeral in-memory signing keys only; no private material is written to disk.
import { generateKeyPairSync,sign } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { base58Encode,encodeAuthorization,ZERO_KEY,ZERO_HASH } from '../../packages/machine-market/native/codec.mjs';
import { sha256,orderId,deriveMarketPda,deriveSeriesPda,deriveUnitPda,unitId } from '../../packages/machine-market/native/domain.mjs';
import { createTradingStore } from '../../packages/machine-market/native/trading.mjs';
export const hex=n=>Buffer.alloc(32,n).toString('hex');
export const pub=n=>base58Encode(Buffer.alloc(32,n));
let serial=100;
export function setup(t,{disk=false,transferable=1,maxTransfers=3,cap=8,useBySlot='1000',sponsoredPrice='100'}={}) {
  const keys={};for(const name of ['operator','issuer','buyerA','buyerB','sponsor','collector']){const pair=generateKeyPairSync('ed25519');keys[name]={...pair,key:base58Encode(pair.publicKey.export({type:'spki',format:'der'}).subarray(-32))};}
  const run={genesis:hex(31),program:pub(32),market:'',initializer:keys.operator.key,marketNonce:hex(33),matcher:keys.operator.key,gateway:keys.operator.key,collector:keys.collector.key,issuer:keys.issuer.key,buyerA:keys.buyerA.key,buyerB:keys.buyerB.key,sponsor:keys.sponsor.key};run.market=deriveMarketPda(run).address;
  const dir=disk?mkdtempSync(join(tmpdir(),'axp-native-js-')):null,filename=dir?join(dir,'trading.sqlite'):':memory:';
  let store=createTradingStore({filename,run});t.after(()=>{store.close();if(dir)rmSync(dir,{recursive:true,force:true});});
  for(const {key} of Object.values(keys))store.observeWallet({key,balance:'1000000',rent:'1000',contextSlot:'1',expectedVersion:0});
  const seriesId=hex(34),address=deriveSeriesPda({...run,seriesId}).address;
  store.registerSeries({address,seriesId,issuer:run.issuer,resourceHash:hex(35),versionHash:hex(36),format:0,useBySlot,sponsoredPrice,cap,maxTransfers,transferable,contentBytes:100,currentSlot:'1'});
  const units=Array.from({length:cap},(_,i)=>{const unitAddress=deriveUnitPda({...run,unitId:unitId({series:address,serial:i})}).address;return unitAddress;});
  // Avoid shadowing the outer immutable Series address.
  for(let i=0;i<units.length;i++)store.registerUnit({address:units[i],series:address,serial:i,currentSlot:'1'});
  const f={get store(){return store;},run,keys,series:address,units,filename,
    reopen(){store.close();store=createTradingStore({filename,run});return store;},
    envelope(actorName,value,key){const nonce=value.nonce??sha256(Buffer.from('fixture-nonce-'+serial++));const a={...value,domain:store.domain,actor:keys[actorName].key,nonce};if(['BookOrder','SponsoredConsent'].includes(a.kind))a.orderId=orderId(a);const bytes=encodeAuthorization(a);return {authorization:bytes.toString('base64'),signature:sign(null,bytes,keys[actorName].privateKey).toString('base64'),idempotencyKey:key??'request-'+serial};},
    order(actorName,{side=0,lane=0,unit=units[0],cursor='0',refundFace=lane?'100':'0',limit='100',min=0,tif=0,deadline='900',nonce}={},key){return f.envelope(actorName,{kind:'BookOrder',orderId:ZERO_HASH,side,lane,series:address,refundFace,exactUnit:side?unit:ZERO_KEY,expectedCursor:side?cursor:'0',limit,validUntilSlot:deadline,minRemainingAfter:min,tif,quantity:1,...(nonce?{nonce}:{})},key);},
    admit(env,at='2'){const actor=Object.values(keys).find(k=>{return Buffer.from(env.authorization,'base64').subarray(41,73).equals(k.publicKey.export({type:'spki',format:'der'}).subarray(-32));})?.key;return store.admitAuthorization(env,{currentSlot:at,walletContext:actor?store.captureWallet(actor):undefined});},
  };
  return f;
}
export function persist(f,matchId,at='3') {
  let op=f.store.getOperation(f.store.getMatch(matchId).operationId);op=f.store.prepareNativeOperation(op.id,{expectedVersion:op.version});
  return f.store.persistSignedAttempt(op.id,{expectedVersion:op.version,currentSlot:at,walletContext:f.store.captureWallet(f.store.getMatch(matchId).payer),prepared:{blockhash:pub(50),lastValidBlockHeight:'500',feeReserve:'100',rentReserve:'100'},signExact(_op,message){const signature=sign(null,message,f.keys.operator.privateKey).toString('base64');return {transaction:Buffer.concat([Buffer.from([1]),Buffer.from(signature,'base64'),message]).toString('base64'),signature};}});
}
export function resolve(f,matchId,at='4',{status='success',operatingFeesKnown=true}={}) {
  const m=f.store.getMatch(matchId),op=f.store.getOperation(m.operationId),deltas={[m.payer]:status==='success'?-BigInt(m.gross):0n};
  if(status==='success'&&m.fundingKind===1){deltas[m.seller]=(deltas[m.seller]??0n)+BigInt(m.gross)-BigInt(m.fee);deltas[f.run.collector]=(deltas[f.run.collector]??0n)+BigInt(m.fee);}
  if(operatingFeesKnown)deltas[f.run.matcher]=0n;
  const wallets=Object.entries(deltas).map(([key,n])=>{const w=f.store.captureWallet(key);return {key,balance:(BigInt(w.balance)+n).toString(),rent:w.rent};});
  return f.store.observeOperation(op.id,{expectedVersion:op.version,contextSlot:at,status,wallets,operatingFeesKnown,...(operatingFeesKnown?{operatingCost:{fee:'0',rent:'0'}}:{}),...(status==='success'?{receipt:{matchId:m.id,termsHash:m.termsHash,state:m.fundingKind===1?'SecondarySettled':'PrimaryEscrowed'}}:{failedSignature:op.attempt.signature,fundedMatchAbsent:true})});
}
export function trade(f,{seller='issuer',buyer='buyerA',unit=f.units[0],price='100',lane=0,cursor='0',face='100',at='2'}={}) {
  f.admit(f.order(seller,{side:1,unit,cursor,lane,refundFace:lane?face:'0',limit:price}),at);const order=f.admit(f.order(buyer,{lane,refundFace:lane?face:'0',limit:price}),at);persist(f,order.matchId,at);resolve(f,order.matchId,(BigInt(at)+1n).toString());return f.store.getMatch(order.matchId);
}
