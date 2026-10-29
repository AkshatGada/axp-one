/** Packet03 exact byte codecs. No network, SDK, wallet or implicit JSON defaults. */
export const PACKET_SHA256='d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c';
export const ZERO_HASH='0'.repeat(64);
export const ZERO_KEY='1'.repeat(32);
export const U64_MAX=(1n<<64n)-1n;
const BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const ERROR_CODES=Object.freeze(['INVALID_INPUT','INVALID_AUTH','NONCE_CONFLICT','INCOMPATIBLE','INSUFFICIENT_AVAILABLE','STALE_CURSOR','SELF_TRADE','EXPIRED','PENDING_SETTLEMENT','TERMINAL_CONFLICT','ALREADY_USED','CAPACITY','RUN_MISMATCH','PREFUNDED_PDA_UNSUPPORTED','RECIPIENT_STATE']);
export class NativeError extends Error {
  constructor(code) { super(code);this.code=code;this.customCode=ERROR_CODES.indexOf(code)+1;this.status=({INVALID_INPUT:400,INVALID_AUTH:403,EXPIRED:410,CAPACITY:503,RUN_MISMATCH:503})[code]??409; }
}
export const reject=code=>{throw new NativeError(code);};
export function strict(value,fields) { if(!value || Object.getPrototypeOf(value)!==Object.prototype || Object.keys(value).length!==fields.length || Object.keys(value).some(k=>!fields.includes(k))) reject('INVALID_INPUT'); }
export function decimal(value) { if(typeof value!=='string' || !/^(0|[1-9][0-9]*)$/.test(value) || value.length>20 || BigInt(value)>U64_MAX) reject('INVALID_INPUT');return BigInt(value); }
export function unsigned(value,bits) { if(!Number.isInteger(value) || value<0 || value>2**bits-1) reject('INVALID_INPUT');return value; }
export function hex32(value) { if(typeof value!=='string' || !/^[0-9a-f]{64}$/.test(value)) reject('INVALID_INPUT');return Buffer.from(value,'hex'); }
export function base58Encode(bytes) {
  bytes=Buffer.from(bytes); if(bytes.length!==32) reject('INVALID_INPUT');
  let n=BigInt('0x'+bytes.toString('hex')),out='';while(n){out=BASE58[Number(n%58n)]+out;n/=58n;}
  for(const byte of bytes){if(byte!==0)break;out='1'+out;}return out;
}
export function publicKeyBytes(value) {
  if(typeof value!=='string' || value.length<32 || value.length>44) reject('INVALID_INPUT');
  let n=0n;for(const char of value){const digit=BASE58.indexOf(char);if(digit<0)reject('INVALID_INPUT');n=n*58n+BigInt(digit);}
  let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
  let body=n===0n?Buffer.alloc(0):Buffer.from(hex,'hex'),zeros=0;for(const char of value){if(char!=='1')break;zeros++;}
  const bytes=Buffer.concat([Buffer.alloc(zeros),body]);if(bytes.length!==32 || base58Encode(bytes)!==value)reject('INVALID_INPUT');return bytes;
}
export function canonicalBase64(value,expectedLength) {
  if(typeof value!=='string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) reject('INVALID_INPUT');
  const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value || (expectedLength!==undefined && bytes.length!==expectedLength))reject('INVALID_INPUT');return bytes;
}
const f=(name,type)=>[name,type];
const parse=description=>description.split(',').map(entry=>entry.split(':'));
export const AUTH_SCHEMAS=Object.freeze({
  BookOrder:{tag:1,fields:parse('orderId:h,side:1,lane:1,series:k,refundFace:8,exactUnit:k,expectedCursor:8,limit:8,validUntilSlot:8,minRemainingAfter:1,tif:1,quantity:1')},
  Cancel:{tag:2,fields:parse('originalOrderId:h,originalNonce:h,originalAuthHash:h,expectedOrderVersion:8')},
  SponsorMandate:{tag:3,fields:parse('campaignId:h,series:k,packetHash:h,budget:8,perGrant:8,maxGrants:2,eligibleCount:1,eligibleKeys:keys4,validUntilSlot:8,version:2')},
  SponsoredConsent:{tag:4,fields:parse('orderId:h,campaignId:h,campaignVersion:2,series:k,unit:k,cursor:8,amount:8,sponsor:k,packetHash:h,validUntilSlot:8,assessment:1,nontransferable:1')},
  DeliveryRequest:{tag:5,fields:parse('unit:k,expectedCursor:8,series:k,resourceHash:h')},
  ReadDelivery:{tag:6,fields:parse('unit:k,requestHash:h,consumedCursor:8,validUntilSlot:8')},
});
export const INSTRUCTION_SCHEMAS=Object.freeze({
  Init:{tag:0,fields:parse('marketNonce:h,genesis:h,matcher:k,gateway:k,collector:k,issuer:k,buyerA:k,buyerB:k,sponsor:k')},
  IssueSeries:{tag:1,fields:parse('seriesId:h,resourceHash:h,versionHash:h,format:1,useBySlot:8,sponsoredPrice:8,cap:2,maxTransfers:1,transferable:1,contentBytes:4')},
  RegisterUnit:{tag:2,fields:parse('seriesId:h,serial:2')},
  Fund:{tag:3,fields:parse('matchId:h,expectedCursor:8,buyNonce:h,sellNonce:h,buyAuthHash:h,sellAuthHash:h,gross:8,buyerLimit:8,sellerLimit:8,buyerValidUntil:8,sellerValidUntil:8,minRemainingAfter:1,fundingKind:1,expectedRefundFace:8,packetHash:h,campaignId:h')},
  StartDelivery:{tag:4,fields:parse('expectedCursor:8,requestNonce:h,requestHash:h')},
  FinalizeDelivery:{tag:5,fields:parse('expectedLockedCursor:8,requestHash:h,responseHash:h')},
  RefundFailure:{tag:6,fields:parse('expectedLockedCursor:8,requestHash:h')},
  TimeoutRefund:{tag:7,fields:parse('expectedLockedCursor:8,requestHash:h')},
  ExpireUnused:{tag:8,fields:parse('expectedCursor:8')},
});
export const ACCOUNT_SCHEMAS=Object.freeze({
  Market:{tag:1,length:393,states:[1],fields:parse('initializer:k,marketNonce:h,genesis:h,matcher:k,gateway:k,feeCollector:k,issuer:k,buyerA:k,buyerB:k,sponsor:k,feeBps:2,maxTransfers:1,maxSeries:2,maxUnits:2,maxMatches:2,issuedSeries:2,issuedUnits:2,fundedMatches:2,leaseSlots:8,maxGross:8')},
  Series:{tag:2,length:229,states:[1],fields:parse('seriesId:h,issuer:k,resourceHash:h,versionHash:h,termsHash:h,format:1,useBySlot:8,sponsoredPrice:8,cap:2,issued:2,maxTransfers:1,transferable:1,contentBytes:4')},
  Unit:{tag:3,length:383,states:[0,1,2,3,4,5],fields:parse('series:k,unitId:h,serial:2,owner:k,cursor:8,transferCount:1,sponsored:1,primaryMatch:k,latestMatch:k,refundFace:8,sponsorRefundKey:k,requestHash:h,lockStartCursor:8,lockStartSlot:8,lockDeadlineSlot:8,terminalOpHash:h,responseHash:h,terminalSlot:8,terminalReason:1')},
  Match:{tag:4,length:619,states:[1,2,3,4],fields:parse('matchId:h,unit:k,series:k,expectedCursor:8,fundedCursor:8,payer:k,beneficiary:k,seller:k,buyNonce:h,sellNonce:h,buyAuthHash:h,sellAuthHash:h,gross:8,fee:8,tradeKind:1,packetHash:h,campaignId:h,fundTermsHash:h,fundedSlot:8,terminalOpHash:h,terminalSlot:8,rentReserve:8,primaryClaimFace:8,terminalRecipient:k,previousMatch:k')},
  OrderUse:{tag:5,length:178,states:[1],fields:parse('actor:k,nonce:h,authHash:h,match:k,consumedSlot:8')},
});
for(const collection of [AUTH_SCHEMAS,INSTRUCTION_SCHEMAS,ACCOUNT_SCHEMAS])for(const schema of Object.values(collection)){schema.fields.forEach(Object.freeze);Object.freeze(schema.fields);if(schema.states)Object.freeze(schema.states);Object.freeze(schema);}
const size=t=>({h:32,k:32,keys4:128})[t]??Number(t);
export function fieldOffsets(family,name) {
  const schemas={authorization:AUTH_SCHEMAS,instruction:INSTRUCTION_SCHEMAS,account:ACCOUNT_SCHEMAS}[family],schema=schemas?.[name];if(!schema)reject('INVALID_INPUT');
  let offset={authorization:105,instruction:34,account:42}[family];const offsets={};for(const [name,t] of schema.fields){offsets[name]=offset;offset+=size(t);}return {offsets,length:offset};
}
function encodeField(value,type) {
  if(type==='h')return hex32(value);if(type==='k')return publicKeyBytes(value);
  if(type==='keys4'){if(!Array.isArray(value)||value.length!==4)reject('INVALID_INPUT');return Buffer.concat(value.map(publicKeyBytes));}
  const n=Number(type),out=Buffer.alloc(n);if(n===8)out.writeBigUInt64LE(decimal(value));else {unsigned(value,n*8);out.writeUIntLE(value,0,n);}return out;
}
function decodeField(bytes,type,offset) {
  if(type==='h')return bytes.subarray(offset,offset+32).toString('hex');if(type==='k')return base58Encode(bytes.subarray(offset,offset+32));
  if(type==='keys4')return Array.from({length:4},(_,i)=>base58Encode(bytes.subarray(offset+i*32,offset+(i+1)*32)));
  const n=Number(type);return n===8?bytes.readBigUInt64LE(offset).toString():bytes.readUIntLE(offset,n);
}
function enumField(value,field,allowed) {if(Object.hasOwn(value,field)&&!allowed.includes(value[field]))reject('INVALID_INPUT');}
function semantic(value,family) {
  for(const field of ['side','lane','tif','transferable','sponsored'])enumField(value,field,[0,1]);
  enumField(value,'format',[0,1,2,3]);enumField(value,'assessment',[0,1,2]);enumField(value,'minRemainingAfter',[0,1,2,3]);enumField(value,'fundingKind',[0,1,2]);enumField(value,'tradeKind',[0,1,2]);enumField(value,'terminalReason',[0,1,2,3,4]);
  if(value.kind==='BookOrder'){
    if(value.quantity!==1 || (value.lane===0 && value.refundFace!=='0') || (value.lane===1 && value.refundFace==='0'))reject('INVALID_INPUT');
    if(value.side===0 && (value.exactUnit!==ZERO_KEY || value.expectedCursor!=='0'))reject('INVALID_INPUT');
    if(value.side===1 && value.exactUnit===ZERO_KEY)reject('INVALID_INPUT');
  }
  if(value.kind==='SponsorMandate'){
    if(value.version!==1 || value.eligibleCount<1 || value.eligibleCount>4 || value.maxGrants<1)reject('INVALID_INPUT');
    const used=value.eligibleKeys.slice(0,value.eligibleCount);if(used.includes(ZERO_KEY)||new Set(used).size!==used.length||value.eligibleKeys.slice(value.eligibleCount).some(k=>k!==ZERO_KEY))reject('INVALID_INPUT');
  }
  if(value.kind==='SponsoredConsent' && (value.nontransferable!==1 || value.campaignVersion!==1 || value.cursor!=='0'))reject('INVALID_INPUT');
  if(value.type==='IssueSeries' || (family==='account'&&value.kind==='Series')){
    if(!((value.transferable===0&&value.maxTransfers===0)||(value.transferable===1&&value.maxTransfers>=1&&value.maxTransfers<=3)) || value.cap<1 || value.cap>64 || value.contentBytes>16384)reject('INVALID_INPUT');
    if(Object.hasOwn(value,'issued')&&value.issued>value.cap)reject('INVALID_INPUT');
  }
  if(family==='account'&&value.kind==='Unit') {
    if(value.transferCount>3)reject('INVALID_INPUT');
    const zero=fields=>{for(const name of fields){const type=ACCOUNT_SCHEMAS.Unit.fields.find(([n])=>n===name)[1];if(value[name]!==({h:ZERO_HASH,k:ZERO_KEY,'8':'0','1':0})[type])reject('INVALID_INPUT');}};
    if(value.state===0)zero(['cursor','transferCount','sponsored','primaryMatch','latestMatch','refundFace','sponsorRefundKey']);
    if(value.state===0||value.state===1)zero(['requestHash','lockStartCursor','lockStartSlot','lockDeadlineSlot']);
    if(value.state<=2)zero(['terminalOpHash','responseHash','terminalSlot','terminalReason']);
    if(value.sponsored===0&&value.sponsorRefundKey!==ZERO_KEY)reject('INVALID_INPUT');
  }
  if(family==='account'&&value.kind==='Match'&&value.state===1&&(value.terminalOpHash!==ZERO_HASH||value.terminalSlot!=='0'||value.terminalRecipient!==ZERO_KEY))reject('INVALID_INPUT');
  if(family==='account'&&value.kind==='Market'){
    for(const [key,n] of Object.entries({feeBps:100,maxTransfers:3,maxSeries:16,maxUnits:64,maxMatches:256,leaseSlots:'150',maxGross:'1000000000'}))if(value[key]!==n)reject('INVALID_INPUT');
    if(value.issuedSeries>16||value.issuedUnits>64||value.fundedMatches>256)reject('INVALID_INPUT');
  }
}
function encode(value,family) {
  const nameField=family==='instruction'?'type':'kind',name=value?.[nameField],schemas={authorization:AUTH_SCHEMAS,instruction:INSTRUCTION_SCHEMAS,account:ACCOUNT_SCHEMAS}[family],schema=Object.hasOwn(schemas,name)?schemas[name]:null;if(!schema)reject('INVALID_INPUT');
  const common=family==='authorization'?['domain','actor','nonce']:family==='instruction'?['operationId']:['state','market'];
  strict(value,[nameField,...common,...schema.fields.map(([name])=>name)]);
  let header;
  if(family==='authorization')header=Buffer.concat([Buffer.from('AXPAUTH2'),Buffer.from([schema.tag]),hex32(value.domain),publicKeyBytes(value.actor),hex32(value.nonce)]);
  else if(family==='instruction')header=Buffer.concat([Buffer.from([schema.tag,2]),hex32(value.operationId)]);
  else {if(!schema.states.includes(value.state))reject('INVALID_INPUT');header=Buffer.concat([Buffer.from('AXPMKT02'),Buffer.from([schema.tag,value.state]),publicKeyBytes(value.market)]);}
  const encoded=Buffer.concat([header,...schema.fields.map(([name,type])=>encodeField(value[name],type))]);semantic(value,family);return encoded;
}
function decode(input,family) {
  if(!Buffer.isBuffer(input)&&!(input instanceof Uint8Array))reject('INVALID_INPUT');const bytes=Buffer.from(input),schemas={authorization:AUTH_SCHEMAS,instruction:INSTRUCTION_SCHEMAS,account:ACCOUNT_SCHEMAS}[family];
  const tagOffset=family==='instruction'?0:8;if(bytes.length<=tagOffset)reject('INVALID_INPUT');const found=Object.entries(schemas).find(([,s])=>s.tag===bytes[tagOffset]);if(!found)reject('INVALID_INPUT');const [name,schema]=found;
  const {length,offsets}=fieldOffsets(family,name);if(bytes.length!==length)reject('INVALID_INPUT');
  let result;
  if(family==='authorization'){if(!bytes.subarray(0,8).equals(Buffer.from('AXPAUTH2')))reject('INVALID_INPUT');result={kind:name,domain:bytes.subarray(9,41).toString('hex'),actor:base58Encode(bytes.subarray(41,73)),nonce:bytes.subarray(73,105).toString('hex')};}
  else if(family==='instruction'){if(bytes[1]!==2)reject('INVALID_INPUT');result={type:name,operationId:bytes.subarray(2,34).toString('hex')};}
  else {if(!bytes.subarray(0,8).equals(Buffer.from('AXPMKT02'))||!schema.states.includes(bytes[9]))reject('INVALID_INPUT');result={kind:name,state:bytes[9],market:base58Encode(bytes.subarray(10,42))};}
  for(const [name,type] of schema.fields)result[name]=decodeField(bytes,type,offsets[name]);semantic(result,family);return result;
}
export const encodeAuthorization=value=>encode(value,'authorization');
export const decodeAuthorization=bytes=>decode(bytes,'authorization');
export const encodeInstruction=value=>encode(value,'instruction');
export const decodeInstruction=bytes=>decode(bytes,'instruction');
export const encodeAccount=value=>encode(value,'account');
export const decodeAccount=bytes=>decode(bytes,'account');
