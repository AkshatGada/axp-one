/** Durable private step journal. Outbox/SQLite remains the monetary authority. */
import { openSync, closeSync, readFileSync, writeFileSync, fsyncSync, renameSync, existsSync, realpathSync, lstatSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonical } from '../../packages/contracts/index.mjs';
import { PACKET_SHA256, scheduleIdentity, hash, budgetUsage, BUCKETS } from './phase2-acceptance-schedule.mjs';
import { assertPublicEvidence } from './phase2-acceptance-evidence.mjs';
export function containedPath(root, path) {
    const base = realpathSync(root), parent = realpathSync(dirname(resolve(path))), difference = relative(base, parent);
    if (difference === '..' || difference.startsWith('..' + sep) || isAbsolute(difference))
        throw Error('PRIVATE_PATH_REQUIRED');
    try {
        if (lstatSync(path).isSymbolicLink())
            throw Error('PRIVATE_PATH_REQUIRED');
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    return join(parent, resolve(path).split(/[\\/]/).at(-1));
}
function atomicSave(path, value) {
    const bytes = canonical(value);
    if (Buffer.byteLength(bytes) > 2 * 1024 * 1024)
        throw Error('JOURNAL_CAPACITY');
    const temporary = path + '.pending-' + randomUUID(), fd = openSync(temporary, 'wx', 0o600);
    try {
        writeFileSync(fd, bytes);
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    }
    renameSync(temporary, path);
    const directory = openSync(dirname(path), 'r');
    try {
        fsyncSync(directory);
    }
    finally {
        closeSync(directory);
    }
}
export function openAcceptanceJournal({ path, privateRoot, identity, resume = false, bootstrapAttempts = [], recoverStaleLock = false }) {
    path = containedPath(privateRoot, path);
    assertPublicEvidence(identity);
    const lockPath = path + '.lock';
    if (existsSync(lockPath) && recoverStaleLock) {
        const old = JSON.parse(readFileSync(lockPath, 'utf8'));
        let absent = false;
        if (!Number.isSafeInteger(old.pid) || old.pid < 1)
            throw Error('ACCEPTANCE_LOCKED');
        try {
            process.kill(old.pid, 0);
        }
        catch (error) {
            if (error.code === 'ESRCH')
                absent = true;
        }
        if (!absent)
            throw Error('ACCEPTANCE_LOCKED');
        unlinkSync(lockPath);
    }
    let lock;
    try {
        lock = openSync(lockPath, 'wx', 0o600);
    }
    catch {
        throw Error('ACCEPTANCE_LOCKED');
    }
    const token = randomUUID();
    writeFileSync(lock, canonical({ pid: process.pid, token }));
    fsyncSync(lock);
    let closed = false;
    const release = () => {
        if (closed)
            return;
        closed = true;
        closeSync(lock);
        const record = JSON.parse(readFileSync(lockPath, 'utf8'));
        if (record.token !== token)
            throw Error('ACCEPTANCE_LOCK_CHANGED');
        unlinkSync(lockPath);
    };
    try {
        const identityHash = hash(identity), present = existsSync(path);
        if (present && !resume)
            throw Error('EXPLICIT_RESUME_REQUIRED');
        if (!present && resume)
            throw Error('RESUME_CHECKPOINT_MISSING');
        let value = present ? JSON.parse(readFileSync(path, 'utf8')) : {
            schema: 'axp.market.acceptance.private.v1',
            packetSha256: PACKET_SHA256,
            scheduleHash: scheduleIdentity(),
            identityHash,
            steps: {},
            attempts: bootstrapAttempts.map(row => ({ ...row, bucket: 'bootstrap' })),
            successfulTradeIds: [],
            stopped: null
        };
        if (value.schema !== 'axp.market.acceptance.private.v1' || value.packetSha256 !== PACKET_SHA256 || value.scheduleHash !== scheduleIdentity() || value.identityHash !== identityHash)
            throw Error('RUN_IDENTITY_MISMATCH');
        budgetUsage(value.attempts, value.successfulTradeIds.length);
        if (!present)
            atomicSave(path, value);
        function mutate(fn) {
            if (closed)
                throw Error('JOURNAL_CLOSED');
            const next = structuredClone(value);
            const result = fn(next);
            budgetUsage(next.attempts, next.successfulTradeIds.length);
            atomicSave(path, next);
            value = next;
            return structuredClone(result);
        }
        return {
            snapshot: () => structuredClone(value),
            get: id => structuredClone(value.steps[id] ?? null),
            close: release,
            prepare(id, intent) {
                assertPublicEvidence(intent);
                return mutate(next => {
                    if (next.stopped)
                        throw Error('RUN_STOPPED');
                    const old = next.steps[id], intentHash = hash(intent);
                    if (old) {
                        if (old.intentHash !== intentHash)
                            throw Error('STEP_IDENTITY_CONFLICT');
                        return old;
                    }
                    return next.steps[id] = {
                        id,
                        intent: structuredClone(intent),
                        intentHash,
                        state: 'Prepared',
                        result: null
                    };
                });
            },
            bind(id, operationIds) {
                return mutate(next => {
                    const row = next.steps[id];
                    if (!row || !Array.isArray(operationIds) || operationIds.some(id => typeof id !== 'string' || !id))
                        throw Error('STEP_MISSING');
                    if (row.operationIds && canonical(row.operationIds) !== canonical(operationIds))
                        throw Error('OPERATION_IDENTITY_CONFLICT');
                    row.operationIds = [...operationIds];
                    row.state = 'Bound';
                    return row;
                });
            },
            reserveAttempt(id, bucket) {
                return mutate(next => {
                    if (next.stopped || !Object.hasOwn(BUCKETS, bucket))
                        throw Error('RUN_STOPPED');
                    const existing = next.attempts.find(row => row.id === id);
                    if (existing) {
                        if (existing.bucket !== bucket)
                            throw Error('ATTEMPT_IDENTITY');
                        return existing;
                    }
                    next.attempts.push({ id, bucket, state: 'Reserved' });
                    return next.attempts.at(-1);
                });
            },
            markSigned(id, transactionHash) {
                return mutate(next => {
                    const row = next.attempts.find(row => row.id === id);
                    if (!row)
                        throw Error('ATTEMPT_IDENTITY');
                    if (row.transactionHash && row.transactionHash !== transactionHash)
                        throw Error('REPLACEMENT_ATTEMPT');
                    row.state = 'Signed';
                    row.transactionHash = transactionHash;
                    return row;
                });
            },
            complete(id, result, { tradeIds = [] } = {}) {
                assertPublicEvidence(result);
                return mutate(next => {
                    const row = next.steps[id];
                    if (!row)
                        throw Error('STEP_MISSING');
                    if (row.state === 'Complete') {
                        if (hash(row.result) !== hash(result))
                            throw Error('RESULT_CONFLICT');
                        return row;
                    }
                    next.successfulTradeIds = [...new Set([...next.successfulTradeIds, ...tradeIds])];
                    row.state = 'Complete';
                    row.result = structuredClone(result);
                    row.resultHash = hash(result);
                    return row;
                });
            },
            stop(code, operationIds = []) {
                return mutate(next => {
                    next.stopped = { code, operationIds };
                    return next.stopped;
                });
            },
            clearStopForExactRecovery() {
                return mutate(next => {
                    next.stopped = null;
                    return true;
                });
            },
        };
    }
    catch (error) {
        release();
        throw error;
    }
}
