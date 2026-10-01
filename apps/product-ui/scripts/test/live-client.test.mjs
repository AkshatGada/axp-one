import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = resolve(app, '../../packages/hosted/client.mjs');
test('the app copy of the live-run client matches packages/hosted/client.mjs', { skip: !existsSync(src) }, () => {
  const copy = readFileSync(resolve(app, 'src/lib/live-client.mjs'), 'utf8').split('\n').slice(2).join('\n');
  assert.equal(copy, readFileSync(src, 'utf8'));
  assert.equal(readFileSync(resolve(app, 'src/lib/live-client.d.mts'), 'utf8'), readFileSync(resolve(app, '../../packages/hosted/client.d.mts'), 'utf8'));
});
