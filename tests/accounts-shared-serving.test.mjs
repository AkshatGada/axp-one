import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createAccountNetworkService} from '../packages/accounts/network-service.mjs';
import {createHostedAccountsAPI} from '../packages/accounts/hosted.mjs';
import {verifyReceipt} from '../packages/contracts/index.mjs';
import {loadEvidence} from '../packages/v2/evidence.mjs';
import {users,origin,authFixture,providerFixture,fixtureAPI,call,setup,input,accept,sdk,campaignInput} from './support/account-network-fixture.mjs';

function fixture(t,options={}){
 const dir=mkdtempSync(join(tmpdir(),'axp-shared-serving-'));let clock=Date.now(),service;
 const now=()=>clock,store=createAccountStore({dir:join(dir,'accounts'),now}),packets=[];
 const make=()=>createAccountNetworkService({stateDir:join(dir,'network'),catalog:store,transport:providerFixture(packets),now,...options});
 service=make();let api=fixtureAPI(store,service,now);
 t.after(()=>{service.close();store.close();rmSync(dir,{recursive:true,force:true});});
 return {get api(){return api;},get service(){return service;},store,packets,now,advance:ms=>clock+=ms,restart(){service.close();service=make();api=fixtureAPI(store,service,now);}};
}

test('shared network: two advertisers compete through two app SDKs; same turn IDs are app-bound; global budgets/private reports',async t=>{
 const f=fixture(t),s=await setup(f.api);
 const [a,b]=await Promise.all(s.sdks.map(k=>k.requestAd(input())));
 for(const r of [a,b]){assert.equal(r.status,'awarded',JSON.stringify(r));assert.equal(r.award.campaignId,s.campaigns[0].id);assert.equal(r.financialMode,'synthetic');assert.equal(r.execution,'fixture');assert.equal(r.trace,undefined);assert.ok(!JSON.stringify(r).includes('Private strategy'));}
 assert.notEqual(a.opportunityId,b.opportunityId);assert.notEqual(a.award.id,b.award.id);assert.equal(f.packets.length,4);
 for(const p of f.packets){assert.equal(p.state.campaign.maxBidBaseUnits,undefined);assert.equal(p.state.campaign.wallet,undefined);}
 const config=await call(f.api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':s.keys[0].apiKey}});
 assert.equal(config.body.servingEnabled,true);assert.equal(config.body.financialMode,'synthetic');assert.equal(config.body.payments.signingEnabled,false);
 const receipts=await Promise.all([accept(s.sdks[0],a),accept(s.sdks[1],b)]);
 for(const [i,r] of receipts.entries()){assert.equal(r.charge.appId,s.apps[i].id);assert.equal(r.charge.campaignId,s.campaigns[0].id);assert.equal(r.charge.status,'accepted');assert.equal(verifyReceipt(r.receipt,r.signature,config.body.publicKeyPEM),true);}
 const report=await call(f.api,`/organizations/${s.orgs[0]}/campaigns/${s.campaigns[0].id}/report`,s.auths[0]);assert.equal(report.body.summary.acceptedBaseUnits,'8000');assert.equal(report.body.deliveries.length,2);
 assert.ok(!JSON.stringify(report.body).includes('question'));assert.ok(!JSON.stringify(report.body).includes(a.deliveryToken));
 const losing=await call(f.api,`/organizations/${s.orgs[1]}/campaigns/${s.campaigns[1].id}/report`,s.auths[1]);assert.equal(losing.body.summary.acceptedBaseUnits,'0');
 const c=await s.sdks[0].requestAd(input('next'));assert.equal(c.award.campaignId,s.campaigns[1].id);await accept(s.sdks[0],c);
 const appReport=await call(f.api,`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/report`,s.auths[2]);assert.equal(appReport.body.deliveries.length,2);assert.ok(appReport.body.deliveries.every(r=>r.appId===s.apps[0].id));
 for(const [auth,path] of [[s.auths[1],`/organizations/${s.orgs[0]}/campaigns/${s.campaigns[0].id}/report`],[s.auths[3],`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/report`]])assert.equal((await call(f.api,path,auth)).status,404);
 assert.ok(f.service.exchange.all('channels').every(c=>c.authorizedBaseUnits==='0'&&c.settledBaseUnits==='0'));
});

test('shared network: immutable receipt replay, cross-app denial, current rotated credential, restart and read-only recovery',async t=>{
 const f=fixture(t),s=await setup(f.api),a=await s.sdks[0].requestAd(input()),first=await accept(s.sdks[0],a),calls=f.packets.length;
 const dup=await s.sdks[0].requestAd(input());assert.equal(dup.replayed,true);assert.equal(dup.award.id,a.award.id);
 assert.equal((await accept(s.sdks[0],a)).replayed,true);
 await assert.rejects(()=>s.sdks[1].lookupDelivery({awardId:a.award.id,deliveryToken:a.deliveryToken}),e=>e.code==='not_found');
 await assert.rejects(()=>accept(s.sdks[1],a),e=>e.code==='not_found');
 assert.equal((await s.sdks[1].lookupOpportunity({sessionId:'same-session',turnId:'same-turn'})).status,'not_found');
 f.restart();const newSDK=sdk(f.api,s.keys[0].apiKey);
 const recovered=await newSDK.lookupDelivery({awardId:a.award.id,deliveryToken:a.deliveryToken});assert.deepEqual(recovered.result.receipt,first.receipt);assert.equal(recovered.result.signature,first.signature);assert.equal(f.packets.length,calls);
 assert.equal((await newSDK.lookupOpportunity({sessionId:'same-session',turnId:'same-turn'})).result.award.id,a.award.id);
 const route=`/organizations/${s.orgs[2]}/apps/${s.apps[0].id}/credentials/${s.keys[0].credential.id}/rotate`;
 const rotated=await call(f.api,route,{...s.auths[2],method:'POST',body:{label:'Rotated fixture'}});assert.equal(rotated.status,200);
 await assert.rejects(()=>newSDK.lookupDelivery({awardId:a.award.id,deliveryToken:a.deliveryToken}),e=>e.code==='publisher_key_invalid');
 const next=sdk(f.api,rotated.body.apiKey);assert.equal((await next.lookupDelivery({awardId:a.award.id,deliveryToken:a.deliveryToken})).status,'accepted');
 assert.equal((await accept(next,a)).replayed,true);assert.equal(f.service.exchange.all('charges').length,1);
 const conflict=await next.requestAd(input('same-turn',{question:'A different question'}));assert.equal(conflict.error.code,'turn_conflict');assert.equal(f.packets.length,calls);
});

test('shared network: no-fill, mandatory app restrictions, rejected/failed/expired delivery add no charges',async t=>{
 const f=fixture(t),s=await setup(f.api);
 assert.equal((await s.sdks[0].requestAd(input('mobile',{question:'Compare mobile-only software wallets.'}))).status,'no_fill');assert.equal(f.packets.length,0);
 const blocked={...s.apps[0],blockedCategories:['hardware_wallet']};
 assert.equal((await f.service.opportunity(blocked,input('blocked'))).status,'no_fill');assert.equal(f.packets.length,0);
 await assert.rejects(()=>f.service.opportunity({...blocked,blockedCategories:['custom-unknown']},input('unknown')),e=>e.code==='profile_restriction_unsupported');
 const a=await s.sdks[0].requestAd(input('failed'));
 await assert.rejects(()=>f.service.render(s.apps[0],a.award.id,{creativeHash:a.award.creativeHash,domInserted:true,sponsoredLabelPresent:false},a.deliveryToken),e=>e.code==='render_ack_invalid');
 await s.sdks[0].failRender({awardId:a.award.id,deliveryToken:a.deliveryToken});assert.equal(f.service.exchange.all('charges').length,0);
 const b=await s.sdks[0].requestAd(input('expired'));f.advance(300001);
 assert.equal((await s.sdks[0].lookupDelivery({awardId:b.award.id,deliveryToken:b.deliveryToken})).status,'expired');
 await assert.rejects(()=>accept(s.sdks[0],b),e=>e.code==='award_expired');assert.equal(f.service.exchange.all('charges').length,0);
});

test('shared network: edits require explicit fresh enrollment; pause stops auctions but not bound prior delivery',async t=>{
 const f=fixture(t),s=await setup(f.api),a=await s.sdks[0].requestAd(input('before-pause'));
 for(let i=0;i<2;i++)assert.equal((await call(f.api,`/organizations/${s.orgs[i]}/campaigns/${s.campaigns[i].id}/serving`,{...s.auths[i],method:'POST',body:{expectedVersion:1,enabled:false}})).status,200);
 assert.equal((await s.sdks[1].requestAd(input('after-pause'))).status,'no_fill');await accept(s.sdks[0],a);
 const c=s.campaigns[0],path=`/organizations/${s.orgs[0]}/campaigns/${c.id}`;
 assert.equal((await call(f.api,path,{...s.auths[0],method:'POST',body:campaignInput('A',{approvedText:'Changed approved copy.'})})).status,200);
 assert.equal((await call(f.api,`${path}/approve`,{...s.auths[0],method:'POST',body:{expectedVersion:2}})).status,200);
 assert.equal((await s.sdks[1].requestAd(input('no-resurrection'))).status,'no_fill');
 assert.equal((await call(f.api,`${path}/serving`,{...s.auths[0],method:'POST',body:{expectedVersion:1,enabled:true}})).status,409);
 assert.equal((await call(f.api,`${path}/serving`,{...s.auths[0],method:'POST',body:{expectedVersion:2,enabled:true}})).status,200);
 const next=await s.sdks[1].requestAd(input('new-version'));assert.equal(next.status,'awarded');assert.equal(next.award.creative.approvedText,'Changed approved copy.');await accept(s.sdks[1],next);
 assert.equal(f.service.report({campaignId:c.id}).summary.acceptedBaseUnits,'8000');
});

test('shared network: uncertain admission survives restart; no retry or fabricated provider fallback',async t=>{
 let failCheckpoint=true;
 const f=fixture(t,{checkpoint:async()=>{if(failCheckpoint)throw Object.assign(Error('fixture_checkpoint_lost'),{code:'fixture_checkpoint_lost'});}}),s=await setup(f.api);
 let r=await s.sdks[0].requestAd(input());assert.equal(r.status,'error');assert.equal(f.packets.length,0);
 failCheckpoint=false;f.restart();r=await sdk(f.api,s.keys[0].apiKey).lookupOpportunity({sessionId:'same-session',turnId:'same-turn'});assert.equal(r.status,'unknown');
 r=await sdk(f.api,s.keys[0].apiKey).requestAd(input());assert.equal(r.error.code,'opportunity_outcome_unknown');assert.equal(f.packets.length,0);
 const unavailable=fixture(t,{transport:undefined,apiKey:undefined});const u=await setup(unavailable.api),none=await u.sdks[0].requestAd(input());assert.equal(none.status,'no_fill');assert.equal(none.execution,'unavailable');assert.equal(unavailable.service.exchange.all('charges').length,0);
});

test('shared network: actual ContextHint packet reaches injected Jev transport; cached vs lexical provenance retained privately',async t=>{
 const f=fixture(t,{retriever:loadEvidence()}),s=await setup(f.api);
 for(const [i,question] of ['cheapest hardware wallet that still supports ethereum and solana','Compare self-custody options for Ethereum and Solana, prioritizing offline key storage over a mobile-only wallet.'].entries())await s.sdks[i].requestAd(input(`evidence-${i}`,{question}));
 assert.ok(f.packets.every(p=>p.state.evidence?.observed.length>0));
 const decisions=f.service.exchange.all('product_decisions');assert.ok(decisions.some(d=>d.result.engineProvenance.retrieval.method==='vector'));assert.ok(decisions.some(d=>d.result.engineProvenance.retrieval.method==='lexical_fallback'));
});

test('shared network: hosted encrypted workspace restart preserves shared account flow separately from demo/session IDs',async()=>{
 const values=new Map(),kv={kind:'fixture',get:async k=>values.get(k)??null,compareAndSet:async(k,old,next)=>{if((values.get(k)??null)!==old)return false;values.set(k,next);return true;}};
 const packets=[],config={AXP_ACCOUNTS_ENABLED:'1',AXP_ACCOUNT_SERVING_ENABLED:'1',AXP_ACCOUNTS_ORIGIN:origin,AXP_STATE_KEY:Buffer.alloc(32,37).toString('base64')},provider=authFixture();
 const create=()=>createHostedAccountsAPI({config,provider,kv,networkOptions:{serviceOptions:{transport:providerFixture(packets)}}});
 let api=create();const s=await setup(api);
 const health=await call(api,'/health');assert.equal(health.body.capabilities.campaignServing,true);assert.equal(health.body.serving.ready,true);
 const a=await s.sdks[0].requestAd(input());assert.equal(a.status,'awarded',JSON.stringify(a));await accept(s.sdks[0],a);
 api=create();const client=sdk(api,s.keys[0].apiKey),saved=await client.lookupDelivery({awardId:a.award.id,deliveryToken:a.deliveryToken});assert.equal(saved.status,'accepted');assert.equal(saved.result.replayed,true);
 assert.equal((await client.requestAd(input())).replayed,true);assert.equal(packets.length,2);
 assert.ok([...values.keys()].some(k=>k.includes('axp-account-network-v1')));assert.ok(![...values.keys()].some(k=>k.includes(':demo:')));
 const ciphertext=JSON.stringify([...values]);assert.ok(!ciphertext.includes(s.keys[0].apiKey));assert.ok(!ciphertext.includes(a.deliveryToken));assert.ok(!ciphertext.includes('Private strategy'));
 const report=await call(api,`/organizations/${s.orgs[0]}/campaigns/${s.campaigns[0].id}/report`,s.auths[0]);assert.equal(report.body.summary.acceptedBaseUnits,'4000');
});

test('shared network: catalogue pause/edit during model await invalidates stale bids',async t=>{
 let change;const packets=[];
 const f=fixture(t,{transport:async packet=>{if(change){const fn=change;change=null;await fn();}return providerFixture(packets)(packet);}}),s=await setup(f.api);
 change=()=>{for(let i=0;i<2;i++)f.store.setCampaignServing(users[i].id,s.orgs[i],s.campaigns[i].id,{expectedVersion:1,enabled:false});};
 assert.equal((await s.sdks[0].requestAd(input('mid-pause'))).status,'no_fill');
 const pausedActivity=f.service.report({campaignId:s.campaigns[0].id}).activity[0];
 assert.equal(pausedActivity.disposition,'excluded');assert.equal(pausedActivity.decision,'bid');
 assert.ok(pausedActivity.reasonCodes.includes('campaign_paused'));
 for(let i=0;i<2;i++)f.store.setCampaignServing(users[i].id,s.orgs[i],s.campaigns[i].id,{expectedVersion:1,enabled:true});
 change=()=>{for(let i=0;i<2;i++){f.store.saveCampaign(users[i].id,s.orgs[i],campaignInput(i?'B':'A'),s.campaigns[i].id);f.store.approveCampaign(users[i].id,s.orgs[i],s.campaigns[i].id,2);f.store.setCampaignServing(users[i].id,s.orgs[i],s.campaigns[i].id,{expectedVersion:2,enabled:true});}};
 assert.equal((await s.sdks[0].requestAd(input('mid-edit'))).status,'no_fill');
 assert.equal(f.service.exchange.all('charges').length,0);assert.equal(f.service.exchange.all('awards').length,0);
});

test('shared network: shared obligations reject lower cap or rail change; advertiser snapshot changes do not rewrite awards',async t=>{
 const f=fixture(t),s=await setup(f.api),c=s.campaigns[0],auth=s.auths[0],path=`/organizations/${s.orgs[0]}/campaigns/${c.id}`;
 const a=await s.sdks[0].requestAd(input('old-brand'));await accept(s.sdks[0],a);
 f.store.setCampaignServing(users[0].id,s.orgs[0],c.id,{expectedVersion:1,enabled:false});
 f.store.saveAdvertiser(users[0].id,s.orgs[0],{name:'Changed identity',website:'https://changed.example.test/',description:'Changed declaration'});
 f.store.setCampaignServing(users[0].id,s.orgs[0],c.id,{expectedVersion:1,enabled:true});
 const next=await s.sdks[1].requestAd(input('new-brand'));assert.equal(next.status,'awarded');assert.equal(next.award.brandName,'Changed identity');assert.equal(next.award.creative.destinationURL,'https://changed.example.test/');
 const saved=await s.sdks[0].lookupOpportunity({sessionId:'same-session',turnId:'old-brand'});assert.equal(saved.result.award.brandName,'Advertiser A');
 await call(f.api,path,{...auth,method:'POST',body:campaignInput('A',{maxBidBaseUnits:'3000',budgetCapBaseUnits:'3000'})});await call(f.api,`${path}/approve`,{...auth,method:'POST',body:{expectedVersion:2}});
 assert.equal((await call(f.api,`${path}/serving`,{...auth,method:'POST',body:{expectedVersion:2,enabled:true}})).body.error,'cap_below_obligations');
 await call(f.api,path,{...auth,method:'POST',body:campaignInput('A',{settlementNetwork:'tempo-testnet'})});await call(f.api,`${path}/approve`,{...auth,method:'POST',body:{expectedVersion:3}});
 assert.equal((await call(f.api,`${path}/serving`,{...auth,method:'POST',body:{expectedVersion:3,enabled:true}})).body.error,'campaign_network_locked');
 assert.equal(f.service.report({campaignId:c.id}).summary.reservedBaseUnits,'4000');assert.equal(f.service.exchange.all('charges').length,1);
});

test('shared network: rails and report currencies remain separate; caller cannot assign identity, campaign or charge',async t=>{
 const f=fixture(t),s=await setup(f.api),c=s.campaigns[1];
 f.store.saveCampaign(users[1].id,s.orgs[1],campaignInput('B',{settlementNetwork:'tempo-testnet'}),c.id);f.store.approveCampaign(users[1].id,s.orgs[1],c.id,2);f.store.setCampaignServing(users[1].id,s.orgs[1],c.id,{expectedVersion:2,enabled:true});
 const a=await s.sdks[0].requestAd(input('solana'));assert.equal(a.status,'awarded',JSON.stringify(a));assert.equal(a.award.campaignId,s.campaigns[0].id);await accept(s.sdks[0],a);
 const b=await s.sdks[0].requestAd(input('tempo',{settlementNetwork:'tempo-testnet'}));assert.equal(b.status,'awarded',JSON.stringify(b));assert.equal(b.award.campaignId,c.id);await accept(s.sdks[0],b);
 const r=f.service.report({appId:s.apps[0].id});assert.equal(r.summary.acceptedBaseUnits,'4000');assert.equal(r.bySettlementNetwork['tempo-testnet'].acceptedBaseUnits,'2000');assert.equal(r.deliveries.length,2);
 for(const name of ['publisherId','appId','ownerId','campaignId','amountBaseUnits','payout']){
  const result=await call(f.api,'/sdk/opportunities',{sdk:true,method:'POST',headers:{'x-axp-publisher-key':s.keys[0].apiKey},body:{...input(`forged-${name}`),[name]:'forged'}});assert.equal(result.status,400);assert.equal(result.body.error,'unknown_field');
 }
 assert.equal(f.packets.length,2);assert.equal(f.service.exchange.all('charges').length,2);
});

test('shared network: unsupported safety categories fail closed independent of question and ad/model fit',async t=>{
 const f=fixture(t),s=await setup(f.api),app={...s.apps[0],blockedCategories:['gambling']};
 const config=await f.service.config(app);assert.equal(config.servingEnabled,false);assert.equal(config.recoverySupported,true);assert.deepEqual(config.unsupportedCategories,['gambling']);
 await assert.rejects(()=>f.service.opportunity(app,input('neutral',{question:'Which ecommerce tools should I use?'})),e=>e.code==='profile_restriction_unsupported');
 const noAd=await s.sdks[0].requestAd(input('request-category',{excludedCategories:['gambling']}));assert.equal(noAd.status,'no_fill');assert.equal(noAd.reason,'publisher_policy_unavailable');assert.equal(f.packets.length,0);
 assert.equal(f.service.exchange.all('charges').length,0);assert.equal(f.service.exchange.all('awards').length,0);
});

test('shared network: catalogue outage disables serving readiness but retains bound receipt recovery',async t=>{
 let outage=false;const f=fixture(t,{catalog:{networkCampaigns(){if(outage)throw Object.assign(Error('network_catalog_migration_required'),{code:'network_catalog_migration_required',status:503});return f.store.networkCampaigns();}}}),s=await setup(f.api),award=await s.sdks[0].requestAd(input());await accept(s.sdks[0],award);
 outage=true;
 const config=await call(f.api,'/sdk/publisher/config',{headers:{'x-axp-publisher-key':s.keys[0].apiKey}});assert.equal(config.status,200);assert.equal(config.body.servingEnabled,false);assert.equal(config.body.recoverySupported,true);assert.equal(config.body.reason,'network_catalog_migration_required');
 assert.equal((await s.sdks[0].lookupDelivery({awardId:award.award.id,deliveryToken:award.deliveryToken})).status,'accepted');
 const next=await s.sdks[0].requestAd(input('during-outage'));assert.equal(next.error.code,'network_catalog_migration_required');assert.equal(f.packets.length,2);assert.equal(f.service.exchange.all('charges').length,1);
});

test('shared network: loopback advertiser profiles cannot enroll and poison unrelated inventory',async t=>{
 const f=fixture(t),s=await setup(f.api),c=s.campaigns[0];
 f.store.setCampaignServing(users[0].id,s.orgs[0],c.id,{expectedVersion:1,enabled:false});
 f.store.saveAdvertiser(users[0].id,s.orgs[0],{name:'Loopback profile',website:'http://localhost:1234/',description:'Development declaration'});
 const result=await call(f.api,`/organizations/${s.orgs[0]}/campaigns/${c.id}/serving`,{...s.auths[0],method:'POST',body:{expectedVersion:1,enabled:true}});assert.equal(result.status,409);assert.equal(result.body.error,'campaign_destination_invalid');
 const a=await s.sdks[0].requestAd(input());assert.equal(a.status,'awarded');assert.equal(a.award.campaignId,s.campaigns[1].id);await accept(s.sdks[0],a);
});
