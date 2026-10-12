import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createAppKey,validAppKey,appKeyHash,validateCampaignInput,validateCredentialInput,exactResource} from './resources.mjs';

export const ACCOUNT_CAPABILITIES=Object.freeze({profiles:true,campaignServing:false,nativeFunding:false,appCredentials:false});
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const hash=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const safeError=e=>typeof e?.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'accounts_unavailable';
const send=(res,status,body,headers={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...headers});res.end(JSON.stringify(body));};
const only=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))fail('input_invalid');};
const cookieOf=req=>{
  const pairs=String(req.headers.cookie??'').split(';').map(p=>p.trim()).filter(p=>p.startsWith('axp_session='));
  if(pairs.length!==1)return null;
  const value=pairs[0].slice('axp_session='.length);return /^[a-f0-9]{64}$/.test(value)?value:null;
};
async function readBody(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))fail('json_required',415);
  let length=0;const chunks=[];
  const read=(async()=>{for await(const chunk of req){const c=Buffer.from(chunk);length+=c.length;if(length>16384)fail('body_too_large',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('json_invalid');}})();
  let timer;try{return await Promise.race([read,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('body_timeout'),{code:'body_timeout',status:408})),10000);timer.unref?.();})]);}finally{clearTimeout(timer);}
}
const credentials=body=>{only(body,['email','password']);if(typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||typeof body.password!=='string'||body.password.length<12||body.password.length>256)fail('credentials_invalid');return {email:body.email.trim().toLowerCase(),password:body.password};};

export function createAccountsAPI({store,provider,origin,now=Date.now,enabled=true,network=null}={}) {
  let configured=false,secure=false;
  try {const u=new URL(origin);secure=u.protocol==='https:';configured=u.origin===origin&&(secure||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)));}catch{}
  const ready=enabled&&configured&&!!provider&&!!store;
  const resources=!!store&&(store.resourceRepository===true||typeof store.saveCampaign==='function');
  const capabilities={...ACCOUNT_CAPABILITIES,campaignDrafts:resources,appCredentials:resources,campaignServing:network?.ready===true,
    ...(network?.financialBindings?{walletBindings:true,nativeFunding:network.financialMode==='devnet'&&network.broadcastEnabled===true}:{})};
  const cookie=(value,age=604800)=>`axp_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure?'; Secure':''}`;
  const readNetwork=fn=>network.readService?network.readService(fn):network.withService(fn);
  async function issue(data,oldHash) {
    store.bindIdentity?.(data.user,data.accessToken);
    const user=await store.ensureUser(data.user),secret=randomBytes(32).toString('hex');
    if(oldHash)await store.deleteSession(oldHash);
    await store.putSession({hash:hash(secret),userId:user.id,accessToken:data.accessToken,refreshToken:data.refreshToken,expiresAt:data.expiresAt,absoluteExpiresAt:now()+604800000,csrf:randomBytes(32).toString('hex')});
    return cookie(secret);
  }
  async function session(req,{verify=true}={}) {
    const secret=cookieOf(req),key=secret?hash(secret):null;
    let s=key?await store.session(key):null;
    if(!s)return null;
    if(s.absoluteExpiresAt<=now()){await store.deleteSession(key);return null;}
    if(!verify)return {...s,hash:key};
    try {
      let user;
      if(s.expiresAt<=now()+45000) {
        const data=await provider.refresh(s.refreshToken);
        if(data.user.id!==s.userId)fail('auth_rejected',401);
        s={...s,accessToken:data.accessToken,refreshToken:data.refreshToken,expiresAt:data.expiresAt};await store.putSession(s);user=data.user;
      } else user=await provider.getUser(s.accessToken);
      if(user.id!==s.userId)fail('auth_rejected',401);
      store.bindIdentity?.(user,s.accessToken);
      await store.ensureUser(user);return {...s,hash:key};
    } catch(e) {
      // An uncertain refresh cannot be retried indefinitely; require a fresh sign-in.
      if(s.expiresAt<=now()+45000||[401,403].includes(e.status))await store.deleteSession(key);
      throw e;
    }
  }
  async function handler(req,res) {
    let responseCookie;
    try {
      const url=new URL(req.url,'http://local'),path=url.pathname.replace(/\/$/,'').replace(/^\/api\/accounts(?=\/|$)/,'');
      if(!url.pathname.startsWith('/api/accounts/'))fail('not_found',404);
      if(req.method==='GET'&&path==='/health'){
        const serving=network?.readiness?await network.readiness():{ready:network?.ready===true,reason:network?.reason??'account_serving_not_connected'};
        return send(res,200,{enabled:ready,provider:'supabase',profileStore:store?.profileStore??'sqlite-fixture',configured:{origin:configured,provider:!!provider,store:!!store},capabilities:{...capabilities,campaignServing:serving.ready,...(network?.financialBindings?{walletBindings:serving.walletBindings===true,nativeFunding:serving.ready&&serving.broadcastEnabled===true}:{})},serving});
      }
      if(!ready)fail('accounts_configuration_required',503);
      if(!['GET','POST'].includes(req.method))fail('method_not_allowed',405);
      if(path==='/sdk'||path.startsWith('/sdk/')) {
        // Server-to-server SDK authority is distinct from a human's session.
        // Never fall back to the public shared-demo publisher or ledger.
        if(req.headers.origin||req.headers['sec-fetch-site']==='cross-site')fail('server_credentials_only',403);
        const key=req.headers['x-axp-publisher-key'];
        if(!resources||!validAppKey(key))fail('publisher_key_invalid',401);
        const resolved=await store.resolveAppCredential(appKeyHash(key));
        if(!resolved)fail('publisher_key_invalid',401);
        const scope=req.method==='GET'?(path.includes('/awards/')?'delivery:read':'opportunities:read'):(path==='/sdk/opportunities'?'opportunities:write':'delivery:write');
        if(!resolved.credential.scopes.includes(scope))fail('publisher_key_invalid',401);
        if(req.method==='GET'&&path==='/sdk/publisher/config'&&!url.search) {
          if(network?.ready)return send(res,200,await readNetwork(service=>service.config(resolved.app)));
          return send(res,200,{schemaVersion:'publisher-config.v2',contractVersion:'0.2.0',publisherId:resolved.credential.publisherId,appId:resolved.app.id,
            app:{name:resolved.app.name,website:resolved.app.website},allowedOrigins:resolved.app.allowedOrigins,blockedCategories:resolved.app.blockedCategories,
            expiresAtUnit:'unix_epoch_milliseconds',maxQuestionCharacters:1200,restrictionLimit:17,placementId:'chat-sponsored-card',apiBasePath:'/api/accounts/sdk',
            financialMode:'unfunded',mode:'unfunded',servingEnabled:false,recoverySupported:false,keyConfigured:true,
            capabilities:{configuration:true,campaignServing:false,nativeFunding:false},reason:'account_serving_not_connected'});
        }
        const delivery=path.match(/^\/sdk\/awards\/([-\w]+)\/(render|fail|status)$/);
        if(path==='/sdk/opportunities'&&req.method==='POST'||path==='/sdk/publisher/opportunities'&&req.method==='GET'||delivery) {
          if(!network?.ready)fail('account_serving_not_connected',503);
          const app=resolved.app;
          if(path==='/sdk/opportunities'&&req.method==='POST'&&!url.search){const input=await readBody(req);return send(res,200,await network.withService(service=>service.opportunity(app,input)));}
          if(path==='/sdk/publisher/opportunities'&&req.method==='GET'){
            if([...url.searchParams.keys()].length!==2||url.searchParams.getAll('sessionId').length!==1||url.searchParams.getAll('turnId').length!==1)fail('invalid_input');
            return send(res,200,await readNetwork(service=>service.lookupOpportunity(app,{sessionId:url.searchParams.get('sessionId'),turnId:url.searchParams.get('turnId')})));
          }
          if(delivery&&!url.search){
            const [,awardId,action]=delivery,token=req.headers['x-axp-delivery-token'];
            if(action==='status'&&req.method==='GET')return send(res,200,await readNetwork(service=>service.lookupDelivery(app,awardId,token)));
            if(['render','fail'].includes(action)&&req.method==='POST'){
              const input=await readBody(req);
              return send(res,200,await network.withService(service=>action==='render'?service.render(app,awardId,input,token):service.failAward(app,awardId,input,token)));
            }
          }
        }
        fail('not_found',404);
      }
      if(req.headers['sec-fetch-site']==='cross-site')fail('origin_invalid',403);
      if(req.method==='POST'&&req.headers.origin!==origin)fail('origin_invalid',403);
      const body=req.method==='POST'?await readBody(req):null;
      if(req.method==='POST'&&['/auth/signup','/auth/signin','/auth/confirm'].includes(path)) {
        const existing=cookieOf(req),oldHash=existing?hash(existing):null;
        if(path==='/auth/signup')return send(res,200,await provider.signup({...credentials(body),origin}));
        let data;
        if(path==='/auth/signin')data=await provider.signin(credentials(body));
        else {only(body,['tokenHash']);if(typeof body.tokenHash!=='string'||!/^[a-f0-9]{56}$/i.test(body.tokenHash))fail('confirmation_invalid');data=await provider.confirm(body.tokenHash);}
        responseCookie=await issue(data,oldHash);return send(res,200,{signedIn:true},{'set-cookie':responseCookie});
      }
      // Local logout must still work during provider downtime. Revoke best-effort;
      // always invalidate this AXP session before returning.
      const s=await session(req,{verify:path!=='/auth/signout'});
      if(req.method==='GET'&&path==='/session')return send(res,200,s?{authenticated:true,user:await store.user(s.userId),csrf:s.csrf,organizations:await store.organizations(s.userId),capabilities}:{authenticated:false});
      if(!s)fail('authentication_required',401);
      if(req.method==='POST'&&!equal(req.headers['x-axp-csrf'],s.csrf))fail('csrf_invalid',403);
      if(req.method==='POST'&&path==='/auth/signout') {
        only(body,[]);await store.deleteSession(s.hash);await provider.signout(s.accessToken).catch(()=>{});
        return send(res,200,{signedOut:true},{'set-cookie':cookie('',0)});
      }
      if(req.method==='POST'&&path==='/profile')return send(res,200,{user:await store.updateProfile(s.userId,body)});
      if(req.method==='POST'&&path==='/organizations')return send(res,201,{organization:await store.createOrganization(s.userId,body)});
      const financeResource=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/(campaigns|apps)\/([a-zA-Z0-9-]+)\/(wallet(?:\/(challenge|verify))?|funding|channels)$/);
      const financeChannel=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/channels\/([a-zA-Z0-9-]+)\/(open\/prepare|open\/sign|voucher\/prepare|voucher\/sign|close\/prepare|close\/sign|reconcile|serving)$/);
      if(financeResource||financeChannel){
        if(url.search)fail('invalid_input');
        if(!network?.ready)fail('account_funding_not_connected',503);
        const result=await network.withService(async service=>{
          if(!service.financial)fail('account_funding_not_connected',503);
          const f=service.financial(store);
          if(financeChannel){
            if(req.method!=='POST')fail('not_found',404);
            const [,orgId,channelId,action]=financeChannel;return f.execute(s.userId,orgId,channelId,action,body);
          }
          const [,orgId,kind,resourceId,action,walletAction]=financeResource,purpose=kind==='campaigns'?'funding':'payout';
          if(action==='wallet'&&req.method==='GET')return {wallet:await f.wallet(s.userId,orgId,resourceId,purpose)};
          if(walletAction&&req.method==='POST')return walletAction==='challenge'?f.challenge(s.userId,orgId,resourceId,purpose,body):{wallet:await f.verifyWallet(s.userId,orgId,resourceId,purpose,body)};
          if(action==='channels'&&req.method==='GET')return f.list(s.userId,orgId,resourceId,purpose);
          if(action==='funding'&&kind==='campaigns'&&req.method==='POST')return {channel:await f.freeze(s.userId,orgId,resourceId,body)};
          fail('not_found',404);
        });
        return send(res,200,result);
      }
      const serving=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/campaigns\/([a-zA-Z0-9-]+)\/(serving|report)$/);
      if(serving){
        const [,orgId,campaignId,action]=serving;
        const ownedCampaign=await store.campaign(s.userId,orgId,campaignId); // Verified owner, not a ledger ID supplied by caller.
        if(action==='serving'){
          if(req.method==='GET')return send(res,200,{enrollment:await store.campaignServing(s.userId,orgId,campaignId)});
          exactResource(body,['expectedVersion','enabled']);
          if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<1||typeof body.enabled!=='boolean')fail('invalid_input');
          if(!network?.ready)fail('account_serving_not_connected',503);
          return send(res,200,{enrollment:await network.withService(service=>{
            if(body.enabled)service.checkEnrollment(ownedCampaign);
            return store.setCampaignServing(s.userId,orgId,campaignId,body);
          })});
        }
        if(req.method==='GET'){
          if(!network?.ready)fail('account_serving_not_connected',503);
          return send(res,200,await readNetwork(service=>service.report({campaignId})));
        }
        fail('not_found',404);
      }
      const appReport=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/apps\/([a-zA-Z0-9-]+)\/(report|integration)$/);
      if(appReport&&req.method==='GET'){
        const [,orgId,appId,action]=appReport,details=await store.details(s.userId,orgId);
        const app=details.apps.find(app=>app.id===appId);
        if(!app)fail('not_found',404);
        if(!network?.ready)fail('account_serving_not_connected',503);
        if(action==='integration'){
          if(url.search)fail('invalid_input');
          const config=await readNetwork(service=>service.config(app));
          const credentials=await store.appCredentials(s.userId,orgId,appId);
          const activeCredentialCount=credentials.filter(c=>c.revokedAt===null&&c.expiresAt>now()).length;
          const gates={credential:activeCredentialCount>0,restrictions:config.unsupportedCategories.length===0,
            catalogue:config.catalogue.ready,inventory:config.catalogue.inventoryAvailable===true,
            provider:config.engine.ready&&config.engine.usedToday<config.engine.dailyCap,funding:config.financialMode==='synthetic'||config.payments.ready,
            broadcasts:config.financialMode==='synthetic'||network.broadcastEnabled===true};
          return send(res,200,{schemaVersion:'account-app-integration.v1',appId,financialMode:config.financialMode,
            apiBasePath:'/api/accounts/sdk',activeCredentialCount,gates,ready:Object.values(gates).every(Boolean),
            execution:config.engine.execution,recoverySupported:config.recoverySupported,broadcastEnabled:network.broadcastEnabled===true});
        }
        return send(res,200,await readNetwork(service=>service.report({appId})));
      }
      const campaigns=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/campaigns(?:\/([a-zA-Z0-9-]+)(?:\/(approve))?)?$/);
      if(campaigns) {
        if(!resources)fail('account_resources_unavailable',503);
        const [,orgId,campaignId,action]=campaigns;
        if(req.method==='GET'&&!action)return send(res,200,campaignId?{campaign:await store.campaign(s.userId,orgId,campaignId)}:{campaigns:await store.campaigns(s.userId,orgId)});
        if(req.method==='POST') {
          if(action){
            exactResource(body,['expectedVersion']);
            if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<1||body.expectedVersion>2147483647)fail('invalid_input');
            return send(res,200,{campaign:await store.approveCampaign(s.userId,orgId,campaignId,body.expectedVersion)});
          }
          return send(res,campaignId?200:201,{campaign:await store.saveCampaign(s.userId,orgId,validateCampaignInput(body),campaignId??null)});
        }
      }
      const keys=path.match(/^\/organizations\/([a-zA-Z0-9-]+)\/apps\/([a-zA-Z0-9-]+)\/credentials(?:\/([a-zA-Z0-9-]+)\/(revoke|rotate))?$/);
      if(keys) {
        if(!resources)fail('account_resources_unavailable',503);
        const [,orgId,appId,keyId,action]=keys;
        if(req.method==='GET'&&!keyId)return send(res,200,{credentials:await store.appCredentials(s.userId,orgId,appId)});
        if(req.method==='POST') {
          if(action==='revoke'){exactResource(body,[]);return send(res,200,{credential:await store.revokeAppCredential(s.userId,orgId,appId,keyId)});}
          const input=validateCredentialInput(body),{apiKey,keyHash}=createAppKey();
          const credential=action==='rotate'?await store.rotateAppCredential(s.userId,orgId,appId,keyId,{...input,keyHash}):await store.issueAppCredential(s.userId,orgId,appId,{...input,keyHash});
          return send(res,action?200:201,{credential,apiKey});
        }
      }
      const match=path.match(/^\/organizations\/([a-zA-Z0-9-]+)(?:\/(advertiser|apps)(?:\/([a-zA-Z0-9-]+))?)?$/);
      if(match) {
        const [,orgId,kind,appId]=match;
        if(req.method==='GET'&&!kind)return send(res,200,await store.details(s.userId,orgId));
        if(req.method==='POST'&&kind==='advertiser'&&!appId)return send(res,200,{advertiser:await store.saveAdvertiser(s.userId,orgId,body)});
        if(req.method==='POST'&&kind==='apps')return send(res,appId?200:201,{app:await store.saveApp(s.userId,orgId,body,appId??null)});
      }
      fail('not_found',404);
    } catch(e) {send(res,e.status??503,{error:safeError(e)});}
  }
  return {handler,ready};
}
