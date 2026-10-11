import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLab} from './exchange.mjs';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';

test('loopback fixture exchange: durable receipt replay, failed insertion, no-fill and restart',async()=>{
  const stateDir=mkdtempSync(join(tmpdir(),'sdk-cleanroom-test-'));
  const publisherKey='isolated-test-credential';
  let lab=createLab({stateDir,publisherKey});
  let base=await lab.listen();
  let sdk=new AXPPublisher({baseURL:`${base}/api/product`,apiKey:publisherKey});
  const input={question:'Recommend a developer tool to debug a TypeScript API.',sessionId:'integration',turnId:'one'};
  let result,receipt;
  try{
    result=await sdk.requestAd(input);assert.equal(result.status,'awarded');
    const ack={awardId:result.award.id,deliveryToken:result.deliveryToken,observation:{creativeHash:result.award.creativeHash,domInserted:true,sponsoredLabelPresent:true}};
    receipt=await sdk.acknowledgeRender(ack);
    assert.equal((await sdk.acknowledgeRender(ack)).charge.id,receipt.charge.id);
    assert.equal((await sdk.requestAd(input)).award.id,result.award.id);
    const failed=await sdk.requestAd({...input,turnId:'failed'});
    assert.equal(failed.status,'awarded');
    await sdk.failRender({awardId:failed.award.id,deliveryToken:failed.deliveryToken,reason:'render_failed'});
    await assert.rejects(sdk.acknowledgeRender({awardId:failed.award.id,deliveryToken:failed.deliveryToken,observation:{creativeHash:failed.award.creativeHash,domInserted:true,sponsoredLabelPresent:true}}));
    assert.equal((await sdk.requestAd({...input,turnId:'no-fill',requiredCapabilities:['hardware_wallet']})).status,'no_fill');
    assert.equal(lab.evidence().summary.deliveryCount,1);
    assert.equal(lab.evidence().summary.reservedBaseUnits,'0');
    assert.equal(lab.evidence().freshFixtureCalls,2);
    assert.equal(lab.evidence().paidProviderCalls,0);
    assert.equal((await fetch(`${base}/api/product/bootstrap`)).status,404);
  }finally{await lab.close();}
  lab=createLab({stateDir,publisherKey});base=await lab.listen();
  sdk=new AXPPublisher({baseURL:`${base}/api/product`,apiKey:publisherKey});
  try{
    assert.equal((await sdk.requestAd(input)).award.id,result.award.id);
    const duplicate=await sdk.acknowledgeRender({awardId:result.award.id,deliveryToken:result.deliveryToken,observation:{creativeHash:result.award.creativeHash,domInserted:true,sponsoredLabelPresent:true}});
    assert.equal(duplicate.charge.id,receipt.charge.id);
    assert.equal(lab.evidence().summary.deliveryCount,1);
    assert.equal(lab.evidence().freshFixtureCalls,0);
    assert.equal(lab.evidence().persistedDecisionAdmissions,2);
  }finally{await lab.close();}
});

test('fixture error is explicit, does not call decision transport or create charges',async()=>{
  const lab=createLab({stateDir:mkdtempSync(join(tmpdir(),'sdk-cleanroom-error-')),publisherKey:'isolated-test-credential',failRequests:true});
  const base=await lab.listen();
  try{
    const sdk=new AXPPublisher({apiKey:'isolated-test-credential',baseURL:`${base}/api/product`});
    const result=await sdk.requestAd({question:'Compare developer tools',sessionId:'error',turnId:'one'});
    assert.equal(result.status,'error');assert.equal(lab.evidence().summary.deliveryCount,0);
    assert.equal(lab.evidence().freshFixtureCalls,0);
  }finally{await lab.close();}
});
