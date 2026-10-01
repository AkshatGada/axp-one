// One-time mechanical import of the already tested public SDK source.
// No upstream edits, package installation, wallet access or network calls.
import {readFileSync, copyFileSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {repositoryRoot} from '../../packages/config/local.mjs';

const source = process.argv[2] && resolve(process.argv[2]);
if (!source) throw Error('usage: node scripts/setup/vendor-source.mjs PATH_TO_PINNED_PAYKIT');
const destination = join(repositoryRoot, 'vendor/pay-kit');
if (existsSync(join(destination, 'manifest.json'))) throw Error('vendor_source_already_preserved');
const sdkRoot = join(repositoryRoot, 'local-state/phase4-sdk');
const sdk = JSON.parse(readFileSync(join(sdkRoot, 'manifest.json'), 'utf8'));
const commit = 'c294f8903f18efc746584e3cc2961d6033b8365c';
if (!sdk.imported || sdk.sourceCommit !== commit || sdk.compiler !== '5.9.3') throw Error('tested_sdk_required');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const selected = [
  ['LICENSE', null],
  ['typescript/pnpm-lock.yaml', '58a00a82f021fdb06dbba0d8114f02c1770a19dfd92d26711741648429db749d'],
  ['typescript/packages/mpp/package.json', '906817cfd7e04994f9667d3a4b4d3bad676945a66c4aa78af978038d7d3b0b01'],
  ...sdk.moduleHashes.map(([path, hash]) => [`typescript/packages/mpp/src/${path}`, hash]),
];
const files = {};
// Validate everything before copying. Paths come from the tested manifest.
for (const [path, expected] of selected) {
  if (path.startsWith('/') || path.split('/').includes('..')) throw Error('vendor_path_invalid');
  const digest = sha(readFileSync(join(source, path)));
  if (expected && digest !== expected) throw Error('pinned_source_mismatch');
  files[path] = digest;
}
const packages = sdk.packages.map(item => {
  const manifest = JSON.parse(readFileSync(join(sdkRoot, 'store', `${item.name.replaceAll('/', '+')}@${item.version}`, 'package.json'), 'utf8'));
  if (manifest.name !== item.name || manifest.version !== item.version) throw Error('installed_pin_mismatch');
  return {name: item.name, version: item.version, dependencies: manifest.dependencies ?? {},
    peerDependencies: manifest.peerDependencies ?? {}, peerDependenciesMeta: manifest.peerDependenciesMeta ?? {},
    dist: {unpackedSize: item.unpackedBytes, integrity: item.integrity, tarball: item.tarball}};
});
for (const [path] of selected) {
  const target = join(destination, path);
  mkdirSync(dirname(target), {recursive: true});
  copyFileSync(join(source, path), target);
}
const metadata = JSON.stringify(packages, null, 2) + '\n';
writeFileSync(join(destination, 'locked-packages.json'), metadata);
files['locked-packages.json'] = sha(metadata);
writeFileSync(join(destination, 'manifest.json'), JSON.stringify({schemaVersion: 'axp.vendored-paykit.v1',
  sourceCommit: commit, sourceURL: `https://github.com/solana-foundation/pay-kit/tree/${commit}`,
  license: 'MIT', selection: '67 previously tested runtime TypeScript modules; no tests or other monorepo packages',
  packageVersion: sdk.packageVersion, compiler: sdk.compiler, files,
  expectedEmittedHashes: Object.fromEntries(sdk.moduleHashes.map(([path,, hash]) => [path, hash]))}, null, 2) + '\n');
console.log(JSON.stringify({status: 'public_source_preserved', files: selected.length, dependencies: packages.length}));
