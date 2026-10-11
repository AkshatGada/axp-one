// Seed three native demo advertisers through the same approved dashboard API.
// Requires an explicitly enabled Devnet server. No reset, hidden transfers or model calls.
import {SEED_ADVERTISERS} from './prepare-demo.mjs';
import {PRESETS} from '../../packages/product/service.mjs';
const origin=process.env.AXP_PRODUCT_ORIGIN??'http://127.0.0.1:3430';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('local_product_origin_required');
const get=async path=>{const r=await fetch(`${origin}/api/product/${path}`,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('product_api_unavailable');return r.json();};
const bootstrap=await get('bootstrap');
if(bootstrap.financialMode!=='devnet'||bootstrap.payments?.ready!==true||!bootstrap.demo?.enabled)throw Error('enabled_native_demo_server_required');
const post=async(path,body)=>{const r=await fetch(`${origin}/api/product/${path}`,{method:'POST',headers:{'content-type':'application/json','x-axp-csrf':bootstrap.csrf,origin},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const j=await r.json();if(!r.ok)throw Error(j.error??'product_operation_failed');return j;};
let state=await get('state');if(!state.account)await post('account',{name:'Demo advertiser workspace',websiteURL:'https://demo.example/'});
const {id,label,exampleQuestion,...base}=PRESETS[1],result=[];
for(const seed of SEED_ADVERTISERS){state=await get('state');let campaign=state.campaigns.find(c=>c.brandName===seed.brandName&&c.websiteURL===seed.websiteURL);
 if(!campaign){campaign=(await post('campaigns',{...base,...seed,name:`${seed.brandName} self-custody`,approvedText:`Keep your keys offline with ${seed.brandName}. A hardware wallet for Ethereum and Solana self-custody.`,contextHints:['When people compare hardware wallets for Ethereum and Solana or offline key storage.','Skip mobile-only software wallets; this offer requires a hardware device.'],budgetCapBaseUnits:'100000',depositBaseUnits:'200000'})).campaign;await post(`campaigns/${campaign.id}/approve`,{});}
 if(campaign.status==='draft')campaign=(await post(`campaigns/${campaign.id}/launch`,{})).campaign;
 if(campaign.status!=='active'||campaign.payment?.openStatus!=='finalized')throw Error(`native_seed_requires_operator_attention:${campaign.brandName}`);
 result.push({advertiserId:campaign.advertiserId,campaignId:campaign.id,brandName:campaign.brandName,depositBaseUnits:campaign.payment.confirmedDepositBaseUnits,channelAddress:campaign.payment.address,transactions:campaign.payment.transactions.map(t=>({operation:t.operation,status:t.status,signature:t.signature,explorerURL:t.explorerURL}))});
 console.log(JSON.stringify(result.at(-1)));
}
console.log(JSON.stringify({status:'prepared',financialMode:'devnet',network:'solana-devnet',advertisers:result.length,providerCalls:0,note:'Funded channels preserved. Stop and settle them normally; never reset this workspace.'}));
