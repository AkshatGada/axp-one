import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { verifyChecks, summarize, EXPECTED_CHECK_COUNT } from '../../src/lib/verify.ts';
const meta = () => JSON.parse(readFileSync(resolve(app, 'src/data/build-meta.json'), 'utf8'));

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = () => JSON.parse(readFileSync(resolve(app, 'public/run.public.json'), 'utf8'));

test('all verify checks pass on the shipped projection', async () => {
  const checks = await verifyChecks(load());
  const failed = checks.filter((c) => c.status !== 'pass');
  assert.equal(failed.length, 0, failed.map((c) => `${c.id}: ${c.actual}`).join('\n'));
  const by = (g) => checks.filter((c) => c.group === g).length;
  assert.equal(by('question'), 4);
  assert.equal(by('packet'), 15);
  assert.equal(by('creative'), 3);
  assert.equal(by('acknowledgement'), 3);
  assert.equal(by('receipt'), 3);
  assert.equal(by('signature'), 3);
  assert.equal(by('linkage'), 3);
  assert.equal(by('cumulative'), 3);
  assert.equal(by('conservation'), 2);
  assert.equal(by('bid'), 5);
  assert.equal(by('tiebreak'), 2);
});

const tamper = [
  ['one byte of a receipt field', (r) => { const f = r.opportunities[0].receipt.fields; f.nonce = f.nonce.slice(0, -1) + (f.nonce.endsWith('a') ? 'b' : 'a'); }, ['receipt-1', 'signature-1']],
  ['one byte of a signature', (r) => { const s = r.opportunities[1].receipt.signature; r.opportunities[1].receipt.signature = (s[0] === 'A' ? 'B' : 'A') + s.slice(1); }, ['signature-2']],
  ['one byte of a packet', (r) => { r.opportunities[0].decisions[1].packet.state.opportunity.taskText += ' '; }, ['packet-v3-cached:v3-clearvault-33f486d647df:history']],
  ['a voucher cumulative amount', (r) => { r.channels[0].vouchers[1].cumulativeAmountBaseUnits = '8000'; }, ['cumulative-v3-clearvault-2']],
  ['a recorded bid amount', (r) => { r.opportunities[1].auction.bids[0].amountBaseUnits = '3500'; }, ['bid-2-v3-clearvault']],
  ['a refund amount', (r) => { r.channels[1].refundBaseUnits = '17001'; }, ['conservation-v3-keyforge']],
  ['the awarded creative text', (r) => { r.opportunities[2].award.creative.approvedText += '!'; }, ['creative-3']],
  ['a question', (r) => { r.opportunities[1].question = r.opportunities[1].question.replace('Ethereum', 'Ethereun'); }, ['question-2']],
];
for (const [name, mutate, mustFail] of tamper)
  test(`tampered fixture fails loudly: ${name}`, async () => {
    const r = load();
    mutate(r);
    const checks = await verifyChecks(r);
    for (const id of mustFail) assert.equal(checks.find((c) => c.id === id)?.status, 'fail', id);
  });

for (const [name, mutate] of [
  ['an empty publisher key', (r) => { r.publisher.publicKeyPEM = ''; }],
  ['a truncated publisher key', (r) => { r.publisher.publicKeyPEM = r.publisher.publicKeyPEM.slice(0, 40); }],
])
  test(`unreadable key is a FAIL, never "unsupported": ${name}`, async () => {
    const r = load();
    mutate(r);
    const checks = await verifyChecks(r);
    const sig = checks.filter((c) => c.group === 'signature');
    assert.equal(sig.length, 3);
    for (const c of sig) assert.equal(c.status, 'fail', c.id);
    assert.equal(checks.filter((c) => c.status === 'skip').length, 0);
  });

test('the shipped projection summarizes as exactly 48 passing', async () => {
  const ids = meta().verify.ids;
  assert.equal(ids.length, EXPECTED_CHECK_COUNT);
  const s = summarize(await verifyChecks(load()), ids);
  assert.equal(s.passing, true);
  assert.equal(s.pass, 48);
});

for (const [name, mutate] of [
  ['a deleted receipt', (r) => { delete r.opportunities[0].receipt; }],
  ['a cleared tie flag', (r) => { r.opportunities[0].auction.tieBreakApplied = false; }],
  ['a dropped opportunity', (r) => { r.opportunities.pop(); }],
])
  test(`structural deletion never reads as passing: ${name}`, async () => {
    const r = load();
    mutate(r);
    const checks = await verifyChecks(r);
    const s = summarize(checks, meta().verify.ids);
    assert.equal(s.passing, false);
    assert.ok(s.missing + s.fail > 0);
  });
