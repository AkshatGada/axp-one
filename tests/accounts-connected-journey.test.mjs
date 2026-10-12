// Explicit isolated fixtures. No environment keys, cloud, emails, model API or chain access.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createAccountNetworkService} from '../packages/accounts/network-service.mjs';
import {createFixtureFinancialRepository} from '../packages/accounts/financial-repository.mjs';
import {AXPPublisher} from '../packages/publisher-sdk/index.mjs';
import {jevResponse} from './ml/fixtures.mjs';
import {users,fixtureAPI,providerFixture,setup,call,input,accept,campaignInput,appInput} from './support/account-network-fixture.mjs';

function fixture(t,options={}){
 const dir=mkdtempSync(join(tmpdir(),'axp-connected-')),packets=[];
 let store,service,api;
 function open(){store=createAccountStore({dir:join(dir,'accounts')});service=createAccountNetworkService({stateDir:join(dir,'network'),catalog:store,transport:providerFixture(packets),...options});api=fixtureAPI(store,service);}
 open();t.after(()=>{service.close();store.close();rmSync(dir,{recursive:true,force:true});});
 return {get api(){return api;},get service(){return service;},get store(){return store;},packets,
  restart(){service.close();store.close();open();}};
}

test('owner app readiness is read-only, private, app-specific and does not imply installed key or native funding',async t=>{
 const f=fixture(t),s=await setup(f.api),path=`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/integration`;
 const tables=['network_requests','network_admissions','awards','charges','product_decisions'],before=tables.map(name=>f.service.exchange.all(name));
 const r=await call(f.api,path,s.auths[2]);assert.equal(r.status,200);assert.equal(r.body.ready,true);
 assert.equal(r.body.execution,'fixture');assert.equal(r.body.activeCredentialCount,1);assert.equal(r.body.broadcastEnabled,false);
 assert.deepEqual(tables.map(name=>f.service.exchange.all(name)),before);assert.equal(f.packets.length,0);
 assert.ok(!JSON.stringify(r.body).includes(s.keys[0].apiKey));assert.equal(r.body.keyConfigured,undefined);
 assert.equal((await call(f.api,path,s.auths[3])).status,404);assert.equal((await call(f.api,path,{})).status,401);
 await call(f.api,`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/credentials/${s.keys[0].credential.id}/revoke`,{...s.auths[2],method:'POST',body:{}});
 const revoked=await call(f.api,path,s.auths[2]);assert.equal(revoked.body.ready,false);assert.equal(revoked.body.gates.credential,false);
 assert.equal(f.packets.length,0);assert.equal(f.service.exchange.all('charges').length,0);
});

test('saved activity distinguishes owner wins/losses, failed delivery and per-app scope through restart',async t=>{
 const f=fixture(t),s=await setup(f.api),a=await s.sdks[0].requestAd(input('accepted')),b=await s.sdks[1].requestAd(input('failed'));
 await accept(s.sdks[0],a);await s.sdks[1].failRender({awardId:b.award.id,deliveryToken:b.deliveryToken});
 const winner=f.service.report({campaignId:s.campaigns[0].id}),loser=f.service.report({campaignId:s.campaigns[1].id});
 assert.equal(winner.activityTotal,2);assert.deepEqual(winner.activity.map(e=>e.deliveryStatus),['failed','accepted']);
 assert.ok(winner.activity.every(e=>e.disposition==='won'&&e.execution==='fixture'&&e.decision==='bid'));
 assert.ok(loser.activity.every(e=>e.disposition==='lost'&&e.bidBaseUnits!==null&&e.awardId===null));
 assert.equal(loser.summary.acceptedBaseUnits,'0');
 const app=f.service.report({appId:s.apps[0].id});assert.equal(app.activityTotal,1);assert.equal(app.activity[0].opportunityId,a.opportunityId);
 const serialized=JSON.stringify([winner,loser,app]);for(const secret of ['Private strategy',input().question,a.deliveryToken,s.keys[0].apiKey,s.campaigns[1].input.productDescription])assert.ok(!serialized.includes(secret));
 const count=f.packets.length;f.restart();assert.deepEqual(f.service.report({campaignId:s.campaigns[0].id}),winner);assert.equal(f.packets.length,count);
 assert.ok(f.service.exchange.all('channels').every(c=>c.authorizedBaseUnits==='0'&&c.settledBaseUnits==='0'));
});

test('native app readiness requires funded routes and enabled broadcasts without invoking a payment transport',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'axp-readiness-finance-'));
 const repository=createFixtureFinancialRepository({path:join(dir,'finance.sqlite')});t.after(()=>{repository.close();rmSync(dir,{recursive:true,force:true});});let transports=0;
 const f=fixture(t,{financialMode:'devnet',financialRepository:repository,origin:'http://127.0.0.1:3503',financialOptions:{broadcastEnabled:false,
  transportFactory:async()=>{transports++;throw Error('must_not_invoke');}}}),s=await setup(f.api);
 const r=await call(f.api,`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/integration`,s.auths[2]);
 assert.equal(r.status,200);assert.equal(r.body.financialMode,'devnet');assert.equal(r.body.ready,false);
 assert.equal(r.body.gates.funding,false);assert.equal(r.body.gates.broadcasts,false);assert.equal(r.body.broadcastEnabled,false);
 assert.equal(transports,0);assert.equal(f.packets.length,0);assert.equal(f.service.exchange.all('charges').length,0);
});

test('activity never relabels policy exclusions, provider failure or unavailable calls as genuine skips',async t=>{
 for(const [expected,options] of [['skipped',{transport:async p=>jevResponse(p,0,3,'no_fit')}],['unavailable',{transport:async()=>{throw Error('fixture_transport_failure');}}],['unavailable',{transport:undefined,apiKey:undefined}]]){
  const f=fixture(t,options),s=await setup(f.api);
  await s.sdks[0].requestAd(input(expected));
  const activity=f.service.report({campaignId:s.campaigns[0].id}).activity;
  assert.equal(activity[0].disposition,expected);assert.equal(activity[0].decision,expected==='skipped'?'skip':'abstain');
  assert.equal(f.service.exchange.all('charges').length,0);
 }
 const f=fixture(t),s=await setup(f.api);
 await s.sdks[0].requestAd(input('mobile',{question:'Compare mobile-only software wallets.'}));
 const a=f.service.report({campaignId:s.campaigns[0].id}).activity[0];
 assert.equal(a.disposition,'excluded');assert.equal(a.decision,'not_called');assert.equal(a.execution,null);assert.equal(f.packets.length,0);
});

test('activity is latest-first and bounded to 100 without using hash ID order as chronology',async t=>{
 const f=fixture(t),s=await setup(f.api);let last;
 for(let i=0;i<103;i++)last=await s.sdks[0].requestAd(input(`mobile-${i}`,{question:'Compare mobile-only software wallets.'}));
 for(const scope of [{appId:s.apps[0].id},{campaignId:s.campaigns[0].id}]){
  const r=f.service.report(scope);assert.equal(r.activityTotal,103);assert.equal(r.activity.length,100);assert.equal(r.activity[0].opportunityId,last.opportunityId);
 }
 const before=f.service.report({appId:s.apps[0].id}),exchange=f.service.exchange,rows=exchange.all('network_requests');
 exchange.tx(()=>{exchange.db.prepare('DELETE FROM network_requests WHERE run=?').run(exchange.runId);for(const row of rows)exchange.put('network_requests',row.id,row);});
 assert.deepEqual(f.service.report({appId:s.apps[0].id}),before,'ID-ordered snapshot restoration must not reorder the activity window');
 assert.equal(f.packets.length,0);assert.equal(f.service.exchange.all('charges').length,0);
});

test('connected real HTTP: distinct owners, blank resources, approval, scoped SDK, accepted receipt, restart and sign-out',async t=>{
 const f=fixture(t),server=createServer((req,res)=>f.api.handler(req,res));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function request(path,actor={},body){
  const r=await fetch(`${base}/api/accounts${path}`,{method:body===undefined?'GET':'POST',headers:{...(actor.cookie?{cookie:actor.cookie}:{}),
   ...(body===undefined?{}:{'content-type':'application/json',origin:'http://127.0.0.1:3503','x-axp-csrf':actor.csrf??''})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 async function owner(user){const signed=await request('/auth/signin',{}, {email:user.email,password:'explicit-fixture-password'});assert.equal(signed.status,200);
  const actor={cookie:signed.cookie},session=await request('/session',actor);return {...actor,csrf:session.body.csrf};}
 const advertiser=await owner(users[0]),publisher=await owner(users[2]);
 const advOrg=(await request('/organizations',advertiser,{name:'Independent advertiser'})).body.organization.id;
 const appOrg=(await request('/organizations',publisher,{name:'Independent AI app'})).body.organization.id;
 const advPath=`/organizations/${advOrg}`,appPath=`/organizations/${appOrg}`;
 assert.deepEqual((await request(`${advPath}/campaigns`,advertiser)).body.campaigns,[]);
 await request(`${advPath}/advertiser`,advertiser,{name:'Owned hardware offer',website:'https://owned.example.test/',description:'Fictional test declaration'});
 let c=(await request(`${advPath}/campaigns`,advertiser,campaignInput())).body.campaign;
 assert.equal(c.status,'draft');assert.equal((await request(`${advPath}/campaigns/${c.id}/serving`,advertiser,{expectedVersion:1,enabled:true})).status,409);
 c=(await request(`${advPath}/campaigns/${c.id}/approve`,advertiser,{expectedVersion:1})).body.campaign;
 await request(`${advPath}/campaigns/${c.id}/serving`,advertiser,{expectedVersion:1,enabled:true});
 const app=(await request(`${appPath}/apps`,publisher,appInput('Independent chat'))).body.app;
 const key=(await request(`${appPath}/apps/${app.id}/credentials`,publisher,{label:'Independent backend'})).body;
 assert.equal((await request(`${appPath}/apps/${app.id}/integration`,publisher)).body.ready,true);
 assert.equal((await request(`${advPath}/campaigns/${c.id}/report`,publisher)).status,404);
 assert.equal((await request(`${appPath}/apps/${app.id}/integration`,advertiser)).status,404);
 const external=new AXPPublisher({baseURL:`${base}/api/accounts/sdk`,apiKey:key.apiKey});
 const a=await external.requestAd(input('http-delivery'));assert.equal(a.status,'awarded');assert.equal(a.execution,'fixture');
 await assert.rejects(()=>external.acknowledgeRender({awardId:a.award.id,deliveryToken:a.deliveryToken,observation:{creativeHash:a.award.creativeHash,domInserted:true,sponsoredLabelPresent:false}}));
 assert.equal(f.service.exchange.all('charges').length,0);
 const receipt=await accept(external,a);assert.equal(receipt.charge.appId,app.id);
 const spend=(await request(`${advPath}/campaigns/${c.id}/report`,advertiser)).body,earn=(await request(`${appPath}/apps/${app.id}/report`,publisher)).body;
 assert.equal(spend.summary.acceptedBaseUnits,earn.summary.acceptedBaseUnits);assert.equal(spend.deliveries[0].receiptHash,earn.deliveries[0].receiptHash);
 assert.equal(spend.activity[0].deliveryStatus,'accepted');const calls=f.packets.length;
 f.restart();assert.equal((await external.requestAd(input('http-delivery'))).replayed,true);assert.equal((await accept(external,a)).replayed,true);
 assert.equal(f.packets.length,calls);assert.equal(f.service.exchange.all('charges').length,1);
 assert.equal((await request(`${advPath}/campaigns/${c.id}`,advertiser)).body.campaign.approvedContentHash,c.approvedContentHash);
 assert.equal((await external.requestAd(input('http-mobile',{question:'Compare mobile-only software wallets.'}))).status,'no_fill');
 await request(`${appPath}/apps/${app.id}/credentials/${key.credential.id}/revoke`,publisher,{});
 assert.equal((await external.requestAd(input('revoked'))).status,'error');assert.equal(f.packets.length,calls);
 await request('/auth/signout',advertiser,{});assert.equal((await request(`${advPath}/campaigns/${c.id}/report`,advertiser)).status,401);
 assert.ok(f.service.exchange.all('channels').every(c=>c.authorizedBaseUnits==='0'&&c.settledBaseUnits==='0'));
});
