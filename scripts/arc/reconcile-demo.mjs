// Update the existing local worker through its API. Reconcile only: no signing,
// funding, resubmission, auction or model operation is available in this script.
const port=Number(process.env.AXP_ARC_PORT??3440);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_loopback_port');
const origin=`http://127.0.0.1:${port}`;
const boot=await fetch(`${origin}/api/product/bootstrap`).then(r=>r.json());
const state=await fetch(`${origin}/api/product/state`).then(r=>r.json());
for(const c of state.campaigns.filter(c=>c.settlementNetwork==='arc-testnet'&&c.payment)){
  const response=await fetch(`${origin}/api/product/campaigns/${encodeURIComponent(c.id)}/reconcile`,{method:'POST',headers:{'content-type':'application/json','x-axp-csrf':boot.csrf,origin},body:'{}'});
  const result=await response.json();if(!response.ok)throw Error(result.error??'arc_reconcile_failed');
  console.log(JSON.stringify({campaignId:c.id,operation:result.paymentOperation,payment:result.campaign.payment},null,2));
}
