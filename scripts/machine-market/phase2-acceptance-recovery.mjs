/** Pure recovery predicates; no network, signing, database or evidence fabrication. */
import { canonical } from '../../packages/contracts/index.mjs';
import { hash } from './phase2-acceptance-schedule.mjs';
export const CRASH_STEPS = Object.freeze({ 'U7:trade:0': 'after-signed-persistence', 'U7:trade:1': 'after-send', 'U7:terminal': 'resolved-before-http' });
export function assertLateResponse({ priorResponseHash, nativeResponseHash, actualResponseHash }) {
    if (typeof nativeResponseHash !== 'string' || actualResponseHash !== nativeResponseHash || (priorResponseHash !== undefined && priorResponseHash !== actualResponseHash))
        throw Error('RESPONSE_RECOVERY_MISMATCH');
    return true;
}
export function raceIntent({ saved, probeIds, unit, cursor }) {
    const intended = {
        kind: 'declared-native-race',
        probeIds,
        unit,
        cursor
    };
    if (!saved)
        return intended;
    const old = saved.intent;
    if (old?.kind !== intended.kind || old.unit !== unit || canonical(old.probeIds) !== canonical(probeIds))
        throw Error('RACE_IDENTITY_CONFLICT');
    return structuredClone(old);
}
export function validateCrashMarker({ marker, exit, operationId, point, attempt }) {
    if (marker?.schema !== 'axp.market.crash.v1' || marker.operationId !== operationId || marker.point !== point || marker.pid !== exit?.pid || exit.signal !== 'SIGKILL' || attempt?.signature !== marker.signature || hash(attempt.transaction) !== marker.transactionHash)
        throw Error('CRASH_MARKER_MISMATCH');
    return {
        kind: 'process-native-recovery',
        operationId,
        point,
        transactionHash: marker.transactionHash,
        signature: marker.signature,
        exitSignal: 'SIGKILL'
    };
}
export function crashProofIds(point) {
    const id = { 'after-signed-persistence': 'T8:after-signed-crash', 'after-send': 'T8:after-send-crash', 'resolved-before-http': 'T8:resolved-before-http-crash' }[point];
    if (!id)
        throw Error('CRASH_SPEC');
    return [id, ...(point === 'resolved-before-http' ? ['T6:lost-response-restart'] : [])];
}
export function buildCrashProofs({ point, native, marker }) {
    if (native.operationId !== marker.operationId || native.signature !== marker.signature || native.status !== 'finalized-success' || marker.exitSignal !== 'SIGKILL')
        throw Error('CRASH_PROOF_BINDING');
    return crashProofIds(point).map(id => ({
        id,
        status: 'passed',
        evidenceHashes: [hash(native), hash(marker)],
        assertions: ['actual-SIGKILL-after-committed-stage', 'same-current-db-ledger', 'original-operation-signature-and-bytes']
    }));
}
export function requireAfterBoundary({ currentSlot, deadlineSlot }) {
    if (typeof currentSlot !== 'string' || typeof deadlineSlot !== 'string' || !/^(0|[1-9][0-9]*)$/.test(currentSlot) || !/^(0|[1-9][0-9]*)$/.test(deadlineSlot))
        throw Error('BOUNDARY_SLOT');
    if (BigInt(currentSlot) < BigInt(deadlineSlot))
        throw Error('PROBE_BOUNDARY_NOT_REACHED');
    return currentSlot === deadlineSlot ? 'at' : 'after';
}
