import test from 'node:test';
import assert from 'node:assert/strict';
import { toBaseUnits, decimal, draftFields, blankDraft, amount, campaignRows } from './model.ts';

test('six-decimal credits convert exactly without rounding or accepting scientific notation', () => {
  for (const [value, base] of [['0.000001', '1'], ['0.004', '4000'], ['1.123456', '1123456'], ['0002.50', '2500000'], ['9007199254740993.000001', '9007199254740993000001']]) {
    assert.equal(toBaseUnits(value), base);
    assert.equal(toBaseUnits(decimal(base)), base);
  }
  for (const value of ['1.0000001', '1e3', '-1', 'Infinity', '', '1,000', 'NaN']) assert.equal(toBaseUnits(value), null);
});

test('resumed drafts submit only draft fields and cannot smuggle server-owned state', () => {
  const submitted = draftFields({ ...blankDraft(), id: 'campaign-example', status: 'draft', approved: true, spendBaseUnits: '4000', createdAt: '2026-10-07' });
  assert.equal(submitted.id, 'campaign-example');
  for (const key of ['status', 'approved', 'spendBaseUnits', 'createdAt']) assert.equal(key in submitted, false);
});

test('available cap excludes reservations; authorization and settlement do not add spend', () => {
  const campaign = { ...blankDraft(), id: 'c', status: 'active', budgetCapBaseUnits: '8000', acceptedBaseUnits: '3000', reservedBaseUnits: '2000', authorizedBaseUnits: '3000', settledBaseUnits: '3000' };
  assert.equal(amount(campaign, 'spend'), '3000');
  assert.equal(amount(campaign, 'remaining'), '3000');
  assert.equal(amount({ ...campaign, reservedBaseUnits: '9000' }, 'remaining'), '0');
});

test('campaign state includes drafts once even when backend also provides a drafts collection', () => {
  const campaign = { ...blankDraft(), id: 'c', status: 'draft' };
  assert.equal(campaignRows({ campaigns: [campaign], drafts: [campaign] }).length, 1);
});

import { DEMO_ADVERTISER, missingDemoValues, isDemoAutofillKey } from './demo.ts';

test('demo Tab only intercepts an empty named text field in an opted-in editable step', () => {
  const base = { enabled: true, key: 'Tab', shiftKey: false, step: 0, name: 'name', value: '', type: 'text' };
  assert.equal(isDemoAutofillKey(base), true);
  for (const change of [{ enabled: false }, { shiftKey: true }, { value: 'My campaign' }, { key: 'Enter' }, { type: 'button' }, { type: 'checkbox' }, { name: 'capabilitySearch' }, { step: 4 }]) assert.equal(isDemoAutofillKey({ ...base, ...change }), false);
  assert.equal(isDemoAutofillKey({ ...base, step: 2, name: 'approvedText', type: 'textarea' }), true);
  assert.equal(isDemoAutofillKey({ ...base, step: 3, name: 'maxBidBaseUnits' }), true);
});

test('whole-step suggestions fill only missing fields and never silently declare capabilities or approve launch', () => {
  const offer = missingDemoValues(0, { name: 'My own name', brandName: '', websiteURL: 'https://my.example/', productDescription: '' });
  assert.deepEqual(Object.keys(offer).sort(), ['brandName', 'productDescription']);
  assert.equal(offer.brandName, 'HarborKey');
  const context = missingDemoValues(1, { contextHints: '' });
  assert.deepEqual(Object.keys(context), ['contextHints']);
  assert.equal('declaredCapabilities' in context, false);
  assert.deepEqual(missingDemoValues(4, {}), {});
  assert.deepEqual(missingDemoValues(3, { maxBidBaseUnits: '0.01', budgetCapBaseUnits: '', depositBaseUnits: '' }), { budgetCapBaseUnits: '0.016', depositBaseUnits: '0.02' });
  assert.equal(DEMO_ADVERTISER.approvedText.includes(DEMO_ADVERTISER.contextHints[0]), false);
});

test('backend-provided advertiser suggestions supply exact money and offer values without changing keyboard boundaries', () => {
  const suggestion = { ...DEMO_ADVERTISER, brandName: 'Backend fixture brand', maxBidBaseUnits: '1234' };
  assert.equal(missingDemoValues(0, {}, suggestion).brandName, 'Backend fixture brand');
  assert.equal(missingDemoValues(3, {}, suggestion).maxBidBaseUnits, '0.001234');
});

import { nativePayments, currencyUnit, launchNotice, paymentActions, paymentPhase, transactionURL } from './payment.ts';

test('native financial labels require explicit financial metadata independently of model execution', () => {
  assert.equal(nativePayments({mode: 'synthetic', engine: {execution: 'actual-api-model'}}), false);
  assert.equal(nativePayments({financialMode: 'devnet'}), true);
  assert.equal(nativePayments({financialMode: 'devnet'}, {financialMode: 'synthetic'}), false);
  assert.equal(currencyUnit(true), 'Test USDC');
  assert.equal(currencyUnit(false), 'test credits');
});

test('opening or uncertain launch never claims a funded active campaign', () => {
  const campaign = {...blankDraft(), id:'c', status:'opening', payment:{phase:'pending_open'}};
  assert.match(launchNotice(campaign, true), /Opening channel/);
  assert.doesNotMatch(launchNotice(campaign, true), /ready to compete/);
  assert.match(launchNotice({...campaign, status:'active', payment:{phase:'open'}}, true), /ready to compete/);
  assert.equal(paymentPhase({...campaign, payment:{phase:'open', reconciliationRequired:true}}), 'uncertain');
});

test('native recovery actions use accepted ledger gaps and block advancement until uncertainty resolves', () => {
  const campaign = {...blankDraft(), id:'c', status:'active', acceptedBaseUnits:'3000', authorizedBaseUnits:'2000', payment:{phase:'open', canSettle:true, canReconcile:true}};
  assert.deepEqual(paymentActions(campaign), {closed:false, pending:false, uncertain:false, authorize:true, settle:true, reconcile:true});
  for (const phase of ['pending_open','closing','finalized','unknown']) {
    const actions = paymentActions({...campaign, payment:{...campaign.payment, phase}});
    assert.equal(actions.authorize, false);
    assert.equal(actions.settle, false);
  }
  const unknown = paymentActions({...campaign, payment:{...campaign.payment, reconciliationRequired:true}});
  assert.equal(unknown.reconcile, true);
  assert.equal(unknown.authorize, false);
  assert.equal(unknown.settle, false);
  assert.equal(paymentActions({...campaign, authorizedBaseUnits:'3000'}).authorize, false);
  assert.equal(paymentActions({...campaign, acceptedBaseUnits:'invalid'}).authorize, false);
  assert.equal(paymentActions({...campaign, payment:{phase:'open'}}).settle, false);
});

test('Devnet transaction links remain pinned to the correct network and reject untrusted URLs', () => {
  const signature = '5'.repeat(88);
  assert.equal(transactionURL(signature), `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  for (const value of ['javascript:alert(1)', 'https://malicious.example', '0'.repeat(88), undefined]) assert.equal(transactionURL(value), null);
});

import { canRetryOpening } from './payment.ts';

test('explicit opening retries require a saved unsigned campaign and never replace an uncertain identity', () => {
  const campaign = {...blankDraft(), id:'saved-campaign', status:'opening'};
  assert.equal(canRetryOpening(campaign), true); // pre-freeze blocker, no native store yet
  const prepared = {...campaign, payment:{phase:'pending_open', openStatus:'prepared', canRetryOpen:true}};
  assert.equal(canRetryOpening(prepared), true);
  assert.equal(canRetryOpening({...prepared, payment:{...prepared.payment, canRetryOpen:false}}), false);
  assert.equal(canRetryOpening({...prepared, payment:{...prepared.payment, reconciliationRequired:true}}), false);
  assert.equal(canRetryOpening({...prepared, payment:{...prepared.payment, transactions:[{operation:'open',status:'prepared',signature:'saved-signature'}]}}), false);
  for (const status of ['draft','active','paused','settled']) assert.equal(canRetryOpening({...prepared, status}), false);
  for (const openStatus of ['signing','sign_unknown','signed_persisted','submitting','submitted','unknown','finalized','failed']) assert.equal(canRetryOpening({...prepared, payment:{...prepared.payment, openStatus}}), false);
  assert.equal(canRetryOpening({...prepared, payment:{...prepared.payment, phase:'uncertain'}}), false);
});

import { financialModeLabel, nativeSettlementLabel } from './payment.ts';

test('unresolved bootstrap never presents the workspace as synthetic', () => {
  assert.equal(financialModeLabel(null), 'Connecting payments…');
  assert.equal(financialModeLabel(undefined, {financialMode:'devnet'}), 'Connecting payments…');
  assert.equal(financialModeLabel({financialMode:'devnet'}), 'Solana Devnet · Test USDC');
  assert.equal(financialModeLabel({financialMode:'synthetic'}), 'Synthetic test credits');
});

test('native payout and refund remain unsettled until close finality is confirmed', () => {
  const campaign = {...blankDraft(), id:'c', status:'active', settledBaseUnits:'0', refundBaseUnits:'0', payment:{phase:'open'}};
  assert.equal(nativeSettlementLabel(campaign, 'settledBaseUnits'), 'Not settled');
  assert.equal(nativeSettlementLabel(campaign, 'refundBaseUnits'), 'Not settled');
  for (const closeStatus of ['prepared','submitted','unknown']) assert.equal(nativeSettlementLabel({...campaign, status:'settling', payment:{phase:'closing',closeStatus}}, 'refundBaseUnits'), 'Awaiting finality');
  const finalized = {...campaign, status:'settled', payment:{phase:'finalized',closeStatus:'finalized',settledBaseUnits:'3000',refundBaseUnits:'17000'}};
  assert.equal(nativeSettlementLabel(finalized, 'settledBaseUnits'), '0.003 Test USDC');
  assert.equal(nativeSettlementLabel(finalized, 'refundBaseUnits'), '0.017 Test USDC');
  assert.equal(nativeSettlementLabel({...finalized,payment:{...finalized.payment,settledBaseUnits:'0'}}, 'settledBaseUnits'), '0 Test USDC');
});
