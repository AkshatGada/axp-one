import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { projectDevnet } from '../project-devnet.mjs';
import { project } from '../project-run.mjs';
import { verifyDevnet } from '../../src/lib/verify-devnet.ts';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = resolve(app, '../../artifacts/v3-devnet/settlement.json');
// The re-settlement belongs to the first recording, whatever the default build input is.
const recorded = project({ runBytes: readFileSync(resolve(app, '../../artifacts/v3/replay/run.json')), manifestBytes: readFileSync(resolve(app, '../../artifacts/v3/replay/manifest.json')) }).projection;
const run = () => structuredClone(recorded);
const raw = () => JSON.parse(readFileSync(SRC, 'utf8'));
const has = existsSync(SRC);

test('devnet evidence projects cleanly against the recorded run', { skip: !has }, () => {
  const { projection, failures } = projectDevnet(raw(), run());
  assert.deepEqual(failures, []);
  assert.equal(projection.transactions.length, 5);
  assert.equal(projection.channels.length, 2);
  assert.ok(projection.transactions.every((t) => t.explorerUrl.endsWith('?cluster=devnet')));
});

for (const [name, mutate, needle] of [
  ['a receipt hash that differs from the recorded receipt', (s) => { s.channels[0].receiptToVoucher[0].publisherReceiptHash = 'ff' + s.channels[0].receiptToVoucher[0].publisherReceiptHash.slice(2); }, 'receipt hash'],
  ['a non-devnet cluster', (s) => { s.network.cluster = 'mainnet-beta'; }, 'cluster'],
  ['a refund that breaks conservation', (s) => { s.channels[1].payerRefundBaseUnits = '16999'; }, 'payout + refund'],
  ['a missing close transaction', (s) => { s.transactions = s.transactions.filter((t) => t.role !== 'cooperative_close' || t.channelId !== 'v3-keyforge-channel'); }, '5 transactions'],
  ['an unfinalized transaction', (s) => { s.transactions[1].finality = 'confirmed'; }, 'finalized'],
])
  test(`devnet projection refuses ${name}`, { skip: !has }, () => {
    const s = raw();
    mutate(s);
    const { projection, failures } = projectDevnet(s, run());
    assert.equal(projection, null);
    assert.ok(failures.some((f) => f.includes(needle)), failures.join('\n'));
  });

test('browser devnet checks pass on the projected evidence and fail when tampered', { skip: !has }, async () => {
  const d = projectDevnet(raw(), run()).projection;
  const ok = verifyDevnet(run(), d);
  assert.equal(ok.length, 7);
  assert.ok(ok.every((c) => c.status === 'pass'), ok.filter((c) => c.status !== 'pass').map((c) => c.id).join(', '));
  d.channels[0].vouchers[1].receiptHash = '00' + d.channels[0].vouchers[1].receiptHash.slice(2);
  d.channels[1].refundBaseUnits = '1';
  const bad = verifyDevnet(run(), d);
  assert.equal(bad.filter((c) => c.status === 'fail').length, 2);
});
