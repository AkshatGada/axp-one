import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validate} from '../../packages/client/validate.mjs';

const repo=new URL('../../',import.meta.url);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
const clone=value=>JSON.parse(JSON.stringify(value));
function assertSanitized(value) {
  if(typeof value==='string'&&/-----BEGIN .*PRIVATE KEY/.test(value))throw new Error('private_fixture_material');
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(/^(?:csrf|signature|privateKey|secretKey|wallet|walletKey|walletPath|signedVoucher|signedPayload|payloadBytes|wireBase64|unsignedWireBase64|authorization|accessToken|apiKey)$/i.test(key))throw new Error(`private_fixture_field:${key}`);
    assertSanitized(item);
  }
}
const paymentKeys=['channelId','runId','mode','phase','openStatus','closeStatus','depositBaseUnits','authorizedBaseUnits','acceptedBaseUnits','settledBaseUnits','refundBaseUnits','protocolChannelId','termsHash','network','rpc','genesisHash','program','mint','payer','payee','vouchers','settlementLink'];
export const FIXTURE_IDS=['awarded','no-fill','failed_delivery','accepted_unpaid','authorized','pending','unknown','finalized','competing_bids'];

export function buildFrontendFixtures({connectedRun,paymentState,sourceHashes}) {
  if(connectedRun.runId!==paymentState.runId||connectedRun.mode!=='sandbox'||paymentState.mode!=='sandbox')throw new Error('phase4_source_binding');
  const turn=connectedRun.turns.find(t=>t.outcome?.status==='awarded');
  const payment=paymentState.channels.find(c=>c.phase==='finalized'&&c.closeStatus==='finalized');
  if(!turn||!payment)throw new Error('phase4_recorded_outcome_missing');
  const source={runId:connectedRun.runId,sourceArtifactGeneratedAt:connectedRun.generatedAt,files:sourceHashes};
  const recordedLimits=[...connectedRun.limitations,'Saved awarded response includes current delivered award; it is not a reconstructed reservation-time snapshot.','Settlement comes from saved hosted sandbox evidence, not fresh RPC or Devnet.','Charge status remains accepted in the exchange; payment authorization/finality is recorded separately.'];
  const hypothetical='Hypothetical frontend state, not a measured original Phase4 timeline or additional network run.';
  function fixture(id,sourceKind,response,description,limitations=[]) {
    const f={schemaVersion:'axp.frontend-fixture.v1',id,sourceKind,financialMode:sourceKind==='recorded_run'?'sandbox':'synthetic',description,source:sourceKind==='recorded_run'?source:null,response,limitations};
    validate('FrontendFixture',f);return f;
  }
  // No raw receipt signatures, spending vouchers, keys, auth tokens or private
  // state. Retain original public identity/amount/hash strings without rewriting.
  const originalTurn=clone(turn);
  validate('TurnResult',originalTurn);
  const publicPayment=clone(pick(payment,paymentKeys));
  publicPayment.open=pick(payment.open,['status','txSignature','finality','protocolChannelId','depositBaseUnits']);
  publicPayment.close=pick(payment.close,['status','txSignature','finality','settledBaseUnits','refundBaseUnits','publisherDeltaBaseUnits','feeAndRentLamports']);
  const correlations=connectedRun.exchange.charges.filter(c=>c.channelId===payment.channelId).map(c=>{
    const receipt=connectedRun.signedReceipts.find(r=>r.chargeId===c.id);
    const voucher=payment.vouchers.find(v=>v.chargeId===c.id);
    if(!receipt||!voucher)throw new Error('phase4_correlation_missing');
    return {charge:clone(c),receipt:clone(receipt.receipt),receiptHash:receipt.receiptHash,recordedOnReplay:receipt.recordedOnReplay,payloadHash:voucher.payloadHash,voucherRecordHash:voucher.voucherRecordHash};
  });
  for(const c of correlations){validate('Charge',c.charge);validate('Receipt',c.receipt);}

  const syntheticAward={id:'fixture-award',runId:'frontend-hypothetical',mode:'synthetic',opportunityId:'fixture-opportunity',campaignId:'fixture-campaign',campaignVersionId:'fixture-campaign-v1',advertiserId:'fictional-frontend',publisherId:'fixture-publisher',randomSessionId:'fixture-session',channelId:'fixture-channel',creativeVersionId:'fixture-creative-v1',creativeHash:'fixture-not-network-hash',creative:{creativeVersionId:'fixture-creative-v1',approvedText:'Fictional frontend offer.',destinationURL:'https://frontend.example/',fictional:true},priceBaseUnits:'3000',payee:'synthetic:fixture-payee',winningBidId:'fixture-bid',status:'failed',expiresAt:2000,createdAt:1000};
  validate('Award',syntheticAward);
  const nofill={runId:'frontend-hypothetical',mode:'synthetic',engine:'deterministic-fixture',opportunityId:'fixture-no-fill',organic:{status:'completed',source:'synthetic_test',text:'Fixture independent answer remains available without an ad.'},outcome:{status:'no_fill',bids:[],rejections:[{campaignId:'fixture-campaign',reason:'agent_skip'}]},attempts:[],replayed:false};
  validate('TurnResult',nofill);
  const states={
    accepted_unpaid:{phase:'open',acceptedBaseUnits:'3000',authorizedBaseUnits:'0',settledBaseUnits:'0',refundBaseUnits:'0',closeStatus:'not_started'},
    authorized:{phase:'open',acceptedBaseUnits:'3000',authorizedBaseUnits:'3000',settledBaseUnits:'0',refundBaseUnits:'0',closeStatus:'not_started'},
    pending:{phase:'closing',acceptedBaseUnits:'3000',authorizedBaseUnits:'3000',settledBaseUnits:'0',refundBaseUnits:'0',closeStatus:'pending'},
    unknown:{phase:'unknown',acceptedBaseUnits:'3000',authorizedBaseUnits:'3000',settledBaseUnits:'0',refundBaseUnits:'0',closeStatus:'unknown',reconciliationRequired:true},
  };
  const competingBids=['alpha','beta'].map((name,i)=>({id:`fixture-bid-${name}`,status:'bid',opportunityId:'fixture-opportunity',campaignId:`fixture-${name}`,campaignVersionId:`fixture-${name}-v1`,advertiserId:`fictional-${name}`,creativeVersionId:`fixture-${name}-creative`,agentRunId:`fixture-agent-${name}`,amountBaseUnits:i===0?'3000':'2500',bidPolicyVersion:'fit_intent_bid_v1'}));
  const competingOutcome={status:'awarded',bids:competingBids,rejections:[],award:{...syntheticAward,id:'fixture-competing-award',campaignId:'fixture-alpha',campaignVersionId:'fixture-alpha-v1',advertiserId:'fictional-alpha',channelId:'fixture-funded-alpha',creativeVersionId:'fixture-alpha-creative',creative:{...syntheticAward.creative,creativeVersionId:'fixture-alpha-creative'},winningBidId:competingBids[0].id,status:'reserved'}};
  validate('Outcome',competingOutcome);
  const fundedChannels=['alpha','beta'].map(name=>({channelId:`fixture-funded-${name}`,advertiserId:`fictional-${name}`,publisherId:'fixture-publisher',payee:'synthetic:fixture-payee',mode:'synthetic',status:'open',depositBaseUnits:'20000',authorizedBaseUnits:'0',settledBaseUnits:'0',refundBaseUnits:'0',txSignature:null}));
  fundedChannels.forEach(c=>validate('Channel',c));
  const fixtures=[
    fixture('awarded','recorded_run',originalTurn,'Saved original awarded turn response with current delivered award.',recordedLimits),
    fixture('no-fill','synthetic_test',nofill,hypothetical,[hypothetical,'No award, charge or payment.']),
    fixture('failed_delivery','synthetic_test',syntheticAward,hypothetical,[hypothetical,'Failed render has no accepted charge or authorization.']),
    ...Object.entries(states).map(([id,state])=>fixture(id,'synthetic_test',{channelId:'fixture-channel',mode:'synthetic',depositBaseUnits:'20000',...state,txSignature:null},hypothetical,[hypothetical,'No signed spending material, transaction or original event timestamp is supplied.'])),
    fixture('finalized','recorded_run',{payment:publicPayment,correlations},'Saved finalized sandbox channel and original charge/receipt/hash correlations.',[...recordedLimits,'Publisher receipt packets were reconstructed on deterministic operator replay and marked recordedOnReplay, not captured as signed packets at original delivery.']),
    fixture('competing_bids','synthetic_test',{channels:fundedChannels,outcome:competingOutcome,charges:[]},'Hypothetical two-funded-bidder competition: 3000 wins over 2500 under the first-price policy.',[hypothetical,'No recorded funded competition is claimed. Phase4 funded only TripDesk.','Both deposits are synthetic fixtures; a reservation is not a charge, settlement or attention.']),
  ];
  const bundle={schemaVersion:'axp.frontend-fixtures.v1',fixtures};
  assertSanitized(bundle);return bundle;
}

export function loadFrontendFixtures() {
  const sources=['artifacts/phase4/connected-run.json','artifacts/phase4/payment-state.json'];
  const bytes=sources.map(path=>readFileSync(new URL(path,repo)));
  return buildFrontendFixtures({connectedRun:JSON.parse(bytes[0]),paymentState:JSON.parse(bytes[1]),sourceHashes:Object.fromEntries(sources.map((path,i)=>[path,sha256(bytes[i])]))});
}
export function fixtureFiles() {
  const bundle=loadFrontendFixtures();
  return Object.fromEntries([['fixtures.json',bundle],...bundle.fixtures.map(f=>[`${f.id}.json`,f])].map(([name,value])=>[name,`${JSON.stringify(value,null,2)}\n`]));
}
export function build({check=false}={}) {
  const destination=new URL('artifacts/phase5/frontend/',repo);
  if(!check)mkdirSync(destination,{recursive:true});
  for(const [name,content] of Object.entries(fixtureFiles())){
    const path=new URL(name,destination);
    if(check){if(readFileSync(path,'utf8')!==content)throw new Error(`fixture_drift:${name}`);}
    else writeFileSync(path,content);
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){build({check:process.argv.includes('--check')});console.log(`${FIXTURE_IDS.length} labelled frontend fixtures OK; no runtime/model/payment calls`);}
