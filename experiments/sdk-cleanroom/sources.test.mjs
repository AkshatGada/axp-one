import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {snapshot} from './snapshot.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));

test('ordinary chat baseline is preserved byte-for-byte',()=>{
  assert.deepEqual(snapshot(join(root,'experiments/sdk-cleanroom/baseline-app')),read('artifacts/sdk-cleanroom/app-baseline.json'));
});
test('original experiment SDK remains frozen while pilot SDK evolves separately',()=>{
  const source=read('artifacts/sdk-cleanroom/sdk-before.json');
  assert.deepEqual(snapshot(join(root,'experiments/sdk-cleanroom/app/vendor/publisher-sdk')).files,source.files.filter(file=>!file.path.startsWith('examples/')));
});
test('source-distributed integration uses unmodified public SDK files, not internal examples',()=>{
  const source=read('artifacts/sdk-cleanroom/sdk-before.json');
  const copy=snapshot(join(root,'experiments/sdk-cleanroom/app/vendor/publisher-sdk'));
  assert.ok(copy.files.length>0);
  assert.deepEqual(copy.files,source.files.filter(file=>!file.path.startsWith('examples/')));
});
