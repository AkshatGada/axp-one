// Devnet settlement of the RECORDED V3 receipts. Pure helpers: no SDK, wallet
// or RPC at import. The recorded run (artifacts/v3/**) is only ever read.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {hash,verifyReceipt} from '../contracts/index.mjs';

export const DEVNET_SETTLEMENT_RUN_ID='v3-devnet-settlement';
export const SOURCE_RUN_ID='v3-wallet-acceptance';
export const DEVNET_CHANNEL_IDS=Object.freeze(['v3-clearvault-channel','v3-keyforge-channel']);
export const DEVNET_NETWORK=Object.freeze({mode:'devnet',network:'solana-devnet',rpc:'https://api.devnet.solana.com',
  genesisHash:'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',program:'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',
  mint:'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  treasuryOwner:'4zTeC5mVqWLruDexgU2mV66p9t5vCA9JyiZqdGDUspap'});
// Exactly the three accepted, publisher-signed charges of the recorded run.
export const EXPECTED_CHARGES=Object.freeze({
  'v3-clearvault-channel':Object.freeze(['4000','3000']),
  'v3-keyforge-channel':Object.freeze(['3000']),
});
export const DEPOSIT_BASE_UNITS='20000';
export const FUNDING=Object.freeze({lamports:50_000_000n,tokenBaseUnits:40_000n});

const fail=code=>{const e=new Error(code);e.reasonCode=code;throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const explorerTx=sig=>`https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddress=address=>`https://explorer.solana.com/address/${address}?cluster=devnet`;

/** Read the recorded replay bundle and return verified, adapter-shaped charges. */
export function loadRecordedCharges(runJsonPath) {
  const bytes=readFileSync(runJsonPath),run=JSON.parse(bytes);
  check(run.runId===SOURCE_RUN_ID&&run.state?.exchange?.runId===SOURCE_RUN_ID,'source_run_mismatch');
  const ex=run.state.exchange,[publisher]=run.publishers??[];
  check(run.publishers?.length===1&&typeof publisher.publicKeyPEM==='string','publisher_key_missing');
  const campaigns=new Map(ex.campaigns.map(c=>[c.campaignVersionId,c])),awards=new Map(ex.awards.map(a=>[a.id,a]));
  const receipts=new Map(run.receipts.map(r=>[r.chargeId,r]));
  const channels={};
  for(const channelId of DEVNET_CHANNEL_IDS) {
    const source=ex.charges.filter(c=>c.channelId===channelId).sort((a,b)=>a.sequence-b.sequence);
    check(source.map(c=>c.amountBaseUnits).join()===EXPECTED_CHARGES[channelId].join(),'recorded_charges_changed');
    const campaign=campaigns.get(source[0].campaignVersionId);check(campaign&&campaign.channelId===channelId,'campaign_missing');
    const charges=source.map((c,index)=>{
      check(c.status==='accepted'&&c.runId===SOURCE_RUN_ID&&c.sequence===index+1&&c.campaignVersionId===campaign.campaignVersionId,'charge_not_accepted');
      const r=receipts.get(c.id),award=awards.get(c.awardId);
      check(r&&r.recordedOnReplay===false&&r.receiptHash===c.receiptHash&&hash(r.receipt)===c.receiptHash,'receipt_hash_mismatch');
      check(verifyReceipt(r.receipt,r.signature,publisher.publicKeyPEM),'receipt_signature_invalid');
      check(award&&award.id===r.receipt.awardId&&award.creativeHash===r.receipt.creativeHash&&award.opportunityId===r.receipt.opportunityId
        &&award.priceBaseUnits===c.amountBaseUnits&&award.channelId===channelId&&c.delivery?.receiptHash===c.receiptHash,'receipt_award_mismatch');
      check(r.receipt.publisherId===publisher.publisherId&&r.receipt.publisherKeyId===publisher.publisherKeyId&&r.receipt.runId===SOURCE_RUN_ID,'receipt_publisher_mismatch');
      // Adapter projection. The original record's settlement-network label
      // ('sandbox') is not copied; sourceChargeHash binds the full original.
      return {id:c.id,runId:c.runId,channelId,advertiserId:campaign.advertiserId,campaignId:c.campaignId,
        campaignVersionId:c.campaignVersionId,sequence:String(c.sequence),amountBaseUnits:c.amountBaseUnits,
        awardId:c.awardId,deliveryId:c.deliveryId,acceptedReceiptHash:c.receiptHash,acceptedAt:c.acceptedAt,
        status:'accepted',sourceChargeHash:hash(c),publisherReceiptSignatureVerified:true};
    });
    channels[channelId]={campaign:{campaignId:campaign.campaignId,campaignVersionId:campaign.campaignVersionId,
      advertiserId:campaign.advertiserId,maxBidBaseUnits:campaign.maxBidBaseUnits,budgetCapBaseUnits:campaign.budgetCapBaseUnits},charges};
  }
  check(Object.values(channels).flatMap(c=>c.charges).length===ex.charges.length,'unexpected_extra_charges');
  return {sourceRunId:SOURCE_RUN_ID,sourceFileSha256:sha256(bytes),publisher:{publisherId:publisher.publisherId,
    publisherKeyId:publisher.publisherKeyId,publicKeyPEM:publisher.publicKeyPEM},channels};
}

export function obligationsFor(source,channelId) {
  const c=source.channels[channelId];check(c,'channel_not_allowed');
  return {reservedBaseUnits:'0',acceptedBaseUnits:c.charges.reduce((s,x)=>s+BigInt(x.amountBaseUnits),0n).toString(),charges:structuredClone(c.charges)};
}
export function chargeById(source,id) {
  for(const c of Object.values(source.channels))for(const x of c.charges)if(x.id===id)return structuredClone(x);
  return undefined;
}

/** Adapter terms for one Devnet channel. Time is integer Unix seconds. */
export function buildDevnetTerms({channelId,source,payer,payee,openSalt,now,programAccountHash,programDataHash,compatibilityHash}) {
  check(DEVNET_CHANNEL_IDS.includes(channelId),'channel_not_allowed');
  check(typeof payer==='string'&&typeof payee==='string'&&payer!==payee,'identity_invalid');
  check(/^[1-9][0-9]*$/.test(openSalt)&&BigInt(openSalt)<(1n<<64n),'salt_invalid');
  check(Number.isSafeInteger(now)&&now>0,'clock_invalid');
  for(const v of [programAccountHash,programDataHash,compatibilityHash])check(/^[a-f0-9]{64}$/.test(v??''),'hash_invalid');
  const {campaign}=source.channels[channelId];
  check(BigInt(campaign.budgetCapBaseUnits)<=8000n&&BigInt(campaign.maxBidBaseUnits)<=4000n,'campaign_cap_exceeded');
  const {treasuryOwner,...network}=DEVNET_NETWORK;
  return {...network,runId:SOURCE_RUN_ID,settlementRunId:DEVNET_SETTLEMENT_RUN_ID,channelId,
    advertiserId:campaign.advertiserId,campaignVersionId:campaign.campaignVersionId,payer,payee,
    depositBaseUnits:DEPOSIT_BASE_UNITS,maxBidBaseUnits:campaign.maxBidBaseUnits,chargeCapBaseUnits:campaign.budgetCapBaseUnits,
    maxCharges:2,zeroChargeClose:false,openSalt,voucherExpiresAt:now+7200,applicationDeadlineAt:now+6900,settlementMarginSeconds:60,
    compatibilityHash,programAccountHash,programDataHash,treasuryOwner};
}

const PUBLIC_TX=['signature','role','channelId','slot','blockTime','finality','err','networkFeeLamports','newRentLamports',
  'reclaimedRentLamports','tokenDeltas','explorerUrl'];
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));
/** Allowlist projection: no wires, plans, voucher signatures or key material. */
export function publicTransaction(record) {return pick(record,PUBLIC_TX);}
export function assertPublicEvidence(value) {
  const text=JSON.stringify(value);
  for(const forbidden of ['secret','wireBase64','privateKey','PRIVATE KEY'])check(!text.includes(forbidden),'evidence_contains_private_material');
  const walk=(v,path)=>{if(Array.isArray(v))v.forEach((x,i)=>walk(x,`${path}[${i}]`));else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){
    check(!/secret|wire|voucherSignature|privateKey|seed/i.test(k),`evidence_private_field:${path}.${k}`);
    if(k==='voucher')check(false,`evidence_private_field:${path}.${k}`);walk(x,`${path}.${k}`);}};
  walk(value,'$');return true;
}
