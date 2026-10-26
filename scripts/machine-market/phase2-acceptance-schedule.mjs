/** Finite Packet03 schedule; declarations are never execution evidence. */
import { createHash } from 'node:crypto';
import { canonical } from '../../packages/contracts/index.mjs';
export const PACKET_SHA256 = 'd77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c';
export const LIMITS = Object.freeze({
    units: 8,
    lifetimeUnits: 64,
    successfulTrades: 24,
    signedOperations: 128,
    operatorLamports: '10000000000',
    tradingLamportsPerKey: '10000000000',
    tradingKeys: 4,
    transactionBytes: 1232,
    computeUnits: 200000
});
export const BUCKETS = Object.freeze({
    bootstrap: 19,
    funding: 16,
    terminal: 17,
    probes: 30,
    reserve: 46
});
export const SERIES = Object.freeze([
    {
        id: 'main',
        cap: 4,
        transferable: 1,
        maxTransfers: 3
    },
    {
        id: 'consume',
        cap: 1,
        transferable: 0,
        maxTransfers: 0
    },
    {
        id: 'sponsored',
        cap: 1,
        transferable: 1,
        maxTransfers: 3
    },
    {
        id: 'timing',
        cap: 2,
        transferable: 1,
        maxTransfers: 3
    },
].map(Object.freeze));
export const UNITS = Object.freeze([
    {
        id: 'U0',
        series: 'main',
        serial: 0,
        path: ['issuer', 'buyerA', 'buyerB', 'buyerA'],
        prices: ['10000', '15000', '8000'],
        terminal: 'delivery',
        groups: ['T1', 'T2', 'T6', 'T7', 'T8']
    },
    {
        id: 'U1',
        series: 'main',
        serial: 1,
        path: ['issuer', 'buyerA', 'buyerB', 'buyerA'],
        prices: ['10000', '15000', '8000'],
        terminal: 'failure',
        groups: ['T6', 'T7']
    },
    {
        id: 'U2',
        series: 'consume',
        serial: 0,
        path: ['issuer', 'buyerA'],
        prices: ['10000'],
        terminal: 'delivery',
        groups: ['T2', 'T5', 'T6']
    },
    {
        id: 'U3',
        series: 'sponsored',
        serial: 0,
        path: ['issuer', 'buyerA'],
        prices: ['10000'],
        terminal: 'sponsor-failure',
        groups: ['T3', 'T4', 'T7']
    },
    {
        id: 'U4',
        series: 'timing',
        serial: 0,
        path: ['issuer', 'buyerA'],
        prices: ['10000'],
        terminal: 'expiry',
        groups: ['T5', 'T6', 'T7']
    },
    {
        id: 'U5',
        series: 'timing',
        serial: 1,
        path: ['issuer', 'buyerA'],
        prices: ['10000'],
        terminal: 'timeout',
        groups: ['T5', 'T6']
    },
    {
        id: 'U6',
        series: 'main',
        serial: 2,
        path: ['issuer', 'buyerA', 'buyerB'],
        prices: ['10000', '15000'],
        terminal: 'race-delivery',
        groups: ['T3', 'T6', 'T7']
    },
    {
        id: 'U7',
        series: 'main',
        serial: 3,
        path: ['issuer', 'buyerA', 'buyerB'],
        prices: ['10000', '15000'],
        terminal: 'recovery-delivery',
        groups: ['T3', 'T6', 'T8', 'T9']
    },
].map(row => Object.freeze({
    ...row,
    path: Object.freeze(row.path),
    prices: Object.freeze(row.prices),
    groups: Object.freeze(row.groups)
})));
export const REQUIRED_PROOFS = Object.freeze([
    'T1:maker-price-both-directions', 'T1:price-time-and-rights-filter', 'T1:ioc-gtc',
    'T2:native-minimum-rejection', 'T2:wrong-native-authority', 'T2:filled-order-nullifier', 'T2:exact-native-replay',
    'T3:http-last-unit-race', 'T3:http-shared-balance-race', 'T3:http-same-nonce-race', 'T3:http-cancel-sign-race',
    'T3:native-competing-secondary', 'T3:native-resale-start-race', 'T3:two-start-race', 'T3:wallet-watermark',
    'T4:sponsor-cap-reservations', 'T4:sponsor-negative-consent', 'T4:sponsor-refund-no-replenishment', 'T4:sponsor-nontransferable', 'T4:regular-sponsor-unit-race',
    'T5:useby-equality', 'T5:lease-equality', 'T5:never-signed-abort',
    'T6:owner-before-replay', 'T6:response-after-useby', 'T6:lost-response-restart', 'T6:timeout-no-bytes',
    'T7:recurring-owner-payout', 'T7:current-holder-face-refund', 'T7:unused-expiry', 'T7:primary-secondary-conservation',
    'T8:after-fence-crash', 'T8:after-signed-crash', 'T8:after-send-crash', 'T8:resolved-before-http-crash',
    'T8:monotonic-observation', 'T8:unknown-retained',
    'T9:serialized-size-cu', 'T9:drain-at-ingress-cap', 'T9:physical-storage-full-config',
]);
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonical(value)).digest('hex');
export const scheduleIdentity = () => hash({
    packet: PACKET_SHA256,
    limits: LIMITS,
    buckets: BUCKETS,
    series: SERIES,
    units: UNITS,
    requiredProofs: REQUIRED_PROOFS
});
export const stableIdentity = (runId, caseId, stepId) => hash({
    packet: PACKET_SHA256,
    runId,
    caseId,
    stepId
});
export function validateSchedule({ units = UNITS, series = SERIES, buckets = BUCKETS } = {}) {
    const require = (condition, code) => {
        if (!condition)
            throw Error(code);
    };
    require(units.length === 8 && new Set(units.map(row => row.id)).size === 8, 'SCHEDULE_UNITS');
    require(series.reduce((n, row) => n + row.cap, 0) === 8, 'SCHEDULE_SUPPLY');
    const trades = units.reduce((n, row) => n + row.prices.length, 0);
    require(trades === 14 && trades <= buckets.funding && buckets.funding <= LIMITS.successfulTrades, 'SCHEDULE_TRADES');
    require(Object.values(buckets).every(n => Number.isSafeInteger(n) && n >= 0) && Object.values(buckets).reduce((a, b) => a + b, 0) === 128, 'SCHEDULE_OPERATION_CAP');
    require(buckets.reserve >= 8, 'SCHEDULE_DRAIN_RESERVE');
    for (const row of units) {
        const s = series.find(s => s.id === row.series);
        require(s && row.serial < s.cap && row.prices.length + 1 === row.path.length, 'SCHEDULE_UNIT');
    }
    return {
        initialUnits: 8,
        targetSuccessfulTrades: trades,
        plannedSignedOperations: 128 - buckets.reserve,
        remainingReserve: buckets.reserve
    };
}
export function budgetUsage(attempts, successfulTrades = 0) {
    if (!Array.isArray(attempts) || !Number.isSafeInteger(successfulTrades) || successfulTrades < 0 || successfulTrades > 24)
        throw Error('RUN_BUDGET');
    const identities = new Set(), counts = Object.fromEntries(Object.keys(BUCKETS).map(key => [key, 0]));
    for (const row of attempts) {
        if (!row || typeof row.id !== 'string' || !row.id || identities.has(row.id) || !Object.hasOwn(counts, row.bucket))
            throw Error('ATTEMPT_IDENTITY');
        identities.add(row.id);
        counts[row.bucket]++;
    }
    if (attempts.length > 128 || Object.entries(counts).some(([key, count]) => count > BUCKETS[key]))
        throw Error('RUN_OPERATION_CAP');
    return {
        allocatedSigningSlots: attempts.length,
        knownSignedOperations: attempts.filter(row => row.state === 'Signed').length,
        successfulTrades,
        remaining: 128 - attempts.length,
        counts
    };
}
validateSchedule();
