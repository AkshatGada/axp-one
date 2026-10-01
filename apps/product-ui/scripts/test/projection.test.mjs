import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { project, scanForbidden, longNumericArrays, structuralChecks, RUN_DIR } from '../project-run.mjs';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repo = resolve(app, '../..');
const bundle = (dir) => {
  const cc = resolve(repo, dir, '..', 'chain-check.json');
  return { runBytes: readFileSync(resolve(repo, dir, 'run.json')), manifestBytes: readFileSync(resolve(repo, dir, 'manifest.json')), chainCheck: existsSync(cc) ? JSON.parse(readFileSync(cc, 'utf8')) : null };
};
// The first recording (hosted sandbox) has fixed, known numbers; the default build input may be another run.
const recorded = bundle('artifacts/v3/replay');
const runBytes = recorded.runBytes;
const { projection } = project(recorded);
const shipped = readFileSync(resolve(app, 'public/run.public.json'), 'utf8');

test('projection of the selected bundle is deterministic and matches the shipped file', () => {
  assert.equal(JSON.stringify(project(bundle(RUN_DIR)).projection), shipped);
  assert.equal(readFileSync(resolve(app, 'src/data/run.public.json'), 'utf8'), shipped);
});

test('the first recording: counts, story order and joins', () => {
  const p = projection;
  assert.deepEqual([p.counts.opportunities, p.counts.decisions, p.counts.auctions, p.counts.noFill, p.counts.receipts, p.counts.events, p.counts.channels, p.counts.txs], [4, 15, 3, 1, 3, 33, 2, 4]);
  assert.deepEqual(p.opportunities.map((o) => o.scenarioId), ['cached', 'offline', 'repeat', 'mobile']);
  assert.deepEqual(p.opportunities.map((o) => o.runningTotalBaseUnits), ['4000', '7000', '10000', '10000']);
  for (const o of p.opportunities.filter((x) => x.award)) {
    assert.equal(o.receipt.fields.awardId, o.award.id);
    assert.equal(o.charge.awardId, o.award.id);
    assert.equal(o.voucher.chargeId, o.charge.id);
  }
  assert.deepEqual(p.chainTxs.map((t) => t.slot), [452225151, 452225252, 452225945, 452226063]);
  const o3 = p.opportunities[2];
  const cv = o3.decisions.find((d) => d.campaignId === 'v3-clearvault');
  assert.equal(cv.decision, 'bid');
  assert.equal(cv.auctionRole, 'not_admitted');
  assert.equal(o3.auction.notAdmitted[0].sessionAwards, 2);
  assert.equal(p.opportunities[3].decisions.length, 0);
  assert.deepEqual(p.opportunities[3].eligibility.excluded.map((x) => x.missing.join()), ['mobile_software_wallet', 'mobile_software_wallet', 'crypto_storage,mobile_software_wallet']);
  const cached = p.opportunities[0].decisions.filter((d) => d.campaignId === 'v3-clearvault').map((d) => d.scores.intent);
  assert.deepEqual(cached, [2.38, 2.52]);
});

test('sanitization, vector guard and size budget (both runs)', () => {
  for (const text of [JSON.stringify(projection), shipped]) {
    assert.deepEqual(scanForbidden(text), []);
    assert.ok(Buffer.byteLength(text) <= 300 * 1024);
  }
  const text = JSON.stringify(projection);
  assert.deepEqual(scanForbidden(text), []);
  assert.deepEqual(longNumericArrays(projection), []);
  assert.ok(Buffer.byteLength(text) <= 300 * 1024);
  assert.ok(!/postSnapshot|preBalances|postTokenBalances|settlementLink|callEvidence/.test(text));
  // the guards catch what they claim to catch
  assert.deepEqual(scanForbidden('{"rpc":"x","agentRunId":1}'), ['agentRunId', '"rpc"']);
  assert.equal(longNumericArrays({ a: { v: Array.from({ length: 768 }, () => 0.1) } }).length, 1);
});

test('structural checks fail on broken conservation and count drift', () => {
  const broken = structuredClone(projection);
  broken.channels[0].refundBaseUnits = '12999';
  broken.counts.events = 32;
  const failed = [];
  const raw = JSON.parse(runBytes.toString('utf8'));
  structuralChecks(broken, (name, ok) => { if (!ok) failed.push(name); }, raw);
  assert.ok(failed.some((n) => n.startsWith('conservation v3-clearvault')), failed.join());
  assert.ok(failed.includes('manifest: events = projected events'), failed.join());
  const clean = [];
  structuralChecks(projection, (name, ok) => { if (!ok) clean.push(name); }, raw);
  assert.deepEqual(clean, []);
});

test('structural checks pass on the selected bundle too', () => {
  const b = bundle(RUN_DIR);
  const p = project(b).projection;
  const bad = [];
  structuralChecks(p, (name, ok) => { if (!ok) bad.push(name); }, JSON.parse(b.runBytes.toString('utf8')));
  assert.deepEqual(bad, []);
});

import { project as coreProject, structuralChecks as coreStructural } from '../../src/lib/project-core.mjs';
test('the isomorphic core (pure-JS hashing, as in the browser) gives the same projection', () => {
  const b = bundle(RUN_DIR);
  const viaCore = coreProject({ runBytes: new Uint8Array(b.runBytes), manifestBytes: new Uint8Array(b.manifestBytes), chainCheck: b.chainCheck, paths: { run: 'x', manifest: 'y' } }).projection;
  const viaBuild = project(b).projection;
  viaCore.source.runPath = viaBuild.source.runPath;
  viaCore.source.manifestPath = viaBuild.source.manifestPath;
  assert.deepEqual(viaCore, viaBuild);
});

test('a hosted live run bundle projects and passes the structural checks', { skip: !existsSync(resolve(repo, 'artifacts/hosted-live-e2e/replay/run.json')) }, () => {
  const b = bundle('artifacts/hosted-live-e2e/replay');
  const bad = [];
  const { projection: p } = coreProject(b, { check: (n, ok) => { if (!ok) bad.push(n); } });
  coreStructural(p, (n, ok) => { if (!ok) bad.push(n); }, JSON.parse(new TextDecoder().decode(b.runBytes)));
  assert.deepEqual(bad, []);
  assert.equal(p.network.kind, 'devnet');
});
