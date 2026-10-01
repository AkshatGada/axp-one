import { openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, object, safeText, hash, freeze } from '../ml/core.mjs';

export const DEFAULT_EVIDENCE_PATH = fileURLToPath(new URL('../../artifacts/advertiser/evidence.json', import.meta.url));
export const EVIDENCE_SCHEMA = 'advertiser-evidence.v1';
export const MAX_RECORDS = 75; // Five lookups, five neighbors, three mappings.
const MAX_BYTES = 512 * 1024;
const TIERS = ['sparse', 'holdout', 'loo', 'leave-one-out', 'unknown'];
const digest = value => assert(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value), 'evidence_hash_invalid');
const sourceId = value => assert(Number.isSafeInteger(value) && value > 0, 'evidence_id_invalid');
const date = value => assert(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'evidence_timestamp_invalid');

// Reject unsafe source rows rather than rewriting copy and misbinding provenance.
export function evidenceText(value, max = 2400) {
  safeText(value, max);
  assert(value.trim().length > 0 && !/[<>\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value), 'evidence_text_rejected');
  assert(!/\b(?:pregnan\w*|hiv|religion|political affiliation|sexual orientation|medical diagnosis|race-based|ethnicity|passport|ssn|my phone|my email|my address)\b/iu.test(value), 'evidence_sensitive_content');
  assert(!/(?:\b(?:api[-_ ]?key|private[-_ ]?key|secret|password)\s*[:=]|\bapikey_[a-z0-9_]{16,}|\bAKIA[A-Z0-9]{16}\b|\b(?:postgres(?:ql)?|https?):\/\/[^\s/]+:[^\s/]+@|\b(?:javascript|data):|\+?\d[\d ()-]{8,}\d)/iu.test(value), 'evidence_private_content');
  return value;
}
const hashes = values => {
  assert(Array.isArray(values) && values.length > 0 && values.length <= 5, 'evidence_hashes_invalid');
  values.forEach(digest);
  assert(new Set(values).size === values.length, 'evidence_duplicate_hash');
};

function validateInventory(inventory) {
  object(inventory, ['schemaVersion', 'provenance', 'vectors', 'travel']);
  assert(inventory.schemaVersion === 'cached-corpus-inventory.v1', 'evidence_inventory_invalid');
  const p = inventory.provenance;
  object(p, ['database', 'readOnly', 'model', 'dimension', 'revision', 'category', 'embeddingCalls']);
  assert(p.database === 'ads' && p.readOnly === true && p.model === 'BAAI/bge-base-en-v1.5' && p.dimension === 768 && p.revision === 'unrecorded' && p.category === 'travel-hospitality' && p.embeddingCalls === 0, 'evidence_inventory_invalid');
  object(inventory.vectors, ['prompt', 'ad', 'hint']);
  object(inventory.travel, ['backgroundProbes', 'backgroundMappings', 'backgroundCreatives', 'hints', 'hintVectors']);
  assert([...Object.values(inventory.vectors), ...Object.values(inventory.travel)].every(n => Number.isSafeInteger(n) && n >= 0) && inventory.travel.hintVectors <= inventory.travel.hints, 'evidence_inventory_invalid');
}

export function validateEvidence(catalogue) {
  object(catalogue, ['schemaVersion', 'capturedAt', 'sourceMode', 'limitations', 'inventory', 'records', 'contentHash']);
  assert(catalogue.schemaVersion === EVIDENCE_SCHEMA && ['cached_database_export', 'recorded_profile_excerpt'].includes(catalogue.sourceMode), 'evidence_schema_invalid');
  date(catalogue.capturedAt); digest(catalogue.contentHash);
  assert(Array.isArray(catalogue.limitations) && catalogue.limitations.length > 0 && catalogue.limitations.length <= 24, 'evidence_limitations_invalid');
  catalogue.limitations.forEach(t => evidenceText(t));
  if (catalogue.sourceMode === 'cached_database_export') validateInventory(catalogue.inventory);
  else assert(catalogue.inventory === null, 'recorded_inventory_must_be_unavailable');
  assert(Array.isArray(catalogue.records) && catalogue.records.length > 0 && catalogue.records.length <= MAX_RECORDS, 'evidence_records_invalid');
  const seen = new Set(), prompts = new Map(), creatives = new Map(), hints = new Map();
  function consistent(map, key, value) {
    const content = hash(value);
    assert(!map.has(key) || map.get(key) === content, 'evidence_identity_conflict');
    map.set(key, content);
  }
  for (const r of catalogue.records) {
    object(r, ['id', 'promptId', 'promptText', 'creativeId', 'mappingId', 'advertiser', 'creativeText', 'hint', 'source']);
    [r.promptId, r.creativeId, r.mappingId].forEach(sourceId);
    assert(r.id === `ads:mapping:${r.mappingId}` && !seen.has(r.id), 'evidence_duplicate_or_invalid_id'); seen.add(r.id);
    evidenceText(r.promptText); evidenceText(r.advertiser, 160);
    if (catalogue.sourceMode === 'cached_database_export') evidenceText(r.creativeText);
    else assert(r.creativeText === null, 'recorded_creative_text_unavailable');
    if (r.hint !== null) {
      const h = r.hint;
      object(h, ['id', 'text', 'tier', 'modelVersion', 'reconstructionAuc', 'semantics']);
      sourceId(h.id); evidenceText(h.text); evidenceText(h.modelVersion, 160);
      assert(TIERS.includes(h.tier) && h.semantics === 'inferred_targeting_not_advertiser_configuration', 'evidence_hint_invalid');
      assert(h.reconstructionAuc === null || typeof h.reconstructionAuc === 'number' && Number.isFinite(h.reconstructionAuc) && h.reconstructionAuc >= 0 && h.reconstructionAuc <= 1, 'evidence_hint_invalid');
      consistent(hints, h.id, h);
    }
    const s = r.source;
    object(s, ['database', 'readOnly', 'sourceHash', 'category', 'revision', 'selectionVersion', 'queryTextHashes', 'profileHashes', 'recordedAt', 'creativeTextStatus'], ['database', 'readOnly', 'sourceHash', 'category', 'revision', 'selectionVersion', 'creativeTextStatus']);
    assert(s.database === 'ads' && s.readOnly === true && s.category === 'travel-hospitality' && s.revision === 'unrecorded' && s.selectionVersion === 'advertiser-travel-bounded-v1', 'evidence_source_invalid');
    digest(s.sourceHash);
    if (catalogue.sourceMode === 'cached_database_export') {
      hashes(s.queryTextHashes);
      assert(s.creativeTextStatus === 'historical_observed_copy' && !Object.hasOwn(s, 'profileHashes') && !Object.hasOwn(s, 'recordedAt'), 'evidence_source_invalid');
    } else {
      hashes(s.profileHashes); date(s.recordedAt);
      assert(s.creativeTextStatus === 'unavailable_in_recorded_profile' && !Object.hasOwn(s, 'queryTextHashes'), 'evidence_source_invalid');
    }
    consistent(prompts, r.promptId, r.promptText);
    consistent(creatives, r.creativeId, { advertiser: r.advertiser, creativeText: r.creativeText });
  }
  const { contentHash, ...content } = catalogue;
  assert(hash(content) === contentHash, 'evidence_content_hash_mismatch');
  return catalogue;
}

/** Synchronous, bounded, offline loader; returns deeply immutable evidence. */
export function loadEvidence(path = DEFAULT_EVIDENCE_PATH) {
  let fd;
  try {
    fd = openSync(path, 'r');
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.size > 0 && stat.size <= MAX_BYTES, 'evidence_file_size_invalid');
    const bytes = Buffer.alloc(MAX_BYTES + 1);
    let size = 0, n;
    while (size < bytes.length && (n = readSync(fd, bytes, size, bytes.length - size, null)) > 0) size += n;
    assert(size <= MAX_BYTES, 'evidence_file_size_invalid');
    let catalogue;
    try { catalogue = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size))); }
    catch { throw new Error('evidence_json_invalid'); }
    return freeze(validateEvidence(catalogue));
  } finally { if (fd !== undefined) closeSync(fd); }
}

const tokens = text => [...new Set(text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];

/** OR-match exact tokens, score by distinct token count, tie by mapping ID. */
export function searchEvidence(catalogue, options = {}) {
  validateEvidence(catalogue);
  object(options, ['query', 'limit'], ['query']);
  const { query, limit = 12 } = options;
  assert(typeof query === 'string' && query.length <= 2000, 'evidence_query_invalid');
  if (query.trim()) evidenceText(query, 2000);
  assert(Number.isInteger(limit) && limit >= 1 && limit <= MAX_RECORDS, 'evidence_limit_invalid');
  const wanted = tokens(query);
  const selected = catalogue.records.map(record => {
    const fields = new Set(tokens([record.promptText, record.advertiser, record.creativeText ?? '', record.hint?.text ?? ''].join(' ')));
    return { record, count: wanted.filter(t => fields.has(t)).length };
  }).filter(x => wanted.length === 0 || x.count > 0)
    .sort((a, b) => b.count - a.count || a.record.mappingId - b.record.mappingId);
  return freeze({ schemaVersion: 'advertiser-evidence-search.v1', method: 'lexical_catalogue_search', sourceMode: catalogue.sourceMode, contentHash: catalogue.contentHash, query, totalMatches: selected.length, records: structuredClone(selected.slice(0, limit).map(x => x.record)) });
}
