// Fully live V3 run on Solana Devnet: helpers shared by scripts/demo/v3-devnet-live.mjs.
// No SDK, wallet or RPC at import time. Never targets mainnet.
import {generateKeyPairSync} from 'node:crypto';
import {DEVNET_NETWORK,DEPOSIT_BASE_UNITS} from './devnet-settlement.mjs';

export const LIVE_RUN_PATTERN=/^v3-devnet-live-[a-z0-9-]{1,48}$/;
export const LIVE_CHANNEL_IDS=Object.freeze(['v3-clearvault-channel','v3-keyforge-channel']);
// Per payer: deposit + generous fee/rent float (open ~3.45M, close <=1.51M lamports).
export const LIVE_FUNDING=Object.freeze({lamportsPerPayer:30_000_000n,tokenBaseUnitsPerPayer:BigInt(DEPOSIT_BASE_UNITS)});
const fail=code=>{const e=new Error(code);e.reasonCode=code;throw e;};
const check=(ok,code)=>{if(!ok)fail(code);};

export function assertLiveRunId(runId){check(typeof runId==='string'&&LIVE_RUN_PATTERN.test(runId),'live_run_id_invalid');return runId;}

/** Fresh ed25519 keypair as Solana 64-byte secret (seed||public). Caller derives the address. */
export function freshSolanaSecret() {
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  return [...Buffer.from(privateKey.export({format:'jwk'}).d,'base64url'),...Buffer.from(publicKey.export({format:'jwk'}).x,'base64url')];
}

/** Exchange charge -> adapter charge (same mapping as scripts/demo/v3-payment.mjs). */
export function ledgerCharge(exchange,id) {
  const c=exchange.require('charges',id),v=exchange.require('campaign_versions',c.campaignVersionId);
  return {...c,sequence:String(c.sequence),advertiserId:v.advertiserId,acceptedReceiptHash:c.receiptHash};
}
export function ledgerObligations(exchange,channelId) {
  const t=exchange.totals({channelId});
  return {reservedBaseUnits:t.reserved.toString(),acceptedBaseUnits:t.accepted.toString(),
    charges:exchange.all('charges').filter(c=>c.channelId===channelId).sort((a,b)=>a.sequence-b.sequence).map(c=>ledgerCharge(exchange,c.id))};
}

/** Adapter terms for one live Devnet channel from the frozen exchange campaign. */
export function buildLiveTerms({runId,campaign,payer,payee,openSalt,now,programAccountHash,programDataHash,compatibilityHash}) {
  assertLiveRunId(runId);check(LIVE_CHANNEL_IDS.includes(campaign?.channelId),'channel_not_allowed');
  check(typeof payer==='string'&&typeof payee==='string'&&payer!==payee,'identity_invalid');
  check(/^[1-9][0-9]*$/.test(openSalt)&&BigInt(openSalt)<(1n<<64n),'salt_invalid');
  check(Number.isSafeInteger(now)&&now>0,'clock_invalid');
  for(const v of [programAccountHash,programDataHash,compatibilityHash])check(/^[a-f0-9]{64}$/.test(v??''),'hash_invalid');
  check(BigInt(campaign.budgetCapBaseUnits)<=8000n&&BigInt(campaign.maxBidBaseUnits)<=4000n,'campaign_cap_exceeded');
  const {treasuryOwner,...network}=DEVNET_NETWORK;
  return {...network,runId,channelId:campaign.channelId,advertiserId:campaign.advertiserId,campaignVersionId:campaign.campaignVersionId,
    payer,payee,depositBaseUnits:DEPOSIT_BASE_UNITS,maxBidBaseUnits:campaign.maxBidBaseUnits,chargeCapBaseUnits:campaign.budgetCapBaseUnits,
    maxCharges:2,zeroChargeClose:true,openSalt,voucherExpiresAt:now+7200,applicationDeadlineAt:now+6900,settlementMarginSeconds:60,
    compatibilityHash,programAccountHash,programDataHash,treasuryOwner};
}

/** Aggregate run caps (V3 POLICY): <=3 accepted deliveries, <=12000 accepted+reserved. */
export function assertAggregateCaps(exchange,policy) {
  let total=0n,count=0;
  for(const id of LIVE_CHANNEL_IDS){const o=ledgerObligations(exchange,id);count+=o.charges.length;total+=BigInt(o.acceptedBaseUnits)+BigInt(o.reservedBaseUnits);}
  check(count<=policy.maxPaidDeliveries&&total<=BigInt(policy.aggregateChargeCapBaseUnits),'aggregate_charge_cap_exceeded');
  return {count,total:total.toString()};
}
