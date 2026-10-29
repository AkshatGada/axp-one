import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, symlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateSchedule, budgetUsage, BUCKETS, UNITS, stableIdentity, PACKET_SHA256 } from '../../scripts/machine-market/phase2-acceptance-schedule.mjs';
import { openAcceptanceJournal, containedPath } from '../../scripts/machine-market/phase2-acceptance-journal.mjs';
import { assertPublicEvidence, nativeEvidence, privateResponseEvidence, summarizeAcceptance } from '../../scripts/machine-market/phase2-acceptance-evidence.mjs';
// These tests prove harness refusal/recovery checks only. No native acceptance pass.
const temporary = fn => {
    const root = mkdtempSync(join(tmpdir(), 'axp-acceptance-unit-')), cleanup = () => rmSync(root, { recursive: true, force: true });
    try {
        const value = fn(root);
        if (value && typeof value.then === 'function')
            return value.finally(cleanup);
        cleanup();
        return value;
    }
    catch (error) {
        cleanup();
        throw error;
    }
};
const identity = { runId: 'unit-check', packetSha256: PACKET_SHA256, programSha256: 'a'.repeat(64) };
test('finite eight-unit schedule retains 46 signing slots and stays below trade ceiling', () => {
    assert.deepEqual(validateSchedule(), {
        initialUnits: 8,
        targetSuccessfulTrades: 14,
        plannedSignedOperations: 82,
        remainingReserve: 46
    });
    assert.equal(UNITS.length, 8);
    assert.equal(Object.values(BUCKETS).reduce((a, b) => a + b, 0), 128);
    assert.throws(() => validateSchedule({ units: UNITS.slice(1) }), /SCHEDULE_UNITS/);
});
test('all bootstrap/negative/reserved attempts count and buckets cannot overflow', () => {
    const attempts = Array.from({ length: 30 }, (_, i) => ({ id: 'probe-' + i, bucket: 'probes' }));
    assert.equal(budgetUsage(attempts).allocatedSigningSlots, 30);
    assert.throws(() => budgetUsage([...attempts, { id: 'another', bucket: 'probes' }]), /RUN_OPERATION_CAP/);
    assert.throws(() => budgetUsage([{ id: 'duplicate', bucket: 'funding' }, { id: 'duplicate', bucket: 'funding' }]), /ATTEMPT_IDENTITY/);
    assert.throws(() => budgetUsage([], 25), /RUN_BUDGET/);
});
test('stable identities bind the run, case and step without signing material', () => {
    assert.equal(stableIdentity('run', 'case', 'step'), stableIdentity('run', 'case', 'step'));
    assert.notEqual(stableIdentity('run', 'case', 'step'), stableIdentity('run', 'case', 'other'));
});
test('journal persists exact prepared identity and bound operation before completion', () => temporary(root => {
    const path = join(root, 'checkpoint.json');
    let journal = openAcceptanceJournal({ path, privateRoot: root, identity });
    journal.prepare('case:buy', { kind: 'purchase', identity: 'x' });
    journal.bind('case:buy', ['op-a']);
    journal.reserveAttempt('op-a', 'funding');
    journal.close();
    journal = openAcceptanceJournal({
        path,
        privateRoot: root,
        identity,
        resume: true
    });
    assert.equal(journal.get('case:buy').state, 'Bound');
    assert.deepEqual(journal.get('case:buy').operationIds, ['op-a']);
    assert.throws(() => journal.prepare('case:buy', { kind: 'purchase', identity: 'changed' }), /STEP_IDENTITY_CONFLICT/);
    assert.throws(() => journal.bind('case:buy', ['new-op']), /OPERATION_IDENTITY_CONFLICT/);
    journal.complete('case:buy', { observed: true }, { tradeIds: ['match-a'] });
    journal.reserveAttempt('op-a', 'funding');
    assert.equal(journal.snapshot().attempts.length, 1);
    assert.equal(journal.snapshot().successfulTradeIds.length, 1);
    journal.close();
}));
test('journal refuses automatic restart, a competing writer and changed run identity', () => temporary(root => {
    const options = { path: join(root, 'checkpoint.json'), privateRoot: root, identity };
    const journal = openAcceptanceJournal(options);
    assert.throws(() => openAcceptanceJournal({ ...options, resume: true }), /ACCEPTANCE_LOCKED/);
    journal.close();
    assert.throws(() => openAcceptanceJournal(options), /EXPLICIT_RESUME_REQUIRED/);
    assert.throws(() => openAcceptanceJournal({ ...options, resume: true, identity: { ...identity, runId: 'replacement' } }), /RUN_IDENTITY_MISMATCH/);
}));
test('unknown step prevents expansion while preserving original operation for explicit recovery', () => temporary(root => {
    const options = { path: join(root, 'checkpoint.json'), privateRoot: root, identity };
    let journal = openAcceptanceJournal(options);
    journal.prepare('case:buy', { kind: 'purchase' });
    journal.bind('case:buy', ['original']);
    journal.reserveAttempt('original', 'funding');
    journal.stop('PENDING_SETTLEMENT', ['original']);
    journal.close();
    journal = openAcceptanceJournal({ ...options, resume: true });
    assert.throws(() => journal.prepare('new', { kind: 'purchase' }), /RUN_STOPPED/);
    assert.deepEqual(journal.snapshot().stopped.operationIds, ['original']);
    assert.deepEqual(journal.get('case:buy').operationIds, ['original']);
    journal.close();
}));
test('checkpoint and evidence refuse private paths/content/key objects', () => temporary(root => {
    const journal = openAcceptanceJournal({ path: join(root, 'checkpoint.json'), privateRoot: root, identity });
    for (const value of [{ privateKey: 'secret' }, { content: 'resource' }, { signerHandle: 'opaque' }, { path: '/Users/example/private' }]) {
        assert.throws(() => assertPublicEvidence(value), /PRIVATE_EVIDENCE/);
        assert.throws(() => journal.prepare('unsafe', value), /PRIVATE_EVIDENCE/);
    }
    assert.equal(journal.get('unsafe'), null);
    journal.close();
    assert.ok(!readFileSync(join(root, 'checkpoint.json'), 'utf8').includes('secret'));
}));
test('private checkpoint path cannot escape through parent or file symlinks', () => temporary(root => {
    const outside = mkdtempSync(join(tmpdir(), 'axp-outside-unit-'));
    try {
        symlinkSync(outside, join(root, 'link'));
        assert.throws(() => containedPath(root, join(root, 'link', 'checkpoint.json')), /PRIVATE_PATH_REQUIRED/);
        mkdirSync(join(root, 'inside'));
        symlinkSync(join(outside, 'target'), join(root, 'inside', 'checkpoint.json'));
        assert.throws(() => containedPath(root, join(root, 'inside', 'checkpoint.json')), /PRIVATE_PATH_REQUIRED/);
    }
    finally {
        rmSync(outside, { recursive: true, force: true });
    }
}));
test('account-only, pending and synthetic observations cannot be native transaction proof', () => {
    for (const proof of [{}, { authority: 'sqlite-reference-fixture', nativeEvidence: false }, { authority: 'solana-local-validator', evidence: 'account-state-only', status: 'success' }, { authority: 'solana-local-validator', evidence: 'transaction-finalized', status: 'unknown' }])
        assert.throws(() => nativeEvidence(proof), /FINALIZED_TRANSACTION_REQUIRED/);
});
test('no missing proof group is converted into an overall acceptance pass', () => {
    const result = summarizeAcceptance({
        identity,
        steps: [],
        requiredProofs: ['T7:native'],
        budget: budgetUsage([])
    });
    assert.equal(result.complete, false);
    assert.equal(result.checks[0].status, 'pending');
});
test('allocated slots are distinct from actual known signed attempts', () => temporary(root => {
    const journal = openAcceptanceJournal({ path: join(root, 'checkpoint.json'), privateRoot: root, identity });
    journal.reserveAttempt('original', 'probes');
    assert.equal(budgetUsage(journal.snapshot().attempts).knownSignedOperations, 0);
    journal.markSigned('original', 'a'.repeat(64));
    assert.equal(budgetUsage(journal.snapshot().attempts).knownSignedOperations, 1);
    assert.throws(() => journal.markSigned('original', 'b'.repeat(64)), /REPLACEMENT_ATTEMPT/);
    journal.close();
}));
test('worker protocol has no generic method, private key or prototype dispatch', async () => {
    const { validateWorkerRequest } = await import('../../scripts/machine-market/phase2-acceptance-worker.mjs');
    for (const row of [{
            protocol: 'axp.acceptance.ipc.v1',
            id: 1,
            scope: 'store',
            method: 'privateKey',
            args: []
        },
        {
            protocol: 'axp.acceptance.ipc.v1',
            id: 1,
            scope: '__proto__',
            method: 'constructor',
            args: []
        },
        {
            protocol: 'axp.acceptance.ipc.v1',
            id: 1,
            scope: 'service',
            method: 'executeOperation',
            args: [],
            arbitrary: 'payload'
        }])
        assert.throws(() => validateWorkerRequest(row), /WORKER_PROTOCOL/);
    assert.equal(validateWorkerRequest({
        protocol: 'axp.acceptance.ipc.v1',
        id: 1,
        scope: 'native',
        method: 'get',
        args: ['original']
    }).method, 'get');
});
test('native probe catalog cannot authorize an arbitrary probe ID or unit', async () => {
    const { describeNegativeProbe } = await import('../../scripts/machine-market/phase2-acceptance-probes.mjs');
    assert.throws(() => describeNegativeProbe('arbitrary-transfer', {}), /UNDECLARED_NATIVE_PROBE/);
    assert.throws(() => describeNegativeProbe('wrong-start-owner', { config: { units: [{ id: 'U6', address: 'intended' }] }, unit: { address: 'different' } }), /PROBE_UNIT_BINDING/);
});
test('child crash wrapper kills only after durable method returns and records exact attempt hash', async () => temporary(root => {
    return (async () => {
        const { installAcceptanceCrash } = await import('../../scripts/machine-market/phase2-acceptance-crash.mjs');
        const id = 'a'.repeat(64), order = [];
        const store = { native: { sign() {
                    order.push('persisted');
                    return { state: 'Signed' };
                }, get() {
                    return { attempt: { transaction: 'public-unit-fixture-bytes', signature: 'public-unit-fixture-signature' } };
                } } };
        installAcceptanceCrash({
            store,
            armed: { point: 'after-signed-persistence', operationId: id },
            privateRoot: root,
            markerDirectory: root,
            kill() {
                order.push('kill');
            }
        });
        assert.throws(() => store.native.sign(id), /EXPECTED_CRASH_DID_NOT_TERMINATE/);
        assert.deepEqual(order, ['persisted', 'kill']);
        const marker = JSON.parse(readFileSync(join(root, id + '.json'), 'utf8'));
        assert.equal(marker.point, 'after-signed-persistence');
        assert.equal(marker.operationId, id);
    })();
}));
test('direct probe sender rejects changed bytes before fee quote, fence or signer', () => temporary(async (root) => {
    const { createDirectProbeRunner, describeNegativeProbe } = await import('../../scripts/machine-market/phase2-acceptance-probes.mjs');
    const { base58Encode, encodeAccount, ZERO_KEY, ZERO_HASH } = await import('../../packages/machine-market/native/codec.mjs');
    const { deriveMarketPda, deriveSeriesPda, deriveUnitPda, unitId, seriesTermsHash, sha256 } = await import('../../packages/machine-market/native/domain.mjs');
    const key = n => base58Encode(Buffer.alloc(32, n));
    const run = {
        genesis: '10'.repeat(32),
        program: key(9),
        initializer: key(1),
        marketNonce: '11'.repeat(32),
        matcher: key(2),
        gateway: key(2),
        collector: key(3),
        issuer: key(4),
        buyerA: key(5),
        buyerB: key(6),
        sponsor: key(7)
    };
    run.market = deriveMarketPda(run).address;
    const series = {
        kind: 'Series',
        state: 1,
        market: run.market,
        seriesId: '12'.repeat(32),
        issuer: run.issuer,
        resourceHash: 'a'.repeat(64),
        versionHash: 'b'.repeat(64),
        termsHash: ZERO_HASH,
        format: 0,
        useBySlot: '10000',
        sponsoredPrice: '10000',
        cap: 1,
        issued: 1,
        maxTransfers: 0,
        transferable: 0,
        contentBytes: 1
    };
    series.termsHash = seriesTermsHash(series);
    const seriesAddress = deriveSeriesPda({ ...run, seriesId: series.seriesId }).address;
    const unit = {
        kind: 'Unit',
        state: 0,
        market: run.market,
        series: seriesAddress,
        unitId: unitId({ series: seriesAddress, serial: 0 }),
        serial: 0,
        owner: run.issuer,
        cursor: '0',
        transferCount: 0,
        sponsored: 0,
        primaryMatch: ZERO_KEY,
        latestMatch: ZERO_KEY,
        refundFace: '0',
        sponsorRefundKey: ZERO_KEY,
        requestHash: ZERO_HASH,
        lockStartCursor: '0',
        lockStartSlot: '0',
        lockDeadlineSlot: '0',
        terminalOpHash: ZERO_HASH,
        responseHash: ZERO_HASH,
        terminalSlot: '0',
        terminalReason: 0
    };
    const unitAddress = deriveUnitPda({ ...run, unitId: unit.unitId }).address;
    const config = {
        run,
        runId: 'injected-unit-only',
        packetSha256: PACKET_SHA256,
        programSha256: 'c'.repeat(64),
        privateRoot: root,
        endpoint: 'http://127.0.0.1:19999',
        units: [{ id: 'U2', address: unitAddress, series: 'consume' }],
        series: [{ id: 'consume', address: seriesAddress }]
    };
    const raw = (address, value) => {
        const data = encodeAccount(value);
        return {
            address,
            owner: run.program,
            executable: false,
            missing: false,
            data,
            dataHash: sha256(data),
            lamports: '10000000'
        };
    };
    let quoted = 0, signerCalls = 0;
    const context = { rpc: { async inspectRun() {
                return {
                    genesis: run.genesis,
                    program: run.program,
                    market: run.market,
                    representation: { programHash: config.programSha256 }
                };
            }, async accounts() {
                return { contextSlot: '1', accounts: [{ address: run.market }, raw(unitAddress, unit), raw(seriesAddress, series)] };
            }, async feeForMessage() {
                quoted++;
                throw Error('unexpected');
            } }, signers: new Proxy({}, { get() {
                signerCalls++;
                return () => {
                };
            } }) };
    const journal = openAcceptanceJournal({ path: join(root, 'checkpoint.json'), privateRoot: root, identity });
    const probe = createDirectProbeRunner({
        config,
        context,
        journal,
        filename: join(root, 'probe.sqlite')
    });
    try {
        const descriptor = describeNegativeProbe('consume-primary-minimum', { config, unit: { ...unit, address: unitAddress }, series: { ...series, address: seriesAddress } });
        descriptor.instruction.gross = '9999';
        await assert.rejects(probe.run(descriptor), /PROBE_DESCRIPTOR_MISMATCH/);
        assert.equal(quoted, 0);
        assert.equal(signerCalls, 0);
        assert.equal(journal.snapshot().attempts.length, 0);
    }
    finally {
        probe.close();
        journal.close();
    }
}));
test('offline first late response uses native hash when there was no earlier read', async () => {
    const { assertLateResponse } = await import('../../scripts/machine-market/phase2-acceptance-recovery.mjs');
    assert.equal(assertLateResponse({ nativeResponseHash: 'committed', actualResponseHash: 'committed' }), true);
    assert.throws(() => assertLateResponse({ nativeResponseHash: 'committed', actualResponseHash: 'different' }), /RESPONSE_RECOVERY_MISMATCH/);
    assert.throws(() => assertLateResponse({ priorResponseHash: 'old', nativeResponseHash: 'committed', actualResponseHash: 'committed' }), /RESPONSE_RECOVERY_MISMATCH/);
});
test('offline race resume retains pre-effect cursor after native winner advances', async () => {
    const { raceIntent } = await import('../../scripts/machine-market/phase2-acceptance-recovery.mjs');
    const original = raceIntent({ probeIds: ['a', 'b'], unit: 'intended', cursor: '2' });
    assert.deepEqual(raceIntent({
        saved: { intent: original },
        probeIds: ['a', 'b'],
        unit: 'intended',
        cursor: '3'
    }), original);
    assert.throws(() => raceIntent({
        saved: { intent: original },
        probeIds: ['a', 'b'],
        unit: 'substitute',
        cursor: '3'
    }), /RACE_IDENTITY_CONFLICT/);
});
test('offline fence input resumes after creation without overwrite or second namespace', () => temporary(async (root) => {
    const { reuseFenceInput } = await import('../../scripts/machine-market/phase2-acceptance-fence.mjs');
    const path = join(root, 'original-input.json'), value = { filename: join(root, 'original.sqlite'), run: { publicIdentity: 'original' } };
    assert.equal(reuseFenceInput(path, value), true);
    const bytes = readFileSync(path, 'utf8');
    assert.equal(reuseFenceInput(path, value), false);
    assert.equal(readFileSync(path, 'utf8'), bytes);
    assert.throws(() => reuseFenceInput(path, { ...value, run: { publicIdentity: 'replacement' } }), /FENCE_INPUT_CHANGED/);
    assert.equal(readFileSync(path, 'utf8'), bytes);
}));
test('offline crash-marker recovery retains required T8 identity and rejects replacement bytes', async () => {
    const { validateCrashMarker, crashProofIds } = await import('../../scripts/machine-market/phase2-acceptance-recovery.mjs');
    const { hash } = await import('../../scripts/machine-market/phase2-acceptance-schedule.mjs');
    const attempt = { transaction: 'offline-serialized-metadata', signature: 'offline-public-signature' }, operationId = 'a'.repeat(64), point = 'after-send';
    const marker = {
        schema: 'axp.market.crash.v1',
        operationId,
        point,
        pid: 42,
        signature: attempt.signature,
        transactionHash: hash(attempt.transaction)
    };
    const evidence = validateCrashMarker({
        marker,
        exit: { pid: 42, signal: 'SIGKILL' },
        operationId,
        point,
        attempt
    });
    assert.equal(evidence.signature, attempt.signature);
    assert.deepEqual(crashProofIds(point), ['T8:after-send-crash']);
    assert.deepEqual(crashProofIds('resolved-before-http'), ['T8:resolved-before-http-crash', 'T6:lost-response-restart']);
    assert.throws(() => validateCrashMarker({
        marker,
        exit: { pid: 42, signal: 'SIGKILL' },
        operationId,
        point,
        attempt: { ...attempt, transaction: 'replacement' }
    }), /CRASH_MARKER_MISMATCH/);
});
test('offline HTTP gates hold two requests before actual delegated business methods', async () => {
    const { createAcceptanceGatedService } = await import('../../scripts/machine-market/phase2-acceptance-gates.mjs');
    const { hash } = await import('../../scripts/machine-market/phase2-acceptance-schedule.mjs');
    const calls = [], store = { native: { sign() {
                return { state: 'Signed' };
            } } }, service = { async orders() {
            calls.push('bid');
            return 'bid';
        }, async cancel() {
            calls.push('cancel');
            return 'cancel';
        } };
    const { service: gated, gates } = createAcceptanceGatedService({ store, service }), bid = { unitFixture: 'bid' }, cancel = { unitFixture: 'cancel' };
    gates.arm({ bidHash: hash(bid), cancelHash: hash(cancel), operationId: 'a'.repeat(64) });
    const a = gated.orders(bid), b = gated.cancel(cancel);
    await Promise.resolve();
    assert.deepEqual(calls, []);
    assert.deepEqual(gates.status().entered, { bid: true, cancel: true });
    gates.release('cancel');
    assert.equal(await b, 'cancel');
    assert.deepEqual(calls, ['cancel']);
    gates.release('bid');
    assert.equal(await a, 'bid');
    assert.deepEqual(calls, ['cancel', 'bid']);
    const schedule = gates.clear();
    assert.deepEqual(schedule.events.slice(0, 2), ['bid-entered', 'cancel-entered']);
});

test('offline deadline rejection cannot sign early or call after-boundary equality',async()=>{
 const {requireAfterBoundary}=await import('../../scripts/machine-market/phase2-acceptance-recovery.mjs');
 assert.throws(()=>requireAfterBoundary({currentSlot:'99',deadlineSlot:'100'}),/PROBE_BOUNDARY_NOT_REACHED/);
 assert.equal(requireAfterBoundary({currentSlot:'100',deadlineSlot:'100'}),'at');
 assert.equal(requireAfterBoundary({currentSlot:'101',deadlineSlot:'100'}),'after');
});
