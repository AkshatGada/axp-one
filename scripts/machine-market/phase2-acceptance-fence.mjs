import { fork } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical } from '../../packages/contracts/index.mjs';
import { createOutbox } from '../../packages/machine-market/native/outbox.mjs';
import { domainHash, operationId as operationIdentity } from '../../packages/machine-market/native/domain.mjs';
import { containedPath } from './phase2-acceptance-journal.mjs';
import { hash } from './phase2-acceptance-schedule.mjs';
export function reuseFenceInput(path, value) {
    if (existsSync(path)) {
        let original;
        try {
            original = JSON.parse(readFileSync(path, 'utf8'));
        }
        catch {
            throw Error('FENCE_INPUT_CHANGED');
        }
        if (canonical(original) !== canonical(value))
            throw Error('FENCE_INPUT_CHANGED');
        return false;
    }
    const fd = openSync(path, 'wx', 0o600);
    try {
        writeFileSync(fd, canonical(value));
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    }
    return true;
}
export async function proveIsolatedFence({ config, journal }) {
    const id = 'concrete:isolated-fence', saved = journal.get(id);
    if (saved?.state === 'Complete')
        return saved.result;
    journal.prepare(id, { kind: 'isolated-process-sqlite-fence', nativeTransactions: 0 });
    const filename = containedPath(config.privateRoot, join(config.privateRoot, 'isolated-fence.sqlite')), input = containedPath(config.privateRoot, join(config.privateRoot, 'isolated-fence-input.json')), exitPath = containedPath(config.privateRoot, join(config.privateRoot, 'isolated-fence-exit.json'));
    // Reuse exactly the original public run input; never generate another namespace.
    reuseFenceInput(input, { filename, run: config.run });
    const operationId = operationIdentity({ domain: domainHash(config.run), type: 'Init', marketNonce: config.run.marketNonce });
    if (!existsSync(filename)) {
        const child = fork(fileURLToPath(new URL('./phase2-acceptance-fence-child.mjs', import.meta.url)), [input], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { PATH: process.env.PATH ?? '', NODE_NO_WARNINGS: '1' } });
        const exited = new Promise((resolve, reject) => {
            child.once('exit', (code, signal) => resolve({
                pid: child.pid,
                code,
                signal,
                operationId
            }));
            child.once('error', reject);
        });
        try {
            const reported = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(Error('FENCE_CHILD_TIMEOUT')), 10000);
                child.once('error', reject);
                child.once('message', value => {
                    clearTimeout(timeout);
                    if (value?.stage !== 'fenced' || value.operationId !== operationId)
                        reject(Error('FENCE_CHILD_PROTOCOL'));
                    else
                        resolve(value.operationId);
                });
            });
            if (reported !== operationId)
                throw Error('FENCE_CHILD_PROTOCOL');
            child.kill('SIGKILL');
            const exit = await exited;
            if (exit.signal !== 'SIGKILL')
                throw Error('FENCE_CHILD_PROTOCOL');
            reuseFenceInput(exitPath, exit);
        }
        catch (error) {
            if (child.exitCode === null && child.signalCode === null)
                child.kill('SIGKILL');
            throw error;
        }
    }
    // An existing DB means observe the ORIGINAL fence. Never fork/create a new one.
    if (!existsSync(exitPath))
        throw Error('FENCE_EXIT_EVIDENCE_PENDING');
    const exit = JSON.parse(readFileSync(exitPath, 'utf8'));
    if (exit.operationId !== operationId || exit.signal !== 'SIGKILL')
        throw Error('FENCE_EXIT_EVIDENCE_CHANGED');
    const store = createOutbox({
        filename,
        run: config.run,
        recoverStaleLock: true,
        authorize() {
        }
    });
    let signerCalls = 0;
    try {
        const op = store.get(operationId);
        if (op.state !== 'Quarantined' || op.attempt !== null || !op.fenceToken || store.storageInfo().signingSlotsUsed !== 1)
            throw Error('FENCE_NOT_RETAINED');
        let refused = false;
        try {
            store.sign(operationId, { expectedVersion: op.version, currentSlot: '1', signers: new Proxy({}, { get() {
                        signerCalls++;
                        return () => {
                            throw Error('UNEXPECTED_SIGNER');
                        };
                    } }) });
        }
        catch (error) {
            refused = error.code === 'PENDING_SETTLEMENT';
        }
        if (!refused || signerCalls !== 0)
            throw Error('FENCE_RESIGNED');
        const evidence = {
            kind: 'process-sqlite',
            nativeTransactions: 0,
            rpcCalls: 0,
            signerCalls: 0,
            operationId,
            processExit: 'SIGKILL',
            checks: ['original-input-and-fence-retained', 'fence-durable-before-process-death', 'quarantine-on-current-db-reopen', 'no-second-signer-call', 'one-fence-slot-retained']
        };
        const result = { evidence: [evidence], proofs: ['T8:after-fence-crash', 'T8:unknown-retained'].map(id => ({
                id,
                status: 'passed',
                evidenceHashes: [hash(evidence)],
                assertions: evidence.checks
            })) };
        journal.complete(id, result);
        return result;
    }
    finally {
        store.close();
    }
}
