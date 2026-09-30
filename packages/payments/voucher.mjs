import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

export class PaymentError extends Error {
  constructor(reasonCode) { super(reasonCode); this.name = 'PaymentError'; this.reasonCode = reasonCode; }
}
export const fail = code => { throw new PaymentError(code); };
export function amount(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) fail('amount_invalid');
  const parsed = BigInt(value);
  if (parsed > (1n << 64n) - 1n) fail('amount_overflow');
  return parsed;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');

// PUBLIC, DETERMINISTIC TEST KEY. Never use for a network wallet or any value.
// This fresh AXP fixture uses domain-separated JSON, NOT the MPP wire encoder.
const fixtureKey = createPrivateKey({ key: Buffer.concat([
  Buffer.from('302e020100300506032b657004220420', 'hex'),
  Buffer.alloc(32, 6),
]), format: 'der', type: 'pkcs8' });
const fixturePublicKey = createPublicKey(fixtureKey);
export const SYNTHETIC_SIGNER = `synthetic:ed25519:${fixturePublicKey.export({ format: 'der', type: 'spki' }).toString('base64')}`;
export function createSyntheticVoucher({ channelId, cumulativeAmountBaseUnits, expiresAt, termsHash }) {
  amount(cumulativeAmountBaseUnits);
  const payload = { domain: 'axp.synthetic-voucher.v1', channelId, cumulativeAmountBaseUnits, expiresAt, termsHash };
  return { payload, signer: SYNTHETIC_SIGNER, signature: sign(null, Buffer.from(canonical(payload)), fixtureKey).toString('base64') };
}
export function verifySyntheticVoucher({ voucher, channelId, termsHash, previousBaseUnits, chargeAmountBaseUnits, capBaseUnits, expiresAt, now }) {
  const p = voucher?.payload;
  if (!p || p.domain !== 'axp.synthetic-voucher.v1' || p.channelId !== channelId || p.termsHash !== termsHash || voucher.signer !== SYNTHETIC_SIGNER || p.expiresAt !== expiresAt) fail('voucher_invalid');
  if (!Number.isSafeInteger(p.expiresAt) || p.expiresAt <= now) fail('voucher_expired');
  if (typeof voucher.signature !== 'string' || !verify(null, Buffer.from(canonical(p)), fixturePublicKey, Buffer.from(voucher.signature, 'base64'))) fail('voucher_invalid');
  const total = amount(p.cumulativeAmountBaseUnits);
  const previous = amount(previousBaseUnits);
  if (total <= previous) fail('voucher_invalid');
  if (total > amount(capBaseUnits)) fail('cap_exceeded');
  if (total - previous !== amount(chargeAmountBaseUnits)) fail('charge_amount_mismatch');
  return total.toString();
}
