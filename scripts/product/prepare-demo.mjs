import {existsSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {repositoryRoot} from '../../packages/config/local.mjs';

// Rehearsal inventory only. No model calls, native signing, funding or fixed winner.
export const DEMO_STATE_DIR=resolve(repositoryRoot,'local-state/product-presentation');
export const SEED_ADVERTISERS=Object.freeze([
  {brandName:'ClearVault',websiteURL:'https://clearvault.example/',maxBidBaseUnits:'2600'},
  {brandName:'KeyArc',websiteURL:'https://keyarc.example/',maxBidBaseUnits:'2000'},
  {brandName:'ColdNest',websiteURL:'https://coldnest.example/',maxBidBaseUnits:'3000'},
]);
export function prepareDemo({stateDir=DEMO_STATE_DIR}={}) {
  const service=createProductService({stateDir,demoMode:true});
  try {
    if(!service.state().account)service.saveAccount({name:'Demo advertiser workspace',websiteURL:'https://demo.example/'});
    const {id,label,exampleQuestion,...base}=PRESETS[1];
    const campaigns=[];
    for(const offer of SEED_ADVERTISERS) {
      let existing=service.state().campaigns.find(c=>c.brandName===offer.brandName&&c.websiteURL===offer.websiteURL);
      if(!existing) {
        existing=service.saveCampaign({...base,...offer,name:`${offer.brandName} self-custody`,
          approvedText:`Keep your keys offline with ${offer.brandName}. A hardware wallet for Ethereum and Solana self-custody.`,
          contextHints:['When people compare hardware wallets for Ethereum and Solana or offline key storage.','Skip mobile-only software wallets; this offer requires a hardware device.'],
          budgetCapBaseUnits:'100000',depositBaseUnits:'200000'}).campaign;
        service.approve(existing.id);existing=service.launch(existing.id).campaign;
      }
      campaigns.push({advertiserId:existing.advertiserId,brandName:existing.brandName,campaignId:existing.id,status:existing.status});
    }
    return {status:'prepared',stateDir,financialMode:'synthetic',advertisers:campaigns,modelCalls:0,nativeTransactions:0};
  } finally {service.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)) {
  if(process.argv.includes('--reset')&&existsSync(DEMO_STATE_DIR)) {
    let running=false;
    try {const result=await fetch('http://127.0.0.1:3430/api/product/bootstrap',{signal:AbortSignal.timeout(1000)});running=(await result.json()).demo?.enabled===true;}catch{}
    if(running)throw Error('Stop the presentation server before resetting demo state.');
    const backup=`${DEMO_STATE_DIR}-backup-${Date.now()}`;
    renameSync(DEMO_STATE_DIR,backup);
    console.log(JSON.stringify({previousDemoPreservedAt:backup}));
  }
  console.log(JSON.stringify(prepareDemo(),null,2));
  console.log('Start with: AXP_PRODUCT_FINANCIAL_MODE=synthetic AXP_PRODUCT_DEVNET_SIGN=0 AXP_PRODUCT_DEMO_MODE=1 AXP_PRODUCT_STATE_DIR=local-state/product-presentation npm run demo:product');
}
