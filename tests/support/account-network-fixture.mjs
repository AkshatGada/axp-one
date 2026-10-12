// Explicit local fixture identities and Jev wire responses. No external requests.
import {Readable} from 'node:stream';
import assert from 'node:assert/strict';
import {createAccountsAPI} from '../../packages/accounts/api.mjs';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

export const origin='http://127.0.0.1:3503';
export const users=['advertiser-a','advertiser-b','app-a','app-b'].map((name,i)=>({id:`20000000-0000-4000-8000-00000000000${i+1}`,email:`${name}@example.test`}));
export function authFixture(now=Date.now){
 const data=user=>({user,accessToken:`access-${user.id}`,refreshToken:`refresh-${user.id}`,expiresAt:now()+3600000});
 const find=id=>{const u=users.find(u=>u.id===id);if(!u)throw Object.assign(Error('auth_rejected'),{code:'auth_rejected',status:401});return u;};
 return {async signin({email,password}){if(password!=='explicit-fixture-password')throw Object.assign(Error('auth_rejected'),{code:'auth_rejected',status:401});return data(find(users.find(u=>u.email===email)?.id));},async getUser(token){return find(token.slice(7));},async refresh(token){return data(find(token.slice(8)));},async signout(){}};
}
export function providerFixture(packets=[]){return async packet=>{packets.push(structuredClone(packet));return jevResponse(packet,packet.state.campaign.productDescription.includes('Priority-A')?3:2,packet.state.campaign.productDescription.includes('Priority-A')?3:2);};}
export const campaignInput=(name='A',patch={})=>({name:`Campaign ${name}`,productDescription:`${name==='A'?'Priority-A':'Priority-B'} hardware wallet with offline keys.`,approvedText:`Independent approved creative ${name}.`,contextHints:[`Private strategy ${name}: hardware comparison.`],declaredCapabilities:['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'],maxBidBaseUnits:'4000',budgetCapBaseUnits:'8000',settlementNetwork:'solana-devnet',...patch});
export const appInput=name=>({name,website:'https://chat.example.test/',allowedOrigins:['https://chat.example.test'],blockedCategories:[],payout:null});
export async function call(api,path,{method='GET',body,headers={},cookie,csrf,sdk=false}={}){
 const req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{url:`/api/accounts${path}`,method,headers:{...(method==='POST'?{'content-type':'application/json',...(!sdk?{origin}:{})}:{}),...(cookie?{cookie}:{}),...(csrf?{'x-axp-csrf':csrf}:{}),...headers}});
 const out={status:0,headers:{},writeHead(status,headers){this.status=status;this.headers=headers;},end(text){this.body=JSON.parse(text);}};
 await api.handler(req,out);return out;
}
export async function login(api,user){const result=await call(api,'/auth/signin',{method:'POST',body:{email:user.email,password:'explicit-fixture-password'}});assert.equal(result.status,200,JSON.stringify(result.body));const cookie=result.headers['set-cookie'].split(';')[0],s=await call(api,'/session',{cookie});return {cookie,csrf:s.body.csrf};}
export function sdk(api,key){return new AXPPublisher({apiKey:key,baseURL:`${origin}/api/accounts/sdk`,fetch:async(url,options)=>{const u=new URL(url),r=await call(api,u.pathname.slice('/api/accounts'.length)+u.search,{sdk:true,method:options.method,headers:options.headers,body:options.body?JSON.parse(options.body):undefined});return new Response(JSON.stringify(r.body),{status:r.status});}});}
export async function setup(api){
 const auths=[],orgs=[],campaigns=[],apps=[],keys=[];
 // Hosted account snapshots deliberately fail busy rather than queue an
 // uncertain mutation. Setup identities sequentially; concurrency is tested
 // on the shared auction/budget boundary itself.
 for(const u of users)auths.push(await login(api,u));
 for(let i=0;i<users.length;i++){
  const auth=auths[i],org=(await call(api,'/organizations',{...auth,method:'POST',body:{name:`Organization ${i}`}})).body.organization.id;orgs.push(org);
  if(i<2){
   const name=i?'B':'A';await call(api,`/organizations/${org}/advertiser`,{...auth,method:'POST',body:{name:`Advertiser ${name}`,website:`https://offer-${name.toLowerCase()}.example.test/`,description:'Fixture declaration'}});
   let r=await call(api,`/organizations/${org}/campaigns`,{...auth,method:'POST',body:campaignInput(name)});assert.equal(r.status,201,JSON.stringify(r.body));const c=r.body.campaign;
   r=await call(api,`/organizations/${org}/campaigns/${c.id}/approve`,{...auth,method:'POST',body:{expectedVersion:1}});assert.equal(r.status,200,JSON.stringify(r.body));campaigns.push(r.body.campaign);
   r=await call(api,`/organizations/${org}/campaigns/${c.id}/serving`,{...auth,method:'POST',body:{expectedVersion:1,enabled:true}});assert.equal(r.status,200,JSON.stringify(r.body));
  }else{
   let r=await call(api,`/organizations/${org}/apps`,{...auth,method:'POST',body:appInput(`Chat ${i}`)});assert.equal(r.status,201);apps.push(r.body.app);
   r=await call(api,`/organizations/${org}/apps/${r.body.app.id}/credentials`,{...auth,method:'POST',body:{label:'Fixture SDK key'}});assert.equal(r.status,201);keys.push(r.body);
  }
 }
 return {auths,orgs,campaigns,apps,keys,sdks:keys.map(k=>sdk(api,k.apiKey))};
}
export const input=(turnId='same-turn',patch={})=>({question:'Compare hardware wallets for Ethereum and Solana with offline key storage.',sessionId:'same-session',turnId,...patch});
export const accept=(sdk,a)=>sdk.acknowledgeRender({awardId:a.award.id,deliveryToken:a.deliveryToken,observation:{creativeHash:a.award.creativeHash,domInserted:true,sponsoredLabelPresent:true}});
export function fixtureAPI(store,service,now=Date.now){return createAccountsAPI({store,provider:authFixture(now),origin,now,network:{ready:true,withService:fn=>fn(service)}});}
