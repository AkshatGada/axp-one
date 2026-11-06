import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createArcDemoService} from '../../packages/arc/demo.mjs';
import {PRESETS} from '../../packages/product/service.mjs';
test('isolated harness provider fixtures satisfy current AXP contracts and remain labelled', async t => {
  const stateDir=mkdtempSync(join(tmpdir(),'axp-arc-demo-contract-'));
  // Synthetic financial override tests provider contracts with no wallet or RPC.
  const service=createArcDemoService({stateDir,financialMode:'synthetic'});
  t.after(()=>{service.close();rmSync(stateDir,{recursive:true,force:true});});
  const config=service.publisherConfig();assert.equal(config.demonstration.fixtureProviders,true);
  assert.equal(config.engine.execution,'fixture');assert.equal(config.organic.execution,'fixture');
  service.saveAccount({name:'Fixture contract test',websiteURL:'https://example.test/'});
  const {id,label,exampleQuestion,...draft}=PRESETS[0], campaign=service.saveCampaign(draft).campaign;
  service.approve(campaign.id);await service.launch(campaign.id);
  const input={question:exampleQuestion,sessionId:'fixture-session',turnId:'fixture-turn'};
  const answer=await service.answer(input),ad=await service.opportunity(input);
  assert.equal(answer.answerMode,'fixture');assert.equal(answer.advertiserMaterialIncluded,false);
  assert.equal(ad.status,'awarded');assert.equal(ad.trace.execution,'fixture');
  const accepted=await service.render(ad.award.id,{creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true},ad.deliveryToken);
  assert.equal(accepted.status,'accepted');assert.equal(service.exchange.all('charges').length,1);
});
