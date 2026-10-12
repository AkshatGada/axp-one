// Actual API + store integration, with injected fixture identity only.
// No sockets, real Supabase requests, model calls, wallets or demo state.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAccountsAPI} from '../../../../../packages/accounts/api.mjs';
import {createAccountStore} from '../../../../../packages/accounts/store.mjs';
import {AccountsClient,isConfigured} from './client.ts';

const origin='http://127.0.0.1:3498';
const identities={
  'a@example.test':{id:'11111111-1111-4111-8111-111111111111',email:'a@example.test'},
  'b@example.test':{id:'22222222-2222-4222-8222-222222222222',email:'b@example.test'},
};
async function setup(t) {
  const dir=await mkdtemp(join(tmpdir(),'axp-account-client-test-'));
  const store=createAccountStore({dir});
  t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});
  let confirms=0;
  const verified=email=>({user:identities[email],accessToken:email,refreshToken:email,expiresAt:Date.now()+3600000});
  const provider={
    signup:async()=>({confirmationRequired:true}),
    signin:async({email})=>verified(email),
    confirm:async()=>{confirms++;return verified('a@example.test');},
    getUser:async token=>identities[token],
    refresh:async token=>verified(token),
    signout:async()=>{},
  };
  const api=createAccountsAPI({store,provider,origin});
  function browser() {
    let cookie='';
    const requests=[];
    const transport=async(url,options={})=>{
      requests.push({url,options});
      const headers=Object.fromEntries(new Headers(options.headers));
      if(options.method==='POST')headers.origin=origin; // Browser-managed Origin, not client authority.
      if(cookie)headers.cookie=cookie;
      const req=Readable.from(options.body?[options.body]:[]);
      Object.assign(req,{url:String(url),method:options.method??'GET',headers});
      let status=200,responseHeaders={},body='';
      await api.handler(req,{
        writeHead(code,value){status=code;responseHeaders=value;},
        end(value){body=value??'';},
      });
      if(responseHeaders['set-cookie'])cookie=responseHeaders['set-cookie'].split(';')[0];
      return new Response(body,{status,headers:responseHeaders});
    };
    return {client:new AccountsClient(transport),requests};
  }
  return {browser,api,confirms:()=>confirms};
}

test('client consumes actual API health, signup, signin, session and signout shapes',async t=>{
  const {browser}=await setup(t);
  const {client,requests}=browser();
  const health=await client.health();
  assert.deepEqual(health.configured,{origin:true,provider:true,store:true});
  assert.equal(isConfigured(health),true);
  assert.deepEqual(health.capabilities,{profiles:true,campaignServing:false,nativeFunding:false,appCredentials:false});
  assert.deepEqual(await client.session(),{authenticated:false});
  assert.deepEqual(await client.signup({email:'a@example.test',password:'fixture-password'}),{confirmationRequired:true});
  assert.deepEqual(await client.session(),{authenticated:false});
  await client.signin({email:'a@example.test',password:'fixture-password'});
  const session=await client.session();
  assert.equal(session.authenticated,true);
  assert.equal(session.user.email,'a@example.test');
  assert.equal(typeof session.csrf,'string');
  assert.deepEqual(session.organizations,[]);
  assert.deepEqual(await client.signout(),{signedOut:true});
  assert.deepEqual(await client.session(),{authenticated:false});
  assert.ok(requests.every(({url})=>url.startsWith('/api/accounts/')));
});

test('actual profile and app DTO round trips preserve ownership and declarations',async t=>{
  const {browser}=await setup(t);
  const {client}=browser();
  await client.signin({email:'a@example.test',password:'fixture-password'});
  await client.session();
  const {user}=await client.profile('Fixture person');
  assert.equal(user.displayName,'Fixture person');
  const {organization}=await client.createOrganization('Fixture organization');
  assert.equal(organization.role,'owner');
  assert.equal(typeof organization.createdAt,'number');
  const {advertiser}=await client.advertiser(organization.id,{name:'Fixture business',website:'https://example.test',description:'Fixture description'});
  assert.equal(advertiser.organizationId,organization.id);
  const input={name:'Fixture AI app',website:'http://localhost:3000/app',allowedOrigins:['http://localhost:3000'],blockedCategories:['gambling'],payout:{network:'tempo-testnet',address:'0x'+'1'.repeat(40)}};
  const {app}=await client.app(organization.id,input);
  assert.equal(app.organizationId,organization.id);
  assert.deepEqual(app.payout,input.payout);
  const updated=await client.app(organization.id,{...input,name:'Edited AI app',payout:null},app.id);
  assert.equal(updated.app.id,app.id);
  assert.equal(updated.app.name,'Edited AI app');
  assert.equal(updated.app.payout,null);
  const details=await client.organization(organization.id);
  assert.equal(details.organization.id,organization.id);
  assert.equal(details.advertiser.id,advertiser.id);
  assert.equal(details.apps.length,1);
  assert.equal(details.apps[0].id,app.id);
});

test('actual API denies a second account access to another organization',async t=>{
  const {browser}=await setup(t);
  const a=browser().client,b=browser().client;
  await a.signin({email:'a@example.test',password:'fixture-password'});
  await a.session();
  const {organization}=await a.createOrganization('Only account A');
  await b.signin({email:'b@example.test',password:'fixture-password'});
  assert.deepEqual((await b.session()).organizations,[]);
  await assert.rejects(b.organization(organization.id),{status:404,code:'not_found'});
  await assert.rejects(b.advertiser(organization.id,{name:'No access',website:'https://example.test',description:''}),{status:404,code:'not_found'});
});

test('actual confirmation endpoint is not called by health/session reads',async t=>{
  const {browser,confirms}=await setup(t);
  const client=browser().client;
  await client.health();await client.session();
  assert.equal(confirms(),0);
  assert.deepEqual(await client.confirm('a'.repeat(56)),{signedIn:true});
  assert.equal(confirms(),1);
  assert.equal((await client.session()).authenticated,true);
});

test('unconfigured actual API health is visible, never fake authentication',async()=>{
  const api=createAccountsAPI({enabled:false,origin});
  const client=new AccountsClient(async(url,options={})=>{
    let code,headers,body;
    await api.handler({url,method:options.method,headers:{}},{writeHead(c,h){code=c;headers=h;},end(value){body=value;}});
    return new Response(body,{status:code,headers});
  });
  const health=await client.health();
  assert.equal(health.enabled,false);
  assert.deepEqual(health.configured,{origin:true,provider:false,store:false});
  assert.equal(isConfigured(health),false);
  await assert.rejects(client.session(),{status:503,code:'accounts_configuration_required'});
});
