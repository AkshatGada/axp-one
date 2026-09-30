import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCachedCorpus } from '../../packages/ml/data_adapter/cached-corpus.mjs';

const hashText = text => createHash('sha256').update(text.trim().toLowerCase().replace(/\s+/gu, ' ')).digest('hex');
function row(text = 'Compare hotels in Singapore') {
  return { database: 'ads', readOnly: true, model: 'BAAI/bge-base-en-v1.5', dimension: 768, queryTextHash: hashText(text), queryVectorId: 10, matches: [{
    promptId: 20, promptText: 'Compare hotels in Singapore', promptVectorId: 11, similarity: .9,
    mappings: [{ mappingId: 30, creativeId: 40, advertiser: 'Fixture hotel', creativeText: 'Fixture Singapore hotel stay', creativeVectorId: 12, hint: { id: 50, text: 'Inferred hotel comparison need', tier: 'sparse', modelVersion: 'fixture-v1', reconstructionAuc: .8, supportingCreativeId: 40, hintVectorId: 13 } }],
  }] };
}
const adapter = value => createCachedCorpus({ query: async () => structuredClone(value) });

test('cached adapter projects bounded vector-free result with observed/inferred provenance', async () => {
  const result = await adapter(row()).lookup('Compare hotels in Singapore');
  assert.equal(result.status, 'ready'); assert.equal(result.schemaVersion, 'cached-corpus-result.v1'); assert.equal(result.provenance.revision, 'unrecorded'); assert.equal(result.provenance.queryVectorId, 10);
  assert.equal(result.matches[0].mappings[0].hint.id, 50); assert.equal(result.matches[0].mappings[0].hint.tier, 'sparse');
  assert(result.provenance.qualityFlags.includes('sparse_hint')); assert(result.provenance.qualityFlags.includes('inferred_not_fit_groundtruth'));
  assert.deepEqual(result.provenance.sourceVectors.map(v => v.vectorId).sort(), [11, 12, 13]);
  assert(!JSON.stringify(result).includes('confidence')); assert(!Object.hasOwn(result.matches[0], 'promptVectorId')); assert(Object.isFrozen(result.matches[0].mappings[0].hint));
});
test('legacy hash collapses case/whitespace but does not silently use newer curator folding', async () => {
  const text = '  COMPARE\n hotels   in Singapore  ';
  let sql;
  await createCachedCorpus({ query: async value => { sql = value; return row(text); } }).lookup(text);
  assert(sql.includes(hashText('Compare hotels in Singapore')));
  const sharp = 'Straße'; await adapter({ ...row(sharp), matches: [] }).lookup(sharp);
  assert.notEqual(hashText(sharp), hashText('strasse'));
  const unicode = 'Compare\u0085hotels\u00a0in Singapore'; await adapter({ ...row(), matches: [] }).lookup(unicode);
  const bom = '\ufeffCompare hotels in Singapore'; await adapter({ ...row(), queryTextHash: createHash('sha256').update(bom.toLowerCase()).digest('hex'), matches: [] }).lookup(bom);
});
test('cache miss remains unavailable without generation, fallback or neighbor claims', async () => {
  const response = row(); response.queryVectorId = null; response.matches = [];
  let calls = 0; const corpus = createCachedCorpus({ query: async () => { calls++; return response; } });
  const result = await corpus.lookup('Compare hotels in Singapore'); assert.equal(calls, 1); assert.equal(result.status, 'query_vector_unavailable'); assert.equal(result.provenance.embeddingCalls, 0); assert.equal(result.provenance.fallback, null); assert.deepEqual(result.matches, []);
  response.matches = row().matches; await assert.rejects(corpus.lookup('Compare hotels in Singapore'));
});
test('SQL uses only validated hash/count, fixed background scope and actual creative hint support', async () => {
  const text = "Hotel'; COMMIT; DROP TABLE probes; --";
  let sql;
  await createCachedCorpus({ query: async value => { sql = value; return { ...row(text), matches: [] }; } }).lookup(text, { limit: 2 });
  assert(!sql.includes(text)); assert(!sql.includes('DROP TABLE')); assert(sql.includes(hashText(text))); assert(sql.startsWith('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;')); assert(sql.endsWith('ROLLBACK;'));
  assert(sql.includes("statement_timeout = '8s'")); assert(sql.includes('ap.request_id IS NULL')); assert(sql.includes('gp.request_id IS NOT NULL')); assert(sql.includes("h.evidence->'adIds' @> jsonb_build_array(a.id)")); assert(sql.includes('LIMIT 3')); assert(sql.includes('LIMIT 2'));
  assert(!sql.includes('response_text')); assert(!sql.includes('confidence')); assert(!sql.includes('SELECT *')); assert(!sql.includes('image_url'));
});
test('unknown constructor/database/query options and excessive limits are rejected before I/O', async () => {
  assert.throws(() => createCachedCorpus({ database: 'other' })); assert.throws(() => createCachedCorpus({ host: 'remote' })); assert.throws(() => createCachedCorpus({ query: 'SELECT anything' }));
  let calls = 0; const corpus = createCachedCorpus({ query: async () => { calls++; return row(); } });
  for (const options of [{ limit: 0 }, { limit: 6 }, { limit: 2.5 }, { limit: '5' }, { sql: 'SELECT anything' }, { model: 'other' }]) await assert.rejects(corpus.lookup('Compare hotels in Singapore', options));
  assert.equal(calls, 0); assert.deepEqual(Object.keys(corpus).sort(), ['inventory', 'lookup']);
});
test('private, credential, sensitive and oversized inputs never reach the query', async () => {
  let calls = 0; const corpus = createCachedCorpus({ query: async () => { calls++; return row(); } });
  for (const text of ['Hotels for person@private.example', 'Hotels bearer abcdefghijklmnopqrst', 'Hotels sk-abcdefghijklmnopqrst', 'Travel matching political affiliation', 'Travel by sexual orientation', 'Hotel near my address', 'Hotel for passport details', 'x'.repeat(2401), '   ']) await assert.rejects(corpus.lookup(text));
  assert.equal(calls, 0);
});
test('unsafe result fields are omitted rather than redacted with a retained vector', async () => {
  for (const mutate of [x => x.matches[0].promptText = 'Hotels person@private.example', x => x.matches[0].mappings[0].creativeText = 'Hotels person@private.example', x => x.matches[0].mappings[0].advertiser = 'bearer abcdefghijklmnopqrst']) {
    const response = row(); mutate(response); const result = await adapter(response).lookup('Compare hotels in Singapore'); assert.deepEqual(result.matches, []); assert.deepEqual(result.provenance.sourceVectors, []); assert(!JSON.stringify(result).includes('private.example'));
  }
});
test('unsafe or incorrectly linked hints become null and their vector metadata does not escape', async () => {
  for (const mutate of [h => h.text = 'person@private.example', h => h.supportingCreativeId = 99, h => h.text = 'x'.repeat(2401), h => h.modelVersion = 'bearer abcdefghijklmnopqrst']) {
    const response = row(); mutate(response.matches[0].mappings[0].hint); const result = await adapter(response).lookup('Compare hotels in Singapore'); assert.equal(result.matches[0].mappings[0].hint, null); assert.equal(result.provenance.screening.omittedHints, 1); assert(!result.provenance.sourceVectors.some(v => v.kind === 'hint'));
  }
});
test('source/model/dimension/hash bindings, IDs, bounds and unknown raw fields fail closed', async () => {
  for (const mutate of [x => x.database = 'mirror', x => x.readOnly = false, x => x.model = 'other', x => x.dimension = 384, x => x.queryTextHash = 'wrong', x => x.matches[0].similarity = NaN, x => x.matches[0].promptId = -1, x => x.matches[0].vector = [1, 0], x => x.matches[0].mappings[0].rawAnswer = 'private', x => x.matches[0].mappings[0].hint.confidence = .99, x => x.matches[0].mappings[0].hint.reconstructionAuc = 2, x => x.matches.push(structuredClone(x.matches[0]))]) {
    const response = row(); mutate(response); await assert.rejects(adapter(response).lookup('Compare hotels in Singapore'));
  }
  const tooMany = row(); tooMany.matches[0].mappings = Array.from({ length: 4 }, (_, i) => ({ ...tooMany.matches[0].mappings[0], creativeId: 100+i })); await assert.rejects(adapter(tooMany).lookup('Compare hotels in Singapore'));
});
test('query cancellation and transport errors never expose arbitrary diagnostics', async () => {
  let calls = 0; const controller = new AbortController(); controller.abort();
  const corpus = createCachedCorpus({ query: async () => { calls++; throw new Error('credential must not escape'); } });
  await assert.rejects(corpus.lookup('Compare hotels in Singapore', { signal: controller.signal }), /lookup_aborted/); assert.equal(calls, 0);
  await assert.rejects(corpus.lookup('Compare hotels in Singapore'), e => e.message === 'corpus_query_failed'); assert.equal(calls, 1);
  const pending = createCachedCorpus({ query: async () => new Promise(() => {}) }); const interrupted = new AbortController();
  const work = pending.lookup('Compare hotels in Singapore', { signal: interrupted.signal }); interrupted.abort();
  await assert.rejects(work, /lookup_aborted/);
});
test('aggregate inventory has no row texts/vectors and validates counts', async () => {
  let sql;
  const source = { database: 'ads', readOnly: true, model: 'BAAI/bge-base-en-v1.5', dimension: 768, vectors: [{ kind: 'prompt', count: 146438 }, { kind: 'ad', count: 45315 }, { kind: 'hint', count: 67605 }], travel: { backgroundProbes: 10, backgroundMappings: 20, backgroundCreatives: 15, hints: 336, hintVectors: 336 } };
  const corpus = createCachedCorpus({ query: async value => { sql = value; return source; } });
  const result = await corpus.inventory(); assert.equal(result.vectors.prompt, 146438); assert.equal(result.travel.hintVectors, 336); assert.equal(result.provenance.embeddingCalls, 0); assert(!JSON.stringify(result).includes('promptText'));
  assert(sql.includes('count(DISTINCT prompt_id)')); assert(!sql.includes('response_text'));
  source.travel.hintVectors = 337; await assert.rejects(corpus.inventory());
});
test('live opt-in: actual exact cached background prompt and missing text', { skip: process.env.AXP_CACHED_CORPUS_LIVE !== '1' }, async () => {
  const text = process.env.AXP_CACHED_CORPUS_TEST_TEXT; assert.equal(typeof text, 'string', 'Supply a reviewed public/background text through AXP_CACHED_CORPUS_TEST_TEXT');
  const corpus = createCachedCorpus(); const inventory = await corpus.inventory(); assert(inventory.vectors.prompt > 0);
  const result = await corpus.lookup(text, { limit: 2 }); assert.equal(result.status, 'ready'); assert(result.matches.length > 0); assert.equal(result.provenance.embeddingCalls, 0);
  const missing = await corpus.lookup('AXP deliberately absent cached travel probe '+Date.now(), { limit: 1 }); assert.equal(missing.status, 'query_vector_unavailable'); assert.deepEqual(missing.matches, []);
});
