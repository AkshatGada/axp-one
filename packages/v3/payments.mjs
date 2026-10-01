// Terminal coordinator only. Importing this file loads no SDK, wallet or RPC.
import {existsSync,mkdirSync,readFileSync,writeFileSync,statfsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {SQLitePaymentStore} from '../payments/store.mjs';
import {NetworkPaymentAdapter,NetworkPaymentError,hashNetworkTerms,hashNetworkRecord} from '../payments/network-adapter.mjs';
import {CAMPAIGNS,POLICY,exchangeCampaign} from './config.mjs';
import {validateCampaign} from '../contracts/index.mjs';

const IDS=['v3-clearvault-channel','v3-keyforge-channel'];
const RUN='v3-wallet-acceptance';
const queues=new Map();
const check=(ok,code)=>{if(!ok)throw new NetworkPaymentError(code);};
const money=value=>{check(typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value),'amount_invalid');const n=BigInt(value);check(n<(1n<<64n),'amount_overflow');return n;};
const chargeHash=c=>{const {status,...immutable}=c;return hashNetworkRecord(immutable);};
const copy=value=>structuredClone(value);
const uncertain=s=>!['prepared','finalized','failed'].includes(s.open.status)
  ||(s.close&&!['prepared','finalized','failed'].includes(s.close.status))||s.intents.some(i=>i.status!=='authorized');

/** Exact Phase4 networkState fields, with uncertain obligations fail-closed. */
export function projectV3NetworkState(store,id) {
  const s=store.get(id);if(!s)return null;
  const reconciliationRequired=uncertain(s);
  return {channelId:id,runId:s.terms.runId,mode:s.terms.mode,
    phase:s.phase==='open'&&reconciliationRequired?'draining':s.phase,
    openStatus:s.open.status,closeStatus:s.close?.status??null,
    depositBaseUnits:s.open.status==='finalized'?s.terms.depositBaseUnits:'0',
    authorizedBaseUnits:s.authorizedBaseUnits,acceptedBaseUnits:s.acceptedBaseUnits,
    settledBaseUnits:s.close?.status==='finalized'?s.close.receipt.settledBaseUnits:'0',
    refundBaseUnits:s.close?.status==='finalized'?s.close.receipt.refundBaseUnits:'0',
    protocolChannelId:s.protocolChannelId??null,termsHash:s.termsHash,reconciliationRequired};
}

// Allowlist, never spread private provider receipts/plans/vouchers into evidence.
function receiptPublic(receipt,status) {
  if(!receipt)return status?{status}:null;
  return Object.fromEntries(['status','txSignature','finality','protocolChannelId','depositBaseUnits',
    'settledBaseUnits','refundBaseUnits','publisherDeltaBaseUnits','feeAndRentLamports'].filter(k=>receipt[k]!==undefined).map(k=>[k,receipt[k]]));
}
export function paymentEvidenceV3(store,{runId=RUN,mode='sandbox'}={}) {
  return store.list().filter(s=>s.terms?.runId===runId&&s.terms.mode===mode&&IDS.includes(s.channelId)).map(s=>({
    ...projectV3NetworkState(store,s.channelId),network:s.terms.network,rpc:s.terms.rpc,
    genesisHash:s.terms.genesisHash,program:s.terms.program,mint:s.terms.mint,payer:s.terms.payer,payee:s.terms.payee,
    open:receiptPublic(s.open.receipt,s.open.status),close:receiptPublic(s.close?.receipt,s.close?.status),
    vouchers:s.intents.map(i=>({chargeId:i.charge.id,sequence:i.sequence,status:i.status,
      incrementBaseUnits:i.charge.amountBaseUnits,cumulativeAmountBaseUnits:i.cumulativeAmountBaseUnits,
      payloadHash:i.payloadHash??null,voucherRecordHash:i.voucherRecordHash??null})),
    estimatedGrossFeeAndRentLamports:s.feeReservedLamports,
    settlementLink:s.close?.status==='finalized'?(s.terms.mode==='devnet'?`https://explorer.solana.com/tx/${s.close.receipt.txSignature}?cluster=devnet`:`https://explorer.solana.com/tx/${s.close.receipt.txSignature}?cluster=custom&customUrl=${encodeURIComponent(s.terms.rpc)}`):null,
  }));
}

/** Same acceptance dir as createSession. Optional seams are operator capabilities,
 * not browser parameters. Default signingEnabled=false; main opts in explicitly.
 * preflight({simulate,expected}) and transportFactory({terms,statePath}) are for
 * bounded fixture testing or main's trusted wiring, never untrusted requests.
 */
export function createV3Payments({stateDir,runId,getLedgerCharge,getLedgerObligations,
  signingEnabled=false,preflight,transportFactory,now=()=>Math.floor(Date.now()/1000),
  feasibilityPath=resolve('artifacts/v3/feasibility.json')}={}) {
  check(runId===RUN,'run_binding');check(typeof stateDir==='string'&&stateDir.length>0,'state_dir_required');
  check(typeof getLedgerCharge==='function'&&typeof getLedgerObligations==='function','ledger_provider_required');
  const directory=resolve(stateDir),termsPath=join(directory,'terms.json');
  check(directory!==resolve('local-state/phase4')&&!/\/local-state\/(phase[1-5]|v2)(\/|$)/.test(directory),'state_dir_forbidden');
  mkdirSync(directory,{recursive:true,mode:0o700});
  const store=new SQLitePaymentStore(join(directory,'payments.sqlite'));
  const transports=new Map(),adapters=new Map();let disposed=false;
  const load=()=>{
    check(existsSync(termsPath),'freeze_required');const record=JSON.parse(readFileSync(termsPath,'utf8'));
    check(record.schemaVersion==='axp.v3-payments.v1'&&record.runId===runId&&record.channels.length===2,'terms_mismatch');
    check(record.termsHash===hashNetworkRecord({...record,termsHash:null}),'terms_mismatch');
    for(const [index,t] of record.channels.entries())check(t.channelId===IDS[index]&&t.runId===runId&&t.openSalt!==record.channels[1-index].openSalt,'terms_mismatch');
    for(const s of store.list())check(record.channels.some(t=>t.channelId===s.channelId&&hashNetworkTerms(t)===s.termsHash),'terms_mismatch');
    return record;
  };
  const inspect=async options=>preflight?preflight(options):(await import('../payments/v3-feasibility.mjs')).inspectV3PaymentEnvironment(options);
  const serialized=fn=>{
    const previous=queues.get(directory)??Promise.resolve();
    const next=previous.catch(()=>{}).then(async()=>{check(!disposed,'coordinator_disposed');try{return await fn();}catch(e){return {status:'blocked',reasonCode:e.reasonCode??e.code??'payment_operation_blocked'};}});
    queues.set(directory,next);void next.finally(()=>{if(queues.get(directory)===next)queues.delete(directory);}).catch(()=>{});return next;
  };
  const termsFor=id=>{check(typeof id==='string'&&IDS.includes(id),'channel_not_allowed');return load().channels.find(t=>t.channelId===id);};

  async function aggregateLedger() {
    const record=load();let total=0n,reserved=0n,count=0;const ledgers={};const seen=new Set();
    for(const terms of record.channels) {
      const o=copy(await getLedgerObligations(terms.channelId));check(o&&Array.isArray(o.charges),'ledger_invalid');
      let accepted=0n;
      for(const [index,ref] of o.charges.entries()) {
        const c=copy(await getLedgerCharge(ref.id));
        check(c&&c.id===ref.id&&!seen.has(c.id)&&chargeHash(c)===chargeHash(ref),'ledger_inconsistent');seen.add(c.id);
        check(['accepted','authorization_pending','authorized','settlement_pending','settled'].includes(c.status),'charge_not_accepted');
        for(const k of ['channelId','runId','campaignVersionId','advertiserId'])check(c[k]===terms[k],'charge_terms_mismatch');
        check(c.sequence===String(index+1)&&money(c.amountBaseUnits)>0n&&money(c.amountBaseUnits)<=money(terms.maxBidBaseUnits),'charge_sequence_mismatch');
        for(const k of ['awardId','deliveryId','acceptedReceiptHash'])check(typeof c[k]==='string'&&c[k].length>0,'charge_not_accepted');
        const state=store.get(terms.channelId),intent=state?.intents.find(i=>i.charge.id===c.id);
        if(intent)check(chargeHash(c)===intent.chargeHash,'immutable_charge_changed');
        accepted+=money(c.amountBaseUnits);count++;
      }
      check(accepted===money(o.acceptedBaseUnits),'ledger_inconsistent');
      check(accepted+money(o.reservedBaseUnits)<=money(terms.chargeCapBaseUnits),'cap_exceeded');
      const s=store.get(terms.channelId);for(const i of s?.intents??[])check(o.charges.some(c=>c.id===i.charge.id),'immutable_charge_changed');
      total+=accepted;reserved+=money(o.reservedBaseUnits);ledgers[terms.channelId]=o;
    }
    check(count<=POLICY.maxPaidDeliveries&&total+reserved<=money(POLICY.aggregateChargeCapBaseUnits),'aggregate_charge_cap_exceeded');
    return ledgers;
  }
  function feeBudget(record=load()) {
    let total=0n;
    for(const t of record.channels) {
      const state=store.get(t.channelId);
      for(const kind of ['open','close']) {
        const op=state?.[kind],forecast=money(t[kind==='open'?'openReserveLamports':'closeReserveLamports']);
        const estimate=op?.signed?.estimatedFeeAndRentLamports??op?.plan?.estimatedFeeAndRentLamports;
        const measured=estimate===undefined?0n:money(estimate);
        total+=measured>forecast?measured:forecast;
      }
    }
    check(total<=money(POLICY.aggregateFeeRentLamports),'aggregate_fee_cap_exceeded');return total.toString();
  }
  async function beforeSign(id,kind) {
    check(signingEnabled===true,'signing_disabled');feeBudget();await aggregateLedger();
    for(const s of store.list()) {
      if(s.channelId!==id)check(!uncertain(s),'reconciliation_required');
      else if(kind==='voucher')check(s.intents.slice(0,-1).every(i=>i.status==='authorized'),'reconciliation_required');
    }
    if(kind==='open') {
      const report=await inspect({simulate:false,expected:load().feasibility});
      check(report.compatible&&report.status==='checked','current_network_preflight_required');
      const remaining=load().channels.filter(t=>store.get(t.channelId)?.open.status!=='finalized').length;
      check(money(report.balances.payerBaseUnits)>=BigInt(remaining)*money(POLICY.depositBaseUnits),'insufficient_test_usdc');
      check(money(report.balances.payerLamports)>=money(feeBudget()),'insufficient_fee_balance');
    }
  }
  async function adapterFor(id) {
    const terms=termsFor(id);if(adapters.has(id))return adapters.get(id);
    const transport=await (transportFactory??(async o=>(await import('../payments/sdk-transport.mjs')).createNativeTransport(o)))({terms,statePath:join(directory,'native.sqlite')});
    transports.set(id,transport);
    const adapter=new NetworkPaymentAdapter({store,protocolTransport:transport,getLedgerCharge,getLedgerObligations,
      beforeSigning:({operation})=>beforeSign(id,operation),approvalTermsHash:hashNetworkTerms(terms),now});
    adapters.set(id,adapter);return adapter;
  }
  const status=()=>({status:existsSync(termsPath)?'frozen':'unfrozen',runId,mode:'sandbox',signingEnabled,
    channels:store.list().filter(s=>IDS.includes(s.channelId)).map(s=>projectV3NetworkState(store,s.channelId)),
    payments:paymentEvidenceV3(store)});
  return {
    freeze:({campaigns}={})=>serialized(async()=>{
      check(Array.isArray(campaigns),'campaigns_required');
      const expected=CAMPAIGNS.slice(0,2).map(exchangeCampaign);
      const selected=expected.map(c=>campaigns.find(x=>x.channelId===c.channelId));
      for(const [i,c] of selected.entries()) {
        check(c&&campaigns.filter(x=>x.channelId===c.channelId).length===1,'campaign_terms_mismatch');
        validateCampaign(c);
        for(const k of ['channelId','campaignId','advertiserId'])check(c[k]===expected[i][k],'campaign_terms_mismatch');
        check(c.status==='active'&&['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'].every(cap=>c.declaredConstraints.includes(cap)),'campaign_declarations_invalid');
        check(c.creatives.every(cr=>cr.fictional===true),'fictional_creative_required');
        check(money(c.maxBidBaseUnits)>0n&&money(c.maxBidBaseUnits)<=money(POLICY.maxBidBaseUnits)
          &&money(c.budgetCapBaseUnits)>0n&&money(c.budgetCapBaseUnits)<=money(POLICY.totalCapBaseUnits),'campaign_cap_exceeded');
      }
      const campaignHash=hashNetworkRecord(selected);
      if(existsSync(termsPath)){const r=load();check(r.campaignHash===campaignHash,'campaign_terms_mismatch');return {...status(),status:'already_frozen',termsHash:r.termsHash};}
      check(store.list().length===0,'existing_payment_state');
      const disk=statfsSync(directory);check(disk.bavail*disk.bsize>=40*1024**3,'40GiB_free_space_floor');
      const feasibility=await inspect({simulate:true});
      // Retain the first actual failed simulation across a later explicit attempt.
      if(existsSync(feasibilityPath)) {
        const prior=JSON.parse(readFileSync(feasibilityPath,'utf8'));
        feasibility.previousAttempts=copy(prior.previousAttempts??[]);
        if(prior.simulation?.err) {
          const {previousAttempts,...attempt}=prior;
          if(!feasibility.previousAttempts.some(a=>hashNetworkRecord(a)===hashNetworkRecord(attempt)))feasibility.previousAttempts.push(attempt);
        }
      }
      mkdirSync(resolve(feasibilityPath,'..'),{recursive:true});writeFileSync(feasibilityPath,JSON.stringify(feasibility,null,2)+'\n',{mode:0o600});
      if(feasibility.zeroCloseCompatibility==='blocked_insufficient_test_balance')check(false,'insufficient_test_balances');
      check(feasibility.compatible&&feasibility.zeroCloseCompatibility==='passed_unsigned_simulation','native_feasibility_required');
      check(feasibility.balancesSufficient,'insufficient_test_balances');
      const time=now();check(Number.isSafeInteger(time)&&time>0,'clock_invalid');
      const salts=new Set();const salt=()=>{let value;do{value=randomBytes(8).readBigUInt64LE().toString();}while(value==='0'||salts.has(value));salts.add(value);return value;};
      const channels=selected.map(c=>({...feasibility.network,runId,channelId:c.channelId,advertiserId:c.advertiserId,campaignVersionId:c.campaignVersionId,
        depositBaseUnits:POLICY.depositBaseUnits,maxBidBaseUnits:c.maxBidBaseUnits,chargeCapBaseUnits:c.budgetCapBaseUnits,maxCharges:POLICY.maxPaidDeliveries,zeroChargeClose:true,openSalt:salt(),
        voucherExpiresAt:time+7200,applicationDeadlineAt:time+6900,settlementMarginSeconds:60,
        compatibilityHash:hashNetworkRecord(feasibility),programAccountHash:feasibility.programAccountHash,programDataHash:feasibility.programDataHash,
        openReserveLamports:feasibility.openReserveLamports,closeReserveLamports:feasibility.closeReserveLamports}));
      const r={schemaVersion:'axp.v3-payments.v1',runId,campaignHash,campaigns:copy(selected),feasibility,channels,termsHash:null};feeBudget(r);r.termsHash=hashNetworkRecord(r);
      writeFileSync(termsPath,JSON.stringify(r,null,2)+'\n',{mode:0o600,flag:'wx'});
      // Freeze salts/terms, not short-lived Solana blockhashes. Each unsigned
      // transaction is prepared immediately before its authorized opening.
      return {status:'frozen',reasonCode:null,termsHash:r.termsHash,plans:[],channels:status().channels};
    }),
    open:id=>serialized(async()=>{
      const terms=termsFor(id);if(!store.get(id))check(signingEnabled===true,'signing_disabled');
      const adapter=await adapterFor(id);if(!store.get(id))await adapter.prepareOpen(terms);
      const s=store.get(id);check(s,'open_plan_required');
      if(s.open.status==='prepared')check(signingEnabled===true,'signing_disabled');
      return adapter.confirmOpen({channelId:id,planId:s.open.id});
    }),
    authorize:id=>serialized(async()=>{
      const adapter=await adapterFor(id),ledgers=await aggregateLedger(),results=[];
      for(const c of ledgers[id].charges){if(adapter.lookupAuthorization({channelId:id,chargeId:c.id}).status==='absent')check(signingEnabled===true,'signing_disabled');const result=await adapter.authorizeCumulative({channelId:id,chargeId:c.id});results.push(result);if(result.status!=='authorized')break;}
      return {status:results.every(r=>r.status==='authorized')?'authorized':'unknown',channelId:id,authorizations:results};
    }),
    close:id=>serialized(async()=>{
      const adapter=await adapterFor(id);await aggregateLedger();const s=store.get(id);
      if(!s?.close||s.close.status==='prepared')check(signingEnabled===true,'signing_disabled');
      if(s?.close)return adapter.confirmClose({channelId:id,planId:s.close.id});
      // MAIN drains the Exchange synchronously before this call. Zero reservations
      // and immutable rereads are necessary; coordinator cannot lock another DB.
      if(s?.phase==='open')await adapter.beginDrain({channelId:id});
      const plan=await adapter.prepareClose({channelId:id});
      if(plan.status!=='prepared')return plan;
      return adapter.confirmClose({channelId:id,planId:plan.planId});
    }),
    reconcile:(id,operation)=>serialized(async()=>{
      const adapter=await adapterFor(id),s=store.get(id);
      if(operation==='open')return adapter.reconcile({channelId:id,planId:s.open.id});
      if(operation==='close'){check(s.close,'close_plan_required');return adapter.reconcile({channelId:id,planId:s.close.id});}
      if(operation&&typeof operation==='object'&&Object.keys(operation).length===1&&typeof operation.chargeId==='string')return adapter.reconcile({channelId:id,chargeId:operation.chargeId});
      check(operation===undefined,'operation_invalid');return adapter.reconcile({channelId:id});
    }),
    status,
    dispose:()=>{for(const t of transports.values())t.close?.();store.close();disposed=true;},
  };
}
