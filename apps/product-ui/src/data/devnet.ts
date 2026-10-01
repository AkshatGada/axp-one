// Optional Solana Devnet re-settlement of the recorded run's receipts. Read at build time from
// src/data/devnet.public.json (written by scripts/project-devnet.mjs from artifacts/v3-devnet/settlement.json,
// with asserts). When the file is absent every devnet section renders nothing and the build still passes.
// Only cluster "devnet" is accepted.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DevnetProjection } from "./devnet-types";

function load(): DevnetProjection | null {
  try {
    const p = join(process.cwd(), "src/data/devnet.public.json");
    if (!existsSync(p)) return null;
    const d = JSON.parse(readFileSync(p, "utf8")) as DevnetProjection;
    if (d.schema !== "axp.devnet-projection.v1" || d.network?.cluster !== "devnet") return null;
    const ok = (u: string) => typeof u === "string" && u.startsWith("https://explorer.solana.com/") && u.endsWith("?cluster=devnet");
    if (!d.transactions?.every((t) => ok(t.explorerUrl)) || !d.channels?.every((c) => ok(c.channelExplorerUrl)) || !ok(d.network.programExplorerUrl)) return null;
    return d;
  } catch {
    return null;
  }
}

export const devnet: DevnetProjection | null = load();
