// Shape of src/data/devnet.public.json (written by scripts/project-devnet.mjs). Client-safe types only.
export type DevnetTxRef = { signature: string; explorerUrl: string; slot: number; feeLamports: string; newRentLamports: string; reclaimedRentLamports: string };
export type DevnetVoucher = {
  sequence: number;
  opportunityN: number | null;
  awardId: string;
  chargeId: string;
  receiptHash: string;
  incrementBaseUnits: string;
  cumulativeBaseUnits: string;
  settledOnChain: boolean;
  closeSignature: string | null;
};
export type DevnetChannel = {
  channelId: string;
  campaignId: string;
  channelAddress: string;
  channelExplorerUrl: string;
  status: string | null;
  remainingRentLamports: string | null;
  depositBaseUnits: string;
  payoutBaseUnits: string;
  refundBaseUnits: string;
  open: DevnetTxRef | null;
  close: DevnetTxRef | null;
  vouchers: DevnetVoucher[];
};
export type DevnetProjection = {
  schema: "axp.devnet-projection.v1";
  source: { path: string; settlementRunId: string; sourceRunId: string; sourceBundleSha256: string; sha256?: string };
  framing: string;
  network: { cluster: "devnet"; genesisHash: string; program: string; programExplorerUrl: string; mint: string; mintLabel: string };
  identities: { payer: string; payerExplorerUrl: string; payee: string; payeeExplorerUrl: string };
  funding: { signature: string; explorerUrl: string; slot: number; lamports: string; tokenBaseUnits: string; feeLamports: string; newRentLamports: string };
  channels: DevnetChannel[];
  transactions: Array<{ signature: string; role: "funding" | "open" | "close"; campaignId: string | null; slot: number; finality: string; explorerUrl: string; feeLamports: string; newRentLamports: string; reclaimedRentLamports: string }>;
  totals: Record<string, string>;
  verification: { allSignaturesFinalized: boolean; checkedAt: string; method: string };
  limitations: string[];
};
