// verifyChecks: every check that can be recomputed from the public projection alone.
// Shared by the build (scripts/project-run.mjs), the node tests and the /verify page (in the judge's browser).
// Hashes: sha256(canonical JSON) exactly as packages/contracts/index.mjs `hash`.
// Signatures: Ed25519 over "AXP.delivery.v1\n" + canonical(receipt), as contracts `receiptBytes`.
import { canonical, hashCanonical, sha256Hex, verifyEd25519 } from "./canonical.ts";
import { computeBid, rankBids } from "./policy.ts";
import type { ProductRun } from "../data/types.ts";

export type CheckGroup =
  | "question"
  | "packet"
  | "creative"
  | "acknowledgement"
  | "receipt"
  | "signature"
  | "linkage"
  | "cumulative"
  | "conservation"
  | "bid"
  | "tiebreak"
  | "feecap"
  | "totals"
  | "devnet";

export type CheckStatus = "pass" | "fail" | "skip";

export interface Check {
  id: string;
  group: CheckGroup;
  label: string;
  /** recomputed: a hash or signature computed now; arithmetic: numbers re-added now; policy: rules re-run now. */
  method: "recomputed" | "signature" | "arithmetic" | "policy";
  status: CheckStatus;
  expected: string;
  actual: string;
  path: string;
  note?: string;
}

export const GROUP_LABEL: Record<CheckGroup, string> = {
  question: "Question bound to its turn",
  packet: "Exact packet each agent was sent",
  creative: "Creative that won",
  acknowledgement: "Render acknowledgement",
  receipt: "Receipt hash",
  signature: "Publisher signature (Ed25519)",
  linkage: "Receipt, charge and voucher linked",
  cumulative: "Voucher arithmetic",
  conservation: "Channel conservation",
  bid: "Bid equals the bid table",
  tiebreak: "Tie-break order",
  feecap: "Fee and rent cap",
  totals: "Run totals",
  devnet: "Devnet re-settlement",
};

/** How many checks a run's structure implies: one per question, packet, paid delivery (creative, acknowledgement,
 *  receipt, signature, linkage), voucher, channel, bid and tie, plus the fee cap and totals. The build asserts that
 *  verifyChecks produces exactly this many; the browser compares against the build-time list of IDs. */
export function expectedCheckCount(run: ProductRun): number {
  const o = run.opportunities;
  const paid = o.filter((x) => x.award && x.receipt && x.delivery && x.charge && x.voucher).length;
  return o.length + o.reduce((n, x) => n + x.decisions.length, 0) + 5 * paid + run.channels.reduce((n, c) => n + c.vouchers.length, 0) + run.channels.length + o.reduce((n, x) => n + x.auction.bids.length, 0) + o.filter((x) => x.auction.tieBreakApplied).length + 2;
}

export interface CheckSummary {
  expected: number;
  pass: number;
  fail: number;
  skip: number;
  /** Expected checks that the file did not produce (a deleted receipt, a dropped opportunity). */
  missing: number;
  /** Checks the file produced that were not expected. */
  extra: number;
  passing: boolean;
}

/** Compare results with the build-time list of check IDs. Removing checks never passes. */
export function summarize(checks: Check[], expectedIds: readonly string[]): CheckSummary {
  const by = new Map(checks.map((c) => [c.id, c]));
  const want = new Set(expectedIds);
  let pass = 0, fail = 0, skip = 0, missing = 0;
  for (const id of expectedIds) {
    const c = by.get(id);
    if (!c) missing++;
    else if (c.status === "pass") pass++;
    else if (c.status === "fail") fail++;
    else skip++;
  }
  const extra = checks.filter((c) => !want.has(c.id)).length;
  const n = expectedIds.length;
  const passing = n > 0 && want.size === n && pass === n && checks.length === n && extra === 0;
  return { expected: expectedIds.length, pass, fail, skip, missing, extra, passing };
}

/** Short headline for a summary: "Passing", "2 failed", "5 not checked". */
export function summaryWords(s: CheckSummary): string {
  if (s.passing) return "Passing";
  if (s.fail) return `${s.fail} failed`;
  const nc = s.skip + s.missing + s.extra;
  return nc ? `${nc} not checked` : "Not passing";
}

const short = (h: string) => (h && h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h);

export async function verifyChecks(run: ProductRun, opts: { onCheck?: (c: Check) => void } = {}): Promise<Check[]> {
  const out: Check[] = [];
  const nm = (id: string) => run.campaigns.find((c) => c.campaignId === id)?.businessName ?? id;
  const push = (c: Check) => {
    out.push(c);
    opts.onCheck?.(c);
  };
  const safe = async (base: Omit<Check, "status" | "expected" | "actual">, fn: () => Promise<{ ok: boolean; expected: string; actual: string; note?: string; skip?: boolean }>) => {
    try {
      const r = await fn();
      push({ ...base, status: r.skip ? "skip" : r.ok ? "pass" : "fail", expected: r.expected, actual: r.actual, ...(r.note ? { note: r.note } : {}) });
    } catch (e) {
      push({ ...base, status: "fail", expected: "a computable value", actual: e instanceof Error ? e.message : String(e) });
    }
  };

  const opps = run.opportunities;

  // 1. Question bound to its turn: turn input hash, plus the per-call question hash where recorded.
  for (const [i, o] of opps.entries()) {
    await safe({ id: `question-${o.n}`, group: "question", label: `Opportunity ${o.n}: question and turn input`, method: "recomputed", path: `opportunities[${i}].turnInput` }, async () => {
      const turn = await hashCanonical(o.turnInput);
      const sameQuestion = o.turnInput.question === o.question;
      let qOk = true;
      let note = "No agent call, so no per-call question hash was recorded.";
      if (o.questionHash) {
        const q = await sha256Hex(o.question);
        qOk = q === o.questionHash;
        note = `sha256(question) ${short(q)} ${qOk ? "matches" : "differs from"} the recorded question hash.`;
      }
      return { ok: turn === o.turnInputHash && sameQuestion && qOk, expected: short(o.turnInputHash), actual: short(turn), note };
    });
  }

  // 2. Packets: sha256(canonical(packet)) for all 15 calls, and the packet carries this opportunity's question.
  for (const [i, o] of opps.entries())
    for (const [j, d] of o.decisions.entries()) {
      await safe({ id: `packet-${d.slotId}`, group: "packet", label: `Opportunity ${o.n}, ${nm(d.campaignId)}, ${d.arm === "text_only" ? "baseline" : "with history"}`, method: "recomputed", path: `opportunities[${i}].decisions[${j}].packet` }, async () => {
        const h = await hashCanonical(d.packet);
        const p = d.packet as { state?: { opportunity?: { id?: string; taskText?: string } } };
        const bound = p.state?.opportunity?.id === o.opportunityId && p.state?.opportunity?.taskText === o.question;
        return { ok: h === d.packetHash && bound, expected: short(d.packetHash), actual: short(h), note: bound ? undefined : "Packet is not bound to this opportunity." };
      });
    }

  const paid = opps.map((o, i) => ({ o, i })).filter(({ o }) => o.award && o.receipt && o.delivery && o.charge && o.voucher);

  // 3. Creative hash.
  for (const { o, i } of paid)
    await safe({ id: `creative-${o.n}`, group: "creative", label: `Opportunity ${o.n}: awarded creative`, method: "recomputed", path: `opportunities[${i}].award.creative` }, async () => {
      const h = await hashCanonical(o.award!.creative);
      return { ok: h === o.award!.creativeHash && h === o.receipt!.fields.creativeHash, expected: short(o.award!.creativeHash), actual: short(h) };
    });

  // 4. Render acknowledgement hash.
  for (const { o, i } of paid)
    await safe({ id: `ack-${o.n}`, group: "acknowledgement", label: `Opportunity ${o.n}: card inserted with Sponsored label`, method: "recomputed", path: `opportunities[${i}].delivery.acknowledgement` }, async () => {
      const a = o.delivery!.acknowledgement;
      const h = await hashCanonical({ awardId: o.award!.id, creativeHash: o.award!.creativeHash, domInserted: a.domInserted, sponsoredLabelPresent: a.sponsoredLabelPresent });
      const ok = h === o.receipt!.fields.renderAcknowledgementHash && h === o.delivery!.renderAcknowledgementHash && a.domInserted === true && a.sponsoredLabelPresent === true;
      return { ok, expected: short(o.receipt!.fields.renderAcknowledgementHash), actual: short(h) };
    });

  // 5. Receipt hash.
  for (const { o, i } of paid)
    await safe({ id: `receipt-${o.n}`, group: "receipt", label: `Opportunity ${o.n}: receipt fields`, method: "recomputed", path: `opportunities[${i}].receipt.fields` }, async () => {
      const h = await hashCanonical(o.receipt!.fields);
      return { ok: h === o.receipt!.receiptHash, expected: short(o.receipt!.receiptHash), actual: short(h) };
    });

  // 6. Ed25519 signatures.
  for (const { o, i } of paid)
    await safe({ id: `signature-${o.n}`, group: "signature", label: `Opportunity ${o.n}: signed by ${run.publisher.publisherKeyId}`, method: "signature", path: `opportunities[${i}].receipt.signature` }, async () => {
      const keyOk = o.receipt!.fields.publisherKeyId === run.publisher.publisherKeyId;
      const r = await verifyEd25519(run.publisher.publicKeyPEM, o.receipt!.signature, `AXP.delivery.v1\n${canonical(o.receipt!.fields)}`);
      if (!r.supported) return { ok: false, skip: true, expected: "valid", actual: "not checked", note: "This browser cannot verify Ed25519 signatures (checked with a known-good test key). The hash checks still ran." };
      return { ok: r.ok && keyOk, expected: "valid", actual: r.ok ? "valid" : (r.error ?? "invalid"), note: r.ok ? undefined : r.error };
    });

  // 7. Linkage.
  for (const { o, i } of paid)
    await safe({ id: `linkage-${o.n}`, group: "linkage", label: `Opportunity ${o.n}: award, receipt, charge, voucher`, method: "arithmetic", path: `opportunities[${i}]` }, async () => {
      const r = o.receipt!, c = o.charge!, v = o.voucher!, a = o.award!;
      const links: Array<[string, boolean]> = [
        ["receipt.awardId = award.id", r.fields.awardId === a.id],
        ["receipt.opportunityId = opportunity", r.fields.opportunityId === o.opportunityId],
        ["charge.awardId = award.id", c.awardId === a.id],
        ["charge.receiptHash = receiptHash", c.receiptHash === r.receiptHash],
        ["charge amount = award price", c.amountBaseUnits === a.priceBaseUnits],
        ["voucher.chargeId = charge.id", v.chargeId === c.id],
        ["voucher increment = charge amount", v.incrementBaseUnits === c.amountBaseUnits],
      ];
      const broken = links.filter(([, ok]) => !ok).map(([k]) => k);
      return { ok: broken.length === 0, expected: `${links.length} links`, actual: `${links.length - broken.length} links`, note: broken.length ? `Broken: ${broken.join("; ")}` : undefined };
    });

  // 8. Cumulative arithmetic per voucher (cumulative = previous cumulative in the channel + increment).
  for (const [ci, ch] of run.channels.entries())
    for (const [vi, v] of ch.vouchers.entries())
      await safe({ id: `cumulative-${ch.campaignId}-${v.sequence}`, group: "cumulative", label: `${nm(ch.campaignId)} voucher ${v.sequence}`, method: "arithmetic", path: `channels[${ci}].vouchers[${vi}]` }, async () => {
        const prev = vi === 0 ? BigInt(0) : BigInt(ch.vouchers[vi - 1].cumulativeAmountBaseUnits);
        const want = prev + BigInt(v.incrementBaseUnits);
        return { ok: want.toString() === v.cumulativeAmountBaseUnits && v.sequence === vi + 1, expected: `${prev} + ${v.incrementBaseUnits} = ${want}`, actual: v.cumulativeAmountBaseUnits };
      });

  // 9. Conservation per channel.
  for (const [ci, ch] of run.channels.entries())
    await safe({ id: `conservation-${ch.campaignId}`, group: "conservation", label: `${nm(ch.campaignId)} channel`, method: "arithmetic", path: `channels[${ci}]` }, async () => {
      const dep = BigInt(ch.depositBaseUnits), set = BigInt(ch.settledBaseUnits), ref = BigInt(ch.refundBaseUnits);
      const last = ch.vouchers[ch.vouchers.length - 1];
      const ok =
        set + ref === dep &&
        last.cumulativeAmountBaseUnits === ch.settledBaseUnits &&
        ch.close.tokenDeltas.publisher === ch.settledBaseUnits &&
        ch.close.tokenDeltas.payer === ch.refundBaseUnits &&
        ch.open.tokenDeltas.payer === `-${ch.depositBaseUnits}`;
      return { ok, expected: `${set} + ${ref} = ${dep}`, actual: `${set + ref}` };
    });

  // 10. Bids: every recorded bid equals computeBid(levels) at the budget available then.
  for (const [i, o] of opps.entries())
    for (const [j, b] of o.auction.bids.entries())
      await safe({ id: `bid-${o.n}-${b.campaignId}`, group: "bid", label: `Opportunity ${o.n}: ${nm(b.campaignId)} at relevance ${b.levels?.split(":")[0]}, intent ${b.levels?.split(":")[1]}`, method: "policy", path: `opportunities[${i}].auction.bids[${j}]` }, async () => {
        const d = o.decisions.find((x) => x.campaignId === b.campaignId && x.arm === "history");
        if (!d) return { ok: false, expected: "a history decision", actual: "none" };
        const r = computeBid({ decision: d.decision, relevanceLevel: d.relevanceLevel, commercialIntentLevel: d.commercialIntentLevel }, { maxBidBaseUnits: b.maxBidBaseUnits }, b.availableCampaignBaseUnits, b.availableChannelBaseUnits, o.floorBaseUnits);
        const got = r.status === "bid" ? r.amountBaseUnits : r.reason;
        return { ok: r.status === "bid" && got === b.amountBaseUnits && b.levels === `${d.relevanceLevel}:${d.commercialIntentLevel}`, expected: b.amountBaseUnits, actual: got };
      });

  // 11. Tie-break: equal amounts ordered by campaign ID; the winner is first.
  for (const [i, o] of opps.entries()) {
    if (!o.auction.tieBreakApplied) continue;
    await safe({ id: `tiebreak-${o.n}`, group: "tiebreak", label: `Opportunity ${o.n}: equal bids`, method: "policy", path: `opportunities[${i}].auction` }, async () => {
      const { ranked } = rankBids(o.auction.bids.map((b) => ({ ...b })).reverse());
      const order = ranked.map((b) => b.campaignId).join(" > ");
      const words = (ids: string[]) => ids.map(nm).join(" before ");
      return { ok: ranked[0].campaignId === o.auction.winnerCampaignId && order === o.auction.bids.map((b) => b.campaignId).join(" > "), expected: words(o.auction.bids.map((b) => b.campaignId)), actual: words(ranked.map((b) => b.campaignId)), note: "Equal amounts are ordered by campaign ID; the first one wins." };
    });
  }

  // 12. Fee and rent cap: gross network fees plus newly created rent, never net of reclaimed rent.
  await safe({ id: "feecap", group: "feecap", label: "Fees plus new rent within the run cap", method: "arithmetic", path: "channels[*].open|close" }, async () => {
    const txs = run.channels.flatMap((c) => [c.open, c.close]);
    const gross = txs.reduce((n, t) => n + BigInt(t.networkFeeLamports) + BigInt(t.newRentLamports), BigInt(0));
    return { ok: gross <= BigInt(run.fees.capLamports) && gross.toString() === run.fees.grossFeeAndRentLamports, expected: `<= ${run.fees.capLamports}`, actual: gross.toString() };
  });

  // 13. Totals.
  await safe({ id: "totals", group: "totals", label: "Charges equal payouts; payouts plus refunds equal deposits", method: "arithmetic", path: "totals" }, async () => {
    const charges = opps.reduce((n, o) => n + BigInt(o.charge?.amountBaseUnits ?? "0"), BigInt(0));
    const paidOut = run.channels.reduce((n, c) => n + BigInt(c.settledBaseUnits), BigInt(0));
    const refunds = run.channels.reduce((n, c) => n + BigInt(c.refundBaseUnits), BigInt(0));
    const deposits = run.channels.reduce((n, c) => n + BigInt(c.depositBaseUnits), BigInt(0));
    return { ok: charges === paidOut && paidOut + refunds === deposits, expected: `${charges} paid, ${deposits} deposited`, actual: `${paidOut} paid + ${refunds} refunded` };
  });

  return out;
}
