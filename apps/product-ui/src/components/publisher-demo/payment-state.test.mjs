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
