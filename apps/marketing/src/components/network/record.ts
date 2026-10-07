export type PublicRecord = Record<string, unknown>;
export type Campaign = { id: string; name: string; scope: string; channelId: string; funded: boolean; acceptedDeliveries: number; jevDecisions: number };
export type Channel = PublicRecord & { id: string; campaignId: string; name: string; paymentPhase: string; depositBaseUnits: number; acceptedBaseUnits: number; authorizedBaseUnits: number; settledBaseUnits: number; refundBaseUnits: number; voucherUpdates: number; openUrl: string; closeUrl: string; channelUrl: string };
export type RunEvent = PublicRecord & { seq: number; at: string; type: string; campaignId: string; channelId: string; turnId: string; status: string; elapsedMs: number; reason: string };
export const object = (v: unknown): PublicRecord => v && typeof v === 'object' && !Array.isArray(v) ? v as PublicRecord : {};
export const array = (v: unknown): PublicRecord[] => Array.isArray(v) ? v.map(object) : [];
export const str = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
export const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : 0;
export const count = (v: unknown) => num(v).toLocaleString('en-US');
export const usdc = (v: unknown) => (num(v) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 6 });
export const short = (v: unknown) => { const s = str(v); return s.length > 28 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s; };
export const explorer = (v: unknown) => { const s = str(v); return /^https:\/\/explorer\.solana\.com\/(tx|address)\/[A-Za-z0-9]+\?cluster=devnet$/.test(s) ? s : ''; };
export function normalize(record: unknown) {
  const raw = object(record), measured = object(raw.measured), accounting = object(raw.accounting);
  const actual = raw.execution === 'actual-api-model/native-devnet' && raw.status !== 'planned' && Boolean(raw.startedAt);
  const channels: Channel[] = actual ? array(raw.channels).map((c, i) => {
    const transactions = array(c.transactions);
    const campaign = array(raw.campaigns).find(v => v.id === c.campaignId);
    const address = str(c.protocolChannelId ?? c.address);
    return { ...c, id: str(c.id ?? c.channelId, `channel-${i}`), campaignId: str(c.campaignId), name: str(c.name ?? c.campaignName ?? campaign?.name), paymentPhase: str(c.paymentPhase ?? c.phase ?? c.status, 'unknown'), depositBaseUnits: num(c.confirmedDepositBaseUnits ?? c.depositBaseUnits), acceptedBaseUnits: num(c.acceptedBaseUnits), authorizedBaseUnits: num(c.authorizedBaseUnits), settledBaseUnits: num(c.settledBaseUnits), refundBaseUnits: num(c.refundBaseUnits), voucherUpdates: num(c.voucherUpdates), openUrl: explorer(c.openUrl ?? transactions.find(t => t.operation === 'open')?.explorerURL), closeUrl: explorer(c.closeUrl ?? transactions.find(t => t.operation === 'close')?.explorerURL), channelUrl: explorer(c.channelUrl ?? (/^[A-Za-z0-9]+$/.test(address) ? `https://explorer.solana.com/address/${address}?cluster=devnet` : '')) };
  }) : [];
  const campaigns: Campaign[] = actual ? array(raw.campaigns).map((c, i) => ({ id: str(c.id ?? c.campaignId, `campaign-${i}`), name: str(c.name, `Advertiser ${i + 1}`), scope: str(c.scope, 'Other scope'), channelId: str(c.channelId), funded: c.funded === true, acceptedDeliveries: num(c.acceptedDeliveries), jevDecisions: num(c.jevDecisions) })) : [];
  const events: RunEvent[] = actual ? array(raw.events).map((e, i) => ({...e, seq: num(e.seq) || i + 1, at: str(e.at), type: str(e.type, 'event'), campaignId: str(e.campaignId), channelId: str(e.channelId), turnId: str(e.turnId), status: str(e.status), elapsedMs: num(e.elapsedMs), reason: str(e.reason) })) : [];
  return { raw, measured, accounting, actual, channels, campaigns, events, specimens: actual ? array(raw.specimens ?? raw.samples ?? (raw.specimen ? [raw.specimen] : [])) : [], status: str(raw.status, 'planned'), date: str(raw.completedAt ?? raw.updatedAt ?? raw.startedAt), limitations: Array.isArray(raw.limitations) ? raw.limitations.filter((s): s is string => typeof s === 'string') : [] };
}
