// Separate simulation client. Never signs or exposes a wallet/native voucher.
export function createAdvertiserClient({baseURL,fetch:fetcher=globalThis.fetch}){
  const base=new URL(baseURL);
  if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname)||base.username||base.password)throw Error('loopback_simulation_required');
  let csrf;
  const request=async(path,body)=>{
    if(body!==undefined&&!csrf)throw Error('bootstrap_required');
    const response=await fetcher(new URL(path,base),{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-AXP-CSRF':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error??'request_failed'),{code:result.error,status:response.status});return result;
  };
  const id=value=>{if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,120}$/.test(value))throw Error('invalid_id');return value;};
  return Object.freeze({
    bootstrap:async()=>{const b=await request('/v1/advertiser/bootstrap');if(b.mode!=='synthetic'||b.presentation!=='fresh_deterministic_simulation')throw Error('wrong_surface');csrf=b.csrf;return b;},
    state:()=>request('/v1/advertiser/state'),
    evidence:(query='')=>request(`/v1/advertiser/evidence?q=${encodeURIComponent(query)}`),
    saveAccount:body=>request('/v1/advertiser/account',body),
    saveDraft:body=>request('/v1/advertiser/drafts',body),
    preview:body=>request('/v1/advertiser/preview',body),
    compare:body=>request('/v1/advertiser/compare',body),
    launch:draftId=>request(`/v1/advertiser/drafts/${id(draftId)}/launch`,{}),
    campaignStatus:body=>request('/v1/advertiser/campaign-status',body),
    turn:body=>request('/v1/advertiser/turn',body),
    acknowledgeRender:(awardId,body)=>request(`/v1/awards/${id(awardId)}/render`,body),
    failAward:awardId=>request(`/v1/awards/${id(awardId)}/fail`,{}),
    authorize:channelId=>request(`/v1/advertiser/channels/${id(channelId)}/authorize`,{}),
    close:channelId=>request(`/v1/advertiser/channels/${id(channelId)}/close`,{}),
  });
}
