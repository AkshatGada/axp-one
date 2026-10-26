/** Coupling to the actual core outbox, W6 HTTP service and native observer. */
import { CRASH_STEPS, assertLateResponse, buildCrashProofs } from './phase2-acceptance-recovery.mjs';
import { canonical } from '../../packages/contracts/index.mjs';
import { encodeAuthorization, encodeAccount, ACCOUNT_SCHEMAS, canonicalBase64, ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { domainHash, orderId, operationId, matchId, sha256 } from '../../packages/machine-market/native/domain.mjs';
import { localEndpoint } from '../../packages/machine-market/native/rpc.mjs';
import { parseTransaction } from '../../packages/machine-market/native/transaction.mjs';
import { nativeEvidence, httpEvidence, privateResponseEvidence } from './phase2-acceptance-evidence.mjs';
import { stableIdentity, hash } from './phase2-acceptance-schedule.mjs';
export function authorizationEnvelope({ run, runId, caseId, stepId, actor, value, signAuthorization }) {
    const nonce = stableIdentity(runId, caseId, stepId), domain = domainHash(run);
    const input = {
        ...value,
        domain,
        actor,
        nonce
    };
    if (['BookOrder', 'SponsoredConsent'].includes(input.kind))
        input.orderId = orderId({ domain, actor, nonce });
    const bytes = encodeAuthorization(input), signature = signAuthorization(actor, bytes);
    const sig = Buffer.isBuffer(signature) || signature instanceof Uint8Array ? Buffer.from(signature).toString('base64') : signature;
    canonicalBase64(sig, 64);
    return { authorization: bytes.toString('base64'), signature: sig, idempotencyKey: nonce };
}
export function createAcceptanceHttp({ origin, operatorToken, fetchImpl = globalThis.fetch }) {
    origin = localEndpoint(origin);
    return async function request(route, body, { operator = false, expected = [200, 202] } = {}) {
        if (!/^\/(?:orders(?:\/cancel)?|campaigns|sponsored-access|deliveries\/(?:start|process|read)|operations\/[a-f0-9]{64}\/(?:reconcile|resend))$/.test(route))
            throw Error('ACCEPTANCE_ROUTE');
        const bytes = Buffer.from(canonical(body));
        if (bytes.length > 8192)
            throw Error('ACCEPTANCE_BODY');
        const response = await fetchImpl(origin + '/api/trading' + route, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(30000),
            headers: { 'content-type': 'application/json', 'origin': origin, ...(operator ? { 'x-axp-local-operator': operatorToken } : {}) },
            body: bytes
        });
        const raw = Buffer.from(await response.arrayBuffer());
        if (raw.length > 196608)
            throw Error('ACCEPTANCE_RESPONSE');
        let value;
        try {
            value = JSON.parse(raw);
        }
        catch {
            throw Error('ACCEPTANCE_RESPONSE');
        }
        const evidence = httpEvidence({
            authority: 'localhost-http',
            status: response.status,
            requestHash: hash(bytes),
            responseHash: hash(raw),
            checks: []
        });
        if (!expected.includes(response.status)) {
            const error = Error('HTTP_CASE_REJECTED');
            error.safeCode = value?.code ?? 'HTTP_CASE_REJECTED';
            error.evidence = evidence;
            throw error;
        }
        return { value, evidence };
    };
}
export async function captureNativeEvidence({ operation, observer, rpc, run }) {
    const observed = await observer.observeFinalized(operation);
    if (observed.evidence !== 'transaction-finalized' || !observed.feeKnown || !['success', 'failure'].includes(observed.status)) {
        const error = Error('PENDING_SETTLEMENT');
        error.operationId = operation.id;
        throw error;
    }
    const parsed = parseTransaction(operation.attempt.transaction), tx = await rpc.transaction(parsed.signature);
    if (!tx || tx.transaction?.[0] !== operation.attempt.transaction || !Number.isSafeInteger(tx.meta?.computeUnitsConsumed))
        throw Error('RUNTIME_MEASUREMENTS_REQUIRED');
    const receipts = observed.accounts.filter(row => row.decoded).map(row => {
        const decoded = row.decoded, schema = ACCOUNT_SCHEMAS[decoded.kind];
        const value = {
            kind: decoded.kind,
            state: decoded.state,
            market: decoded.market,
            ...Object.fromEntries(schema.fields.map(([field]) => [field, decoded[field]]))
        };
        return { address: row.address, base64: encodeAccount(value).toString('base64') };
    });
    const normalized = {
        authority: 'solana-local-validator',
        evidence: observed.evidence,
        operationId: operation.id,
        status: observed.status === 'success' ? 'finalized-success' : 'finalized-failure',
        signature: parsed.signature,
        slot: observed.transactionSlot,
        transactionBytes: canonicalBase64(operation.attempt.transaction).length,
        computeUnits: tx.meta.computeUnitsConsumed,
        feePayer: observed.effects.feePayer,
        feeLamports: observed.effects.fee,
        rentLamports: observed.effects.rent,
        instructionBase64: parsed.data,
        accounts: observed.effects.deltas.map(row => ({
            address: row.key,
            before: row.pre,
            after: row.post,
            delta: row.delta
        })),
        receipts,
        rent: []
    };
    const evidence = nativeEvidence(normalized, { operationId: operation.id, expectedInstruction: canonicalBase64(parsed.data), expectedDeltas: Object.fromEntries(observed.effects.deltas.map(row => [row.key, row.delta])) });
    return {
        evidence,
        observed,
        transactionHash: hash(canonicalBase64(operation.attempt.transaction)),
        rentLamports: observed.effects.rent
    };
}
export function createScenarioRuntime({ config, context, journal, resume = false, pollLimit = 120, pollDelayMs = 250 }) {
    const { run, runId } = config;
    let { store, rpc, service, observer, signAuthorization } = context;
    if (!store?.native || !service || !observer || typeof signAuthorization !== 'function')
        throw Error('LEAD_CONTEXT_REQUIRED');
    let http = context.http ?? createAcceptanceHttp({ origin: config.serviceOrigin, operatorToken: context.operatorToken });
    const get = async (id) => {
        try {
            return await store.native.get(id);
        }
        catch (error) {
            if (error.code === 'INVALID_INPUT')
                return null;
            throw error;
        }
    };
    async function settle(id, { allowInitialExecution = false } = {}) {
        let op = await get(id);
        if (op?.state === 'Signing' || op?.state === 'Quarantined' && !op.attempt)
            throw Error('SIGNING_FENCE_UNCERTAIN');
        if (!op?.attempt && allowInitialExecution) {
            await service.executeOperation(id);
            op = await get(id);
        }
        if (!op?.attempt)
            throw Error('PENDING_SETTLEMENT');
        journal.markSigned(id, hash(op.attempt.transaction));
        for (let poll = 0; poll < pollLimit; poll++) {
            await service.reconcile(id);
            op = await get(id);
            if (['ResolvedSuccess', 'ResolvedFailure'].includes(op?.state) && !op.blocked)
                return captureNativeEvidence({
                    operation: op,
                    observer,
                    rpc,
                    run
                });
            if (op?.state === 'Quarantined')
                throw Error('NATIVE_QUARANTINED');
            if (poll + 1 < pollLimit)
                await new Promise(resolve => setTimeout(resolve, pollDelayMs));
        }
        throw Error('PENDING_SETTLEMENT');
    }
    async function step(id, intent, perform, { operations = [], bucket = 'funding', trade = false, resumeSelect } = {}) {
        const saved = journal.get(id);
        if (saved?.state === 'Complete')
            return saved.result;
        journal.prepare(id, intent);
        if (operations.length)
            journal.bind(id, operations);
        for (const operation of operations)
            if (!journal.snapshot().attempts.some(row => row.id === operation))
                journal.reserveAttempt(operation, bucket);
        try {
            // On resume, an existing native attempt is OBSERVED only. No resend/new sign.
            const persisted = saved?.operationIds ? await Promise.all(saved.operationIds.map(get)) : [];
            const point = CRASH_STEPS[id];
            if (resume && persisted.some(op => op?.attempt || op?.fenceToken)) {
                const selected = resumeSelect ? await resumeSelect() : saved.operationIds;
                let marker = null;
                if (point) {
                    const original = await get(selected[0]);
                    marker = await context.crashController.recoverEvidence({ operationId: selected[0], point, operation: original });
                    await service.reconcile(selected[0]);
                    if (point === 'after-signed-persistence' && (await get(selected[0])).state !== 'ResolvedSuccess')
                        await service.resend(selected[0]);
                }
                const captured = [];
                for (const operation of selected)
                    captured.push(await settle(operation));
                const proofs = marker ? buildCrashProofs({ point, native: captured[0].evidence, marker }) : [];
                const result = { evidence: [...captured.map(row => row.evidence), ...(marker ? [marker] : [])], operationIds: selected, proofs };
                journal.complete(id, result, { tradeIds: trade ? selected : [] });
                return result;
            }
            if (point) {
                if (!context.crashController)
                    throw Error('CONCRETE_CRASH_CONTROLLER_REQUIRED');
                const operationId = operations[0];
                journal.prepare('crash:' + operationId, { kind: 'same-run-process-crash', point, operationId });
                replaceContext(await context.crashController.armCrash({ operationId, point }));
                try {
                    await perform();
                    throw Error('EXPECTED_PROCESS_CRASH_REQUIRED');
                }
                catch (error) {
                    if (error.message === 'EXPECTED_PROCESS_CRASH_REQUIRED')
                        throw error;
                }
                const recovered = await context.crashController.restartSameRun({ operationId });
                replaceContext(recovered);
                const original = await get(operationId);
                journal.markSigned(operationId, hash(original.attempt.transaction));
                await service.reconcile(operationId);
                const extra = [];
                if (point === 'after-signed-persistence') {
                    const i = original.instruction, buy = orderId({ domain: domainHash(run), actor: original.accounts.beneficiary, nonce: i.buyNonce }), o = await store.getOrder(buy);
                    const cancel = envelope('U7', 'cancel-signed-race', o.actor, {
                        kind: 'Cancel',
                        originalOrderId: o.id,
                        originalNonce: o.nonce,
                        originalAuthHash: o.authHash,
                        expectedOrderVersion: String(o.version)
                    });
                    const denied = await http('/orders/cancel', cancel, { expected: [409] });
                    if (denied.value.code !== 'PENDING_SETTLEMENT')
                        throw Error('SIGNED_CANCEL_ACCEPTED');
                    extra.push(denied.evidence);
                    await service.resend(operationId);
                }
                const captured = await settle(operationId);
                const proofs = buildCrashProofs({ point, native: captured.evidence, marker: recovered.crashEvidence });
                // This is a sequential post-restart refusal, not the concurrent race.
                // The actual race proof is emitted only by controlledCancelMatch.
                const result = { evidence: [captured.evidence, recovered.crashEvidence, ...extra], operationIds: [operationId], proofs };
                journal.complete(id, result, { tradeIds: trade ? [operationId] : [] });
                journal.complete('crash:' + operationId, { evidence: [recovered.crashEvidence], proofs: [] });
                return result;
            }
            const result = await perform();
            journal.complete(id, result, { tradeIds: [...(trade ? operations : []), ...(result.tradeIds ?? [])] });
            return result;
        }
        catch (error) {
            journal.stop(['PENDING_SETTLEMENT', 'SIGNING_FENCE_UNCERTAIN', 'NATIVE_QUARANTINED'].includes(error.message) ? error.message : 'CASE_NEEDS_REVIEW', operations);
            throw error;
        }
    }
    function envelope(caseId, stepId, actor, value) {
        return authorizationEnvelope({
            run,
            runId,
            caseId,
            stepId,
            actor,
            value,
            signAuthorization
        });
    }
    const unit = async (label) => {
        const row = config.units.find(row => row.id === label);
        if (!row)
            throw Error('UNIT_BINDING');
        return await store.getUnit(row.address);
    };
    const seriesFor = label => {
        const binding = config.units.find(row => row.id === label);
        return config.series.find(row => row.id === binding.series);
    };
    async function trade(label, index, sellerRole, buyerRole, gross, { incomingAsk = false } = {}) {
        const id = label + ':trade:' + index, s = seriesFor(label), u = await unit(label), caseId = label, expectedCursor = String(index), lane = index === 0 ? 0 : 1;
        // Unit is read only to assert the declared scenario; it never replaces native
        // ownership or allows a different Unit under an original authorization.
        const common = {
            kind: 'BookOrder',
            lane,
            series: s.address,
            refundFace: lane ? '10000' : '0',
            validUntilSlot: s.useBySlot,
            minRemainingAfter: 0,
            tif: 0,
            quantity: 1
        };
        const ask = envelope(caseId, 'trade:' + index + ':ask', run[sellerRole], {
            ...common,
            side: 1,
            exactUnit: u.address,
            expectedCursor,
            limit: incomingAsk ? (BigInt(gross) - 1000n).toString() : gross
        });
        const bid = envelope(caseId, 'trade:' + index + ':bid', run[buyerRole], {
            ...common,
            side: 0,
            exactUnit: ZERO_KEY,
            expectedCursor: '0',
            limit: incomingAsk ? gross : (BigInt(gross) + 2000n).toString()
        });
        const askId = orderId({ domain: domainHash(run), actor: run[sellerRole], nonce: ask.idempotencyKey }), bidId = orderId({ domain: domainHash(run), actor: run[buyerRole], nonce: bid.idempotencyKey });
        const expectedMatch = matchId({
            domain: domainHash(run),
            buyOrderId: bidId,
            sellOrderId: askId,
            unit: u.address,
            expectedCursor,
            gross,
            fundingKind: lane
        }), opId = operationId({ domain: domainHash(run), type: 'FundMatch', matchId: expectedMatch });
        return step(id, {
            kind: 'book-trade',
            unit: u.address,
            gross,
            expectedCursor,
            askHash: hash(ask.authorization),
            bidHash: hash(bid.authorization)
        }, async () => {
            const first = await http('/orders', incomingAsk ? bid : ask);
            const second = await http('/orders', incomingAsk ? ask : bid);
            const buyOrder = await store.getOrder(bidId), sellOrder = await store.getOrder(askId);
            if (buyOrder.matchId !== expectedMatch || sellOrder.matchId !== expectedMatch)
                throw Error('DECLARED_MATCH_MISMATCH');
            const captured = await settle(opId, { allowInitialExecution: true });
            if (captured.evidence.status !== 'finalized-success')
                throw Error('EXPECTED_NATIVE_SUCCESS');
            const owner = await unit(label);
            if (owner.owner !== run[buyerRole] || owner.cursor !== (BigInt(expectedCursor) + 1n).toString() || owner.refundFace !== '10000')
                throw Error('NATIVE_OWNERSHIP_MISMATCH');
            return {
                evidence: [first.evidence, second.evidence, captured.evidence],
                operationIds: [opId],
                matchId: expectedMatch,
                rentLamports: captured.rentLamports,
                proofs: []
            };
        }, { operations: [opId], trade: true });
    }
    async function start(label) {
        const id = label + ':start', s = seriesFor(label), u = await unit(label), saved = journal.get(id);
        const expectedCursor = saved?.intent?.expectedCursor ?? u.cursor, owner = saved?.intent?.owner ?? u.owner;
        const request = envelope(label, 'delivery-request', owner, {
            kind: 'DeliveryRequest',
            unit: u.address,
            expectedCursor,
            series: s.address,
            resourceHash: s.resourceHash
        });
        const requestHash = sha256(canonicalBase64(request.authorization)), opId = operationId({
            domain: domainHash(run),
            type: 'StartDelivery',
            unit: u.address,
            requestHash
        });
        return step(id, {
            kind: 'start',
            unit: u.address,
            expectedCursor,
            owner,
            requestHash
        }, async () => {
            const response = await http('/deliveries/start', request);
            const captured = await settle(opId, { allowInitialExecution: true });
            if (captured.evidence.status !== 'finalized-success')
                throw Error('EXPECTED_NATIVE_SUCCESS');
            return {
                evidence: [response.evidence, captured.evidence],
                operationIds: [opId],
                requestHash,
                proofs: []
            };
        }, { operations: [opId], bucket: 'terminal' });
    }
    async function process(label, { failure = false } = {}) {
        const id = label + ':terminal', u = await unit(label), requestHash = u.requestHash;
        const type = failure ? 'RefundFailure' : 'FinalizeDelivery', opId = operationId({
            domain: domainHash(run),
            type,
            unit: u.address,
            requestHash
        });
        return step(id, { kind: type, unit: u.address, requestHash }, async () => {
            const response = await http('/deliveries/process', { unit: u.address, requestHash, idempotencyKey: stableIdentity(runId, label, 'process') }, { operator: true });
            const captured = await settle(opId, { allowInitialExecution: true });
            if (captured.evidence.status !== 'finalized-success')
                throw Error('EXPECTED_NATIVE_SUCCESS');
            return { evidence: [response.evidence, captured.evidence], operationIds: [opId], proofs: [] };
        }, { operations: [opId], bucket: 'terminal' });
    }
    async function explicitTerminal(label, type) {
        const id = label + ':terminal', u = await unit(label), s = seriesFor(label), saved = journal.get(id), cursor = saved?.intent?.expectedCursor ?? u.cursor;
        const opId = operationId({
            domain: domainHash(run),
            type,
            unit: u.address,
            ...(type === 'ExpireUnused' ? { preterminalCursor: cursor } : { requestHash: u.requestHash })
        });
        const instruction = { type, operationId: opId, ...(type === 'ExpireUnused' ? { expectedCursor: cursor } : { expectedLockedCursor: cursor, requestHash: u.requestHash }) };
        const accounts = {
            caller: run.matcher,
            market: run.market,
            series: s.address,
            unit: u.address,
            primaryMatch: u.primaryMatch,
            ...(type === 'ExpireUnused' ? { issuer: run.issuer, collector: run.collector } : { refundRecipient: u.sponsored ? run.sponsor : u.owner })
        };
        return step(id, { kind: type, unit: u.address, expectedCursor: cursor }, async () => {
            const deadline = type === 'ExpireUnused' ? s.useBySlot : u.lockDeadlineSlot;
            await waitSlot(deadline);
            // A previously prepared operation must retain its original message/blockhash.
            if (!await get(opId))
                await service.prepare({ instruction, accounts, context: { currentSlot: await rpc.slot() } });
            const captured = await settle(opId, { allowInitialExecution: true });
            if (captured.evidence.status !== 'finalized-success')
                throw Error('EXPECTED_NATIVE_SUCCESS');
            return { evidence: [captured.evidence], operationIds: [opId], proofs: [] };
        }, { operations: [opId], bucket: 'terminal' });
    }
    async function waitSlot(deadline) {
        const maximum = config.maximumWaitMs ?? 120000;
        if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 1800000)
            throw Error('WAIT_BOUND');
        const end = Date.now() + maximum;
        while (BigInt(await rpc.slot()) < BigInt(deadline)) {
            if (Date.now() >= end)
                throw Error('SLOT_WAIT_PENDING');
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }
    async function read(label, { afterUseBy = false } = {}) {
        const id = label + ':read' + (afterUseBy ? ':late' : ''), s = seriesFor(label), u = await unit(label);
        if (afterUseBy)
            await waitSlot(s.useBySlot);
        const request = envelope(label, 'read' + (afterUseBy ? ':late' : ''), u.owner, {
            kind: 'ReadDelivery',
            unit: u.address,
            requestHash: u.requestHash,
            consumedCursor: u.cursor,
            validUntilSlot: config.readValidUntilSlot
        });
        return step(id, {
            kind: 'read',
            unit: u.address,
            requestHash: u.requestHash,
            afterUseBy
        }, async () => {
            const response = await http('/deliveries/read', request), value = response.value;
            const privateProof = privateResponseEvidence({
                bytes: canonicalBase64(value.responseBase64),
                deliveryId: value.response.deliveryId,
                responseHash: value.responseHash,
                resourceHash: value.response.resourceHash,
                versionHash: value.response.versionHash,
                owner: value.response.owner,
                requestHash: value.response.requestHash
            });
            const prior = journal.get(label + ':read');
            if (afterUseBy)
                assertLateResponse({ priorResponseHash: prior?.result?.responseHash, nativeResponseHash: u.responseHash, actualResponseHash: privateProof.responseHash });
            return {
                evidence: [response.evidence, privateProof],
                responseHash: privateProof.responseHash,
                observedSlot: await rpc.slot(),
                proofs: []
            };
        });
    }
    async function expectNoBytes(label) {
        const u = await unit(label), request = envelope(label, 'denied-read', u.owner, {
            kind: 'ReadDelivery',
            unit: u.address,
            requestHash: u.requestHash,
            consumedCursor: u.cursor,
            validUntilSlot: config.readValidUntilSlot
        });
        return step(label + ':no-bytes', { kind: 'denied-read', unit: u.address, requestHash: u.requestHash }, async () => {
            const response = await http('/deliveries/read', request, { expected: [403, 409, 410] });
            if (response.value.responseBase64 !== undefined || response.value.response !== undefined)
                throw Error('PRIVATE_BYTES_RELEASED');
            return { evidence: [response.evidence], denied: true, proofs: [] };
        });
    }
    return {
        step,
        trade,
        start,
        process,
        explicitTerminal,
        read,
        expectNoBytes,
        waitSlot,
        unit,
        seriesFor,
        envelope,
        http: (...args) => http(...args),
        settle,
        get,
        replaceContext
    };
    function replaceContext(next) {
        if (!next?.store?.native || !next.service || !next.observer)
            throw Error('LEAD_CONTEXT_REQUIRED');
        ({
            store,
            rpc,
            service,
            observer,
            signAuthorization
        } = next);
        if (next.http)
            http = next.http;
        Object.assign(context, next);
    }
}
