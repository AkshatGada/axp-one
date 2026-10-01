import test from 'node:test';
import assert from 'node:assert/strict';
import {assertUnsignedPlanFresh} from '../../packages/payments/sdk-transport.mjs';
test('native unsigned transaction freshness requires a valid blockhash and remaining block-height margin',()=>{assert.equal(assertUnsignedPlanFresh({currentBlockHeight:100,lastValidBlockHeight:'200',blockhashValid:true}),true);for(const data of [{currentBlockHeight:180,lastValidBlockHeight:200,blockhashValid:true},{currentBlockHeight:201,lastValidBlockHeight:200,blockhashValid:true},{currentBlockHeight:100,lastValidBlockHeight:200,blockhashValid:false},{currentBlockHeight:NaN,lastValidBlockHeight:200,blockhashValid:true}])assert.throws(()=>assertUnsignedPlanFresh(data),{code:'unsigned_plan_expired'});});
