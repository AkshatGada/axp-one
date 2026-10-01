// Fully live V3 run on Solana Devnet (Devnet test USDC only). Terminal operator.
// Run identity: AXP_V3_LIVE_RUN=v3-devnet-live-<label>; public outputs go to
// AXP_V3_LIVE_ARTIFACTS (default artifacts/<run>; never artifacts/v3/**). Private
// state and keys: local-state/v3-devnet-live/<run>/ (gitignored).
// Devnet signing needs AXP_V3_DEVNET_SIGN=1; Jev calls need AXP_V3_ENABLE_MODELS=1.
//
//  init [deepseek-flash-api|codex-cli-exec] | fund | freeze | open <ch> |
//  organic <scenario> | run <scenario> | serve [port] | deliver <scenario> |
//  authorize <ch> | close <ch> | reconcile <ch> [open|close|<chargeId>] |
//  verify | restart | export | status
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fstatSync,closeSync,constants} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {randomBytes} from 'node:crypto';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {NetworkPaymentAdapter,hashNetworkTerms,hashNetworkRecord} from '../../packages/payments/network-adapter.mjs';
import {createNativeTransport} from '../../packages/payments/sdk-transport.mjs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {createV3Server} from '../../apps/backend/v3.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {writeV3Bundle,restoreV3CapturedRecords} from '../../packages/v3/bundle.mjs';
import {paymentEvidenceV3} from '../../packages/v3/payments.mjs';
import {ORGANIC_ENGINES} from '../../packages/v3/organic.mjs';
import {createDeepSeekOrganicProvider} from '../../packages/v3/organic-providers.mjs';
import {POLICY} from '../../packages/v3/config.mjs';
import {hash} from '../../packages/contracts/index.mjs';
import {jevApiKey,localConfiguration} from '../../packages/config/local.mjs';
import {runCodexJSON} from '../../packages/dsp/codex.mjs';
import {DEVNET_NETWORK,explorerTx,explorerAddress,sha256} from '../../packages/v3/devnet-settlement.mjs';
import {assertLiveRunId,LIVE_CHANNEL_IDS,LIVE_FUNDING,freshSolanaSecret,ledgerCharge,ledgerObligations,buildLiveTerms,assertAggregateCaps} from '../../packages/v3/devnet-live.mjs';

const root=resolve(import.meta.dirname,'../..');
const runId=assertLiveRunId(process.env.AXP_V3_LIVE_RUN);
const liveDir=join(root,'local-state/v3-devnet-live',runId),acceptanceDir=join(liveDir,'acceptance'),secretDir=join(liveDir,'secrets');
const artifactDir=resolve(root,process.env.AXP_V3_LIVE_ARTIFACTS??`artifacts/${runId}`);
const termsPath=join(acceptanceDir,'devnet-terms.json'),fundingPath=join(liveDir,'funding.json'),configPath=join(liveDir,'run-config.json');
const FUNDER_WALLET=join(root,'local-state/secrets/test-wallets.json'),FUNDER='D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST';
const signingEnabled=process.env.AXP_V3_DEVNET_SIGN==='1',modelsEnabled=process.env.AXP_V3_ENABLE_MODELS==='1';
const CODEX_BIN=process.env.AXP_CODEX_BIN??'/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
const [command,arg,arg2]=process.argv.slice(2);
const fail=code=>{const e=new Error(code);e.reasonCode=code;throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
check(relative(join(root,'artifacts/v3'),artifactDir).startsWith('..')&&/^[\w-]+$/.test(relative(join(root,'artifacts'),artifactDir)),'forbidden_artifact_path');

async function rpc(method,params=[]) {
  for(let attempt=0;;attempt++) {
    const r=await fetch(DEVNET_NETWORK.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
    if(r.status===429&&method!=='sendTransaction'&&attempt<6){await sleep(1500*(attempt+1));continue;}
    check(r.ok,`rpc_http_${r.status}`);const j=await r.json();if(j.error)fail(`${method}:${JSON.stringify(j.error)}`);return j.result;
  }
}
const writePrivate=(path,value,flag='w')=>{mkdirSync(resolve(path,'..'),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag});};
function writePublic(name,value) {
  const text=JSON.stringify(value,null,2);check(!/"secret"|wireBase64|PRIVATE KEY|"apiKey"|Bearer /.test(text),'public_output_private_material');
  const path=join(artifactDir,name);mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,text+'\n');return relative(root,path);
}
function readSecretFile(path) {
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=fstatSync(fd);check(st.isFile()&&(st.mode&0o777)===0o600&&st.uid===process.getuid(),'wallet_permissions');return JSON.parse(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
}
const walletPathFor=channelId=>join(secretDir,`${channelId}.json`);
function identities(){return Object.fromEntries(LIVE_CHANNEL_IDS.map(id=>{const w=readSecretFile(walletPathFor(id));return [id,{payer:w.sponsor.address,payee:w.publisher.address}];}));}
const runConfig=()=>{check(existsSync(configPath),'init_required');return JSON.parse(readFileSync(configPath,'utf8'));};
async function ataOf(sdk,owner){const {kit,token}=sdk;return (await token.findAssociatedTokenPda({owner:kit.address(owner),mint:kit.address(DEVNET_NETWORK.mint),tokenProgram:kit.address(DEVNET_NETWORK.tokenProgram)}))[0];}
async function tokenAmount(address){const a=(await rpc('getAccountInfo',[address,{encoding:'jsonParsed',commitment:'finalized'}])).value;return a?a.data.parsed.info.tokenAmount.amount:null;}
async function deployment(sdk) {
  const {kit}=sdk;check(await rpc('getGenesisHash')===DEVNET_NETWORK.genesisHash,'genesis_mismatch');
  const program=(await rpc('getAccountInfo',[DEVNET_NETWORK.program,{encoding:'base64',commitment:'finalized'}])).value;
  check(program?.executable&&program.owner==='BPFLoaderUpgradeab1e11111111111111111111111','program_unavailable');
  const data=Buffer.from(program.data[0],'base64'),pdAddress=kit.getAddressDecoder().decode(data.subarray(4,36));
  const pd=Buffer.from((await rpc('getAccountInfo',[pdAddress,{encoding:'base64',commitment:'finalized'}])).value.data[0],'base64');
  const treasuryAta=await ataOf(sdk,DEVNET_NETWORK.treasuryOwner),treasury=(await rpc('getAccountInfo',[treasuryAta,{encoding:'jsonParsed',commitment:'finalized'}])).value;
  check(treasury?.data?.parsed?.info?.owner===DEVNET_NETWORK.treasuryOwner&&treasury.data.parsed.info.state==='initialized','treasury_ata_unavailable');
  return {programAccountHash:sha256(data),programDataAddress:pdAddress,programDataHash:sha256(pd),deploymentSlot:pd.readBigUInt64LE(4).toString(),treasuryTokenAccount:treasuryAta};
}
const service=(options={})=>createV3Service({stateDir:liveDir,runId,retriever:loadEvidence(),payee:identities()[LIVE_CHANNEL_IDS[0]].payee,financialMode:'devnet',organicEngine:runConfig().organicEngine,...options});
async function withService(fn,options){const s=service(options);try{return await fn(s);}finally{await s.harness.close?.();s.close();}}

// ---------- wallets + funding ----------
async function init() {
  const organicEngine=arg??'deepseek-flash-api';check(['deepseek-flash-api','codex-cli-exec'].includes(organicEngine),'organic_engine_invalid');
  if(existsSync(configPath))check(runConfig().organicEngine===organicEngine,'run_config_conflict');
  else writePrivate(configPath,{runId,organicEngine,createdAt:new Date().toISOString()},'wx');
  const {kit}=await loadNativeSDK(),address=async secret=>(await kit.createKeyPairSignerFromBytes(Uint8Array.from(secret))).address;
  if(!LIVE_CHANNEL_IDS.every(id=>existsSync(walletPathFor(id)))) {
    check(!LIVE_CHANNEL_IDS.some(id=>existsSync(walletPathFor(id))),'partial_wallets');
    const pub=freshSolanaSecret(),publisher={address:await address(pub),secret:pub};
    for(const id of LIVE_CHANNEL_IDS){const s=freshSolanaSecret();writePrivate(walletPathFor(id),{network:'solana-devnet',purpose:`disposable devnet test wallet for ${runId} ${id}; never mainnet`,createdAt:new Date().toISOString(),sponsor:{address:await address(s),secret:s},publisher},'wx');}
  }
  return {runId,organicEngine,identities:identities()};
}
async function lookupSignature(sig){const s=(await rpc('getSignatureStatuses',[[sig],{searchTransactionHistory:true}])).value[0];return s?{status:s.err?'failed':s.confirmationStatus,slot:s.slot}:{status:'unknown'};}
async function waitFinalized(sig,ms=120000){const end=Date.now()+ms;let s;do{s=await lookupSignature(sig);if(['finalized','failed'].includes(s.status))return s;await sleep(2000);}while(Date.now()<end);return s;}
async function fund() {
  const ids=identities();
  if(existsSync(fundingPath)){const f=readSecretFile(fundingPath),s=await waitFinalized(f.signature,60000);if(s.status!==f.status)writePrivate(fundingPath,{...f,status:s.status,slot:s.slot});return {status:s.status,signature:f.signature,explorer:explorerTx(f.signature),note:'lookup only'};}
  check(signingEnabled,'signing_disabled');
  const sdk=await loadNativeSDK(),{kit,token}=sdk,w=readSecretFile(FUNDER_WALLET);
  check(w.network==='solana-devnet'&&w.sponsor.address===FUNDER,'funder_identity_mismatch');
  const funder=await kit.createKeyPairSignerFromBytes(Uint8Array.from(w.sponsor.secret));check(funder.address===FUNDER,'funder_identity_mismatch');
  await deployment(sdk);const funderAta=await ataOf(sdk,FUNDER),mint=kit.address(DEVNET_NETWORK.mint),tp=kit.address(DEVNET_NETWORK.tokenProgram);
  check(BigInt(await tokenAmount(funderAta)??'0')>=2n*LIVE_FUNDING.tokenBaseUnitsPerPayer,'funder_insufficient_test_usdc');
  const instructions=[];
  for(const id of LIVE_CHANNEL_IDS) {
    const payer=ids[id].payer,payerAta=await ataOf(sdk,payer);check(await tokenAmount(payerAta)===null,'payer_already_funded');
    const data=Buffer.alloc(12);data.writeUInt32LE(2,0);data.writeBigUInt64LE(LIVE_FUNDING.lamportsPerPayer,4);
    instructions.push({programAddress:kit.address('11111111111111111111111111111111'),accounts:[{address:funder.address,role:kit.AccountRole.WRITABLE_SIGNER,signer:funder},{address:kit.address(payer),role:kit.AccountRole.WRITABLE}],data:new Uint8Array(data)},
      token.getCreateAssociatedTokenIdempotentInstruction({payer:funder,ata:payerAta,owner:kit.address(payer),mint,tokenProgram:tp}),
      token.getTransferCheckedInstruction({source:funderAta,mint,destination:payerAta,authority:funder,amount:LIVE_FUNDING.tokenBaseUnitsPerPayer,decimals:6}));
  }
  const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayerSigner(funder,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions(instructions,m));
  const signed=await kit.signTransactionMessageWithSigners(message),signature=kit.getSignatureFromTransaction(signed),wire=kit.getBase64EncodedWireTransaction(signed);
  const sim=await rpc('simulateTransaction',[wire,{encoding:'base64',sigVerify:true,commitment:'confirmed'}]);check(sim.value.err===null,`funding_simulation_failed:${JSON.stringify(sim.value.err)}`);
  writePrivate(fundingPath,{signature,from:FUNDER,payers:LIVE_CHANNEL_IDS.map(id=>ids[id].payer),lamportsPerPayer:LIVE_FUNDING.lamportsPerPayer.toString(),tokenBaseUnitsPerPayer:LIVE_FUNDING.tokenBaseUnitsPerPayer.toString(),status:'signed_persisted',wireBase64:wire},'wx');
  check(await rpc('sendTransaction',[wire,{encoding:'base64',skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'}])===signature,'submission_identity_mismatch');
  const s=await waitFinalized(signature);writePrivate(fundingPath,{...readSecretFile(fundingPath),status:s.status,slot:s.slot});
  return {status:s.status,signature,explorer:explorerTx(signature)};
}

// ---------- campaigns + payment terms ----------
async function freeze() {
  const ids=identities(),sdk=await loadNativeSDK(),d=await deployment(sdk);
  const f=await withService(async s=>{if(!s.exchange.get('v3_meta','freeze'))for(const draft of s.state().drafts)if(!draft.approved)s.saveCampaign({campaignId:draft.campaign.campaignId,approved:true});return s.freeze();});
  if(existsSync(termsPath))return {status:'already_frozen',freezeHash:f.contentHash,termsHash:JSON.parse(readFileSync(termsPath,'utf8')).termsHash};
  for(const id of LIVE_CHANNEL_IDS)check(BigInt(await tokenAmount(await ataOf(sdk,ids[id].payer))??'0')>=20000n,'insufficient_test_usdc');
  const feasibility={schemaVersion:'axp.v3-devnet-live-feasibility.v1',runId,observedAt:new Date().toISOString(),network:{...DEVNET_NETWORK},deployment:d,signed:false,broadcast:false};
  writePublic('devnet-feasibility.json',feasibility);
  const salts=new Set(),salt=()=>{let v;do{v=randomBytes(8).readBigUInt64LE().toString();}while(v==='0'||salts.has(v));salts.add(v);return v;},now=Math.floor(Date.now()/1000);
  const channels=LIVE_CHANNEL_IDS.map(id=>buildLiveTerms({runId,campaign:f.campaigns.find(c=>c.channelId===id),payer:ids[id].payer,payee:ids[id].payee,openSalt:salt(),now,
    programAccountHash:d.programAccountHash,programDataHash:d.programDataHash,compatibilityHash:hashNetworkRecord(feasibility)}));
  const record={schemaVersion:'axp.v3-devnet-live-terms.v1',runId,freezeHash:f.contentHash,channels,termsHash:null};record.termsHash=hashNetworkRecord(record);writePrivate(termsPath,record,'wx');
  return {status:'frozen',freezeHash:f.contentHash,termsHash:record.termsHash,voucherExpiresAt:new Date(channels[0].voucherExpiresAt*1000).toISOString(),campaigns:f.campaigns.map(c=>c.campaignVersionId)};
}
function loadTerms(){check(existsSync(termsPath),'freeze_required');const r=JSON.parse(readFileSync(termsPath,'utf8'));check(r.runId===runId&&r.termsHash===hashNetworkRecord({...r,termsHash:null}),'terms_mismatch');return r;}

// ---------- payment channels ----------
async function withAdapter(channelId,fn) {
  check(LIVE_CHANNEL_IDS.includes(channelId),'channel_not_allowed');
  const terms=loadTerms().channels.find(t=>t.channelId===channelId),s=service(),db=new SQLitePaymentStore(join(acceptanceDir,'payments.sqlite'));
  const transport=await createNativeTransport({terms,statePath:join(acceptanceDir,'native.sqlite'),walletPath:walletPathFor(channelId)});
  const beforeSigning=async({operation})=>{
    check(signingEnabled,'signing_disabled');const d=await deployment(await loadNativeSDK());
    check(d.programAccountHash===terms.programAccountHash&&d.programDataHash===terms.programDataHash,'deployment_changed');
    assertAggregateCaps(s.exchange,POLICY);
    for(const o of db.list())if(o.channelId!==channelId)check(['finalized','prepared'].includes(o.open.status)&&(!o.close||['finalized','prepared'].includes(o.close.status))&&o.intents.every(i=>i.status==='authorized'),'reconciliation_required');
    console.error(`[signing] ${channelId} ${operation}`);
  };
  const adapter=new NetworkPaymentAdapter({store:db,protocolTransport:transport,getLedgerCharge:id=>ledgerCharge(s.exchange,id),getLedgerObligations:id=>ledgerObligations(s.exchange,id),beforeSigning,approvalTermsHash:hashNetworkTerms(terms)});
  try{return await fn({adapter,db,terms,service:s});}finally{transport.close();db.db.close();s.close();}
}
async function settle(adapter,channelId,result){for(let i=0;i<40&&result.status==='submitted';i++){await sleep(3000);result=await adapter.reconcile({channelId});}return result;}
const open=id=>withAdapter(id,async({adapter,db,terms})=>{
  if(!db.get(id)){check(signingEnabled,'signing_disabled');await adapter.prepareOpen(terms);}
  const r=await settle(adapter,id,await adapter.confirmOpen({channelId:id,planId:db.get(id).open.id}));
  return {...r,explorer:r.txSignature?explorerTx(r.txSignature):null,channel:r.protocolChannelId?explorerAddress(r.protocolChannelId):null};
});
const authorize=id=>withAdapter(id,async({adapter,service:s})=>{
  const results=[];
  for(const c of ledgerObligations(s.exchange,id).charges){
    if(adapter.lookupAuthorization({channelId:id,chargeId:c.id}).status==='absent')check(signingEnabled,'signing_disabled');
    const r=await adapter.authorizeCumulative({channelId:id,chargeId:c.id});results.push({chargeId:r.chargeId,status:r.status,incrementBaseUnits:r.incrementBaseUnits,cumulativeAmountBaseUnits:r.cumulativeAmountBaseUnits,payloadHash:r.payloadHash});if(r.status!=='authorized')break;
  }
  return {status:results.every(r=>r.status==='authorized')?'authorized':'unknown',channelId:id,authorizations:results};
});
const close=id=>withAdapter(id,async({adapter,db,service:s})=>{
  let state=db.get(id);check(state?.open.status==='finalized','open_required');
  if(!state.close){check(signingEnabled,'signing_disabled');s.exchange.drainNetworkChannel(id);if(state.phase==='open')await adapter.beginDrain({channelId:id});const plan=await adapter.prepareClose({channelId:id});if(plan.status!=='prepared')return plan;state=db.get(id);}
  const r=await settle(adapter,id,await adapter.confirmClose({channelId:id,planId:state.close.id}));
  return {...r,explorer:r.txSignature?explorerTx(r.txSignature):null};
});
const reconcile=(id,op)=>withAdapter(id,async({adapter,db})=>{
  const s=db.get(id);check(s,'channel_not_found');
  if(op==='open')return adapter.reconcile({channelId:id,planId:s.open.id});
  if(op==='close')return adapter.reconcile({channelId:id,planId:s.close.id});
  return op?adapter.reconcile({channelId:id,chargeId:op}):adapter.reconcile({channelId:id});
});

// ---------- organic answers (bounded, sponsor-free) ----------
async function organic(scenarioId) {
  const engine=runConfig().organicEngine,attemptsPath=join(liveDir,'organic-attempts.json');
  return withService(async s=>{
    const r=s.requestTurn({scenarioId,financialMode:'devnet'}).organic;
    if(r.status==='completed')return {status:'already_completed',turnId:r.turnId};
    const attempts=existsSync(attemptsPath)?JSON.parse(readFileSync(attemptsPath,'utf8')):[];
    // Bound: at most 4 provider attempts per scenario, 10 per run. Only format/transport/
    // truncation failures (no answer) are retried; failures are logged, never hidden.
    check(attempts.length<10&&attempts.filter(a=>a.turnId===r.turnId).length<4,'organic_attempt_limit');
    attempts.push({turnId:r.turnId,engine,at:new Date().toISOString()});writePrivate(attemptsPath,attempts);
    let out;
    if(engine==='deepseek-flash-api'){const key=localConfiguration().DEEPSEEK_API_KEY;try{out=await createDeepSeekOrganicProvider({apiKey:key,maxCalls:1})({suppliedPrompt:r.suppliedPrompt});}catch(e){attempts.at(-1).outcome=e.code??'failed';if(e.details)attempts.at(-1).details=e.details;writePrivate(attemptsPath,attempts);throw e;}}
    else{const x=await runCodexJSON(r.suppliedPrompt,{type:'object',additionalProperties:false,properties:{answer:{type:'string'}},required:['answer']},{executable:CODEX_BIN});
      out={engine,answer:x.value.answer,agentId:x.threadId,model:x.provenance.model,providerModel:x.provenance.model,effort:x.provenance.effort,usage:{inputTokens:x.provenance.usage?.input_tokens??0,outputTokens:x.provenance.usage?.output_tokens??0},elapsedMs:x.provenance.elapsedMs};}
    attempts.at(-1).outcome='completed';writePrivate(attemptsPath,attempts);
    const body={turnId:r.turnId,requestId:r.requestId,inputHash:r.inputHash,agentId:out.agentId,model:out.model,effort:out.effort,answer:out.answer,completedAt:new Date().toISOString(),engine,usage:out.usage};
    const done=s.organic.complete(body);
    writePublic(`organic/${scenarioId}.json`,{schemaVersion:'axp.v3-organic-answer.v1',runId,scenarioId,turnId:r.turnId,question:r.question,inputHash:r.inputHash,suppliedPrompt:r.suppliedPrompt,
      engine,model:out.model,providerModel:out.providerModel,effort:out.effort,agentId:out.agentId,usage:out.usage,elapsedMs:out.elapsedMs,answer:out.answer,completedAt:body.completedAt,provenance:done.provenance});
    return {status:'completed',turnId:r.turnId,engine,providerModel:out.providerModel,usage:out.usage,characters:out.answer.length,elapsedMs:out.elapsedMs};
  });
}

// ---------- auctions (Jev) and delivery ----------
async function runScenario(scenarioId) {
  const live=scenarioId!=='mobile';if(live)check(modelsEnabled,'paid_calls_unapproved');
  return withService(async s=>{
    const st=await s.runTurn({scenarioId,financialMode:'devnet'}),t=st.turns.find(t=>t.scenario?.id===scenarioId);
    return {scenarioId,status:t.status,execution:t.execution,records:(t.records??[]).map(r=>({campaignId:r.campaignId,arm:r.arm,status:r.status,decision:r.decision?.decision,relevance:r.decision?.relevanceLevel,intent:r.decision?.commercialIntentLevel,elapsedMs:Math.round(r.elapsedMs??0)})),
      excluded:t.eligibility?.excluded,outcome:{status:t.outcome?.status,bids:t.outcome?.bids?.map(b=>({campaignId:b.campaignId,amountBaseUnits:b.amountBaseUnits})),award:t.outcome?.award?{id:t.outcome.award.id,campaignId:t.outcome.award.campaignId,priceBaseUnits:t.outcome.award.priceBaseUnits,status:t.outcome.award.status}:null},
      model:{admittedCalls:st.model.admittedCalls,usage:st.model.usage}};
  },live?{apiKey:jevApiKey(),liveEnabled:true}:{});
}
// Fallback only: operator asserts the owned-app render facts without a browser DOM.
async function deliverHeadless(scenarioId) {
  return withService(async s=>{
    const t=s.state().turns.find(t=>t.scenario?.id===scenarioId),award=t?.outcome?.award;check(award,'no_award');
    const r=s.acknowledge(award.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:award.creativeHash});
    const log=join(liveDir,'deliveries.json'),rows=existsSync(log)?JSON.parse(readFileSync(log,'utf8')):[];rows.push({awardId:award.id,method:'operator-headless-ack',at:new Date().toISOString()});writePrivate(log,rows);
    return {chargeId:r.charge.id,amountBaseUnits:r.charge.amountBaseUnits,channelId:r.charge.channelId,replayed:r.replayed,method:'operator-headless-ack'};
  });
}
async function serve() {
  const port=Number(arg??8795);check(Number.isSafeInteger(port)&&port>1024,'port_invalid');
  const server=createV3Server({stateDir:liveDir,runId,retriever:loadEvidence(),payee:identities()[LIVE_CHANNEL_IDS[0]].payee,financialMode:'devnet',organicEngine:runConfig().organicEngine});
  await new Promise(r=>server.listen(port,'127.0.0.1',r));console.error(`AXP V3 live devnet console http://127.0.0.1:${port} (models disabled; delivery only)`);
  for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{server.close();server.closeAllConnections();});
  return new Promise(()=>{});
}

// ---------- verification, restart, export ----------
async function verify() {
  const terms=loadTerms(),store=new SQLitePaymentStore(join(acceptanceDir,'payments.sqlite'),{readOnly:true}),sdk=await loadNativeSDK();
  try {
    const states=store.list(),payments=paymentEvidenceV3(store,{runId,mode:'devnet'});check(states.length===2&&new Set(states.map(s=>s.protocolChannelId)).size===2,'two_channels_required');
    let networkFees=0n,newRent=0n,reclaimed=0n;const channels=[];
    for(const state of states) {
      const t=terms.channels.find(c=>c.channelId===state.channelId);check(t&&state.open.status==='finalized'&&state.close?.status==='finalized','settlement_incomplete');
      const receipts=[state.open.receipt,state.close.receipt],statuses=await rpc('getSignatureStatuses',[receipts.map(r=>r.txSignature),{searchTransactionHistory:true}]);
      check(statuses.value.every(s=>s?.confirmationStatus==='finalized'&&!s.err),'not_finalized');
      const account=(await rpc('getAccountInfo',[state.protocolChannelId,{encoding:'base64',commitment:'finalized'}])).value;check(account?.owner===t.program,'channel_owner_mismatch');
      const channel=sdk.generated.getChannelDecoder().decode(Buffer.from(account.data[0],'base64'));
      check(channel.status===3&&channel.deposit===20000n&&channel.payer===t.payer&&channel.payee===t.payee&&channel.mint===t.mint&&channel.salt===BigInt(t.openSalt),'channel_state_mismatch');
      const escrow=await ataOf(sdk,state.protocolChannelId);check((await rpc('getAccountInfo',[escrow,{encoding:'base64',commitment:'finalized'}])).value===null,'escrow_open');
      const payout=BigInt(state.close.receipt.settledBaseUnits),refund=BigInt(state.close.receipt.refundBaseUnits);check(payout===BigInt(state.authorizedBaseUnits)&&payout+refund===20000n&&payout<=8000n,'conservation');
      for(const r of receipts){networkFees+=BigInt(r.evidence.networkFeeLamports);newRent+=BigInt(r.evidence.newRentLamports);reclaimed+=BigInt(r.evidence.reclaimedRentLamports);}
      channels.push({channelId:state.channelId,protocolChannelId:state.protocolChannelId,network:t.network,rpc:t.rpc,genesisHash:t.genesisHash,program:t.program,mint:t.mint,payer:t.payer,payee:t.payee,openSalt:t.openSalt,
        openSignature:state.open.receipt.txSignature,closeSignature:state.close.receipt.txSignature,transactionStatuses:statuses.value,depositBaseUnits:'20000',publisherPayoutBaseUnits:payout.toString(),payerRefundBaseUnits:refund.toString(),
        remainingChannelRentLamports:String(account.lamports),escrowClosed:true,status:'Distributed',
        explorer:{channel:explorerAddress(state.protocolChannelId),open:explorerTx(state.open.receipt.txSignature),close:explorerTx(state.close.receipt.txSignature),payer:explorerAddress(t.payer),payee:explorerAddress(t.payee)},
        originalTransactions:receipts.map(r=>r.evidence)});
    }
    const gross=networkFees+newRent;check(gross<=BigInt(POLICY.aggregateFeeRentLamports),'fee_cap');
    const funding=readSecretFile(fundingPath),fs=await lookupSignature(funding.signature);check(fs.status==='finalized','funding_not_finalized');
    const report={schemaVersion:'axp.v3-chain-check.v1',runId,financialMode:'devnet',network:'Solana Devnet',at:new Date().toISOString(),channels,networkFeeLamports:networkFees.toString(),grossNewRentLamports:newRent.toString(),
      reclaimedRentLamports:reclaimed.toString(),grossFeeAndRentLamports:gross.toString(),feeAndRentCapLamports:POLICY.aggregateFeeRentLamports,payments,
      funding:{signature:funding.signature,explorer:explorerTx(funding.signature),from:FUNDER,payers:funding.payers,lamportsPerPayer:funding.lamportsPerPayer,tokenBaseUnitsPerPayer:funding.tokenBaseUnitsPerPayer,slot:fs.slot,note:'funding, not settlement'},
      allChecksPassed:true};
    return {status:'verified',path:writePublic('chain-check.json',report),grossFeeAndRentLamports:gross.toString(),payouts:channels.map(c=>[c.channelId,c.publisherPayoutBaseUnits,c.payerRefundBaseUnits])};
  } finally {store.close();}
}
async function restart() {
  let s=service();
  try {
    const before=s.state();check(before.turns.length===4&&before.turns.every(t=>t.status==='completed')&&before.payments.length===2&&before.payments.every(p=>p.closeStatus==='finalized'),'connected_run_required');
    const beforeHash=hash(before);s.close();s=service();
    for(const t of before.turns)await s.runTurn({scenarioId:t.scenario.id,financialMode:'devnet'});
    const duplicateReceipts=s.exchange.all('receipt_records').map(({receipt,signature})=>{const r=s.exchange.acceptDelivery({receipt,signature});check(r.replayed===true,'duplicate_created_new_delivery');return {chargeId:r.charge.id,replayed:true};});
    const after=s.state(),afterHash=hash(after);check(beforeHash===afterHash,'restart_state_changed');
    const evidence={schemaVersion:'axp.v3-restart.v1',runId,beforeHash,afterHash,newCalls:after.model.admittedCalls-before.model.admittedCalls,newCharges:after.exchange.charges.length-before.exchange.charges.length,newSignatures:0,newBroadcasts:0,duplicateReceipts,
      method:'Restart without provider authorization; replay four completed turns and the original signed publisher receipts using saved outcomes. No payment transport or signer instantiated.',at:new Date().toISOString()};
    writePublic('restart.json',evidence);return evidence;
  } finally {s.close();}
}
async function exportBundle() {
  const retriever=loadEvidence();
  return withService(async s=>{
    const callEvidence=s.harness.results(),state=restoreV3CapturedRecords(s.state(),callEvidence);
    const run={schemaVersion:'axp.v3-run.v1',runId,manifest:retriever.manifest,evidence:retriever.publicCatalogue(),state,events:state.exchange.events,receipts:s.exchange.all('receipt_records'),publishers:s.exchange.all('publishers'),
      restart:JSON.parse(readFileSync(join(artifactDir,'restart.json'))),callEvidence,
      retrieval:state.turns.filter(t=>t.scenario.id==='cached'||t.scenario.id==='offline').flatMap(t=>t.records.filter(r=>r.arm==='history').map(r=>({question:t.question,campaignId:r.campaignId,result:r.retrieval}))),
      chainEvidence:JSON.parse(readFileSync(join(artifactDir,'chain-check.json'))),limitations:state.limitations,createdAt:new Date().toISOString()};
    const saved=writeV3Bundle(join(artifactDir,'replay'),run);
    return {status:'verified',runId,bundleHash:saved.bundleHash,financialMode:saved.manifest.financialMode,storyGates:saved.manifest.storyGates,charges:state.exchange.charges.length};
  },{retriever});
}
function status() {
  const store=new SQLitePaymentStore(join(acceptanceDir,'payments.sqlite'));
  try{return store.list().map(s=>({channelId:s.channelId,phase:s.phase,protocolChannelId:s.protocolChannelId??null,open:s.open.status,close:s.close?.status??null,authorizedBaseUnits:s.authorizedBaseUnits,intents:s.intents.map(i=>[i.charge.id,i.status,i.cumulativeAmountBaseUnits])}));}finally{store.close();}
}

const commands={init,fund,freeze,open:()=>open(arg),organic:()=>organic(arg),run:()=>runScenario(arg),deliver:()=>deliverHeadless(arg),serve,authorize:()=>authorize(arg),close:()=>close(arg),reconcile:()=>reconcile(arg,arg2),verify,restart,export:exportBundle,status};
try {
  check(commands[command],'operator_command_invalid');
  console.log(JSON.stringify(await commands[command](),(_,v)=>typeof v==='bigint'?v.toString():v,2));
} catch(e) {console.error(JSON.stringify({status:'blocked',reasonCode:e.reasonCode??e.code??e.message}));process.exitCode=2;}
