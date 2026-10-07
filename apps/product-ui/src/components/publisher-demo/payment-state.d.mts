import type {BudgetCampaign, Turn} from './model';
export type BoundPaymentIdentity = {campaignId?: string; channelId?: string};
export type PaymentState = {bound: boolean; finalized: boolean; closed: boolean; pending: boolean; needsReconcile: boolean; settle: boolean; authorize: boolean; reconcile: boolean};
export function boundPaymentIdentity(turn: Turn): BoundPaymentIdentity;
export function paymentState(campaign?: BudgetCampaign, options?: BoundPaymentIdentity & {uncertain?: boolean}): PaymentState;
