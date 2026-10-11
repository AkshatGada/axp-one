// Shape and binding checks only. No hashing, signature verification or payment effects.
import {PublisherSDKError} from './errors.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const amount = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) &&
  value.length <= 20 && BigInt(value) <= (1n << 64n) - 1n;

/** Validate an accepted response against the caller's known award/creative/price/mode. */
export function validateReceiptResult(value, {awardId, creativeHash, priceBaseUnits, financialMode} = {}) {
  const receipt = value?.receipt, charge = value?.charge;
  if (!text(awardId) || !record(value) || value.status !== 'accepted' ||
    !record(receipt) || receipt.awardId !== awardId || !hash(receipt.creativeHash) ||
    (creativeHash !== undefined && receipt.creativeHash !== creativeHash) ||
    (receipt.schemaVersion !== undefined && receipt.schemaVersion !== 'publisher-receipt.v1') ||
    !record(charge) || !text(charge.id) || !amount(charge.amountBaseUnits) ||
    (priceBaseUnits !== undefined && charge.amountBaseUnits !== priceBaseUnits) ||
    (charge.awardId !== undefined && charge.awardId !== awardId) ||
    !hash(value.receiptHash) || !text(value.signature) || typeof value.replayed !== 'boolean' ||
    (charge.receiptHash !== undefined && charge.receiptHash !== value.receiptHash) ||
    (financialMode !== undefined && [value.financialMode, value.mode, receipt.mode, charge.mode]
      .some(mode => mode !== undefined && mode !== financialMode)) ||
    (value.financialMode !== undefined && !text(value.financialMode)) ||
    (value.financialMode !== undefined && receipt.mode !== undefined && value.financialMode !== receipt.mode) ||
    (value.financialMode !== undefined && charge.mode !== undefined && value.financialMode !== charge.mode))
    throw new PublisherSDKError('invalid_receipt_response');
  return value;
}
