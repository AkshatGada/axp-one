// project-devnet: artifacts/v3-devnet/settlement.json -> src/data/devnet.public.json + public/devnet.public.json.
// A sanitized allowlist projection of the Solana Devnet re-settlement of the recorded run's three receipts.
// It is kept apart from run.public.json; numbers are never merged.
// Fails the build if the evidence is present but inconsistent with the recorded run:
//   5 finalized txs (1 funding, 2 opens, 2 closes), payouts 7000 + 3000, refunds 13000 + 17000,
//   deposits 20000 each, receipt hashes equal the recorded receipts, explorer links on devnet only.
// If the evidence file is absent, an existing committed projection is kept; with neither, nothing is written.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(app, '../..');
const SRC = process.env.AXP_DEVNET_EVIDENCE || 'artifacts/v3-devnet/settlement.json';
const OUT_SRC = resolve(app, 'src/data/devnet.public.json');
const OUT_PUB = resolve(app, 'public/devnet.public.json');
const RUN = resolve(app, 'src/data/run.public.json');
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;
const EXPLORER = 'https://explorer.solana.com/';
const FORBIDDEN = /secret|private|keypair|seed|mnemonic|voucherSignature|"signature":"[^"]*"\s*,\s*"voucher|wire/i;

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const explorerOk = (u) => typeof u === 'string' && u.startsWith(EXPLORER) && u.endsWith('?cluster=devnet');
const campaignOf = (channelId) => channelId.replace(/-channel$/, '');

export function projectDevnet(raw, run) {
  const failures = [];
  const check = (name, ok, detail = '') => {
    if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
  };
  const s = raw;
  check('schema', s.schemaVersion === 'axp.v3-devnet-settlement.v1', s.schemaVersion);
  check('cluster is devnet', s.network?.cluster === 'devnet', s.network?.cluster);
  check('source run matches', s.sourceRun?.runId === run.source.runId, `${s.sourceRun?.runId} vs ${run.source.runId}`);
  check('source bundle hash matches', s.sourceRun?.bundleSha256 === run.source.runSha256);
  check('program address', B58.test(s.network?.program ?? ''));
  check('program explorer link', explorerOk(s.network?.programExplorerUrl));

  const txs = s.transactions ?? [];
  const roles = txs.map((t) => t.role).sort().join(',');
  check('5 transactions: 1 funding, 2 opens, 2 closes', txs.length === 5 && roles === 'cooperative_close,cooperative_close,funding,open,open', roles);
  for (const t of txs) {
    check(`tx ${t.signature?.slice(0, 8)} finalized`, t.finality === 'finalized' && t.err === null);
    check(`tx ${t.signature?.slice(0, 8)} signature`, B58.test(t.signature ?? ''));
    check(`tx ${t.signature?.slice(0, 8)} explorer link`, explorerOk(t.explorerUrl) && t.explorerUrl.includes(t.signature));
  }
  check('all signatures finalized (evidence)', s.verification?.allSignaturesFinalized === true);

  // Recorded receipts by award.
  const receiptsByAward = new Map(run.opportunities.filter((o) => o.receipt).map((o) => [o.award.id, o]));
  const chargesByCampaign = new Map();
  for (const o of run.opportunities) if (o.charge) chargesByCampaign.set(o.charge.campaignId, (chargesByCampaign.get(o.charge.campaignId) ?? 0n) + BigInt(o.charge.amountBaseUnits));

  const channels = (s.channels ?? []).map((c) => {
    const campaignId = campaignOf(c.channelId);
    const open = txs.find((t) => t.signature === c.openSignature);
    const close = txs.find((t) => t.signature === c.closeSignature);
    check(`${c.channelId}: open and close found`, !!open && !!close && open.role === 'open' && close.role === 'cooperative_close');
    check(`${c.channelId}: channel address`, B58.test(c.channelAddress ?? '') && explorerOk(c.channelExplorerUrl));
    const dep = BigInt(c.depositBaseUnits), pay = BigInt(c.publisherPayoutBaseUnits), ref = BigInt(c.payerRefundBaseUnits);
    check(`${c.channelId}: deposit 20000`, dep === 20000n, String(dep));
    check(`${c.channelId}: payout + refund = deposit`, pay + ref === dep);
    const vouchers = (c.receiptToVoucher ?? []).map((v) => {
      const o = receiptsByAward.get(v.awardId);
      check(`${c.channelId} voucher ${v.sequence}: receipt hash equals the recorded receipt`, !!o && o.receipt.receiptHash === v.publisherReceiptHash, v.awardId);
      check(`${c.channelId} voucher ${v.sequence}: charge matches`, !!o && o.charge.id === v.chargeId && o.charge.amountBaseUnits === v.incrementBaseUnits);
      return {
        sequence: Number(v.sequence),
        opportunityN: o?.n ?? null,
        awardId: v.awardId,
        chargeId: v.chargeId,
        receiptHash: v.publisherReceiptHash,
        incrementBaseUnits: v.incrementBaseUnits,
        cumulativeBaseUnits: v.cumulativeVoucherBaseUnits,
        settledOnChain: !!v.settledOnChainBy?.closeSignature,
        closeSignature: v.settledOnChainBy?.closeSignature ?? null,
      };
    });
    const last = vouchers[vouchers.length - 1];
    check(`${c.channelId}: final cumulative = payout`, !!last && BigInt(last.cumulativeBaseUnits) === pay);
    check(`${c.channelId}: final cumulative = accepted charges`, !!last && BigInt(last.cumulativeBaseUnits) === (chargesByCampaign.get(campaignId) ?? -1n));
    check(`${c.channelId}: only the final voucher settles on chain`, vouchers.every((v, i) => v.settledOnChain === (i === vouchers.length - 1)) && last?.closeSignature === c.closeSignature);
    const tx = (t) => ({ signature: t.signature, explorerUrl: t.explorerUrl, slot: t.slot, feeLamports: t.networkFeeLamports, newRentLamports: t.newRentLamports, reclaimedRentLamports: t.reclaimedRentLamports });
    return {
      channelId: c.channelId,
      campaignId,
      channelAddress: c.channelAddress,
      channelExplorerUrl: c.channelExplorerUrl,
      status: c.channelAccountAfterClose?.status ?? null,
      remainingRentLamports: c.channelAccountAfterClose?.remainingRentLamports ?? null,
      depositBaseUnits: c.depositBaseUnits,
      payoutBaseUnits: c.publisherPayoutBaseUnits,
      refundBaseUnits: c.payerRefundBaseUnits,
      open: open ? tx(open) : null,
      close: close ? tx(close) : null,
      vouchers,
    };
  });
  check('2 channels', channels.length === 2);
  const sum = (k) => channels.reduce((n, c) => n + BigInt(c[k]), 0n);
  check('payouts 7000 + 3000 = 10000', sum('payoutBaseUnits') === 10000n && channels.map((c) => c.payoutBaseUnits).sort().join(',') === '3000,7000');
  check('refunds 13000 + 17000 = 30000', sum('refundBaseUnits') === 30000n && channels.map((c) => c.refundBaseUnits).sort().join(',') === '13000,17000');
  check('payouts equal the recorded accepted charges', sum('payoutBaseUnits') === BigInt(run.totals.chargesBaseUnits));
  check('3 receipts covered', channels.reduce((n, c) => n + c.vouchers.length, 0) === 3);

  const f = s.funding;
  const ftx = txs.find((t) => t.role === 'funding');
  check('funding tx', !!f && !!ftx && f.signature === ftx.signature && explorerOk(f.explorerUrl));

  if (failures.length) return { projection: null, failures };
  const projection = {
    schema: 'axp.devnet-projection.v1',
    source: { path: SRC, settlementRunId: s.settlementRunId, sourceRunId: s.sourceRun.runId, sourceBundleSha256: s.sourceRun.bundleSha256 },
    framing: s.framing,
    network: {
      cluster: 'devnet',
      genesisHash: s.network.genesisHash,
      program: s.network.program,
      programExplorerUrl: s.network.programExplorerUrl,
      mint: s.network.mint,
      mintLabel: s.network.mintLabel,
    },
    identities: {
      payer: s.identities.payer,
      payerExplorerUrl: s.identities.payerExplorerUrl,
      payee: s.identities.payee,
      payeeExplorerUrl: s.identities.payeeExplorerUrl,
    },
    funding: { signature: f.signature, explorerUrl: f.explorerUrl, slot: ftx.slot, lamports: f.lamports, tokenBaseUnits: f.tokenBaseUnits, feeLamports: ftx.networkFeeLamports, newRentLamports: ftx.newRentLamports },
    channels,
    transactions: txs
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ signature: t.signature, role: t.role === 'cooperative_close' ? 'close' : t.role, campaignId: t.channelId === 'n/a' ? null : campaignOf(t.channelId), slot: t.slot, finality: t.finality, explorerUrl: t.explorerUrl, feeLamports: t.networkFeeLamports, newRentLamports: t.newRentLamports, reclaimedRentLamports: t.reclaimedRentLamports })),
    totals: s.totals,
    verification: { allSignaturesFinalized: s.verification.allSignaturesFinalized, checkedAt: s.verification.checkedAt, method: s.verification.method },
    limitations: s.limitations,
  };
  const text = JSON.stringify(projection);
  if (FORBIDDEN.test(text)) failures.push('sanitization: private material in the projection');
  return { projection: failures.length ? null : projection, failures };
}

async function main() {
  const srcPath = resolve(repo, SRC);
  mkdirSync(resolve(app, 'public'), { recursive: true });
  if (!existsSync(srcPath)) {
    if (existsSync(OUT_SRC)) {
      copyFileSync(OUT_SRC, OUT_PUB);
      console.log('project-devnet: no evidence file; kept the committed projection.');
    } else {
      rmSync(OUT_PUB, { force: true });
      console.log('project-devnet: no devnet evidence; devnet sections stay hidden.');
    }
    return;
  }
  const bytes = readFileSync(srcPath);
  const run = JSON.parse(readFileSync(RUN, 'utf8'));
  const ev = JSON.parse(bytes.toString('utf8'));
  if (ev.sourceRun?.bundleSha256 !== run.source.runSha256) {
    // Evidence for a different run (for example a perturbed fixture or a new live run): no re-settlement to show.
    rmSync(OUT_SRC, { force: true });
    rmSync(OUT_PUB, { force: true });
    console.log(`project-devnet: ${SRC} re-settles run ${ev.sourceRun?.runId}, not the selected bundle; re-settlement hidden.`);
    return;
  }
  const { projection: p, failures } = projectDevnet(JSON.parse(bytes.toString('utf8')), run);
  if (failures.length || !p) {
    console.error('project-devnet: FAILED');
    for (const x of failures) console.error('  x ' + x);
    process.exit(1);
  }
  p.source.sha256 = sha256(bytes);
  const text = JSON.stringify(p);
  writeFileSync(OUT_SRC, JSON.stringify(p, null, 2) + '\n');
  writeFileSync(OUT_PUB, text);
  console.log(`project-devnet: ok. ${p.transactions.length} devnet transactions, ${p.channels.length} channels, ${Buffer.byteLength(text)} bytes.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
