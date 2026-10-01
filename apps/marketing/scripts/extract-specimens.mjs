#!/usr/bin/env node
// Build-time extraction for the AXP landing page.
// Reads ONLY artifacts/v3/replay/run.json + manifest.json (and, for the video, the recorded
// MP4 + walkthrough.srt) and writes src/data/run.generated.json: the small slice of the
// recorded run the page shows. Every run value on the page comes from this file.
//
// Never reads sandbox-topup.json, .env*, local-state/. Never copies agent ids, agent-run ids,
// rpc, payee or payer addresses, open salts, packet bytes, vectors or the Jev
// conversion-probability field. Fails the build on any broken arithmetic or count.
//
// When the artifacts are absent (a fresh clone), the committed run.generated.json is
// re-verified with the same asserts instead.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const repo = resolve(app, "../..");
const RUN = join(repo, "artifacts/v3/replay/run.json");
const MANIFEST = join(repo, "artifacts/v3/replay/manifest.json");
const VIDEO = join(repo, "artifacts/v3/recording/axp-v3-four-minute-demo.mp4");
const SRT = join(repo, "artifacts/v3/recording/walkthrough.srt");
const POSTER = join(repo, "artifacts/v3/recording/03-cached.jpg");
const OUT = join(app, "src/data/run.generated.json");
const MEDIA = join(app, "public/media");

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}
function finish(label) {
  if (failures.length) {
    console.error(`extract-specimens: ${failures.length} assertion(s) failed (${label}):`);
    for (const f of failures) console.error(`  x ${f}`);
    process.exit(1);
  }
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const B = (v) => BigInt(String(v));
const short = (h, head = 8, tail = 5) => (h.length <= head + tail + 3 ? h : `${h.slice(0, head)}...${h.slice(-tail)}`);
const NAMES = { "v3-clearvault": "ClearVault", "v3-keyforge": "KeyForge", "v3-leatherguard": "LeatherGuard" };
const STORY = ["v3-cached", "v3-offline", "v3-repeat", "v3-mobile"];
const BPS = { "2:2": 5000n, "2:3": 7500n, "3:2": 7500n, "3:3": 10000n };
/** The recorded bid policy, fit_intent_bid_v1 (packages/contracts computeBid): max bid x level weight. */
const policyBid = (rel, intent, maxBid) => {
  const bps = BPS[`${rel}:${intent}`];
  return bps ? (B(maxBid) * bps) / 10000n : null;
};
const firstSentences = (text, n = 2) => {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(" ");
};
const stripPrefix = (t) => t.replace(/^Inferred historical targeting hypothesis; not a campaign declaration\.\s*/, "").replace(/^Historical reference, not this campaign's capabilities\.\s*/, "");
const parseExample = (text) => {
  const body = stripPrefix(text);
  const m = body.match(/^Prompt:\s*([\s\S]*?)\nObserved creative:\s*([\s\S]*)$/);
  return m ? { prompt: m[1].trim(), creative: m[2].trim() } : { prompt: body, creative: "" };
};

/* ---------------- Verify a generated slice (used for both paths) ---------------- */
function verify(d) {
  assert(d.runId === "v3-wallet-acceptance", "runId");
  assert(d.counts.questions === 4, `4 questions (got ${d.counts.questions})`);
  assert(d.counts.decisions === 15, `15 agent decisions (got ${d.counts.decisions})`);
  assert(d.counts.auctions === 3, `3 auctions (got ${d.counts.auctions})`);
  assert(d.counts.noFill === 1, `1 no fill (got ${d.counts.noFill})`);
  assert(d.counts.receipts === 3, `3 receipts (got ${d.counts.receipts})`);
  assert(d.counts.events === 33, `33 exchange events (got ${d.counts.events})`);
  assert(d.counts.channels === 2, `2 settled channels (got ${d.counts.channels})`);
  const charges = d.charges.map((c) => B(c.amount));
  assert(charges.length === 3, "three charges");
  assert(charges.reduce((a, b) => a + b, 0n) === 10000n, "charges 4000 + 3000 + 3000 = 10000");
  assert(B(d.totals.paid) === 10000n, "total paid 10000");
  assert(B(d.totals.deposits) === 40000n, "deposits 40000");
  assert(B(d.totals.deposits) - B(d.totals.paid) === 30000n && B(d.totals.refunded) === 30000n, "40000 - 10000 = 30000 refunded");
  for (const ch of d.channels) {
    assert(B(ch.settled) + B(ch.refund) === B(ch.deposit), `${ch.campaign}: payout + refund = deposit`);
    let cum = 0n;
    for (const v of ch.vouchers) {
      cum += B(v.increment);
      assert(cum === B(v.cumulative), `${ch.campaign}: voucher ${v.sequence} cumulative`);
    }
    assert(cum === B(ch.settled), `${ch.campaign}: last voucher = payout`);
  }
  for (const t of d.turns) {
    for (const b of t.bids) {
      const dec = t.decisions.find((x) => x.campaign === b.campaign && x.arm === "history");
      assert(dec, `${t.id}: bid by ${b.campaign} has a history decision`);
      if (dec) assert(policyBid(dec.relevanceLevel, dec.intentLevel, d.campaigns[b.campaign].maxBid) === B(b.amount), `${t.id}: ${b.campaign} bid = computeBid(levels)`);
    }
    if (t.winner) {
      const sorted = [...t.bids].sort((a, b) => (B(a.amount) === B(b.amount) ? a.campaign.localeCompare(b.campaign) : B(b.amount) > B(a.amount) ? 1 : -1));
      assert(sorted[0].campaign === t.winner, `${t.id}: first price + campaign-ID tie rule picks the winner`);
      assert(B(t.price) === B(sorted[0].amount), `${t.id}: price = winning bid`);
    }
  }
  const text = JSON.stringify(d);
  for (const bad of [/conversion/i, /agentRunId/, /agent:[0-9a-f]{8}/, /openSalt/, /surfnet/, /"rpc"/, /"payee"/, /"payer"/, /DB4GyrEU/, /D7GzU2o4/, /packetBytes/, /sandbox-topup/, /customUrl/]) {
    assert(!bad.test(text), `forbidden content in slice: ${bad}`);
  }
  assert(!/\[(?:-?\d+(?:\.\d+)?,){64,}/.test(text), "no numeric arrays over 64 long");
  assert(text.length < 60000, `slice under 60KB (got ${text.length})`);
}

/* ---------------- Fresh-clone path: verify the committed slice ---------------- */
if (!existsSync(RUN) || !existsSync(MANIFEST)) {
  if (!existsSync(OUT)) {
    console.error("extract-specimens: artifacts/v3/replay is missing and no committed run.generated.json exists.");
    process.exit(1);
  }
  verify(JSON.parse(readFileSync(OUT, "utf8")));
  finish("committed slice");
  console.log("extract-specimens: artifacts absent; committed run.generated.json re-verified.");
  process.exit(0);
}

/* ---------------- Extract ---------------- */
const manifestBytes = readFileSync(MANIFEST);
const runBytes = readFileSync(RUN);
const manifest = JSON.parse(manifestBytes);
const run = JSON.parse(runBytes);
assert(manifest.files["run.json"] === sha256(runBytes), "run.json hash matches manifest");
const s = run.state;
const ex = s.exchange;

const campaigns = {};
for (const draft of s.drafts) {
  const c = draft.campaign;
  campaigns[c.campaignId] = {
    name: NAMES[c.campaignId],
    fictional: true,
    maxBid: c.maxBidBaseUnits,
    budgetCap: c.budgetCapBaseUnits,
    declared: c.declaredConstraints,
    approvedText: c.creatives[0]?.approvedText ?? null,
    destination: c.creatives[0]?.destinationURL ?? null,
  };
}
for (const ch of ex.channels) {
  const c = campaigns[ch.channelId.replace(/-channel$/, "")];
  if (c) {
    c.deposit = ch.depositBaseUnits;
    c.channelStatus = ch.status;
  }
}

const decisionsOf = (t) =>
  t.records.map((r) => {
    const call = run.callEvidence.find((c) => c.slotId === r.slotId);
    const a = call?.rawOutput?.answers ?? {};
    return {
      campaign: r.campaignId,
      name: NAMES[r.campaignId],
      arm: r.arm,
      category: r.category,
      decision: r.decision.decision,
      relevanceLevel: r.decision.relevanceLevel,
      intentLevel: r.decision.commercialIntentLevel,
      relevanceScore: a.relevance?.score ?? null,
      intentScore: a.intent?.score ?? null,
      ms: call ? Math.round(call.elapsedMs) : null,
      model: r.decision.engineProvenance?.model ?? null,
    };
  });

const byId = Object.fromEntries(s.turns.map((t) => [t.turnId, t]));
const turns = STORY.map((id) => {
  const t = byId[id];
  const o = t.outcome;
  return {
    id,
    scenario: t.scenario.id,
    runOrder: null,
    question: t.question,
    required: t.mandatoryCapabilities,
    status: o.status,
    execution: t.execution,
    organic: {
      excerpt: firstSentences(t.organic.answer),
      model: t.organic.model,
      advertiserMaterialReceived: t.organic.advertiserMaterialReceived,
    },
    eligible: t.eligibility.eligible.map((e) => e.campaignId),
    excluded: t.eligibility.excluded.map((e) => ({ campaign: e.campaignId, name: NAMES[e.campaignId], reason: e.reason })),
    bids: o.bids.map((b) => ({ campaign: b.campaignId, name: NAMES[b.campaignId], amount: b.amountBaseUnits, policy: b.bidPolicyVersion })),
    winner: o.award?.campaignId ?? null,
    winnerName: o.award ? NAMES[o.award.campaignId] : null,
    price: o.award?.priceBaseUnits ?? null,
    awardId: o.award?.id ?? null,
    decisions: decisionsOf(t),
  };
});
// The real chronology (story order differs): by exchange completion time. The mobile no-fill ran first.
[...turns]
  .sort((a, b) => byId[a.id].completedAt - byId[b.id].completedAt)
  .forEach((t, i) => {
    t.runOrder = i + 1;
  });

const charges = ex.charges.map((c) => ({ awardId: c.awardId, campaign: c.campaignId, name: NAMES[c.campaignId], amount: c.amountBaseUnits, status: c.status }));

// Receipts joined by awardId (receipts[] is not in turn order).
const receipts = turns
  .filter((t) => t.awardId)
  .map((t) => {
    const r = run.receipts.find((x) => x.receipt.awardId === t.awardId);
    assert(r, `${t.id}: receipt joined by awardId`);
    const charge = ex.charges.find((c) => c.awardId === t.awardId);
    assert(charge && charge.receiptHash === r.receiptHash, `${t.id}: charge carries the receipt hash`);
    return {
      turn: t.id,
      campaign: t.winner,
      name: t.winnerName,
      amount: charge.amountBaseUnits,
      schemaVersion: r.receipt.schemaVersion,
      mode: r.receipt.mode,
      publisherKeyId: r.receipt.publisherKeyId,
      awardId: short(r.receipt.awardId, 14, 4),
      opportunityId: short(r.receipt.opportunityId, 12, 4),
      creativeHash: short(r.receipt.creativeHash),
      renderAcknowledgementHash: short(r.receipt.renderAcknowledgementHash),
      receiptHash: short(r.receiptHash),
      signature: `${r.signature.slice(0, 16)}...`,
      fieldCount: Object.keys(r.receipt).length,
    };
  });

const channels = s.payments.map((p) => {
  const id = p.channelId.replace(/-channel$/, "");
  return {
    campaign: id,
    name: NAMES[id],
    deposit: p.depositBaseUnits,
    settled: p.settledBaseUnits,
    refund: p.refundBaseUnits,
    status: p.phase,
    vouchers: p.vouchers.map((v) => ({ sequence: Number(v.sequence), increment: v.incrementBaseUnits, cumulative: v.cumulativeAmountBaseUnits })),
    openTx: short(p.open.txSignature, 6, 4),
    closeTx: short(p.close.txSignature, 6, 4),
    feeAndRentLamports: p.close.feeAndRentLamports,
  };
});

// Evidence: what ClearVault's agent saw on the cached question (vector) and the offline note (lexical fallback).
const ret = (q, c) => run.retrieval.find((x) => x.question === q && x.campaignId === c)?.result;
const cachedQ = byId["v3-cached"].question;
const offlineQ = byId["v3-offline"].question;
const cv = ret(cachedQ, "v3-clearvault");
const off = ret(offlineQ, "v3-clearvault");
const ex0 = parseExample(cv.examples[0].text);
const evidence = {
  niche: run.evidence.niche,
  nicheLabel: run.evidence.niche.replace(/-/g, " "),
  method: cv.method,
  similarity: cv.examples[0].similarity,
  examples: cv.examples.length,
  hints: cv.hints.length,
  observedPrompt: ex0.prompt,
  observedCreative: ex0.creative,
  observedId: cv.examples[0].id,
  hintId: cv.hints[0].id,
  hintText: stripPrefix(cv.hints[0].text),
  hintTier: cv.hints[0].tier,
  embeddingModel: cv.model,
  neighbors: cv.neighborCount,
  offline: {
    method: off.method,
    fallback: off.fallback,
    topScore: Math.round(off.examples[0].similarity * 1000) / 1000,
    examples: off.examples.map((e) => ({ id: e.id, ...parseExample(e.text) })),
  },
  slice: {
    associations: run.manifest.counts.associations,
    prompts: run.manifest.counts.normalizedPrompts,
    creatives: run.manifest.counts.creatives,
    hints: run.manifest.counts.hints,
    niches: run.manifest.selection.niches.length,
  },
};
assert(evidence.method === "vector" && evidence.similarity === 1, "cached evidence: vector, similarity 1");
assert(evidence.observedPrompt === cachedQ, "the cached question was itself observed in ContextHint");
assert(evidence.offline.method === "lexical_fallback", "offline evidence: labelled lexical fallback");

const decisions = s.turns.flatMap((t) => t.records);
const exchangeEvents = run.events.length;
const policy = s.freeze.policy;

const out = {
  schema: "axp.landing-slice.v1",
  generatedFrom: { run: "artifacts/v3/replay/run.json", manifest: "artifacts/v3/replay/manifest.json" },
  runId: run.runId,
  manifestHash: sha256(manifestBytes),
  manifestHashShort: short(sha256(manifestBytes), 8, 5),
  runHashShort: short(manifest.files["run.json"], 8, 5),
  financialMode: manifest.financialMode,
  network: run.chainEvidence.network,
  presentation: manifest.presentation,
  recordedAt: manifest.createdAt.slice(0, 10),
  counts: {
    questions: s.turns.length,
    decisions: decisions.length,
    auctions: s.turns.filter((t) => t.outcome.status === "awarded" && t.outcome.bids.length > 0).length,
    ties: s.turns.filter((t) => t.outcome.bids.length > 1 && new Set(t.outcome.bids.map((b) => b.amountBaseUnits)).size === 1).length,
    noFill: s.turns.filter((t) => t.outcome.status === "no_fill").length,
    receipts: run.receipts.length,
    events: exchangeEvents,
    channels: s.payments.filter((p) => p.phase === "finalized").length,
    organicAnswers: s.turns.filter((t) => t.organic?.status === "completed").length,
  },
  policy: {
    bidPolicy: policy.bidPolicy,
    auction: policy.auction,
    maxBid: policy.maxBidBaseUnits,
    budgetCap: policy.totalCapBaseUnits,
    deposit: policy.depositBaseUnits,
    frequencyCap: policy.frequencyCap,
    floor: ex.opportunities[0].floorBaseUnits,
    slotId: ex.opportunities[0].slotId,
    publisherKeyId: run.publishers[0].publisherKeyId,
    agentModel: policy.model,
    organicModel: policy.organicModel,
  },
  campaigns,
  turns,
  charges,
  receipts,
  channels,
  totals: {
    deposits: s.payments.reduce((a, p) => a + B(p.depositBaseUnits), 0n).toString(),
    paid: s.payments.reduce((a, p) => a + B(p.settledBaseUnits), 0n).toString(),
    refunded: s.payments.reduce((a, p) => a + B(p.refundBaseUnits), 0n).toString(),
    networkFeeLamports: run.chainEvidence.networkFeeLamports,
    feeAndRentLamports: run.chainEvidence.grossFeeAndRentLamports,
    feeAndRentCapLamports: run.chainEvidence.feeAndRentCapLamports,
  },
  restart: {
    replayedTurns: s.turns.length,
    replayedReceipts: run.restart.duplicateReceipts.length,
    newCalls: run.restart.newCalls,
    newCharges: run.restart.newCharges,
    newSignatures: run.restart.newSignatures,
    newBroadcasts: run.restart.newBroadcasts,
    sameStateHash: run.restart.beforeHash === run.restart.afterHash,
  },
  evidence,
  limitations: run.limitations,
};

verify(out);
finish("fresh extraction");
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`extract-specimens: wrote ${OUT.replace(`${app}/`, "")} (${statSync(OUT).size} bytes), all asserts passed.`);

/* ---------------- Video, captions and poster (gitignored public/media) ---------------- */
if (existsSync(VIDEO) && existsSync(SRT)) {
  mkdirSync(MEDIA, { recursive: true });
  copyFileSync(VIDEO, join(MEDIA, "axp-v3-four-minute-demo.mp4"));
  if (existsSync(POSTER)) copyFileSync(POSTER, join(MEDIA, "axp-v3-poster.jpg"));
  // Captions are the recorded text; only the dashes are replaced so the page carries none.
  const vtt =
    "WEBVTT\n\n" +
    readFileSync(SRT, "utf8")
      .replace(/\r/g, "")
      .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2")
      .replace(/\s*[\u2014\u2013]\s*/g, ", ")
      .trim() +
    "\n";
  writeFileSync(join(MEDIA, "walkthrough.vtt"), vtt);
  console.log("extract-specimens: copied the recorded video, poster and captions into public/media.");
}
