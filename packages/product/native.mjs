// Server-only Devnet configuration and unsigned preflight. No mainnet or signing here.
import {openSync,closeSync,readFileSync,fstatSync,constants} from 'node:fs';
import {createHash,createPrivateKey,createPublicKey} from 'node:crypto';
import {loadNativeSDK} from '../payments/sdk-loader.mjs';
import {DEVNET_NETWORK} from '../v3/devnet-settlement.mjs';
import {base58} from '../hosted/wallets.mjs';
import {retargetDistributeTreasury} from '../payments/sdk-transport.mjs';
export const NATIVE_LIMITS=Object.freeze({maxChannels:8,maxDepositBaseUnits:'200000',maxBudgetBaseUnits:'100000',maxBidBaseUnits:'4000',aggregateDepositBaseUnits:'2000000',aggregateChargeBaseUnits:'800000',aggregateFeeRentLamports:'100000000',maxCharges:100});
export const network=DEVNET_NETWORK;
export const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{reasonCode:code,code});};
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function walletIdentities(path){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let w;
 try{const s=fstatSync(fd);check(s.isFile()&&(s.mode&0o777)===0o600&&s.uid===process.getuid()&&s.size<=65536,'wallet_permissions');w=JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
 check(w.network==='solana-devnet','wallet_network');
 for(const k of [w.sponsor,w.publisher]){check(k&&Array.isArray(k.secret)&&k.secret.length===64&&k.secret.every(b=>Number.isInteger(b)&&b>=0&&b<=255),'wallet_invalid');const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(k.secret.slice(0,32))]),format:'der',type:'pkcs8'}),pub=Buffer.from(createPublicKey(key).export({format:'jwk'}).x,'base64url');check(pub.equals(Buffer.from(k.secret.slice(32)))&&base58(pub)===k.address,'wallet_keypair_mismatch');}
 check(w.sponsor.address!==w.publisher.address,'wallets_not_distinct');return {payer:w.sponsor.address,payee:w.publisher.address};
}
export async function nativeRPC(method,params=[]){
 const body=JSON.stringify({jsonrpc:'2.0',id:1,method,params});let r;
 for(let i=0;i<4;i++){r=await fetch(network.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body,signal:AbortSignal.timeout(15000)});if(r.status!==429||i===3)break;await new Promise(done=>setTimeout(done,1000*(i+1)));}
 check(r.ok,`devnet_rpc_http_${r.status}`);const j=await r.json();check(!j.error,'devnet_rpc_error');return j.result;
}
export async function inspectProductDevnet({payer,payee,depositBaseUnits='20000',expected,simulate=false,rpc=nativeRPC,sdkProvider=loadNativeSDK}={}){
 const sdk=await sdkProvider(),{kit,token,generated,paymentChannels,onChain,manifest}=sdk;
 check(await rpc('getGenesisHash')===network.genesisHash,'devnet_genesis_mismatch');
 const account=async(address,encoding='base64')=>(await rpc('getAccountInfo',[address,{encoding,commitment:'finalized'}])).value;
 const program=await account(network.program);check(program?.executable&&program.owner==='BPFLoaderUpgradeab1e11111111111111111111111','devnet_program_unavailable');
 const bytes=Buffer.from(program.data[0],'base64');check(bytes.readUInt32LE(0)===2,'devnet_program_loader');
 const programDataAddress=kit.getAddressDecoder().decode(bytes.subarray(4,36)),pd=await account(programDataAddress);check(pd?.owner===program.owner,'devnet_program_data');
 const deployment={programAccountHash:sha(bytes),programDataHash:sha(Buffer.from(pd.data[0],'base64')),programDataAddress};
 if(expected)for(const k of ['programAccountHash','programDataHash'])check(expected[k]===deployment[k],'devnet_deployment_changed');
 const mint=await account(network.mint,'jsonParsed');check(mint?.owner===network.tokenProgram&&mint.data?.parsed?.type==='mint'&&mint.data.parsed.info.decimals===6&&mint.data.parsed.info.isInitialized,'devnet_mint_invalid');
 const ata=async owner=>(await token.findAssociatedTokenPda({owner:kit.address(owner),mint:kit.address(network.mint),tokenProgram:kit.address(network.tokenProgram)}))[0];
 const accounts={payer:await ata(payer),publisher:await ata(payee),treasury:await ata(network.treasuryOwner)},balances={};const missing=[];
 for(const [role,owner] of [['payer',payer],['publisher',payee],['treasury',network.treasuryOwner]]){const a=await account(accounts[role],'jsonParsed');if(!a){balances[`${role}BaseUnits`]='0';missing.push(role);continue;}const info=a.data?.parsed?.info;check(a.owner===network.tokenProgram&&info?.mint===network.mint&&info.owner===owner&&info.state==='initialized'&&info.tokenAmount?.decimals===6,'devnet_token_account_invalid');balances[`${role}BaseUnits`]=info.tokenAmount.amount;}
 balances.payerLamports=String((await rpc('getBalance',[payer,{commitment:'finalized'}])).value);
 const result={schemaVersion:'axp.product-devnet-preflight.v1',network:'solana-devnet',observedAt:new Date().toISOString(),...deployment,accounts,balances,sdk:{sourceCommit:manifest.sourceCommit,packageVersion:manifest.packageVersion},signed:false,broadcast:false};
 if(simulate){
  check(BigInt(balances.payerBaseUnits)>=BigInt(depositBaseUnits),'insufficient_test_usdc');check(BigInt(balances.payerLamports)>=10000000n,'insufficient_devnet_sol');
  const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]),noop=a=>kit.createNoopSigner(kit.address(a)),p=noop(payer),q=noop(payee),prog=kit.address(network.program),tp=network.tokenProgram;
  const request={amount:'1',currency:network.mint,recipient:payee,suggestedDeposit:depositBaseUnits,methodDetails:{network:'devnet',channelProgram:network.program,recentBlockhash:latest.value.blockhash,recentSlot:String(latest.context.slot),gracePeriodSeconds:900,feePayer:false}};
  const open=await paymentChannels.derivePaymentChannelOpen({request,payer,authorizedSigner:payer,deposit:depositBaseUnits,salt:String(Date.now()),tokenProgram:tp,programAddress:prog}),[eventAuthority]=await generated.findEventAuthorityPda({programAddress:prog});
  const opening=generated.getOpenInstruction({associatedTokenProgram:kit.address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),authorizedSigner:kit.address(payer),channel:kit.address(open.channelId),channelTokenAccount:await ata(open.channelId),eventAuthority,mint:kit.address(network.mint),openArgs:{deposit:BigInt(depositBaseUnits),gracePeriod:900,openSlot:BigInt(open.openSlot),recipients:[],salt:BigInt(open.salt)},payee:kit.address(payee),payer:p,payerTokenAccount:accounts.payer,rent:kit.address('SysvarRent111111111111111111111111111111111'),rentPayer:p,selfProgram:prog,tokenProgram:kit.address(tp)},{programAddress:prog});
  const setup=[['publisher',payee],['treasury',network.treasuryOwner]].filter(([role])=>missing.includes(role)).map(([role,owner])=>token.getCreateAssociatedTokenIdempotentInstruction({payer:p,ata:accounts[role],owner:kit.address(owner),mint:kit.address(network.mint),tokenProgram:kit.address(tp)}));
  const seal=onChain.buildSettleAndSealInstructions({channelId:open.channelId,merchantSigner:q,programId:prog}),dist=retargetDistributeTreasury({instruction:await onChain.buildDistributeInstruction({channelState:{channelId:open.channelId,payer,payee},mint:network.mint,rentPayer:payer,tokenProgram:tp,splits:[],programId:prog}),sdkTreasuryAta:await ata('Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP'),treasuryAta:accounts.treasury});
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayer(payer,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions([...setup,opening,...seal.instructions,dist],m));
  const sim=await rpc('simulateTransaction',[kit.getBase64EncodedWireTransaction(kit.compileTransaction(message)),{encoding:'base64',sigVerify:false,commitment:'confirmed'}]);
  result.simulation={err:sim.value.err,unitsConsumed:sim.value.unitsConsumed,slot:sim.context.slot};check(sim.value.err===null,'devnet_zero_close_simulation_failed');
 }
 return {...result,status:'checked',compatible:true};
}
