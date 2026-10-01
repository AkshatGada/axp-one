import {hash,ContractError} from '../contracts/index.mjs';
export {mlCampaign,CAPABILITIES} from '../v2/config.mjs';
export const QUESTIONS=Object.freeze([
 'cheapest hardware wallet that still supports ethereum and solana',
 'Compare self-custody options for Ethereum and Solana, prioritizing offline key storage over a mobile-only wallet.',
 'Compare mobile-only software wallets for Ethereum and Solana. A hardware device does not satisfy my requirement.'
]);
export const SCENARIOS=Object.freeze([
 {id:'cached',question:QUESTIONS[0],questionIndex:0,mandatoryCapabilities:['crypto_storage'],paired:true},
 {id:'offline',question:QUESTIONS[1],questionIndex:1,mandatoryCapabilities:['crypto_storage'],paired:true},
 {id:'repeat',question:QUESTIONS[0],questionIndex:2,mandatoryCapabilities:['crypto_storage'],paired:false},
 {id:'mobile',question:QUESTIONS[2],questionIndex:3,mandatoryCapabilities:['crypto_storage','mobile_software_wallet'],paired:false}
]);
const presets=[
 ['clearvault','ClearVault',['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],'ClearVault is a fictional hardware wallet with offline key storage and declared Ethereum/Solana support. Straightforward self-custody guidance for people comparing hardware wallets.','Straightforward self-custody, first hardware wallet, Ethereum and Solana.'],
 ['keyforge','KeyForge',['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],'KeyForge is a fictional hardware wallet with offline key storage and declared Ethereum/Solana support. Hardware self-custody for experienced users comparing key-storage and recovery tradeoffs.','Experienced self-custody users comparing offline hardware signing, Ethereum and Solana.'],
 ['leatherguard','LeatherGuard',['physical_wallet','rfid_blocking'],'LeatherGuard is a fictional physical RFID-blocking wallet for payment cards. It cannot store cryptocurrency or manage blockchain private keys.','Physical card protection; not cryptocurrency or blockchain key storage.']
];
export const CAMPAIGNS=Object.freeze(presets.map(([slug,name,caps,copy,hints])=>({campaignId:`v3-${slug}`,campaignVersionId:`v3-${slug}-1`,advertiserId:`v3-${slug}-advertiser`,status:'active',allowedIntents:['crypto_wallet_tools'],destination:'global',declaredConstraints:caps,creatives:[{creativeVersionId:`v3-${slug}-creative-1`,approvedText:copy,destinationURL:`https://${slug}.example/`,fictional:true,softFitTags:caps,evidenceFieldIds:['declaredConstraints']}],softFitTags:caps,maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000',channelId:`v3-${slug}-channel`,policyVersion:'fit_intent_bid_v1',displayName:name,contextHints:hints})));
export const POLICY=Object.freeze({version:'v3-wallet-1',financialMode:'sandbox',maxCalls:24,categoryLimits:{paired:12,repeat:3,laboratory:6,correction:3},maxOrganic:6,depositBaseUnits:'20000',maxBidBaseUnits:'4000',totalCapBaseUnits:'8000',aggregateChargeCapBaseUnits:'12000',maxPaidDeliveries:3,aggregateFeeRentLamports:'20000000',auction:'first-price',bidPolicy:'fit_intent_bid_v1',frequencyCap:2,model:'jev-1.13.0',organicModel:'gpt-6.1-sol',organicReasoning:'low'});
export function exchangeCampaign(c){const {displayName,contextHints,...rest}=c;return rest;}
export function makeOpportunity(task,{turnId,randomSessionId='v3-wallet-session',now=Date.now(),mandatoryCapabilities=['crypto_storage']}={}){
 if(typeof task!=='string'||!task.trim()||task.length>1200||/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(task)||!turnId)throw new ContractError('question_invalid');
 return {publisherId:'owned-travel-app',slotId:'v3-wallet-sponsored-card',randomSessionId,turnId,coarseIntent:'crypto_wallet_tools',destination:'global',taskConstraints:mandatoryCapabilities,softPreferences:task===QUESTIONS[2]?['mobile_software_wallet','ethereum','solana']:['hardware_wallet','offline_key_storage','ethereum','solana'],floorBaseUnits:'1000',expiresAt:now+30*60*1000};
}
export const CONFIG_HASH=hash({QUESTIONS,SCENARIOS,CAMPAIGNS,POLICY});
