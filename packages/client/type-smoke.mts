// Compile-only consumer check; never execute against a runtime.
import {createClient, type Campaign, type Decision, type FinancialMode, type ReplayBootstrap, type Receipt} from './index.mjs';
const replay=createClient({baseURL:'http://127.0.0.1:8790',surface:'replay'});
const bootstrap:Promise<ReplayBootstrap>=replay.replayBootstrap();
const mode:FinancialMode='sandbox';
// @ts-expect-error Presentation labels are not financial modes.
const invalidMode:FinancialMode='recorded_evidence_replay';
// @ts-expect-error Browser client intentionally has no payment method.
replay.authorizeSynthetic('channel');
const consumeCampaign=(campaign:Campaign)=>{
  const amount:string=campaign.maxBidBaseUnits;
  // @ts-expect-error Base-unit amount is never a number.
  const invalidAmount:number=campaign.budgetCapBaseUnits;
  return {amount,invalidAmount};
};
const consumeDecision=(decision:Decision)=>{
  const action:'bid'|'skip'|'abstain'=decision.decision;
  const conversion:null=decision.conversionProbability;
  return {action,conversion};
};
const consumeReceipt=(receipt:Receipt)=>receipt.renderAcknowledgementHash;
void [bootstrap,mode,invalidMode,consumeCampaign,consumeDecision,consumeReceipt];
