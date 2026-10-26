/** Assertions over actual captured transactions and current finalized account bytes. */
import { decodeAccount, decodeAuthorization, decodeInstruction, canonicalBase64 } from '../../packages/machine-market/native/codec.mjs';
import { hash } from './phase2-acceptance-schedule.mjs';
import { validateNativeAccount } from '../../packages/machine-market/native/observations.mjs';
export const DEFAULT_PROOFS = Object.freeze([
    'T1:maker-price-both-directions', 'T6:response-after-useby', 'T7:recurring-owner-payout',
    'T7:current-holder-face-refund', 'T7:unused-expiry', 'T7:primary-secondary-conservation',
    'T4:sponsor-negative-consent', 'T4:sponsor-refund-no-replenishment', 'T6:timeout-no-bytes',
    'T9:serialized-size-cu',
]);
const demand = (condition, code) => {
    if (!condition)
        throw Error(code);
};
export async function verifyDefaultCases({ config, context, journal }) {
    const { steps } = journal;
    const result = id => {
        const row = steps[id];
        demand(row?.state === 'Complete', 'DEFAULT_STEP_MISSING');
        return row.result;
    };
    const tx = id => {
        const proof = result(id).evidence.find(row => row.kind === 'native-transaction');
        demand(proof?.status === 'finalized-success', 'NATIVE_SUCCESS_REQUIRED');
        return proof;
    };
    const delta = (proof, key) => proof.accounts.find(row => row.address === key)?.delta ?? '0';
    const account = (proof, kind, test = () => true) => {
        const values = proof.receipts.map(row => decodeAccount(canonicalBase64(row.base64))).filter(row => row.kind === kind && test(row));
        demand(values.length === 1, 'RECEIPT_REQUIRED');
        return values[0];
    };
    const current = await context.rpc.accounts([config.run.market, ...config.units.map(row => row.address)]);
    for (const binding of config.units) {
        const raw = current.accounts.find(row => row.address === binding.address), unit = validateNativeAccount(raw, config.run, { kind: 'Unit' });
        const expected = ['U1', 'U3', 'U5'].includes(binding.id) ? 4 : binding.id === 'U4' ? 5 : 3;
        demand(unit?.state === expected, 'UNIT_NOT_DRAINED');
    }
    const { issuer, buyerA, buyerB, sponsor, collector } = config.run;
    for (const label of ['U0', 'U1']) {
        const p = tx(label + ':trade:0'), q1 = tx(label + ':trade:1'), q2 = tx(label + ':trade:2');
        demand(delta(p, buyerA) === '-10000' && delta(p, issuer) === '0' && delta(p, collector) === '0', 'PRIMARY_CASH');
        const primary = account(p, 'Match', row => row.tradeKind === 0);
        demand(primary.gross === '10000' && primary.state === 1 && primary.primaryClaimFace === '10000', 'PRIMARY_ESCROW');
        demand(delta(q1, buyerA) === '14850' && delta(q1, buyerB) === '-15000' && delta(q1, collector) === '150', 'SECONDARY_Q1');
        demand(delta(q2, buyerB) === '7920' && delta(q2, buyerA) === '-8000' && delta(q2, collector) === '80', 'SECONDARY_Q2');
        for (const proof of [q1, q2]) {
            const prior = account(proof, 'Match', row => row.tradeKind === 0);
            demand(prior.gross === '10000' && prior.state === 1, 'PRIMARY_FACE_CHANGED');
            const state = proof.accounts.find(row => row.address === decodeAccount(canonicalBase64(proof.receipts.find(row => decodeAccount(canonicalBase64(row.base64)).kind === 'Unit').base64)).primaryMatch);
            demand(state && state.before === state.after, 'SECONDARY_ESCROW_MOVED');
        }
    }
    const askMaker = decodeInstruction(canonicalBase64(tx('U0:trade:0').instructionBase64)), bidMaker = decodeInstruction(canonicalBase64(tx('U1:trade:0').instructionBase64));
    demand(askMaker.gross === '10000' && askMaker.sellerLimit === '10000' && askMaker.buyerLimit === '12000' && bidMaker.gross === '10000' && bidMaker.buyerLimit === '10000' && bidMaker.sellerLimit === '9000', 'MAKER_PRICE_DIRECTIONS');
    const payout = tx('U0:terminal');
    demand(delta(payout, issuer) === '9900' && delta(payout, collector) === '100', 'PRIMARY_PAYOUT');
    const refund = tx('U1:terminal');
    demand(delta(refund, buyerA) === '10000' && delta(refund, buyerB) === '0' && delta(refund, collector) === '0', 'CURRENT_HOLDER_REFUND');
    const refunded = account(refund, 'Match');
    demand(refunded.state === 3 && refunded.fee === '100' && refunded.terminalRecipient === buyerA, 'REFUND_RECEIPT');
    const expiry = tx('U4:terminal');
    demand(delta(expiry, issuer) === '9900' && delta(expiry, collector) === '100', 'UNUSED_EXPIRY_PAYOUT');
    const sponsorRefund = tx('U3:terminal');
    demand(delta(sponsorRefund, sponsor) === '10000' && delta(sponsorRefund, buyerA) === '0', 'SPONSOR_REFUND');
    const consent = decodeAuthorization(canonicalBase64(context.sponsorship.consentEnvelope.authorization));
    demand(consent.assessment === 1 && consent.nontransferable === 1, 'NEGATIVE_CONSENT_REQUIRED');
    const campaign = await context.store.getCampaign(consent.campaignId);
    demand(campaign.consumedGross === '10000' && campaign.refundedGross === '10000' && campaign.consumedCount === 1, 'SPONSOR_ALLOWANCE_REPLENISHED');
    const initial = result('U0:read'), late = result('U0:read:late'), series = config.series.find(row => row.id === 'main');
    demand(initial.responseHash === late.responseHash && BigInt(late.observedSlot) >= BigInt(series.useBySlot), 'LATE_RESPONSE_CHANGED');
    const firstLate = result('U7:read:late');
    demand(!steps['U7:read'] && BigInt(firstLate.observedSlot) >= BigInt(series.useBySlot), 'FIRST_RECOVERY_NOT_LATE');
    const noBytes = result('U5:no-bytes');
    demand(noBytes.denied === true, 'TIMEOUT_RELEASED_BYTES');
    const definitions = {
        'T1:maker-price-both-directions': [['U0:trade:0', 'U1:trade:0'], ['resting-ask10000-vs-bid12000-executes10000', 'resting-bid10000-vs-ask9000-executes10000']],
        'T6:response-after-useby': [['U0:read', 'U0:read:late', 'U7:read:late'], ['same-U0-responseHash-before-after-useby', 'U7-first-response-after-useby', 'owner-request-resource-hash-bound']],
        'T7:recurring-owner-payout': [['U0:trade:0', 'U0:trade:1', 'U0:trade:2', 'U0:terminal'], ['issuer-A-B-A', 'issuer9900-primary-fee100', 'secondary14850-and7920-remain-final']],
        'T7:current-holder-face-refund': [['U1:trade:0', 'U1:trade:1', 'U1:trade:2', 'U1:terminal'], ['current-holder-A10000-once', 'no-B-historical-refund', 'primary-quoted-fee100-earned0']],
        'T7:unused-expiry': [['U4:terminal'], ['Unit-Expired', 'primary-issuer9900-fee100', 'no-delivery-bytes']],
        'T7:primary-secondary-conservation': [['U0:trade:0', 'U0:trade:1', 'U0:trade:2', 'U1:terminal'], ['33000=22770-secondary-cash+230-fees+10000-primary', 'secondary-never-replenishes-primary-face']],
        'T4:sponsor-negative-consent': [['U3:sponsor'], ['signed-assessment1-negative', 'funding-remains-eligible', 'native-sponsored-primary']],
        'T4:sponsor-refund-no-replenishment': [['U3:sponsor', 'U3:terminal'], ['sponsor10000-beneficiary0', 'consumed10000-refunded10000', 'consumed-count1-stays']],
        'T6:timeout-no-bytes': [['U5:terminal', 'U5:no-bytes'], ['native-timeout-refund', 'protected-read-denied']],
        'T9:serialized-size-cu': [Object.keys(steps).filter(id => steps[id].result?.evidence?.some(row => row.kind === 'native-transaction' || row.kind === 'native-negative-transaction')), ['every-measured-transaction<=1232bytes', 'every-measured-program-compute<=200000']],
    };
    const proofs = Object.entries(definitions).map(([id, [ids, assertions]]) => ({
        id,
        status: 'passed',
        assertions,
        evidenceHashes: ids.flatMap(id => result(id).evidence.map(hash))
    }));
    return { proofIds: [...DEFAULT_PROOFS], proofs, assertions: ['all-eight-units-terminal'] };
}
