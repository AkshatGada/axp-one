import type {BudgetCampaign, Turn} from './model';
export type BoundPaymentIdentity = {campaignId?: string; channelId?: string; settlementNetwork?: 'solana-devnet' | 'tempo-testnet'};
export type PaymentState = {bound: boolean; finalized: boolean; closed: boolean; pending: boolean; needsReconcile: boolean; settle: boolean; payout: boolean; close: boolean; authorize: boolean; reconcile: boolean};
export function boundPaymentIdentity(turn: Turn): BoundPaymentIdentity;
export function paymentState(campaign?: BudgetCampaign, options?: BoundPaymentIdentity & {uncertain?: boolean}): PaymentState;
