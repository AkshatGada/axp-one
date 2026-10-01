import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash, textHash } from '../../packages/ml/core.mjs';
import { loadEvidence, searchEvidence, validateEvidence } from '../../packages/advertiser/evidence.mjs';
import { buildAdvertiserEvidence } from '../../scripts/demo/advertiser-evidence.mjs';

const capturedAt = '2026-10-01T10:00:00.000Z';
const recorded = () => buildAdvertiserEvidence({ capturedAt, recordedOnly: true });
const reseal = c => { const { contentHash: _unused, ...content } = c; return { ...content, contentHash: hash(content) }; };
const inventory = { schemaVersion: 'cached-corpus-inventory.v1', provenance: { database: 'ads', readOnly: true, model: 'BAAI/bge-base-en-v1.5', dimension: 768, revision: 'unrecorded', category: 'travel-hospitality', embeddingCalls: 0 }, vectors: { prompt: 10, ad: 4, hint: 2 }, travel: { backgroundProbes: 4, backgroundMappings: 4, backgroundCreatives: 4, hints: 2, hintVectors: 2 } };

// Synthetic transport-only fixture. Never written as the default catalogue.
function packet(prompt, records) {
  return { schemaVersion: 'cached-corpus-result.v1', status: 'ready', provenance: { database: 'ads', readOnly: true, model: 'BAAI/bge-base-en-v1.5', dimension: 768, revision: 'unrecorded', queryTextHash: textHash(prompt.toLowerCase().trim().replace(/\s+/gu, ' ')), queryVectorId: 1, sourceVectors: [], embeddingCalls: 0 },
    matches: records.map(r => ({ promptId: r.promptId, promptText: r.promptText, similarity: 1, mappings: [{ mappingId: r.mappingId, creativeId: r.creativeId, advertiser: r.advertiser, creativeText: `Synthetic transport fixture for ${r.advertiser}.`, hint: r.hint }] })) };
}

test('recorded fallback preserves four actual associations and no invented copy or inventory', async () => {
  const c = await recorded();
  assert.equal(c.schemaVersion, 'advertiser-evidence.v1');
  assert.equal(c.sourceMode, 'recorded_profile_excerpt');
  assert.equal(c.records.length, 4);
  assert.equal(c.inventory, null);
  assert.ok(c.records.every(r => r.creativeText === null && r.source.readOnly === true && r.source.profileHashes.length > 0));
  assert.equal(c.records.filter(r => r.hint).length, 2);
  assert.equal(validateEvidence(c), c);
});

test('source outage attempts exactly one inventory with no lookup or retry', async () => {
  let reads = 0;
  const c = await buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => { reads++; throw Error('private source error'); }, lookup: async () => { throw Error('must not lookup'); } } });
  assert.equal(reads, 1); assert.equal(c.sourceMode, 'recorded_profile_excerpt');
  assert.ok(c.limitations.some(t => t.includes('inaccessible')));
  assert.ok(!JSON.stringify(c).includes('private source error'));
});

test('bounded cached export performs one inventory and exactly five known lookups, deduplicating mapping IDs', async () => {
  const saved = await recorded(), prompts = [];
  let inventories = 0;
  const c = await buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => { inventories++; return structuredClone(inventory); }, lookup: async (prompt, options) => { prompts.push(prompt); assert.equal(options.limit, 5); return packet(prompt, saved.records); } } });
  assert.equal(inventories, 1); assert.equal(prompts.length, 5); assert.equal(new Set(prompts).size, 5);
  assert.equal(c.sourceMode, 'cached_database_export'); assert.deepEqual(c.inventory, inventory); assert.equal(c.records.length, 4);
  assert.ok(c.records.every(r => r.source.queryTextHashes.length === 5));
  assert.ok(!JSON.stringify(c).includes('sourceVectors') && !JSON.stringify(c).includes('queryVectorId'));
});

test('all cached misses retain recorded mode with null inventory, not measured zero records', async () => {
  let lookups = 0;
  const c = await buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => structuredClone(inventory), lookup: async prompt => { lookups++; return { ...packet(prompt, []), status: 'query_vector_unavailable' }; } } });
  assert.equal(lookups, 5); assert.equal(c.sourceMode, 'recorded_profile_excerpt'); assert.equal(c.inventory, null); assert.equal(c.records.length, 4);
});

test('source identity mismatch fails closed before lookups', async () => {
  let lookups = 0;
  await assert.rejects(buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => ({ ...inventory, provenance: { ...inventory.provenance, database: 'remote' } }), lookup: async () => { lookups++; } } }), /export_source_invalid/);
  assert.equal(lookups, 0);
});

test('changing association text between reads fails instead of overwriting evidence', async () => {
  const c = await recorded(); let attempt = 0;
  await assert.rejects(buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => structuredClone(inventory), lookup: async prompt => {
    const p = packet(prompt, c.records); p.matches[0].mappings[0].creativeText += String(attempt++); return p;
  } } }), /export_association_changed_between_reads/);
});

test('unsafe creative copy is omitted, not silently sanitized or fabricated', async () => {
  const c = await recorded();
  const out = await buildAdvertiserEvidence({ capturedAt, corpus: { inventory: async () => structuredClone(inventory), lookup: async prompt => {
    const p = packet(prompt, c.records); p.matches[0].mappings[0].creativeText = '<script>unsafe</script>'; return p;
  } } });
  assert.equal(out.records.length, 3); assert.ok(out.limitations.some(t => t.includes('5 unsafe associations omitted')));
});

test('loader verifies hash, freezes records, and handles reordered JSON keys', async () => {
  const c = await recorded(), dir = mkdtempSync(join(tmpdir(), 'axp-advertiser-evidence-'));
  try {
    const path = join(dir, 'evidence.json');
    writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(c).reverse())));
    const loaded = loadEvidence(path); assert.equal(loaded.contentHash, c.contentHash);
    assert.ok(Object.isFrozen(loaded) && Object.isFrozen(loaded.records[0].source));
    const changed = structuredClone(c); changed.records[0].promptText += ' tamper';
    writeFileSync(path, JSON.stringify(changed)); assert.throws(() => loadEvidence(path), /evidence_content_hash_mismatch/);
    writeFileSync(path, '{'); assert.throws(() => loadEvidence(path), /evidence_json_invalid/);
    writeFileSync(path, Buffer.alloc(512 * 1024 + 1)); assert.throws(() => loadEvidence(path), /evidence_file_size_invalid/);
    writeFileSync(path, Buffer.from([0xff])); assert.throws(() => loadEvidence(path), /evidence_json_invalid/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('IDs, association uniqueness, schema and forbidden passthrough fields are checked even after resealing', async () => {
  const original = await recorded();
  for (const modify of [
    c => { c.records[0].mappingId = '4442'; },
    c => { c.records[0].creativeId = -1; },
    c => { c.records[0].id = 'wrong'; },
    c => { c.records.push(structuredClone(c.records[0])); },
    c => { c.records[0].vector = [0.5]; },
    c => { c.records[0].source.secret = 'never allowed'; },
    c => { c.sourceMode = 'live'; },
    c => { c.inventory = inventory; },
    c => { c.records[0].creativeText = 'Made-up copy'; },
    c => { c.records[0].hint.reconstructionAuc = 2; },
  ]) {
    const c = structuredClone(original); modify(c); assert.throws(() => validateEvidence(reseal(c)));
  }
});

test('safe-text validation rejects HTML, controls, secrets, private identifiers and sensitive targeting', async () => {
  const original = await recorded();
  for (const text of ['<img src=x>', 'My contact is name@example.com', 'Bearer abcdefghijklmnop', 'password: abc', 'apikey_abcdefghijklmnop', 'Call +1 555 123 4567', 'target by religion', '\u0000control', 'hidden\u202etext', 'javascript:alert(1)', ' ']) {
    const c = structuredClone(original); c.records[0].promptText = text; assert.throws(() => validateEvidence(reseal(c)));
  }
});

test('lexical token search is deterministic, case-insensitive, vector-free and returns complete records', async () => {
  const c = await recorded(), before = JSON.stringify(c);
  const a = searchEvidence(c, { query: 'TRAVEL automation', limit: 2 });
  assert.equal(a.method, 'lexical_catalogue_search'); assert.equal(a.records.length, 2);
  assert.equal(a.records[0].mappingId, 53989);
  assert.deepEqual(a, searchEvidence(c, { query: 'TRAVEL automation', limit: 2 }));
  assert.equal(JSON.stringify(c), before);
  assert.equal(searchEvidence(c, { query: 'trav' }).records.length, 0);
  assert.equal(searchEvidence(c, { query: 'Navan' }).records.length, 2);
  assert.ok(a.records.every(r => r.id && r.source.sourceHash && Object.hasOwn(r, 'creativeText')));
});

test('hint tokens are searchable and empty query browses stable mapping-ID order', async () => {
  const c = await recorded();
  assert.equal(searchEvidence(c, { query: 'secure authentication' }).records[0].advertiser, 'Auth0');
  const browse = searchEvidence(c, { query: '' }); assert.equal(browse.totalMatches, 4);
  assert.deepEqual(browse.records.map(r => r.mappingId), [4442, 53989, 110136, 688879]);
  assert.equal(searchEvidence(c, { query: 'no_matching_token' }).totalMatches, 0);
});

test('search rejects invalid types, limits, unsafe query and unsupported options', async () => {
  const c = await recorded();
  for (const opts of [{}, { query: 2 }, { query: 'travel', limit: 0 }, { query: 'travel', limit: 76 }, { query: 'travel', limit: 1.2 }, { query: '<script>' }, { query: 'travel', vector: [1] }]) assert.throws(() => searchEvidence(c, opts));
});

test('generated default catalogue is actual source data and loads without Docker or model access', () => {
  const c = loadEvidence();
  assert.ok(c.records.length > 0 && c.records.every(r => !r.creativeText?.includes('Synthetic transport fixture')));
  assert.equal(searchEvidence(c, { query: '', limit: 1 }).records.length, 1);
});
