import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Release checks use fixture transports and packed consumers, not provider keys.
const root = fileURLToPath(new URL('../../', import.meta.url));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot'].includes(key)));
const tests = readdirSync(new URL('../../tests/publisher-sdk/', import.meta.url))
  .filter(name => name.endsWith('.test.mjs')).sort()
  .map(name => `tests/publisher-sdk/${name}`);
if (tests.length === 0) throw new Error('SDK release tests are missing');
for (const args of [['scripts/sdk/build-react.mjs', '--check'], ['--test', ...tests]]) {
  const result = spawnSync(process.execPath, args, {cwd: root, env, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
