/** Canonical single-instruction Solana legacy transactions, Packet03 ABI. */
import { createPublicKey,verify } from 'node:crypto';
import { canonicalBase64,publicKeyBytes,base58Encode,encodeInstruction,decodeInstruction,reject } from './codec.mjs';
import { instructionMetas,deduplicateMetas,sha256 } from './domain.mjs';
const bytes=value=>Buffer.isBuffer(value)?Buffer.from(value):canonicalBase64(value);
const short=n=>{if(!Number.isInteger(n)||n<0||n>65535)reject('INVALID_INPUT');const out=[];do{let b=n&127;n>>>=7;if(n)b|=128;out.push(b);}while(n);return Buffer.from(out);};
function reader(input){const b=bytes(input);let at=0;return {bytes:b,take(n){if(!Number.isInteger(n)||n<0||at+n>b.length)reject('INVALID_INPUT');const v=b.subarray(at,at+n);at+=n;return v;},num(){const start=at;let n=0,shift=0;for(let i=0;i<3;i++){if(at>=b.length)reject('INVALID_INPUT');const x=b[at++];n|=(x&127)<<shift;if(!(x&128)){if(n>65535||!b.subarray(start,at).equals(short(n)))reject('INVALID_INPUT');return n;}shift+=7;}reject('INVALID_INPUT');},done(){if(at!==b.length)reject('INVALID_INPUT');},get offset(){return at;}};}
export function signatureBase58(value){const b=bytes(value);if(b.length!==64)reject('INVALID_INPUT');const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=BigInt('0x'+b.toString('hex')),out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}for(const v of b){if(v)break;out='1'+out;}return out;}
export function buildLegacyMessage({program,feePayer,blockhash,instruction,accounts}) {
  publicKeyBytes(program);publicKeyBytes(feePayer);publicKeyBytes(blockhash);
  const metas=instructionMetas({type:instruction.type,fundingKind:instruction.fundingKind,accounts});
  if(metas.some(m=>m.pubkey===program)||feePayer===program)reject('INVALID_INPUT');
  const merged=deduplicateMetas([{pubkey:feePayer,isSigner:true,isWritable:true},...metas,{pubkey:program,isSigner:false,isWritable:false}]);
  const group=m=>m.isSigner?(m.isWritable?0:1):(m.isWritable?2:3);
  const ordered=merged.map((m,index)=>({...m,index})).sort((a,b)=>group(a)-group(b)||a.index-b.index);
  if(ordered.length>32)reject('CAPACITY');
  const requiredSigners=ordered.filter(m=>m.isSigner).map(m=>m.pubkey);if(requiredSigners.length>4||requiredSigners[0]!==feePayer)reject('CAPACITY');
  const roSigned=ordered.filter(m=>m.isSigner&&!m.isWritable).length,roUnsigned=ordered.filter(m=>!m.isSigner&&!m.isWritable).length;
  const accountKeys=ordered.map(m=>m.pubkey),index=key=>{const n=accountKeys.indexOf(key);if(n<0)reject('INVALID_INPUT');return n;},data=encodeInstruction(instruction);
  const message=Buffer.concat([Buffer.from([requiredSigners.length,roSigned,roUnsigned]),short(ordered.length),...accountKeys.map(publicKeyBytes),publicKeyBytes(blockhash),short(1),Buffer.from([index(program)]),short(metas.length),Buffer.from(metas.map(m=>index(m.pubkey))),short(data.length),data]);
  if(short(requiredSigners.length).length+64*requiredSigners.length+message.length>1232)reject('CAPACITY');
  return {message:message.toString('base64'),messageHash:sha256(message),requiredSigners,accountKeys,metas};
}
export function parseLegacyMessage(input){
  const r=reader(input),header=[...r.take(3)],[required,roSigned,roUnsigned]=header;if(required<1||required>4||(required&128)||roSigned>=required)reject('INVALID_INPUT');
  const n=r.num();if(n<required||n>32||roUnsigned>n-required)reject('INVALID_INPUT');const accountKeys=Array.from({length:n},()=>base58Encode(r.take(32)));if(new Set(accountKeys).size!==n)reject('INVALID_INPUT');const blockhash=base58Encode(r.take(32));if(r.num()!==1)reject('INVALID_INPUT');const programIndex=r.take(1)[0],count=r.num(),accountIndices=[...r.take(count)],data=r.take(r.num());if(programIndex>=n||accountIndices.some(i=>i>=n))reject('INVALID_INPUT');r.done();const instruction=decodeInstruction(data);
  return {message:r.bytes.toString('base64'),messageHash:sha256(r.bytes),header,accountKeys,requiredSigners:accountKeys.slice(0,required),blockhash,program:accountKeys[programIndex],programIndex,accountIndices,data:data.toString('base64'),instruction};
}
export function serializeTransaction({message,signatures}){const parsed=parseLegacyMessage(message);if(!Array.isArray(signatures)||signatures.length!==parsed.requiredSigners.length)reject('INVALID_INPUT');const sigs=signatures.map(s=>{const b=bytes(s);if(b.length!==64)reject('INVALID_INPUT');return b;}),transaction=Buffer.concat([short(sigs.length),...sigs,bytes(message)]);if(transaction.length>1232)reject('CAPACITY');return transaction.toString('base64');}
export function parseTransaction(transaction){const r=reader(transaction);if(r.bytes.length>1232)reject('CAPACITY');const count=r.num();if(count<1||count>4)reject('INVALID_INPUT');const signatures=Array.from({length:count},()=>r.take(64).toString('base64'));const message=r.take(r.bytes.length-r.offset).toString('base64');r.done();const parsed=parseLegacyMessage(message);if(count!==parsed.requiredSigners.length)reject('INVALID_INPUT');return {...parsed,transaction:r.bytes.toString('base64'),signatures,signature:signatureBase58(signatures[0])};}
export function validateTransaction({transaction,message,requiredSigners}){const value=parseTransaction(transaction),expected=parseLegacyMessage(message);if(value.message!==expected.message||JSON.stringify(value.requiredSigners)!==JSON.stringify(requiredSigners??expected.requiredSigners))reject('INVALID_AUTH');
  for(let i=0;i<value.requiredSigners.length;i++){const key=createPublicKey({format:'der',type:'spki',key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKeyBytes(value.requiredSigners[i])])});if(!verify(null,bytes(message),key,canonicalBase64(value.signatures[i],64)))reject('INVALID_AUTH');}return value;
}
export function signLegacyMessage({message,signers}){const parsed=parseLegacyMessage(message),get=k=>signers instanceof Map?signers.get(k):signers?.[k];const signatures=parsed.requiredSigners.map(k=>{const handle=get(k);if(typeof handle!=='function')reject('INVALID_AUTH');const result=handle(Buffer.from(bytes(message)));if(result&&typeof result.then==='function')reject('INVALID_INPUT');const b=bytes(result);if(b.length!==64)reject('INVALID_AUTH');return b.toString('base64');});const transaction=serializeTransaction({message,signatures});return validateTransaction({transaction,message,requiredSigners:parsed.requiredSigners});}
