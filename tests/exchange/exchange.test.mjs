import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Exchange} from '../../packages/exchange/index.mjs';
import {hash,signReceipt} from '../../packages/contracts/index.mjs';
import {campaignFixtures,opportunityFixture,decisionFixture} from '../../packages/contracts/fixtures.mjs';
export function setup(dbPath=':memory:',now=Date.now){
  const {privateKey,publicKey}=generateKeyPairSync('ed25519'),e=new Exchange({dbPath,runId:'test',now});
  e.registerPublisher({publisherId:'owned-travel-app',publisherKeyId:'pub-key',publicKeyPEM:publicKey.export({format:'pem',type:'spki'}).toString(),payee:'synthetic-publisher'});
  for(const c of campaignFixtures()){e.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId:'owned-travel-app',payee:'synthetic-publisher',depositBaseUnits:c.budgetCapBaseUnits,mode:'synthetic'});e.createCampaign(c);}return {e,privateKey};
}
export function auction(e,turn='turn1',now=Date.now()){
  const o=e.createOpportunity(opportunityFixture(now,turn),{idempotencyKey:turn});
  const cs=e.eligibleCampaigns(o.id).eligible;
  return e.runAuction(o.id,cs.map(c=>decisionFixture(c,o,{relevanceLevel:c.campaignId==='baystay'?3:2})));
}
export function delivery(e,privateKey,a,overrides={}){
  const receipt={schemaVersion:'delivery.v1',runId:e.runId,mode:'synthetic',publisherId:a.publisherId,publisherKeyId:'pub-key',awardId:a.id,opportunityId:a.opportunityId,creativeHash:a.creativeHash,nonce:randomUUID(),renderAcknowledgementHash:hash({awardId:a.id,creativeHash:a.creativeHash,domInserted:true,sponsoredLabelPresent:true}),...overrides};
  return {receipt,signature:signReceipt(receipt,privateKey)};
}
test('higher off-target bid excluded, winner first-price, loser untouched',()=>{const {e}=setup();const a=auction(e);assert.equal(a.award.campaignId,'baystay');assert.equal(a.award.priceBaseUnits,'4000');assert.ok(a.rejections.some(r=>r.campaignId==='alpinestay'&&r.reason==='policy_excluded'));assert.equal(e.totals({campaignId:'marinarooms'}).reserved,0n);e.close();});
test('business uniqueness independent of request key and body conflicts',()=>{const {e}=setup(),input=opportunityFixture();const a=e.createOpportunity(input,{idempotencyKey:'one'}),b=e.createOpportunity(input,{idempotencyKey:'two'});assert.equal(a.id,b.id);assert.throws(()=>e.createOpportunity({...input,destination:'Switzerland'},{idempotencyKey:'three'}),{code:'idempotency_conflict'});e.close();});
test('signed receipt replay creates one charge and one authorization',()=>{const {e,privateKey}=setup(),a=auction(e).award,r=delivery(e,privateKey,a);e.acceptDelivery(r);assert.equal(e.acceptDelivery(r).replayed,true);assert.equal(e.report().charges.length,1);e.authorizeSynthetic(a.channelId);e.authorizeSynthetic(a.channelId);assert.equal(e.report().events.filter(v=>v.type==='synthetic_voucher_authorized').length,1);e.close();});
test('two placements same channel accumulate and close replay does not charge',()=>{const {e,privateKey}=setup();const a=auction(e,'one').award;e.pauseCampaign('marinarooms');e.acceptDelivery(delivery(e,privateKey,a));e.authorizeSynthetic(a.channelId);const b=auction(e,'two').award;assert.equal(a.channelId,b.channelId);e.acceptDelivery(delivery(e,privateKey,b));assert.equal(e.authorizeSynthetic(a.channelId).authorizedBaseUnits,'8000');const close=e.closeSynthetic(a.channelId);assert.equal(close.settledBaseUnits,'8000');assert.equal(close.refundBaseUnits,'12000');assert.deepEqual(e.closeSynthetic(a.channelId),close);e.close();});
test('failed render and expiry cost zero; admission at expiry fails',()=>{let now=100000;const {e,privateKey}=setup(':memory:',()=>now);const a=auction(e,'one',now).award;e.failAward(a.id);assert.throws(()=>e.acceptDelivery(delivery(e,privateKey,a)),{code:'award_expired'});const b=auction(e,'two',now).award;now=b.expiresAt;assert.throws(()=>e.acceptDelivery(delivery(e,privateKey,b)),{code:'award_expired'});e.expireAwards();assert.equal(e.report().charges.length,0);assert.equal(e.totals({channelId:b.channelId}).reserved,0n);e.close();});
test('close refuses pending reservation or unpaid authorization',()=>{const {e,privateKey}=setup(),a=auction(e).award;assert.throws(()=>e.closeSynthetic(a.channelId),{code:'close_not_drained'});e.acceptDelivery(delivery(e,privateKey,a));assert.throws(()=>e.closeSynthetic(a.channelId),{code:'authorization_pending'});e.close();});
test('forged receipt, missing disclosure and cross-mode rejected',()=>{const {e,privateKey}=setup(),a=auction(e).award;assert.throws(()=>e.acceptDelivery(delivery(e,privateKey,a,{renderAcknowledgementHash:'false'})),{code:'receipt_invalid'});assert.throws(()=>e.acceptDelivery(delivery(e,privateKey,a,{mode:'devnet'})),{code:'receipt_invalid'});e.close();});
test('restart preserves obligations and outcome',()=>{const dir=mkdtempSync(join(tmpdir(),'axp-exchange-test-'));try{const path=join(dir,'state.sqlite'),{e,privateKey}=setup(path),a=auction(e).award,r=delivery(e,privateKey,a);e.acceptDelivery(r);e.close();const resumed=new Exchange({dbPath:path,runId:'test'});assert.equal(resumed.acceptDelivery(r).replayed,true);assert.equal(resumed.authorizeSynthetic(a.channelId).authorizedBaseUnits,'4000');assert.equal(resumed.report().charges.length,1);resumed.close();}finally{rmSync(dir,{recursive:true,force:true});}});
test('shared sqlite connections serialize budget reservations',()=>{const dir=mkdtempSync(join(tmpdir(),'axp-budget-test-'));try{const path=join(dir,'state.sqlite'),{e}=setup(path),c=campaignFixtures()[0];e.createCampaign({...c,campaignVersionId:'baystay-v2',budgetCapBaseUnits:'5000'});e.pauseCampaign('marinarooms');const other=new Exchange({dbPath:path,runId:'test'});auction(e,'one');const out=auction(other,'two');assert.equal(out.award?.priceBaseUnits,'1000');assert.equal(e.totals({campaignId:'baystay'}).reserved,5000n);other.close();e.close();}finally{rmSync(dir,{recursive:true,force:true});}});
test('frequency cap counts reserved and delivered, releases failed award',()=>{const {e}=setup();e.pauseCampaign('marinarooms');const a=auction(e,'one').award;auction(e,'two');assert.equal(auction(e,'three').status,'no_fill');e.failAward(a.id);assert.equal(auction(e,'four').status,'awarded');e.close();});
