// The projection itself, pure and isomorphic: the build (scripts/project-run.mjs) and the browser ("Run it live",
// projecting a hosted run's bundle) share it. No Node APIs: hashing and the check collector are injected.
// Fails loudly through `check` on: leaked strings, numeric arrays > 64, broken conservation, any bid != computeBid(levels).
import { canonical } from './canonical.ts';
import { computeBid, rankBids, missingCapabilities, BID_TABLE, BID_POLICY_VERSION } from './policy.ts';
import { sha256HexSync } from './sha256.mjs';

export const PROJECTION_VERSION = 'axp.product-run.v1';
/** Solana Devnet's genesis hash: a run is "live on Devnet" only when its own chain evidence says so. */
export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const asBytes = (b) => (typeof b === 'string' ? new TextEncoder().encode(b) : b);
const asText = (b) => (typeof b === 'string' ? b : new TextDecoder().decode(b));

export function project({ runBytes, manifestBytes, chainCheck = null, paths = { run: 'run.json', manifest: 'manifest.json' } }, ctx = {}) {
  const check = ctx.check ?? (() => {});
  const sha256 = (b) => (ctx.sha256Hex ?? sha256HexSync)(asBytes(b));
  const hashC = (v) => sha256(canonical(v));
  const run = JSON.parse(asText(runBytes));
  const manifestFile = JSON.parse(asText(manifestBytes));
  const runSha256 = sha256(runBytes);
  const s = run.state;
  const ex = s.exchange;
  const removed = new Map();
  const drop = (label, n = 1) => removed.set(label, (removed.get(label) ?? 0) + n);

  check('manifest records the run.json hash', manifestFile.files?.['run.json'] === runSha256, `${manifestFile.files?.['run.json']} vs ${runSha256}`);
  check('manifest run id = run id', manifestFile.runId === run.runId, `${manifestFile.runId} vs ${run.runId}`);
  check('manifest financial mode = run financial mode', manifestFile.financialMode === run.state.financialMode, `${manifestFile.financialMode} vs ${run.state.financialMode}`);

  // ---------- campaigns (draft order: ClearVault, KeyForge, LeatherGuard) ----------
  const recordFor = (campaignId) => s.turns.flatMap((t) => t.records).find((x) => x.campaignId === campaignId);
  const campaigns = s.drafts.map((d) => {
    const c = ex.campaigns.find((x) => x.campaignId === d.campaign.campaignId);
    const ch = ex.channels.find((x) => x.channelId === c.channelId);
    const creative = c.creatives[0];
    return {
      campaignId: c.campaignId,
      slug: c.campaignId.replace(/^v3-/, ''),
      businessName: d.businessName,
      fictional: d.fictional === true && creative.fictional === true,
      approved: d.approved,
      version: d.version,
      campaignVersionId: c.campaignVersionId,
      status: c.status,
      allowedIntents: c.allowedIntents,
      destination: c.destination,
      declaredConstraints: c.declaredConstraints,
      contextHints: d.contextHints,
      maxBidBaseUnits: c.maxBidBaseUnits,
      budgetCapBaseUnits: c.budgetCapBaseUnits,
      channelId: c.channelId,
      policyVersion: c.policyVersion,
      creative,
      creativeHash: hashC(creative),
      campaignHash: recordFor(c.campaignId)?.bindings?.campaignHash ?? null,
      funded: ch.status !== 'pending_open',
      channelStatus: ch.status,
      depositBaseUnits: ch.depositBaseUnits,
    };
  });
  const campaignByVersion = new Map(campaigns.map((c) => [c.campaignVersionId, c]));
  const campaignByAdvertiser = new Map(ex.campaigns.map((c) => [c.advertiserId, c.campaignId]));
  const campaignOrder = campaigns.map((c) => c.campaignId);

  // ---------- events (sanitized), opportunity -> turn map ----------
  const oppToTurn = new Map(ex.opportunities.map((o) => [o.id, o.turnId]));
  const awardToOpp = new Map(ex.awards.map((a) => [a.id, a.opportunityId]));
  const chargeToAward = new Map(ex.charges.map((c) => [c.id, c.awardId]));
  const decisionEvents = run.events.filter((e) => e.type === 'buyer_decision');
  const events = run.events
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((e) => {
      const d = e.data;
      let data;
      let opportunityId = d.opportunityId ?? (d.awardId ? awardToOpp.get(d.awardId) : d.chargeId ? awardToOpp.get(chargeToAward.get(d.chargeId)) : undefined);
      if (e.type === 'buyer_decision') {
        const dec = d.decision;
        data = {
          campaignId: campaignByAdvertiser.get(dec.advertiserId),
          decision: dec.decision,
          relevanceLevel: dec.relevanceLevel,
          commercialIntentLevel: dec.commercialIntentLevel,
          creativeVersionId: dec.creativeVersionId,
        };
        opportunityId = dec.opportunityId ?? opportunityId;
        drop('events: buyer_decision agentRunId, engine provenance, conversion field');
      } else if (e.type === 'v3_organic_completed') {
        const { agentId, ...rest } = d;
        if (agentId) drop('events: organic agentId');
        data = rest;
      } else data = d;
      const turnId = d.turnId ?? (opportunityId ? oppToTurn.get(opportunityId) : undefined) ?? null;
      return { seq: e.seq, type: e.type, at: e.at, turnId, opportunityId: opportunityId ?? null, data };
    });

  // ---------- opportunities in story order ----------
  const turns = s.turns.slice().sort((a, b) => a.scenario.questionIndex - b.scenario.questionIndex);
  const channelOf = new Map(s.payments.map((p) => [p.channelId, p]));
  let running = 0n;
  const opportunities = turns.map((t, i) => {
    const o = ex.opportunities.find((x) => x.id === t.opportunityId);
    const outcome = o.outcome;
    const turnDecisionEvents = decisionEvents.filter((e) => e.data.opportunityId === o.id || e.data.decision?.opportunityId === o.id);
    const competedVersions = new Set(turnDecisionEvents.map((e) => e.data.decision.campaignVersionId));
    const excludedIds = new Set((t.eligibility?.excluded ?? []).map((x) => x.campaignId));
    const rejectionReason = new Map((outcome.rejections ?? []).map((r) => [r.campaignId, r.reason]));

    const records = t.records
      .slice()
      .sort((a, b) => campaignOrder.indexOf(a.campaignId) - campaignOrder.indexOf(b.campaignId) || (a.arm === 'text_only' ? -1 : 1) - (b.arm === 'text_only' ? -1 : 1));
    const decisions = records.map((x) => {
      const ans = x.rawOutput.answers;
      const dec = x.decision;
      const competed = x.arm === 'history' && competedVersions.has(x.campaignVersionId);
      let auctionRole;
      if (x.arm === 'text_only') auctionRole = 'research';
      else if (competed) auctionRole = 'competed';
      else if (excludedIds.has(x.campaignId) && rejectionReason.get(x.campaignId) === 'frequency_cap') auctionRole = 'not_admitted';
      else if (excludedIds.has(x.campaignId)) auctionRole = 'excluded';
      else auctionRole = 'skipped';
      const rt = x.retrieval;
      if (x.packetBytes) drop('decisions: packetBytes');
      if (x.request) drop('decisions: request (kept requestHash)');
      if (dec.agentRunId) drop('decisions: agentRunId');
      if ('conversionProbability' in dec) drop('decisions: conversion-probability field');
      if (x.rawOutput) drop('decisions: rawOutput (kept scores, probabilities, rawOutputHash)');
      const creativeChoice = ans.creative.choice;
      return {
        slotId: x.slotId,
        callId: x.callId,
        campaignId: x.campaignId,
        campaignVersionId: x.campaignVersionId,
        arm: x.arm,
        category: x.category,
        callAdmitted: x.admitted,
        status: x.status,
        auctionRole,
        decision: dec.decision,
        relevanceLevel: dec.relevanceLevel,
        commercialIntentLevel: dec.commercialIntentLevel,
        scores: { relevance: ans.relevance.score, intent: ans.intent.score },
        confidence: { relevance: ans.relevance.confidence, intent: ans.intent.confidence, creative: ans.creative.confidence ?? null },
        probabilities: { relevance: ans.relevance.probabilities, intent: ans.intent.probabilities },
        legend: { relevance: ans.relevance.legend, intent: ans.intent.legend },
        creative: { choice: creativeChoice, probability: ans.creative.probabilities?.[creativeChoice] ?? null, noFitProbability: ans.creative.probabilities?.no_fit ?? null },
        sufficient: ans.sufficient?.noul ?? null,
        reasonCodes: dec.reasonCodes,
        creativeVersionId: dec.creativeVersionId,
        elapsedMs: x.elapsedMs,
        usage: x.usage,
        engine: {
          engine: dec.engineProvenance.engine,
          model: dec.engineProvenance.model,
          transportMode: dec.engineProvenance.transportMode,
          rubricHash: dec.engineProvenance.rubricHash,
          outcome: dec.engineProvenance.outcome,
        },
        timing: { admittedAt: x.admittedAt, startedAt: x.startedAt, responseAt: x.responseAt, completedAt: x.completedAt },
        packet: x.packet,
        packetHash: x.packetHash,
        requestHash: x.requestHash,
        rawOutputHash: x.rawOutputHash,
        inputHash: x.inputHash,
        bindings: {
          questionHash: x.bindings.questionHash,
          campaignHash: x.bindings.campaignHash,
          manifestHash: x.bindings.manifestHash,
          sourceHash: x.bindings.sourceHash,
          profileHash: x.bindings.profileHash,
          retrievalHash: x.bindings.retrievalHash,
        },
        retrieval: rt
          ? {
              method: rt.method,
              fallback: rt.fallback,
              model: rt.model,
              dimension: rt.dimension,
              revision: rt.revision,
              historyStatus: rt.historyStatus,
              queryTextHash: rt.queryTextHash,
              examples: rt.examples.map((e) => ({ id: e.id, similarity: e.similarity, hintIds: e.hintIds ?? [] })),
              hintIds: rt.hints.map((h) => h.id),
              contrastIds: (rt.profile?.contrastExamples ?? []).map((c) => c.id),
              neighbors: rt.neighbors.map((n) => ({ similarity: n.similarity, associationIds: n.associationIds })),
              neighborCount: rt.neighborCount,
              independentPromptCount: rt.independentPromptCount,
              qualityFlags: rt.qualityFlags,
              profileId: rt.profile?.profileId ?? null,
            }
          : null,
      };
    });
    if (t.records.some((x) => x.retrieval?.queryVectorId != null)) drop('decisions: query vector ids');

    // auction
    const levelsOf = (campaignId) => {
      const h = decisions.find((d) => d.campaignId === campaignId && d.arm === 'history');
      return h ? `${h.relevanceLevel}:${h.commercialIntentLevel}` : null;
    };
    // Budget available at auction time: cap (or deposit) minus charges accepted and awards reserved before this opportunity.
    const availableAt = (c) => {
      const prior = ex.awards.filter((a) => a.campaignId === c.campaignId && a.createdAt < o.createdAt).reduce((n, a) => n + BigInt(a.priceBaseUnits), 0n);
      const deposit = BigInt(channelOf.get(c.channelId)?.depositBaseUnits ?? '0');
      return { campaign: (BigInt(c.budgetCapBaseUnits) - prior).toString(), channel: (deposit - prior).toString() };
    };
    const bids = outcome.bids.map((b) => {
      const c = campaigns.find((x) => x.campaignId === b.campaignId);
      const h = decisions.find((d) => d.campaignId === b.campaignId && d.arm === 'history');
      const av = availableAt(c);
      const re = computeBid({ decision: h.decision, relevanceLevel: h.relevanceLevel, commercialIntentLevel: h.commercialIntentLevel }, c, av.campaign, av.channel, o.floorBaseUnits);
      check(`bid ${t.turnId}/${b.campaignId} = computeBid(${levelsOf(b.campaignId)})`, re.status === 'bid' && re.amountBaseUnits === b.amountBaseUnits, `${re.amountBaseUnits} vs ${b.amountBaseUnits}`);
      check(`bid ${t.turnId}/${b.campaignId} policy version`, b.bidPolicyVersion === BID_POLICY_VERSION);
      return { bidId: b.id, campaignId: b.campaignId, amountBaseUnits: b.amountBaseUnits, levels: levelsOf(b.campaignId), bps: re.bps ?? null, maxBidBaseUnits: c.maxBidBaseUnits, availableCampaignBaseUnits: av.campaign, availableChannelBaseUnits: av.channel, bidPolicyVersion: b.bidPolicyVersion };
    });
    const { ranked, tieBreakApplied } = rankBids(bids);
    const award = outcome.award ?? null;
    if (award) check(`auction ${t.turnId} winner by rank`, ranked[0]?.campaignId === award.campaignId && award.winningBidId === ranked[0]?.bidId);
    const notAdmitted = (t.eligibility?.excluded ?? [])
      .filter((x) => x.reason === 'frequency_cap')
      .map((x) => {
        const h = decisions.find((d) => d.campaignId === x.campaignId && d.arm === 'history');
        const prior = ex.awards.filter((a) => a.campaignId === x.campaignId && a.randomSessionId === o.randomSessionId && a.createdAt < o.createdAt).length;
        return { campaignId: x.campaignId, reason: x.reason, agentDecision: h?.decision ?? null, levels: h ? `${h.relevanceLevel}:${h.commercialIntentLevel}` : null, sessionAwards: prior, frequencyCap: s.freeze.policy.frequencyCap };
      });
    const excluded = (t.eligibility?.excluded ?? []).map((x) => {
      const c = campaigns.find((y) => y.campaignId === x.campaignId);
      return { campaignId: x.campaignId, reason: x.reason, missing: x.reason === 'missing_constraint' ? missingCapabilities(o.taskConstraints, c.declaredConstraints) : [] };
    });

    let delivery = null, receipt = null, charge = null, voucher = null;
    if (award) {
      const ch = ex.charges.find((c) => c.awardId === award.id);
      const rc = run.receipts.find((r) => r.receipt.awardId === award.id); // join by awardId, never by array position
      const pay = channelOf.get(ch.channelId);
      const v = pay.vouchers.find((x) => x.chargeId === ch.id);
      const ack = { awardId: award.id, creativeHash: award.creativeHash, domInserted: true, sponsoredLabelPresent: true };
      delivery = {
        deliveryId: ch.delivery.id,
        status: ch.delivery.status,
        receivedAt: ch.delivery.receivedAt,
        msAfterAward: ch.delivery.receivedAt - award.createdAt,
        acknowledgement: ack,
        renderAcknowledgementHash: rc.receipt.renderAcknowledgementHash,
      };
      receipt = { chargeId: rc.chargeId, fields: rc.receipt, receiptHash: rc.receiptHash, signature: rc.signature, recordedOnReplay: rc.recordedOnReplay };
      charge = { id: ch.id, awardId: ch.awardId, amountBaseUnits: ch.amountBaseUnits, sequence: ch.sequence, status: ch.status, acceptedAt: ch.acceptedAt, channelId: ch.channelId, receiptHash: ch.receiptHash, campaignId: ch.campaignId };
      voucher = {
        channelId: ch.channelId,
        chargeId: v.chargeId,
        sequence: Number(v.sequence),
        status: v.status,
        incrementBaseUnits: v.incrementBaseUnits,
        cumulativeAmountBaseUnits: v.cumulativeAmountBaseUnits,
        payloadHash: v.payloadHash,
        voucherRecordHash: v.voucherRecordHash,
      };
      running += BigInt(ch.amountBaseUnits);
    }
    if (o.outcome?.award?.renderTokenHash) drop('awards: renderTokenHash');
    const org = t.organic;
    if (org.agentId || org.provenance?.agentId) drop('organic: agentId');
    return {
      n: i + 1,
      scenarioId: t.scenario.id,
      turnId: t.turnId,
      questionIndex: t.scenario.questionIndex,
      paired: t.scenario.paired,
      question: t.question,
      questionHash: t.records[0]?.bindings?.questionHash ?? null,
      turnInput: { scenario: t.scenario, turnId: t.turnId, question: t.question, mandatoryCapabilities: t.mandatoryCapabilities, financialMode: t.financialMode },
      turnInputHash: t.inputHash,
      mandatoryCapabilities: t.mandatoryCapabilities,
      softPreferences: o.softPreferences,
      floorBaseUnits: o.floorBaseUnits,
      opportunityId: o.id,
      slotId: o.slotId,
      publisherId: o.publisherId,
      randomSessionId: o.randomSessionId,
      coarseIntent: o.coarseIntent,
      destination: o.destination,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      requestedAt: t.requestedAt,
      completedAt: t.completedAt,
      status: outcome.status,
      execution: t.execution,
      organic: {
        answer: org.answer,
        model: org.model,
        effort: org.effort,
        requestId: org.requestId,
        requestedAt: org.requestedAt,
        completedAt: org.completedAt,
        completionHash: org.completionHash,
        inputHash: org.inputHash,
        advertiserMaterialReceived: org.advertiserMaterialReceived,
        suppliedPrompt: org.suppliedPrompt,
        attestation: org.provenance?.attestation ?? null,
        engine: org.provenance?.engine ?? null,
        execution: org.provenance?.execution ?? null,
        toolUse: org.provenance?.toolUse ?? null,
      },
      eligibility: {
        eligible: (t.eligibility?.eligible ?? []).map((c) => c.campaignId),
        excluded,
        financialEligibilityCheckedAtAuction: t.eligibility?.financialEligibilityCheckedAtAuction ?? false,
      },
      decisions,
      auction: {
        status: outcome.status,
        bids: ranked,
        rejections: (outcome.rejections ?? []).map((r) => ({ campaignId: r.campaignId, reason: r.reason })),
        notAdmitted,
        winnerCampaignId: award?.campaignId ?? null,
        tieBreakApplied,
      },
      award: award
        ? {
            id: award.id,
            campaignId: award.campaignId,
            campaignVersionId: award.campaignVersionId,
            channelId: award.channelId,
            priceBaseUnits: award.priceBaseUnits,
            creative: award.creative,
            creativeHash: award.creativeHash,
            creativeVersionId: award.creativeVersionId,
            createdAt: award.createdAt,
            expiresAt: award.expiresAt,
            status: award.status,
            winningBidId: award.winningBidId,
            payee: award.payee,
          }
        : null,
      delivery,
      receipt,
      charge,
      voucher,
      runningTotalBaseUnits: running.toString(),
    };
  });

  // ---------- evidence reduced to referenced ids ----------
  const recIds = new Set();
  const hintIds = new Set();
  for (const t of s.turns)
    for (const x of t.records) {
      const rt = x.retrieval;
      if (!rt) continue;
      rt.examples.forEach((e) => { recIds.add(e.id); (e.hintIds ?? []).forEach((h) => hintIds.add(h)); });
      rt.neighbors.forEach((n) => n.associationIds.forEach((a) => recIds.add(a)));
      (rt.profile?.contrastExamples ?? []).forEach((c) => recIds.add(c.id));
      rt.hints.forEach((h) => hintIds.add(h.id));
    }
  const evRecords = run.evidence.records.filter((r) => recIds.has(r.id)).map((r) => ({
    id: r.id,
    mappingId: r.mappingId,
    promptId: r.promptId,
    promptText: r.promptText,
    normalizedHash: r.normalizedHash,
    creativeId: r.creativeId,
    creativeContentHash: r.creativeContentHash,
    advertiser: r.advertiser,
    creativeText: r.creativeText,
    hintIds: r.hintIds,
    source: { source: r.source?.source ?? null, probeNiche: r.source?.probeNiche ?? null, mappingNiche: r.source?.mappingNiche ?? null },
  }));
  const evHints = run.evidence.hints.filter((h) => hintIds.has(h.id)).map((h) => ({
    id: h.id,
    text: h.text,
    tier: h.tier,
    modelVersion: h.modelVersion,
    qualityFlags: h.qualityFlags,
    supportingCreativeCount: h.supportingCreativeIds.length,
  }));
  drop('evidence: full catalogue records', run.evidence.records.length - evRecords.length);
  drop('evidence: full catalogue hints', run.evidence.hints.length - evHints.length);
  drop('top-level retrieval duplicate', run.retrieval?.length ?? 0);
  drop('top-level callEvidence', run.callEvidence?.length ?? 0);
  const hintTiers = {};
  for (const h of run.evidence.hints) hintTiers[h.tier] = (hintTiers[h.tier] ?? 0) + 1;

  // ---------- channels, chain evidence ----------
  const chainChannels = run.chainEvidence.channels;
  const tx = (ce, sig, kind) => {
    const t = ce.originalTransactions.find((x) => x.txSignature === sig);
    const st = ce.transactionStatuses.find((x) => x.slot === t.slot);
    return {
      kind,
      signature: t.txSignature,
      slot: t.slot,
      blockTime: t.blockTime,
      finality: t.finality,
      confirmationStatus: st?.confirmationStatus ?? null,
      err: st?.err ?? null,
      tokenDeltas: t.tokenDeltas,
      networkFeeLamports: t.networkFeeLamports,
      newRentLamports: t.newRentLamports,
      reclaimedRentLamports: t.reclaimedRentLamports,
      logs: t.logs,
    };
  };
  const channels = s.payments.map((p) => {
    const ce = chainChannels.find((c) => c.channelId === p.channelId);
    const campaign = campaigns.find((c) => c.channelId === p.channelId);
    drop('channels: rpc url, settlementLink, openSalt');
    drop('chain: absolute balances (pre/post lamports, token balances, postSnapshot)', ce.originalTransactions.length);
    return {
      channelId: p.channelId,
      campaignId: campaign.campaignId,
      network: p.network,
      phase: p.phase,
      openStatus: p.openStatus,
      closeStatus: p.closeStatus,
      reconciliationRequired: p.reconciliationRequired,
      protocolChannelId: p.protocolChannelId,
      termsHash: p.termsHash,
      genesisHash: p.genesisHash,
      program: p.program,
      mint: p.mint,
      payer: p.payer,
      payee: p.payee,
      depositBaseUnits: p.depositBaseUnits,
      authorizedBaseUnits: p.authorizedBaseUnits,
      acceptedBaseUnits: p.acceptedBaseUnits,
      settledBaseUnits: p.settledBaseUnits,
      refundBaseUnits: p.refundBaseUnits,
      estimatedGrossFeeAndRentLamports: p.estimatedGrossFeeAndRentLamports,
      escrowClosed: ce.escrowClosed,
      chainStatus: ce.status,
      remainingChannelRentLamports: ce.remainingChannelRentLamports,
      vouchers: p.vouchers.map((v) => {
        const oppN = opportunities.find((o) => o.charge?.id === v.chargeId)?.n ?? null;
        return { sequence: Number(v.sequence), chargeId: v.chargeId, opportunityN: oppN, status: v.status, incrementBaseUnits: v.incrementBaseUnits, cumulativeAmountBaseUnits: v.cumulativeAmountBaseUnits, payloadHash: v.payloadHash, voucherRecordHash: v.voucherRecordHash };
      }).sort((a, b) => a.sequence - b.sequence),
      open: tx(ce, p.open.txSignature, 'open'),
      close: tx(ce, p.close.txSignature, 'close'),
    };
  });
  const unfunded = ex.channels.filter((c) => c.status === 'pending_open').map((c) => ({
    channelId: c.channelId,
    campaignId: campaigns.find((x) => x.channelId === c.channelId).campaignId,
    status: c.status,
    depositBaseUnits: c.depositBaseUnits,
  }));
  const chainTxs = channels
    .flatMap((c) => [c.open, c.close].map((t) => ({ slot: t.slot, kind: t.kind, channelId: c.channelId, campaignId: c.campaignId, signature: t.signature, blockTime: t.blockTime, finality: t.finality })))
    .sort((a, b) => a.slot - b.slot);

  const sum = (xs) => xs.reduce((n, x) => n + BigInt(x), 0n).toString();
  const allTx = channels.flatMap((c) => [c.open, c.close]);
  const fees = {
    networkFeeLamports: sum(allTx.map((t) => t.networkFeeLamports)),
    newRentLamports: sum(allTx.map((t) => t.newRentLamports)),
    reclaimedRentLamports: sum(allTx.map((t) => t.reclaimedRentLamports)),
    grossFeeAndRentLamports: sum(allTx.flatMap((t) => [t.networkFeeLamports, t.newRentLamports])),
    capLamports: s.freeze.policy.aggregateFeeRentLamports,
  };
  const totals = {
    depositsBaseUnits: sum(channels.map((c) => c.depositBaseUnits)),
    chargesBaseUnits: sum(opportunities.filter((o) => o.charge).map((o) => o.charge.amountBaseUnits)),
    paidBaseUnits: sum(channels.map((c) => c.settledBaseUnits)),
    refundedBaseUnits: sum(channels.map((c) => c.refundBaseUnits)),
    aggregateChargeCapBaseUnits: s.freeze.policy.aggregateChargeCapBaseUnits,
  };

  // ---------- network: where this run's own money moved ----------
  const genesis = new Set(channels.map((c) => c.genesisHash));
  const onDevnet = channels.length > 0 && [...genesis].every((g) => g === DEVNET_GENESIS);
  check('one network for every channel', genesis.size <= 1, [...genesis].join(', '));
  const explorer = (kind, id) => `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;
  if (onDevnet) {
    for (const ch of channels) {
      ch.open.explorerUrl = explorer('tx', ch.open.signature);
      ch.close.explorerUrl = explorer('tx', ch.close.signature);
      ch.explorerUrl = ch.protocolChannelId ? explorer('address', ch.protocolChannelId) : null;
    }
    for (const t of chainTxs) t.explorerUrl = explorer('tx', t.signature);
  }
  // Optional sibling evidence (<run dir>/../chain-check.json): explorer links, payers and the funding transaction, as
  // recorded by the run itself. Used only when the run is on Devnet and only after its signatures match the run's own.
  let chainExtras = null;
  if (onDevnet && chainCheck) {
    const devUrl = (u) => typeof u === 'string' && u.startsWith('https://explorer.solana.com/') && u.endsWith('?cluster=devnet');
    for (const ch of channels) {
      const cc = chainCheck.channels?.find((x) => x.channelId === ch.channelId);
      check(`chain-check ${ch.channelId}: signatures match the run`, !!cc && cc.openSignature === ch.open.signature && cc.closeSignature === ch.close.signature);
      check(`chain-check ${ch.channelId}: explorer links on devnet`, !!cc && [cc.explorer?.channel, cc.explorer?.open, cc.explorer?.close].every(devUrl));
      if (cc?.explorer) {
        ch.explorerUrl = cc.explorer.channel;
        ch.open.explorerUrl = cc.explorer.open;
        ch.close.explorerUrl = cc.explorer.close;
      }
    }
    for (const t of chainTxs) t.explorerUrl = channels.find((c) => c.channelId === t.channelId)[t.kind].explorerUrl;
    const f = chainCheck.funding;
    check('chain-check funding link on devnet', !f || devUrl(f.explorer));
    chainExtras = {
      funding: f ? { signature: f.signature, explorerUrl: f.explorer, slot: f.slot, lamportsPerPayer: f.lamportsPerPayer, tokenBaseUnitsPerPayer: f.tokenBaseUnitsPerPayer, payers: f.payers } : null,
      payers: channels.map((c) => ({ campaignId: c.campaignId, address: c.payer, explorerUrl: explorer('address', c.payer) })),
      publisher: { address: channels[0]?.payee ?? null, explorerUrl: channels[0]?.payee ? explorer('address', channels[0].payee) : null },
    };
  }
  const network = onDevnet
    ? { kind: 'devnet', label: 'Solana Devnet', genesisHash: DEVNET_GENESIS, programExplorerUrl: channels[0]?.program ? explorer('address', channels[0].program) : null }
    : { kind: 'sandbox', label: 'Hosted Solana sandbox', genesisHash: [...genesis][0] ?? null, programExplorerUrl: null };

  // ---------- policy, model, dataset ----------
  const anyPacket = s.turns.flatMap((t) => t.records)[0].packet;
  const m = run.manifest;
  const projection = {
    schema: PROJECTION_VERSION,
    source: {
      runId: run.runId,
      runSchema: run.schemaVersion,
      createdAt: run.createdAt,
      runPath: paths.run,
      runSha256,
      manifestPath: paths.manifest,
      manifestSha256: sha256(manifestBytes),
      manifestCreatedAt: manifestFile.createdAt,
      financialMode: manifestFile.financialMode,
      presentation: manifestFile.presentation,
      network: run.chainEvidence.network,
      chainCheckedAt: run.chainEvidence.at,
    },
    network,
    chainExtras,
    counts: {
      opportunities: opportunities.length,
      decisions: opportunities.reduce((n, o) => n + o.decisions.length, 0),
      auctions: opportunities.filter((o) => o.status === 'awarded').length,
      noFill: opportunities.filter((o) => o.status === 'no_fill').length,
      receipts: opportunities.filter((o) => o.receipt).length,
      events: events.length,
      channels: channels.length,
      txs: chainTxs.length,
      inputTokens: s.model.usage.inputTokens,
      outputTokens: s.model.usage.outputTokens,
    },
    policy: {
      ...s.freeze.policy,
      floorBaseUnits: opportunities[0].floorBaseUnits,
      bidTable: BID_TABLE,
      tieBreak: 'Equal amounts are ordered by campaign ID ascending.',
      reasonOrder: ['campaign_paused', 'policy_excluded', 'missing_constraint', 'channel_unavailable', 'below_floor', 'frequency_cap', 'budget_unavailable'],
      rubric: {
        relevance: { instructions: anyPacket.questions.relevance.instructions, criteria: anyPacket.questions.relevance.criteria },
        intent: { instructions: anyPacket.questions.intent.instructions, criteria: anyPacket.questions.intent.criteria },
      },
    },
    model: {
      version: s.model.version,
      frozen: s.model.frozen,
      freezeHash: s.model.freezeHash,
      policyHash: s.model.policyHash,
      transportMode: s.model.transportMode,
      maxCalls: s.model.maxCalls,
      admittedCalls: s.model.admittedCalls,
      completedCalls: s.model.completedCalls,
      failedCalls: s.model.failedCalls,
      uncertainCalls: s.model.uncertainCalls,
      categories: s.model.categories,
      usage: s.model.usage,
      organicAllowance: s.organicAllowance,
    },
    freeze: { at: s.freeze.at, contentHash: s.freeze.contentHash, campaignVersionsCreatedAt: s.laboratory.exchange.events.map((e) => ({ campaignId: e.data.campaignId, campaignVersionId: e.data.campaignVersionId, at: e.at })) },
    dataset: {
      snapshotId: m.snapshotId,
      capturedAt: m.capturedAt,
      niche: run.evidence.niche,
      manifestContentHash: m.contentHash,
      catalogueContentHash: run.evidence.contentHash,
      source: { readOnly: m.source.readOnly, transaction: m.source.transaction, embeddingCalls: m.source.embeddingCalls, embeddingRevision: m.source.embeddingRevision },
      selection: { version: m.selection.version, niches: m.selection.niches, promptPattern: m.selection.promptPattern, limits: m.selection.limits, normalization: m.selection.normalization },
      counts: m.counts,
      omissions: m.omissions,
      hintTiers,
      limitations: m.limitations,
    },
    campaigns,
    publisher: {
      displayName: 'Demo AI app (the publisher)',
      publisherId: run.publishers[0].publisherId,
      legacyIdNote: 'ID inherited from an earlier prototype.',
      publisherKeyId: run.publishers[0].publisherKeyId,
      publicKeyPEM: run.publishers[0].publicKeyPEM,
      payee: run.publishers[0].payee,
      slotId: opportunities[0].slotId,
      floorBaseUnits: opportunities[0].floorBaseUnits,
    },
    opportunities,
    evidence: { records: evRecords, hints: evHints },
    channels,
    unfunded,
    chainTxs,
    fees,
    totals,
    events,
    restart: run.restart,
    limitations: { run: run.limitations, dataset: m.limitations },
  };
  drop('laboratory (synthetic, never acceptance)');
  drop('freeze.drafts and freeze.manifest duplicates', 2);
  return { projection, removed: [...removed.entries()].filter(([, n]) => n > 0).map(([field, count]) => ({ field, count })) };
}

// ---------- guards ----------
export const FORBIDDEN = ['surfnet', 'customUrl', 'openSalt', '"agentId"', 'agentRunId', 'packetBytes', 'PRIVATE KEY', '"rpc"', ':8899', 'conversionProbability', 'sandbox-topup'];
export function scanForbidden(text) {
  return FORBIDDEN.filter((f) => text.includes(f));
}
export function longNumericArrays(value, path = '$', out = []) {
  if (Array.isArray(value)) {
    if (value.length > 64 && value.every((x) => typeof x === 'number')) out.push(`${path} (${value.length})`);
    value.forEach((v, i) => longNumericArrays(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) longNumericArrays(v, `${path}.${k}`, out);
  return out;
}

/** Structure, conservation and hash bindings. No run-specific counts: every count is checked against the bundle's own
 *  records (manifest, model counters, chain evidence totals), so a different run passes or fails on its own terms. */
export function structuralChecks(p, check, raw = null) {
  const c = p.counts;
  const opps = p.opportunities;
  check('count: at least one opportunity', c.opportunities > 0, String(c.opportunities));
  check('count: decisions = sum of per-opportunity decisions', c.decisions === opps.reduce((n, o) => n + o.decisions.length, 0));
  check('count: auctions + no-fills = opportunities', c.auctions + c.noFill === c.opportunities, `${c.auctions} + ${c.noFill} vs ${c.opportunities}`);
  check('count: receipts = awards = charges', c.receipts === opps.filter((o) => o.award).length && c.receipts === opps.filter((o) => o.charge).length);
  check('count: vouchers = charges', p.channels.reduce((n, ch) => n + ch.vouchers.length, 0) === opps.filter((o) => o.charge).length);
  check('count: 2 chain transactions per funded channel', c.txs === 2 * c.channels, `${c.txs} vs 2 x ${c.channels}`);
  if (raw) {
    const m = raw.state.model;
    check('manifest: model completed calls = decisions', m.completedCalls === c.decisions && m.admittedCalls === c.decisions, `${m.completedCalls}/${m.admittedCalls} vs ${c.decisions}`);
    check('manifest: no failed or uncertain calls', (m.failedCalls ?? 0) === 0 && (m.uncertainCalls ?? 0) === 0);
    check('manifest: signed receipts = receipts', raw.receipts.length === c.receipts, `${raw.receipts.length} vs ${c.receipts}`);
    check('manifest: events = projected events', raw.events.length === c.events);
    check('manifest: run id agrees', raw.runId === raw.state.runId && raw.restart.runId === raw.runId && raw.chainEvidence.runId === raw.runId);
    const ce = raw.chainEvidence;
    check('manifest: chain evidence fees = transactions', String(ce.networkFeeLamports) === p.fees.networkFeeLamports, `${ce.networkFeeLamports} vs ${p.fees.networkFeeLamports}`);
    check('manifest: chain evidence gross fee and rent = transactions', String(ce.grossFeeAndRentLamports) === p.fees.grossFeeAndRentLamports);
    check('manifest: chain evidence reports all checks passed', ce.allChecksPassed === true);
    check('manifest: paid deliveries within the frozen limit', c.receipts <= Number(raw.state.freeze.policy.maxPaidDeliveries ?? c.receipts));
  }
  const evIds = new Set(p.evidence.records.map((r) => r.id));
  const hintIds = new Set(p.evidence.hints.map((h) => h.id));
  check('evidence: every referenced record and hint is present', opps.every((o) => o.decisions.every((d) => !d.retrieval || (d.retrieval.examples.every((e) => evIds.has(e.id)) && d.retrieval.hintIds.every((h) => hintIds.has(h))))));
  check('story order: questionIndex 0..n-1', opps.every((o, i) => o.questionIndex === i));
  check('events sorted by seq', p.events.every((e, i) => e.seq === i + 1));
  check('chain txs sorted by slot', p.chainTxs.every((t, i, a) => i === 0 || a[i - 1].slot < t.slot));
  const charges = opps.filter((o) => o.charge).reduce((n, o) => n + BigInt(o.charge.amountBaseUnits), 0n);
  check('charges sum to the total', charges.toString() === p.totals.chargesBaseUnits);
  let run = 0n;
  check('running totals accumulate charges in story order', opps.every((o) => { run += BigInt(o.charge?.amountBaseUnits ?? '0'); return o.runningTotalBaseUnits === run.toString(); }));
  for (const ch of p.channels) {
    check(`conservation ${ch.campaignId}: settled + refund = deposit`, BigInt(ch.settledBaseUnits) + BigInt(ch.refundBaseUnits) === BigInt(ch.depositBaseUnits));
    check(`conservation ${ch.campaignId}: close deltas = settled, refund`, ch.close.tokenDeltas.publisher === ch.settledBaseUnits && ch.close.tokenDeltas.payer === ch.refundBaseUnits);
    check(`conservation ${ch.campaignId}: open delta = -deposit`, ch.open.tokenDeltas.payer === `-${ch.depositBaseUnits}`);
    const last = ch.vouchers[ch.vouchers.length - 1];
    check(`settled = last voucher ${ch.campaignId}`, (last?.cumulativeAmountBaseUnits ?? '0') === ch.settledBaseUnits);
    check(`vouchers are cumulative ${ch.campaignId}`, ch.vouchers.every((v, i) => BigInt(v.cumulativeAmountBaseUnits) === (i ? BigInt(ch.vouchers[i - 1].cumulativeAmountBaseUnits) : 0n) + BigInt(v.incrementBaseUnits)));
  }
  check('payout + refund = deposits', BigInt(p.totals.paidBaseUnits) + BigInt(p.totals.refundedBaseUnits) === BigInt(p.totals.depositsBaseUnits));
  check('payouts = accepted charges', p.totals.paidBaseUnits === p.totals.chargesBaseUnits);
  check('fee + new rent within cap', BigInt(p.fees.grossFeeAndRentLamports) <= BigInt(p.fees.capLamports), `${p.fees.grossFeeAndRentLamports} <= ${p.fees.capLamports}`);
  check('receipts joined by awardId', opps.filter((o) => o.receipt).every((o) => o.receipt.fields.awardId === o.award.id));
  check('no decision exposes a conversion field', opps.every((o) => o.decisions.every((d) => !('conversionProbability' in d))));
  check('not-admitted bidders never appear among bids', opps.every((o) => o.auction.notAdmitted.every((x) => !o.auction.bids.some((b) => b.campaignId === x.campaignId))));
  check('no-fill opportunities have no award, receipt or charge', opps.filter((o) => o.status === 'no_fill').every((o) => !o.award && !o.receipt && !o.charge));
  check('winner is the top-ranked bid', opps.filter((o) => o.award).every((o) => o.auction.bids[0]?.campaignId === o.award.campaignId));
}

