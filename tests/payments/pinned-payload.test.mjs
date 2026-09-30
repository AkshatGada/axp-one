import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPinnedVoucher, runPinnedPayloadCheck } from '../../scripts/payment-spike/pinned-payload-check.mjs';

const dependencyRoot = process.env.C06_CODEC_ROOT;
const optional = { skip: !dependencyRoot && 'requires explicit disposable exact codec closure (C06_CODEC_ROOT); no auto-download' };
const channelId = '11111111111111111111111111111111';
const input = cumulativeAmount => ({ channelId, cumulativeAmount, expiresAt: 2000007200 });

test('pinned source: exact versioned 50-byte payload for totals100 and350', optional, async () => {
  const { module: source, metadata } = await loadPinnedVoucher({ dependencyRoot });
  for (const total of ['100', '350']) {
    const bytes = Buffer.from(source.encodeVoucherMessage(input(total)));
    const expected = Buffer.alloc(50); expected.set([0x56, 1]);
    expected.writeBigUInt64LE(BigInt(total), 34); expected.writeBigInt64LE(2000007200n, 42);
    assert.deepEqual(bytes, expected);
  }
  assert.equal(metadata.fullSDKImported, false);
  assert.equal(metadata.dependencyVersions['@solana/codecs-numbers'], '6.10.0');
});
test('pinned source: malformed address/u64 overflow/unsafe expiry reject', optional, async () => {
  const { module: source } = await loadPinnedVoucher({ dependencyRoot });
  assert.throws(() => source.encodeVoucherMessage({ ...input('100'), channelId: '1' }));
  assert.throws(() => source.encodeVoucherMessage(input('18446744073709551616')));
  assert.throws(() => source.encodeVoucherMessage(input('-1')));
  assert.throws(() => source.normalizeSignedVoucher({ voucher: { ...input('100'), expiresAt: Number.MAX_SAFE_INTEGER + 1 } }));
  const max = Buffer.from(source.encodeVoucherMessage(input('18446744073709551615')));
  assert.equal(max.readBigUInt64LE(34), (1n << 64n) - 1n);
});
test('pinned source: repeated encoding retains exact payload bytes without signing', optional, async () => {
  const result = await runPinnedPayloadCheck({ dependencyRoot });
  const again = await runPinnedPayloadCheck({ dependencyRoot });
  assert.deepEqual(again.encodings, result.encodings);
  assert.equal(result.zeroSignatureRejected, true);
  assert.equal(result.signaturesCreated, 0); assert.equal(result.broadcasts, 0);
  assert.equal(result.fullSDKImported, false);
});
test('pinned source: dependency root required, no implicit existing-assets fallback', async () => {
  await assert.rejects(() => loadPinnedVoucher({}), /dependency_root_required/);
});
