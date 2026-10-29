/** Bounded loader/System legacy encoding; no key loading or network. */
import {createPublicKey,verify} from 'node:crypto';
import {publicKeyBytes,canonicalBase64} from '../native/codec.mjs';
import {shortvec,base58} from '../native/phase2-transport-utils.mjs';
import {sha256} from '../native/domain.mjs';
export const SYSTEM='11111111111111111111111111111111',LOADER='BPFLoaderUpgradeab1e11111111111111111111111',COMPUTE='ComputeBudget111111111111111111111111111111',RENT='SysvarRent111111111111111111111111111111111',CLOCK='SysvarC1ock11111111111111111111111111111111';
export function demand(ok,code){if(!ok)throw Object.assign(Error(code),{code});}
export const bytes=v=>Buffer.isBuffer(v)?Buffer.from(v):canonicalBase64(v);
export function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;}
export function u64(n){const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;}
export const meta=(key,signer=false,writable=false)=>({key,signer,writable});
export function compileLegacy({payer,blockhash,instructions}){
 publicKeyBytes(payer);publicKeyBytes(blockhash);demand(Array.isArray(instructions)&&instructions.length>0&&instructions.length<=4,'INSTRUCTION_COUNT');
 const keys=new Map([[payer,{key:payer,signer:true,writable:true,index:0}]]);for(const ix of instructions){publicKeyBytes(ix.program);demand(ix.data.length<=1100&&ix.accounts.length<=16,'INSTRUCTION_SIZE');for(const a of [...ix.accounts,meta(ix.program)]){publicKeyBytes(a.key);const old=keys.get(a.key);if(old){old.signer||=a.signer;old.writable||=a.writable;}else keys.set(a.key,{...a,index:keys.size});}}
 const group=a=>a.signer?(a.writable?0:1):(a.writable?2:3),ordered=[...keys.values()].sort((a,b)=>group(a)-group(b)||a.index-b.index),idx=k=>ordered.findIndex(a=>a.key===k),requiredSigners=ordered.filter(a=>a.signer).map(a=>a.key);demand(ordered.length<=32&&requiredSigners.length<=4,'MESSAGE_CAP');
 const message=Buffer.concat([Buffer.from([requiredSigners.length,ordered.filter(a=>a.signer&&!a.writable).length,ordered.filter(a=>!a.signer&&!a.writable).length]),shortvec(ordered.length),...ordered.map(a=>publicKeyBytes(a.key)),publicKeyBytes(blockhash),shortvec(instructions.length),...instructions.map(ix=>Buffer.concat([Buffer.from([idx(ix.program)]),shortvec(ix.accounts.length),Buffer.from(ix.accounts.map(a=>idx(a.key))),shortvec(ix.data.length),ix.data]))]);
 demand(1+64*requiredSigners.length+message.length<=1232,'MESSAGE_CAP');return {message:message.toString('base64'),messageHash:sha256(message),requiredSigners,accountKeys:ordered.map(a=>a.key),blockhash};
}
export function budgetInstructions(){return [{program:COMPUTE,accounts:[],data:Buffer.concat([Buffer.from([3]),u64(0)])},{program:COMPUTE,accounts:[],data:Buffer.concat([Buffer.from([2]),u32(1400000)])}];}
export function createAccount(payer,newKey,lamports,space,owner){return {program:SYSTEM,accounts:[meta(payer,true,true),meta(newKey,true,true)],data:Buffer.concat([u32(0),u64(lamports),u64(space),publicKeyBytes(owner)])};}
export function transfer(from,to,lamports){return {program:SYSTEM,accounts:[meta(from,true,true),meta(to,false,true)],data:Buffer.concat([u32(2),u64(lamports)])};}
export function validateEnvelope({transaction,message,requiredSigners}){
 const raw=bytes(transaction),msg=bytes(message);demand(requiredSigners.length>=1&&requiredSigners.length<=4&&raw.length<=1232,'SIGNED_SIZE');demand(raw[0]===requiredSigners.length&&raw.length===1+64*requiredSigners.length+msg.length&&raw.subarray(1+64*requiredSigners.length).equals(msg),'SIGNED_MESSAGE_MISMATCH');
 const signatures=requiredSigners.map((key,i)=>{const sig=raw.subarray(1+64*i,1+64*(i+1)),pub=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKeyBytes(key)]),type:'spki',format:'der'});demand(verify(null,msg,pub,sig),'SIGNATURE_MISMATCH');return sig.toString('base64');});return {transaction:raw.toString('base64'),signature:base58(Buffer.from(signatures[0],'base64')),signatures,transactionHash:sha256(raw)};
}
export function signEnvelope(compiled,signExact){const signatures=compiled.requiredSigners.map(actor=>{const sig=signExact(actor,bytes(compiled.message));demand(!sig?.then,'ASYNC_SIGNER_FORBIDDEN');const b=bytes(sig);demand(b.length===64,'SIGNATURE_SIZE');return b;});return validateEnvelope({...compiled,transaction:Buffer.concat([Buffer.from([signatures.length]),...signatures,bytes(compiled.message)])});}
