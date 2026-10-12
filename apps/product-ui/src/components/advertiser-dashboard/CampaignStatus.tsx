import { Ld } from '@axp/design-system/ledger';

export const statusLabel = (status: string) => ({ active: 'Active', paused: 'Paused', settled: 'Closed', draft: 'Draft', opening: 'Opening channel', funding: 'Funding channel', draining: 'Finishing deliveries', closing: 'Settlement pending', settling: 'Settlement pending', payment_pending: 'Payment pending', payment_failed: 'Payment blocked' } as Record<string, string>)[status] ?? status.replaceAll('_', ' ');

export function CampaignStatus({ status }: { status: string }) {
  return <Ld.Tag tone={status === 'active' ? 'success' : status === 'paused' || status === 'payment_failed' ? 'warning' : 'outline'}>{statusLabel(status)}</Ld.Tag>;
}
