// Parity: src/lib/policy.ts against the canonical packages/contracts computeBid and packages/exchange Exchange.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import * as contracts from '../../../../packages/contracts/index.mjs';
import { Exchange } from '../../../../packages/exchange/index.mjs';
import { computeBid, reason, runAuction, rankBids, validateDraft, CAPABILITIES } from '../../src/lib/policy.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const run = JSON.parse(readFileSync(resolve(repo, 'artifacts/v3/replay/run.json'), 'utf8'));
const pub = JSON.parse(readFileSync(resolve(repo, 'apps/product-ui/src/data/run.public.json'), 'utf8'));

test('computeBid parity: 16 level pairs x budgets x floors x max bids', () => {
  let n = 0;
  const maxBids = ['4000', '1000', '1333', '0'];
  const budgets = [['8000', '20000'], ['1000', '20000'], ['8000', '500'], ['0', '20000']];
  const floors = ['1000', '0', '3001'];
  for (let r = 0; r <= 3; r++)
    for (let i = 0; i <= 3; i++)
      for (const decision of ['bid', 'skip', 'abstain'])
        for (const maxBidBaseUnits of maxBids)
          for (const [a, b] of budgets)
            for (const floor of floors) {
              const d = { decision, relevanceLevel: r, commercialIntentLevel: i };
              const want = contracts.computeBid(d, { maxBidBaseUnits }, a, b, floor);
              const got = computeBid(d, { maxBidBaseUnits }, a, b, floor);
              const { bps, ...rest } = got;
              assert.deepEqual(rest, want, JSON.stringify({ d, maxBidBaseUnits, a, b, floor }));
              n++;
            }
  assert.equal(n, 16 * 3 * 4 * 4 * 3);
});

test('reason + auction parity with packages/exchange over the recorded run (run order)', () => {
  let t = 1_790_000_000_000;
  const ex = new Exchange({ runId: 'parity', mode: 'synthetic', now: () => t });
  const p = run.publishers[0];
  ex.registerPublisher({ publisherId: p.publisherId, publisherKeyId: p.publisherKeyId, payee: p.payee, publicKeyPEM: p.publicKeyPEM });
  for (const c of run.state.exchange.campaigns) {
    const funded = c.campaignId !== 'v3-leatherguard';
    ex.createChannel({ channelId: c.channelId, advertiserId: c.advertiserId, publisherId: p.publisherId, payee: p.payee, depositBaseUnits: funded ? '20000' : '0', mode: 'synthetic' });
    ex.createCampaign(c);
  }
  const turns = run.state.turns.slice().sort((a, b) => run.state.exchange.opportunities.find((o) => o.id === a.opportunityId).createdAt - run.state.exchange.opportunities.find((o) => o.id === b.opportunityId).createdAt);
  assert.deepEqual(turns.map((x) => x.turnId), ['v3-mobile', 'v3-cached', 'v3-offline', 'v3-repeat'], 'run order: mobile first');
  const portAwards = [];
  for (const turn of turns) {
    const rec = run.state.exchange.opportunities.find((o) => o.id === turn.opportunityId);
    const input = { publisherId: rec.publisherId, slotId: rec.slotId, randomSessionId: rec.randomSessionId, turnId: rec.turnId, coarseIntent: rec.coarseIntent, destination: rec.destination, taskConstraints: rec.taskConstraints, softPreferences: rec.softPreferences, floorBaseUnits: rec.floorBaseUnits, expiresAt: t + 60_000 };
    const o = ex.createOpportunity(input, { idempotencyKey: turn.turnId });
    const decisions = turn.records.filter((x) => x.arm === 'history').map((x) => x.decision);
    const exOut = ex.runAuction(o.id, decisions);
    // port
    const entries = run.state.exchange.campaigns.map((c) => {
      const prior = portAwards.filter((a) => a.campaignId === c.campaignId);
      const spent = prior.reduce((n, a) => n + BigInt(a.price), 0n);
      const funded = c.campaignId !== 'v3-leatherguard';
      const ctx = { channel: { publisherId: p.publisherId, status: 'open' }, sessionAwards: prior.length, available: { campaign: (BigInt(c.budgetCapBaseUnits) - spent).toString(), channel: ((funded ? 20000n : 0n) - spent).toString() } };
      const d = decisions.find((x) => x.campaignVersionId === c.campaignVersionId) ?? null;
      return { campaign: c, decision: d, ctx };
    });
    const portOut = runAuction(rec, entries);
    // exchange vs port
    assert.equal(portOut.winnerCampaignId, exOut.award?.campaignId ?? null, `${turn.turnId} winner`);
    assert.deepEqual(portOut.bids.map((b) => [b.campaignId, b.amountBaseUnits]), exOut.bids.map((b) => [b.campaignId, b.amountBaseUnits]), `${turn.turnId} bids`);
    assert.deepEqual(new Set(portOut.rejections.map((r) => `${r.campaignId}:${r.reason}`)), new Set(exOut.rejections.map((r) => `${r.campaignId}:${r.reason}`)), `${turn.turnId} rejections`);
    // both vs recorded
    assert.equal(exOut.status, rec.outcome.status);
    assert.equal(exOut.award?.priceBaseUnits ?? null, rec.outcome.award?.priceBaseUnits ?? null);
    assert.equal(exOut.award?.campaignId ?? null, rec.outcome.award?.campaignId ?? null);
    assert.deepEqual(new Set(exOut.rejections.map((r) => `${r.campaignId}:${r.reason}`)), new Set(rec.outcome.rejections.map((r) => `${r.campaignId}:${r.reason}`)));
    if (exOut.award) portAwards.push({ campaignId: exOut.award.campaignId, price: exOut.award.priceBaseUnits });
    t += 1000;
  }
});

test('every recorded exclusion equals the ported reason()', () => {
  for (const o of pub.opportunities) {
    for (const x of o.eligibility.excluded) {
      const c = pub.campaigns.find((y) => y.campaignId === x.campaignId);
      const prior = pub.opportunities.filter((p) => p.award && p.award.campaignId === c.campaignId && p.award.createdAt < o.createdAt).length;
      const r = reason(c, { ...o, taskConstraints: o.mandatoryCapabilities }, { channel: { publisherId: o.publisherId, status: 'open' }, sessionAwards: prior, available: { campaign: '8000', channel: '20000' }, ignoreFunding: true });
      assert.equal(r, x.reason, `${o.turnId}/${x.campaignId}`);
    }
  }
});

test('rankBids: amount desc, campaign id asc on ties', () => {
  const { ranked, tieBreakApplied } = rankBids([{ campaignId: 'v3-keyforge', amountBaseUnits: '4000' }, { campaignId: 'v3-clearvault', amountBaseUnits: '4000' }, { campaignId: 'a', amountBaseUnits: '3000' }]);
  assert.deepEqual(ranked.map((b) => b.campaignId), ['v3-clearvault', 'v3-keyforge', 'a']);
  assert.equal(tieBreakApplied, true);
});

test('validateDraft mirrors saveCampaign limits', () => {
  const ok = { businessName: 'X', creative: 'a'.repeat(800), contextHints: 'b'.repeat(366), maxBidBaseUnits: '4000', budgetCapBaseUnits: '8000', declaredConstraints: ['crypto_storage'] };
  assert.deepEqual(validateDraft(ok), []);
  assert.ok(validateDraft({ ...ok, contextHints: 'b'.repeat(367) }).some((e) => e.code === 'packet_too_large'));
  assert.ok(validateDraft({ ...ok, creative: 'a'.repeat(801) }).some((e) => e.field === 'creative'));
  assert.ok(validateDraft({ ...ok, contextHints: 'mail me@x.io' }).some((e) => e.field === 'contextHints'));
  assert.ok(validateDraft({ ...ok, maxBidBaseUnits: '4001' }).some((e) => e.code === 'spend_cap'));
  assert.ok(validateDraft({ ...ok, budgetCapBaseUnits: '8001' }).some((e) => e.code === 'spend_cap'));
  assert.ok(validateDraft({ ...ok, declaredConstraints: ['crypto_storage', 'crypto_storage'] }).some((e) => e.code === 'capability_invalid'));
  assert.equal(CAPABILITIES.length, 8);
});
