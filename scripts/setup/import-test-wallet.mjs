// Explicit local-only import. Never signs, broadcasts or prints wallet material.
import {openSync, closeSync, fstatSync, readFileSync, writeFileSync, mkdirSync, existsSync, constants} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {repositoryRoot} from '../../packages/config/local.mjs';

const source = process.argv[2] && resolve(process.argv[2]);
if (!source) throw Error('usage: node scripts/setup/import-test-wallet.mjs APPROVED_TEST_WALLET_FILE');
const destination = resolve(repositoryRoot, 'local-state/secrets/test-wallets.json');
if (spawnSync('git', ['check-ignore', '--quiet', 'local-state/secrets/test-wallets.json'], {cwd: repositoryRoot}).status !== 0) throw Error('wallet_must_be_git_ignored');
const descriptor = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW);
let bytes;
try {
  const stat = fstatSync(descriptor);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600 || stat.size > 65536) throw Error('wallet_permissions_or_size');
  bytes = readFileSync(descriptor);
} finally { closeSync(descriptor); }
const wallet = JSON.parse(bytes);
for (const name of ['sponsor', 'publisher']) {
  const key = wallet[name]?.secret;
  if (!Array.isArray(key) || key.length !== 64 || key.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw Error('test_wallet_format');
}
if (existsSync(destination)) {
  const descriptor = openSync(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600 || !readFileSync(descriptor).equals(bytes)) throw Error('existing_wallet_not_replaced');
  } finally { closeSync(descriptor); }
} else {
  mkdirSync(dirname(destination), {recursive: true, mode: 0o700});
  writeFileSync(destination, bytes, {mode: 0o600, flag: 'wx'});
}
console.log(JSON.stringify({status: 'test_wallet_present', storage: 'ignored local-state/secrets', signing: false, broadcasts: 0}));
