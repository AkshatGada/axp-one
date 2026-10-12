import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ui = join(root, 'apps/product-ui/node_modules');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test('React artifact is reproducible from its TSX source', () => {
  run(process.execPath, ['scripts/sdk/build-react.mjs', '--check']);
});

test('packed React consumer imports plain JS, renders disclosure, and typechecks NodeNext and bundler exports', t => {
  const dir = mkdtempSync(join(tmpdir(), 'axp-sdk-release-consumer-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const cache = join(dir, 'cache');
  const [packed] = JSON.parse(run('npm', ['pack', './packages/publisher-sdk', '--json', '--ignore-scripts', '--offline', '--cache', cache, '--pack-destination', dir]));
  run('npm', ['install', join(dir, packed.filename), ...['react', 'react-dom', '@types/react'].map(p => realpathSync(join(ui, p))),
    '--ignore-scripts', '--offline', '--no-audit', '--no-fund', '--package-lock=false', '--cache', cache], dir);
  writeFileSync(join(dir, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SponsoredCard} from '@axp001/publisher-sdk/react';
const award = {id: 'a', creativeHash: 'a'.repeat(64), priceBaseUnits: '1', expiresAt: 1,
  creative: {approvedText: '<not HTML>', destinationURL: 'https://example.com/'}};
const html = renderToStaticMarkup(React.createElement(SponsoredCard, {award, deliveryToken: 'token', acknowledge: () => {throw Error('SSR must not acknowledge');}}));
assert.match(html, /Sponsored/);
assert.match(html, /&lt;not HTML&gt;/);
assert.match(html, /rel="sponsored noopener noreferrer"/);
assert.equal(renderToStaticMarkup(React.createElement(SponsoredCard, {award: {...award, creative: {...award.creative, destinationURL: 'javascript:alert(1)'}}, deliveryToken:'token', acknowledge:async()=>{}})), '');
`);
  run(process.execPath, ['smoke.mjs'], dir);
  writeFileSync(join(dir, 'consumer.mts'), `
import {AXPPublisher, type Award} from '@axp001/publisher-sdk';
import {createRenderAcknowledger} from '@axp001/publisher-sdk/browser';
import {moneyUnit} from '@axp001/publisher-sdk/financial';
import {validateReceiptResult} from '@axp001/publisher-sdk/receipt';
import {SponsoredCard, type SponsoredCardProps} from '@axp001/publisher-sdk/react';
const sdk = new AXPPublisher({apiKey: 'server-only', baseURL:'https://example.com/api/accounts/sdk'});
const acknowledge = createRenderAcknowledger({post: async () => ({})});
declare const award: Award;
const props: SponsoredCardProps = {award, deliveryToken: 'token', acknowledge};
SponsoredCard(props);
void sdk; void moneyUnit; void validateReceiptResult;
`);
  const tsc = realpathSync(join(ui, 'typescript/bin/tsc'));
  for (const [module, resolution] of [['NodeNext', 'NodeNext'], ['ESNext', 'Bundler']]) {
    run(process.execPath, [tsc, '--noEmit', '--strict', '--target', 'ES2022', '--lib', 'ES2022,DOM', '--module', module, '--moduleResolution', resolution, 'consumer.mts'], dir);
  }
  const manifest = JSON.parse(readFileSync(join(dir, 'node_modules/@axp001/publisher-sdk/package.json'), 'utf8'));
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.peerDependenciesMeta.react.optional, true);
  assert.equal(manifest.dependencies, undefined);
});
