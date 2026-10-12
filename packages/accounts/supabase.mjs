// Supabase is the identity authority. Never derive authorization from decoded JWTs.
const fail=(code,status=503)=>{throw Object.assign(new Error(code),{code,status});};
export function createSupabaseAuth({url,key,fetchImpl=fetch,now=Date.now}={}) {
  let base;
  try { const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!u.hostname.endsWith('.supabase.co'))throw Error();base=u.origin; }
  catch {fail('auth_configuration_required');}
  // Accept current publishable keys only. An administrative key has no place here.
  if(typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key))fail('auth_publishable_key_required');
  async function request(path,{method='POST',body,token}={}) {
    let r;
    try {r=await fetchImpl(`${base}/auth/v1${path}`,{method,headers:{apikey:key,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},redirect:'error',signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});}
    catch {fail('auth_provider_unavailable');}
    if(!r.ok) {
      // Do not leak provider errors, tokens, account existence or request bodies.
      if(r.status===429)fail('auth_rate_limited',429);
      if(r.status>=500)fail('auth_provider_unavailable');
      fail('auth_rejected',401);
    }
    if(r.status===204)return {};
    let result;try{result=await r.json();}catch{fail('auth_provider_invalid');}
    return result;
  }
  async function getUser(accessToken) {
    if(typeof accessToken!=='string'||!accessToken||accessToken.length>16384)fail('auth_rejected',401);
    const u=await request('/user',{method:'GET',token:accessToken});
    if(typeof u.id!=='string'||!/^[a-f0-9-]{36}$/i.test(u.id)||typeof u.email!=='string'||!u.email_confirmed_at)fail('confirmed_email_required',401);
    return {id:u.id,email:u.email};
  }
  async function verifiedSession(data) {
    if(typeof data.access_token!=='string'||typeof data.refresh_token!=='string'||!data.refresh_token||data.refresh_token.length>16384||!Number.isFinite(data.expires_in)||data.expires_in<1||data.expires_in>86400)fail('auth_provider_invalid');
    const user=await getUser(data.access_token);
    return {user,accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:now()+data.expires_in*1000};
  }
  return {
    getUser,
    async signup({email,password,origin}) {
      const result=await request(`/signup?redirect_to=${encodeURIComponent(origin+'/account/')}`,{body:{email,password}});
      // This slice expects confirmed email. Don't silently sign up an unconfirmed account.
      if(result.access_token){await request('/logout?scope=local',{token:result.access_token}).catch(()=>{});fail('email_confirmation_must_be_enabled');}
      return {confirmationRequired:true};
    },
    signin:({email,password})=>request('/token?grant_type=password',{body:{email,password}}).then(verifiedSession),
    confirm:tokenHash=>request('/verify',{body:{token_hash:tokenHash,type:'email'}}).then(verifiedSession),
    refresh:refreshToken=>request('/token?grant_type=refresh_token',{body:{refresh_token:refreshToken}}).then(verifiedSession),
    signout:accessToken=>request('/logout?scope=local',{token:accessToken}),
  };
}
