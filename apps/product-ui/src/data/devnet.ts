// Optional Solana devnet settlement evidence. Read at build time from src/data/devnet.public.json if it exists.
// The file is produced separately (artifacts/v3-devnet/); when it is absent every devnet slot renders nothing,
// and the build passes. Only cluster "devnet" is accepted; anything else is ignored rather than shown.
//
// Expected shape (all strings except slot):
// {
//   "cluster": "devnet",
//   "programId": "<base58, optional>",
//   "note": "<one plain sentence, optional>",
//   "transactions": [
//     { "label": "Open ClearVault's channel", "signature": "<base58>", "campaignId": "v3-clearvault", "kind": "open", "slot": 123 }
//   ],
//   "accounts": [ { "label": "ClearVault channel", "address": "<base58>" } ]
// }
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type DevnetTx = { label: string; signature: string; campaignId?: string; kind?: string; slot?: number };
export type DevnetAccount = { label: string; address: string };
export type Devnet = { cluster: "devnet"; programId?: string; note?: string; transactions: DevnetTx[]; accounts: DevnetAccount[] };

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;
const EXPLORER = "https://explorer.solana.com";

export const explorerTx = (sig: string) => `${EXPLORER}/tx/${sig}?cluster=devnet`;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}?cluster=devnet`;

function load(): Devnet | null {
  try {
    const p = join(process.cwd(), "src/data/devnet.public.json");
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Devnet> & { transactions?: unknown[]; accounts?: unknown[] };
    if (raw.cluster !== "devnet") return null;
    const transactions = (raw.transactions ?? []).filter((t): t is DevnetTx => !!t && typeof (t as DevnetTx).label === "string" && B58.test(String((t as DevnetTx).signature)));
    const accounts = (raw.accounts ?? []).filter((a): a is DevnetAccount => !!a && typeof (a as DevnetAccount).label === "string" && B58.test(String((a as DevnetAccount).address)));
    if (!transactions.length && !accounts.length) return null;
    return {
      cluster: "devnet",
      programId: raw.programId && B58.test(raw.programId) ? raw.programId : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      transactions,
      accounts,
    };
  } catch {
    return null;
  }
}

export const devnet: Devnet | null = load();
