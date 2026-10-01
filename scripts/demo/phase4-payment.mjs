import {existsSync,mkdirSync,writeFileSync,readFileSync,statfsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {NetworkPaymentAdapter,hashNetworkTerms} from '../../packages/payments/network-adapter.mjs';
import {createNativeTransport} from '../../packages/payments/sdk-transport.mjs';
import {createSession} from '../../apps/backend/session.mjs';
import {PHASE4_CAMPAIGNS,PHASE4_RUN_ID} from '../../apps/backend/phase4.mjs';

export const stateDir=resolve('local-state/phase4'),termsPath=join(stateDir,'terms.json');
const publicPath=resolve('artifacts/phase4/payment-state.json');
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function loadTerms(){return JSON.parse(readFileSync(termsPath,'utf8'));}
export function projectNetworkState(store,id) {const s=store.get(id);if(!s)return null;return {channelId:id,runId:s.terms.runId,mode:s.terms.mode,phase:s.phase,openStatus:s.open.status,closeStatus:s.close?.status??null,depositBaseUnits:s.open.status==='finalized'?s.terms.depositBaseUnits:'0',authorizedBaseUnits:s.authorizedBaseUnits,acceptedBaseUnits:s.acceptedBaseUnits,settledBaseUnits:s.close?.status==='finalized'?s.close.receipt.settledBaseUnits:'0',refundBaseUnits:s.close?.status==='finalized'?s.close.receipt.refundBaseUnits:'0',protocolChannelId:s.protocolChannelId,termsHash:s.termsHash};}
export function paymentEvidence(store) {return store.list().map(s=>({ ...projectNetworkState(store,s.channelId),network:s.terms.network,rpc:s.terms.rpc,genesisHash:s.terms.genesisHash,program:s.terms.program,mint:s.terms.mint,payer:s.terms.payer,payee:s.terms.payee,open:s.open.receipt??{status:s.open.status},close:s.close?.receipt??null,
  vouchers:s.intents.map(i=>({chargeId:i.charge.id,sequence:i.sequence,status:i.status,incrementBaseUnits:i.charge.amountBaseUnits,cumulativeAmountBaseUnits:i.cumulativeAmountBaseUnits,payloadHash:i.payloadHash??null,voucherRecordHash:i.voucherRecordHash??null,commitReceipt:i.receipt??null})),
  estimatedGrossFeeAndRentLamports:s.feeReservedLamports,settlementLink:s.close?.receipt?.status==='finalized'?`https://explorer.solana.com/tx/${s.close.receipt.txSignature}?cluster=custom&customUrl=${encodeURIComponent(s.terms.rpc)}`:null}));}
function exportEvidence(store) {mkdirSync(resolve('artifacts/phase4'),{recursive:true});writeFileSync(publicPath,JSON.stringify({runId:PHASE4_RUN_ID,mode:loadTerms().mode,generatedAt:new Date().toISOString(),channels:paymentEvidence(store)},null,2));}

export async function operate(command) {
  const disk=statfsSync(process.cwd());if(disk.bavail*disk.bsize<40*1024**3)throw new Error('40GiB_free_space_floor');
  mkdirSync(stateDir,{recursive:true,mode:0o700});
  if(command==='freeze') {
    if(existsSync(termsPath))return {status:'already_frozen',termsHash:hashNetworkTerms(loadTerms())};
    const feasibility=JSON.parse(readFileSync(resolve('artifacts/phase4/feasibility-sandbox.json'),'utf8'));if(!feasibility.compatible||feasibility.signed||feasibility.broadcast)throw new Error('native_feasibility_required');
    const now=Math.floor(Date.now()/1000),terms={...feasibility.network,runId:PHASE4_RUN_ID,channelId:'phase4-channel-tripdesk',advertiserId:'fictional-tripdesk',campaignVersionId:'tripdesk-v1',network:'solana-payment-sandbox',depositBaseUnits:'20000',chargeCapBaseUnits:'8000',voucherExpiresAt:now+7200,applicationDeadlineAt:now+6900,settlementMarginSeconds:60,compatibilityHash:sha(feasibility),programAccountHash:feasibility.programAccountHash};
    writeFileSync(termsPath,JSON.stringify(terms,null,2),{mode:0o600,flag:'wx'});
    writeFileSync(resolve('artifacts/phase4/frozen-environment.json'),JSON.stringify({terms,termsHash:hashNetworkTerms(terms),testOnly:true,operatorBoundary:'same Mac; local test wallets approved by user; not independent production authorization'},null,2));return {status:'frozen',termsHash:hashNetworkTerms(terms),network:terms.network};
  }
  const terms=loadTerms(),store=new SQLitePaymentStore(join(stateDir,'payments.sqlite'));
  const session=createSession({stateDir,runId:PHASE4_RUN_ID,campaigns:PHASE4_CAMPAIGNS,mode:terms.mode,publisherPayee:terms.payee,networkState:id=>projectNetworkState(store,id)});
  let transport;
  try {
    const ledgerCharge=id=> {const c=session.exchange.require('charges',id),campaign=session.exchange.require('campaign_versions',c.campaignVersionId);return {...c,sequence:String(c.sequence),advertiserId:campaign.advertiserId,acceptedReceiptHash:c.receiptHash};};
    const obligations=id=>{const totals=session.exchange.totals({channelId:id});return {reservedBaseUnits:totals.reserved.toString(),acceptedBaseUnits:totals.accepted.toString(),charges:session.exchange.all('charges').filter(c=>c.channelId===id).sort((a,b)=>a.sequence-b.sequence).map(c=>ledgerCharge(c.id))};};
    if(command==='status'||command==='evidence'){exportEvidence(store);const evidence={schemaVersion:'axp.phase4-connected-evidence.v1',runId:PHASE4_RUN_ID,mode:terms.mode,generatedAt:new Date().toISOString(),payments:paymentEvidence(store),exchange:session.exchange.report(),publisherIdentities:session.exchange.all('publishers'),signedReceipts:session.exchange.all('receipt_records'),modelAdmissions:session.exchange.all('model_admissions'),turns:session.results(),limitations:['Owned-app delivery acknowledgements are not attention, absorption, endorsement or conversions.','One funded advertiser; no multiple-funded-bidder competition.','Organic completions are fresh isolated app agents, delivered by an operator-recorded bridge.','Official hosted Solana sandbox, not Devnet/mainnet.']};if(command==='evidence'){writeFileSync(resolve('artifacts/phase4/connected-run.json'),JSON.stringify(evidence,null,2));return {status:'evidence_saved',charges:evidence.exchange.charges.length,models:evidence.modelAdmissions.length,path:'artifacts/phase4/connected-run.json'};}return evidence;}
    transport=await createNativeTransport({terms,statePath:join(stateDir,'native.sqlite')});
    const adapter=new NetworkPaymentAdapter({store,protocolTransport:transport,getLedgerCharge:ledgerCharge,getLedgerObligations:obligations,approvalTermsHash:hashNetworkTerms(terms)});
    let result;
    if(command==='open') {const plan=await adapter.prepareOpen(terms);if(plan.status!=='prepared'&&plan.status!=='finalized')throw new Error(`open_not_prepared:${JSON.stringify(plan)}`);result=await adapter.confirmOpen({channelId:terms.channelId,planId:plan.planId});}
    else if(command==='authorize') {result=[];for(const c of obligations(terms.channelId).charges)result.push(await adapter.authorizeCumulative({channelId:terms.channelId,chargeId:c.id}));}
    else if(command==='close') {session.exchange.drainNetworkChannel(terms.channelId);await adapter.beginDrain({channelId:terms.channelId});const plan=await adapter.prepareClose({channelId:terms.channelId});if(plan.status!=='prepared'&&plan.status!=='finalized')throw new Error(`close_not_prepared:${JSON.stringify(plan)}`);result=await adapter.confirmClose({channelId:terms.channelId,planId:plan.planId});}
    else if(command==='reconcile')result=await adapter.reconcile({channelId:terms.channelId});
    else if(command==='replay') {const s=store.get(terms.channelId);if(s?.close?.status!=='finalized')throw new Error('finalized_run_required');const before={charges:session.exchange.all('charges'),paymentRecordHash:sha(s),modelAdmissions:session.exchange.all('model_admissions').length};result={authorizations:[],receiptReplays:[],close:await adapter.confirmClose({channelId:terms.channelId,planId:s.close.id})};for(const c of obligations(terms.channelId).charges){const a=session.exchange.require('awards',c.awardId);result.receiptReplays.push(session.acknowledge(a.id,{domInserted:true,sponsoredLabelPresent:true,creativeHash:a.creativeHash}));result.authorizations.push(await adapter.authorizeCumulative({channelId:terms.channelId,chargeId:c.id}));}const after={charges:session.exchange.all('charges'),paymentRecordHash:sha(store.get(terms.channelId)),modelAdmissions:session.exchange.all('model_admissions').length};if(sha(before)!==sha(after))throw new Error('replay_changed_ledger');writeFileSync(resolve('artifacts/phase4/restart-replay.json'),JSON.stringify({runId:PHASE4_RUN_ID,mode:terms.mode,freshProcess:true,before,after,result,newSigning:0,newBroadcasts:0,newModelCalls:0,boundary:'Operator replays the recorded accepted acknowledgements; not a fresh browser delivery.'},null,2));}
    else throw new Error('unknown_operator_command');
    session.exchange.syncNetworkChannel(terms.channelId);exportEvidence(store);return result;
  } finally {transport?.close();session.close();store.close();}
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
  try{console.log(JSON.stringify(await operate(process.argv[2]),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
