import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE_COMMIT = 'c294f8903f18efc746584e3cc2961d6033b8365c';
export const SOURCE_SHA256 = 'd27f5322cc9b5e6bd16073bdc7ce6880e8f73d6e3196e53b62d30f33d8ba062e';
const sourceFile = fileURLToPath(new URL('../../packages/payments/spike/pinned-voucher.ts', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Narrow source harness. It does not import @solana/mpp or the complete @solana/kit barrel. */
export async function loadPinnedVoucher({ dependencyRoot }) {
  if (!dependencyRoot) throw new Error('dependency_root_required');
  const root = resolve(dependencyRoot);
  const versions = { '@solana/codecs-strings': '6.10.0', '@solana/codecs-numbers': '6.10.0',
    '@solana/codecs-core': '6.10.0', '@solana/errors': '6.10.0', chalk: '5.6.2', commander: '15.0.0' };
  const entries = {};
  for (const [name, version] of Object.entries(versions)) {
    const manifest = JSON.parse(readFileSync(join(root, name, 'package.json')));
    if (manifest.name !== name || manifest.version !== version) throw new Error(`dependency_pin_mismatch:${name}`);
    if (name.startsWith('@solana/')) entries[name] = pathToFileURL(join(root, name, manifest.exports.node.import)).href;
  }
  const source = readFileSync(sourceFile);
  if (sha(source) !== SOURCE_SHA256) throw new Error('source_hash_mismatch');
  // The same exact codec implementations re-exported by kit are imported directly.
  // This explicit harness adaptation avoids loading the entire unrelated kit barrel.
  const originalImport = "import { getBase58Encoder, getI64Encoder, getU64Encoder } from '@solana/kit';";
  if (!source.toString().includes(originalImport)) throw new Error('source_import_seam_changed');
  const adapted = source.toString().replace(originalImport,
    `import { getBase58Encoder } from ${JSON.stringify(entries['@solana/codecs-strings'])};\nimport { getI64Encoder, getU64Encoder } from ${JSON.stringify(entries['@solana/codecs-numbers'])};`);
  const stripped = stripTypeScriptTypes(adapted, { mode: 'strip' });
  const module = await import(`data:text/javascript;base64,${Buffer.from(stripped).toString('base64')}`);
  return { module, metadata: { sourceCommit: SOURCE_COMMIT, sourceSHA256: SOURCE_SHA256,
    sourcePath: 'typescript/packages/mpp/src/shared/voucher.ts', dependencyVersions: versions,
    adaptation: 'replace @solana/kit barrel import with its exact 6.10.0 codec dependencies; native Node type stripping',
    transformedModuleSHA256: sha(stripped), fullSDKImported: false, kitBarrelImported: false } };
}
export async function runPinnedPayloadCheck(options) {
  const { module: voucher, metadata } = await loadPinnedVoucher(options);
  // Public fixture bytes only. No wallet/key inputs or signatures created.
  const channelId = '11111111111111111111111111111111';
  const expiresAt = 2000007200;
  const encodings = ['100', '350'].map(cumulativeAmount => {
    const bytes = voucher.encodeVoucherMessage({ channelId, cumulativeAmount, expiresAt });
    if (bytes.length !== 50 || bytes[0] !== 0x56 || bytes[1] !== 1 || Buffer.from(bytes).readBigUInt64LE(34) !== BigInt(cumulativeAmount) || Buffer.from(bytes).readBigInt64LE(42) !== BigInt(expiresAt)) throw new Error('payload_layout_mismatch');
    return { cumulativeAmountBaseUnits: cumulativeAmount, byteLength: bytes.length, payloadHex: Buffer.from(bytes).toString('hex'), payloadSHA256: sha(bytes) };
  });
  const zeroSignatureRejected = !await voucher.verifyVoucherSignature({ signatureBase58: '1'.repeat(64), signerBase58: channelId,
    voucher: { channelId, cumulativeAmount: '350', expiresAt } });
  if (!zeroSignatureRejected) throw new Error('invalid_signature_accepted');
  return { schemaVersion: 'axp.pinned-payload-check.v1', mode: 'synthetic', status: 'passed_source_payload_check',
    runtime: process.version, ...metadata, fixtureChannelId: channelId, fixtureExpiresAt: expiresAt, encodings,
    zeroSignatureRejected, signaturesCreated: 0, walletKeyReads: 0, broadcasts: 0,
    limitations: ['not a complete MPP package import', 'no client/server protocol or SessionStore execution',
      'no positive voucher signature fixture', 'no Devnet ABI/treasury compatibility or payment evidence'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4 || process.argv[2] !== '--dependency-root') throw new Error('usage: --dependency-root /absolute/disposable/node_modules');
  process.stdout.write(`${JSON.stringify(await runPinnedPayloadCheck({ dependencyRoot: process.argv[3] }), null, 2)}\n`);
}
