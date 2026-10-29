/** Strict public wire utilities. No network/config/signing. */
import {createPublicKey,verify} from 'node:crypto';
import {reject,decimal,publicKeyBytes,canonicalBase64,encodeInstruction} from './codec.mjs';
import {instructionMetas,deduplicateMetas,sha256} from './domain.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(bytes){bytes=Buffer.from(bytes);let n=bytes.length?BigInt('0x'+bytes.toString('hex')):0n,out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}for(const byte of bytes){if(byte)break;out='1'+out;}return out;}
export function unbase58(value,length){if(typeof value!=='string'||value.length>128||!value.length)reject('INVALID_INPUT');let n=0n;for(const char of value){const d=alphabet.indexOf(char);if(d<0)reject('INVALID_INPUT');n=n*58n+BigInt(d);}let hex=n.toString(16);if(hex.length%2)hex='0'+hex;let zeros=0;for(const char of value){if(char!=='1')break;zeros++;}const out=Buffer.concat([Buffer.alloc(zeros),n?Buffer.from(hex,'hex'):Buffer.alloc(0)]);if(out.length!==length||base58(out)!==value)reject('INVALID_INPUT');return out;}
export function natural(value){if(typeof value==='number'){if(!Number.isSafeInteger(value)||value<0)reject('RUN_MISMATCH');return String(value);}decimal(value);return value;}
export function shortvec(n){if(!Number.isInteger(n)||n<0||n>65535)reject('INVALID_INPUT');const bytes=[];do{let b=n&127;n>>>=7;if(n)b|=128;bytes.push(b);}while(n);return Buffer.from(bytes);}
export function parseLegacyTransaction(value){
 const bytes=typeof value==='string'?canonicalBase64(value):Buffer.from(value);if(bytes.length>1232||bytes.length<1)reject('INVALID_AUTH');let at=0;
 const take=n=>{if(at+n>bytes.length)reject('INVALID_AUTH');const out=bytes.subarray(at,at+n);at+=n;return out;};
 const count=()=>{const start=at;let n=0,shift=0;for(let i=0;i<3;i++){const b=take(1)[0];n|=(b&127)<<shift;if(!(b&128)){if(!shortvec(n).equals(bytes.subarray(start,at)))reject('INVALID_AUTH');return n;}shift+=7;}reject('INVALID_AUTH');};
 const signatureCount=count();if(signatureCount<1||signatureCount>4)reject('INVALID_AUTH');const signatures=Array.from({length:signatureCount},()=>Buffer.from(take(64)));const messageStart=at;const header=[...take(3)];if(header[0]!==signatureCount||(header[0]&128))reject('INVALID_AUTH');const keyCount=count();if(keyCount>32||keyCount<header[0]||header[1]>header[0]||header[2]>keyCount-header[0])reject('INVALID_AUTH');const keys=Array.from({length:keyCount},()=>base58(take(32)));if(new Set(keys).size!==keys.length)reject('INVALID_AUTH');const blockhash=base58(take(32));const instructionCount=count();if(instructionCount!==1)reject('INVALID_AUTH');const programIndex=take(1)[0],accountCount=count();if(accountCount>16)reject('INVALID_AUTH');const indices=[...take(accountCount)],data=Buffer.from(take(count()));if(programIndex>=keys.length||indices.some(i=>i>=keys.length)||at!==bytes.length)reject('INVALID_AUTH');
 const message=Buffer.from(bytes.subarray(messageStart));for(let i=0;i<signatures.length;i++){const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKeyBytes(keys[i])]),type:'spki',format:'der'});if(!verify(null,message,key,signatures[i]))reject('INVALID_AUTH');}
 const metas=keys.map((pubkey,i)=>({pubkey,isSigner:i<header[0],isWritable:i<header[0]?i<header[0]-header[1]:i<keys.length-header[2]}));
 return {bytes,message,signatures,signature:base58(signatures[0]),keys,metas,blockhash,instruction:{programId:keys[programIndex],accounts:indices.map(i=>metas[i]),data}};
}
export function verifyPersistedTransaction(operation,run){
 const a=operation?.attempt;if(!a||typeof operation.id!=='string')reject('PENDING_SETTLEMENT');const parsed=parseLegacyTransaction(a.transaction);
 if(a.message!==parsed.message.toString('base64')||a.blockhash!==parsed.blockhash||parsed.instruction.programId!==run.program||!encodeInstruction(operation.instruction).equals(parsed.instruction.data))reject('INVALID_AUTH');
 const signatureBytes=unbase58(a.signature,64);if(!signatureBytes.equals(parsed.signatures[0]))reject('INVALID_AUTH');
 const expected=instructionMetas({type:operation.instruction.type,fundingKind:operation.instruction.fundingKind,accounts:operation.accounts});
 if(expected.length!==parsed.instruction.accounts.length)reject('INVALID_AUTH');
 const expectedAggregated=deduplicateMetas([{pubkey:operation.feePayer??run.matcher,isSigner:true,isWritable:true},...expected,{pubkey:run.program,isSigner:false,isWritable:false}]);
 for(let i=0;i<expected.length;i++)if(expected[i].pubkey!==parsed.instruction.accounts[i].pubkey)reject('INVALID_AUTH');
 if(parsed.keys[0] !== (operation.feePayer??run.matcher)||expectedAggregated.length!==parsed.keys.length)reject('INVALID_AUTH');
 for(const meta of parsed.metas){const e=expectedAggregated.find(m=>m.pubkey===meta.pubkey);if(!e||meta.isSigner!==e.isSigner||meta.isWritable!==e.isWritable)reject('INVALID_AUTH');}
 decimal(a.lastValidBlockHeight);if(decimal(a.feeReserve)>100000n)reject('CAPACITY');decimal(a.rentReserve);
 return {...parsed,transactionHash:sha256(parsed.bytes)};
}
