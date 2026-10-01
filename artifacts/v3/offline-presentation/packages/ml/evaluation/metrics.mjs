import { assert, freeze, hash } from '../core.mjs';

export function quantile(values, q) {
  assert(q >= 0 && q <= 1 && values.every(Number.isFinite));
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a-b); const i = (sorted.length-1)*q, lo = Math.floor(i);
  return sorted[lo]+(sorted[Math.ceil(i)]-sorted[lo])*(i-lo);
}
export function ndcgAt3(ranking, labels) {
  assert(new Set(ranking).size === ranking.length && ranking.every(k => Object.hasOwn(labels, k)));
  assert(Object.values(labels).every(n => Number.isInteger(n) && n >= 0 && n <= 3));
  const dcg = values => values.slice(0, 3).reduce((sum, v, i) => sum+(2**v-1)/Math.log2(i+2), 0);
  const ideal = dcg(Object.values(labels).sort((a, b) => b-a));
  return ideal === 0 ? null : dcg(ranking.map(k => labels[k]))/ideal;
}
export function summarizeAttempts(attempts, deadlineMs = 500) {
  assert(attempts.length <= 1440 && deadlineMs > 0);
  const outcomes = {}; let valid = 0, deadlineSuccess = 0, cost = 0, unknownCost = 0;
  for (const a of attempts) {
    outcomes[a.outcome] = (outcomes[a.outcome] ?? 0)+1;
    if (a.outcome === 'valid') { valid++; if (a.elapsedMs <= deadlineMs) deadlineSuccess++; }
    if (a.cost === null) unknownCost++; else { assert(Number.isFinite(a.cost) && a.cost >= 0); cost += a.cost; }
  }
  const latencies = attempts.filter(a => a.outcome !== 'unavailable').map(a => a.elapsedMs), n = attempts.length;
  return freeze({ attempts: n, executedAttempts: latencies.length, valid, outcomes, deadlineMs, deadlineSuccess, deadlineSuccessRate: n ? deadlineSuccess/n : null, latency: { samples: latencies.length, p50: quantile(latencies, .50), p95: quantile(latencies, .95), p99: quantile(latencies, .99), includesFailures: true, unavailableExcluded: true, p99Semantics: 'exploratory_small_sample' }, cost: { semantics: 'USD_provider_API_only_local_compute_excluded', knownAttemptedCost: cost, unknownCostAttempts: unknownCost, totalAttemptedCost: unknownCost ? null : cost }, throughput: null });
}

/** Paired resampling units are families, with all repetitions kept inside each unit. */
export function pairedFamilyBootstrap(pairs, { seed = 'axp-benchmark-v1', repetitions = 1000 } = {}) {
  assert(pairs.length > 0 && pairs.length <= 1440 && Number.isInteger(repetitions) && repetitions > 0 && repetitions <= 2000);
  const groups = new Map();
  for (const p of pairs) { assert(typeof p.familyId === 'string' && Number.isFinite(p.a) && Number.isFinite(p.b)); if (!groups.has(p.familyId)) groups.set(p.familyId, []); groups.get(p.familyId).push(p.a-p.b); }
  const families = [...groups.keys()].sort();
  const mean = xs => xs.reduce((a, b) => a+b, 0)/xs.length;
  const differences = families.map(k => mean(groups.get(k)));
  if (families.length < 2) return { status: 'insufficient_families', families: families.length, pairedMean: mean(differences), interval95: null };
  let state = parseInt(hash(seed).slice(0, 8), 16) || 1;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0)/2**32; };
  const samples = Array.from({ length: repetitions }, () => mean(Array.from({ length: families.length }, () => differences[Math.floor(random()*families.length)])));
  return freeze({ status: 'exploratory', families: families.length, observations: pairs.length, seed, repetitions, pairedMean: mean(differences), interval95: [quantile(samples, .025), quantile(samples, .975)] });
}
