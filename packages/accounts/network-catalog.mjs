import {createHash} from 'node:crypto';
import {validateCampaignInput} from './resources.mjs';

const fail = code => {throw Object.assign(new Error(code), {code, status: 503});};
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const clock = value => Number.isSafeInteger(value) && value >= 0;
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
    : JSON.stringify(value);
const pick = (row, fields) => {
  if (!row || typeof row !== 'object' || Array.isArray(row) || fields.some(key => !Object.hasOwn(row, key))) fail('network_catalog_invalid');
  return Object.fromEntries(fields.map(key => [key, row[key]]));
};

// Pure metadata projection, shared with the unprivileged owner repository. This
// does not grant access or retain any credential. The public DTO never contains
// advertiser snapshots, private columns, budget counters or receipt authority.
export function campaignServingDTO(row) {
  const dto = pick(row, ['campaignId', 'organizationId', 'version', 'approvedContentHash', 'enabled', 'financialMode', 'updatedAt']);
  if (!uuid(dto.campaignId) || !uuid(dto.organizationId) || !Number.isSafeInteger(dto.version) || dto.version < 1 ||
      typeof dto.enabled !== 'boolean' || dto.financialMode !== 'synthetic' || !clock(dto.updatedAt) ||
      !(dto.approvedContentHash === null || hash(dto.approvedContentHash)) || dto.enabled && !hash(dto.approvedContentHash)) fail('network_catalog_invalid');
  return dto;
}

function catalogRow(row) {
  const campaign = pick(row?.campaign, ['id', 'organizationId', 'advertiserId', 'version', 'status', 'input', 'approvedContentHash', 'createdAt', 'updatedAt', 'servingStatus']);
  const advertiser = pick(row?.advertiser, ['id', 'name', 'website']);
  const enrollment = campaignServingDTO(row?.enrollment);
  if (!enrollment.enabled || campaign.status !== 'approved' || campaign.servingStatus !== 'not_connected' ||
      campaign.id !== enrollment.campaignId || campaign.organizationId !== enrollment.organizationId ||
      campaign.version !== enrollment.version || campaign.approvedContentHash !== enrollment.approvedContentHash ||
      !uuid(campaign.advertiserId) || advertiser.id !== campaign.advertiserId ||
      !clock(campaign.createdAt) || !clock(campaign.updatedAt) || campaign.updatedAt < campaign.createdAt ||
      typeof advertiser.name !== 'string' || !advertiser.name.trim() || advertiser.name.length > 120 ||
      /[\u0000-\u001f\u007f]/u.test(advertiser.name)) fail('network_catalog_invalid');
  try {
    campaign.input = validateCampaignInput(campaign.input);
    if (createHash('sha256').update(canonical(campaign.input)).digest('hex') !== campaign.approvedContentHash) throw Error();
    if (typeof advertiser.website !== 'string' || advertiser.website.length > 2048 || /[\s\\*]/u.test(advertiser.website)) throw Error();
    const url = new URL(advertiser.website);
    if (!url.hostname || url.username || url.password || url.protocol !== 'https:') throw Error();
  } catch {fail('network_catalog_invalid');}
  return {campaign, advertiser, enrollment};
}

// Backend-only read authority. Never install this capability on the owner store,
// use a person's JWT here, or fall back to the demo/SQLite on a database failure.
// Supabase opaque secret keys go only in apikey (they are not Bearer JWTs).
export function createSupabaseNetworkCatalog({url, secretKey, fetchImpl = fetch} = {}) {
  let base;
  try {
    const value = new URL(url);
    if (value.protocol !== 'https:' || value.pathname !== '/' || value.username || value.password ||
        value.search || value.hash || !value.hostname.endsWith('.supabase.co')) throw Error();
    base = value.origin;
  } catch {fail('network_catalog_configuration_required');}
  if (typeof secretKey !== 'string' || !/^sb_secret_[A-Za-z0-9_-]{16,}$/u.test(secretKey)) fail('network_catalog_secret_key_required');
  if (typeof fetchImpl !== 'function') fail('network_catalog_configuration_required');
  return {
    async networkCampaigns() {
      let response, data;
      try {
        response = await fetchImpl(`${base}/rest/v1/rpc/axp_network_campaigns`, {method: 'POST',
          headers: {apikey: secretKey, 'content-type': 'application/json'}, body: '{}',
          redirect: 'error', signal: AbortSignal.timeout(10000)});
      } catch {fail('network_catalog_unavailable');}
      try {data = await response.json();} catch {fail('network_catalog_invalid');}
      if (!response.ok) {
        if (['PGRST202', '42P01', '42883'].includes(data?.code)) fail('network_catalog_migration_required');
        fail('network_catalog_unavailable');
      }
      if (!Array.isArray(data) || data.length > 100) fail('network_catalog_invalid');
      const result = data.map(catalogRow);
      if (new Set(result.map(row => row.campaign.id)).size !== result.length) fail('network_catalog_invalid');
      return result;
    },
  };
}
