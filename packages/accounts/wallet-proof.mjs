import {createPublicKey,verify,createHash} from 'node:crypto';
import {base58} from '../hosted/wallets.mjs';

const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=(code,status=400)=>{throw Object.assign(Error(code),{code,status});};
export function decodeBase58(value,length){
 if(typeof value!=='string'||value.length>100||!value.length)fail('wallet_signature_invalid');
 let n=0n;for(const c of value){const i=alphabet.indexOf(c);if(i<0)fail('wallet_signature_invalid');n=n*58n+BigInt(i);}
 let hex=n.toString(16);if(hex.length%2)hex=`0${hex}`;
 const bytes=Buffer.concat([Buffer.alloc(value.match(/^1*/)[0].length),n?Buffer.from(hex,'hex'):Buffer.alloc(0)]);
 if(bytes.length!==length||base58(bytes)!==value)fail('wallet_signature_invalid');return bytes;
}
export function solanaAddress(value){decodeBase58(value,32);return value;}
export function verifyWalletProof({address,message,signature}){
 const raw=decodeBase58(address,32),sig=decodeBase58(signature,64);
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),format:'der',type:'spki'});
 if(!verify(null,Buffer.from(message,'utf8'),publicKey,sig))fail('wallet_signature_invalid');
 return createHash('sha256').update(message).update(sig).digest('hex');
}
export function walletChallengeMessage(c){
 return ['AXP wallet ownership — not a payment authorization',`Origin: ${c.origin}`,`Network: ${c.network}`,
  `Purpose: ${c.purpose}`,`Account: ${c.ownerId}`,`Organization: ${c.organizationId}`,
  `Resource: ${c.resourceId}`,`Wallet: ${c.address}`,`Challenge: ${c.id}`,`Nonce: ${c.nonce}`,
  `Issued at: ${c.createdAt}`,`Expires at: ${c.expiresAt}`,
  'This proves address control only. It cannot open a channel, spend funds or redirect an existing payout.'].join('\n');
}
