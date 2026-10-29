/** Acceptance-only HTTP scheduling; business methods/RPC/signing stay unchanged. */
import { hash } from './phase2-acceptance-schedule.mjs';
const demand = (condition, code) => {
    if (!condition)
        throw Error(code);
};
export function createAcceptanceGatedService({ service, store }) {
    let active = null;
    async function wait(kind, value) {
        const row = active;
        if (!row || hash(value) !== row[kind + 'Hash'])
            return;
        row.events.push(kind + '-entered');
        row.entered[kind] = true;
        await new Promise(resolve => {
            row.waiters[kind] = resolve;
            if (row.released[kind])
                resolve();
        });
    }
    const originalSign = store.native.sign;
    store.native.sign = function (id, ...args) {
        const result = originalSign.call(this, id, ...args);
        if (active?.operationId === id) {
            active.signed = true;
            active.events.push('signed-persisted');
        }
        return result;
    };
    const gates = {
        arm(spec) {
            demand(!active && spec && Object.keys(spec).sort().join(',') === 'bidHash,cancelHash,operationId' && /^[a-f0-9]{64}$/.test(spec.bidHash) && /^[a-f0-9]{64}$/.test(spec.cancelHash) && /^[a-f0-9]{64}$/.test(spec.operationId), 'HTTP_GATE_SPEC');
            active = {
                ...spec,
                events: [],
                entered: {},
                released: {},
                waiters: {},
                signed: false
            };
            return true;
        },
        status() {
            return active ? {
                events: [...active.events],
                entered: { ...active.entered },
                released: { ...active.released },
                signed: active.signed,
                operationId: active.operationId
            } : null;
        },
        release(kind) {
            demand(active && ['bid', 'cancel'].includes(kind) && active.entered[kind] && !active.released[kind], 'HTTP_GATE_RELEASE');
            active.released[kind] = true;
            active.events.push(kind + '-released');
            active.waiters[kind]?.();
            return gates.status();
        },
        clear() {
            demand(active && active.released.bid && active.released.cancel, 'HTTP_GATE_PENDING');
            const status = gates.status();
            active = null;
            return status;
        },
    };
    const wrapped = { ...service, async orders(value) {
            await wait('bid', value);
            return service.orders(value);
        }, async cancel(value) {
            await wait('cancel', value);
            return service.cancel(value);
        } };
    return { service: wrapped, gates };
}
