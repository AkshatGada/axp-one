import test from 'node:test';
import assert from 'node:assert/strict';
import {financialModeOf, moneyUnit, devnetTransactionURL, isFinalizedNativeTransaction} from '../../packages/publisher-sdk/financial.mjs';
import {AXPPublisher} from '../../packages/publisher-sdk/index.mjs';

test('explicit financial mode takes precedence over legacy generic mode without inferring funding from a live engine', () => {
  assert.equal(financialModeOf({mode: 'synthetic'}, {financialMode: 'devnet'}), 'devnet');
  assert.equal(financialModeOf({financialMode: 'synthetic'}, {financialMode: 'devnet'}), 'synthetic');
  assert.equal(financialModeOf({mode: 'synthetic'}), 'synthetic');
  assert.equal(financialModeOf({engine: {execution: 'actual-api-model'}}), undefined);
  assert.equal(financialModeOf(undefined, null, {}), undefined);
});

test('denomination remains explicit for synthetic, Devnet, sandbox and unknown modes', () => {
  assert.equal(moneyUnit('synthetic'), 'test credits');
  assert.equal(moneyUnit('devnet'), 'test USDC');
  assert.equal(moneyUnit('sandbox'), 'test USDC');
  assert.equal(moneyUnit(undefined), 'units');
  assert.equal(moneyUnit('future-financial-mode'), 'units');
});

test('SDK preserves server financial metadata while the receipt authorizes no client-selected payment fields', async () => {
  const receipt = {status: 'accepted', financialMode: 'devnet', authorization: {status: 'unknown', reason: 'reconcile_required'}, receipt: {awardId: 'award-1', creativeHash: 'a'.repeat(64)}, receiptHash: 'b'.repeat(64), signature: 'receipt-signature', charge: {id: 'charge-1', amountBaseUnits: '3000'}, replayed: false};
  let body;
  const client = new AXPPublisher({apiKey: 'server-key', fetch: async (_, request) => {body = JSON.parse(request.body); return {ok: true, json: async () => receipt};}});
  const result = await client.acknowledgeRender({awardId: 'award-1', deliveryToken: 'award-token', observation: {creativeHash: 'a'.repeat(64), domInserted: true, sponsoredLabelPresent: true, financialMode: 'synthetic', recipient: 'browser-recipient', amountBaseUnits: '999999'}});
  assert.equal(result.financialMode, 'devnet');
  assert.equal(result.status, 'accepted');
  assert.equal(result.authorization.status, 'unknown');
  assert.deepEqual(body, {creativeHash: 'a'.repeat(64), domInserted: true, sponsoredLabelPresent: true});
  assert.equal('settledBaseUnits' in result.charge, false);
});

test('only finalized transaction evidence counts and explorer links always target Devnet', () => {
  const signature = '1'.repeat(64);
  const proof = {operation: 'close', status: 'finalized', finality: 'finalized', signature, explorerURL: 'javascript:alert(1)'};
  assert.equal(isFinalizedNativeTransaction(proof), true);
  for (const status of ['prepared', 'signed_persisted', 'submitted', 'failed', 'unknown', 'sign_unknown']) assert.equal(isFinalizedNativeTransaction({...proof, status}), false);
  for (const finality of [undefined, 'confirmed', 'processed']) assert.equal(isFinalizedNativeTransaction({...proof, finality}), false);
  for (const invalid of [undefined, 'javascript:alert(1)', '0'.repeat(88), '../other', 'a'.repeat(150)]) {
    assert.equal(devnetTransactionURL(invalid), undefined);
    assert.equal(isFinalizedNativeTransaction({...proof, signature: invalid}), false);
  }
  assert.equal(devnetTransactionURL(signature), `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
});

test('receipt authorization deadline is independent of the short auction deadline', async () => {
  const receipt = {status: 'accepted', receipt: {awardId: 'award-1', creativeHash: 'a'.repeat(64)}, receiptHash: 'b'.repeat(64), signature: 'receipt-signature', charge: {id: 'charge-1', amountBaseUnits: '3000'}, replayed: false};
  const client = new AXPPublisher({apiKey: 'server-key', timeoutMs: 1, receiptTimeoutMs: 1000, fetch: async () => {await new Promise(resolve => setTimeout(resolve, 15)); return {ok: true, json: async () => receipt};}});
  assert.equal((await client.acknowledgeRender({awardId: 'award-1', deliveryToken: 'token', observation: {creativeHash: 'a'.repeat(64), domInserted: true, sponsoredLabelPresent: true}})).status, 'accepted');
  for (const receiptTimeoutMs of [0, -1, 120001, NaN]) assert.throws(() => new AXPPublisher({apiKey: 'server-key', receiptTimeoutMs}), /invalid_receipt_timeout/);
});
