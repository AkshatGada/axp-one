import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkReviewLinks, reviewerEnvironment, reviewSteps, runReview} from '../../scripts/setup/verify-review.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('review entry-point links resolve within the repository', () => {
  assert.deepEqual(checkReviewLinks(root).findings, []);
});
test('review environment omits credentials and process injection', () => {
  const env = reviewerEnvironment({PATH: '/fixture/bin', HOME: '/fixture/home',
    JEV_API_KEY: 'private', AXP_STATE_KEY: 'private', NODE_OPTIONS: '--require /private.js',
    AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: '1', NPM_TOKEN: 'private'});
  assert.equal(env.PATH, '/fixture/bin');
  assert.equal(env.HOME, '/fixture/home');
  assert.equal(env.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED, '0');
  for (const key of ['JEV_API_KEY', 'AXP_STATE_KEY', 'NODE_OPTIONS', 'NPM_TOKEN']) assert.equal(env[key], undefined);
});
test('review runner executes explicit local checks and stops at the first failure', () => {
  const calls = [], output = [];
  assert.equal(runReview({root, env: {}, write: text => output.push(text), spawn: (...args) => {
    calls.push(args); return {status: calls.length === 2 ? 1 : 0};
  }}), 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], process.execPath);
  assert.equal(calls[0][2].env.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED, '0');
  assert.ok(output.join('').includes('FAILED product-components'));
  const steps = reviewSteps(root);
  assert.equal(steps.length, 6);
  assert.ok(steps[1].args.length > 1);
  assert.ok(steps.every(step => !step.args.join(' ').includes('verify-devnet')));
});
test('review runner refuses credential-bearing checkout without starting a child', t => {
  const dir = mkdtempSync(join(tmpdir(), 'axp-review-env-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  writeFileSync(join(dir, '.env.local'), 'FIXTURE=1');
  assert.equal(runReview({root: dir, write() {}, spawn() {throw Error('must not start');}}), 1);
});
test('link checker reports missing, escaping and malformed targets, ignoring code fences and remote URLs', t => {
  const dir = mkdtempSync(join(tmpdir(), 'axp-review-links-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'README.md'), '[ok](docs/) [missing](absent.md) [escape](../outside.md) [bad](%ZZ) [web](https://example.com)\n\n```md\n[example](ignored.md)\n```\n');
  assert.deepEqual(checkReviewLinks(dir, ['README.md']).findings, [
    'README.md:absent.md:target_missing', 'README.md:link_outside_repository', 'README.md:invalid_link_encoding']);
});
