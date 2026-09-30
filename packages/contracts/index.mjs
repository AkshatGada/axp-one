import { createHash, sign, verify } from 'node:crypto';

export const CONTRACT_VERSION = 'axp.runtime.v1';
export const BID_POLICY_VERSION = 'fit_intent_bid_v1';
export const MODES = ['synthetic', 'sandbox', 'devnet'];
export class ContractError extends Error {
  constructor(code, message = code, status = 400) { super(message); this.code = code; this.status = status; }
}
export function canonical(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new ContractError('nonfinite');
    if (value === undefined || typeof value === 'bigint') throw new ContractError('invalid_json');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
export const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export function baseUnits(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new ContractError('invalid_amount');
  const n = BigInt(value); if (n > (1n << 64n) - 1n) throw new ContractError('amount_overflow'); return n;
}
export function strictObject(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContractError('invalid_object');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ContractError('unknown_field', key);
  for (const key of required) if (!Object.hasOwn(value, key)) throw new ContractError('missing_field', key);
  return value;
}
export function string(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) throw new ContractError('invalid_string', field);
  return value;
}
function strings(value, field) {
  if (!Array.isArray(value) || value.length > 100) throw new ContractError('invalid_array', field);
  value.forEach(v => string(v, field)); return value;
}
const campaignFields = ['campaignId','campaignVersionId','advertiserId','status','allowedIntents','destination','declaredConstraints','creatives','softFitTags','maxBidBaseUnits','budgetCapBaseUnits','channelId','policyVersion'];
export function validateCampaign(c) {
  strictObject(c, campaignFields, campaignFields.filter(x => !['softFitTags','policyVersion'].includes(x)));
  for (const k of ['campaignId','campaignVersionId','advertiserId','destination','channelId']) string(c[k],k);
  if (!['active','paused'].includes(c.status)) throw new ContractError('invalid_status');
  strings(c.allowedIntents,'allowedIntents'); strings(c.declaredConstraints,'declaredConstraints');
  if (c.softFitTags) strings(c.softFitTags,'softFitTags');
  baseUnits(c.maxBidBaseUnits); baseUnits(c.budgetCapBaseUnits);
  if (!Array.isArray(c.creatives) || !c.creatives.length || c.creatives.length > 30) throw new ContractError('invalid_creatives');
  const ids=new Set();
  for(const cr of c.creatives) {
    strictObject(cr,['creativeVersionId','approvedText','destinationURL','softFitTags','evidenceFieldIds','fictional'],['creativeVersionId','approvedText','destinationURL','fictional']);
    string(cr.creativeVersionId,'creativeVersionId'); string(cr.approvedText,'approvedText');
    let url; try { url = new URL(cr.destinationURL); } catch { throw new ContractError('invalid_url'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new ContractError('invalid_url');
    if (typeof cr.fictional !== 'boolean') throw new ContractError('invalid_fictional_flag');
    if(ids.has(cr.creativeVersionId)) throw new ContractError('duplicate_creative'); ids.add(cr.creativeVersionId);
    if(cr.softFitTags)strings(cr.softFitTags,'softFitTags'); if(cr.evidenceFieldIds)strings(cr.evidenceFieldIds,'evidenceFieldIds');
  }
  return c;
}
const opportunityFields=['publisherId','slotId','randomSessionId','turnId','coarseIntent','destination','taskConstraints','softPreferences','floorBaseUnits','expiresAt'];
export function validateOpportunity(o) {
  strictObject(o,opportunityFields,opportunityFields.filter(k=>k!=='softPreferences'));
  for(const k of ['publisherId','slotId','randomSessionId','turnId','coarseIntent','destination'])string(o[k],k);
  strings(o.taskConstraints,'taskConstraints'); if(o.softPreferences)strings(o.softPreferences,'softPreferences'); baseUnits(o.floorBaseUnits);
  if(!Number.isSafeInteger(o.expiresAt)||o.expiresAt<=0)throw new ContractError('invalid_expiry'); return o;
}
export function validateDecision(d, campaign, opportunity, now=Date.now(), deadlineAt=Infinity) {
  const fields=['schemaVersion','opportunityId','advertiserId','campaignVersionId','agentRunId','decision','creativeVersionId','relevanceLevel','commercialIntentLevel','relevance','commercialIntent','conversionProbability','evidenceFieldIds','reasonCodes','scoreSemantics','engineProvenance'];
  strictObject(d,fields,['opportunityId','advertiserId','campaignVersionId','agentRunId','decision','creativeVersionId','relevanceLevel','commercialIntentLevel','conversionProbability','evidenceFieldIds','reasonCodes','engineProvenance']);
  if(d.opportunityId!==opportunity.id||d.advertiserId!==campaign.advertiserId||d.campaignVersionId!==campaign.campaignVersionId)throw new ContractError('decision_binding');
  string(d.agentRunId,'agentRunId');
  if(now>=deadlineAt)throw new ContractError('decision_timeout');
  if(!['bid','skip','abstain'].includes(d.decision)||d.conversionProbability!==null)throw new ContractError('decision_invalid');
  for(const k of ['relevanceLevel','commercialIntentLevel']) if(!(d.decision==='abstain'&&d[k]===null)&&(!Number.isInteger(d[k])||d[k]<0||d[k]>3))throw new ContractError('decision_invalid');
  for(const [level,score] of [['relevanceLevel','relevance'],['commercialIntentLevel','commercialIntent']])if(Object.hasOwn(d,score)&&d[score]!== (d[level]===null?null:d[level]/3))throw new ContractError('score_mismatch');
  strings(d.evidenceFieldIds,'evidenceFieldIds'); strings(d.reasonCodes,'reasonCodes');
  const creative=campaign.creatives.find(c=>c.creativeVersionId===d.creativeVersionId);
  if(d.creativeVersionId!==null&&!creative)throw new ContractError('creative_invalid');
  const allowed=new Set(['destination','declaredConstraints','allowedIntents',...campaign.creatives.flatMap(c=>c.evidenceFieldIds??[])]);
  if(d.evidenceFieldIds.some(id=>!allowed.has(id)))throw new ContractError('evidence_invalid');
  if(d.decision==='bid'&&(!creative||!d.evidenceFieldIds.length||d.relevanceLevel<2||d.commercialIntentLevel<2))throw new ContractError('decision_invalid');
  if(!d.engineProvenance||typeof d.engineProvenance!=='object')throw new ContractError('provenance_missing');
  return d;
}
export function computeBid(d,c,availableCampaign,availableChannel,floor) {
  if(d.decision!=='bid')return {status:'no_bid',reason:d.decision==='skip'?'agent_skip':'agent_abstain'};
  const bps={'2:2':5000n,'2:3':7500n,'3:2':7500n,'3:3':10000n}[`${d.relevanceLevel}:${d.commercialIntentLevel}`];
  if(!bps)return {status:'no_bid',reason:'below_threshold'};
  let amount=baseUnits(c.maxBidBaseUnits)*bps/10000n;
  for(const v of [availableCampaign,availableChannel]) {const n=baseUnits(v); if(n<amount)amount=n;}
  if(amount===0n)return {status:'no_bid',reason:'budget_unavailable'};
  if(amount<baseUnits(floor))return {status:'no_bid',reason:'below_floor'};
  return {status:'bid',amountBaseUnits:amount.toString(),bidPolicyVersion:BID_POLICY_VERSION};
}
export function ownCampaign(c) {
  const {campaignId,campaignVersionId,advertiserId,allowedIntents,destination,declaredConstraints,creatives,softFitTags=[]}=c;
  return {campaignId,campaignVersionId,advertiserId,allowedIntents,destination,declaredConstraints,creatives,softFitTags};
}
export const RECEIPT_FIELDS=['schemaVersion','runId','mode','publisherId','publisherKeyId','awardId','opportunityId','creativeHash','nonce','renderAcknowledgementHash'];
export function receiptBytes(receipt) {
  strictObject(receipt,RECEIPT_FIELDS,RECEIPT_FIELDS); for(const k of RECEIPT_FIELDS)string(receipt[k],k);
  if(!MODES.includes(receipt.mode))throw new ContractError('invalid_mode');
  return Buffer.from(`AXP.delivery.v1\n${canonical(receipt)}`);
}
export function signReceipt(receipt,privateKey) {return sign(null,receiptBytes(receipt),privateKey).toString('base64');}
export function verifyReceipt(receipt,signature,publicKey) {
  try{return typeof signature==='string'&&verify(null,receiptBytes(receipt),publicKey,Buffer.from(signature,'base64'));}catch{return false;}
}
