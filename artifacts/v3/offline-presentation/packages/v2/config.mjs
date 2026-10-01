import {hash,ContractError} from '../contracts/index.mjs';

export const QUESTIONS=Object.freeze([
 'cheapest hardware wallet that still supports ethereum and solana',
 'Compare self-custody options for Ethereum and Solana, prioritizing offline key storage over a mobile-only wallet.'
]);
export const CAPABILITIES=Object.freeze(['crypto_storage','hardware_wallet','offline_key_storage','mobile_software_wallet','ethereum','solana','physical_wallet','rfid_blocking']);
const presets=[
 ['clearvault','ClearVault',['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],'ClearVault is a fictional hardware wallet with offline key storage and declared Ethereum and Solana support. Compare self-custody without keeping keys in a mobile-only wallet.'],
 ['pocketkey','PocketKey',['crypto_storage','mobile_software_wallet','ethereum','solana'],'PocketKey is a fictional mobile software wallet with declared Ethereum and Solana support. It does not provide offline hardware key storage.'],
 ['leatherguard','LeatherGuard',['physical_wallet','rfid_blocking'],'LeatherGuard is a fictional physical RFID-blocking wallet for cards. It cannot store cryptocurrency or manage blockchain private keys.']
];
export const CAMPAIGNS=Object.freeze(presets.map(([slug,name,capabilities,copy])=>({campaignId:`v2-${slug}`,campaignVersionId:`v2-${slug}-1`,advertiserId:`v2-${slug}-advertiser`,status:'active',allowedIntents:['crypto_wallet_tools'],destination:'global',declaredConstraints:capabilities,creatives:[{creativeVersionId:`v2-${slug}-creative-1`,approvedText:copy,destinationURL:`https://${slug}.example/`,fictional:true,softFitTags:capabilities,evidenceFieldIds:['declaredConstraints']}],softFitTags:capabilities,maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000',channelId:`v2-${slug}-channel`,policyVersion:'fit_intent_bid_v1'})));
export const NAMES=Object.freeze(Object.fromEntries(presets.map(([s,n])=>[`v2-${s}`,n])));
export function mlCampaign(c,targetingText=''){return {campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,advertiserId:c.advertiserId,allowedIntents:c.allowedIntents,declaredConstraints:{destination:c.destination,requiredCapabilities:c.declaredConstraints},creatives:c.creatives.map(({creativeVersionId,approvedText,softFitTags,evidenceFieldIds})=>({creativeVersionId,approvedText:targetingText?`${approvedText}\nAdvertiser-declared targeting: ${targetingText}`:approvedText,softFitTags,evidenceFieldIds})),softFitTags:c.softFitTags};}
export function makeOpportunity(prompt,{now=Date.now(),questionIndex=0,randomSessionId='v2-wallet-session'}={}){
 if(!QUESTIONS.includes(prompt))throw new ContractError('frozen_question_required');
 return {publisherId:'owned-travel-app',slotId:'v2-wallet-sponsored-card',randomSessionId,turnId:`v2-question-${questionIndex}`,coarseIntent:'crypto_wallet_tools',destination:'global',taskConstraints:[],softPreferences:['hardware_wallet','offline_key_storage','ethereum','solana'],floorBaseUnits:'1000',expiresAt:now+15*60*1000};
}
export function organicReference(prompt){return {status:'completed',source:'sponsor-free-deterministic-reference',text:`Reference response, not an LLM answer: ${prompt===QUESTIONS[0]?'Compare total device cost and current chain support before choosing a hardware wallet. No price winner is asserted.':'An offline hardware signer separates private keys from a mobile-only software wallet. Compare recovery, device verification and Ethereum/Solana support.'} Check primary product documentation; the fictional advertisements do not verify security, support or pricing.`,advertiserMaterialReceived:false};}
export const POLICY=Object.freeze({version:'v2-wallet-paired-1',financialMode:'synthetic',maxCalls:12,maxCorrectiveCalls:3,depositBaseUnits:'20000',maxBidBaseUnits:'4000',totalCapBaseUnits:'8000',auction:'first-price',bidPolicy:'fit_intent_bid_v1',hardConstraints:'Only explicit mandatory declarations; frozen questions use soft preferences',model:'jev-1.13.0'});
export const CONFIG_HASH=hash({QUESTIONS,CAMPAIGNS,POLICY});
