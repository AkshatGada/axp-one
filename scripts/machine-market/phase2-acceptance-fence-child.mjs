/** Isolated process/SQLite proof only: no RPC, key handle or signer invocation. */
import { readFileSync } from 'node:fs';
import { createOutbox } from '../../packages/machine-market/native/outbox.mjs';
import { domainHash, operationId } from '../../packages/machine-market/native/domain.mjs';
const input = JSON.parse(readFileSync(process.argv[2], 'utf8')), run = input.run;
const store = createOutbox({ filename: input.filename, run, authorize() {
    } });
const instruction = {
    type: 'Init',
    operationId: operationId({ domain: domainHash(run), type: 'Init', marketNonce: run.marketNonce }),
    marketNonce: run.marketNonce,
    genesis: run.genesis,
    matcher: run.matcher,
    gateway: run.gateway,
    collector: run.collector,
    issuer: run.issuer,
    buyerA: run.buyerA,
    buyerB: run.buyerB,
    sponsor: run.sponsor
};
const op = store.prepare({
    instruction,
    accounts: { initializer: run.initializer, market: run.market },
    feePayer: run.matcher,
    blockhash: run.market,
    lastValidBlockHeight: '1000',
    feeReserve: '0',
    rentReserve: '0',
    contextSlot: '0',
    context: {}
});
store.fence(op.id, { expectedVersion: op.version, currentSlot: '0' });
process.send({ stage: 'fenced', operationId: op.id });
setInterval(() => {
}, 1000);
