import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';

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

export function createAccountsAPI({store,provider,origin,now=Date.now,enabled=true}={}) {
  let configured=false,secure=false;
  try {const u=new URL(origin);secure=u.protocol==='https:';configured=u.origin===origin&&(secure||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)));}catch{}
  const ready=enabled&&configured&&!!provider&&!!store;
  const cookie=(value,age=604800)=>`axp_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure?'; Secure':''}`;
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
      if(req.method==='GET'&&path==='/health')return send(res,200,{enabled:ready,provider:'supabase',profileStore:store?.profileStore??'sqlite-fixture',configured:{origin:configured,provider:!!provider,store:!!store},capabilities:ACCOUNT_CAPABILITIES});
      if(!ready)fail('accounts_configuration_required',503);
      if(!['GET','POST'].includes(req.method))fail('method_not_allowed',405);
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
      if(req.method==='GET'&&path==='/session')return send(res,200,s?{authenticated:true,user:await store.user(s.userId),csrf:s.csrf,organizations:await store.organizations(s.userId),capabilities:ACCOUNT_CAPABILITIES}:{authenticated:false});
      if(!s)fail('authentication_required',401);
      if(req.method==='POST'&&!equal(req.headers['x-axp-csrf'],s.csrf))fail('csrf_invalid',403);
      if(req.method==='POST'&&path==='/auth/signout') {
        only(body,[]);await store.deleteSession(s.hash);await provider.signout(s.accessToken).catch(()=>{});
        return send(res,200,{signedOut:true},{'set-cookie':cookie('',0)});
      }
      if(req.method==='POST'&&path==='/profile')return send(res,200,{user:await store.updateProfile(s.userId,body)});
      if(req.method==='POST'&&path==='/organizations')return send(res,201,{organization:await store.createOrganization(s.userId,body)});
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
