// Static portability and index hygiene only; no model, database or wallet reads.
import {readFileSync, readdirSync, lstatSync, readlinkSync, existsSync} from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {repositoryRoot as root} from '../../packages/config/local.mjs';

// Generated, gitignored build output (Next dist dirs incl. the NEXT_DIST_DIR variants, static exports).
const ignored = new Set(['node_modules', '.next', '.next-dev', '.next-build', '.next-first', 'out', 'dist', 'coverage', '.git', '__pycache__']);
const findings = [];
let checked = 0;
function walk(path) {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    const target = relative(root, resolve(path, '..', readlinkSync(path)));
    if (isAbsolute(target) || target === '..' || target.startsWith('../')) findings.push(relative(root, path) + ':external_symlink');
    return;
  }
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) if (!ignored.has(name)) walk(join(path, name));
    return;
  }
  if (!/\.(?:mjs|cjs|js|jsx|ts|tsx|py)$/.test(path)) return;
  checked++;
  const text = readFileSync(path, 'utf8');
  if (text.includes('/Users/' + 'akshat/') || text.includes('/Applications/' + 'Codex.app/')
    || text.includes('/opt/' + 'homebrew/')) findings.push(relative(root, path) + ':machine_specific_path');
}
for (const directory of ['apps', 'packages', 'scripts', 'tooling']) walk(join(root, directory));
const vendor = join(root, 'vendor/pay-kit');
const manifest = JSON.parse(readFileSync(join(vendor, 'manifest.json'), 'utf8'));
for (const [path, expected] of Object.entries(manifest.files)) {
  if (isAbsolute(path) || path.split('/').includes('..') || createHash('sha256').update(readFileSync(join(vendor, path))).digest('hex') !== expected) findings.push('vendor_source_hash');
}
const index = spawnSync('git', ['diff', '--cached', '--name-only', '-z'], {cwd: root, encoding: 'utf8'});
if (index.status !== 0) throw Error('git_index_unavailable');
const staged = index.stdout.split('\0').filter(Boolean);
for (const path of staged) {
  if ((/(^|\/)\.env(?:\.|$)/.test(path) && path !== '.env.example') || /^local-state\//.test(path)
    || /(^|\/)(test-wallets|wallet-keys)\.json$/.test(path) || /(^|\/)node_modules\//.test(path)) findings.push(path + ':private_or_generated_index_entry');
  if (/\.(?:mp4|woff2|jpg|png|zip)$/.test(path) || !existsSync(join(root, path))) continue;
  // Report paths only, never the matched credential value. Synthetic fixtures
  // deliberately use short fake keys and are not mistaken for live API keys.
  const content = readFileSync(join(root, path), 'utf8');
  if (/apikey_[a-f0-9]{24,}_[a-f0-9]{24,}|sk-(?:proj-)?[A-Za-z0-9_-]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) findings.push(path + ':credential_pattern');
}
console.log(JSON.stringify({status: findings.length ? 'blocked' : 'passed', runtimeFiles: checked,
  vendorFiles: Object.keys(manifest.files).length, stagedFiles: staged.length, findings}, null, 2));
if (findings.length) process.exitCode = 1;
