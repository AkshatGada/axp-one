import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {hash,verifyReceipt} from '../contracts/index.mjs';

export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const STEPS=[
  {id:'purpose',title:'The exchange',seconds:30,caption:'Advertiser agents buy disclosed placements in participating AI applications. This is a recorded evidence walkthrough, not fresh execution.'},
  {id:'campaigns',title:'Campaign constraints',seconds:20,caption:'Three fictional advertisers declare their capabilities. Code enforces bid and spending caps. Only TripDesk had a funded channel.'},
  {id:'evidence',title:'Real source evidence',seconds:20,caption:'Historical ContextHint prompt and inferred-hint evidence informed the recorded profiles. These brands are not enrolled AXP advertisers.'},
  {id:'decisions',title:'Actual bid and skip',seconds:25,caption:'Six recorded Jev decisions: TripDesk bids twice; AgentPass and HotelOps skip twice. Observed decision times were about 1.24–1.51 seconds.'},
  {id:'answers',title:'Independent answers',seconds:25,caption:'Two gpt-6.1-sol low app-agent answers were generated separately from advertiser material, then entered through an operator-recorded bridge.'},
  {id:'delivery-one',title:'First delivery',seconds:18,caption:'A Sponsored card was inserted in the owned publisher app. The accepted receipt created one 0.003 test-USDC charge—not payment finality.'},
  {id:'delivery-two',title:'Second delivery',seconds:17,caption:'A second accepted delivery created another 0.003 charge on the same channel. Losing campaigns incurred zero charges.'},
  {id:'vouchers',title:'Cumulative authorization',seconds:20,caption:'The trusted worker signed saved native MPP cumulative vouchers: 3000, then 6000 base units. Agents and browsers do not control payment signing.'},
  {id:'settlement',title:'Settlement and refund',seconds:30,caption:'One finalized sandbox settlement paid 0.006 test USDC and returned the unused 0.014 deposit. Fees and account rent are separate.'},
  {id:'replay',title:'Restart without repaying',seconds:20,caption:'A fresh-process replay kept charges, payment records and eight model admissions unchanged. This offline presentation cannot create another payment.'},
  {id:'limits',title:'What this proves',seconds:15,caption:'The connected test-network exchange works. Attention, absorption, conversion lift, production authorization and ultra-low latency remain unproven.'},
];
export function screenProjection({connected,chain,restart,profiles,research}) {
  const turns=[...connected.turns].sort((a,b)=>a.outcome.award.createdAt-b.outcome.award.createdAt);
  const decisions=turns.flatMap((turn,index)=>turn.attempts.map(a=>({turn:index+1,campaignId:a.campaignId,...a.decision,attemptElapsedMs:a.elapsedMs})));
  return {schemaVersion:'axp.replay.v1',presentationKind:'recorded_evidence_replay',financialMode:connected.mode,runId:connected.runId,originalRecordedAt:chain.observedAt,
    task:profiles.task,campaigns:connected.exchange.campaigns,turns,evidence:profiles.profiles,decisions,
    deliveries:connected.exchange.charges.map(c=>({charge:c,award:connected.exchange.awards.find(a=>a.id===c.awardId),receipt:connected.signedReceipts.find(r=>r.chargeId===c.id)})),
    payment:connected.payments[0],chain,restart:{before:restart.before,after:restart.after,unchanged:JSON.stringify(restart.before)===JSON.stringify(restart.after),newPaymentSigning:restart.newSigning,newBroadcasts:restart.newBroadcasts,newModelCalls:restart.newModelCalls,boundary:restart.boundary},
    research:{adoption:research.adoption,conclusions:research.conclusions,limitations:research.limitations},events:connected.exchange.events,
    limitations:[...connected.limitations,'Source profiles were captured from the existing Phase4 public bootstrap after the run; profile hashes match recorded decisions.','Signed receipt packets were reconstructed on replay, not saved at original delivery time.','Frame-hold video is an edited browser screenshot walkthrough; it is not footage of fresh paid execution.'],steps:STEPS};
}
export function validateRecordedEvidence({connected:e,chain:c,restart:r,profiles:p}) {
  if(e.runId!=='phase4-20261001-acceptance'||e.mode!=='sandbox'||c.runId!==e.runId||r.runId!==e.runId||p.runId!==e.runId)throw Error('recorded_run_binding');
  const payment=e.payments[0],charges=e.exchange.charges;
  if(e.payments.length!==1||payment.phase!=='finalized'||payment.open.status!=='finalized'||payment.close.status!=='finalized'||!c.allChecksPassed)throw Error('finalized_evidence_required');
  if(charges.length!==2||new Set(charges.map(x=>x.channelId)).size!==1||new Set(charges.map(x=>x.awardId)).size!==2)throw Error('charge_binding');
  let sum=0n;for(const charge of [...charges].sort((a,b)=>a.sequence-b.sequence)){
    sum+=BigInt(charge.amountBaseUnits);const receipt=e.signedReceipts.find(x=>x.chargeId===charge.id),publisher=e.publisherIdentities.find(x=>x.publisherId===receipt?.receipt.publisherId),v=payment.vouchers.find(x=>x.chargeId===charge.id),award=e.exchange.awards.find(x=>x.id===charge.awardId);
    if(!receipt||hash(receipt.receipt)!==charge.receiptHash||!publisher||!verifyReceipt(receipt.receipt,receipt.signature,publisher.publicKeyPEM)||!award||award.opportunityId!==receipt.receipt.opportunityId||award.creativeHash!==receipt.receipt.creativeHash||receipt.receipt.awardId!==charge.awardId)throw Error('receipt_correlation');
    if(v?.status!=='authorized'||v.incrementBaseUnits!==charge.amountBaseUnits||v.cumulativeAmountBaseUnits!==sum.toString())throw Error('voucher_correlation');
  }
  if(sum!==6000n||payment.depositBaseUnits!=='20000'||payment.settledBaseUnits!==sum.toString()||payment.refundBaseUnits!=='14000'||c.publisherPayoutBaseUnits!==sum.toString()||c.payerRefundBaseUnits!==payment.refundBaseUnits||c.channel.address!==payment.protocolChannelId||c.links.settlement!==payment.settlementLink||c.transactionStatuses.some(s=>s.confirmationStatus!=='finalized'||s.err))throw Error('settlement_correlation');
  if(e.modelAdmissions.filter(x=>x.kind==='jev').length!==6||e.modelAdmissions.filter(x=>x.kind==='organic_app').length!==2||e.turns.length!==2||!e.turns.every(t=>t.organic.provenance.model==='gpt-6.1-sol'))throw Error('model_evidence');
  for(const t of e.turns)for(const a of t.attempts){const profile=p.profiles.find(x=>x.campaignId===a.campaignId);if(profile?.profileHash!==a.decision.engineProvenance.profileHash||profile.snapshotContentHash!==a.decision.engineProvenance.snapshotHash||a.decision.engineProvenance.model!=='jev-1.13.0')throw Error('profile_provenance');}
  if(JSON.stringify(r.before)!==JSON.stringify(r.after)||r.newSigning!==0||r.newBroadcasts!==0||r.newModelCalls!==0)throw Error('restart_evidence');
  const text=JSON.stringify({e,c,r,p});if(/-----BEGIN .*PRIVATE KEY|apikey_[a-zA-Z0-9_]{20,}|"(?:wireBase64|unsignedWireBase64|secret|privateKey|csrf)"\s*:/.test(text))throw Error('private_material');
  return true;
}
export function loadReplayBundle(directory) {
  const bytes=readFileSync(join(directory,'manifest.json')),manifest=JSON.parse(bytes);
  if(manifest.schemaVersion!=='axp.replay-bundle.v1')throw Error('bundle_schema');
  const contents={};for(const [name,expected] of Object.entries(manifest.files)){
    if(!/^[a-z0-9-]+\.json$/.test(name))throw Error('bundle_path');const source=readFileSync(join(directory,name));if(digest(source)!==expected)throw Error(`bundle_hash_mismatch:${name}`);contents[name]=JSON.parse(source);
  }
  const sources={connected:contents['connected-run.json'],chain:contents['chain-check.json'],restart:contents['restart-replay.json'],profiles:contents['source-profiles.json'],research:contents['phase2-summary.json']};
  validateRecordedEvidence(sources);const run=screenProjection(sources);
  return {manifest,bundleHash:digest(bytes),run,sourceFiles:contents};
}
