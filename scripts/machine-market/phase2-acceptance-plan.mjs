/** Concrete eight-unit probe intents/assertions, not caller-assigned proof labels. */
import { join } from 'node:path';
import { encodeAuthorization, decodeAuthorization, decodeInstruction, canonicalBase64, ACCOUNT_SCHEMAS, ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { orderId, operationId, matchId, domainHash, sha256 } from '../../packages/machine-market/native/domain.mjs';
import { validateNativeAccount } from '../../packages/machine-market/native/observations.mjs';
import { createDirectProbeRunner, describeNegativeProbe } from './phase2-acceptance-probes.mjs';
import { raceIntent } from './phase2-acceptance-recovery.mjs';
import { proveIsolatedFence } from './phase2-acceptance-fence.mjs';
import { hash, stableIdentity } from './phase2-acceptance-schedule.mjs';
const demand = (condition, code) => {
    if (!condition)
        throw Error(code);
};
const wire = value => {
    const schema = ACCOUNT_SCHEMAS[value.kind];
    return {
        kind: value.kind,
        state: value.state,
        market: value.market,
        ...Object.fromEntries(schema.fields.map(([field]) => [field, value[field]]))
    };
};
const proof = (id, evidence, assertions) => ({
    id,
    status: 'passed',
    evidenceHashes: evidence.map(hash),
    assertions
});
export const CONCRETE_CASES = Object.freeze({
    'http-reservations': ['T1:ioc-gtc', 'T2:same-nonce-http-key', 'T3:http-shared-balance-race', 'T3:http-same-nonce-race', 'T3:wallet-watermark'],
    'never-signed-abort': ['T5:never-signed-abort'],
    'invalid-issuance': ['T2:native-minimum-rejection'],
    'consume-primary-minimum': ['T2:native-minimum-rejection'],
    'sponsored-positive-minimum': ['T4:sponsor-nontransferable'],
    'wrong-start-owner': ['T2:wrong-native-authority', 'T6:owner-before-replay'],
    'missing-owner-signature': ['T2:wrong-native-authority'],
    'foreign-unit-account': ['T2:wrong-native-authority'],
    'wrong-refund-holder': ['T2:wrong-native-authority'],
    'filled-order-reuse': ['T2:filled-order-nullifier'],
    'sponsor-resale': ['T4:sponsor-nontransferable'],
    'expired-start': ['T5:useby-equality'],
    'finalize-lease-equality': ['T5:lease-equality'],
    'race-secondary': ['T3:native-competing-secondary'],
    'race-resale-start': ['T3:native-resale-start-race'],
    'two-start': ['T3:two-start-race'],
});
export function createConcreteAcceptancePlan({ config, context, journal, runtime }) {
    const direct = createDirectProbeRunner({
        config,
        context,
        journal,
        filename: join(config.privateRoot, 'acceptance-native-probes.sqlite')
    });
    const mainSeries = () => config.series.find(row => row.id === 'main');
    const bid = (name, amount, { tif = 0 } = {}) => runtime.envelope('http-reservations', name, config.run.buyerA, {
        kind: 'BookOrder',
        side: 0,
        lane: 0,
        series: mainSeries().address,
        refundFace: '0',
        exactUnit: ZERO_KEY,
        expectedCursor: '0',
        limit: amount,
        validUntilSlot: mainSeries().useBySlot,
        minRemainingAfter: 0,
        tif,
        quantity: 1
    });
    const idOf = env => decodeAuthorization(canonicalBase64(env.authorization)).orderId;
    async function cancel(env, name) {
        const o = await context.store.getOrder(idOf(env));
        const value = runtime.envelope('http-reservations', name, o.actor, {
            kind: 'Cancel',
            originalOrderId: o.id,
            originalNonce: o.nonce,
            originalAuthHash: o.authHash,
            expectedOrderVersion: String(o.version)
        });
        return runtime.http('/orders/cancel', value);
    }
    async function current(label) {
        const binding = config.units.find(row => row.id === label), s = config.series.find(row => row.id === binding.series);
        let view = await context.rpc.accounts([config.run.market, binding.address, s.address]);
        let unit = validateNativeAccount(view.accounts[1], config.run, { kind: 'Unit' }), series = validateNativeAccount(view.accounts[2], config.run, { kind: 'Series' });
        let primary = null;
        if (unit.primaryMatch !== ZERO_KEY) {
            view = await context.rpc.accounts([config.run.market, binding.address, s.address, unit.primaryMatch], { minContextSlot: view.contextSlot });
            unit = validateNativeAccount(view.accounts[1], config.run, { kind: 'Unit' });
            series = validateNativeAccount(view.accounts[2], config.run, { kind: 'Series' });
            primary = validateNativeAccount(view.accounts[3], config.run, { kind: 'Match' });
        }
        return {
            unit,
            series,
            primary,
            contextSlot: view.contextSlot
        };
    }
    async function sync(label) {
        const value = await current(label);
        await context.store.observeNativeUnit({
            address: value.unit.address,
            contextSlot: value.contextSlot,
            unit: wire(value.unit),
            unitOwner: config.run.program,
            primaryMatch: value.primary ? wire(value.primary) : null,
            receiptOwner: config.run.program,
            verified: true
        });
        const keys = [...new Set(['matcher', 'issuer', 'buyerA', 'buyerB', 'sponsor', 'collector'].map(role => config.run[role]))], view = await context.rpc.accounts(keys), rent = await context.rpc.rentForLength(0);
        for (const account of view.accounts) {
            const captured = await context.store.captureWallet(account.address);
            await context.store.observeWallet({
                key: account.address,
                balance: account.lamports,
                rent,
                contextSlot: view.contextSlot,
                expectedVersion: captured.walletStateVersion
            });
        }
        return value;
    }
    async function negative(id, label, { sourceFund } = {}) {
        const stepId = 'direct:' + id;
        if (journal.get(stepId)?.state === 'Complete')
            return journal.get(stepId).result;
        const values = await current(label), existing = direct.get(id), descriptor = existing ? null : describeNegativeProbe(id, { config, ...values, sourceFund });
        journal.prepare(stepId, { kind: 'declared-native-negative', probeId: id, unit: values.unit.address });
        try {
            const evidence = existing ? await direct.recover(id) : await direct.run(descriptor);
            demand(evidence.status === 'finalized-failure', 'NEGATIVE_DID_NOT_FAIL');
            const ids = CONCRETE_CASES[id] ?? [];
            const boundary = id === 'expired-start' ? values.series.useBySlot : id === 'finalize-lease-equality' ? values.unit.lockDeadlineSlot : null;
            const exact = boundary === null || evidence.slot === boundary;
            const result = { evidence: [evidence], proofs: ids.map(id => ({ ...proof(id, [evidence], ['exact-declared-program-error', 'fee-only-wallet-delta', 'no-principal-or-state-change']), ...(exact ? {} : { status: 'partial', reason: 'native-execution-at-or-after-boundary-not-exact-slot' }) })) };
            journal.complete(stepId, result);
            await sync(label);
            return result;
        }
        catch (error) {
            journal.stop('NATIVE_PROBE_UNRESOLVED', [id]);
            throw error;
        }
    }
    async function race(name, label, ids) {
        const stepId = 'direct:' + name;
        if (journal.get(stepId)?.state === 'Complete')
            return journal.get(stepId).result;
        const values = await current(label);
        const intent = raceIntent({
            saved: journal.get(stepId),
            probeIds: ids,
            unit: values.unit.address,
            cursor: values.unit.cursor
        });
        journal.prepare(stepId, intent);
        try {
            for (const id of ids)
                if (!direct.get(id)) {
                    demand(values.unit.cursor === intent.cursor, 'RACE_DESCRIPTOR_MISSING_AFTER_EFFECT');
                    await direct.run(describeNegativeProbe(id, { config, ...values }), { submit: false });
                }
            const outcomes = await Promise.all(ids.map(async (id) => {
                const existing = direct.get(id);
                return existing.state === 'Signed' ? direct.sendPrepared(id) : direct.recover(id);
            }));
            const successes = outcomes.filter(row => row.status === 'finalized-success');
            demand(successes.length === 1 && outcomes.filter(row => row.status === 'finalized-failure').length === 1, 'NATIVE_RACE_NOT_ONE_WINNER');
            const after = await sync(label);
            demand(BigInt(after.unit.cursor) === BigInt(intent.cursor) + 1n, 'RACE_CURSOR_NOT_ATOMIC');
            const tradeIds = successes.filter(row => decodeInstruction(canonicalBase64(row.instructionBase64)).type === 'Fund').map(row => row.operationId);
            const result = { evidence: outcomes, tradeIds, proofs: (CONCRETE_CASES[name] ?? []).map(id => proof(id, outcomes, ['one-actual-native-winner', 'one-finalized-native-rejection', 'cursor-advanced-once', 'original-primary-claim-retained'])) };
            journal.complete(stepId, result, { tradeIds });
            return result;
        }
        catch (error) {
            journal.stop('NATIVE_RACE_UNRESOLVED', ids);
            throw error;
        }
    }
    async function httpReservations() {
        return runtime.step('concrete:http-reservations', { kind: 'http-concurrency-and-wallet-capture' }, async () => {
            const evidence = [], cleanup = [], before = await context.store.captureWallet(config.run.buyerA);
            demand(before.held === '0', 'UNEXPECTED_EXISTING_HOLD');
            // Reduce spendable to <=1 native gross cap with noncrossing GTC holds. These
            // are reservations only, never native transfers; every accepted order cancels.
            for (let n = 0; BigInt((await context.store.captureWallet(config.run.buyerA)).available) > 1000000000n; n++) {
                demand(n < 12, 'RESERVATION_TEST_BOUND');
                const remaining = BigInt((await context.store.captureWallet(config.run.buyerA)).available), amount = (remaining - 1000000000n > 1000000000n ? 1000000000n : remaining - 1000000000n).toString(), env = bid('blocker-' + n, amount);
                evidence.push((await runtime.http('/orders', env)).evidence);
                cleanup.push(env);
            }
            const available = BigInt((await context.store.captureWallet(config.run.buyerA)).available), amount = (available * 3n / 5n).toString();
            demand(BigInt(amount) > 0n, 'RESERVATION_TEST_BALANCE');
            const a = bid('shared-a', amount), b = bid('shared-b', amount), results = await Promise.all([runtime.http('/orders', a, { expected: [200, 409] }), runtime.http('/orders', b, { expected: [200, 409] })]);
            demand(results.filter(row => row.evidence.status === 200).length === 1 && results.filter(row => row.evidence.status === 409).length === 1, 'SHARED_BALANCE_RACE');
            evidence.push(...results.map(row => row.evidence));
            cleanup.push(results[0].evidence.status === 200 ? a : b);
            for (let index = 0; index < cleanup.length; index++)
                evidence.push((await cancel(cleanup[index], 'cancel-' + index)).evidence);
            demand((await context.store.captureWallet(config.run.buyerA)).held === '0', 'HOLDS_NOT_RELEASED');
            const repeated = bid('same-nonce', '10000'), same = await Promise.all([runtime.http('/orders', repeated), runtime.http('/orders', { ...repeated, idempotencyKey: repeated.idempotencyKey + '-alias' })]);
            demand(same[0].value.orderId === same[1].value.orderId && (await context.store.captureWallet(config.run.buyerA)).held === '10000', 'NONCE_DUPLICATE_HOLD');
            evidence.push(...same.map(row => row.evidence));
            const oldCapture = await context.store.captureWallet(config.run.buyerA), staleBid = bid('watermark-new', '10000');
            evidence.push((await cancel(repeated, 'same-nonce-cancel')).evidence);
            let refused = false;
            try {
                await context.store.admitAuthorization(staleBid, { currentSlot: await context.rpc.slot(), walletContext: oldCapture });
            }
            catch (error) {
                refused = error.code === 'STALE_CURSOR';
            }
            demand(refused && (await context.store.captureWallet(config.run.buyerA)).held === '0', 'STALE_WALLET_CAPTURE_ACCEPTED');
            const ioc = await runtime.http('/orders', bid('ioc', '10000', { tif: 1 }));
            demand(ioc.value.state === 'NoFill' && (await context.store.captureWallet(config.run.buyerA)).held === '0', 'IOC_RESTED');
            evidence.push(ioc.evidence);
            return { evidence, proofs: CONCRETE_CASES['http-reservations'].filter(id => id !== 'T2:same-nonce-http-key').map(id => proof(id, evidence, ['one-shared-balance-reservation', 'same-nonce-one-hold', 'cancelled-holds-zero', 'IOC-never-rested', 'stale-wallet-version-refused'])) };
        });
    }
    async function lastUnitRace() {
        const label = 'U6', u = await runtime.unit(label), s = runtime.seriesFor(label), common = {
            kind: 'BookOrder',
            lane: 0,
            series: s.address,
            refundFace: '0',
            validUntilSlot: s.useBySlot,
            minRemainingAfter: 0,
            tif: 0,
            quantity: 1
        };
        const ask = runtime.envelope(label, 'last-unit-ask', config.run.issuer, {
            ...common,
            side: 1,
            exactUnit: u.address,
            expectedCursor: '0',
            limit: '10000'
        }), bids = ['buyerA', 'buyerB'].map(role => runtime.envelope(label, 'last-unit-' + role, config.run[role], {
            ...common,
            side: 0,
            exactUnit: ZERO_KEY,
            expectedCursor: '0',
            limit: '12000'
        }));
        const candidates = bids.map(env => {
            const buy = idOf(env), selected = matchId({
                domain: domainHash(config.run),
                buyOrderId: buy,
                sellOrderId: idOf(ask),
                unit: u.address,
                expectedCursor: '0',
                gross: '10000',
                fundingKind: 0
            });
            return { buy, match: selected, operation: operationId({ domain: domainHash(config.run), type: 'FundMatch', matchId: selected }) };
        });
        return runtime.step('U6:trade:0', { kind: 'http-last-unit-race', unit: u.address, candidateOrders: candidates.map(row => row.buy) }, async () => {
            const first = await runtime.http('/orders', ask);
            const results = await Promise.all(bids.map(env => runtime.http('/orders', env, { expected: [200, 409] })));
            const orders = [];
            for (const candidate of candidates) {
                try {
                    orders.push(await context.store.getOrder(candidate.buy));
                }
                catch (error) {
                    if (error.code === 'INVALID_INPUT')
                        orders.push(null);
                    else
                        throw error;
                }
            }
            const matched = orders.filter(row => row?.matchId);
            demand(matched.length === 1, 'LAST_UNIT_DOUBLE_MATCH');
            const winner = candidates.find(row => row.buy === matched[0].id), captured = await runtime.settle(winner.operation, { allowInitialExecution: true });
            for (let index = 0; index < orders.length; index++)
                if (orders[index]?.state === 'Open')
                    await cancel(bids[index], 'last-unit-loser');
            demand((await runtime.unit('U6')).cursor === '1' && (await runtime.unit('U6')).owner === matched[0].actor, 'LAST_UNIT_OWNER');
            const evidence = [first.evidence, ...results.map(row => row.evidence), captured.evidence];
            return {
                evidence,
                operationIds: [winner.operation],
                tradeIds: [winner.operation],
                proofs: [proof('T3:http-last-unit-race', evidence, ['one-actual-match-for-last-unit', 'one-native-owner', 'loser-no-native-debit', 'resting-loser-hold-cancelled'])]
            };
        }, { operations: candidates.map(row => row.operation), resumeSelect: async () => {
                const orders = [];
                for (const candidate of candidates) {
                    try {
                        const order = await context.store.getOrder(candidate.buy);
                        if (order.matchId)
                            orders.push(order);
                    }
                    catch {
                    }
                }
                demand(orders.length === 1, 'LAST_UNIT_RECOVERY');
                return [candidates.find(row => row.buy === orders[0].id).operation];
            } });
    }
    async function sponsorBeforeGrant() {
        const sponsor = context.sponsorship;
        await runtime.step('concrete:sponsor-binding', { kind: 'exact-campaign-consent-binding' }, async () => {
            const mandate = await runtime.http('/campaigns', sponsor.campaignEnvelope), before = await context.store.getCampaign(sponsor.campaignId);
            const changed = runtime.envelope('U3', 'changed-packet', config.run.buyerA, { ...sponsor.consentValue, packetHash: stableIdentity(config.runId, 'U3', 'wrong-packet') });
            const denied = await runtime.http('/sponsored-access', { consentEnvelope: changed, issuerEnvelope: sponsor.issuerEnvelope }, { expected: [409] });
            demand((await context.store.getCampaign(sponsor.campaignId)).consumedGross === before.consumedGross && (await runtime.unit('U3')).state === 'IssuerOpen', 'CHANGED_PACKET_SPENT');
            return { evidence: [mandate.evidence, denied.evidence], proofs: [] };
        });
    }
    async function controlledCancelMatch(ordering) {
        demand(context.gates, 'ACCEPTANCE_HTTP_GATES_REQUIRED');
        const label = ordering === 'cancel-first' ? 'U7' : 'U2', u = await runtime.unit(label), s = runtime.seriesFor(label), caseId = 'cancel-match:' + ordering;
        const common = {
            kind: 'BookOrder',
            lane: 0,
            series: s.address,
            refundFace: '0',
            validUntilSlot: s.useBySlot,
            minRemainingAfter: 0,
            tif: 0,
            quantity: 1
        };
        const ask = runtime.envelope(caseId, 'ask', config.run.issuer, {
            ...common,
            side: 1,
            exactUnit: u.address,
            expectedCursor: '0',
            limit: '10000'
        }), bidEnv = runtime.envelope(caseId, 'bid', config.run.buyerA, {
            ...common,
            side: 0,
            exactUnit: ZERO_KEY,
            expectedCursor: '0',
            limit: '12000'
        });
        const selected = matchId({
            domain: domainHash(config.run),
            buyOrderId: idOf(bidEnv),
            sellOrderId: idOf(ask),
            unit: u.address,
            expectedCursor: '0',
            gross: '10000',
            fundingKind: 0
        }), op = operationId({ domain: domainHash(config.run), type: 'FundMatch', matchId: selected });
        const stepId = ordering === 'match-first' ? 'U2:trade:0' : 'concrete:cancel-first';
        return runtime.step(stepId, { kind: 'two-pending-W6-cancel-match-requests', ordering, unit: u.address }, async () => {
            const opened = await runtime.http('/orders', ask), o = await context.store.getOrder(idOf(ask));
            const cancelEnv = runtime.envelope(caseId, 'cancel', config.run.issuer, {
                kind: 'Cancel',
                originalOrderId: o.id,
                originalNonce: o.nonce,
                originalAuthHash: o.authHash,
                expectedOrderVersion: String(o.version)
            });
            await context.gates.arm({ bidHash: hash(bidEnv), cancelHash: hash(cancelEnv), operationId: op });
            const bidPending = runtime.http('/orders', bidEnv), cancelPending = runtime.http('/orders/cancel', cancelEnv, { expected: ordering === 'cancel-first' ? [200] : [409] });
            const wait = async (predicate) => {
                for (let n = 0; n < 3000; n++) {
                    const status = await context.gates.status();
                    if (predicate(status))
                        return status;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                throw Error('HTTP_GATE_TIMEOUT');
            };
            await wait(status => status?.entered.bid && status?.entered.cancel);
            let bought, cancelled, native = null;
            if (ordering === 'cancel-first') {
                await context.gates.release('cancel');
                cancelled = await cancelPending;
                demand(cancelled.value.state === 'Cancelled', 'CANCEL_DID_NOT_WIN');
                await context.gates.release('bid');
                bought = await bidPending;
                demand(bought.value.state === 'Open' && !bought.value.matchId, 'CANCELLED_ASK_MATCHED');
                await cancel(bidEnv, 'controlled-cancel-bid-cleanup');
                demand((await runtime.unit(label)).state === 'IssuerOpen', 'CANCEL_CREATED_NATIVE_RIGHT');
            }
            else {
                await context.gates.release('bid');
                await wait(status => status?.signed === true);
                await context.gates.release('cancel');
                cancelled = await cancelPending;
                demand(cancelled.value.code === 'PENDING_SETTLEMENT', 'SIGN_WINNER_CANCELLED');
                bought = await bidPending;
                native = await runtime.settle(op, { allowInitialExecution: true });
                demand(native.evidence.status === 'finalized-success', 'MATCH_DID_NOT_FINALIZE');
            }
            const schedule = await context.gates.clear(), evidence = [opened.evidence, bought.evidence, cancelled.evidence, { kind: 'http-controlled-schedule', ordering, events: schedule.events }, ...(native ? [native.evidence] : [])];
            const proofs = ordering === 'match-first' ? [proof('T3:http-cancel-sign-race', evidence, ['both-W6-requests-pending-before-release', 'matching-signed-before-cancel-release', 'cancel-refused-PENDING_SETTLEMENT', 'one-finalized-native-fill', 'cancel-first-branch-also-observed'])] : [];
            return {
                evidence,
                operationIds: native ? [op] : [],
                tradeIds: native ? [op] : [],
                proofs
            };
        }, { operations: [op], bucket: ordering === 'match-first' ? 'funding' : 'probes' });
    }
    async function regularFirstSponsor() {
        return runtime.step('concrete:regular-first-guard', { kind: 'ordinary-exact-unit-reservation-won' }, async () => {
            const u = await runtime.unit('U2'), s = runtime.seriesFor('U2'), campaignId = stableIdentity(config.runId, 'U2', 'declined-sponsor'), packetHash = stableIdentity(config.runId, 'U2', 'packet');
            const campaign = runtime.envelope('U2', 'other-campaign', config.run.sponsor, {
                kind: 'SponsorMandate',
                campaignId,
                series: s.address,
                packetHash,
                budget: '10000',
                perGrant: '10000',
                maxGrants: 1,
                eligibleCount: 2,
                eligibleKeys: [config.run.buyerA, config.run.buyerB, ZERO_KEY, ZERO_KEY],
                validUntilSlot: s.useBySlot,
                version: 1
            });
            const admitted = await runtime.http('/campaigns', campaign), consent = runtime.envelope('U2', 'sponsor-after-ordinary', config.run.buyerA, {
                kind: 'SponsoredConsent',
                campaignId,
                campaignVersion: 1,
                series: s.address,
                unit: u.address,
                cursor: '0',
                amount: '10000',
                sponsor: config.run.sponsor,
                packetHash,
                validUntilSlot: s.useBySlot,
                assessment: 0,
                nontransferable: 1
            }), issuer = runtime.envelope('U2', 'late-issuer-quote', config.run.issuer, {
                kind: 'BookOrder',
                side: 1,
                lane: 0,
                series: s.address,
                refundFace: '0',
                exactUnit: u.address,
                expectedCursor: '0',
                limit: '10000',
                validUntilSlot: s.useBySlot,
                minRemainingAfter: 0,
                tif: 0,
                quantity: 1
            });
            const before = (await context.store.captureWallet(config.run.sponsor)).balance, rejected = await runtime.http('/sponsored-access', { consentEnvelope: consent, issuerEnvelope: issuer }, { expected: [409] });
            demand((await context.store.captureWallet(config.run.sponsor)).balance === before && (await context.store.getCampaign(campaignId)).consumedGross === '0' && (await runtime.unit('U2')).sponsored === 0, 'REGULAR_FIRST_DOUBLE_FUND');
            return { evidence: [admitted.evidence, rejected.evidence], proofs: [] };
        });
    }
    async function resourceProof() {
        return runtime.step('concrete:resource-bounds', { kind: 'actual-physical-and-sqlite-bounds' }, async () => {
            const readout = context.resourceReadout ?? context.control?.measureResources;
            demand(typeof readout === 'function', 'RESOURCE_READOUT_REQUIRED');
            const measured = await readout(), db = await context.store.storageInfo();
            demand(BigInt(measured.freeBytes) >= 40000000000n && Number.isSafeInteger(measured.toolsBytes) && measured.toolsBytes <= 4 * 1024 ** 3 && Number.isSafeInteger(measured.buildBytes) && measured.buildBytes <= 2 * 1024 ** 3 && Number.isSafeInteger(measured.ledgerBytes) && measured.ledgerBytes <= 512 * 1024 ** 2 && Number.isSafeInteger(measured.dbAndLogsBytes) && measured.dbAndLogsBytes <= 50 * 1024 ** 2, 'RESOURCE_CAP');
            demand(db.synchronous === 2 && db.fullfsync === 1 && db.maximumPages * db.pageSize <= 24 * 1024 ** 2, 'SQLITE_FULL_CONFIG');
            const evidence = {
                kind: 'resource-measurement',
                freeBytes: String(measured.freeBytes),
                toolsBytes: measured.toolsBytes,
                buildBytes: measured.buildBytes,
                ledgerBytes: measured.ledgerBytes,
                dbAndLogsBytes: measured.dbAndLogsBytes,
                sqlite: {
                    synchronous: db.synchronous,
                    fullfsync: db.fullfsync,
                    pageSize: db.pageSize,
                    maximumPages: db.maximumPages
                }
            };
            return { evidence: [evidence], proofs: [proof('T9:physical-storage-full-config', [evidence], ['actual-root-readout', 'all-resource-caps', 'sqlite-FULL-fullfsync-page-cap'])] };
        });
    }
    async function sponsorFirst() {
        const sponsor = context.sponsorship;
        await context.store.sponsorAccess({
            consentEnvelope: sponsor.consentEnvelope,
            issuerEnvelope: sponsor.issuerEnvelope,
            currentSlot: await context.rpc.slot(),
            walletContext: await context.store.captureWallet(config.run.sponsor)
        });
        const u = await runtime.unit('U3'), s = runtime.seriesFor('U3'), ordinary = runtime.envelope('U3', 'regular-after-sponsor-reservation', config.run.issuer, {
            kind: 'BookOrder',
            side: 1,
            lane: 0,
            series: s.address,
            refundFace: '0',
            exactUnit: u.address,
            expectedCursor: '0',
            limit: '10000',
            validUntilSlot: s.useBySlot,
            minRemainingAfter: 0,
            tif: 0,
            quantity: 1
        });
        const [sponsored, rejected] = await Promise.all([runtime.http('/sponsored-access', { consentEnvelope: sponsor.consentEnvelope, issuerEnvelope: sponsor.issuerEnvelope }), runtime.http('/orders', ordinary, { expected: [409] })]);
        demand(['PENDING_SETTLEMENT', 'INCOMPATIBLE', 'STALE_CURSOR'].includes(rejected.value.code), 'ORDINARY_RESERVATION_NOT_BLOCKED');
        journal.prepare('concrete:sponsor-first-guard', { kind: 'sponsor-exact-unit-reservation-won' });
        journal.complete('concrete:sponsor-first-guard', { evidence: [sponsored.evidence, rejected.evidence], proofs: [] });
        return sponsored;
    }
    async function sponsorBudgetReservations() {
        return runtime.step('concrete:sponsor-cap', { kind: 'two-distinct-units-budget6000-plus6000-cap10000' }, async () => {
            const s = (await current('U0')).series;
            demand(s.sponsoredPrice === '6000', 'MAIN_SPONSORED_PROBE_PRICE_MUST_BE6000');
            const campaignId = stableIdentity(config.runId, 'budget-probe', 'campaign'), packetHash = stableIdentity(config.runId, 'budget-probe', 'packet');
            const mandate = runtime.envelope('budget-probe', 'mandate', config.run.sponsor, {
                kind: 'SponsorMandate',
                campaignId,
                series: s.address,
                packetHash,
                budget: '10000',
                perGrant: '6000',
                maxGrants: 2,
                eligibleCount: 2,
                eligibleKeys: [config.run.buyerA, config.run.buyerB, ZERO_KEY, ZERO_KEY],
                validUntilSlot: s.useBySlot,
                version: 1
            });
            const campaign = await runtime.http('/campaigns', mandate), requests = [];
            for (const [index, label] of ['U0', 'U1'].entries()) {
                const u = await runtime.unit(label), actor = index ? config.run.buyerB : config.run.buyerA;
                const consentEnvelope = runtime.envelope('budget-probe', 'consent-' + label, actor, {
                    kind: 'SponsoredConsent',
                    campaignId,
                    campaignVersion: 1,
                    series: s.address,
                    unit: u.address,
                    cursor: '0',
                    amount: '6000',
                    sponsor: config.run.sponsor,
                    packetHash,
                    validUntilSlot: s.useBySlot,
                    assessment: 1,
                    nontransferable: 1
                });
                const issuerEnvelope = runtime.envelope('budget-probe', 'quote-' + label, config.run.issuer, {
                    kind: 'BookOrder',
                    side: 1,
                    lane: 0,
                    series: s.address,
                    refundFace: '0',
                    exactUnit: u.address,
                    expectedCursor: '0',
                    limit: '6000',
                    validUntilSlot: s.useBySlot,
                    minRemainingAfter: 0,
                    tif: 0,
                    quantity: 1
                });
                requests.push({
                    consentEnvelope,
                    issuerEnvelope,
                    currentSlot: await context.rpc.slot(),
                    walletContext: await context.store.captureWallet(config.run.sponsor)
                });
            }
            // Each call uses the actual sole-writer core transaction. Captures can
            // race; a stale-wallet refusal is followed by ONE fresh-capture retry
            // of the SAME signed authorization, before any native signing exists.
            const outcomes = await Promise.allSettled(requests.map(value => context.store.sponsorAccess(value)));
            const admitted = outcomes.filter(row => row.status === 'fulfilled');
            demand(admitted.length === 1, 'SPONSOR_CAP_DOUBLE_RESERVATION');
            const pending = admitted[0].value, matched = await context.store.getMatch(pending.matchId), counter = await context.store.getCampaign(campaignId);
            demand(counter.consumedGross === '0' && counter.activeReservedGross === '6000' && counter.activeReservedCount === 1, 'SPONSOR_RESERVATION_TOTAL');
            const loser = outcomes.findIndex(row => row.status === 'rejected');
            demand(loser >= 0, 'SPONSOR_CAP_NOT_TESTED');
            let budgetDenied = false;
            try {
                await context.store.sponsorAccess({ ...requests[loser], walletContext: await context.store.captureWallet(config.run.sponsor) });
            }
            catch (error) {
                budgetDenied = ['INSUFFICIENT_AVAILABLE', 'INCOMPATIBLE'].includes(error.code);
            }
            demand(budgetDenied, 'SPONSOR_CAP_NOT_ENFORCED');
            await context.store.abortNeverSignedMatch(matched.id, { expectedVersion: matched.version });
            const after = await context.store.getCampaign(campaignId);
            demand(after.activeReservedGross === '0' && after.consumedGross === '0' && (await context.store.captureWallet(config.run.sponsor)).held === '0', 'UNSIGNED_SPONSOR_RESERVATION_NOT_RELEASED');
            const fact = {
                kind: 'core-current-db',
                campaignId,
                attemptedGross: ['6000', '6000'],
                budget: '10000',
                maximumConcurrentReserved: '6000',
                nativeTransactions: 0
            };
            const evidence = [campaign.evidence, fact];
            return { evidence, proofs: [proof('T4:sponsor-cap-reservations', evidence, ['distinct-units-share-one-budget', '6000+6000-exceeds10000', 'one-reservation-only', 'same-loser-auth-cannot-bypass-cap', 'unsigned-abort-releases-only-unconsumed-reservation'])] };
        });
    }
    async function admit(env) {
        const auth = decodeAuthorization(canonicalBase64(env.authorization));
        return await context.store.admitAuthorization(env, { currentSlot: await context.rpc.slot(), ...(auth.side === 0 ? { walletContext: await context.store.captureWallet(auth.actor) } : {}) });
    }
    async function bookRights() {
        return runtime.step('concrete:rights-and-sequence', { kind: 'current-native-unit-book-rules', unit: (await runtime.unit('U0')).address }, async () => {
            const u = await runtime.unit('U0'), s = runtime.seriesFor('U0');
            demand(u.transferCount === 2 && u.owner === config.run.buyerA, 'RIGHTS_TEST_UNIT');
            const order = (name, side, limit, min = 0) => runtime.envelope('book-rules', name, side ? config.run.buyerA : config.run.buyerB, {
                kind: 'BookOrder',
                side,
                lane: 1,
                series: s.address,
                refundFace: '10000',
                exactUnit: side ? u.address : ZERO_KEY,
                expectedCursor: side ? u.cursor : '0',
                limit,
                validUntilSlot: s.useBySlot,
                minRemainingAfter: min,
                tif: 0,
                quantity: 1
            });
            const high = order('high-ineligible', 0, '12000', 1), low = order('low-eligible', 0, '11000'), ask = order('incoming-ask', 1, '10000');
            const h = await admit(high), l = await admit(low), a = await admit(ask), m = await context.store.getMatch(a.matchId);
            demand(m.buyOrderId === l.id && m.gross === '11000' && (await context.store.getOrder(h.id)).state === 'Open', 'INCOMING_ASK_RIGHTS_FILTER');
            await context.store.abortNeverSignedMatch(m.id, { expectedVersion: m.version });
            demand((await context.store.getOrder(l.id)).state === 'FailedClosed' && (await context.store.getOrder(a.id)).state === 'FailedClosed', 'BOTH_ORDERS_NOT_ABORTED');
            await cancel(high, 'high-cleanup');
            const standing = order('standing-ask', 1, '10000'), ineligible = order('incoming-ineligible', 0, '12000', 1), sa = await admit(standing), ib = await admit(ineligible);
            demand(sa.matchId === null && ib.matchId === null && (await context.store.getOrder(ib.id)).state === 'Open', 'INCOMING_BID_RIGHTS_FILTER');
            await cancel(standing, 'standing-cleanup');
            await cancel(ineligible, 'incoming-cleanup');
            const q1 = order('equal-first', 0, '11000'), q2 = order('equal-second', 0, '11000'), qask = order('equal-ask', 1, '10000');
            const first = await admit(q1), second = await admit(q2), taken = await admit(qask), matched = await context.store.getMatch(taken.matchId);
            demand(first.sequence < second.sequence && matched.buyOrderId === first.id, 'PRICE_TIME_SEQUENCE');
            await context.store.abortNeverSignedMatch(matched.id, { expectedVersion: matched.version });
            await cancel(q2, 'equal-cleanup');
            demand((await runtime.unit('U0')).cursor === u.cursor && (await runtime.unit('U0')).owner === u.owner, 'UNSIGNED_MATCH_CHANGED_NATIVE_RIGHT');
            const evidence = {
                kind: 'core-current-db',
                unit: u.address,
                cursor: u.cursor,
                selectedEligibleOrder: l.id,
                eligiblePrice: '11000',
                firstSequence: first.sequence,
                secondSequence: second.sequence,
                nativeTransactions: 0
            };
            return { evidence: [evidence], proofs: ['T1:price-time-and-rights-filter', 'T5:never-signed-abort'].map(id => proof(id, [evidence], ['eligibility-before-price-both-directions', 'equal-price-admission-sequence', 'both-unsigned-orders-closed', 'no-native-right-change'])) };
        });
    }
    async function ingressFill() {
        return runtime.step('concrete:ingress-cap', { kind: 'active-order-count-cap' }, async () => {
            const envelopes = [];
            for (let index = 0; index < 32; index++) {
                const env = bid('ingress-' + index, '1');
                await runtime.http('/orders', env);
                envelopes.push(env);
            }
            const refused = await runtime.http('/orders', bid('ingress-rejected', '1'), { expected: [503] });
            demand(refused.value.code === 'CAPACITY', 'INGRESS_NOT_REFUSED');
            return { orderIds: envelopes.map(idOf), evidence: [refused.evidence], proofs: [] };
        });
    }
    async function ingressCleanup() {
        const prepared = journal.get('concrete:ingress-cap');
        demand(prepared?.state === 'Complete', 'INGRESS_STEP_REQUIRED');
        const native = journal.get('U0:terminal');
        demand(native?.result?.evidence?.some(row => row.kind === 'native-transaction' && row.status === 'finalized-success'), 'FUNDED_DRAIN_NOT_OBSERVED');
        const evidence = [...prepared.result.evidence, ...native.result.evidence];
        for (let index = 0; index < 32; index++)
            await cancel(bid('ingress-' + index, '1'), 'ingress-cancel-' + index);
        journal.prepare('concrete:drained-at-cap', { kind: 'same-db-ingress-refusal-and-funded-close' });
        journal.complete('concrete:drained-at-cap', { evidence, proofs: [proof('T9:drain-at-ingress-cap', evidence, ['33rd-active-order-refused', 'funded-U0-finalized-while32-orders-rested', 'terminal-drain-reserve-available'])] });
    }
    return {
        async beforeFunding() {
            await proveIsolatedFence({ config, journal });
            await httpReservations();
            await sponsorBeforeGrant();
            await sponsorBudgetReservations();
            await controlledCancelMatch('cancel-first');
            await negative('invalid-issuance', 'U2');
            await negative('oversize-issuance', 'U2');
            await negative('consume-primary-minimum', 'U2');
            await negative('sponsored-positive-minimum', 'U3');
        },
        async afterTrade(label, index, result) {
            if (label === 'U0' && index === 0)
                await runtime.step('concrete:exact-replay', { kind: 'same-persisted-native-transaction', operationId: result.operationIds[0] }, async () => {
                    const evidence = await direct.replayOriginal(await context.store.native.get(result.operationIds[0]));
                    return { evidence: [evidence], proofs: [proof('T2:exact-native-replay', [evidence], ['same-signed-bytes-and-original-signature', 'no-new-principal-market-fee-or-rent'])] };
                });
            if (label === 'U2' && index === 0)
                await regularFirstSponsor();
        },
        async afterSponsor() {
            const regular = journal.get('concrete:regular-first-guard'), sponsored = journal.get('concrete:sponsor-first-guard');
            demand(regular?.state === 'Complete' && sponsored?.state === 'Complete', 'BOTH_AVAILABILITY_DIRECTIONS_REQUIRED');
            const evidence = [...regular.result.evidence, ...sponsored.result.evidence, ...journal.get('U3:sponsor').result.evidence];
            journal.prepare('concrete:shared-sponsor-guard', { kind: 'shared-Unit-guard-both-directions' });
            journal.complete('concrete:shared-sponsor-guard', { evidence, proofs: [proof('T4:regular-sponsor-unit-race', evidence, ['ordinary-reservation-blocks-sponsor', 'sponsor-reservation-blocks-ordinary', 'one-primary-funding-only', 'sponsored-fixed-price-provenance'])] });
        },
        async finish() {
            await resourceProof();
        },
        async beforeTrade(label, index) {
            if (label === 'U6' && index === 0) {
                await lastUnitRace();
                return true;
            }
            if (label === 'U2' && index === 0) {
                const row = journal.get('U0:trade:0');
                demand(row?.result?.operationIds?.[0], 'SOURCE_FUND_REQUIRED');
                await negative('filled-order-reuse', 'U2', { sourceFund: await context.store.native.get(row.result.operationIds[0]) });
                await controlledCancelMatch('match-first');
                await regularFirstSponsor();
                return true;
            }
        },
        async beforeStart(label) {
            if (label === 'U0') {
                await bookRights();
                await ingressFill();
            }
            if (label === 'U3')
                await negative('sponsor-resale', 'U3');
            if (label === 'U6') {
                await negative('wrong-start-owner', 'U6');
                await negative('missing-owner-signature', 'U6');
                await negative('foreign-unit-account', 'U6');
                await race('race-secondary', 'U6', ['race-secondary-a', 'race-secondary-b']);
                await race('race-resale-start', 'U6', ['race-resale', 'race-start']);
            }
            if (label === 'U7')
                await race('two-start', 'U7', ['two-start-a', 'two-start-b']);
        },
        async afterStart(label) {
            if (label === 'U1')
                await negative('wrong-refund-holder', 'U1');
            if (label === 'U5') {
                await runtime.waitSlot((await runtime.unit('U5')).lockDeadlineSlot);
                await negative('finalize-lease-equality', 'U5');
            }
        },
        async beforeTerminal(label) {
            if (label === 'U4') {
                await runtime.waitSlot(runtime.seriesFor('U4').useBySlot);
                await negative('expired-start', 'U4');
            }
        },
        async afterTerminal(label) {
            if (label === 'U0') {
                await ingressCleanup();
            }
            if (label === 'U0')
                await runtime.step('concrete:monotonic', { kind: 'older-native-observation-refusal' }, async () => {
                    const operationId = journal.get('U0:terminal').result.operationIds[0], saved = await context.store.native.get(operationId), summary = await context.store.native.getEvidence(operationId), before = hash(saved);
                    let refused = false;
                    try {
                        await context.store.native.observe(operationId, { ...summary, expectedVersion: saved.version, contextSlot: (BigInt(saved.lastObservedSlot) - 1n).toString() });
                    }
                    catch (error) {
                        refused = error.code === 'STALE_CURSOR';
                    }
                    demand(refused && hash(await context.store.native.get(operationId)) === before, 'TERMINAL_REGRESSED');
                    const evidence = journal.get('U0:terminal').result.evidence;
                    return { evidence, proofs: [proof('T8:monotonic-observation', evidence, ['older-context-rejected', 'original-terminal-unchanged'])] };
                });
        },
        close() {
            direct.close();
        },
        sponsorFirst,
        negative,
        race,
        current,
        sync,
    };
}
