import {validateAccountInput} from './store.mjs';

const fail=(code,status=503)=>{throw Object.assign(new Error(code),{code,status});};
const safeDatabaseErrors={not_found:404,invalid_input:400,unknown_field:400,missing_field:400,
  invalid_url:400,invalid_payout:400,limit_exceeded:409,authentication_required:401,confirmed_email_required:401};
const uuid=value=>{
  if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))fail('not_found',404);
  return value;
};

// A request-scoped repository, not a globally mutable identity. The opaque
// session store remains encrypted backend state. Every profile operation uses
// the verified person's JWT; no service-role key and no SQLite profile fallback.
export function createSupabaseAccountStore({sessions,url,key,fetchImpl=fetch}={}) {
  let base;
  try {const u=new URL(url);if(u.protocol!=='https:'||u.pathname!=='/'||u.username||u.password||u.search||u.hash||!u.hostname.endsWith('.supabase.co'))throw Error();base=u.origin;}catch{fail('profile_database_configuration_required');}
  if(typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key))fail('auth_publishable_key_required');
  if(!sessions)fail('session_store_required');
  let identity=null,token=null;
  function bound(userId) {
    if(!identity||!token||userId!==identity.id)fail('authentication_required',401);
  }
  async function rpc(operation,payload={}) {
    bound(identity?.id);
    let response,data;
    try {
      response=await fetchImpl(`${base}/rest/v1/rpc/axp_account_operation`,{method:'POST',
        headers:{apikey:key,authorization:`Bearer ${token}`,'content-type':'application/json'},
        body:JSON.stringify({operation,payload}),redirect:'error',signal:AbortSignal.timeout(10000)});
    }catch{fail('profile_database_unavailable');}
    try{data=await response.json();}catch{fail('profile_database_invalid');}
    if(!response.ok) {
      if(response.status===401)fail('auth_rejected',401);
      if(response.status===429)fail('profile_database_rate_limited',429);
      if(Object.hasOwn(safeDatabaseErrors,data?.message))fail(data.message,safeDatabaseErrors[data.message]);
      if(['PGRST202','42P01','42883'].includes(data?.code))fail('profile_database_migration_required');
      // Never return upstream details, SQL text, JWTs or private input.
      fail('profile_database_unavailable');
    }
    return data;
  }
  return {
    profileStore:'supabase',
    bindIdentity(user,accessToken) {
      uuid(user?.id);
      if(typeof user.email!=='string'||typeof accessToken!=='string'||!accessToken||accessToken.length>16384)fail('auth_rejected',401);
      identity={id:user.id,email:user.email};token=accessToken;
    },
    async ensureUser(user) {
      bound(user?.id);
      const result=await rpc('ensureUser');
      // Session FK/reference only. All profile reads and writes use PostgreSQL.
      sessions.ensureUser(user);
      return result;
    },
    user(userId){bound(userId);return rpc('user');},
    updateProfile(userId,input){bound(userId);return rpc('updateProfile',validateAccountInput('updateProfile',input));},
    organizations(userId){bound(userId);return rpc('organizations');},
    createOrganization(userId,input){bound(userId);return rpc('createOrganization',validateAccountInput('createOrganization',input));},
    organization(userId,orgId){bound(userId);return rpc('organization',{orgId:uuid(orgId)});},
    details(userId,orgId){bound(userId);return rpc('details',{orgId:uuid(orgId)});},
    saveAdvertiser(userId,orgId,input){bound(userId);return rpc('saveAdvertiser',{orgId:uuid(orgId),input:validateAccountInput('saveAdvertiser',input)});},
    saveApp(userId,orgId,input,appId=null){bound(userId);return rpc('saveApp',{orgId:uuid(orgId),input:validateAccountInput('saveApp',input),appId:appId===null?null:uuid(appId)});},
    putSession:input=>sessions.putSession(input),session:hash=>sessions.session(hash),
    deleteSession:hash=>sessions.deleteSession(hash),close:()=>sessions.close(),
  };
}
