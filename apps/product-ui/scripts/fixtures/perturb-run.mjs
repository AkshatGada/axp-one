#!/usr/bin/env node
// Test fixture generator: writes a PERTURBED copy of a run bundle so the explorer can be built against a run whose
// story differs from the recorded one. It proves the copy is data-driven. It is never a run and is never committed:
//   node scripts/fixtures/perturb-run.mjs [--from artifacts/v3/replay] [--out .fixtures/perturbed]
//   AXP_RUN_DIR=apps/product-ui/.fixtures/perturbed pnpm --dir apps/product-ui project
// Three edits, each kept internally consistent (bids recomputed from the bid table, manifest hash refreshed):
//   1. The first tied auction becomes different bids: the runner-up's levels drop one intent level, so it bids less.
//   2. The frequency-cap exclusion disappears: that agent says skip instead, and becomes eligible but not a bidder.
//   3. A level changes: the runner-up's history level now equals its baseline, so "level changed" turns "unchanged".
// Receipts, signatures, charges, vouchers and chain evidence are untouched, so every hash and signature still verifies.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeBid } from '../../src/lib/policy.ts';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repo = resolve(app, '../..');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const from = resolve(repo, arg('--from', 'artifacts/v3/replay'));
const out = resolve(app, arg('--out', '.fixtures/perturbed'));

export function perturb(run) {
  const s = run.state;
  const ex = s.exchange;
  const notes = [];
  const turns = s.turns.slice().sort((a, b) => a.scenario.questionIndex - b.scenario.questionIndex);
  const oppOf = (t) => ex.opportunities.find((o) => o.id === t.opportunityId);
  const histRec = (t, campaignId) => t.records.find((x) => x.campaignId === campaignId && x.arm === 'history');
  const setLevels = (rec, rel, int, decision) => {
    rec.decision.relevanceLevel = rel;
    rec.decision.commercialIntentLevel = int;
    if (decision) rec.decision.decision = decision;
    rec.rawOutput.answers.relevance.score = rel === 3 ? 2.8 : rel + 0.2;
    rec.rawOutput.answers.intent.score = int === 3 ? 2.7 : int + 0.21;
    const ev = run.events.find((e) => e.type === 'buyer_decision' && e.data.decision.opportunityId === rec.decision.opportunityId && e.data.decision.advertiserId === rec.decision.advertiserId);
    if (ev) {
      ev.data.decision.relevanceLevel = rel;
      ev.data.decision.commercialIntentLevel = int;
      if (decision) ev.data.decision.decision = decision;
    }
  };

  // 1 + 3. First tie -> different bids; the runner-up's level drops to its baseline (or one intent level).
  for (const t of turns) {
    const o = oppOf(t);
    const bids = o.outcome.bids;
    if (bids.length < 2 || bids[0].amountBaseUnits !== bids[1].amountBaseUnits) continue;
    const winner = o.outcome.award.campaignId;
    const loser = bids.find((b) => b.campaignId !== winner);
    const rec = histRec(t, loser.campaignId);
    const base = t.records.find((x) => x.campaignId === loser.campaignId && x.arm === 'text_only');
    const rel = rec.decision.relevanceLevel;
    const int = base && base.decision.commercialIntentLevel < rec.decision.commercialIntentLevel ? base.decision.commercialIntentLevel : rec.decision.commercialIntentLevel - 1;
    setLevels(rec, rel, int);
    const c = ex.campaigns.find((x) => x.campaignId === loser.campaignId);
    const r = computeBid({ decision: 'bid', relevanceLevel: rel, commercialIntentLevel: int }, c, c.budgetCapBaseUnits, '20000', o.floorBaseUnits);
    if (r.status !== 'bid') throw new Error(`perturb: ${loser.campaignId} would not bid at ${rel}:${int}`);
    loser.amountBaseUnits = r.amountBaseUnits;
    if (BigInt(r.amountBaseUnits) >= BigInt(bids.find((b) => b.campaignId === winner).amountBaseUnits)) throw new Error('perturb: runner-up would not lose');
    notes.push(`${t.scenario.id}: tie -> ${loser.campaignId} bids ${r.amountBaseUnits} at ${rel}:${int}`);
    break;
  }

  // 2. Remove the frequency-cap exclusion: that agent skips instead and is eligible but not a bidder.
  for (const t of turns) {
    const capped = (t.eligibility?.excluded ?? []).find((x) => x.reason === 'frequency_cap');
    if (!capped) continue;
    const o = oppOf(t);
    t.eligibility.excluded = t.eligibility.excluded.filter((x) => x !== capped);
    const c = ex.campaigns.find((x) => x.campaignId === capped.campaignId);
    t.eligibility.eligible.push(structuredClone(c));
    o.outcome.rejections = (o.outcome.rejections ?? []).filter((r) => !(r.campaignId === capped.campaignId && r.reason === 'frequency_cap'));
    const rec = histRec(t, capped.campaignId);
    setLevels(rec, 1, 2, 'skip');
    rec.decision.reasonCodes = ['no_fit'];
    rec.rawOutput.answers.creative.choice = 'no_fit';
    notes.push(`${t.scenario.id}: frequency cap removed; ${capped.campaignId} skips`);
    break;
  }
  return notes;
}

function main() {
  const run = JSON.parse(readFileSync(resolve(from, 'run.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(from, 'manifest.json'), 'utf8'));
  const notes = perturb(run);
  run.limitations = [...(run.limitations ?? []), 'PERTURBED TEST FIXTURE: not a run; generated by scripts/fixtures/perturb-run.mjs.'];
  const text = JSON.stringify(run, null, 2);
  manifest.files['run.json'] = createHash('sha256').update(text).digest('hex');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'run.json'), text);
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`perturb-run: wrote ${out}\n  ${notes.join('\n  ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
