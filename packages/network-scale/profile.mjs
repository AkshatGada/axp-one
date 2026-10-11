import {hash} from '../contracts/index.mjs';
// Identity-checked trusted operator capability; JSON/profile values cannot enable it.
export const BENCHMARK_PROFILE=Object.freeze({id:'network-scale-2026-10-07-v1',workers:16,campaignsPerWorker:8,turnsPerWorker:64,
  jevDailyCap:512,organicDailyCap:64,advertisers:128,publisherTurns:1024,jevCalls:8192,
  jevUsdMax:1,deepseekUsdMax:2,totalUsdMax:3,jevInflightMax:32,jevRequestsPerSecondMax:32,jevTokensPerSecondMax:60000,
  concurrencySteps:Object.freeze([1,4,8,16]),depositBaseUnits:'50000',budgetBaseUnits:'40000',maxBidBaseUnits:'2000',
  aggregateDepositBaseUnits:'6400000',aggregateChargeBaseUnits:'2048000',aggregateFeeRentLamports:'1600000000'});
export const PROFILE_HASH=hash(BENCHMARK_PROFILE);
export function isBenchmarkProfile(value){return value===BENCHMARK_PROFILE;}
export function questionFor(worker,index){
  const needs=['Compare hardware wallets for Ethereum and Solana with offline key storage.','Recommend an offline hardware wallet for long term Ethereum and Solana self custody.','How should I choose a hardware wallet to keep Ethereum and Solana private keys offline?','Compare cold storage hardware wallets with Ethereum and Solana support.'];
  return `${needs[index%needs.length]} My fictional test scenario is household ${worker+1}, comparison ${index+1}; focus on tradeoffs and avoid inventing vendor specifications.`;
}
export function campaignFor(worker,index){
  const n=worker*8+index+1,brandName=`HarborVault${String(n).padStart(3,'0')}`;
  return {name:`${brandName} self custody`,brandName,websiteURL:`https://harborvault${n}.example/`,
    productDescription:'A fictional hardware wallet with offline key storage and declared Ethereum and Solana support.',
    approvedText:`Keep your keys offline with ${brandName}. A fictional hardware wallet for Ethereum and Solana self custody.`,
    contextHints:['When people compare hardware wallets for Ethereum and Solana or offline key storage.','Skip mobile only software wallet requests; this offer requires a hardware device.'],
    declaredCapabilities:['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],maxBidBaseUnits:BENCHMARK_PROFILE.maxBidBaseUnits,
    budgetCapBaseUnits:BENCHMARK_PROFILE.budgetBaseUnits,depositBaseUnits:BENCHMARK_PROFILE.depositBaseUnits};
}
