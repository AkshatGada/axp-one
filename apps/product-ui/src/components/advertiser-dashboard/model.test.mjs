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
  assert.deepEqual(paymentActions(campaign), {closed:false, pending:false, uncertain:false, authorize:true, settle:true, payout:false, close:false, reconcile:true});
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

import { networkOf, networkTotals, networkLabel, paymentReadiness } from './payment.ts';

test('campaign network survives draft saves and legacy drafts stay Solana', () => {
  assert.equal(draftFields({...blankDraft(), settlementNetwork:'tempo-testnet'}).settlementNetwork, 'tempo-testnet');
  assert.equal(draftFields({...blankDraft(), settlementNetwork:undefined}).settlementNetwork, 'solana-devnet');
  assert.equal(networkOf({payment:{network:'tempo-testnet'}}), 'tempo-testnet');
  assert.equal(networkLabel('tempo-testnet'), 'Tempo Testnet');
  assert.equal(currencyUnit(true, 'tempo-testnet'), 'test PathUSD');
  const bootstrap = {payments:{ready:true, networks:{'tempo-testnet':{ready:false, reason:'disabled'}}}};
  assert.equal(paymentReadiness(bootstrap, 'tempo-testnet').ready, false);
  assert.equal(paymentReadiness({payments:{ready:true}}, 'tempo-testnet'), undefined);
  assert.equal(paymentReadiness({payments:{ready:true}}, 'solana-devnet').ready, true);
});

test('workspace money never aggregates Solana USDC with Tempo PathUSD', () => {
  const rows = [{...blankDraft(), id:'s', status:'active', spendBaseUnits:'9000', settledBaseUnits:'4000'}, {...blankDraft(), id:'t', status:'active', settlementNetwork:'tempo-testnet', spendBaseUnits:'3000', settledBaseUnits:'2000'}];
  assert.deepEqual(networkTotals(rows), [{network:'solana-devnet', campaigns:1, spendBaseUnits:'9000', settledBaseUnits:'4000'}, {network:'tempo-testnet', campaigns:1, spendBaseUnits:'3000', settledBaseUnits:'2000'}]);
  assert.match(launchNotice({...rows[1],payment:{network:'tempo-testnet',phase:'open'}},true), /Tempo Testnet/);
});

test('Tempo payout can keep a channel open; uncertainty and authorizations still gate actions', () => {
  const c = {...blankDraft(), id:'t', settlementNetwork:'tempo-testnet', status:'active', reservedBaseUnits:'0', acceptedBaseUnits:'4000', authorizedBaseUnits:'4000', payment:{phase:'open',canPayout:true,canClose:true}};
  const controls = paymentActions(c);
  assert.equal(controls.payout,true); assert.equal(controls.close,true); assert.equal(controls.closed,false);
  assert.equal(paymentActions({...c, authorizedBaseUnits:'3000'}).payout,false);
  assert.equal(paymentActions({...c, reservedBaseUnits:'1000'}).payout,false);
  assert.equal(paymentActions({...c, acceptedBaseUnits:'invalid'}).payout,false);
  assert.equal(paymentActions({...c, acceptedBaseUnits:'3000'}).payout,false);
  for (const phase of ['paying_out','closing','uncertain']) {
    assert.equal(paymentActions({...c,payment:{...c.payment,phase}}).payout,false);
    assert.equal(paymentActions({...c,payment:{...c.payment,phase}}).close,false);
  }
  assert.equal(paymentActions({...c,payment:{...c.payment,reconciliationRequired:true}}).payout,false);
});

test('Tempo Explorer links require transaction hashes and never accept a Solana signature', () => {
  const hash = '0x'+'a'.repeat(64);
  assert.equal(transactionURL(hash, 'tempo-testnet'), `https://explore.testnet.tempo.xyz/tx/${hash}`);
  assert.equal(transactionURL('5'.repeat(88), 'tempo-testnet'), null);
  assert.equal(transactionURL(hash, 'solana-devnet'), null);
  for (const hash of ['https://example.com', 'javascript:alert(1)', '0x123']) assert.equal(transactionURL(hash,'tempo-testnet'),null);
});

test('Tempo publisher payout is shown before final close only with finalized evidence', () => {
  const c = {...blankDraft(), id:'t', status:'active', settlementNetwork:'tempo-testnet', payment:{network:'tempo-testnet',phase:'open',settledBaseUnits:'3000',transactions:[{operation:'payout',status:'finalized',finality:'finalized',transactionHash:'0x'+'b'.repeat(64)}]}};
  assert.equal(nativeSettlementLabel(c,'settledBaseUnits'),'0.003 test PathUSD');
  assert.equal(nativeSettlementLabel(c,'refundBaseUnits'),'Not settled');
  assert.equal(nativeSettlementLabel({...c,payment:{...c.payment,transactions:[{...c.payment.transactions[0],status:'submitted'}]}},'settledBaseUnits'),'Not settled');
  assert.equal(nativeSettlementLabel({...c,payment:{...c.payment,transactions:[{...c.payment.transactions[0],chainId:1}]}},'settledBaseUnits'),'Not settled');
});

import {paymentOperationProblem} from './payment.ts';
test('payment API outcomes cannot produce success copy for blocked, failed or uncertain operations', () => {
  assert.match(paymentOperationProblem({status:'blocked',reason:'outstanding_deliveries'}), /blocked.*outstanding deliveries/);
  assert.match(paymentOperationProblem({status:'failed',reasonCode:'tempo_transaction_reverted'}), /failed.*tempo transaction reverted/);
  assert.match(paymentOperationProblem({status:'unknown'}), /uncertain.*Reconcile/);
  for (const operation of [undefined, {status:'finalized'}, {status:'authorized'}, {status:'reconciled'}, {status:'submitted'}]) assert.equal(paymentOperationProblem(operation), undefined);
});

import {workspaceDeliveryCount} from './model.ts';
test('workspace accepted deliveries span both rails while legacy summary and currency totals stay separate', () => {
  const solana = {...blankDraft(),id:'solana',status:'active',deliveryCount:1,spendBaseUnits:'1000',settledBaseUnits:'0'};
  const tempo = {...blankDraft(),id:'tempo',status:'active',settlementNetwork:'tempo-testnet',deliveryCount:6,spendBaseUnits:'6000',settledBaseUnits:'3000'};
  const draft = {...blankDraft(),id:'draft',status:'draft',deliveryCount:0};
  const state = {campaigns:[solana,tempo,draft],drafts:[draft],deliveries:[],summary:{deliveryCount:1,spendBaseUnits:'1000',bySettlementNetwork:{'solana-devnet':{deliveryCount:1},'tempo-testnet':{deliveryCount:6}}}};
  assert.equal(workspaceDeliveryCount(state),7);
  assert.equal(state.summary.deliveryCount,1);
  assert.deepEqual(networkTotals(campaignRows(state)).map(({network,spendBaseUnits,settledBaseUnits}) => ({network,spendBaseUnits,settledBaseUnits})), [
    {network:'solana-devnet',spendBaseUnits:'1000',settledBaseUnits:'0'},
    {network:'tempo-testnet',spendBaseUnits:'6000',settledBaseUnits:'3000'},
  ]);
  assert.equal(workspaceDeliveryCount({...state,summary:{deliveryCount:1}}),7);
  assert.equal(workspaceDeliveryCount({...state,summary:{bySettlementNetwork:{'solana-devnet':{deliveryCount:1}}}}),7);
});
