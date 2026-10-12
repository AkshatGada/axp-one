import type {ReactElement} from 'react';
import type {Award, ReceiptResult} from './index.mjs';

export type SponsoredCardProps = {
  award: Award;
  deliveryToken: string;
  acknowledge: (input: {node: HTMLElement; award: Award; deliveryToken: string}) => Promise<ReceiptResult>;
  onReceipt?: (receipt: ReceiptResult) => void;
  onError?: (error: unknown) => void;
  className?: string;
};
/** Render below the organic answer. Acknowledge through your same-origin server. */
export function SponsoredCard(props: SponsoredCardProps): ReactElement | null;
