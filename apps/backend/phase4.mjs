import {PHASE3_CAMPAIGNS,PHASE3_TASK,PHASE3_TURNS,createPhase3Runtime} from './phase3.mjs';
import {ContractError} from '../../packages/contracts/index.mjs';

export const PHASE4_RUN_ID='phase4-20261001-acceptance';
export const PHASE4_SESSION_ID='phase4-owned-session';
export const PHASE4_CAMPAIGNS=PHASE3_CAMPAIGNS.map(c=>({...c,channelId:`phase4-channel-${c.campaignId}`,maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000'}));
export async function createPhase4Runtime(options) {
  const runtime=await createPhase3Runtime({...options,runId:PHASE4_RUN_ID,campaigns:PHASE4_CAMPAIGNS,financialMode:options.terms.mode,phase:'phase4',sessionId:PHASE4_SESSION_ID,
    opportunityFactory(prompt,{turnId,now,randomSessionId}) {if(prompt!==PHASE3_TASK.prompt||!PHASE3_TURNS.includes(turnId)||randomSessionId!==PHASE4_SESSION_ID)throw new ContractError('phase4_frozen_turn_required');return {publisherId:'owned-travel-app',slotId:'sponsored-card',randomSessionId,turnId,coarseIntent:'travel_tools',destination:'unknown',taskConstraints:[],softPreferences:[...PHASE3_TASK.requiredCapabilities],floorBaseUnits:'1000',expiresAt:now+180000};}});
  runtime.metadata.limitations=['Fictional campaigns; historical ContextHint evidence is not advertiser enrollment.','Only TripDesk has one funded channel; other campaign decisions are evaluated before the independent funding check.','No multi-funded-bidder competition is claimed.','Independent organic app-agent completions use an operator-recorded bridge.','Owned-app receipt is not attention, absorption, endorsement or conversion.','Sandbox is a hosted test validator, not Solana Devnet or mainnet.'];
  return runtime;
}
