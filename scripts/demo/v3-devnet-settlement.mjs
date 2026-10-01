// Terminal-only operator for settling the RECORDED V3 receipts on Solana Devnet.
// Devnet test tokens only. Never writes artifacts/v3/**; private state lives in
// local-state/v3-devnet/ (gitignored). Signing requires AXP_V3_DEVNET_SIGN=1.
//
//   node scripts/demo/v3-devnet-settlement.mjs feasibility   (read-only)
//   node scripts/demo/v3-devnet-settlement.mjs wallets       (local keygen only)
//   AXP_V3_DEVNET_SIGN=1 node scripts/demo/v3-devnet-settlement.mjs fund
//   node scripts/demo/v3-devnet-settlement.mjs freeze
//   AXP_V3_DEVNET_SIGN=1 node scripts/demo/v3-devnet-settlement.mjs open|authorize|close <channelId>
//   node scripts/demo/v3-devnet-settlement.mjs reconcile <channelId> [open|close|<chargeId>]
//   node scripts/demo/v3-devnet-settlement.mjs status | evidence
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fstatSync,closeSync,constants} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {NetworkPaymentAdapter,hashNetworkTerms,hashNetworkRecord} from '../../packages/payments/network-adapter.mjs';
import {createNativeTransport} from '../../packages/payments/sdk-transport.mjs';
import {DEVNET_NETWORK,DEVNET_CHANNEL_IDS,DEVNET_SETTLEMENT_RUN_ID,SOURCE_RUN_ID,FUNDING,DEPOSIT_BASE_UNITS,
  loadRecordedCharges,obligationsFor,chargeById,buildDevnetTerms,explorerTx,explorerAddress,publicTransaction,
  assertPublicEvidence,sha256} from '../../packages/v3/devnet-settlement.mjs';

const root=resolve(import.meta.dirname,'../..');
const stateDir=join(root,'local-state/v3-devnet'),secretDir=join(stateDir,'secrets');
const walletPath=join(secretDir,'test-wallets.json'),termsPath=join(stateDir,'terms.json'),fundingPath=join(stateDir,'funding.json');
const artifactDir=join(root,'artifacts/v3-devnet'),runJson=join(root,'artifacts/v3/replay/run.json');
const FUNDER_WALLET=join(root,'local-state/secrets/test-wallets.json'),FUNDER='D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST';
const FEE_CAP=20_000_000n,signingEnabled=process.env.AXP_V3_DEVNET_SIGN==='1';
const [command,arg,arg2]=process.argv.slice(2);
const fail=code=>{const e=new Error(code);e.reasonCode=code;throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const p of [artifactDir,stateDir])check(relative(join(root,'artifacts/v3'),p).startsWith('..'),'forbidden_path');

async function rpc(method,params=[]) {
  for(let attempt=0;;attempt++) {
    const r=await fetch(DEVNET_NETWORK.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
    // Only idempotent reads are retried; sendTransaction never loops here.
    if(r.status===429&&method!=='sendTransaction'&&attempt<6){await sleep(1500*(attempt+1));continue;}
    check(r.ok,`rpc_http_${r.status}`);const j=await r.json();if(j.error)fail(`${method}:${JSON.stringify(j.error)}`);return j.result;
  }
}
const writePrivate=(path,value,flag='w')=>{mkdirSync(resolve(path,'..'),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag});};
const writePublic=(name,value)=>{assertPublicEvidence(value);mkdirSync(artifactDir,{recursive:true});writeFileSync(join(artifactDir,name),JSON.stringify(value,null,2)+'\n');};
function readSecretFile(path) {
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=fstatSync(fd);check(st.isFile()&&(st.mode&0o777)===0o600&&st.uid===process.getuid(),'wallet_permissions');return JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
}
function publicWallets() {check(existsSync(walletPath),'wallets_required');const w=readSecretFile(walletPath);return {payer:w.sponsor.address,payee:w.publisher.address};}

async function deployment() {
  const sdk=await loadNativeSDK();const {kit}=sdk;
  check(await rpc('getGenesisHash')===DEVNET_NETWORK.genesisHash,'genesis_mismatch');
  const program=(await rpc('getAccountInfo',[DEVNET_NETWORK.program,{encoding:'base64',commitment:'finalized'}])).value;
  check(program?.executable&&program.owner==='BPFLoaderUpgradeab1e11111111111111111111111','program_unavailable');
  const data=Buffer.from(program.data[0],'base64'),programDataAddress=kit.getAddressDecoder().decode(data.subarray(4,36));
  const pd=(await rpc('getAccountInfo',[programDataAddress,{encoding:'base64',commitment:'finalized'}])).value,pdBytes=Buffer.from(pd.data[0],'base64');
  return {sdk,programAccountHash:sha256(data),programDataAddress,programDataHash:sha256(pdBytes),
    deploymentSlot:pdBytes.readBigUInt64LE(4).toString(),upgradeAuthority:kit.getAddressDecoder().decode(pdBytes.subarray(13,45))};
}
async function ataOf(sdk,owner){const {kit,token}=sdk;return (await token.findAssociatedTokenPda({owner:kit.address(owner),mint:kit.address(DEVNET_NETWORK.mint),tokenProgram:kit.address(DEVNET_NETWORK.tokenProgram)}))[0];}
async function tokenAmount(address){const a=(await rpc('getAccountInfo',[address,{encoding:'jsonParsed',commitment:'finalized'}])).value;return a?a.data.parsed.info.tokenAmount.amount:null;}

// ---------- feasibility (read-only, unsigned simulation with an ephemeral signer) ----------
async function feasibility() {
  const d=await deployment(),{sdk}=d,{kit,token,paymentChannels,onChain,generated,sessionClient,manifest}=sdk;
  const mint=(await rpc('getAccountInfo',[DEVNET_NETWORK.mint,{encoding:'jsonParsed',commitment:'finalized'}])).value;
  check(mint?.owner===DEVNET_NETWORK.tokenProgram&&mint.data.parsed.info.decimals===6,'mint_invalid');
  const treasuryAta=await ataOf(sdk,DEVNET_NETWORK.treasuryOwner),treasury=(await rpc('getAccountInfo',[treasuryAta,{encoding:'jsonParsed',commitment:'finalized'}])).value;
  check(treasury?.data?.parsed?.info?.owner===DEVNET_NETWORK.treasuryOwner&&treasury.data.parsed.info.state==='initialized','treasury_ata_unavailable');
  // Simulation payer: the existing disposable devnet wallet's PUBLIC address (no key).
  const payer=FUNDER,payee='DB4GyrEU7KPXzC4oYfKPfvct5Ja2pxXa7WZnREk3URsV',ephemeral=await kit.generateKeyPairSigner();
  const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]),program=kit.address(DEVNET_NETWORK.program),tp=DEVNET_NETWORK.tokenProgram;
  const request={amount:'1',currency:DEVNET_NETWORK.mint,recipient:payee,suggestedDeposit:DEPOSIT_BASE_UNITS,methodDetails:{network:'devnet',channelProgram:DEVNET_NETWORK.program,recentBlockhash:latest.value.blockhash,recentSlot:String(latest.context.slot),gracePeriodSeconds:900,feePayer:false}};
  const open=await paymentChannels.derivePaymentChannelOpen({request,payer,authorizedSigner:ephemeral.address,deposit:DEPOSIT_BASE_UNITS,salt:String(Date.now()),tokenProgram:tp,programAddress:program});
  const [eventAuthority]=await generated.findEventAuthorityPda({programAddress:program}),noop=a=>kit.createNoopSigner(kit.address(a));
  const opening=generated.getOpenInstruction({associatedTokenProgram:kit.address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),authorizedSigner:ephemeral.address,channel:kit.address(open.channelId),channelTokenAccount:await ataOf(sdk,open.channelId),eventAuthority,mint:kit.address(DEVNET_NETWORK.mint),openArgs:{deposit:20000n,gracePeriod:900,openSlot:BigInt(open.openSlot),recipients:[],salt:BigInt(open.salt)},payee:kit.address(payee),payer:noop(payer),payerTokenAccount:await ataOf(sdk,payer),rent:kit.address('SysvarRent111111111111111111111111111111111'),rentPayer:noop(payer),selfProgram:program,tokenProgram:kit.address(tp)},{programAddress:program});
  const signed=await new sessionClient.ActiveSession({channelId:open.channelId,signer:ephemeral,cumulative:0n,expiresAt:Math.floor(Date.now()/1000)+3600}).prepareVoucher(7000n);
  const seal=onChain.buildSettleAndSealInstructions({channelId:open.channelId,merchantSigner:noop(payee),programId:program,voucher:{authorizedSigner:ephemeral.address,signed}});
  const {retargetDistributeTreasury}=await import('../../packages/payments/sdk-transport.mjs');
  const distribute=retargetDistributeTreasury({instruction:await onChain.buildDistributeInstruction({channelState:{channelId:open.channelId,payer,payee},mint:DEVNET_NETWORK.mint,rentPayer:payer,tokenProgram:tp,splits:[],programId:program}),sdkTreasuryAta:await ataOf(sdk,'Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP'),treasuryAta});
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayer(kit.address(payer),m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions([opening,...seal.instructions,distribute],m));
  const sim=await rpc('simulateTransaction',[kit.getBase64EncodedWireTransaction(kit.compileTransaction(message)),{encoding:'base64',sigVerify:false,commitment:'confirmed',accounts:{encoding:'jsonParsed',addresses:[await ataOf(sdk,payee)]}}]);
  const before=await tokenAmount(await ataOf(sdk,payee));
  const report={schemaVersion:'axp.v3-devnet-feasibility.v1',settlementRunId:DEVNET_SETTLEMENT_RUN_ID,observedAt:new Date().toISOString(),
    signed:false,broadcast:false,network:{...DEVNET_NETWORK},sdk:{sourceCommit:manifest.sourceCommit,packageVersion:manifest.packageVersion},
    deployment:{programAccountHash:d.programAccountHash,programDataAddress:d.programDataAddress,programDataHash:d.programDataHash,deploymentSlot:d.deploymentSlot,upgradeAuthority:d.upgradeAuthority},
    mintDecimals:6,treasury:{owner:DEVNET_NETWORK.treasuryOwner,tokenAccount:treasuryAta,sdkDefaultOwner:'Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP',note:'Devnet build rejects the SDK default owner with Custom 2401 (TreasuryAccountMismatch).'},
    simulation:{description:'unsigned open + 7000 cumulative voucher settle_and_seal + distribute; ephemeral voucher signer; no broadcast',
      payer,payee,err:sim.value.err,unitsConsumed:sim.value.unitsConsumed,slot:sim.context.slot,
      payeeTokenBefore:before,payeeTokenAfterSimulated:sim.value.accounts?.[0]?.data?.parsed?.info?.tokenAmount?.amount??null},
    compatible:sim.value.err===null};
  writePublic('feasibility.json',report);return {compatible:report.compatible,simulationErr:report.simulation.err,deployment:report.deployment};
}

// ---------- fresh disposable wallets (local only, never printed) ----------
async function wallets() {
  if(existsSync(walletPath))return {status:'existing',...publicWallets()};
  const {kit}=await loadNativeSDK(),entry=async()=>{
    const {publicKey,privateKey}=generateKeyPairSync('ed25519');
    const seed=Buffer.from(privateKey.export({format:'jwk'}).d,'base64url'),pub=Buffer.from(publicKey.export({format:'jwk'}).x,'base64url');
    const secret=[...seed,...pub],signer=await kit.createKeyPairSignerFromBytes(Uint8Array.from(secret));
    return {address:signer.address,secret};
  };
  const sponsor=await entry(),publisher=await entry();
  writePrivate(walletPath,{network:'solana-devnet',purpose:'disposable devnet test wallets for v3-devnet-settlement; never mainnet',createdAt:new Date().toISOString(),sponsor,publisher},'wx');
  return {status:'created',payer:sponsor.address,payee:publisher.address,path:relative(root,walletPath)};
}

// ---------- one funding transaction from the existing disposable devnet wallet ----------
async function lookupSignature(signature) {
  const s=(await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}])).value[0];
  return s?{status:s.err?'failed':s.confirmationStatus,err:s.err,slot:s.slot}:{status:'unknown'};
}
async function waitFinalized(signature,ms=120000) {
  const end=Date.now()+ms;let s;
  do{s=await lookupSignature(signature);if(s.status==='finalized'||s.status==='failed')return s;await sleep(2000);}while(Date.now()<end);return s;
}
async function fund() {
  const {payer}=publicWallets();
  if(existsSync(fundingPath)) {
    const f=readSecretFile(fundingPath),s=await waitFinalized(f.signature,60000);
    if(s.status==='finalized'&&f.status!=='finalized')writePrivate(fundingPath,{...f,status:'finalized',slot:s.slot});
    return {status:s.status,signature:f.signature,explorer:explorerTx(f.signature),note:'lookup only; no new funding'};
  }
  check(signingEnabled,'signing_disabled');
  const sdk=await loadNativeSDK(),{kit,token}=sdk,w=readSecretFile(FUNDER_WALLET);
  check(w.network==='solana-devnet'&&w.sponsor.address===FUNDER,'funder_identity_mismatch');
  const funder=await kit.createKeyPairSignerFromBytes(Uint8Array.from(w.sponsor.secret));check(funder.address===FUNDER,'funder_identity_mismatch');
  check(await rpc('getGenesisHash')===DEVNET_NETWORK.genesisHash,'genesis_mismatch');
  const funderAta=await ataOf(sdk,FUNDER),payerAta=await ataOf(sdk,payer);
  check(BigInt(await tokenAmount(funderAta)??'0')>=FUNDING.tokenBaseUnits,'funder_insufficient_test_usdc');
  check(await tokenAmount(payerAta)===null,'payer_already_funded');
  const lamports=Buffer.alloc(12);lamports.writeUInt32LE(2,0);lamports.writeBigUInt64LE(FUNDING.lamports,4);
  const transfer={programAddress:kit.address('11111111111111111111111111111111'),accounts:[{address:funder.address,role:kit.AccountRole.WRITABLE_SIGNER,signer:funder},{address:kit.address(payer),role:kit.AccountRole.WRITABLE}],data:new Uint8Array(lamports)};
  const createAta=token.getCreateAssociatedTokenIdempotentInstruction({payer:funder,ata:payerAta,owner:kit.address(payer),mint:kit.address(DEVNET_NETWORK.mint),tokenProgram:kit.address(DEVNET_NETWORK.tokenProgram)});
  const send=token.getTransferCheckedInstruction({source:funderAta,mint:kit.address(DEVNET_NETWORK.mint),destination:payerAta,authority:funder,amount:FUNDING.tokenBaseUnits,decimals:6});
  const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayerSigner(funder,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions([transfer,createAta,send],m));
  const signed=await kit.signTransactionMessageWithSigners(message),signature=kit.getSignatureFromTransaction(signed),wire=kit.getBase64EncodedWireTransaction(signed);
  const sim=await rpc('simulateTransaction',[wire,{encoding:'base64',sigVerify:true,commitment:'confirmed'}]);
  check(sim.value.err===null,`funding_simulation_failed:${JSON.stringify(sim.value.err)}`);
  // Persist the signed identity BEFORE broadcast; a rerun only looks it up.
  writePrivate(fundingPath,{signature,from:FUNDER,to:payer,lamports:FUNDING.lamports.toString(),tokenBaseUnits:FUNDING.tokenBaseUnits.toString(),status:'signed_persisted',wireBase64:wire,lastValidBlockHeight:String(latest.value.lastValidBlockHeight)},'wx');
  const sent=await rpc('sendTransaction',[wire,{encoding:'base64',skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'}]);check(sent===signature,'submission_identity_mismatch');
  const s=await waitFinalized(signature);writePrivate(fundingPath,{...readSecretFile(fundingPath),status:s.status,slot:s.slot});
  return {status:s.status,signature,explorer:explorerTx(signature)};
}

// ---------- terms ----------
async function freeze() {
  if(existsSync(termsPath))return {status:'already_frozen',termsHash:JSON.parse(readFileSync(termsPath,'utf8')).termsHash};
  const {payer,payee}=publicWallets(),source=loadRecordedCharges(runJson),d=await deployment();
  check(existsSync(join(artifactDir,'feasibility.json')),'feasibility_required');
  const feas=JSON.parse(readFileSync(join(artifactDir,'feasibility.json'),'utf8'));
  check(feas.compatible===true&&feas.deployment.programDataHash===d.programDataHash&&feas.deployment.programAccountHash===d.programAccountHash,'deployment_changed');
  check(BigInt(await tokenAmount(await ataOf(d.sdk,payer))??'0')>=2n*BigInt(DEPOSIT_BASE_UNITS),'insufficient_test_usdc');
  const salts=new Set(),salt=()=>{let v;do{v=randomBytes(8).readBigUInt64LE().toString();}while(v==='0'||salts.has(v));salts.add(v);return v;};
  const now=Math.floor(Date.now()/1000),compatibilityHash=hashNetworkRecord(feas);
  const channels=DEVNET_CHANNEL_IDS.map(channelId=>buildDevnetTerms({channelId,source,payer,payee,openSalt:salt(),now,programAccountHash:d.programAccountHash,programDataHash:d.programDataHash,compatibilityHash}));
  const record={schemaVersion:'axp.v3-devnet-terms.v1',settlementRunId:DEVNET_SETTLEMENT_RUN_ID,sourceRunId:SOURCE_RUN_ID,sourceFileSha256:source.sourceFileSha256,channels,termsHash:null};
  record.termsHash=hashNetworkRecord(record);writePrivate(termsPath,record,'wx');
  return {status:'frozen',termsHash:record.termsHash,voucherExpiresAt:channels[0].voucherExpiresAt};
}
function loadTerms() {
  check(existsSync(termsPath),'freeze_required');const r=JSON.parse(readFileSync(termsPath,'utf8'));
  check(r.schemaVersion==='axp.v3-devnet-terms.v1'&&r.termsHash===hashNetworkRecord({...r,termsHash:null}),'terms_mismatch');return r;
}

// ---------- adapter wiring ----------
const store=()=>{mkdirSync(stateDir,{recursive:true,mode:0o700});return new SQLitePaymentStore(join(stateDir,'payments.sqlite'));};
async function withAdapter(channelId,fn) {
  check(DEVNET_CHANNEL_IDS.includes(channelId),'channel_not_allowed');
  const record=loadTerms(),terms=record.channels.find(t=>t.channelId===channelId),source=loadRecordedCharges(runJson);
  check(source.sourceFileSha256===record.sourceFileSha256,'recorded_source_changed');
  const db=store(),transport=await createNativeTransport({terms,statePath:join(stateDir,'native.sqlite'),walletPath});
  const beforeSigning=async({operation})=>{
    check(signingEnabled,'signing_disabled');
    const d=await deployment();check(d.programAccountHash===terms.programAccountHash&&d.programDataHash===terms.programDataHash,'deployment_changed');
    let total=0n;
    for(const s of db.list()) {
      if(s.channelId!==channelId)check(['finalized','prepared'].includes(s.open.status)&&(!s.close||['finalized','prepared'].includes(s.close.status))&&s.intents.every(i=>i.status==='authorized'),'reconciliation_required');
      total+=BigInt(s.feeReservedLamports);for(const k of ['open','close'])if(s[k]?.status==='prepared')total+=BigInt(s[k].plan.estimatedFeeAndRentLamports);
    }
    check(total<=FEE_CAP,'aggregate_fee_cap_exceeded');
    console.error(`[signing] ${channelId} ${operation}`);
  };
  const adapter=new NetworkPaymentAdapter({store:db,protocolTransport:transport,getLedgerCharge:id=>chargeById(source,id),
    getLedgerObligations:id=>obligationsFor(source,id),beforeSigning,approvalTermsHash:hashNetworkTerms(terms)});
  try{return await fn({adapter,db,terms,source});}finally{transport.close();db.db.close();}
}
async function settle(adapter,channelId,kind,result) {
  for(let i=0;i<40&&result.status==='submitted';i++){await sleep(3000);result=await adapter.reconcile({channelId});}
  return result;
}
async function open(id) {
  return withAdapter(id,async({adapter,db,terms})=>{
    if(!db.get(id)){check(signingEnabled,'signing_disabled');await adapter.prepareOpen(terms);}
    const s=db.get(id);let r=await adapter.confirmOpen({channelId:id,planId:s.open.id});r=await settle(adapter,id,'open',r);
    return {...r,explorer:r.txSignature?explorerTx(r.txSignature):null,channelAddress:r.protocolChannelId?explorerAddress(r.protocolChannelId):null};
  });
}
async function authorize(id) {
  return withAdapter(id,async({adapter,source})=>{
    const results=[];
    for(const c of obligationsFor(source,id).charges){if(adapter.lookupAuthorization({channelId:id,chargeId:c.id}).status==='absent')check(signingEnabled,'signing_disabled');const r=await adapter.authorizeCumulative({channelId:id,chargeId:c.id});results.push(r);if(r.status!=='authorized')break;}
    return {status:results.every(r=>r.status==='authorized')?'authorized':'unknown',channelId:id,authorizations:results};
  });
}
async function close(id) {
  return withAdapter(id,async({adapter,db})=>{
    let s=db.get(id);check(s,'open_required');
    if(!s.close){check(signingEnabled,'signing_disabled');if(s.phase==='open')await adapter.beginDrain({channelId:id});const plan=await adapter.prepareClose({channelId:id});if(plan.status!=='prepared')return plan;s=db.get(id);}
    let r=await adapter.confirmClose({channelId:id,planId:s.close.id});r=await settle(adapter,id,'close',r);
    return {...r,explorer:r.txSignature?explorerTx(r.txSignature):null};
  });
}
async function reconcile(id,op) {
  return withAdapter(id,async({adapter,db})=>{
    const s=db.get(id);check(s,'channel_not_found');
    if(op==='open')return adapter.reconcile({channelId:id,planId:s.open.id});
    if(op==='close')return adapter.reconcile({channelId:id,planId:s.close.id});
    if(op)return adapter.reconcile({channelId:id,chargeId:op});
    return adapter.reconcile({channelId:id});
  });
}
function status() {
  const db=store();try{return db.list().map(s=>({channelId:s.channelId,phase:s.phase,protocolChannelId:s.protocolChannelId??null,open:s.open.status,
    close:s.close?.status??null,authorizedBaseUnits:s.authorizedBaseUnits,intents:s.intents.map(i=>({chargeId:i.charge.id,status:i.status,cumulative:i.cumulativeAmountBaseUnits})),
    openTx:s.open.signed?.txSignature??null,closeTx:s.close?.signed?.txSignature??null}));}finally{db.db.close();}
}

// ---------- public, sanitized evidence (every signature re-verified finalized) ----------
// excluded: system wallets that receive a plain SOL transfer (not rent).
async function verifiedTx(signature,role,channelId,excluded=[]) {
  const st=(await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}])).value[0];
  check(st&&st.err===null&&st.confirmationStatus==='finalized',`not_finalized:${signature}`);
  const tx=await rpc('getTransaction',[signature,{encoding:'json',commitment:'finalized',maxSupportedTransactionVersion:0}]);
  check(tx?.meta&&tx.meta.err===null,`transaction_unavailable:${signature}`);
  const keys=[...tx.transaction.message.accountKeys,...(tx.meta.loadedAddresses?.writable??[]),...(tx.meta.loadedAddresses?.readonly??[])];
  const owners={},sum=(rows,o)=>(rows??[]).filter(x=>x.mint===DEVNET_NETWORK.mint&&x.owner===o).reduce((a,x)=>a+BigInt(x.uiTokenAmount.amount),0n);
  for(const r of [...(tx.meta.preTokenBalances??[]),...(tx.meta.postTokenBalances??[])])if(r.mint===DEVNET_NETWORK.mint)owners[r.owner]=true;
  const tokenDeltas=Object.fromEntries(Object.keys(owners).map(o=>[o,(sum(tx.meta.postTokenBalances,o)-sum(tx.meta.preTokenBalances,o)).toString()]).filter(([,v])=>v!=='0'));
  const feePayer=keys[0],newRent=tx.meta.postBalances.reduce((a,x,i)=>a+(keys[i]!==feePayer&&!excluded.includes(keys[i])&&tx.meta.preBalances[i]===0?BigInt(x):0n),0n);
  const reclaimed=tx.meta.preBalances.reduce((a,x,i)=>a+(keys[i]!==feePayer&&tx.meta.postBalances[i]===0?BigInt(x):0n),0n);
  return publicTransaction({signature,role,channelId,slot:tx.slot,blockTime:tx.blockTime,finality:'finalized',err:null,
    networkFeeLamports:String(tx.meta.fee),newRentLamports:newRent.toString(),reclaimedRentLamports:reclaimed.toString(),tokenDeltas,explorerUrl:explorerTx(signature)});
}
async function evidence() {
  const record=loadTerms(),source=loadRecordedCharges(runJson),db=store(),sdk=await loadNativeSDK(),{generated}=sdk;
  try {
    const {payer,payee}=publicWallets(),funding=readSecretFile(fundingPath);
    const transactions=[await verifiedTx(funding.signature,'funding','n/a',[payer])],channels=[];
    for(const terms of record.channels) {
      const s=db.get(terms.channelId);check(s&&s.open.status==='finalized'&&s.close?.status==='finalized','settlement_incomplete');
      check(s.termsHash===hashNetworkTerms(terms),'terms_mismatch');
      const openTx=await verifiedTx(s.open.signed.txSignature,'open',terms.channelId),closeTx=await verifiedTx(s.close.signed.txSignature,'cooperative_close',terms.channelId);
      transactions.push(openTx,closeTx);
      const account=(await rpc('getAccountInfo',[s.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value;
      let channelState={exists:false};
      if(account){check(account.owner===DEVNET_NETWORK.program,'channel_owner_mismatch');const c=generated.getChannelDecoder().decode(Buffer.from(account.data[0],'base64'));
        channelState={exists:true,remainingRentLamports:String(account.lamports),status:['Open','Sealed','Closing','Distributed'][c.status]??String(c.status),deposit:c.deposit.toString(),settlement:JSON.parse(JSON.stringify(c.settlement,(_,v)=>typeof v==='bigint'?v.toString():v)),payer:c.payer,payee:c.payee,mint:c.mint,openSlot:c.openSlot.toString()};}
      const escrow=await ataOf(sdk,s.protocolChannelId),escrowOpen=(await rpc('getAccountInfo',[escrow,{encoding:'base64',commitment:'finalized'}])).value!==null;
      const payout=closeTx.tokenDeltas[payee]??'0',refund=closeTx.tokenDeltas[payer]??'0';
      check(openTx.tokenDeltas[payer]==='-20000'&&payout===s.authorizedBaseUnits&&BigInt(refund)+BigInt(payout)===20000n,'settlement_amount_mismatch');
      channels.push({channelId:terms.channelId,advertiserId:terms.advertiserId,campaignVersionId:terms.campaignVersionId,
        channelAddress:s.protocolChannelId,channelExplorerUrl:explorerAddress(s.protocolChannelId),escrowTokenAccount:escrow,escrowClosed:!escrowOpen,
        channelAccountAfterClose:channelState,depositBaseUnits:terms.depositBaseUnits,publisherPayoutBaseUnits:payout,payerRefundBaseUnits:refund,
        openSignature:openTx.signature,closeSignature:closeTx.signature,
        receiptToVoucher:s.intents.map(i=>{const c=source.channels[terms.channelId].charges.find(x=>x.id===i.charge.id);return {
          chargeId:i.charge.id,sequence:i.sequence,awardId:c.awardId,deliveryId:c.deliveryId,publisherReceiptHash:c.acceptedReceiptHash,
          publisherReceiptSignatureVerified:c.publisherReceiptSignatureVerified,sourceChargeHash:c.sourceChargeHash,
          incrementBaseUnits:i.charge.amountBaseUnits,cumulativeVoucherBaseUnits:i.cumulativeAmountBaseUnits,voucherStatus:i.status,
          voucherPayloadHash:i.payloadHash,voucherRecordHash:i.voucherRecordHash,
          settledOnChainBy:i===s.intents.at(-1)?{closeSignature:closeTx.signature,note:'final cumulative voucher verified on-chain by the Ed25519 precompile in settle_and_seal'}:{note:'superseded by the later cumulative voucher (off-chain only, as in the recorded run)'}};})});
    }
    const sumOf=(k,rows=transactions)=>rows.reduce((a,t)=>a+BigInt(t[k]),0n).toString();
    const settlementTx=transactions.filter(t=>t.role!=='funding');
    const out={schemaVersion:'axp.v3-devnet-settlement.v1',settlementRunId:DEVNET_SETTLEMENT_RUN_ID,
      framing:'The three accepted, publisher-signed receipts of recorded run v3-wallet-acceptance, settled on Solana Devnet through two new MPP payment channels. No new model calls, auctions or charges.',
      sourceRun:{runId:SOURCE_RUN_ID,bundle:'artifacts/v3/replay/run.json',bundleSha256:source.sourceFileSha256,originalNetwork:'hosted Solana sandbox (mainnet fork, 402.surfnet.dev)',publisherId:source.publisher.publisherId,publisherKeyId:source.publisher.publisherKeyId},
      network:{cluster:'devnet',rpc:DEVNET_NETWORK.rpc,genesisHash:DEVNET_NETWORK.genesisHash,program:DEVNET_NETWORK.program,programExplorerUrl:explorerAddress(DEVNET_NETWORK.program),
        programAccountHash:record.channels[0].programAccountHash,programDataHash:record.channels[0].programDataHash,
        mint:DEVNET_NETWORK.mint,mintLabel:'Circle Devnet USDC (test token, no value), 6 decimals',tokenProgram:DEVNET_NETWORK.tokenProgram,treasuryOwner:DEVNET_NETWORK.treasuryOwner},
      identities:{payer,payerExplorerUrl:explorerAddress(payer),payee,payeeExplorerUrl:explorerAddress(payee),funder:FUNDER,
        note:'Fresh disposable devnet keypairs (keys local only). One payer represents both fictional advertisers, as in the recorded run. Funded once from the project\'s existing disposable devnet test wallet.'},
      funding:{signature:funding.signature,explorerUrl:explorerTx(funding.signature),lamports:funding.lamports,tokenBaseUnits:funding.tokenBaseUnits,note:'funding, not settlement'},
      channels,transactions,
      totals:{depositBaseUnits:channels.reduce((a,c)=>a+BigInt(c.depositBaseUnits),0n).toString(),
        publisherPayoutBaseUnits:channels.reduce((a,c)=>a+BigInt(c.publisherPayoutBaseUnits),0n).toString(),
        payerRefundBaseUnits:channels.reduce((a,c)=>a+BigInt(c.payerRefundBaseUnits),0n).toString(),
        settlementNetworkFeeLamports:sumOf('networkFeeLamports',settlementTx),settlementNewRentLamports:sumOf('newRentLamports',settlementTx),
        settlementReclaimedRentLamports:sumOf('reclaimedRentLamports',settlementTx),fundingNetworkFeeLamports:transactions[0].networkFeeLamports,
        fundingNewRentLamports:transactions[0].newRentLamports},
      verification:{allSignaturesFinalized:true,checkedAt:new Date().toISOString(),method:'getSignatureStatuses(searchTransactionHistory) + getTransaction(commitment=finalized) on api.devnet.solana.com'},
      limitations:['Devnet test tokens only; not mainnet, not real money.','Receipts, auctions and model decisions come from the recorded sandbox run; only settlement is new.',
        'Same disposable payer represents both fictional advertisers.','An owned-app receipt is not proof of human attention.','Public devnet history may be pruned; this file preserves the finalized observations.']};
    writePublic('settlement.json',out);return {status:'written',path:'artifacts/v3-devnet/settlement.json',totals:out.totals};
  } finally {db.db.close();}
}

const commands={feasibility,wallets,fund,freeze,open:()=>open(arg),authorize:()=>authorize(arg),close:()=>close(arg),reconcile:()=>reconcile(arg,arg2),status,evidence};
try {
  check(commands[command],'operator_command_invalid');
  console.log(JSON.stringify(await commands[command](),(_,v)=>typeof v==='bigint'?v.toString():v,2));
} catch(e) {console.error(JSON.stringify({status:'blocked',reasonCode:e.reasonCode??e.message}));process.exitCode=2;}
