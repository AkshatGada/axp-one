// Stable disposable Solana DEVNET wallets for hosted live runs: one payer per
// fictional advertiser channel and one publisher payee. Never mainnet.
// Source: AXP_DEVNET_WALLETS (base64 JSON, hosted) or AXP_DEVNET_WALLETS_PATH /
// local-state/secrets/hosted-devnet-wallets.json (0600, gitignored, local).
import {readFileSync,writeFileSync,mkdirSync,openSync,fstatSync,closeSync,constants,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {generateKeyPairSync,createPrivateKey,createPublicKey} from 'node:crypto';
import {LIVE_CHANNEL_IDS} from '../v3/devnet-live.mjs';

const fail=code=>{const e=new Error(code);e.code=code;throw e;};
export const WALLETS_SCHEMA='axp.hosted-devnet-wallets.v1';
export const DEFAULT_WALLETS_PATH='local-state/secrets/hosted-devnet-wallets.json';

const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(bytes) {
  let n=BigInt('0x'+(Buffer.from(bytes).toString('hex')||'0')),out='';
  while(n>0n){out=ALPHABET[Number(n%58n)]+out;n/=58n;}
  for(const b of bytes){if(b!==0)break;out='1'+out;}
  return out;
}
const addressOf=secret=>base58(secret.slice(32));
function checkKey(k,label) {
  if(!k||!Array.isArray(k.secret)||k.secret.length!==64||k.secret.some(b=>!Number.isInteger(b)||b<0||b>255))fail(`wallet_invalid:${label}`);
  // The public half must match the private seed (Ed25519 derivation).
  const priv=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(k.secret.slice(0,32))]),format:'der',type:'pkcs8'});
  if(Buffer.from(createPublicKey(priv).export({format:'jwk'}).x,'base64url').compare(Buffer.from(k.secret.slice(32)))!==0)fail(`wallet_keypair_mismatch:${label}`);
  if(addressOf(k.secret)!==k.address)fail(`wallet_address_mismatch:${label}`);
  return k;
}
export function validateWallets(w) {
  if(w?.schemaVersion!==WALLETS_SCHEMA||w.network!=='solana-devnet')fail('wallets_schema_invalid');
  for(const id of LIVE_CHANNEL_IDS)checkKey(w.payers?.[id],id);
  checkKey(w.publisher,'publisher');
  const all=[...LIVE_CHANNEL_IDS.map(id=>w.payers[id].address),w.publisher.address];
  if(new Set(all).size!==all.length)fail('wallets_not_distinct');
  return w;
}

/** Fresh Ed25519 keypair as a Solana 64-byte secret (seed || public key). */
export function freshKey() {
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  const secret=[...Buffer.from(privateKey.export({format:'jwk'}).d,'base64url'),...Buffer.from(publicKey.export({format:'jwk'}).x,'base64url')];
  return {address:addressOf(secret),secret};
}
export function generateWallets(now=new Date()) {
  return validateWallets({schemaVersion:WALLETS_SCHEMA,network:'solana-devnet',purpose:'disposable Devnet test wallets for hosted AXP live runs; never mainnet; no value',
    createdAt:now.toISOString(),payers:Object.fromEntries(LIVE_CHANNEL_IDS.map(id=>[id,freshKey()])),publisher:freshKey(),funding:[]});
}

function readPrivate(path) {
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=fstatSync(fd);if(!st.isFile()||(st.mode&0o777)!==0o600)fail('wallet_permissions');return JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
}
export function walletsPath(config,root){return resolve(root,config.AXP_DEVNET_WALLETS_PATH||DEFAULT_WALLETS_PATH);}
export function loadWallets(config,{root}) {
  if(config.AXP_DEVNET_WALLETS){let w;try{w=JSON.parse(Buffer.from(config.AXP_DEVNET_WALLETS,'base64').toString('utf8'));}catch{fail('wallets_env_invalid');}return validateWallets(w);}
  try{return validateWallets(readPrivate(walletsPath(config,root)));}catch(e){if(e.code==='ENOENT')fail('wallets_unavailable');throw e;}
}
export function saveWallets(path,w,{create=false}={}) {
  validateWallets(w);mkdirSync(resolve(path,'..'),{recursive:true,mode:0o700});
  writeFileSync(path,JSON.stringify(w,null,2)+'\n',{mode:0o600,flag:create?'wx':'w'});
}
/** Public projection: addresses and funding transactions only. */
export const publicWallets=w=>({network:w.network,payers:Object.fromEntries(LIVE_CHANNEL_IDS.map(id=>[id,w.payers[id].address])),publisher:w.publisher.address,funding:w.funding??[]});

/** Per-channel wallet files in the shape the native transport reads, in a
 * private temp dir OUTSIDE the run's state directory (never snapshotted). */
export function materializeWalletFiles(w,runId) {
  const dir=mkdtempSync(join(tmpdir(),'axp-w-'));
  const paths={};
  for(const id of LIVE_CHANNEL_IDS) {
    paths[id]=join(dir,`${id}.json`);
    writeFileSync(paths[id],JSON.stringify({network:'solana-devnet',purpose:`disposable devnet test wallet for ${runId} ${id}; never mainnet`,sponsor:w.payers[id],publisher:w.publisher}),{mode:0o600,flag:'wx'});
  }
  return {paths,dispose(){rmSync(dir,{recursive:true,force:true});}};
}
