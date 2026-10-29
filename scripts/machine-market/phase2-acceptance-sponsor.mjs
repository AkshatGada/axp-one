import { canonical } from '../../packages/contracts/index.mjs';
import { canonicalBase64, decodeAuthorization, ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { domainHash, matchId, operationId, sha256 } from '../../packages/machine-market/native/domain.mjs';
import { authorizationEnvelope } from './phase2-acceptance-runtime.mjs';
import { stableIdentity } from './phase2-acceptance-schedule.mjs';
export const acceptanceSponsorPacket = () => ({ schema: 'axp.sponsor.packet.v1', disclosure: 'Sponsored', message: 'Independent source. An unfavorable or insufficient-evidence assessment is allowed.' });
export const acceptanceCampaignId = config => stableIdentity(config.runId, 'U3', 'campaign');
export function createAcceptanceSponsorship({ config, signAuthorization }) {
    const run = config.run, unit = config.units.find(row => row.id === 'U3'), series = config.series.find(row => row.id === unit.series), packet = acceptanceSponsorPacket(), campaignId = acceptanceCampaignId(config), packetHash = sha256(Buffer.from(canonical(packet)));
    const env = (step, actor, value) => authorizationEnvelope({
        run,
        runId: config.runId,
        caseId: 'U3',
        stepId: step,
        actor,
        value,
        signAuthorization
    });
    const campaignEnvelope = env('campaign', run.sponsor, {
        kind: 'SponsorMandate',
        campaignId,
        series: series.address,
        packetHash,
        budget: '10000',
        perGrant: '10000',
        maxGrants: 1,
        eligibleCount: 2,
        eligibleKeys: [run.buyerA, run.buyerB, ZERO_KEY, ZERO_KEY],
        validUntilSlot: series.useBySlot,
        version: 1
    });
    const consentValue = {
        kind: 'SponsoredConsent',
        campaignId,
        campaignVersion: 1,
        series: series.address,
        unit: unit.address,
        cursor: '0',
        amount: '10000',
        sponsor: run.sponsor,
        packetHash,
        validUntilSlot: series.useBySlot,
        assessment: 1,
        nontransferable: 1
    };
    const consentEnvelope = env('consent-negative', run.buyerA, consentValue), issuerEnvelope = env('issuer-quote', run.issuer, {
        kind: 'BookOrder',
        side: 1,
        lane: 0,
        series: series.address,
        refundFace: '0',
        exactUnit: unit.address,
        expectedCursor: '0',
        limit: '10000',
        validUntilSlot: series.useBySlot,
        minRemainingAfter: 0,
        tif: 0,
        quantity: 1
    });
    const selected = matchId({
        domain: domainHash(run),
        buyOrderId: decodeAuthorization(canonicalBase64(consentEnvelope.authorization)).orderId,
        sellOrderId: decodeAuthorization(canonicalBase64(issuerEnvelope.authorization)).orderId,
        unit: unit.address,
        expectedCursor: '0',
        gross: '10000',
        fundingKind: 2
    });
    return {
        campaignId,
        packetHash,
        packet,
        campaignEnvelope,
        consentValue,
        consentEnvelope,
        issuerEnvelope,
        operationId: operationId({ domain: domainHash(run), type: 'FundMatch', matchId: selected })
    };
}
