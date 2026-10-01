import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignFixtures,opportunityFixture} from '../../packages/contracts/fixtures.mjs';
import {validateDecision} from '../../packages/contracts/index.mjs';
import {ruleBuyer,sanitizedOpportunity} from '../../packages/dsp/rules.mjs';
test('sanitization excludes emails and does not infer residence',()=>{const o=sanitizedOpportunity('Find Singapore hotel for me at person@example.com with free cancellation');assert.ok(!JSON.stringify(o).includes('person@'));assert.equal(o.destination,'Singapore');assert.equal(o.userLocation,undefined);});
test('rule buyer baseline and eligible soft-fit skip are explicit',()=>{const c=campaignFixtures()[0],o={...opportunityFixture(),id:'o'};const d=ruleBuyer(c,o);validateDecision(d,c,o);assert.equal(d.decision,'bid');assert.equal(d.relevanceLevel,3);const group={...c,creatives:[{...c.creatives[0],approvedText:'Conference group hotel blocks for teams',softFitTags:['group']}]};const skip=ruleBuyer(group,o);assert.equal(skip.decision,'skip');assert.equal(skip.engineProvenance.model,null);});
