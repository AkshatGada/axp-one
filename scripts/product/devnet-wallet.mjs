// Fresh product-demo wallet, separate from all recorded MVP identities.
// Only init, read-only status and one public Devnet SOL faucet request; no spend.
import {existsSync,readFileSync,writeFileSync,mkdirSync,fstatSync,chmodSync,openSync,closeSync,constants} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {freshKey,base58} from '../../packages/hosted/wallets.mjs';
import {DEVNET_NETWORK,explorerAddress,explorerTx} from '../../packages/v3/devnet-settlement.mjs';
import {localConfiguration,repositoryRoot} from '../../packages/config/local.mjs';
const config=localConfiguration(),path=resolve(repositoryRoot,config.AXP_PRODUCT_DEVNET_WALLET_PATH??'local-state/product/secrets/devnet-wallet.json');
const fail=code=>{throw new Error(code);};
if(!relative(repositoryRoot,path).startsWith('local-state/'))fail('wallet_must_be_in_ignored_local_state');
function checkKey(k){if(!Array.isArray(k?.secret)||k.secret.length!==64||k.secret.some(b=>!Number.isInteger(b)||b<0||b>255))fail('wallet_key_invalid');const priv=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(k.secret.slice(0,32))]),format:'der',type:'pkcs8'});const pub=Buffer.from(createPublicKey(priv).export({format:'jwk'}).x,'base64url');if(!pub.equals(Buffer.from(k.secret.slice(32)))||base58(pub)!==k.address)fail('wallet_keypair_mismatch');}
function read(){if(!existsSync(path))fail('product_wallet_missing');const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let w;try{const stat=fstatSync(fd);if(!stat.isFile()||(stat.mode&0o777)!==0o600||stat.uid!==process.getuid()||stat.size>65536)fail('wallet_permissions');w=JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}if(w.network!=='solana-devnet'||!w.sponsor?.address||!w.publisher?.address||!Array.isArray(w.funding))fail('wallet_invalid');checkKey(w.sponsor);checkKey(w.publisher);if(w.sponsor.address===w.publisher.address)fail('wallets_not_distinct');return w;}
function save(w,create=false){mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(w,null,2)+'\n',{mode:0o600,flag:create?'wx':'w'});chmodSync(path,0o600);}
const publicView=w=>({network:w.network,path:path.replace(repositoryRoot+'/',''),keypairsVerified:true,sponsor:w.sponsor.address,publisher:w.publisher.address,explorer:explorerAddress(w.sponsor.address),funding:w.funding});
async function rpc(method,params=[]){const r=await fetch(DEVNET_NETWORK.rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});if(!r.ok)fail(`devnet_rpc_http_${r.status}`);const j=await r.json();if(j.error)fail(`devnet_rpc_${j.error.code}`);return j.result;}
async function assertNetwork(){if(await rpc('getGenesisHash')!==DEVNET_NETWORK.genesisHash)fail('devnet_genesis_mismatch');}
async function status(){const w=read();await assertNetwork();const balance=await rpc('getBalance',[w.sponsor.address,{commitment:'finalized'}]);const tokens=await rpc('getTokenAccountsByOwner',[w.sponsor.address,{mint:DEVNET_NETWORK.mint},{encoding:'jsonParsed',commitment:'finalized'}]);return {...publicView(w),lamports:String(balance.value),usdcBaseUnits:String(tokens.value.reduce((n,t)=>n+BigInt(t.account.data.parsed.info.tokenAmount.amount),0n)),usdcMint:DEVNET_NETWORK.mint};}
async function airdrop(){const w=read();await assertNetwork();if(w.funding.some(f=>f.status==='requested'||f.status==='unknown'))fail('airdrop_reconciliation_required');const attempt={asset:'SOL',lamports:'1000000000',requestedAt:new Date().toISOString(),status:'requested'};w.funding.push(attempt);save(w);
 try{attempt.signature=await rpc('requestAirdrop',[w.sponsor.address,1000000000,{commitment:'finalized'}]);attempt.explorer=explorerTx(attempt.signature);attempt.status='submitted';}
 catch(e){attempt.status=/429|rpc_-/.test(e.message)?'rejected':'unknown';attempt.reason=e.message;}
 save(w);return publicView(w);
}
const command=process.argv[2]??'status';
try{let result;if(command==='init'){if(existsSync(path))result={status:'exists',...publicView(read())};else{const w={schemaVersion:'axp.product-devnet-wallet.v1',network:'solana-devnet',purpose:'Disposable product-demo Devnet wallet; test tokens only',createdAt:new Date().toISOString(),sponsor:freshKey(),publisher:freshKey(),funding:[]};save(w,true);result={status:'created',...publicView(w)};}}else if(command==='status')result=await status();else if(command==='airdrop')result=await airdrop();else fail('command_invalid');console.log(JSON.stringify(result,null,2));}
catch(e){console.error(JSON.stringify({status:'blocked',reason:e.message}));process.exitCode=1;}
