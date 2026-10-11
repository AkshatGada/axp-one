import {openSync,closeSync,readFileSync,fstatSync,constants} from 'node:fs';
import {createECDH} from 'node:crypto';

const MASK=(1n<<64n)-1n;
const ROT=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC=[1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
const rotate=(n,b)=>b?((n<<BigInt(b))|(n>>BigInt(64-b)))&MASK:n;
// Keccak-256, not SHA3-256. Used only for synchronous EVM address/key binding;
// SDK transaction and EIP-712 hashing use the pinned published viem primitives.
export function tempoKeccak256(input){
 const bytes=Buffer.from(input),size=Math.ceil((bytes.length+1)/136)*136,padded=Buffer.alloc(size);bytes.copy(padded);padded[bytes.length]=1;padded[size-1]|=128;
 const a=Array(25).fill(0n);
 for(let offset=0;offset<size;offset+=136){for(let i=0;i<17;i++)a[i]^=padded.readBigUInt64LE(offset+i*8);
  for(const rc of RC){const c=Array.from({length:5},(_,x)=>a[x]^a[x+5]^a[x+10]^a[x+15]^a[x+20]),d=c.map((_,x)=>c[(x+4)%5]^rotate(c[(x+1)%5],1));
   for(let i=0;i<25;i++)a[i]^=d[i%5];const b=Array(25).fill(0n);
   for(let y=0;y<5;y++)for(let x=0;x<5;x++)b[y+5*((2*x+3*y)%5)]=rotate(a[x+5*y],ROT[x+5*y]);
   for(let y=0;y<5;y++)for(let x=0;x<5;x++)a[x+5*y]=(b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]))&MASK;a[0]^=rc;
  }
 }
 const out=Buffer.alloc(32);for(let i=0;i<4;i++)out.writeBigUInt64LE(a[i],i*8);return `0x${out.toString('hex')}`;
}
export const tempoCheck=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code,reasonCode:code});};
export function tempoAddressFromPrivateKey(privateKey){
 tempoCheck(typeof privateKey==='string'&&/^0x[0-9a-fA-F]{64}$/.test(privateKey),'tempo_wallet_invalid');
 try{const ecdh=createECDH('secp256k1');ecdh.setPrivateKey(Buffer.from(privateKey.slice(2),'hex'));return `0x${tempoKeccak256(ecdh.getPublicKey(null,'uncompressed').subarray(1)).slice(-40)}`;}
 catch{tempoCheck(false,'tempo_wallet_invalid');}
}
export function readTempoWallet(path){
 let fd,w;try{fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);const st=fstatSync(fd);tempoCheck(st.isFile()&&(st.mode&0o777)===0o600&&st.uid===process.getuid()&&st.size<=65536,'tempo_wallet_permissions');w=JSON.parse(readFileSync(fd,'utf8'));}
 catch(e){if(e?.reasonCode)throw e;tempoCheck(false,'tempo_wallet_invalid');}finally{if(fd!==undefined)closeSync(fd);}
 tempoCheck(w?.network==='tempo-testnet','tempo_wallet_network');
 for(const role of ['sponsor','publisher']){const account=w[role];tempoCheck(account&&/^0x[0-9a-fA-F]{40}$/.test(account.address??''),'tempo_wallet_invalid');tempoCheck(tempoAddressFromPrivateKey(account.privateKey)===account.address.toLowerCase(),'tempo_wallet_keypair_mismatch');account.address=account.address.toLowerCase();}
 tempoCheck(w.sponsor.address!==w.publisher.address,'tempo_wallets_not_distinct');return w;
}
export function tempoWalletIdentities(path){const w=readTempoWallet(path);return {payer:w.sponsor.address,payee:w.publisher.address};}
