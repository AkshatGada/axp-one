import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { verifyChecks, summarize, expectedCheckCount } from '../../src/lib/verify.ts';
const meta = () => JSON.parse(readFileSync(resolve(app, 'src/data/build-meta.json'), 'utf8'));

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = () => JSON.parse(readFileSync(resolve(app, 'public/run.public.json'), 'utf8'));

test('all verify checks pass on the shipped projection', async () => {
  const checks = await verifyChecks(load());
  const failed = checks.filter((c) => c.status !== 'pass');
  assert.equal(failed.length, 0, failed.map((c) => `${c.id}: ${c.actual}`).join('\n'));
  const r = load();
  const by = (g) => checks.filter((c) => c.group === g).length;
  const paid = r.opportunities.filter((o) => o.receipt).length;
  assert.equal(by('question'), r.opportunities.length);
  assert.equal(by('packet'), r.opportunities.reduce((n, o) => n + o.decisions.length, 0));
  for (const g of ['creative', 'acknowledgement', 'receipt', 'signature', 'linkage']) assert.equal(by(g), paid, g);
  assert.equal(by('cumulative'), r.channels.reduce((n, c) => n + c.vouchers.length, 0));
  assert.equal(by('conservation'), r.channels.length);
  assert.equal(by('bid'), r.opportunities.reduce((n, o) => n + o.auction.bids.length, 0));
  assert.equal(by('tiebreak'), r.opportunities.filter((o) => o.auction.tieBreakApplied).length);
});

// Mutations target whatever the shipped run contains (any run), and name the checks that must fail.
const paidOf = (r) => r.opportunities.filter((o) => o.receipt);
const tamper = [
  ['one byte of a receipt field', (r) => { const o = paidOf(r)[0]; const f = o.receipt.fields; f.nonce = f.nonce.slice(0, -1) + (f.nonce.endsWith('a') ? 'b' : 'a'); return [`receipt-${o.n}`, `signature-${o.n}`]; }],
  ['one byte of a signature', (r) => { const o = paidOf(r).at(-1); const s = o.receipt.signature; o.receipt.signature = (s[0] === 'A' ? 'B' : 'A') + s.slice(1); return [`signature-${o.n}`]; }],
  ['one byte of a packet', (r) => { const d = r.opportunities.flatMap((o) => o.decisions)[1]; d.packet.state.opportunity.taskText += ' '; return [`packet-${d.slotId}`]; }],
  ['a voucher cumulative amount', (r) => { const ch = r.channels.find((c) => c.vouchers.length > 1) ?? r.channels[0]; const v = ch.vouchers.at(-1); v.cumulativeAmountBaseUnits = String(BigInt(v.cumulativeAmountBaseUnits) + 1000n); return [`cumulative-${ch.campaignId}-${v.sequence}`]; }],
  ['a recorded bid amount', (r) => { const o = r.opportunities.find((x) => x.auction.bids.length); const b = o.auction.bids[0]; b.amountBaseUnits = String(BigInt(b.amountBaseUnits) + 500n); return [`bid-${o.n}-${b.campaignId}`]; }],
  ['a refund amount', (r) => { const ch = r.channels.at(-1); ch.refundBaseUnits = String(BigInt(ch.refundBaseUnits) + 1n); return [`conservation-${ch.campaignId}`]; }],
  ['the awarded creative text', (r) => { const o = paidOf(r).at(-1); o.award.creative.approvedText += '!'; return [`creative-${o.n}`]; }],
  ['a question', (r) => { const o = r.opportunities[1]; o.question = o.question + '?'; return [`question-${o.n}`]; }],
];
for (const [name, mutate] of tamper)
  test(`tampered fixture fails loudly: ${name}`, async () => {
    const r = load();
    const mustFail = mutate(r);
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

test('the shipped projection summarizes as all expected checks passing', async () => {
  const ids = meta().verify.ids;
  assert.equal(ids.length, expectedCheckCount(load()));
  const s = summarize(await verifyChecks(load()), ids);
  assert.equal(s.passing, true);
  assert.equal(s.pass, ids.length);
});

for (const [name, mutate] of [
  ['a deleted receipt', (r) => { delete r.opportunities.find((o) => o.receipt).receipt; }],
  ['a cleared tie flag', (r) => { (r.opportunities.find((o) => o.auction.tieBreakApplied) ?? r.opportunities[0]).auction.tieBreakApplied = false; }],
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
