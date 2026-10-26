/** Acceptance-only direct-program probes. Never exposed by the W6 service. */
import { openSync, closeSync, chmodSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { canonical } from '../../packages/contracts/index.mjs';
import { encodeInstruction, encodeAuthorization, fieldOffsets, canonicalBase64, ZERO_HASH, ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { buildLegacyMessage } from '../../packages/machine-market/native/transaction.mjs';
import { parseLegacyTransaction, shortvec } from '../../packages/machine-market/native/phase2-transport-utils.mjs';
import { domainHash, operationId, orderId, matchId, deriveSeriesPda, deriveMatchPda, deriveOrderUsePda, sha256 } from '../../packages/machine-market/native/domain.mjs';
import { localEndpoint } from '../../packages/machine-market/native/rpc.mjs';
import { validateNativeAccount } from '../../packages/machine-market/native/observations.mjs';
import { hash, stableIdentity } from './phase2-acceptance-schedule.mjs';
import { containedPath } from './phase2-acceptance-journal.mjs';
import { requireAfterBoundary } from './phase2-acceptance-recovery.mjs';
import { captureNativeEvidence } from './phase2-acceptance-runtime.mjs';
import { assertPublicEvidence } from './phase2-acceptance-evidence.mjs';
const CATALOG = Object.freeze({
    'invalid-issuance': { code: 1, unit: 'U2' },
    'oversize-issuance': { code: 1, unit: 'U2' },
    'consume-primary-minimum': { code: 4, unit: 'U2' },
    'sponsored-positive-minimum': { code: 4, unit: 'U3' },
    'wrong-start-owner': { code: 2, unit: 'U6' },
    'missing-owner-signature': { code: 2, unit: 'U6' },
    'foreign-unit-account': { code: 2, unit: 'U6' },
    'wrong-refund-holder': { code: 2, unit: 'U1' },
    'sponsor-resale': { code: 4, unit: 'U3' },
    'filled-order-reuse': { code: 11, unit: 'U2' },
    'expired-start': { code: 8, unit: 'U4' },
    'finalize-lease-equality': { code: 8, unit: 'U5' },
    'race-secondary-a': { code: [2, 4, 6], unit: 'U6', race: true },
    'race-secondary-b': { code: [2, 4, 6], unit: 'U6', race: true },
    'race-resale': { code: [2, 4, 6], unit: 'U6', race: true },
    'race-start': { code: [2, 6, 9], unit: 'U6', race: true },
    'two-start-a': { code: [2, 6, 9], unit: 'U7', race: true },
    'two-start-b': { code: [2, 6, 9], unit: 'U7', race: true },
});
const demand = (condition, code) => {
    if (!condition)
        throw Error(code);
};
export const negativeProbeCatalog = () => structuredClone(CATALOG);
function dataPatches(id) {
    return id === 'invalid-issuance' ? [{ field: 'transferable', value: 0 }, { field: 'maxTransfers', value: 3 }] : id === 'oversize-issuance' ? [{ field: 'contentBytes', value: 16385 }] : [];
}
/** Build a fixed probe from authoritative current Unit/Series, never caller payees. */
export function describeNegativeProbe(id, { config, unit, series, primary, sourceFund, requestHash }) {
    demand(Object.hasOwn(CATALOG, id), 'UNDECLARED_NATIVE_PROBE');
    demand(config.units.find(row => row.id === CATALOG[id].unit)?.address === unit.address, 'PROBE_UNIT_BINDING');
    const run = config.run, d = domainHash(run), nonce = label => stableIdentity(config.runId, 'native-probe:' + id, label);
    let instruction, accounts, patches = dataPatches(id);
    if (['invalid-issuance', 'oversize-issuance'].includes(id)) {
        const seriesId = nonce('series');
        instruction = {
            type: 'IssueSeries',
            operationId: operationId({ domain: d, type: 'IssueSeries', seriesId }),
            seriesId,
            resourceHash: series.resourceHash,
            versionHash: series.versionHash,
            format: series.format,
            useBySlot: series.useBySlot,
            sponsoredPrice: series.sponsoredPrice,
            cap: 1,
            maxTransfers: 3,
            transferable: 1,
            contentBytes: series.contentBytes
        };
        accounts = {
            issuer: run.issuer,
            matcher: run.matcher,
            market: run.market,
            series: deriveSeriesPda({ ...run, seriesId }).address
        };
    }
    else if (['consume-primary-minimum', 'sponsored-positive-minimum', 'sponsor-resale', 'race-secondary-a', 'race-secondary-b', 'race-resale'].includes(id)) {
        const kind = id === 'sponsored-positive-minimum' ? 2 : (id === 'sponsor-resale' || id.startsWith('race-')) ? 1 : 0;
        const seller = kind === 1 ? unit.owner : run.issuer, beneficiary = kind === 1 ? (seller === run.buyerA ? run.buyerB : run.buyerA) : run.buyerA;
        const buyNonce = nonce('buy'), sellNonce = nonce('sell'), gross = id === 'race-resale' ? '8000' : id.startsWith('race-secondary') ? '15000' : '10000';
        const selected = matchId({
            domain: d,
            buyOrderId: orderId({ domain: d, actor: beneficiary, nonce: buyNonce }),
            sellOrderId: orderId({ domain: d, actor: seller, nonce: sellNonce }),
            unit: unit.address,
            expectedCursor: unit.cursor,
            gross,
            fundingKind: kind
        });
        instruction = {
            type: 'Fund',
            operationId: operationId({ domain: d, type: 'FundMatch', matchId: selected }),
            matchId: selected,
            expectedCursor: unit.cursor,
            buyNonce,
            sellNonce,
            buyAuthHash: nonce('buy-auth'),
            sellAuthHash: nonce('sell-auth'),
            gross,
            buyerLimit: gross,
            sellerLimit: gross,
            buyerValidUntil: series.useBySlot,
            sellerValidUntil: series.useBySlot,
            minRemainingAfter: kind === 1 ? 0 : 1,
            fundingKind: kind,
            expectedRefundFace: kind === 1 ? unit.refundFace : '0',
            packetHash: kind === 2 ? nonce('packet') : ZERO_HASH,
            campaignId: kind === 2 ? nonce('campaign') : ZERO_HASH
        };
        accounts = {
            payer: kind === 2 ? run.sponsor : beneficiary,
            beneficiary,
            seller,
            matcher: run.matcher,
            collector: run.collector,
            market: run.market,
            series: series.address,
            unit: unit.address,
            match: deriveMatchPda({ ...run, matchId: selected }).address,
            buyUse: deriveOrderUsePda({ ...run, actor: beneficiary, nonce: buyNonce }).address,
            sellUse: deriveOrderUsePda({ ...run, actor: seller, nonce: sellNonce }).address,
            ...(kind === 1 ? { primaryMatch: unit.primaryMatch } : {})
        };
    }
    else if (id === 'filled-order-reuse') {
        demand(sourceFund?.instruction?.type === 'Fund', 'FILLED_SOURCE_REQUIRED');
        const old = sourceFund.instruction, beneficiary = sourceFund.accounts.beneficiary, seller = run.issuer, sellNonce = nonce('fresh-sell');
        const selected = matchId({
            domain: d,
            buyOrderId: orderId({ domain: d, actor: beneficiary, nonce: old.buyNonce }),
            sellOrderId: orderId({ domain: d, actor: seller, nonce: sellNonce }),
            unit: unit.address,
            expectedCursor: unit.cursor,
            gross: '10000',
            fundingKind: 0
        });
        instruction = {
            ...old,
            operationId: operationId({ domain: d, type: 'FundMatch', matchId: selected }),
            matchId: selected,
            expectedCursor: unit.cursor,
            sellNonce,
            sellAuthHash: nonce('sell-auth')
        };
        accounts = {
            ...sourceFund.accounts,
            unit: unit.address,
            series: series.address,
            seller,
            match: deriveMatchPda({ ...run, matchId: selected }).address,
            sellUse: deriveOrderUsePda({ ...run, actor: seller, nonce: sellNonce }).address
        };
    }
    else if (id === 'wrong-refund-holder') {
        instruction = {
            type: 'TimeoutRefund',
            operationId: operationId({
                domain: d,
                type: 'TimeoutRefund',
                unit: unit.address,
                requestHash: unit.requestHash
            }),
            expectedLockedCursor: unit.cursor,
            requestHash: unit.requestHash
        };
        accounts = {
            caller: run.matcher,
            market: run.market,
            series: series.address,
            unit: unit.address,
            primaryMatch: unit.primaryMatch,
            refundRecipient: unit.owner === run.buyerA ? run.buyerB : run.buyerA
        };
    }
    else if (id === 'finalize-lease-equality') {
        instruction = {
            type: 'FinalizeDelivery',
            operationId: operationId({
                domain: d,
                type: 'FinalizeDelivery',
                unit: unit.address,
                requestHash: unit.requestHash
            }),
            expectedLockedCursor: unit.cursor,
            requestHash: unit.requestHash,
            responseHash: nonce('response')
        };
        accounts = {
            gateway: run.gateway,
            market: run.market,
            series: series.address,
            unit: unit.address,
            primaryMatch: unit.primaryMatch,
            issuer: run.issuer,
            collector: run.collector
        };
    }
    else {
        const owner = id === 'wrong-start-owner' ? (unit.owner === run.buyerA ? run.buyerB : run.buyerA) : unit.owner;
        const request = sha256(encodeAuthorization({
            kind: 'DeliveryRequest',
            domain: d,
            actor: owner,
            nonce: nonce('request-nonce'),
            unit: unit.address,
            expectedCursor: unit.cursor,
            series: series.address,
            resourceHash: series.resourceHash
        }));
        instruction = {
            type: 'StartDelivery',
            operationId: operationId({
                domain: d,
                type: 'StartDelivery',
                unit: unit.address,
                requestHash: request
            }),
            expectedCursor: unit.cursor,
            requestNonce: nonce('request-nonce'),
            requestHash: request
        };
        accounts = {
            owner,
            market: run.market,
            series: series.address,
            unit: unit.address
        };
    }
    if (id === 'foreign-unit-account')
        accounts.unit = run.collector;
    return {
        id,
        expectedCustomError: CATALOG[id].code,
        deadline: id === 'finalize-lease-equality' ? unit.lockDeadlineSlot : id === 'expired-start' ? series.useBySlot : null,
        allowSuccess: CATALOG[id].race === true,
        headerRequiredSigners: id === 'missing-owner-signature' ? 1 : null,
        instruction,
        accounts,
        patches
    };
}
export function createDirectProbeRunner({ config, context, journal, filename, fetchImpl = globalThis.fetch }) {
    localEndpoint(config.endpoint);
    filename = containedPath(config.privateRoot, filename);
    const fd = openSync(filename, 'a', 0o600);
    closeSync(fd);
    chmodSync(filename, 0o600);
    const db = new DatabaseSync(filename);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA max_page_count=512;');
    db.exec('CREATE TABLE IF NOT EXISTS probe_run(id INTEGER PRIMARY KEY,hash TEXT NOT NULL);CREATE TABLE IF NOT EXISTS probes(id TEXT PRIMARY KEY,state TEXT NOT NULL,descriptor_hash TEXT NOT NULL,data TEXT NOT NULL);');
    const runHash = hash({ run: config.run, runId: config.runId, packet: config.packetSha256 });
    const old = db.prepare('SELECT hash FROM probe_run WHERE id=1').get();
    demand(!old || old.hash === runHash, 'PROBE_RUN_MISMATCH');
    db.prepare('INSERT OR IGNORE INTO probe_run VALUES(1,?)').run(runHash);
    const get = id => {
        const row = db.prepare('SELECT * FROM probes WHERE id=?').get(id);
        return row ? { ...JSON.parse(row.data), state: row.state, descriptorHash: row.descriptor_hash } : null;
    };
    const save = (id, state, value, descriptorHash) => {
        db.exec('BEGIN IMMEDIATE');
        try {
            db.prepare('INSERT INTO probes VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,data=excluded.data').run(id, state, descriptorHash, canonical(value));
            db.exec('COMMIT');
            db.exec('PRAGMA wal_checkpoint(FULL)');
        }
        catch (error) {
            try {
                db.exec('ROLLBACK');
            }
            catch {
            }
            throw error;
        }
    };
    async function observe(id) {
        const op = get(id);
        demand(op?.transaction, 'PROBE_UNCERTAIN');
        const transaction = await context.rpc.transaction(op.signature);
        if (!transaction)
            return null;
        demand(transaction.transaction?.[0] === op.transaction && transaction.transaction?.[1] === 'base64', 'PROBE_TRANSACTION_CHANGED');
        const meta = transaction.meta;
        if (meta?.err === null) {
            demand(op.allowSuccess === true, 'PROBE_EXPECTED_REJECTION');
            const attempt = {
                transaction: op.transaction,
                message: op.message,
                signature: op.signature,
                blockhash: op.blockhash,
                lastValidBlockHeight: op.lastValidBlockHeight,
                feeReserve: op.feeReserve,
                rentReserve: op.rentReserve ?? '0'
            };
            const semanticKeys = op.instruction.type === 'Fund' ? ['market', 'series', 'unit', 'payer', 'beneficiary', 'seller', 'matcher', 'collector', 'buyUse', 'sellUse', 'primaryMatch'].map(name => op.accounts[name] ?? ZERO_KEY) : [];
            const { fundTermsHash } = await import('../../packages/machine-market/native/domain.mjs');
            const captured = await captureNativeEvidence({
                operation: {
                    id: op.instruction.operationId,
                    instruction: op.instruction,
                    accounts: op.accounts,
                    feePayer: config.run.matcher,
                    termsHash: op.instruction.type === 'Fund' ? fundTermsHash(op.instruction, semanticKeys) : hash(op.instruction),
                    lastObservedSlot: '0',
                    attempt
                },
                observer: context.observer,
                rpc: context.rpc,
                run: config.run
            });
            save(id, 'FinalizedSuccess', { ...op, evidence: captured.evidence }, op.descriptorHash);
            return captured.evidence;
        }
        const allowed = Array.isArray(op.expectedCustomError) ? op.expectedCustomError : [op.expectedCustomError];
        demand(meta && meta.err?.InstructionError?.[0] === 0 && allowed.includes(meta.err.InstructionError[1]?.Custom), 'PROBE_EXPECTED_REJECTION');
        demand(Number.isSafeInteger(meta.computeUnitsConsumed) && meta.computeUnitsConsumed >= 0 && meta.computeUnitsConsumed <= 200000, 'PROBE_CU_BOUND');
        const parsed = parseLegacyTransaction(op.transaction), fee = BigInt(meta.fee);
        demand(fee >= 0n && fee <= 100000n && meta.preBalances.length === parsed.keys.length && meta.postBalances.length === parsed.keys.length, 'PROBE_FEE_BOUND');
        const deltas = parsed.keys.map((key, index) => {
            const before = BigInt(meta.preBalances[index]), after = BigInt(meta.postBalances[index]), delta = after - before;
            demand(delta === (index === 0 ? -fee : 0n), 'PROBE_PRINCIPAL_CHANGED');
            return {
                address: key,
                before: before.toString(),
                after: after.toString(),
                delta: delta.toString()
            };
        });
        const view = await context.rpc.accounts(op.before.map(row => row.address), { minContextSlot: String(transaction.slot) });
        for (let index = 0; !op.allowSuccess && index < view.accounts.length; index++) {
            const now = view.accounts[index], before = op.before[index];
            demand(now.missing === before.missing && (now.missing || now.dataHash === before.dataHash), 'PROBE_STATE_CHANGED');
        }
        const evidence = assertPublicEvidence({
            kind: 'native-negative-transaction',
            probeId: id,
            operationId: op.instruction.operationId,
            signature: op.signature,
            status: 'finalized-failure',
            slot: String(transaction.slot),
            customError: meta.err.InstructionError[1].Custom,
            boundary: op.deadline === null ? null : { deadline: op.deadline, executionSlot: String(transaction.slot), relation: requireAfterBoundary({ currentSlot: String(transaction.slot), deadlineSlot: op.deadline }) },
            transactionBytes: parsed.bytes.length,
            computeUnits: meta.computeUnitsConsumed,
            feePayer: parsed.keys[0],
            feeLamports: fee.toString(),
            rentLamports: '0',
            instructionBase64: parsed.instruction.data.toString('base64'),
            transactionSha256: hash(parsed.bytes),
            accounts: deltas
        });
        save(id, 'FinalizedFailure', { ...op, evidence }, op.descriptorHash);
        return evidence;
    }
    return {
        async run(descriptor, { submit = true } = {}) {
            demand(Object.hasOwn(CATALOG, descriptor.id) && canonical(descriptor.expectedCustomError) === canonical(CATALOG[descriptor.id].code), 'UNDECLARED_NATIVE_PROBE');
            const descriptorHash = hash(descriptor), existing = get(descriptor.id);
            if (existing) {
                demand(existing.descriptorHash === descriptorHash, 'PROBE_IDENTITY_CONFLICT');
                if (['FinalizedFailure', 'FinalizedSuccess'].includes(existing.state))
                    return existing.evidence;
                if (existing.state === 'Signed' && submit === false)
                    return existing;
                if (existing.state === 'Signing')
                    throw Error('PROBE_SIGNING_FENCE_UNCERTAIN');
                const observed = await observe(descriptor.id);
                if (observed)
                    return observed;
                throw Error('PROBE_PENDING_SETTLEMENT');
            }
            demand(!db.prepare("SELECT id FROM probes WHERE state IN ('Signing','SendIntent','Submitted','Unknown')").get(), 'PROBE_PENDING_SETTLEMENT');
            const verified = await context.rpc.inspectRun();
            demand(verified.genesis === config.run.genesis && verified.program === config.run.program && verified.market === config.run.market && verified.representation.programHash === config.programSha256, 'PROBE_RUN_MISMATCH');
            const binding = config.units.find(row => row.id === CATALOG[descriptor.id].unit), seriesBinding = config.series.find(row => row.id === binding.series);
            const view0 = await context.rpc.accounts([config.run.market, binding.address, seriesBinding.address]);
            const unit = validateNativeAccount(view0.accounts[1], config.run, { kind: 'Unit' }), series = validateNativeAccount(view0.accounts[2], config.run, { kind: 'Series' });
            let sourceFund;
            if (descriptor.id === 'filled-order-reuse') {
                const original = journal.get('U0:trade:0');
                demand(original?.result?.operationIds?.[0], 'FILLED_SOURCE_REQUIRED');
                sourceFund = await context.store.native.get(original.result.operationIds[0]);
            }
            const expected = describeNegativeProbe(descriptor.id, {
                config,
                unit,
                series,
                sourceFund
            });
            demand(canonical(expected) === canonical(descriptor), 'PROBE_DESCRIPTOR_MISMATCH');
            // The dummy-hash Finalize negative is safe ONLY after the verified
            // native lease. Never sign/send it as a speculative equality timer.
            if (descriptor.deadline !== null)
                requireAfterBoundary({ currentSlot: await context.rpc.slot(), deadlineSlot: descriptor.deadline });
            journal.reserveAttempt('direct-probe:' + descriptor.id, 'probes');
            const latest = await context.rpc.latestBlockhash(), built = buildLegacyMessage({
                program: config.run.program,
                feePayer: config.run.matcher,
                blockhash: latest.blockhash,
                instruction: descriptor.instruction,
                accounts: descriptor.accounts
            });
            const instructionBytes = encodeInstruction(descriptor.instruction), message = canonicalBase64(built.message), offset = message.length - instructionBytes.length;
            demand(message.subarray(offset).equals(instructionBytes), 'PROBE_LAYOUT');
            for (const patch of descriptor.patches) {
                demand(['invalid-issuance', 'oversize-issuance'].includes(descriptor.id) && ['transferable', 'maxTransfers', 'contentBytes'].includes(patch.field) && Number.isInteger(patch.value), 'PROBE_MUTATION');
                const target = offset + fieldOffsets('instruction', 'IssueSeries').offsets[patch.field];
                if (patch.field === 'contentBytes')
                    message.writeUInt32LE(patch.value, target);
                else
                    message[target] = patch.value;
            }
            if (descriptor.headerRequiredSigners !== null) {
                demand(descriptor.id === 'missing-owner-signature' && built.requiredSigners.length === 2 && message[0] === 2, 'PROBE_HEADER');
                message[0] = 1;
            }
            const requiredSigners = descriptor.headerRequiredSigners === 1 ? built.requiredSigners.slice(0, 1) : built.requiredSigners;
            const quote = await context.rpc.feeForMessage(message.toString('base64'));
            demand(BigInt(quote.fee) <= 100000n, 'PROBE_FEE_BOUND');
            const view = await context.rpc.accounts([...new Set(Object.values(descriptor.accounts))]);
            const prepared = {
                ...descriptor,
                message: message.toString('base64'),
                requiredSigners,
                blockhash: latest.blockhash,
                lastValidBlockHeight: latest.lastValidBlockHeight,
                feeReserve: quote.fee,
                rentReserve: (descriptor.instruction.type === 'Fund' ? BigInt(await context.rpc.rentForLength(619)) + 2n * BigInt(await context.rpc.rentForLength(178)) : 0n).toString(),
                before: view.accounts.map(row => ({ address: row.address, missing: row.missing, dataHash: row.dataHash ?? null })),
                contextSlot: view.contextSlot
            };
            // Commit FULL before the first opaque disposable signer can be invoked.
            save(descriptor.id, 'Signing', prepared, descriptorHash);
            const getSigner = key => context.signers instanceof Map ? context.signers.get(key) : context.signers?.[key];
            let serialized;
            try {
                const sigs = requiredSigners.map(key => {
                    const signer = getSigner(key);
                    demand(typeof signer === 'function', 'PROBE_SIGNER');
                    const result = signer(message);
                    const signature = Buffer.isBuffer(result) ? result : canonicalBase64(result, 64);
                    demand(signature.length === 64, 'PROBE_SIGNATURE');
                    return signature;
                });
                serialized = Buffer.concat([shortvec(sigs.length), ...sigs, message]);
            }
            catch {
                throw Error('PROBE_SIGNING_FENCE_UNCERTAIN');
            }
            const parsed = parseLegacyTransaction(serialized);
            demand(parsed.instruction.programId === config.run.program && parsed.message.equals(message) && parsed.bytes.length <= 1232, 'PROBE_SIGNATURE');
            const signed = { ...prepared, transaction: serialized.toString('base64'), signature: parsed.signature };
            save(descriptor.id, 'Signed', signed, descriptorHash);
            journal.markSigned('direct-probe:' + descriptor.id, hash(serialized));
            if (submit === false)
                return get(descriptor.id);
            return sender(descriptor.id);
        },
        async replayOriginal(operation) {
            demand(operation.instruction?.type === 'Fund' && operation.instruction.fundingKind === 0 && operation.accounts.unit === config.units.find(row => row.id === 'U0').address && operation.state === 'ResolvedSuccess' && operation.attempt, 'REPLAY_ORIGINAL_REQUIRED');
            const parsed = parseLegacyTransaction(operation.attempt.transaction);
            demand(parsed.signature === operation.attempt.signature && parsed.instruction.programId === config.run.program && parsed.instruction.data.equals(encodeInstruction(operation.instruction)), 'REPLAY_IDENTITY');
            const id = 'replay:' + operation.id, prior = get(id);
            if (prior?.state === 'FinalizedReplay')
                return prior.evidence;
            if (prior)
                throw Error('REPLAY_PENDING_SETTLEMENT');
            await context.rpc.inspectRun();
            const original = await context.rpc.transaction(parsed.signature);
            demand(original?.meta?.err === null && original.transaction?.[0] === operation.attempt.transaction, 'REPLAY_TRANSACTION_REQUIRED');
            const before = await context.rpc.accounts(parsed.keys);
            const record = {
                transaction: operation.attempt.transaction,
                signature: parsed.signature,
                originalMetaHash: hash(original.meta),
                instruction: operation.instruction
            };
            save(id, 'ReplaySendIntent', record, hash(record));
            const response = await fetchImpl(config.endpoint, {
                method: 'POST',
                redirect: 'error',
                signal: AbortSignal.timeout(10000),
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'sendTransaction',
                    params: [record.transaction, { encoding: 'base64', skipPreflight: false, maxRetries: 0 }]
                })
            });
            const value = await response.json();
            demand(response.ok && value.result === parsed.signature && !value.error, 'REPLAY_PENDING_SETTLEMENT');
            const after = await context.rpc.accounts(parsed.keys, { minContextSlot: before.contextSlot }), again = await context.rpc.transaction(parsed.signature);
            demand(again?.transaction?.[0] === record.transaction && hash(again.meta) === record.originalMetaHash, 'REPLAY_CHANGED_RECEIPT');
            for (let i = 0; i < before.accounts.length; i++)
                demand(before.accounts[i].lamports === after.accounts[i].lamports && before.accounts[i].dataHash === after.accounts[i].dataHash, 'REPLAY_EXTRA_PAYMENT');
            const evidence = assertPublicEvidence({
                kind: 'native-exact-replay',
                operationId: operation.id,
                signature: parsed.signature,
                slot: String(again.slot),
                transactionSha256: hash(parsed.bytes),
                originalFeeLamports: String(again.meta.fee),
                repeatPrincipal: '0',
                repeatMarketFee: '0',
                sameSignature: true,
                accounts: after.accounts.map((row, i) => ({
                    address: row.address,
                    before: before.accounts[i].lamports,
                    after: row.lamports,
                    delta: '0'
                }))
            });
            save(id, 'FinalizedReplay', { ...record, evidence }, hash(record));
            return evidence;
        },
        get,
        async sendPrepared(id) {
            demand(Object.hasOwn(CATALOG, id), 'UNDECLARED_NATIVE_PROBE');
            return sender(id);
        },
        async recover(id) {
            demand(Object.hasOwn(CATALOG, id), 'UNDECLARED_NATIVE_PROBE');
            const saved = get(id);
            demand(saved && saved.state !== 'Signing', 'PROBE_SIGNING_FENCE_UNCERTAIN');
            if (['FinalizedFailure', 'FinalizedSuccess'].includes(saved.state))
                return saved.evidence;
            const result = await observe(id);
            if (!result)
                throw Error('PROBE_PENDING_SETTLEMENT');
            return result;
        },
        close() {
            db.close();
        },
    };
    async function sender(id) {
        const signed = get(id);
        demand(signed?.state === 'Signed', 'EXPLICIT_FIRST_PROBE_SEND_REQUIRED');
        const descriptorHash = signed.descriptorHash;
        const valid = await context.rpc.blockhashValid(signed.blockhash);
        demand(valid.valid, 'PROBE_PENDING_SETTLEMENT');
        save(id, 'SendIntent', signed, descriptorHash);
        // Acceptance-only fixed RPC method/options. Never a user-program/URL endpoint.
        const guard = get(id);
        demand(guard.state === 'SendIntent' && guard.transaction === signed.transaction, 'PROBE_PERSISTED_BYTES_REQUIRED');
        let result;
        try {
            const response = await fetchImpl(config.endpoint, {
                method: 'POST',
                redirect: 'error',
                signal: AbortSignal.timeout(10000),
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'sendTransaction',
                    params: [signed.transaction, { encoding: 'base64', skipPreflight: true, maxRetries: 0 }]
                })
            });
            const body = await response.json();
            demand(response.ok && body.result === signed.signature && !body.error, 'PROBE_PENDING_SETTLEMENT');
            result = body.result;
        }
        catch {
            save(id, 'Unknown', signed, descriptorHash);
            throw Error('PROBE_PENDING_SETTLEMENT');
        }
        save(id, 'Submitted', { ...signed, signature: result }, descriptorHash);
        for (let poll = 0; poll < 120; poll++) {
            const observed = await observe(id);
            if (observed)
                return observed;
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        throw Error('PROBE_PENDING_SETTLEMENT');
    }
}
