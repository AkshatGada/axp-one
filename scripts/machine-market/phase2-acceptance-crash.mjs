/** Concrete same-current-DB process crash protocol. Installed by lead launcher. */
import { openSync, writeFileSync, closeSync, fsyncSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { canonical } from '../../packages/contracts/index.mjs';
import { containedPath } from './phase2-acceptance-journal.mjs';
import { validateCrashMarker } from './phase2-acceptance-recovery.mjs';
import { remoteAcceptanceContext } from './phase2-acceptance-worker.mjs';
import { hash } from './phase2-acceptance-schedule.mjs';
const POINTS = ['after-signed-persistence', 'after-send', 'resolved-before-http'];
const demand = (condition, code) => {
    if (!condition)
        throw Error(code);
};
export function installAcceptanceCrash({ store, armed, privateRoot, markerDirectory, kill } = {}) {
    if (!armed)
        return { installed: false };
    demand(store?.native && POINTS.includes(armed.point) && /^[a-f0-9]{64}$/.test(armed.operationId) && typeof kill === 'function', 'CRASH_SPEC');
    const path = containedPath(privateRoot, join(markerDirectory, armed.operationId + '.json'));
    let fired = false;
    const method = { 'after-signed-persistence': 'sign', 'after-send': 'markSubmitted', 'resolved-before-http': 'observe' }[armed.point];
    const original = store.native[method];
    demand(typeof original === 'function', 'CRASH_METHOD');
    store.native[method] = function (id, ...args) {
        const result = original.call(this, id, ...args);
        if (!fired && id === armed.operationId && (armed.point !== 'resolved-before-http' || result.state === 'ResolvedSuccess')) {
            const current = store.native.get(id);
            demand(current.attempt?.transaction && current.attempt.signature, 'CRASH_REQUIRES_SIGNED_BYTES');
            fired = true;
            const marker = {
                schema: 'axp.market.crash.v1',
                operationId: id,
                point: armed.point,
                pid: process.pid,
                transactionHash: hash(current.attempt.transaction),
                signature: current.attempt.signature
            };
            const fd = openSync(path, 'wx', 0o600);
            try {
                writeFileSync(fd, canonical(marker));
                fsyncSync(fd);
            }
            finally {
                closeSync(fd);
            }
            // Only the lead-created service child calls its injected SIGKILL primitive.
            kill(process.pid, 'SIGKILL');
            throw Error('EXPECTED_CRASH_DID_NOT_TERMINATE');
        }
        return result;
    };
    return { installed: true, method };
}
/** launcher primitives own spawning/listening only; protocol/identity checks live here. */
export function createAcceptanceCrashController({ launcher, config, markerDirectory, baseContext }) {
    demand(launcher?.stop && launcher?.start && launcher?.waitExit, 'PROCESS_LAUNCHER_REQUIRED');
    let armed = null;
    const identity = hash({ runId: config.runId, run: config.run, programSha256: config.programSha256 });
    function exitRecord(operationId, observed) {
        const path = containedPath(config.privateRoot, join(markerDirectory, operationId + '.exit.json'));
        if (existsSync(path)) {
            const saved = JSON.parse(readFileSync(path, 'utf8'));
            demand(canonical(saved) === canonical(observed), 'CRASH_EXIT_CHANGED');
            return saved;
        }
        const fd = openSync(path, 'wx', 0o600);
        try {
            writeFileSync(fd, canonical(observed));
            fsyncSync(fd);
        }
        finally {
            closeSync(fd);
        }
        return observed;
    }
    async function readEvidence({ operationId, point, operation }) {
        const path = containedPath(config.privateRoot, join(markerDirectory, operationId + '.json'));
        demand(existsSync(path), 'CRASH_MARKER_REQUIRED');
        const marker = JSON.parse(readFileSync(path, 'utf8')), exitPath = containedPath(config.privateRoot, join(markerDirectory, operationId + '.exit.json'));
        const exit = existsSync(exitPath) ? JSON.parse(readFileSync(exitPath, 'utf8')) : exitRecord(operationId, await launcher.waitExit({ pid: marker.pid }));
        return validateCrashMarker({
            marker,
            exit,
            operationId,
            point,
            attempt: operation.attempt
        });
    }
    return {
        async armCrash(spec) {
            demand(!armed && POINTS.includes(spec.point) && /^[a-f0-9]{64}$/.test(spec.operationId), 'CRASH_SPEC');
            const marker = containedPath(config.privateRoot, join(markerDirectory, spec.operationId + '.json'));
            demand(!existsSync(marker), 'CRASH_MARKER_EXISTS');
            const stopped = await launcher.stop({ preserveDatabase: true, preserveLedger: true });
            demand(stopped.exited === true, 'CURRENT_WRITER_STILL_ALIVE');
            armed = { ...spec, marker };
            let context = await launcher.start({ configIdentity: identity, crashSpec: spec, recoverStaleLock: false });
            if (context.child)
                context = remoteAcceptanceContext({ ...context, baseContext });
            demand(context.identityHash === identity && Number.isSafeInteger(context.pid), 'CRASH_RUN_MISMATCH');
            armed.pid = context.pid;
            return context;
        },
        recoverEvidence: readEvidence,
        async restartSameRun({ operationId }) {
            demand(armed?.operationId === operationId, 'CRASH_SPEC');
            const exited = await launcher.waitExit({ pid: armed.pid });
            demand(exited.pid === armed.pid && exited.signal === 'SIGKILL', 'EXPECTED_PROCESS_CRASH_REQUIRED');
            exitRecord(operationId, exited);
            const marker = JSON.parse(readFileSync(armed.marker, 'utf8'));
            demand(marker.operationId === operationId && marker.point === armed.point && marker.pid === armed.pid, 'CRASH_MARKER_MISMATCH');
            let context = await launcher.start({ configIdentity: identity, recoverStaleLock: true });
            if (context.child)
                context = remoteAcceptanceContext({ ...context, baseContext });
            demand(context.identityHash === identity, 'CRASH_RUN_MISMATCH');
            const current = await context.store.native.get(operationId);
            demand(current.attempt?.signature === marker.signature && hash(current.attempt.transaction) === marker.transactionHash, 'CRASH_REPLACEMENT_ATTEMPT');
            const result = { ...context, crashEvidence: validateCrashMarker({
                    marker,
                    exit: exited,
                    operationId,
                    point: armed.point,
                    attempt: current.attempt
                }) };
            armed = null;
            return result;
        },
    };
}
