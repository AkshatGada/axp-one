// Stable Devnet wallets for hosted live runs (two advertiser payers + publisher).
//   init           generate local-state/secrets/hosted-devnet-wallets.json (0600, never overwrites)
//   status         public addresses and balances
//   fund [sol] [usdc]  one Devnet transaction from a disposable funder wallet file
//                  (AXP_TEST_WALLET_PATH, shape {network:'solana-devnet',sponsor:{address,secret}};
//                  needs AXP_HOSTED_DEVNET_SIGN=1); default 0.25 SOL + 1 test USDC per payer
//   env            print the NAME of the env var and where its value comes from (never the value)
// Devnet only. Never prints secret keys.
import {existsSync,readFileSync,openSync,fstatSync,closeSync,constants} from 'node:fs';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {localConfiguration,testWalletPath,repositoryRoot as root} from '../../packages/config/local.mjs';
import {generateWallets,loadWallets,saveWallets,walletsPath,publicWallets} from '../../packages/hosted/wallets.mjs';
import {rpc,payerHealth} from '../../packages/hosted/live-run.mjs';
import {LIVE_CHANNEL_IDS} from '../../packages/v3/devnet-live.mjs';
import {DEVNET_NETWORK,explorerTx} from '../../packages/v3/devnet-settlement.mjs';

const config=localConfiguration(),path=walletsPath(config,root);
const FUNDER_WALLET=testWalletPath();
const [command,a1,a2]=process.argv.slice(2);
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function init() {
  if(existsSync(path)){const w=loadWallets(config,{root});return {status:'exists',...publicWallets(w)};}
  const w=generateWallets(),{kit}=await loadNativeSDK();
  // Cross-check the address derivation against the payment SDK.
  for(const k of [...LIVE_CHANNEL_IDS.map(id=>w.payers[id]),w.publisher])check((await kit.createKeyPairSignerFromBytes(Uint8Array.from(k.secret))).address===k.address,'address_derivation_mismatch');
  saveWallets(path,w,{create:true});
  return {status:'created',path:path.replace(root+'/',''),...publicWallets(w)};
}
async function status(){const w=loadWallets(config,{root});return {...publicWallets(w),balances:await payerHealth(w)};}

function readFunder() {
  const fd=openSync(FUNDER_WALLET,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=fstatSync(fd);check(st.isFile()&&(st.mode&0o777)===0o600,'wallet_permissions');return JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
}
async function fund() {
  check(process.env.AXP_HOSTED_DEVNET_SIGN==='1','signing_disabled');
  const sol=Number(a1??'0.25'),usdc=Number(a2??'1');check(sol>0&&sol<=1&&usdc>0&&usdc<=5,'amount_out_of_range');
  const lamports=BigInt(Math.round(sol*1e9)),tokens=BigInt(Math.round(usdc*1e6));
  const w=loadWallets(config,{root}),sdk=await loadNativeSDK(),{kit,token}=sdk,f=readFunder();
  check(f.network==='solana-devnet'&&typeof f.sponsor?.address==='string','funder_identity_mismatch');const FUNDER=f.sponsor.address;
  check(await rpc('getGenesisHash')===DEVNET_NETWORK.genesisHash,'genesis_mismatch');
  const funder=await kit.createKeyPairSignerFromBytes(Uint8Array.from(f.sponsor.secret));check(funder.address===FUNDER,'funder_identity_mismatch');
  const mint=kit.address(DEVNET_NETWORK.mint),tp=kit.address(DEVNET_NETWORK.tokenProgram);
  const ata=async owner=>(await token.findAssociatedTokenPda({owner:kit.address(owner),mint,tokenProgram:tp}))[0];
  const funderAta=await ata(FUNDER),bal=(await rpc('getAccountInfo',[funderAta,{encoding:'jsonParsed',commitment:'finalized'}])).value;
  check(BigInt(bal?.data?.parsed?.info?.tokenAmount?.amount??'0')>=2n*tokens,'funder_insufficient_test_usdc');
  const instructions=[];
  for(const id of LIVE_CHANNEL_IDS) {
    const payer=w.payers[id].address,payerAta=await ata(payer);
    const data=Buffer.alloc(12);data.writeUInt32LE(2,0);data.writeBigUInt64LE(lamports,4);
    instructions.push({programAddress:kit.address('11111111111111111111111111111111'),accounts:[{address:funder.address,role:kit.AccountRole.WRITABLE_SIGNER,signer:funder},{address:kit.address(payer),role:kit.AccountRole.WRITABLE}],data:new Uint8Array(data)},
      token.getCreateAssociatedTokenIdempotentInstruction({payer:funder,ata:payerAta,owner:kit.address(payer),mint,tokenProgram:tp}),
      token.getTransferCheckedInstruction({source:funderAta,mint,destination:payerAta,authority:funder,amount:tokens,decimals:6}));
  }
  const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayerSigner(funder,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions(instructions,m));
  const signed=await kit.signTransactionMessageWithSigners(message),signature=kit.getSignatureFromTransaction(signed),wire=kit.getBase64EncodedWireTransaction(signed);
  const sim=await rpc('simulateTransaction',[wire,{encoding:'base64',sigVerify:true,commitment:'confirmed'}]);check(sim.value.err===null,`funding_simulation_failed:${JSON.stringify(sim.value.err)}`);
  // Record the identity before broadcast (lookup-only recovery if the process dies).
  const entry={signature,from:FUNDER,lamportsPerPayer:lamports.toString(),tokenBaseUnitsPerPayer:tokens.toString(),at:new Date().toISOString(),status:'signed'};
  w.funding=[...(w.funding??[]),entry];saveWallets(path,w);
  check(await rpc('sendTransaction',[wire,{encoding:'base64',skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'}])===signature,'submission_identity_mismatch');
  let s;for(let i=0;i<60;i++){s=(await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}])).value[0];if(s?.err||s?.confirmationStatus==='finalized')break;await sleep(2000);}
  entry.status=s?.err?'failed':s?.confirmationStatus??'unknown';entry.slot=s?.slot??null;w.funding=[...w.funding.slice(0,-1),entry];saveWallets(path,w);
  return {status:entry.status,signature,explorer:explorerTx(signature)};
}
function env() {
  return {name:'AXP_DEVNET_WALLETS',value:`base64 of ${path.replace(root+'/','')} (do not print; use scripts/build-site/write-env-vercel.mjs when hosting)`};
}
const commands={init,status,fund,env};
try{check(commands[command],'command_invalid');console.log(JSON.stringify(await commands[command](),(_,v)=>typeof v==='bigint'?v.toString():v,2));}
catch(e){console.error(JSON.stringify({status:'blocked',reasonCode:e.code??e.message}));process.exitCode=2;}
