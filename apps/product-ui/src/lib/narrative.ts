// The run's story as pure functions of the projection. Every outcome sentence on the site and in Present comes from
// here, so a different run (a live Devnet run, or the perturbed test fixture) reads correctly: ties only when bids were
// equal, a cap only when one kept a bidder out, a no-fill only when nothing ran, "level changed" only when a level
// changed. Pure and dependency-light (relative imports only) so the Node caption script can use it too.
import { bpsFor } from "./policy.ts";
import type { Decision, Opportunity, ProductRun } from "../data/types.ts";

export type AuctionKind = "nofill" | "single" | "tie" | "different";

/** 6-decimal base units as USDC text, "0.004". */
export function usdcText(b: string | number | bigint): string {
  const s = String(b).padStart(7, "0");
  const whole = s.slice(0, -6).replace(/^0+(?=\d)/, "");
  let frac = s.slice(-6).replace(/0+$/, "");
  if (frac.length < 3) frac = frac.padEnd(3, "0");
  return `${whole}.${frac}`;
}

/** "A, B and C" */
export function list(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const PROPER: Record<string, string> = { ethereum: "Ethereum", solana: "Solana", rfid: "RFID", usdc: "USDC" };
/** Capability ids in plain words: "crypto_storage" -> "crypto storage"; proper nouns keep their case. */
export const capWords = (c: string) =>
  c
    .split("_")
    .map((w) => PROPER[w.toLowerCase()] ?? w)
    .join(" ");
/** Same, sentence case for chips: "Crypto storage", "Ethereum", "RFID blocking". */
export const capChip = (c: string) => {
  const w = capWords(c);
  return w.charAt(0).toUpperCase() + w.slice(1);
};
export const numWord = (n: number) => ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
export const timesWord = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
export const DISCLAIMER = "One run, not a benchmark.";
/** Circle's USDC mint on Solana Devnet. A Devnet run's channels hold this token, so the site names it. */
export const CIRCLE_DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const CIRCLE_DEVNET_USDC_URL = `https://explorer.solana.com/address/${CIRCLE_DEVNET_USDC}?cluster=devnet`;
/** Lamports as test SOL with two significant digits ("0.0084"); exact lamports stay in the Inspector. */
export const solText = (lamports: string | number) => (Number(lamports) / 1e9).toLocaleString("en-US", { maximumSignificantDigits: 2 });
/** Storage rent in plain words and test SOL: "0.0034 locked", "0.0015 returned", "0.0015 locked and returned". */
export const rentSolWords = (t: { newRentLamports: string; reclaimedRentLamports: string }) => {
  const n = t.newRentLamports !== "0", r = t.reclaimedRentLamports !== "0";
  if (n && r && t.newRentLamports === t.reclaimedRentLamports) return `${solText(t.newRentLamports)} locked and returned`;
  return [n ? `${solText(t.newRentLamports)} locked` : null, r ? `${solText(t.reclaimedRentLamports)} returned` : null].filter(Boolean).join(", ") || "none";
};
/** One plain line under every fee and rent table. */
export const RENT_NOTE = "Storage rent is test SOL held while accounts exist: opening a channel locks it, closing returns most of it, and the channel account keeps a little until its reclaim window passes. Network fees are spent.";
/** Jev's levels in plain words (the landing's Jev sheet uses the same words). */
export const relevanceWords = (level: number) => ["Unrelated", "Broad match", "Partial fit", "Direct fit"][level] ?? `Level ${level}`;
export const intentWords = (level: number) => ["Just learning", "Exploring", "Comparing offers", "Ready to buy"][level] ?? `Level ${level}`;
/** "87% confident": Jev's own confidence field, never a class probability. */
export const confWords = (x: number) => `${Math.round(x * 100)}% confident`;
export const levelsText = (d: Pick<Decision, "relevanceLevel" | "commercialIntentLevel">) => `relevance ${d.relevanceLevel}, intent ${d.commercialIntentLevel}`;

export function auctionKind(o: Opportunity): AuctionKind {
  if (o.status === "no_fill" || !o.award) return "nofill";
  if (o.auction.bids.length <= 1) return "single";
  if (o.auction.tieBreakApplied) return "tie";
  return "different";
}

/** Rent in words, the same way for every transaction: "4,711,920 created", "2,039,280 reclaimed", or both. */
export function rentWords(t: { newRentLamports: string; reclaimedRentLamports: string }) {
  const n = (v: string) => Number(v).toLocaleString("en-US");
  const parts = [t.newRentLamports !== "0" ? `${n(t.newRentLamports)} created` : null, t.reclaimedRentLamports !== "0" ? `${n(t.reclaimedRentLamports)} reclaimed` : null].filter(Boolean);
  return parts.length ? parts.join(", ") : "none";
}

export function makeStory(run: ProductRun) {
  const usdc = usdcText;
  const nameOf = (id: string | null | undefined) => (id ? run.campaigns.find((c) => c.campaignId === id)?.businessName ?? id : "");
  const campaign = (id: string) => run.campaigns.find((c) => c.campaignId === id)!;
  const decisionFor = (o: Opportunity, campaignId: string, arm: "text_only" | "history") => o.decisions.find((d) => d.campaignId === campaignId && d.arm === arm);
  const topicWords = (o: Opportunity) => capChip(String(o.coarseIntent ?? ""));
  /** Bid the table gives a decision at the campaign's max bid, in base units (0 when it would not bid). */
  function tableBid(d: Decision): number {
    const bps = bpsFor(d.relevanceLevel, d.commercialIntentLevel) ?? 0;
    return Math.floor((Number(campaign(d.campaignId).maxBidBaseUnits) * bps) / 10000);
  }

  /** The winner's reason in two or three words. */
  function winnerCaption(o: Opportunity): string {
    const k = auctionKind(o);
    return k === "tie" ? "Won on the tie rule" : k === "single" ? "Only bidder" : k === "different" ? "Highest bid" : "No winner";
  }

  /** One sentence: how this auction was decided. */
  function auctionSentence(o: Opportunity): string {
    const k = auctionKind(o);
    if (k === "nofill") return noFillSentence(o);
    const w = nameOf(o.award!.campaignId);
    const price = `${usdc(o.award!.priceBaseUnits)} USDC`;
    const bids = o.auction.bids;
    if (k === "single") return `${w} was the only bidder and paid its own bid, ${price}.`;
    if (k === "tie") return `${list(bids.map((b) => nameOf(b.campaignId)))} ${bids.length === 2 ? "both" : "all"} bid ${price}; a tie rule fixed in the exchange code gave the slot to the lower campaign ID, ${w}.`;
    return `${list(bids.map((b) => `${nameOf(b.campaignId)} ${usdc(b.amountBaseUnits)}`))} USDC: the highest bid won, so ${w} paid ${price}.`;
  }

  /** Why nothing ran, from the exclusions. */
  function noFillSentence(o: Opportunity): string {
    const missing = Array.from(new Set(o.eligibility.excluded.flatMap((x) => x.missing)));
    const allMissingSame = o.eligibility.excluded.length > 0 && o.eligibility.excluded.every((x) => missing.every((m) => x.missing.includes(m)) || x.missing.some((m) => missing.includes(m)));
    const common = missing.filter((m) => o.eligibility.excluded.every((x) => x.missing.includes(m)));
    // "No agent was asked" only when the record has no calls: research arms can still ask excluded campaigns.
    const asked = o.decisions.length > 0;
    const research = " Agents were still asked for research; their answers could never count.";
    if (o.eligibility.eligible.length === 0 && common.length) return `Every campaign was missing ${list(common.map(capWords))}, so no campaign could enter the auction${asked ? "." + research : " and no agent was asked."}`;
    if (o.eligibility.eligible.length === 0 && allMissingSame) return `No campaign declared every required capability${asked ? ", so none could enter the auction." + research : ", so no agent was asked."}`;
    return o.decisions.length ? "Agents were asked, but no bid reached the auction." : "No campaign could enter the auction, so no agent was asked.";
  }

  /** Did history change this campaign's levels, and with them its bid? */
  function historyEffect(o: Opportunity, campaignId: string) {
    const b = decisionFor(o, campaignId, "text_only");
    const h = decisionFor(o, campaignId, "history");
    if (!b || !h) return null;
    const changed = b.relevanceLevel !== h.relevanceLevel || b.commercialIntentLevel !== h.commercialIntentLevel;
    const which = b.commercialIntentLevel !== h.commercialIntentLevel ? "intent" : "relevance";
    const sb = which === "intent" ? b.scores.intent : b.scores.relevance;
    const sh = which === "intent" ? h.scores.intent : h.scores.relevance;
    const lb = which === "intent" ? b.commercialIntentLevel : b.relevanceLevel;
    const lh = which === "intent" ? h.commercialIntentLevel : h.relevanceLevel;
    const bidB = tableBid(b), bidH = tableBid(h);
    const decisionChanged = b.decision !== h.decision;
    // "rose" only when no level went down and at least one went up; otherwise the copy says "changed".
    const dr = h.relevanceLevel - b.relevanceLevel, di = h.commercialIntentLevel - b.commercialIntentLevel;
    const rose = changed && dr >= 0 && di >= 0;
    return { b, h, changed, rose, which, sb, sh, lb, lh, bidB, bidH, bidChanged: bidB !== bidH, decisionChanged };
  }

  /** "Moved 2.38 to 2.52, enough to change its level from 2 to 3." or "Moved 1.93 to 1.97; both count as level 2." */
  function moveSentence(e: NonNullable<ReturnType<typeof historyEffect>>): string {
    const two = (n: number) => n.toFixed(2);
    if (e.changed) return `${e.which === "intent" ? "Intent" : "Relevance"} moved ${two(e.sb)} to ${two(e.sh)}, enough to change its level from ${e.lb} to ${e.lh}.`;
    return `Intent moved ${two(e.b.scores.intent)} to ${two(e.h.scores.intent)}; both count as level ${e.h.commercialIntentLevel}.`;
  }

  /** Frequency-cap exclusions across the run (empty when none happened). */
  function capEvents() {
    return run.opportunities.flatMap((o) => o.auction.notAdmitted.map((x) => ({ o, x })));
  }

  /** The opportunity that best shows history changing a bid: a paid one where the winner's level changed; else any change. */
  function featuredHistory() {
    for (const o of run.opportunities) {
      const w = o.award?.campaignId;
      const e = w ? historyEffect(o, w) : null;
      if (e && e.changed && e.bidChanged) return { o, campaignId: w!, e };
    }
    for (const o of run.opportunities)
      for (const c of run.campaigns) {
        const e = historyEffect(o, c.campaignId);
        if (e?.changed) return { o, campaignId: c.campaignId, e };
      }
    const o = run.opportunities.find((x) => x.decisions.some((d) => d.arm === "text_only"));
    const c = o?.decisions.find((d) => d.arm === "history")?.campaignId;
    return o && c ? { o, campaignId: c, e: historyEffect(o, c)! } : null;
  }

  const firstPaid = () => run.opportunities.find((o) => o.award && o.receipt && o.charge) ?? null;
  const firstTie = () => run.opportunities.find((o) => auctionKind(o) === "tie") ?? null;
  const firstNoFill = () => run.opportunities.find((o) => auctionKind(o) === "nofill") ?? null;
  const firstCap = () => capEvents()[0] ?? null;

  /** The same question asked earlier in the run, if any. */
  const earlierSameQuestion = (o: Opportunity) => run.opportunities.find((x) => x.n < o.n && x.question === o.question) ?? null;

  /** Exchange-clock position of an opportunity: earliest, and the gap to the next one in minutes. */
  function clockNote(o: Opportunity): string | null {
    const byTime = run.opportunities.slice().sort((a, b) => a.createdAt - b.createdAt);
    const i = byTime.indexOf(o);
    if (i !== 0 || byTime.length < 2 || byTime[0].n === 1) return null;
    const gap = Math.round((byTime[1].createdAt - o.createdAt) / 60000);
    return `On the exchange clock this question ran first${gap >= 5 ? `, about ${gap} minutes before the others` : ""}.`;
  }

  /** Same capabilities, max bid and ratings? Used to explain a tie in plain words. */
  function tieFacts(o: Opportunity) {
    const bids = o.auction.bids;
    const cs = bids.map((b) => campaign(b.campaignId));
    const sameCaps = cs.every((c) => [...c.declaredConstraints].sort().join() === [...cs[0].declaredConstraints].sort().join());
    const sameMax = cs.every((c) => c.maxBidBaseUnits === cs[0].maxBidBaseUnits);
    const sameLevels = bids.every((b) => b.levels === bids[0].levels);
    return { sameCaps, sameMax, sameLevels, max: cs[0]?.maxBidBaseUnits, levels: bids[0]?.levels };
  }

  const network = run.network;
  const onDevnet = run.network.kind === "devnet";
  const runDate = new Date(run.opportunities[0]?.createdAt ?? Date.parse(run.source.createdAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  /** The one phrase for what this site shows (header, Present, landing proof): a replay, of a run that was live on Devnet. */
  const runPhrase = onDevnet ? `Replay of a live Solana Devnet run, ${runDate}` : `Recorded run, hosted sandbox, ${runDate}`;

  /** The most instructive moment of the run for a newcomer, in priority order: a cap that kept a bidder out, an auction
   *  won on different bids, a tie, a no-fill. Null when the run had none of these. */
  function highlight(): { title: string; body: string; n: number } | null {
    const cap = firstCap();
    if (cap) {
      const { o, x } = cap;
      const same = earlierSameQuestion(o);
      return {
        n: o.n,
        title: `Where a rule kept an agent out: opportunity ${o.n}`,
        body: `${same ? "The same question was asked again. " : ""}${nameOf(x.campaignId)}'s agent said bid, but ${nameOf(x.campaignId)} had already been placed ${x.sessionAwards === 2 ? "twice" : `${x.sessionAwards} times`} in this session, so the frequency cap kept it out of the auction. ${o.award ? `${nameOf(o.award.campaignId)} won at ${usdc(o.award.priceBaseUnits)} USDC.` : "Nobody won."}`,
      };
    }
    const diff = run.opportunities.find((o) => auctionKind(o) === "different");
    if (diff) return { n: diff.n, title: `Where bids differed: opportunity ${diff.n}`, body: auctionSentence(diff) };
    const tie = firstTie();
    if (tie) return { n: tie.n, title: `Where a tie rule decided: opportunity ${tie.n}`, body: auctionSentence(tie) };
    const nf = firstNoFill();
    if (nf) return { n: nf.n, title: `Where nothing ran: opportunity ${nf.n}`, body: noFillSentence(nf) };
    return null;
  }

  /** "In opportunities 1 and 2 the bids tied; a tie rule decided." style summary of the other auctions, or "". */
  function otherAuctionsLine(exceptN: number | null): string {
    const ties = run.opportunities.filter((o) => o.n !== exceptN && auctionKind(o) === "tie").map((o) => o.n);
    const diffs = run.opportunities.filter((o) => o.n !== exceptN && auctionKind(o) === "different").map((o) => o.n);
    const parts: string[] = [];
    if (ties.length) parts.push(`In ${ties.length === 1 ? "opportunity" : "opportunities"} ${list(ties.map(String))} the bids tied and a tie rule fixed in the exchange code decided.`);
    if (diffs.length) parts.push(`In ${diffs.length === 1 ? "opportunity" : "opportunities"} ${list(diffs.map(String))} the highest bid won.`);
    return parts.join(" ");
  }


  const NET = onDevnet
    ? { name: "Solana Devnet", a: "Solana Devnet", the: "Solana Devnet", short: "Devnet", tx: "Devnet transaction", chip: "Live on Solana Devnet" }
    : { name: "hosted Solana sandbox", a: "a hosted Solana sandbox", the: "the hosted Solana sandbox", short: "Sandbox", tx: "Solana sandbox transaction", chip: "Hosted Solana sandbox" };
  const onePayer = run.channels.length > 1 && new Set(run.channels.map((c) => c.payer)).size === 1;
  /** The opportunities Present and the Overview feature, chosen from what actually happened. */
  const picks = () => {
    const paid = firstPaid();
    const auction = run.opportunities.find((o) => auctionKind(o) === "different") ?? firstTie() ?? paid;
    const hist = featuredHistory();
    const ev = paid ?? run.opportunities.find((o) => o.decisions.length) ?? null;
    const evMain = ev ? ev.decisions.find((d) => d.arm === "history" && d.retrieval && d.campaignId === ev.award?.campaignId) ?? ev.decisions.find((d) => d.arm === "history" && d.retrieval) ?? null : null;
    const evOther = ev ? ev.decisions.find((d) => d.arm === "history" && d.retrieval && d.campaignId !== evMain?.campaignId && ev.eligibility.excluded.some((x) => x.campaignId === d.campaignId)) ?? ev.decisions.find((d) => d.arm === "history" && d.retrieval && d.campaignId !== evMain?.campaignId) ?? null : null;
    return { paid, auction, hist, cap: firstCap(), nofill: firstNoFill(), ev, evMain, evOther };
  };
  return { picks, usdc, nameOf, tableBid, winnerCaption, auctionSentence, noFillSentence, historyEffect, moveSentence, capEvents, featuredHistory, firstPaid, firstTie, firstNoFill, firstCap, earlierSameQuestion, clockNote, tieFacts, network, onDevnet, runDate, runPhrase, highlight, otherAuctionsLine, NET, onePayer, topicWords };
}
export type Story = ReturnType<typeof makeStory>;
