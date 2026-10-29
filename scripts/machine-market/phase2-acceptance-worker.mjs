/** Fixed private parent/worker protocol; not an HTTP or arbitrary method endpoint. */
import { createAcceptanceGatedService } from './phase2-acceptance-gates.mjs';
const METHODS = Object.freeze({
    store: ['getOrder', 'getMatch', 'getUnit', 'getOperation', 'getCampaign', 'captureWallet', 'observeWallet', 'admitAuthorization', 'abortNeverSignedMatch', 'sponsorAccess', 'observeNativeUnit', 'projectActor', 'storageInfo'],
    native: ['get', 'getEvidence', 'listUnresolved', 'storageInfo', 'observe'],
    service: ['prepare', 'executeOperation', 'reconcile', 'resend'],
    repository: ['makePublisherUnavailable', 'restorePublisher'],
    gates: ['arm', 'status', 'release', 'clear'],
});
export function validateWorkerRequest(value) {
    if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(key => !['protocol', 'id', 'scope', 'method', 'args'].includes(key)) || value.protocol !== 'axp.acceptance.ipc.v1' || !Number.isSafeInteger(value.id) || value.id < 1 || !Object.hasOwn(METHODS, value.scope) || !METHODS[value.scope].includes(value.method) || !Array.isArray(value.args))
        throw Error('WORKER_PROTOCOL');
    return value;
}
/** Called only by the lead-created service child after opening its sole writer. */
export function attachAcceptanceWorker({ store, service, repository, channel = process }) {
    if (!channel.send || !channel.on)
        throw Error('WORKER_CHANNEL');
    const gated = createAcceptanceGatedService({ service, store });
    const targets = {
        store,
        native: store.native,
        service,
        repository,
        gates: gated.gates
    };
    channel.on('message', async (raw) => {
        let value;
        try {
            value = validateWorkerRequest(raw);
        }
        catch {
            return;
        }
        try {
            const target = targets[value.scope], method = target?.[value.method];
            if (typeof method !== 'function')
                throw Error('WORKER_METHOD');
            const result = await method.apply(target, value.args);
            channel.send({ protocol: value.protocol, id: value.id, result });
        }
        catch (error) {
            channel.send({ protocol: value.protocol, id: value.id, error: { code: typeof error.code === 'string' ? error.code : 'WORKER_METHOD_FAILED' } });
        }
    });
    return gated;
}
/** All facade methods are awaitable. No second DB writer or cached authority. */
export function remoteAcceptanceContext({ child, baseContext, identityHash, pid = child.pid }) {
    let sequence = 0;
    const pending = new Map();
    const rejectPending = () => {
        for (const row of pending.values())
            row.reject(Error('SERVICE_PROCESS_EXITED'));
        pending.clear();
    };
    child.on('exit', rejectPending);
    child.on('error', rejectPending);
    child.on('message', value => {
        if (value?.protocol !== 'axp.acceptance.ipc.v1')
            return;
        const row = pending.get(value.id);
        if (!row)
            return;
        pending.delete(value.id);
        if (value.error) {
            const error = Error('SERVICE_REJECTED');
            error.code = value.error.code;
            row.reject(error);
        }
        else
            row.resolve(value.result);
    });
    const scope = name => Object.fromEntries(METHODS[name].map(method => [method, (...args) => new Promise((resolve, reject) => {
            const id = ++sequence;
            pending.set(id, { resolve, reject });
            child.send({
                protocol: 'axp.acceptance.ipc.v1',
                id,
                scope: name,
                method,
                args
            }, error => {
                if (error) {
                    pending.delete(id);
                    reject(Error('SERVICE_PROCESS_EXITED'));
                }
            });
        })]));
    const store = scope('store');
    store.native = scope('native');
    return {
        ...baseContext,
        store,
        service: scope('service'),
        repository: scope('repository'),
        acceptanceRepository: scope('repository'),
        gates: scope('gates'),
        identityHash,
        pid
    };
}
