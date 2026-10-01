// One hosted live V3 run on Solana Devnet: the operator steps of
// scripts/demo/v3-devnet-live.mjs as a library over an explicit run directory,
// using stable hosted wallets instead of per-run funded payers. Every step is
// resumable and idempotent on the same directory. Public outputs go to artifactDir.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {loadNativeSDK} from '../payments/sdk-loader.mjs';
import {SQLitePaymentStore} from '../payments/store.mjs';
import {NetworkPaymentAdapter,hashNetworkTerms,hashNetworkRecord} from '../payments/network-adapter.mjs';
import {createNativeTransport} from '../payments/sdk-transport.mjs';
import {createV3Service} from '../v3/service.mjs';
import {loadEvidence} from '../v2/evidence.mjs';
import {writeV3Bundle,restoreV3CapturedRecords} from '../v3/bundle.mjs';
import {paymentEvidenceV3} from '../v3/payments.mjs';
import {createDeepSeekOrganicProvider} from '../v3/organic-providers.mjs';
import {POLICY,CAMPAIGNS,SCENARIOS} from '../v3/config.mjs';
import {hash} from '../contracts/index.mjs';
import {DEVNET_NETWORK,DEPOSIT_BASE_UNITS,explorerTx,explorerAddress,sha256} from '../v3/devnet-settlement.mjs';
import {assertLiveRunId,LIVE_CHANNEL_IDS,ledgerCharge,ledgerObligations,buildLiveTerms,assertAggregateCaps} from '../v3/devnet-live.mjs';

export const ORGANIC_ENGINE='deepseek-flash-api';
export const SCENARIO_IDS=SCENARIOS.map(s=>s.id);
// A payer needs the deposit and enough SOL for one open (~3.45M lamports) + close (~1.5M).
export const PAYER_MINIMUM=Object.freeze({tokenBaseUnits:BigInt(DEPOSIT_BASE_UNITS),lamports:8_000_000n});
const ORGANIC_LIMITS=Object.freeze({perScenario:4,perRun:10});
const NAME=Object.fromEntries(CAMPAIGNS.map(c=>[c.campaignId,c.displayName]));
const CHANNEL_CAMPAIGN=Object.fromEntries(CAMPAIGNS.map(c=>[c.channelId,c.campaignId]));

const fail=(code,extra)=>{const e=new Error(code);e.code=code;if(extra)Object.assign(e,extra);throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let evidenceCache;
const evidence=()=>evidenceCache??=loadEvidence();

export async function rpc(method,params=[]) {
  for(let attempt=0;;attempt++) {
    let r;
    try{r=await fetch(DEVNET_NETWORK.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});}
    catch(e){if(method!=='sendTransaction'&&attempt<3){await sleep(1000*(attempt+1));continue;}throw e;}
    if(r.status===429&&method!=='sendTransaction'&&attempt<6){await sleep(1500*(attempt+1));continue;}
    check(r.ok,`rpc_http_${r.status}`);const j=await r.json();if(j.error)fail(`${method}:${JSON.stringify(j.error)}`);return j.result;
  }
}
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
async function lookupSignature(sig){const s=(await rpc('getSignatureStatuses',[[sig],{searchTransactionHistory:true}])).value[0];return s?{status:s.err?'failed':s.confirmationStatus,slot:s.slot}:{status:'unknown'};}

/** Payer balances (public addresses only); used for the health check before a run. */
export async function payerHealth(wallets) {
  const sdk=await loadNativeSDK(),out={};
  for(const id of LIVE_CHANNEL_IDS) {
    const address=wallets.payers[id].address,lamports=BigInt((await rpc('getBalance',[address,{commitment:'finalized'}])).value),tokens=BigInt(await tokenAmount(await ataOf(sdk,address))??'0');
    out[id]={address,lamports:lamports.toString(),tokenBaseUnits:tokens.toString(),ok:lamports>=PAYER_MINIMUM.lamports&&tokens>=PAYER_MINIMUM.tokenBaseUnits,
      runsLeftEstimate:Number(tokens/8000n<lamports/4_500_000n?tokens/8000n:lamports/4_500_000n)};
  }
  return out;
}

export function createLiveRunEngine({runId,liveDir,artifactDir,wallets,walletPaths,config,signingEnabled=false,modelsEnabled=false,log=()=>{}}) {
  assertLiveRunId(runId);
  const acceptanceDir=join(liveDir,'acceptance'),termsPath=join(acceptanceDir,'devnet-terms.json'),configPath=join(liveDir,'run-config.json');
  const attemptsPath=join(liveDir,'organic-attempts.json'),deliveriesPath=join(liveDir,'deliveries.json');
  const payee=wallets.publisher.address;
  const identities=Object.fromEntries(LIVE_CHANNEL_IDS.map(id=>[id,{payer:wallets.payers[id].address,payee}]));
  const writePrivate=(path,value,flag='w')=>{mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag});};
  const readJSON=(path,fallback)=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):fallback;
  function writePublic(name,value) {
    const text=JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v,2);check(!/"secret"|wireBase64|PRIVATE KEY|"apiKey"|Bearer /.test(text),'public_output_private_material');
    const path=join(artifactDir,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text+'\n');return name;
  }
  const service=(options={})=>createV3Service({stateDir:liveDir,runId,retriever:evidence(),payee,financialMode:'devnet',organicEngine:ORGANIC_ENGINE,...options});
  async function withService(fn,options){const s=service(options);try{return await fn(s);}finally{await s.harness.close?.();s.close();}}
  const loadTerms=()=>{check(existsSync(termsPath),'freeze_required');const r=JSON.parse(readFileSync(termsPath,'utf8'));check(r.runId===runId&&r.termsHash===hashNetworkRecord({...r,termsHash:null}),'terms_mismatch');return r;};

  // ---------- campaigns, terms and organic requests ----------
  async function prepare() {
    if(!existsSync(configPath))writePrivate(configPath,{runId,organicEngine:ORGANIC_ENGINE,hosted:true,createdAt:new Date().toISOString()},'wx');
    const sdk=await loadNativeSDK(),d=await deployment(sdk);
    const f=await withService(async s=>{
      if(!s.exchange.get('v3_meta','freeze'))for(const draft of s.state().drafts)if(!draft.approved)s.saveCampaign({campaignId:draft.campaign.campaignId,approved:true});
      const frozen=s.freeze();
      for(const scenarioId of SCENARIO_IDS)s.requestTurn({scenarioId,financialMode:'devnet'});
      return frozen;
    });
    if(existsSync(termsPath))return {status:'already_frozen',freezeHash:f.contentHash};
    for(const id of LIVE_CHANNEL_IDS) {
      const lamports=BigInt((await rpc('getBalance',[identities[id].payer,{commitment:'finalized'}])).value),tokens=BigInt(await tokenAmount(await ataOf(sdk,identities[id].payer))??'0');
      if(lamports<PAYER_MINIMUM.lamports||tokens<PAYER_MINIMUM.tokenBaseUnits)fail('payer_underfunded',{terminal:true});
    }
    const feasibility={schemaVersion:'axp.v3-devnet-live-feasibility.v1',runId,observedAt:new Date().toISOString(),network:{...DEVNET_NETWORK},deployment:d,signed:false,broadcast:false};
    writePublic('devnet-feasibility.json',feasibility);
    const salts=new Set(),salt=()=>{let v;do{v=randomBytes(8).readBigUInt64LE().toString();}while(v==='0'||salts.has(v));salts.add(v);return v;},now=Math.floor(Date.now()/1000);
    const channels=LIVE_CHANNEL_IDS.map(id=>buildLiveTerms({runId,campaign:f.campaigns.find(c=>c.channelId===id),payer:identities[id].payer,payee,openSalt:salt(),now,
      programAccountHash:d.programAccountHash,programDataHash:d.programDataHash,compatibilityHash:hashNetworkRecord(feasibility)}));
    const record={schemaVersion:'axp.v3-devnet-live-terms.v1',runId,freezeHash:f.contentHash,channels,termsHash:null};record.termsHash=hashNetworkRecord(record);writePrivate(termsPath,record,'wx');
    log('frozen',{freezeHash:f.contentHash});
    return {status:'frozen',freezeHash:f.contentHash,voucherExpiresAt:new Date(channels[0].voucherExpiresAt*1000).toISOString()};
  }

  // ---------- payment channels (existing adapter, unchanged) ----------
  async function withAdapter(channelId,fn) {
    check(LIVE_CHANNEL_IDS.includes(channelId),'channel_not_allowed');
    const terms=loadTerms().channels.find(t=>t.channelId===channelId),s=service(),db=new SQLitePaymentStore(join(acceptanceDir,'payments.sqlite'));
    const transport=await createNativeTransport({terms,statePath:join(acceptanceDir,'native.sqlite'),walletPath:walletPaths[channelId]});
    const beforeSigning=async({operation})=>{
      check(signingEnabled,'signing_disabled');const dep=await deployment(await loadNativeSDK());
      check(dep.programAccountHash===terms.programAccountHash&&dep.programDataHash===terms.programDataHash,'deployment_changed');
      assertAggregateCaps(s.exchange,POLICY);
      for(const o of db.list())if(o.channelId!==channelId)check(['finalized','prepared'].includes(o.open.status)&&(!o.close||['finalized','prepared'].includes(o.close.status))&&o.intents.every(i=>i.status==='authorized'),'reconciliation_required');
      log('signing',{channelId,operation});
    };
    const adapter=new NetworkPaymentAdapter({store:db,protocolTransport:transport,getLedgerCharge:id=>ledgerCharge(s.exchange,id),getLedgerObligations:id=>ledgerObligations(s.exchange,id),beforeSigning,approvalTermsHash:hashNetworkTerms(terms)});
    try{return await fn({adapter,db,terms,service:s});}finally{transport.close();db.db.close();s.close();}
  }
  async function settle(adapter,channelId,result){for(let i=0;i<40&&result.status==='submitted';i++){await sleep(3000);result=await adapter.reconcile({channelId});}return result;}
  const openChannel=id=>withAdapter(id,async({adapter,db,terms})=>{
    if(!db.get(id)){check(signingEnabled,'signing_disabled');await adapter.prepareOpen(terms);}
    const r=await settle(adapter,id,await adapter.confirmOpen({channelId:id,planId:db.get(id).open.id}));
    log('open',{channelId:id,status:r.status});
    return {status:r.status,txSignature:r.txSignature??null,protocolChannelId:r.protocolChannelId??null};
  });
  const authorize=id=>withAdapter(id,async({adapter,service:s})=>{
    const results=[];
    for(const c of ledgerObligations(s.exchange,id).charges){
      if(adapter.lookupAuthorization({channelId:id,chargeId:c.id}).status==='absent')check(signingEnabled,'signing_disabled');
      const r=await adapter.authorizeCumulative({channelId:id,chargeId:c.id});results.push({chargeId:r.chargeId,status:r.status,cumulativeAmountBaseUnits:r.cumulativeAmountBaseUnits});if(r.status!=='authorized')break;
    }
    return {status:results.every(r=>r.status==='authorized')?'authorized':'unknown',channelId:id,authorizations:results};
  });
  const closeChannel=id=>withAdapter(id,async({adapter,db,service:s})=>{
    let state=db.get(id);if(!state)return {status:'never_opened'};
    // An in-flight open (e.g. after an aborted step) is reconciled by lookup only, never re-signed.
    if(state.open.status!=='finalized'&&!['prepared','failed'].includes(state.open.status)){await adapter.reconcile({channelId:id});state=db.get(id);}
    if(state.open.status!=='finalized')return {status:'open_not_finalized',open:state.open.status};
    if(!state.close){check(signingEnabled,'signing_disabled');s.exchange.drainNetworkChannel(id);if(state.phase==='open')await adapter.beginDrain({channelId:id});const plan=await adapter.prepareClose({channelId:id});if(plan.status!=='prepared')return plan;state=db.get(id);}
    const r=await settle(adapter,id,await adapter.confirmClose({channelId:id,planId:state.close.id}));
    log('close',{channelId:id,status:r.status});
    return {status:r.status,txSignature:r.txSignature??null};
  });
  const reconcileChannel=id=>withAdapter(id,async({adapter,db})=>{const s=db.get(id);if(!s)return {status:'never_opened'};return adapter.reconcile({channelId:id});});
  function channelStates() {
    const p=join(acceptanceDir,'payments.sqlite');if(!existsSync(p))return {};
    const store=new SQLitePaymentStore(p);
    try{return Object.fromEntries(store.list().map(s=>[s.channelId,{phase:s.phase,open:s.open.status,close:s.close?.status??null,intents:s.intents.map(i=>i.status)}]));}finally{store.close();}
  }

  // ---------- organic answers (bounded, sponsor-free) ----------
  async function organic(scenarioId,s) {
    check(modelsEnabled,'models_disabled');
    const r=s.requestTurn({scenarioId,financialMode:'devnet'}).organic;
    if(r.status==='completed')return {status:'already_completed',scenarioId};
    const attempts=readJSON(attemptsPath,[]);
    if(!(attempts.length<ORGANIC_LIMITS.perRun&&attempts.filter(a=>a.turnId===r.turnId).length<ORGANIC_LIMITS.perScenario))fail('organic_attempt_limit',{terminal:true});
    const attempt={turnId:r.turnId,engine:ORGANIC_ENGINE,at:new Date().toISOString()};attempts.push(attempt);writePrivate(attemptsPath,attempts);
    const record=outcome=>{const all=readJSON(attemptsPath,[]),mine=all.find(a=>a.turnId===attempt.turnId&&a.at===attempt.at);if(mine)Object.assign(mine,outcome);writePrivate(attemptsPath,all);};
    let out;
    try{out=await createDeepSeekOrganicProvider({apiKey:config.DEEPSEEK_API_KEY,maxCalls:1})({suppliedPrompt:r.suppliedPrompt});}
    catch(e){record({outcome:e.code??'failed',...(e.details?{details:e.details}:{})});throw e;}
    record({outcome:'completed'});
    const body={turnId:r.turnId,requestId:r.requestId,inputHash:r.inputHash,agentId:out.agentId,model:out.model,effort:out.effort,answer:out.answer,completedAt:new Date().toISOString(),engine:ORGANIC_ENGINE,usage:out.usage};
    const done=s.organic.complete(body);
    writePublic(`organic/${scenarioId}.json`,{schemaVersion:'axp.v3-organic-answer.v1',runId,scenarioId,turnId:r.turnId,question:r.question,inputHash:r.inputHash,suppliedPrompt:r.suppliedPrompt,
      engine:ORGANIC_ENGINE,model:out.model,providerModel:out.providerModel,effort:out.effort,agentId:out.agentId,usage:out.usage,elapsedMs:out.elapsedMs,answer:out.answer,completedAt:body.completedAt,provenance:done.provenance});
    log('organic',{scenarioId,elapsedMs:out.elapsedMs});
    return {status:'completed',scenarioId,elapsedMs:out.elapsedMs};
  }
  /** Organic answers for every scenario still waiting, in parallel, one service. */
  const organicAll=()=>withService(async s=>{
    const results=await Promise.allSettled(SCENARIO_IDS.map(id=>organic(id,s)));
    return results.map((r,i)=>r.status==='fulfilled'?r.value:{status:'failed',scenarioId:SCENARIO_IDS[i],reason:r.reason?.code??r.reason?.message,terminal:!!r.reason?.terminal});
  });

  // ---------- auctions (Jev) and delivery ----------
  async function runScenario(scenarioId) {
    const live=scenarioId!=='mobile';if(live)check(modelsEnabled,'models_disabled');
    const apiKey=config.JEV_API_KEY||config.TYPESAFE_API_KEY;if(live)check(apiKey,'jev_key_unavailable');
    return withService(async s=>{
      const st=await s.runTurn({scenarioId,financialMode:'devnet'}),t=st.turns.find(t=>t.scenario?.id===scenarioId);
      log('auction',{scenarioId,outcome:t.outcome?.status});
      return {scenarioId,status:t.status,outcome:t.outcome?.status};
    },live?{apiKey,liveEnabled:true}:{});
  }
  /** Browser acknowledgement → signed publisher receipt → accepted charge. */
  async function acknowledge(awardId,body) {
    const r=await withService(async s=>{
      const award=s.exchange.get('awards',awardId);check(award&&award.runId===runId,'award_not_found');
      return s.acknowledge(awardId,{domInserted:body.domInserted,sponsoredLabelPresent:body.sponsoredLabelPresent,creativeHash:body.creativeHash});
    });
    if(!r.replayed){const rows=readJSON(deliveriesPath,[]);rows.push({awardId,method:'browser-dom-ack',at:new Date().toISOString()});writePrivate(deliveriesPath,rows);}
    log('delivery',{awardId,chargeId:r.charge.id,replayed:!!r.replayed});
    return {chargeId:r.charge.id,channelId:r.charge.channelId,amountBaseUnits:r.charge.amountBaseUnits,receiptHash:r.charge.receiptHash,replayed:!!r.replayed};
  }
  const failAward=awardId=>withService(async s=>s.fail(awardId));
  /** Authorize vouchers for every channel with accepted, unauthorized charges. */
  async function authorizePending() {
    const pending=await withService(async s=>{const states=channelStates();return LIVE_CHANNEL_IDS.filter(id=>{const n=ledgerObligations(s.exchange,id).charges.length;const st=states[id];return n>0&&(!st||st.intents.length<n||st.intents.some(x=>x!=='authorized'));});});
    const out=[];for(const id of pending)out.push(await authorize(id));return out;
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
      // Stable hosted payers: funded once, not per run. Shape kept for the MVP projection.
      const f=(wallets.funding??[]).at(-1),fs=f?await lookupSignature(f.signature):null;
      const report={schemaVersion:'axp.v3-chain-check.v1',runId,financialMode:'devnet',network:'Solana Devnet',at:new Date().toISOString(),channels,networkFeeLamports:networkFees.toString(),grossNewRentLamports:newRent.toString(),
        reclaimedRentLamports:reclaimed.toString(),grossFeeAndRentLamports:gross.toString(),feeAndRentCapLamports:POLICY.aggregateFeeRentLamports,payments,
        funding:f?{signature:f.signature,explorer:explorerTx(f.signature),from:f.from,payers:LIVE_CHANNEL_IDS.map(id=>identities[id].payer),lamportsPerPayer:f.lamportsPerPayer,tokenBaseUnitsPerPayer:f.tokenBaseUnitsPerPayer,slot:fs?.slot??null,
          note:'one-time funding of the stable hosted advertiser wallets, not this run\'s settlement'}:null,
        hosted:true,allChecksPassed:true};
      writePublic('chain-check.json',report);
      return {status:'verified',grossFeeAndRentLamports:gross.toString()};
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
      const ev={schemaVersion:'axp.v3-restart.v1',runId,beforeHash,afterHash,newCalls:after.model.admittedCalls-before.model.admittedCalls,newCharges:after.exchange.charges.length-before.exchange.charges.length,newSignatures:0,newBroadcasts:0,duplicateReceipts,
        method:'Restart without provider authorization; replay four completed turns and the original signed publisher receipts using saved outcomes. No payment transport or signer instantiated.',at:new Date().toISOString()};
      writePublic('restart.json',ev);return ev;
    } finally {s.close();}
  }
  async function exportBundle() {
    const retriever=evidence();
    return withService(async s=>{
      const callEvidence=s.harness.results(),state=restoreV3CapturedRecords(s.state(),callEvidence);
      const run={schemaVersion:'axp.v3-run.v1',runId,manifest:retriever.manifest,evidence:retriever.publicCatalogue(),state,events:state.exchange.events,receipts:s.exchange.all('receipt_records'),publishers:s.exchange.all('publishers'),
        restart:JSON.parse(readFileSync(join(artifactDir,'restart.json'))),callEvidence,
        retrieval:state.turns.filter(t=>t.scenario.id==='cached'||t.scenario.id==='offline').flatMap(t=>t.records.filter(r=>r.arm==='history').map(r=>({question:t.question,campaignId:r.campaignId,result:r.retrieval}))),
        chainEvidence:JSON.parse(readFileSync(join(artifactDir,'chain-check.json'))),limitations:state.limitations,createdAt:new Date().toISOString()};
      const saved=writeV3Bundle(join(artifactDir,'replay'),run);
      return {status:'exported',bundleHash:saved.bundleHash,storyGates:saved.manifest.storyGates,charges:state.exchange.charges.length};
    },{retriever});
  }

  // ---------- public status ----------
  function publicStatus() {
    if(!existsSync(join(acceptanceDir,'exchange.sqlite')))return null;
    const s=service();
    try {
      const st=s.state(),awards=st.exchange.awards??[],terms=existsSync(termsPath)?loadTerms():null;
      const turnOf=opportunityId=>st.turns.find(t=>t.opportunityId===opportunityId)?.scenario?.id??null;
      return {
        frozen:!!st.freeze,freezeHash:st.freeze?.contentHash??null,
        voucherExpiresAt:terms?new Date(terms.channels[0].voucherExpiresAt*1000).toISOString():null,
        turns:st.turns.map(t=>({scenarioId:t.scenario?.id,question:t.question,status:t.status,
          organic:t.organic?{status:t.organic.status,answer:t.organic.answer??null,model:t.organic.provenance?.model??t.organic.model??null}:null,
          decisions:(t.records??[]).map(r=>({campaignId:r.campaignId,advertiser:NAME[r.campaignId],arm:r.arm,status:r.status,decision:r.decision?.decision??null,relevanceLevel:r.decision?.relevanceLevel??null,commercialIntentLevel:r.decision?.commercialIntentLevel??null})),
          outcome:t.outcome?{status:t.outcome.status,bids:(t.outcome.bids??[]).map(b=>({campaignId:b.campaignId,advertiser:NAME[b.campaignId],amountBaseUnits:b.amountBaseUnits})),awardId:t.outcome.award?.id??null}:null,
          excluded:t.eligibility?.excluded??[]})),
        awards:awards.map(a=>({awardId:a.id,scenarioId:turnOf(a.opportunityId),campaignId:a.campaignId,advertiser:NAME[a.campaignId],channelId:a.channelId,creativeText:a.creative?.approvedText,creativeHash:a.creativeHash,
          priceBaseUnits:a.priceBaseUnits,status:a.status,expiresAt:a.expiresAt?new Date(a.expiresAt).toISOString():null})),
        charges:(st.exchange.charges??[]).map(c=>({chargeId:c.id,awardId:c.awardId,campaignId:c.campaignId,channelId:c.channelId,amountBaseUnits:c.amountBaseUnits,status:c.status,receiptHash:c.receiptHash})),
        payments:st.payments.map(p=>({channelId:p.channelId,advertiser:NAME[CHANNEL_CAMPAIGN[p.channelId]],payer:p.payer,payee:p.payee,protocolChannelId:p.protocolChannelId,openStatus:p.openStatus,closeStatus:p.closeStatus,
          depositBaseUnits:p.depositBaseUnits,authorizedBaseUnits:p.authorizedBaseUnits,settledBaseUnits:p.settledBaseUnits,refundBaseUnits:p.refundBaseUnits,vouchers:p.vouchers.map(v=>({chargeId:v.chargeId,status:v.status,cumulativeAmountBaseUnits:v.cumulativeAmountBaseUnits})),
          explorer:{payer:explorerAddress(p.payer),channel:p.protocolChannelId?explorerAddress(p.protocolChannelId):null,open:p.open?.txSignature?explorerTx(p.open.txSignature):null,close:p.close?.txSignature?explorerTx(p.close.txSignature):null}})),
        model:{admittedCalls:st.model.admittedCalls,usage:st.model.usage??null},
      };
    } finally {s.close();}
  }

  return {prepare,openChannel,closeChannel,reconcileChannel,channelStates,organicAll,runScenario,acknowledge,failAward,authorizePending,verify,restart,exportBundle,publicStatus};
}
