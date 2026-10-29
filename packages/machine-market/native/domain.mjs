import { createHash, createPublicKey, verify } from 'node:crypto';
import { canonical } from '../../contracts/index.mjs';
import { reject, decimal, unsigned, hex32, publicKeyBytes, base58Encode, canonicalBase64, decodeAuthorization, encodeInstruction, ZERO_KEY, ZERO_HASH } from './codec.mjs';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const h=(...parts)=>sha256(Buffer.concat(parts));
const u64=value=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(decimal(value));return b;};
const u16=value=>{const b=Buffer.alloc(2);b.writeUInt16LE(unsigned(value,16));return b;};
export function domainHash({genesis,program,market}) {return h(Buffer.from('AXP-MM-V2'),hex32(genesis),publicKeyBytes(program),publicKeyBytes(market));}
export function orderId({domain,actor,nonce}) {return h(hex32(domain),publicKeyBytes(actor),hex32(nonce));}
export function unitId({series,serial}) {return h(publicKeyBytes(series),u16(serial));}
export function matchId({domain,buyOrderId,sellOrderId,unit,expectedCursor,gross,fundingKind}) {unsigned(fundingKind,8);if(fundingKind>2)reject('INVALID_INPUT');return h(hex32(domain),hex32(buyOrderId),hex32(sellOrderId),publicKeyBytes(unit),u64(expectedCursor),u64(gross),Buffer.from([fundingKind]));}
const TAGS={Init:0,IssueSeries:1,RegisterUnit:2,FundMatch:3,Fund:3,StartDelivery:4,FinalizeDelivery:5,RefundFailure:6,TimeoutRefund:7,ExpireUnused:8};
export function operationId(value) {
  const {domain,type}=value;if(!Object.hasOwn(TAGS,type))reject('INVALID_INPUT');let identity;
  if(type==='Init')identity=hex32(value.marketNonce);
  else if(type==='IssueSeries')identity=hex32(value.seriesId);
  else if(type==='RegisterUnit')identity=hex32(value.unitId);
  else if(type==='FundMatch'||type==='Fund')identity=hex32(value.matchId);
  else if(type==='ExpireUnused')identity=Buffer.concat([publicKeyBytes(value.unit),u64(value.preterminalCursor)]);
  else identity=Buffer.concat([publicKeyBytes(value.unit),hex32(value.requestHash)]);
  return h(hex32(domain),Buffer.from([TAGS[type]]),identity);
}
export function seriesTermsHash(s) {
  validateTransferPolicy(s);unsigned(s.format,8);unsigned(s.cap,16);unsigned(s.contentBytes,32);
  return h(publicKeyBytes(s.issuer),hex32(s.resourceHash),hex32(s.versionHash),Buffer.from([s.format]),u64(s.useBySlot),u64(s.sponsoredPrice),u16(s.cap),Buffer.from([s.maxTransfers,s.transferable]),(()=>{const b=Buffer.alloc(4);b.writeUInt32LE(s.contentBytes);return b;})());
}
export function fundTermsHash(instruction,semanticKeys) {
  if(instruction?.type!=='Fund'||!Array.isArray(semanticKeys)||semanticKeys.length!==11)reject('INVALID_INPUT');return h(encodeInstruction(instruction),...semanticKeys.map(publicKeyBytes));
}
export function validateTransferPolicy(s) {
  if(!((s.transferable===0&&s.maxTransfers===0)||(s.transferable===1&&Number.isInteger(s.maxTransfers)&&s.maxTransfers>=1&&s.maxTransfers<=3)))reject('INVALID_INPUT');return true;
}
export function effectiveRemaining({series,unit,fundingKind,minRemainingAfter}) {
  validateTransferPolicy(series);unsigned(minRemainingAfter,8);if(minRemainingAfter>3||![0,1,2].includes(fundingKind))reject('INVALID_INPUT');
  let after=0;
  if(fundingKind===1){if(series.transferable!==1||unit.sponsored!==0||!Number.isInteger(unit.transferCount)||unit.transferCount<0||unit.transferCount>=series.maxTransfers)reject('INCOMPATIBLE');after=unit.transferCount+1;}
  if(fundingKind===2&&minRemainingAfter!==0)reject('INCOMPATIBLE');
  const remaining=(fundingKind===2||series.transferable===0||unit?.sponsored===1)?0:series.maxTransfers-after;
  if(remaining<minRemainingAfter)reject('INCOMPATIBLE');return remaining;
}
export function compatible({bid,ask,series,unit,currentSlot}) {
  if(bid.side!==0||ask.side!==1||bid.series!==ask.series||bid.lane!==ask.lane||bid.refundFace!==ask.refundFace||decimal(bid.limit)<decimal(ask.limit))return false;
  if(decimal(bid.validUntilSlot)<=decimal(currentSlot)||decimal(ask.validUntilSlot)<=decimal(currentSlot)||decimal(series.useBySlot)<=decimal(currentSlot))return false;
  if(ask.exactUnit!==unit.address||decimal(ask.expectedCursor)!==decimal(unit.cursor)||unit.owner!==ask.actor)return false;
  if(bid.lane===0&&(unit.state!=='IssuerOpen'||bid.refundFace!=='0'))return false;
  if(bid.lane===1&&(unit.state!=='FundedOpen'||bid.refundFace!==unit.refundFace))return false;
  try {effectiveRemaining({series,unit,fundingKind:bid.lane,minRemainingAfter:bid.minRemainingAfter});return true;}catch{return false;}
}
export function verifyAuthorization({authorization,signature,domain,allowedActors,kind,currentSlot}) {
  let bytes,sig,value;
  try {bytes=canonicalBase64(authorization);if(bytes.length>512)reject('INVALID_AUTH');sig=canonicalBase64(signature,64);value=decodeAuthorization(bytes);}catch{reject('INVALID_AUTH');}
  if(value.domain!==domain || (kind&&value.kind!==kind) || (allowedActors&&!allowedActors.includes(value.actor)))reject('INVALID_AUTH');
  const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKeyBytes(value.actor)]),format:'der',type:'spki'});
  if(!verify(null,bytes,key,sig))reject('INVALID_AUTH');
  if(['BookOrder','SponsoredConsent'].includes(value.kind)&&value.orderId!==orderId(value))reject('INVALID_AUTH');
  if(currentSlot!==undefined&&value.validUntilSlot!==undefined&&decimal(currentSlot)>=decimal(value.validUntilSlot))reject('EXPIRED');
  return {value,bytes,authHash:sha256(bytes)};
}
export const fee=gross=>{const n=decimal(gross);if(n===0n||n>1_000_000_000n)reject('INVALID_INPUT');return (n/100n).toString();};
export function aggregateDeltas(effects) {
  const result={};for(const {key,delta} of effects){publicKeyBytes(key);if(typeof delta!=='bigint')reject('INVALID_INPUT');result[key]=(result[key]??0n)+delta;}return Object.fromEntries(Object.entries(result).map(([key,n])=>[key,n.toString()]));
}
export function deliveryIdentity({domain,unit,requestHash}) {return h(hex32(domain),Buffer.from('delivery'),publicKeyBytes(unit),hex32(requestHash));}
export function canonicalResponse(value) {const encoded=Buffer.from(canonical(value));if(encoded.length>65536)reject('CAPACITY');return {bytes:encoded,responseHash:sha256(encoded)};}

// Solana's canonical PDA calculation: SHA256(seeds || program || marker), descending
// bump, excluding compressed Ed25519 points. No SDK/global wallet configuration.
const P=(1n<<255n)-19n,mod=n=>((n%P)+P)%P;
function pow(a,n){let v=1n;for(a=mod(a);n;n>>=1n,a=mod(a*a))if(n&1n)v=mod(v*a);return v;}
const D=mod(-121665n*pow(121666n,P-2n));
export function isEd25519Point(bytes) {
  bytes=Buffer.from(bytes);if(bytes.length!==32)return false;const sign=bytes[31]>>7;bytes[31]&=127;
  let y=0n;for(let i=31;i>=0;i--)y=(y<<8n)+BigInt(bytes[i]);if(y>=P)return false;
  const y2=mod(y*y),den=mod(D*y2+1n);if(den===0n)return false;const x2=mod((y2-1n)*pow(den,P-2n));let x=pow(x2,(P+3n)/8n);
  if(mod(x*x)!==x2)x=mod(x*pow(2n,(P-1n)/4n));if(mod(x*x)!==x2||(x===0n&&sign===1))return false;return true;
}
export function findProgramAddress(seeds,program) {
  if(!Array.isArray(seeds)||seeds.length>15||seeds.some(s=>!(s instanceof Uint8Array)||s.length>32))reject('INVALID_INPUT');
  for(let bump=255;bump>=0;bump--){const bytes=Buffer.from(h(...seeds.map(Buffer.from),Buffer.from([bump]),publicKeyBytes(program),Buffer.from('ProgramDerivedAddress')),'hex');if(!isEd25519Point(bytes))return {address:base58Encode(bytes),bump};}reject('INVALID_INPUT');
}
export function deriveMarketPda({program,initializer,marketNonce}) {return findProgramAddress([Buffer.from('axp-mkt-v2'),publicKeyBytes(initializer),hex32(marketNonce)],program);}
export function deriveSeriesPda({program,market,seriesId}) {return findProgramAddress([Buffer.from('axp-series-v2'),publicKeyBytes(market),hex32(seriesId)],program);}
export function deriveUnitPda({program,market,unitId}) {return findProgramAddress([Buffer.from('axp-unit-v2'),publicKeyBytes(market),hex32(unitId)],program);}
export function deriveMatchPda({program,market,matchId}) {return findProgramAddress([Buffer.from('axp-match-v2'),publicKeyBytes(market),hex32(matchId)],program);}
export function deriveOrderUsePda({program,market,actor,nonce}) {return findProgramAddress([Buffer.from('axp-order-v2'),publicKeyBytes(market),publicKeyBytes(actor),hex32(nonce)],program);}

const META_RULES={
  Init:[['initializer',1,1],['market',0,1],['System',0,0]],
  IssueSeries:[['issuer',1,0],['matcher',1,1],['market',0,1],['series',0,1],['System',0,0]],
  RegisterUnit:[['issuer',1,0],['matcher',1,1],['market',0,1],['series',0,1],['unit',0,1],['System',0,0]],
  Fund:[['payer',1,1],['beneficiary',1,0],['seller',1,1],['matcher',1,1],['collector',0,1],['market',0,1],['series',0,0],['unit',0,1],['match',0,1],['buyUse',0,1],['sellUse',0,1],['System',0,0]],
  StartDelivery:[['owner',1,1],['market',0,0],['series',0,0],['unit',0,1]],
  FinalizeDelivery:[['gateway',1,1],['market',0,0],['series',0,0],['unit',0,1],['primaryMatch',0,1],['issuer',0,1],['collector',0,1]],
  RefundFailure:[['gateway',1,1],['market',0,0],['series',0,0],['unit',0,1],['primaryMatch',0,1],['refundRecipient',0,1]],
  TimeoutRefund:[['caller',1,1],['market',0,0],['series',0,0],['unit',0,1],['primaryMatch',0,1],['refundRecipient',0,1]],
  ExpireUnused:[['caller',1,1],['market',0,0],['series',0,0],['unit',0,1],['primaryMatch',0,1],['issuer',0,1],['collector',0,1]],
};
export function instructionMetas({type,fundingKind,accounts}) {
  if(!Object.hasOwn(META_RULES,type))reject('INVALID_INPUT');const rules=[...META_RULES[type]];
  if(type==='Fund'){if(![0,1,2].includes(fundingKind))reject('INVALID_INPUT');if(fundingKind===1)rules.push(['primaryMatch',0,0]);}
  const fields=rules.map(([name])=>name).filter(name=>name!=='System');if(!accounts||Object.keys(accounts).length!==fields.length||Object.keys(accounts).some(name=>!fields.includes(name)))reject('INVALID_INPUT');
  return rules.map(([role,isSigner,isWritable])=>{const pubkey=role==='System'?ZERO_KEY:accounts[role];publicKeyBytes(pubkey);return {role,pubkey,isSigner:!!isSigner,isWritable:!!isWritable};});
}
export function deduplicateMetas(metas) {
  const keys=new Map();for(const meta of metas){publicKeyBytes(meta.pubkey);const prior=keys.get(meta.pubkey);if(prior){prior.isSigner ||= meta.isSigner;prior.isWritable ||= meta.isWritable;}else keys.set(meta.pubkey,{pubkey:meta.pubkey,isSigner:meta.isSigner,isWritable:meta.isWritable});}return [...keys.values()];
}
