import {validateAccountInput, validateCampaignServingInput} from './store.mjs';
import {APP_SCOPES, validateCampaignInput, validateCredentialInput} from './resources.mjs';
import {campaignServingDTO} from './network-catalog.mjs';

const fail=(code,status=503)=>{throw Object.assign(new Error(code),{code,status});};
const safeDatabaseErrors={not_found:404,invalid_input:400,unknown_field:400,missing_field:400,
  invalid_url:400,invalid_payout:400,limit_exceeded:409,authentication_required:401,confirmed_email_required:401,
  unauthorized:401,private_content:400,spend_limit_exceeded:400,credential_not_active:409,credential_hash_conflict:409,campaign_version_conflict:409,campaign_approval_required:409,campaign_destination_invalid:409};
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
  async function request(name,body,owner=true) {
    if(owner)bound(identity?.id);
    let response,data;
    try {
      response=await fetchImpl(`${base}/rest/v1/rpc/${name}`,{method:'POST',
        headers:{apikey:key,...(owner?{authorization:`Bearer ${token}`} : {}),'content-type':'application/json'},
        body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});
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
  const rpc=(operation,payload={})=>request('axp_account_operation',{operation,payload});
  const resourceRpc=(operation,payload)=>request('axp_account_resource_operation',{operation,payload});
  const servingRpc=(operation,payload)=>request('axp_account_serving_operation',{operation,payload});
  const servingDTO=(row,orgId,campaignId)=>{
    let dto;
    try {dto=campaignServingDTO(row);}catch{fail('profile_database_invalid');}
    if(dto.organizationId.toLowerCase()!==orgId.toLowerCase()||dto.campaignId.toLowerCase()!==campaignId.toLowerCase())fail('profile_database_invalid');
    return dto;
  };
  // Explicit projections also fail closed if a misconfigured server returns a
  // table record. Never propagate hashes or unknown fields to API callers.
  const pick=(row,fields)=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||fields.some(field=>!Object.hasOwn(row,field)))fail('profile_database_invalid');
    return Object.fromEntries(fields.map(field=>[field,row[field]]));
  };
  const credentialDTO=row=>{
    const dto=pick(row,['id','organizationId','appId','publisherId','label','scopes','createdAt','expiresAt','revokedAt']);
    if(dto.publisherId!==`app:${dto.appId}`||JSON.stringify(dto.scopes)!==JSON.stringify(APP_SCOPES))fail('profile_database_invalid');
    return dto;
  };
  const campaignDTO=row=>{
    const dto=pick(row,['id','organizationId','advertiserId','version','status','input','approvedContentHash','createdAt','updatedAt','servingStatus']);
    if(dto.servingStatus!=='not_connected'||!['draft','approved'].includes(dto.status))fail('profile_database_invalid');
    try{dto.input=validateCampaignInput(dto.input);}catch{fail('profile_database_invalid');}
    return dto;
  };
  const appDTO=row=>pick(row,['id','organizationId','name','website','allowedOrigins','blockedCategories','payout','createdAt','updatedAt']);
  const rows=(data,project)=>{if(!Array.isArray(data))fail('profile_database_invalid');return data.map(project);};
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
    campaignServing(userId,orgId,campaignId){bound(userId);return servingRpc('campaignServing',{orgId:uuid(orgId),campaignId:uuid(campaignId)}).then(row=>row===null?null:servingDTO(row,orgId,campaignId));},
    setCampaignServing(userId,orgId,campaignId,input){
      bound(userId);const org=uuid(orgId),campaign=uuid(campaignId),validated=validateCampaignServingInput(input);
      return servingRpc('setCampaignServing',{orgId:org,campaignId:campaign,...validated}).then(row=>{
        const dto=servingDTO(row,org,campaign);
        if(dto.version!==validated.expectedVersion||dto.enabled!==validated.enabled)fail('profile_database_invalid');
        return dto;
      });
    },
    campaigns(userId,orgId){bound(userId);return resourceRpc('campaigns',{orgId:uuid(orgId)}).then(data=>rows(data,campaignDTO));},
    campaign(userId,orgId,campaignId){bound(userId);return resourceRpc('campaign',{orgId:uuid(orgId),campaignId:uuid(campaignId)}).then(campaignDTO);},
    saveCampaign(userId,orgId,input,campaignId=null){bound(userId);return resourceRpc('saveCampaign',{orgId:uuid(orgId),input:validateCampaignInput(input),campaignId:campaignId===null?null:uuid(campaignId)}).then(campaignDTO);},
    approveCampaign(userId,orgId,campaignId,expectedVersion){bound(userId);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)fail('invalid_input',400);return resourceRpc('approveCampaign',{orgId:uuid(orgId),campaignId:uuid(campaignId),expectedVersion}).then(campaignDTO);},
    appCredentials(userId,orgId,appId){bound(userId);return resourceRpc('appCredentials',{orgId:uuid(orgId),appId:uuid(appId)}).then(data=>rows(data,credentialDTO));},
    issueAppCredential(userId,orgId,appId,input){bound(userId);return resourceRpc('issueAppCredential',{orgId:uuid(orgId),appId:uuid(appId),input:validateCredentialInput(input,{withHash:true})}).then(credentialDTO);},
    revokeAppCredential(userId,orgId,appId,keyId){bound(userId);return resourceRpc('revokeAppCredential',{orgId:uuid(orgId),appId:uuid(appId),keyId:uuid(keyId)}).then(credentialDTO);},
    rotateAppCredential(userId,orgId,appId,keyId,input){bound(userId);return resourceRpc('rotateAppCredential',{orgId:uuid(orgId),appId:uuid(appId),keyId:uuid(keyId),input:validateCredentialInput(input,{withHash:true})}).then(credentialDTO);},
    resolveAppCredential(keyHash){
      if(typeof keyHash!=='string'||!/^[a-f0-9]{64}$/.test(keyHash))return Promise.resolve(null);
      return request('axp_resolve_app_credential',{key_hash:keyHash},false).then(data=>{
        if(data===null)return null;
        const result={credential:credentialDTO(data.credential),app:appDTO(data.app)};
        if(result.credential.appId!==result.app.id||result.credential.organizationId!==result.app.organizationId)fail('profile_database_invalid');
        return result;
      });
    },
    putSession:input=>sessions.putSession(input),session:hash=>sessions.session(hash),
    deleteSession:hash=>sessions.deleteSession(hash),close:()=>sessions.close(),
  };
}
