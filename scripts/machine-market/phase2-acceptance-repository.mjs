/** Lead supplies bootstrap-owned exact bytes; no corpus/key/config discovery. */
import { acceptanceSponsorPacket, acceptanceCampaignId } from './phase2-acceptance-sponsor.mjs';
import { sha256 } from '../../packages/machine-market/native/domain.mjs';
export function createAcceptanceRepository({ store, config, sources, sponsorPackets = new Map() }) {
    const failed = new Set();
    const source = address => sources instanceof Map ? sources.get(address) : sources[address];
    return {
        getSeriesSource(address) {
            if (failed.has(address))
                return null;
            const bytes = source(address);
            const series = config.series.find(row => row.address === address);
            if (!series || !bytes || sha256(Buffer.from(bytes)) !== series.resourceHash)
                throw Error('BOOTSTRAP_SOURCE_MISMATCH');
            return bytes;
        },
        getSponsorPacket(id) {
            if (id === acceptanceCampaignId(config))
                return acceptanceSponsorPacket();
            return sponsorPackets instanceof Map ? sponsorPackets.get(id) : sponsorPackets[id];
        },
        preparePrivateResponse(value) {
            return store.preparePrivateResponse({
                unit: value.unit,
                owner: value.owner,
                requestHash: value.requestHash,
                response: value.response ?? JSON.parse(Buffer.from(value.responseBytes ?? value.bytes).toString('utf8'))
            });
        },
        getPrivateResponse: value => store.getPrivateResponse(value),
        makePublisherUnavailable({ unit }) {
            const binding = config.units.find(row => row.address === unit);
            if (!binding)
                throw Error('UNIT_BINDING');
            failed.add(config.series.find(row => row.id === binding.series).address);
        },
        restorePublisher({ unit }) {
            const binding = config.units.find(row => row.address === unit);
            if (!binding)
                throw Error('UNIT_BINDING');
            failed.delete(config.series.find(row => row.id === binding.series).address);
        },
    };
}
