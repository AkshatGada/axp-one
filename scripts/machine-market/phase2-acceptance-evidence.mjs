/** Explicit public projection and arithmetic checks. Never invent chain evidence. */
import { decodeAccount, decodeInstruction, canonicalBase64, publicKeyBytes } from '../../packages/machine-market/native/codec.mjs';
import { LIMITS, PACKET_SHA256, hash } from './phase2-acceptance-schedule.mjs';
const fail = code => {
    throw Error(code);
};
const unsigned = value => {
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value))
        fail('EVIDENCE_AMOUNT');
    return BigInt(value);
};
const signed = value => {
    if (typeof value !== 'string' || !/^(0|-?[1-9][0-9]*)$/.test(value))
        fail('EVIDENCE_DELTA');
    return BigInt(value);
};
const hex = value => {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
        fail('EVIDENCE_HASH');
    return value;
};
const key = value => {
    publicKeyBytes(value);
    return value;
};
const signature = value => {
    if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(value))
        fail('EVIDENCE_SIGNATURE');
    return value;
};
export function assertPublicEvidence(value) {
    const forbidden = /^(?:private.*|secret.*|seed|mnemonic|keypair|signerHandle|signerHandles|handle|handles|configPath|path|filename|content|resourceBytes|responseBytes|responseBody|packet|authorization|rawError|diagnostic|stack|database|db)$/i;
    const visit = (row, depth) => {
        if (depth > 16)
            fail('EVIDENCE_DEPTH');
        if (row === null || typeof row === 'boolean' || typeof row === 'number')
            return;
        if (typeof row === 'string') {
            if (row.length > 20000 || /-----BEGIN (?:.* )?PRIVATE KEY-----|(?:^|\s)(?:\/Users\/|\/private\/|file:\/\/)/.test(row))
                fail('PRIVATE_EVIDENCE');
            return;
        }
        if (Array.isArray(row)) {
            if (row.length > 1024)
                fail('EVIDENCE_CAPACITY');
            row.forEach(item => visit(item, depth + 1));
            return;
        }
        if (!row || Object.getPrototypeOf(row) !== Object.prototype)
            fail('EVIDENCE_TYPE');
        for (const [field, item] of Object.entries(row)) {
            if (forbidden.test(field))
                fail('PRIVATE_EVIDENCE');
            visit(item, depth + 1);
        }
    };
    visit(value, 0);
    return value;
}
/** Input is normalized from native observer; expected effects come from the case. */
export function nativeEvidence(proof, { operationId, expectedDeltas, expectedInstruction } = {}) {
    if (!proof || proof.authority !== 'solana-local-validator' || proof.evidence !== 'transaction-finalized' || !['finalized-success', 'finalized-failure'].includes(proof.status))
        fail('FINALIZED_TRANSACTION_REQUIRED');
    hex(proof.operationId);
    if (operationId && proof.operationId !== operationId)
        fail('EVIDENCE_OPERATION');
    const bytes = canonicalBase64(proof.instructionBase64), instruction = decodeInstruction(bytes);
    if (instruction.operationId !== proof.operationId || (expectedInstruction && hash(bytes) !== hash(expectedInstruction)))
        fail('EVIDENCE_INSTRUCTION');
    if (!Number.isSafeInteger(proof.transactionBytes) || proof.transactionBytes < 1 || proof.transactionBytes > LIMITS.transactionBytes || !Number.isSafeInteger(proof.computeUnits) || proof.computeUnits < 0 || proof.computeUnits > LIMITS.computeUnits)
        fail('NATIVE_RUNTIME_BOUND');
    unsigned(proof.slot);
    unsigned(proof.rentLamports);
    const fee = unsigned(proof.feeLamports);
    key(proof.feePayer);
    signature(proof.signature);
    if (!Array.isArray(proof.accounts) || !proof.accounts.length)
        fail('COHERENT_ACCOUNTS_REQUIRED');
    const seen = new Set();
    let total = 0n;
    const accounts = proof.accounts.map(row => {
        key(row.address);
        if (seen.has(row.address))
            fail('DUPLICATE_ACCOUNT');
        seen.add(row.address);
        const before = unsigned(row.before), after = unsigned(row.after), delta = signed(row.delta);
        if (after - before !== delta)
            fail('ACCOUNT_DELTA_MISMATCH');
        total += delta;
        return {
            address: row.address,
            before: row.before,
            after: row.after,
            delta: row.delta
        };
    });
    if (total !== -fee || !seen.has(proof.feePayer))
        fail('NATIVE_CONSERVATION');
    if (!expectedDeltas || Object.entries(expectedDeltas).some(([address, delta]) => !seen.has(address) || signed(delta) !== signed(accounts.find(row => row.address === address).delta)))
        fail('EXPECTED_DELTAS_REQUIRED');
    const receipts = (proof.receipts ?? []).map(row => {
        key(row.address);
        const data = canonicalBase64(row.base64), account = decodeAccount(data);
        return {
            address: row.address,
            kind: account.kind,
            base64: data.toString('base64'),
            sha256: hash(data)
        };
    });
    const rent = (proof.rent ?? []).map(row => {
        key(row.address);
        key(row.payer);
        unsigned(row.lamports);
        return { address: row.address, payer: row.payer, lamports: row.lamports };
    });
    return assertPublicEvidence({
        kind: 'native-transaction',
        authority: proof.authority,
        evidence: proof.evidence,
        status: proof.status,
        operationId: proof.operationId,
        signature: proof.signature,
        slot: proof.slot,
        transactionBytes: proof.transactionBytes,
        computeUnits: proof.computeUnits,
        feePayer: proof.feePayer,
        feeLamports: proof.feeLamports,
        rentLamports: proof.rentLamports,
        instructionBase64: bytes.toString('base64'),
        instructionSha256: hash(bytes),
        accounts,
        receipts,
        rent
    });
}
export function httpEvidence(proof) {
    if (!proof || proof.authority !== 'localhost-http' || !Number.isInteger(proof.status) || proof.status < 100 || proof.status > 599)
        fail('HTTP_EVIDENCE');
    const checks = proof.checks ?? [];
    if (!Array.isArray(checks) || checks.some(value => typeof value !== 'string' || !/^[a-zA-Z0-9_:-]{1,100}$/.test(value)))
        fail('HTTP_EVIDENCE');
    return assertPublicEvidence({
        kind: 'http',
        authority: 'localhost-http',
        status: proof.status,
        requestHash: hex(proof.requestHash),
        responseHash: hex(proof.responseHash),
        checks
    });
}
export function privateResponseEvidence({ bytes, deliveryId, responseHash, resourceHash, versionHash, owner, requestHash }) {
    const buffer = Buffer.from(bytes);
    if (hash(buffer) !== responseHash)
        fail('PRIVATE_RESPONSE_HASH');
    return assertPublicEvidence({
        kind: 'private-response-digest',
        deliveryId: hex(deliveryId),
        responseHash: hex(responseHash),
        resourceHash: hex(resourceHash),
        versionHash: hex(versionHash),
        owner: key(owner),
        requestHash: hex(requestHash),
        byteLength: buffer.length
    });
}
export function summarizeAcceptance({ identity, steps, requiredProofs, budget, storage = null }) {
    const checks = requiredProofs.map(id => ({ id, status: steps.find(row => row.result?.proofs?.some(proof => proof.id === id && proof.status === 'passed')) ? 'passed' : 'pending' }));
    const result = {
        schema: 'axp.market.acceptance.public.v1',
        packetSha256: PACKET_SHA256,
        run: identity,
        budget,
        checks,
        complete: checks.every(row => row.status === 'passed'),
        steps: steps.map(row => ({ id: row.id, state: row.state, evidenceHash: row.resultHash ?? null })),
        storage
    };
    return assertPublicEvidence(result);
}
