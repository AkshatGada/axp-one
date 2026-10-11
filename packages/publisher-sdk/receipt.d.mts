import type {ReceiptResult} from './index.mjs';
import type {FinancialMode} from './financial.mjs';
/** Validates shape/binding, not cryptographic authenticity or human attention. */
export function validateReceiptResult(value: unknown, binding: {awardId: string; creativeHash?: string; priceBaseUnits?: string; financialMode?: FinancialMode}): ReceiptResult;
