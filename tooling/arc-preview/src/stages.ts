// Display-only mapping adapted from Arc Studio sdk/axp-arc-x402/reconcile.ts.
// This viewer cannot authorize, settle, or change AXP's ledger.
export type ChargeStage = 'challenged' | 'authorized' | 'verified' | 'accepted' |
  'batched' | 'confirmed' | 'finalized' | 'rejected' | 'failed'
export const STAGE_FOR_TRANSFER_STATUS = {
  received: 'accepted', batched: 'batched', confirmed: 'confirmed',
  completed: 'finalized', failed: 'failed',
} as const
