import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createSponsoredCard,createRenderAcknowledger,inspectPlacement} from '@axp/publisher-sdk/browser';
import {fixtureDocument,sampleAward,sampleReceipt} from './dom.js';

test('DOM adapter: native card retains exact copy, literal disclosure and approved destination',async()=> {
  const document=fixtureDocument(),award=sampleAward(),node=createSponsoredCard({document,award}); document.body.append(node);
  assert.deepEqual(inspectPlacement(node,award),{creativeHash:award.creativeHash,domInserted:true,sponsoredLabelPresent:true});
  assert.equal(node.querySelector('[data-creative-copy]').textContent,award.creative.approvedText);
  assert.equal(node.querySelector('[data-sponsored-destination]').rel,'sponsored noopener noreferrer');
  let posts=0; const acknowledge=createRenderAcknowledger({post:async()=>{posts++;return sampleReceipt(award);}});
  const args={node,award,deliveryToken:'fixture-token'};
  const [one,two]=await Promise.all([acknowledge(args),acknowledge(args)]);
  assert.equal(one.charge.id,two.charge.id); assert.equal(posts,1);
});
for (const [name,alter] of [
  ['detached',node=>node.remove()], ['hidden card',node=>node.hidden=true],
  ['CSS-hidden card',node=>node.style.display='none'], ['transparent card',node=>node.style.opacity='0'],
  ['hidden label',node=>node.querySelector('[data-sponsored-label]').style.visibility='hidden'],
  ['wrong disclosure',node=>node.querySelector('[data-sponsored-label]').textContent='Advertisement'],
  ['rewritten copy',node=>node.querySelector('[data-creative-copy]').textContent+=' changed'],
  ['wrong destination',node=>node.querySelector('[data-sponsored-destination]').href='https://other.example/'],
  ['wrong award',node=>node.dataset.awardId='other'],
  ['hidden ancestor',node=>node.parentElement.style.display='none'],
]) test(`DOM adapter: rejects ${name} without posting`,async()=> {
  const document=fixtureDocument(),award=sampleAward(),node=createSponsoredCard({document,award});document.body.append(node);alter(node);
  let posts=0;const acknowledge=createRenderAcknowledger({post:async()=>{posts++;return sampleReceipt(award);}});
  await assert.rejects(acknowledge({node,award,deliveryToken:'fixture-token'}),/render_not_observed/);assert.equal(posts,0);
});
test('DOM adapter: malformed fulfilled HTTP200 receipt is not cached; explicit retry succeeds once',async()=> {
  const document=fixtureDocument(),award=sampleAward(),node=createSponsoredCard({document,award});document.body.append(node);
  let posts=0;const acknowledge=createRenderAcknowledger({post:async()=>++posts===1 ? {} : sampleReceipt(award)});
  const args={node,award,deliveryToken:'fixture-token'};
  await assert.rejects(acknowledge(args),/invalid_receipt_response/);assert.equal((await acknowledge(args)).charge.id,'fixture-charge');
  await acknowledge(args);assert.equal(posts,2);
});
for(const field of ['award','creative','price','mode']) test(`DOM adapter: rejects wrong receipt ${field} binding`,async()=> {
  const document=fixtureDocument(),award=sampleAward(),node=createSponsoredCard({document,award});document.body.append(node);
  const receipt=sampleReceipt(award);
  if(field==='award')receipt.receipt.awardId='other';if(field==='creative')receipt.receipt.creativeHash='c'.repeat(64);
  if(field==='price')receipt.charge.amountBaseUnits='999';
  if(field==='mode'){receipt.financialMode='devnet';receipt.receipt.mode='devnet';receipt.charge.mode='devnet';}
  const acknowledge=createRenderAcknowledger({post:async()=>receipt});
  await assert.rejects(acknowledge({node,award,deliveryToken:'fixture-token'}),/invalid_receipt_response/);
});
