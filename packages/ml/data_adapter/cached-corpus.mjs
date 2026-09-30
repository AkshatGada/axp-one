import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assert, object, safeText, freeze } from '../core.mjs';

const MODEL = 'BAAI/bge-base-en-v1.5';
const DIMENSION = 768;
const TIMEOUT_MS = 12000;
const MAX_BUFFER = 256 * 1024;
const CATEGORY = 'travel-hospitality';
const sha = text => createHash('sha256').update(text).digest('hex');
// This is the legacy embed.py key, deliberately separate from the newer curator's folding.
function legacyNormalize(text) {
  // Python's Unicode whitespace differs from JavaScript's for NEL and BOM.
  return text.toLowerCase().replace(/[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ' ').replace(/^ +| +$/gu, '');
}
const legacyHashSql = expression => String.raw`encode(sha256(convert_to(regexp_replace(lower(btrim(${expression})), '\s+', ' ', 'g'), 'UTF8')), 'hex')`;
function screened(text) {
  try {
    safeText(text, 2400);
    assert(!/\b(pregnan\w*|hiv|religion|political affiliation|sexual orientation|medical diagnosis|race-based|ethnicity|passport|ssn|my phone|my email|my address)\b/iu.test(text), 'sensitive_content');
    return text.trim().length > 0;
  } catch { return false; }
}
const safeSql = expression => String.raw`length(${expression}) BETWEEN 1 AND 2400
  AND ${expression} !~* '[[:alnum:]_.+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
  AND ${expression} !~* '(bearer[[:space:]]+[[:alnum:]_.-]{12,}|-----BEGIN .*PRIVATE KEY|\m(sk|ts)-[[:alnum:]_-]{16,})'
  AND ${expression} !~* '(pregnan[[:alpha:]]*|\m(hiv|religion|ethnicity|passport|ssn)\M|political affiliation|sexual orientation|medical diagnosis|race-based|my phone|my email|my address)'`;
const background = p => `p.niche_slug = '${CATEGORY}' AND p.status = 'ok'
  AND NOT EXISTS (SELECT 1 FROM generated_prompts gp WHERE gp.request_id IS NOT NULL
    AND (gp.prompt = ${p}.prompt OR gp.prompt_hash = ${legacyHashSql(p+'.prompt')}))`;
const transaction = body => `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '8s';
SET LOCAL lock_timeout = '1s';
${body}
ROLLBACK;`;

// Fixed local process and database. No shell, environment/config loader, SQL or DB API is exported.
function dockerQuery(sql, { signal }) {
  assert(sql.length <= 65536, 'query_limit');
  return new Promise((resolve, reject) => {
    const child = execFile('docker', ['exec', '-i', 'adsdb', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'ads'], {
      encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, signal,
    }, (error, stdout) => {
      if (error) { reject(new Error(signal.aborted ? 'lookup_aborted' : 'corpus_query_failed')); return; }
      try { assert(Buffer.byteLength(stdout) <= MAX_BUFFER, 'query_output_limit'); resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error('corpus_response_invalid')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(sql);
  });
}
function lookupSql(queryHash, limit) {
  // Hash comes only from SHA256(text); count is an integer1..5. Neither can inject SQL.
  assert(/^[a-f0-9]{64}$/u.test(queryHash) && Number.isInteger(limit) && limit >= 1 && limit <= 5);
  return transaction(`WITH query_vector AS MATERIALIZED (
  SELECT id, vector FROM embeddings
  WHERE kind = 'prompt' AND ref_hash = '${queryHash}' AND model = '${MODEL}' AND dim = ${DIMENSION}
    AND vector_dims(vector) = ${DIMENSION}
  ORDER BY id LIMIT 1
), neighbors AS MATERIALIZED (
  SELECT p.id AS prompt_id, p.prompt AS prompt_text, pe.id AS prompt_vector_id,
    1 - (pe.vector <=> q.vector) AS similarity
  FROM probes p
  JOIN embeddings pe ON pe.kind = 'prompt' AND pe.ref_hash = ${legacyHashSql('p.prompt')}
    AND pe.model = '${MODEL}' AND pe.dim = ${DIMENSION} AND vector_dims(pe.vector) = ${DIMENSION}
  CROSS JOIN query_vector q
  WHERE ${background('p')} AND ${safeSql('p.prompt')}
    AND EXISTS (SELECT 1 FROM ad_appearances ap WHERE ap.probe_id = p.id
      AND ap.niche_slug = '${CATEGORY}' AND ap.request_id IS NULL AND ap.source IN ('aws', 'verseodin'))
  ORDER BY pe.vector <=> q.vector, p.id LIMIT ${limit}
), matches AS (
  SELECT n.prompt_id AS "promptId", n.prompt_text AS "promptText", n.prompt_vector_id AS "promptVectorId", n.similarity,
    coalesce((SELECT json_agg(mapped ORDER BY mapped."creativeId", mapped."mappingId") FROM (
      SELECT DISTINCT ON (a.id) ap.id AS "mappingId", a.id AS "creativeId", a.advertiser,
        trim(concat_ws(' ', a.advertiser, a.title, a.body)) AS "creativeText", ae.id AS "creativeVectorId",
        (SELECT row_to_json(hinted) FROM (
          SELECT h.id, h.hint_text AS text, coalesce(h.evidence->>'tier', 'unknown') AS tier,
            h.model_version AS "modelVersion", h.reconstruction_auc AS "reconstructionAuc",
            a.id AS "supportingCreativeId", he.id AS "hintVectorId"
          FROM inferred_context_hints h
          JOIN embeddings he ON he.kind = 'hint' AND he.ref_hash = ${legacyHashSql('h.hint_text')}
            AND he.model = '${MODEL}' AND he.dim = ${DIMENSION} AND vector_dims(he.vector) = ${DIMENSION}
          WHERE h.niche_slug = '${CATEGORY}' AND jsonb_typeof(h.evidence->'adIds') = 'array'
            AND h.evidence->'adIds' @> jsonb_build_array(a.id)
            AND ${safeSql('h.hint_text')}
          ORDER BY h.generated_at DESC NULLS LAST, h.id DESC LIMIT 1
        ) hinted) AS hint
      FROM ad_appearances ap JOIN ads a ON a.id = ap.ad_id
      LEFT JOIN embeddings ae ON ae.kind = 'ad' AND ae.ref_hash = a.content_hash
        AND ae.model = '${MODEL}' AND ae.dim = ${DIMENSION} AND vector_dims(ae.vector) = ${DIMENSION}
      WHERE ap.probe_id = n.prompt_id AND ap.niche_slug = '${CATEGORY}'
        AND ap.request_id IS NULL AND ap.source IN ('aws', 'verseodin')
        AND ${safeSql("trim(concat_ws(' ', a.advertiser, a.title, a.body))")}
        AND ${safeSql('a.advertiser')}
      ORDER BY a.id, ap.id LIMIT 3
    ) mapped), '[]'::json) AS mappings
  FROM neighbors n
)
SELECT json_build_object('database', current_database(), 'readOnly', current_setting('transaction_read_only') = 'on',
  'model', '${MODEL}', 'dimension', ${DIMENSION}, 'queryTextHash', '${queryHash}',
  'queryVectorId', (SELECT id FROM query_vector),
  'matches', coalesce((SELECT json_agg(matches ORDER BY similarity DESC, "promptId") FROM matches), '[]'::json));`);
}
function inventorySql() {
  return transaction(`WITH background_mappings AS MATERIALIZED (
  SELECT p.id AS prompt_id, ap.id AS mapping_id, ap.ad_id AS creative_id
  FROM probes p JOIN ad_appearances ap ON ap.probe_id = p.id
  WHERE ${background('p')} AND ap.niche_slug = '${CATEGORY}'
    AND ap.request_id IS NULL AND ap.source IN ('aws', 'verseodin')
), travel_hints AS MATERIALIZED (
  SELECT h.id, EXISTS (SELECT 1 FROM embeddings e WHERE e.kind = 'hint' AND e.ref_hash = ${legacyHashSql('h.hint_text')}
    AND e.model = '${MODEL}' AND e.dim = ${DIMENSION}) AS has_vector
  FROM inferred_context_hints h WHERE h.niche_slug = '${CATEGORY}'
)
SELECT json_build_object('database', current_database(), 'readOnly', current_setting('transaction_read_only') = 'on',
  'model', '${MODEL}', 'dimension', ${DIMENSION},
  'vectors', (SELECT coalesce(json_agg(x), '[]'::json) FROM (
    SELECT kind, count(*) AS count FROM embeddings WHERE model = '${MODEL}' AND dim = ${DIMENSION}
      AND kind IN ('prompt', 'ad', 'hint') GROUP BY kind ORDER BY kind) x),
  'travel', json_build_object('backgroundProbes', (SELECT count(DISTINCT prompt_id) FROM background_mappings),
    'backgroundMappings', (SELECT count(*) FROM background_mappings),
    'backgroundCreatives', (SELECT count(DISTINCT creative_id) FROM background_mappings),
    'hints', (SELECT count(*) FROM travel_hints), 'hintVectors', (SELECT count(*) FROM travel_hints WHERE has_vector)));`);
}
function sourceId(value, nullable = false) { assert(nullable && value === null || Number.isSafeInteger(value) && value > 0, 'corpus_response_invalid'); }
function envelope(data, fields) {
  object(data, fields);
  assert(data.database === 'ads' && data.readOnly === true && data.model === MODEL && data.dimension === DIMENSION, 'corpus_source_invalid');
}
function project(data, queryHash, limit) {
  envelope(data, ['database', 'readOnly', 'model', 'dimension', 'queryTextHash', 'queryVectorId', 'matches']);
  assert(data.queryTextHash === queryHash, 'query_binding_invalid'); sourceId(data.queryVectorId, true);
  assert(Array.isArray(data.matches) && data.matches.length <= limit, 'corpus_response_invalid');
  assert(data.queryVectorId !== null || data.matches.length === 0, 'corpus_response_invalid');
  const matches = [], sourceVectors = [], seenPrompts = new Set(), flags = new Set(['association_not_fit_label', 'revision_unrecorded']);
  const addVector = (kind, entityId, vectorId) => {
    sourceId(vectorId, true);
    if (vectorId !== null && !sourceVectors.some(v => v.kind === kind && v.entityId === entityId && v.vectorId === vectorId)) sourceVectors.push({ kind, entityId, vectorId, model: MODEL, dimension: DIMENSION, revision: 'unrecorded' });
  };
  let screenedPrompts = 0, screenedMappings = 0, screenedHints = 0;
  for (const p of data.matches) {
    object(p, ['promptId', 'promptText', 'promptVectorId', 'similarity', 'mappings']); sourceId(p.promptId); sourceId(p.promptVectorId);
    assert(!seenPrompts.has(p.promptId), 'duplicate_prompt'); seenPrompts.add(p.promptId);
    assert(Number.isFinite(p.similarity) && p.similarity >= -1.000001 && p.similarity <= 1.000001, 'corpus_response_invalid');
    assert(Array.isArray(p.mappings) && p.mappings.length <= 3, 'corpus_response_invalid');
    if (!screened(p.promptText)) { screenedPrompts++; continue; }
    const mappings = [], seenCreatives = new Set();
    for (const m of p.mappings) {
      object(m, ['mappingId', 'creativeId', 'advertiser', 'creativeText', 'creativeVectorId', 'hint']); sourceId(m.mappingId); sourceId(m.creativeId); sourceId(m.creativeVectorId, true);
      assert(!seenCreatives.has(m.creativeId), 'duplicate_creative'); seenCreatives.add(m.creativeId);
      if (!screened(m.advertiser) || !screened(m.creativeText)) { screenedMappings++; continue; }
      let hint = null;
      if (m.hint !== null) {
        const h = m.hint;
        object(h, ['id', 'text', 'tier', 'modelVersion', 'reconstructionAuc', 'supportingCreativeId', 'hintVectorId']);
        sourceId(h.id); sourceId(h.supportingCreativeId); sourceId(h.hintVectorId);
        assert(['sparse', 'holdout', 'loo', 'leave-one-out', 'unknown'].includes(h.tier), 'hint_tier_invalid');
        assert(h.reconstructionAuc === null || Number.isFinite(h.reconstructionAuc) && h.reconstructionAuc >= 0 && h.reconstructionAuc <= 1, 'corpus_response_invalid');
        if (h.supportingCreativeId === m.creativeId && screened(h.text) && screened(h.modelVersion)) {
          hint = { id: h.id, text: h.text, tier: h.tier, modelVersion: h.modelVersion, reconstructionAuc: h.reconstructionAuc };
          addVector('hint', h.id, h.hintVectorId); flags.add('inferred_not_fit_groundtruth'); if (h.tier === 'sparse') flags.add('sparse_hint');
        } else screenedHints++;
      }
      mappings.push({ mappingId: m.mappingId, creativeId: m.creativeId, advertiser: m.advertiser, creativeText: m.creativeText, hint });
      addVector('ad', m.creativeId, m.creativeVectorId);
    }
    if (!mappings.length) continue;
    addVector('prompt', p.promptId, p.promptVectorId);
    matches.push({ promptId: p.promptId, promptText: p.promptText, similarity: Math.max(-1, Math.min(1, p.similarity)), mappings });
  }
  matches.sort((a, b) => b.similarity-a.similarity || a.promptId-b.promptId);
  sourceVectors.sort((a, b) => a.kind.localeCompare(b.kind) || a.entityId-b.entityId || a.vectorId-b.vectorId);
  return freeze({ schemaVersion: 'cached-corpus-result.v1', status: data.queryVectorId === null ? 'query_vector_unavailable' : 'ready', provenance: {
    database: 'ads', readOnly: true, model: MODEL, dimension: DIMENSION, revision: 'unrecorded', queryVectorId: data.queryVectorId, queryTextHash: queryHash,
    normalization: 'legacy-lower-trim-whitespace-sha256', category: CATEGORY, sourceVectors, qualityFlags: [...flags].sort(),
    screening: { omittedPrompts: screenedPrompts, omittedMappings: screenedMappings, omittedHints: screenedHints },
    requestedLimit: limit, mappingLimitPerPrompt: 3, statementTimeoutMs: 8000, processTimeoutMs: TIMEOUT_MS,
    embeddingCalls: 0, fallback: null,
  }, matches });
}

/** Public methods are only lookup and aggregate inventory. query is a trusted test seam. */
export function createCachedCorpus(options = {}) {
  object(options, ['query'], []);
  const query = options.query ?? dockerQuery; assert(typeof query === 'function', 'query_adapter_invalid');
  async function run(sql, signal) {
    if (signal !== undefined) assert(signal instanceof AbortSignal, 'signal_invalid');
    if (signal?.aborted) throw new Error('lookup_aborted');
    const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS);
    let abort;
    try {
      return await Promise.race([
        Promise.resolve().then(() => query(sql, { signal: bounded })),
        new Promise((_, reject) => { abort = () => reject(new Error('lookup_aborted')); bounded.addEventListener('abort', abort, { once: true }); }),
      ]);
    }
    catch { throw new Error(bounded.aborted ? 'lookup_aborted' : 'corpus_query_failed'); }
    finally { bounded.removeEventListener('abort', abort); }
  }
  return freeze({
    async lookup(text, options = {}) {
      object(options, ['limit', 'signal'], []); const { limit = 5, signal } = options;
      assert(Number.isInteger(limit) && limit >= 1 && limit <= 5, 'limit_invalid'); assert(screened(text), 'query_text_rejected');
      const queryHash = sha(legacyNormalize(text));
      return project(await run(lookupSql(queryHash, limit), signal), queryHash, limit);
    },
    async inventory() {
      const data = await run(inventorySql()); envelope(data, ['database', 'readOnly', 'model', 'dimension', 'vectors', 'travel']);
      assert(Array.isArray(data.vectors) && data.vectors.length <= 3, 'corpus_response_invalid');
      const vectors = { prompt: 0, ad: 0, hint: 0 }, seen = new Set();
      for (const v of data.vectors) { object(v, ['kind', 'count']); assert(Object.hasOwn(vectors, v.kind) && !seen.has(v.kind) && Number.isSafeInteger(v.count) && v.count >= 0, 'corpus_response_invalid'); seen.add(v.kind); vectors[v.kind] = v.count; }
      object(data.travel, ['backgroundProbes', 'backgroundMappings', 'backgroundCreatives', 'hints', 'hintVectors']);
      assert(Object.values(data.travel).every(n => Number.isSafeInteger(n) && n >= 0) && data.travel.hintVectors <= data.travel.hints, 'corpus_response_invalid');
      return freeze({ schemaVersion: 'cached-corpus-inventory.v1', provenance: { database: 'ads', readOnly: true, model: MODEL, dimension: DIMENSION, revision: 'unrecorded', category: CATEGORY, embeddingCalls: 0 }, vectors, travel: structuredClone(data.travel) });
    },
  });
}
