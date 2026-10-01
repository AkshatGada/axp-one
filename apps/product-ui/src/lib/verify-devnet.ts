// Browser checks that tie the Solana Devnet re-settlement file to the recorded run. They read two files
// (run.public.json and devnet.public.json); they do not query a chain. Explorer links are for the person to open.
import type { Check } from "./verify.ts";
import type { ProductRun } from "../data/types.ts";
import type { DevnetProjection } from "../data/devnet-types.ts";

const short = (h: string) => (h && h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h);
const name = (id: string) => id.replace(/^v3-/, "").replace(/^./, (c) => c.toUpperCase()).replace("Clearvault", "ClearVault").replace("Keyforge", "KeyForge");

export const DEVNET_CHECK_COUNT = 7;

export function verifyDevnet(run: ProductRun, d: DevnetProjection): Check[] {
  const out: Check[] = [];
  const byAward = new Map(run.opportunities.filter((o) => o.receipt && o.award).map((o) => [o.award!.id, o]));
  for (const ch of d.channels)
    for (const v of ch.vouchers) {
      const o = byAward.get(v.awardId);
      const rec = o?.receipt?.receiptHash ?? "no recorded receipt";
      out.push({
        id: `devnet-receipt-${v.awardId}`,
        group: "devnet",
        label: `Opportunity ${o?.n ?? "?"}: devnet receipt hash equals the recorded receipt`,
        method: "arithmetic",
        status: rec === v.receiptHash ? "pass" : "fail",
        expected: short(rec),
        actual: short(v.receiptHash),
        path: `devnet.channels[${ch.channelId}].vouchers[${v.sequence}].receiptHash`,
      });
    }
  for (const ch of d.channels) {
    const sum = BigInt(ch.payoutBaseUnits) + BigInt(ch.refundBaseUnits);
    out.push({
      id: `devnet-conservation-${ch.campaignId}`,
      group: "devnet",
      label: `${name(ch.campaignId)} devnet channel: payout plus refund equals the deposit`,
      method: "arithmetic",
      status: sum === BigInt(ch.depositBaseUnits) ? "pass" : "fail",
      expected: ch.depositBaseUnits,
      actual: sum.toString(),
      path: `devnet.channels[${ch.channelId}]`,
    });
  }
  for (const ch of d.channels) {
    const charges = run.opportunities.reduce((n, o) => n + (o.charge?.campaignId === ch.campaignId ? BigInt(o.charge.amountBaseUnits) : 0n), 0n);
    const last = ch.vouchers[ch.vouchers.length - 1];
    out.push({
      id: `devnet-final-${ch.campaignId}`,
      group: "devnet",
      label: `${name(ch.campaignId)} devnet channel: final voucher equals the recorded accepted charges`,
      method: "arithmetic",
      status: last && BigInt(last.cumulativeBaseUnits) === charges && BigInt(ch.payoutBaseUnits) === charges ? "pass" : "fail",
      expected: charges.toString(),
      actual: last ? last.cumulativeBaseUnits : "no voucher",
      path: `devnet.channels[${ch.channelId}].vouchers`,
    });
  }
  return out;
}
