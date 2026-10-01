// Types for packages/hosted/client.mjs: the hosted live-run API contract.
export type Phase = 'queued' | 'opening' | 'auctions' | 'delivery' | 'closing' | 'finalizing' | 'completed' | 'aborted' | 'needs_operator';
export type ScenarioId = 'cached' | 'offline' | 'repeat' | 'mobile';
export type PublicFile = 'replay/run.json' | 'replay/manifest.json' | 'chain-check.json' | 'restart.json' | 'devnet-feasibility.json' | `organic/${ScenarioId}.json`;

export interface LiveConfig {
  schemaVersion: 'axp.hosted-live-config.v1';
  network: 'solana-devnet';
  /** True when a judge can start a run now (enabled, wallets present and funded). */
  enabled: boolean;
  configured: { liveEnabled: boolean; modelKeys: boolean; wallets: boolean; walletError?: string; payersFunded: boolean };
  passcodeRequired: boolean;
  caps: { daily: number; perIpDaily: number; maxActive: number; deliveryWindowSeconds: number };
  usedToday: number;
  activeRuns: string[];
  wallets: { network: 'solana-devnet'; payers: Record<string, string>; publisher: string; funding: Array<{ signature: string; from: string; lamportsPerPayer: string; tokenBaseUnitsPerPayer: string; at: string; status: string; slot?: number | null }> } | null;
  payers: Record<string, { address: string; lamports: string; tokenBaseUnits: string; ok: boolean; runsLeftEstimate: number }> | { error: string } | null;
  scenarios: ScenarioId[];
  models: { organic: 'deepseek-flash'; decisions: string };
}

export interface AwardStatus {
  awardId: string; scenarioId: ScenarioId | null; campaignId: string; advertiser: string; channelId: string;
  /** Render exactly this text inside [data-creative-copy]. */
  creativeText: string; creativeHash: string; priceBaseUnits: string;
  status: 'reserved' | 'delivered' | 'failed' | 'expired' | string; expiresAt: string | null;
}
export interface TurnStatus {
  scenarioId: ScenarioId; question: string; status: 'waiting_organic' | 'ready' | 'completed';
  organic: { status: 'waiting' | 'completed'; answer: string | null; model: string | null } | null;
  decisions: Array<{ campaignId: string; advertiser: string; arm: 'text_only' | 'history'; status: string; decision: 'bid' | 'skip' | 'abstain' | string | null; relevanceLevel: number | null; commercialIntentLevel: number | null }>;
  outcome: { status: 'awarded' | 'no_fill' | string; bids: Array<{ campaignId: string; advertiser: string; amountBaseUnits: string }>; awardId: string | null } | null;
  excluded: Array<{ campaignId: string; reason: string }>;
}
export interface PaymentStatus {
  channelId: string; advertiser: string; payer: string; payee: string; protocolChannelId: string | null;
  openStatus: string; closeStatus: string | null; depositBaseUnits: string; authorizedBaseUnits: string; settledBaseUnits: string; refundBaseUnits: string;
  vouchers: Array<{ chargeId: string; status: string; cumulativeAmountBaseUnits: string }>;
  explorer: { payer: string; channel: string | null; open: string | null; close: string | null };
}
export interface RunLiveStatus {
  frozen: boolean; freezeHash: string | null; voucherExpiresAt: string | null;
  turns: TurnStatus[]; awards: AwardStatus[];
  charges: Array<{ chargeId: string; awardId: string; campaignId: string; channelId: string; amountBaseUnits: string; status: string; receiptHash: string }>;
  payments: PaymentStatus[];
  model: { admittedCalls: number; usage: unknown };
}
export interface RunRecord {
  schemaVersion: 'axp.hosted-run.v1'; runId: string; network: 'solana-devnet';
  phase: Phase; terminal: boolean; createdAt: string; updatedAt: string; steps: number;
  history: Array<{ phase: Phase; at: string; [k: string]: unknown }>;
  attempts: Partial<Record<Phase, number>>;
  error: { code: string; phase: Phase; at: string; attempt: number } | null;
  abortReason?: string;
  /** ISO time after which unacknowledged awards fail (no charge). */
  deliveryDeadline: string | null;
  /** Award ids waiting for this browser's render acknowledgement. */
  pendingAwards: string[];
  files: PublicFile[];
  status: RunLiveStatus | null;
  bundle?: { bundleHash: string; storyGates?: { failed: string[] }; charges: number };
  links: { bundle: string | null };
}
export interface RunListItem extends Omit<RunRecord, 'status' | 'history'> { charges: number }
export interface StartResult { run: RunRecord; /** Returned once; needed to acknowledge delivery. null on an idempotent replay. */ runToken: string | null; replayed?: boolean }
export interface AdvanceResult { run: RunRecord; /** Another step is in flight; poll again. */ busy: boolean }
export interface RenderBody { domInserted: true; sponsoredLabelPresent: true; creativeHash: string }
export interface RenderResult {
  receipt: { chargeId: string; channelId: string; amountBaseUnits: string; receiptHash: string; replayed: boolean };
  run: RunRecord;
}
export interface Bundle { run: Record<string, unknown>; manifest: Record<string, unknown>; chainCheck: Record<string, unknown> }

export declare class LiveRunError extends Error { code: string; status: number }
export interface LiveClient {
  config(): Promise<LiveConfig>;
  start(options?: { passcode?: string; idempotencyKey?: string }): Promise<StartResult>;
  list(): Promise<RunListItem[]>;
  status(runId: string): Promise<RunRecord>;
  advance(runId: string): Promise<AdvanceResult>;
  render(runId: string, awardId: string, body: RenderBody, runToken: string): Promise<RenderResult>;
  file(runId: string, path: PublicFile): Promise<unknown>;
  /** The three files apps/product-ui/scripts/project-run.mjs reads. Available when phase === 'completed'. */
  bundle(runId: string): Promise<Bundle>;
}
export function createLiveClient(options?: { baseURL?: string; fetcher?: typeof fetch; apiBase?: string }): LiveClient;
export function driveRun(client: LiveClient, runId: string, options?: { intervalMs?: number; onUpdate?: (run: RunRecord, res: AdvanceResult) => void; signal?: AbortSignal; stopWhenAwardsPending?: boolean }): Promise<RunRecord>;
export function acknowledgeCard(client: LiveClient, runId: string, runToken: string, award: AwardStatus, element: Element): Promise<RenderResult>;
export function explorer(kind: 'tx' | 'address', value: string): string;
