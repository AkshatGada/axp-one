import test from 'node:test';
import assert from 'node:assert/strict';
import {boundPaymentIdentity, paymentState} from './payment-state.mjs';
const identity = {campaignId: 'winning-campaign', channelId: 'saved-channel'};
const campaign = {id: identity.campaignId, status: 'active', reservedBaseUnits: '0', acceptedBaseUnits: '3000', authorizedBaseUnits: '3000', payment: {mode: 'devnet', network: 'solana-devnet', channelId: identity.channelId, phase: 'open', openStatus: 'finalized', canSettle: true}};
test('settlement is restricted to the awarded campaign and original native channel', () => {
  assert.equal(paymentState(campaign, identity).settle, true);
  assert.equal(paymentState(campaign, {...identity, campaignId: 'other'}).settle, false);
  assert.equal(paymentState({...campaign, payment: {...campaign.payment, channelId: 'replacement'}}, identity).settle, false);
  assert.equal(paymentState(campaign).settle, false);
  assert.equal(paymentState({...campaign, payment: {...campaign.payment, mode: 'synthetic'}}, identity).settle, false);
});
test('uncertainty, reservations, missing authorization and pending close disable settlement', () => {
  const uncertain = paymentState(campaign, {...identity, uncertain: true});
  assert.equal(uncertain.settle, false); assert.equal(uncertain.reconcile, true); assert.equal(uncertain.authorize, false);
  assert.equal(paymentState({...campaign, reservedBaseUnits: '1000'}, identity).settle, false);
  const gap = paymentState({...campaign, authorizedBaseUnits: '0'}, identity);
  assert.equal(gap.settle, false); assert.equal(gap.authorize, true);
  assert.equal(paymentState({...campaign, payment: {...campaign.payment, closeStatus: 'submitted'}}, identity).settle, false);
  assert.equal(paymentState({...campaign, payment: {...campaign.payment, canSettle: false}}, identity).settle, false);
  assert.equal(paymentState({...campaign, payment: {...campaign.payment, openStatus: 'submitted'}}, identity).settle, false);
});
test('a finalized label requires actual finalized close signature evidence', () => {
  const closed = {...campaign, status: 'settled', payment: {...campaign.payment, closeStatus: 'finalized', phase: 'finalized'}};
  assert.equal(paymentState(closed, identity).finalized, false); assert.equal(paymentState(closed, identity).settle, false);
  const proof = {...closed, payment: {...closed.payment, transactions: [{operation: 'close', status: 'finalized', finality: 'finalized', signature: '1'.repeat(88)}]}};
  assert.equal(paymentState(proof, identity).finalized, true);
  assert.equal(paymentState(proof, {...identity, uncertain: true}).reconcile, false);
});
test('bound identity remains that of the turn receipt, not a later workspace projection', () => {
  const turn = {ad: {status: 'awarded', award: {campaignId: identity.campaignId}}, receipt: {payment: {channelId: identity.channelId}}, budgetAfterDelivery: {campaigns: [{id: identity.campaignId, payment: {channelId: 'replacement'}}]}};
  assert.deepEqual(boundPaymentIdentity(turn), identity);
  assert.deepEqual(boundPaymentIdentity({ad: {status: 'no_fill'}}), {});
});

const tempoIdentity = {...identity, settlementNetwork:'tempo-testnet'};
const tempoCampaign = {...campaign, settlementNetwork:'tempo-testnet', settledBaseUnits:'1000', payment:{...campaign.payment,network:'tempo-testnet',canPayout:true,canClose:true}};
test('Tempo payment actions bind the turn rail and payout without closing', () => {
  const state = paymentState(tempoCampaign,tempoIdentity);
  assert.equal(state.bound,true); assert.equal(state.payout,true); assert.equal(state.close,true); assert.equal(state.closed,false);
  assert.equal(paymentState(tempoCampaign, identity).bound,false);
  assert.equal(paymentState(campaign,tempoIdentity).bound,false);
  assert.equal(paymentState({...tempoCampaign,settledBaseUnits:'3000'},tempoIdentity).payout,false);
  assert.equal(paymentState({...tempoCampaign,reservedBaseUnits:'1'},tempoIdentity).payout,false);
  assert.equal(paymentState({...tempoCampaign,authorizedBaseUnits:'2999'},tempoIdentity).payout,false);
  assert.equal(paymentState(tempoCampaign,{...tempoIdentity,uncertain:true}).payout,false);
  assert.equal(paymentState({...tempoCampaign,payment:{...tempoCampaign.payment,phase:'paying_out'}},tempoIdentity).close,false);
});
test('Tempo close proof requires its finalized hash and never a Solana signature', () => {
  const closed = {...tempoCampaign,status:'settled',payment:{...tempoCampaign.payment,phase:'finalized',closeStatus:'finalized'}};
  assert.equal(paymentState(closed,tempoIdentity).finalized,false);
  const tx = {operation:'close',status:'finalized',finality:'finalized',transactionHash:'0x'+'a'.repeat(64)};
  assert.equal(paymentState({...closed,payment:{...closed.payment,transactions:[tx]}},tempoIdentity).finalized,true);
  assert.equal(paymentState({...closed,payment:{...closed.payment,transactions:[{...tx,transactionHash:undefined,signature:'1'.repeat(88)}]}},tempoIdentity).finalized,false);
  assert.equal(paymentState({...closed,payment:{...closed.payment,transactions:[{...tx,chainId:1}]}},tempoIdentity).finalized,false);
});
test('turn rail remains bound after the publisher changes chat settings', () => {
  const turn = {input:{settlementNetwork:'tempo-testnet'},ad:{status:'awarded',award:{campaignId:identity.campaignId}},receipt:{payment:{channelId:identity.channelId}}};
  assert.deepEqual(boundPaymentIdentity(turn),tempoIdentity);
});

test('a safely retryable failed Tempo close obeys the backend capability and all identity guards', () => {
  const failed = {...tempoCampaign,status:'settling',payment:{...tempoCampaign.payment,phase:'draining',closeStatus:'failed',canClose:true}};
  assert.equal(paymentState(failed,tempoIdentity).close,true);
  assert.equal(paymentState(failed,tempoIdentity).payout,false);
  assert.equal(paymentState({...failed,payment:{...failed.payment,canClose:false}},tempoIdentity).close,false);
  assert.equal(paymentState({...failed,payment:{...failed.payment,reconciliationRequired:true}},tempoIdentity).close,false);
  assert.equal(paymentState({...failed,reservedBaseUnits:'1000'},tempoIdentity).close,false);
  assert.equal(paymentState({...failed,authorizedBaseUnits:'2000'},tempoIdentity).close,false);
  assert.equal(paymentState(failed,identity).close,false);
  assert.equal(paymentState({...campaign,payment:{...campaign.payment,closeStatus:'failed'}},identity).settle,false);
});

import {syntheticSettlementFinalized} from './payment-state.mjs';
test('synthetic payment display only reports settlement after the ledger campaign is closed', () => {
  for (const status of ['active','paused','settling']) assert.equal(syntheticSettlementFinalized({status,settledBaseUnits:'0'}),false);
  assert.equal(syntheticSettlementFinalized(undefined),false);
  assert.equal(syntheticSettlementFinalized({status:'settled',settledBaseUnits:'3000'}),true);
});
