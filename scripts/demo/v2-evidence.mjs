import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statfsSync, copyFileSync, constants, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, hash, textHash, vector } from '../../packages/ml/core.mjs';
import { DEFAULT_DIRECTORY, NICHE, NICHES, MODEL, DIMENSION, LIMITS, FIXED_QUESTIONS, promptHash, screenText, validateCatalogue, loadEvidence, EvidenceRetriever } from '../../packages/v2/evidence.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
// Only a text hash and coarse chosen niche leave classification; never its raw prompt.
const keySql = expression => String.raw`encode(sha256(convert_to(lower(regexp_replace(trim(${expression}), '\s+', ' ', 'g')), 'UTF8')), 'hex')`;
const safeSql = expression => String.raw`length(${expression}) BETWEEN 1 AND 2400
 AND ${expression} !~ '[<>]'
 AND ${expression} !~* '[[:alnum:]_.+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
 AND ${expression} !~* '(bearer[[:space:]]+[[:alnum:]_.-]{12,}|-----BEGIN .*PRIVATE KEY|\m(sk|ts)-[[:alnum:]_-]{16,})'
 AND ${expression} !~* '(pregnan[[:alpha:]]*|\m(hiv|religion|ethnicity|passport|ssn)\M|political affiliation|sexual orientation|medical diagnosis|race-based|my phone|my email|my address)'
 AND ${expression} !~* '(api[-_ ]?key|private[-_ ]?key|secret|password|seed phrase|recovery phrase|mnemonic)[[:space:]]*[:=]'
 AND ${expression} !~* '(0x[[:xdigit:]]{40,}|[[:alnum:]]{80,}|(javascript|data):|AKIA[A-Z0-9]{16})'
 AND ${expression} !~ '(\+?[[:digit:]][[:digit:] ()-]{8,}[[:digit:]])'`;

export function exportSql() {
  return String.raw`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '1s';
DO $$ BEGIN
 IF current_database() <> 'ads' OR current_setting('transaction_read_only') <> 'on' THEN
 RAISE EXCEPTION 'v2_evidence_source_guard'; END IF;
END $$;
WITH customer_hashes AS MATERIALIZED (
 SELECT gp.prompt_hash AS ref_hash FROM generated_prompts gp WHERE gp.request_id IS NOT NULL
 UNION SELECT ${keySql('gp.prompt')} FROM generated_prompts gp WHERE gp.request_id IS NOT NULL
), candidates AS MATERIALIZED (
 SELECT ap.id AS mapping_id, p.id AS prompt_id, p.prompt, ${keySql('p.prompt')} AS normalized_hash,
 a.id AS creative_id, a.content_hash, a.advertiser, trim(concat_ws(' ', a.advertiser, a.title, a.body)) AS creative_text,
 ap.source, ap.source_ref, p.niche_slug AS probe_niche, ap.niche_slug AS mapping_niche,
 p.status = 'ok' AS successful, ap.source IN ('aws','verseodin') AS allowed_source, ap.request_id IS NULL AS background,
 NOT EXISTS (SELECT 1 FROM customer_hashes ch WHERE ch.ref_hash = ${keySql('p.prompt')}) AS not_customer_generated,
 CASE WHEN ap.source = 'aws' THEN c.prompt_hash = ${keySql('c.prompt')}
   AND c.chosen_slug = ap.niche_slug AND c.method = 'llm' AND p.niche_slug IN (ap.niche_slug,'source-b')
 ELSE p.niche_slug = ap.niche_slug END AS classification_valid,
 c.prompt_hash AS classification_hash, ${keySql('c.prompt')} AS classification_text_hash, c.chosen_slug, c.method AS classification_method,
 (${safeSql('p.prompt')}) AND (${safeSql("trim(concat_ws(' ', a.advertiser, a.title, a.body))")})
   AND (${safeSql('a.advertiser')}) AND length(a.advertiser) <= 160 AS text_safe
 FROM ad_appearances ap JOIN probes p ON p.id = ap.probe_id JOIN ads a ON a.id = ap.ad_id
 LEFT JOIN source_b_classification c ON c.prompt_hash = ${keySql('p.prompt')}
 WHERE ap.niche_slug IN (${NICHES.map(n => `'${n}'`).join(',')})
 AND p.prompt ~* '(wallet|cold[[:space:]-]*storage|self[[:space:]-]*custody)'
), eligible AS MATERIALIZED (
 SELECT * FROM candidates WHERE successful AND allowed_source AND background AND not_customer_generated AND classification_valid AND text_safe
), prompt_keys AS MATERIALIZED (
 SELECT DISTINCT normalized_hash FROM eligible ORDER BY normalized_hash LIMIT ${LIMITS.normalizedPrompts}
), selected AS MATERIALIZED (
 SELECT e.* FROM eligible e JOIN prompt_keys k USING(normalized_hash) ORDER BY mapping_id LIMIT ${LIMITS.associations}
), selected_hints AS MATERIALIZED (
 SELECT a.creative_id, h.id AS hint_id, h.hint_text, coalesce(h.evidence->>'tier','unknown') AS tier, h.model_version
 FROM (SELECT DISTINCT creative_id, advertiser FROM selected) a
 JOIN LATERAL (
   SELECT h.* FROM inferred_context_hints h
   WHERE h.niche_slug IN (SELECT s.mapping_niche FROM selected s WHERE s.creative_id = a.creative_id) AND h.advertiser = a.advertiser
     AND jsonb_typeof(h.evidence->'adIds') = 'array' AND h.evidence->'adIds' @> jsonb_build_array(a.creative_id)
     AND coalesce(h.evidence->>'tier','unknown') IN ('sparse','holdout','loo','leave-one-out','unknown')
     AND (${safeSql('h.hint_text')}) AND (${safeSql('h.model_version')}) AND length(h.model_version) <= 160
   ORDER BY h.id DESC LIMIT 1
 ) h ON true
), records AS (
 SELECT json_build_object('id', 'ads:mapping:' || s.mapping_id, 'mappingId', s.mapping_id, 'promptId', s.prompt_id,
 'promptText', s.prompt, 'normalizedHash', s.normalized_hash, 'creativeId', s.creative_id,
 'creativeContentHash', s.content_hash, 'advertiser', s.advertiser, 'creativeText', s.creative_text,
 'hintIds', coalesce((SELECT json_agg('ads:hint:' || h.hint_id) FROM selected_hints h WHERE h.creative_id = s.creative_id), '[]'::json),
 'source', json_build_object('database', current_database(), 'source', s.source,
 'sourceRefHash', encode(sha256(convert_to(s.source_ref,'UTF8')),'hex'), 'probeNiche', s.probe_niche, 'mappingNiche', s.mapping_niche,
 'status', 'ok', 'requestAssociated', false, 'customerGenerated', false,
 'classification', CASE WHEN s.source = 'aws' THEN json_build_object('promptHash', s.classification_hash,
   'classificationTextHash', s.classification_text_hash, 'chosenSlug', s.chosen_slug, 'method', s.classification_method) ELSE NULL END)) AS record,
 s.mapping_id FROM selected s
), prompt_vectors AS (
 SELECT DISTINCT ON(e.ref_hash) e.id, e.ref_hash, e.vector
 FROM embeddings e JOIN (SELECT DISTINCT normalized_hash FROM selected) s ON s.normalized_hash=e.ref_hash
 WHERE e.kind='prompt' AND e.model='${MODEL}' AND e.dim=${DIMENSION} AND vector_dims(e.vector)=${DIMENSION}
 ORDER BY e.ref_hash,e.id
), query_vectors AS (
 SELECT DISTINCT ON(e.ref_hash) e.id,e.ref_hash,e.vector FROM embeddings e
 WHERE e.kind='prompt' AND e.model='${MODEL}' AND e.dim=${DIMENSION} AND vector_dims(e.vector)=${DIMENSION}
 AND e.ref_hash IN (${FIXED_QUESTIONS.map(q => `'${promptHash(q)}'`).join(',')}) ORDER BY e.ref_hash,e.id
)
SELECT json_build_object('database', current_database(), 'readOnly', current_setting('transaction_read_only')='on',
 'records', coalesce((SELECT json_agg(record ORDER BY mapping_id) FROM records),'[]'::json),
 'hints', coalesce((SELECT json_agg(x ORDER BY x."sourceHintId") FROM (
 SELECT 'ads:hint:' || hint_id AS id, hint_id AS "sourceHintId", hint_text AS text, tier, model_version AS "modelVersion",
 json_agg(creative_id ORDER BY creative_id) AS "supportingCreativeIds",
 CASE WHEN tier='sparse' THEN json_build_array('inferred_not_observed','sparse_hint') ELSE json_build_array('inferred_not_observed') END AS "qualityFlags"
 FROM selected_hints GROUP BY hint_id,hint_text,tier,model_version) x),'[]'::json),
 'vectors',coalesce((SELECT json_agg(json_build_object('embeddingId',id,'refHash',ref_hash,'vector',vector::text::json) ORDER BY ref_hash) FROM prompt_vectors),'[]'::json),
 'queryVectors',coalesce((SELECT json_agg(json_build_object('embeddingId',id,'refHash',ref_hash,'vector',vector::text::json) ORDER BY ref_hash) FROM query_vectors),'[]'::json),
 'inventory',json_build_object('candidateAssociations',(SELECT count(*) FROM candidates), 'eligibleAssociations',(SELECT count(*) FROM eligible),
 'eligibleNormalizedPrompts',(SELECT count(DISTINCT normalized_hash) FROM eligible),
 'failedProbes',(SELECT count(*) FROM candidates WHERE NOT successful),
 'unsupportedSource',(SELECT count(*) FROM candidates WHERE successful AND NOT allowed_source),
 'requestAssociated',(SELECT count(*) FROM candidates WHERE successful AND allowed_source AND NOT background),
 'customerGenerated',(SELECT count(*) FROM candidates WHERE successful AND allowed_source AND background AND NOT not_customer_generated),
 'invalidClassification',(SELECT count(*) FROM candidates WHERE successful AND allowed_source AND background AND not_customer_generated AND NOT coalesce(classification_valid,false)),
 'sqlUnsafeText',(SELECT count(*) FROM candidates WHERE successful AND allowed_source AND background AND not_customer_generated AND classification_valid AND NOT coalesce(text_safe,false)),
 'selectedAssociations',(SELECT count(*) FROM selected),
 'creativeCount',(SELECT count(DISTINCT creative_id) FROM selected), 'creativesWithoutScreenedHint',
 (SELECT count(DISTINCT creative_id) FROM selected) - (SELECT count(*) FROM selected_hints)));
ROLLBACK;`;
}

// Fixed local process, no environment/credentials/config reads, no connection override.
export function dockerRead(sql) {
  assert(sql === exportSql(), 'evidence_query_not_frozen');
  return new Promise((resolvePromise, reject) => {
    const child = execFile('docker', ['exec', '-i', 'adsdb', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'ads'], { encoding: 'utf8', timeout: 20000, maxBuffer: LIMITS.bytes }, (error, stdout) => {
      if (error) { reject(new Error('v2_evidence_source_read_failed')); return; }
      try { assert(Buffer.byteLength(stdout) <= LIMITS.bytes, 'evidence_output_limit'); resolvePromise(JSON.parse(stdout.trim())); }
      catch { reject(new Error('v2_evidence_source_response_invalid')); }
    });
    child.stdin.on('error', () => {}); child.stdin.end(sql);
  });
}
const seal = content => ({ ...content, contentHash: hash(content) });
const bytes = value => JSON.stringify(value, null, 2) + '\n';

export async function buildEvidence({ read = dockerRead, capturedAt = new Date().toISOString() } = {}) {
  const sql = exportSql(), data = await read(sql);
  assert(data.database === 'ads' && data.readOnly === true, 'evidence_source_invalid');
  assert(Array.isArray(data.records) && data.records.length <= LIMITS.associations && Array.isArray(data.hints) && data.hints.length <= LIMITS.associations, 'evidence_source_limit');
  const kept = [], rejected = [], safeHints = new Map();
  for (const r of data.records) {
    try { screenText(r.promptText); screenText(r.creativeText); screenText(r.advertiser, 160); }
    catch { rejected.push(r.mappingId); continue; }
    assert(promptHash(r.promptText) === r.normalizedHash, 'evidence_prompt_binding_invalid');
    kept.push({ ...r, hintIds: [] });
  }
  let omittedHints = 0;
  for (const h of data.hints) {
    try { screenText(h.text); screenText(h.modelVersion, 160); }
    catch { omittedHints++; continue; }
    const support = h.supportingCreativeIds.filter(id => kept.some(r => r.creativeId === id && data.records.find(x => x.mappingId === r.mappingId).hintIds.includes(h.id)));
    if (support.length) safeHints.set(h.id, { ...h, supportingCreativeIds: support });
  }
  for (const r of kept) r.hintIds = data.records.find(x => x.mappingId === r.mappingId).hintIds.filter(id => safeHints.has(id));
  const catalogue = validateCatalogue(seal({ schemaVersion: 'v2-evidence-catalogue.v1', niche: NICHE, records: kept, hints: [...safeHints.values()] }));
  const keys = new Set(kept.map(r => r.normalizedHash));
  assert(Array.isArray(data.vectors) && data.vectors.length <= LIMITS.normalizedPrompts && Array.isArray(data.queryVectors) && data.queryVectors.length <= 2, 'evidence_source_limit');
  let unusableVectors = 0;
  const compatible = rows => rows.filter(v => { try { vector(v.vector, DIMENSION); return true; } catch { unusableVectors++; return false; } });
  const vectors = compatible(data.vectors.filter(v => keys.has(v.refHash))), queryVectors = compatible(data.queryVectors);
  const index = seal({ schemaVersion: 'v2-evidence-index.v1', model: MODEL, dimension: DIMENSION, revision: 'unrecorded', normalization: 'legacy-python-lower-whitespace-sha256', catalogueHash: catalogue.contentHash, vectors, queryVectors });
  const counts = { associations: kept.length, normalizedPrompts: keys.size, probes: new Set(kept.map(r => r.promptId)).size, creatives: new Set(kept.map(r => r.creativeId)).size, hints: catalogue.hints.length, vectors: vectors.length, queryVectors: queryVectors.length, sources: Object.fromEntries(['aws','verseodin'].map(s => [s, kept.filter(r => r.source.source === s).length])) };
  const manifest = seal({ schemaVersion: 'v2-evidence-manifest.v1', snapshotId: `v2-wallet:${catalogue.contentHash.slice(0, 24)}`, capturedAt,
    source: { container: 'adsdb', database: 'ads', readOnly: true, transaction: 'repeatable-read-read-only-rollback', queryHash: textHash(sql), embeddingCalls: 0, observationWindow: null, embeddingRevision: 'unrecorded' },
    selection: { version: 'wallet-five-category-screened-v2.2', niches: NICHES, promptPattern: 'wallet|cold[space-or-hyphen]*storage|self[space-or-hyphen]*custody', limits: LIMITS, order: 'normalizedHash then mappingId; final mappingId', normalization: index.normalization, rawAssociationsPreserved: true, classifier: 'aws normalized prompt hash + classification text hash + chosen=current mapping niche + llm; verseodin native mapping niche' },
    counts, omissions: { ...data.inventory, cappedAssociations: data.inventory.eligibleAssociations - data.records.length, jsUnsafeAssociations: rejected.length, jsUnsafeHints: omittedHints, unusableVectors, promptsWithoutVector: keys.size - vectors.length, fixedQuestionsWithoutVector: FIXED_QUESTIONS.length - queryVectors.length },
    files: { 'catalogue.json': textHash(bytes(catalogue)), 'index.backend.json': textHash(bytes(index)) },
    limitations: ['Within the measured prompt panel; not all AI demand or real-world query volume.', 'Distinct source mappings remain raw associations, not impressions, conversions or independent fit labels. Retrieval ranks each normalized prompt once.', 'Historical brands are references, not enrolled bidders or declarations of fictional campaign capabilities.', 'Hints are inferred historical hypotheses, not advertiser configuration; sparse tier is retained.', 'No raw probes, answers, HTML, URLs, images, geo, customers, credentials or import-spread timestamps exported.', 'Model revision is unrecorded. Only existing matching BGE 768-D prompt vectors; no embedding generation or provider calls.', 'Vectors are backend-only. publicCatalogue and retrieval/model packets never return vectors.', 'Exact cached text uses vector cosine; authored uncached text uses labelled lexical fallback. No training, targeting accuracy or causal-lift claim.'] });
  assert(Buffer.byteLength(bytes(manifest)) + Buffer.byteLength(bytes(catalogue)) + Buffer.byteLength(bytes(index)) <= LIMITS.bytes, 'evidence_output_limit');
  new EvidenceRetriever({manifest,catalogue,index}); // Validate the entire artifact before writing.
  return { manifest, catalogue, index };
}

async function main() {
  const flags = process.argv.slice(2); assert(flags.length <= 1 && flags.every(x => ['--verify-only','--refresh-approved'].includes(x)), 'evidence_option_invalid');
  if (!flags.includes('--verify-only') && (!existsSync(DEFAULT_DIRECTORY) || flags.includes('--refresh-approved'))) {
    const disk = statfsSync(ROOT); assert(disk.bavail * disk.bsize >= 40 * 1024 ** 3, 'evidence_disk_floor');
    const built = await buildEvidence();
    mkdirSync(DEFAULT_DIRECTORY, { recursive: true });
    if (existsSync(resolve(DEFAULT_DIRECTORY,'manifest.json'))) {
      const prior = loadEvidence(), archive = resolve(DEFAULT_DIRECTORY,'archive',prior.manifest.snapshotId.replace(':','-'));
      if (!existsSync(archive)) {
        mkdirSync(archive,{recursive:true});
        for (const name of ['catalogue.json','index.backend.json','manifest.json']) copyFileSync(resolve(DEFAULT_DIRECTORY,name),resolve(archive,name),constants.COPYFILE_EXCL);
      }
      assert(loadEvidence({directory:archive}).manifest.contentHash === prior.manifest.contentHash,'evidence_archive_mismatch');
    }
    const staging = resolve(DEFAULT_DIRECTORY,`staging-${built.catalogue.contentHash.slice(0,24)}`); mkdirSync(staging,{recursive:true});
    for (const [name, value] of [['catalogue.json', built.catalogue], ['index.backend.json', built.index], ['manifest.json', built.manifest]]) writeFileSync(resolve(staging, name), bytes(value), { flag: 'wx', mode: name === 'index.backend.json' ? 0o600 : 0o644 });
    loadEvidence({directory:staging});
    for (const name of ['catalogue.json','index.backend.json','manifest.json']) renameSync(resolve(staging,name),resolve(DEFAULT_DIRECTORY,name));
  }
  const retriever = loadEvidence();
  console.log(JSON.stringify({ directory: DEFAULT_DIRECTORY, snapshotId: retriever.manifest.snapshotId, counts: retriever.manifest.counts, omissions: retriever.manifest.omissions, sourceHash: retriever.publicCatalogue().contentHash }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
