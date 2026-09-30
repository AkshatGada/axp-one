import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { assert, safeText } from '../../packages/ml/core.mjs';
import { createCachedCorpus } from '../../packages/ml/data_adapter/cached-corpus.mjs';

// Only an optional text argument. No DB/SQL/config/secret/file-output interface.
const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 2 && args[0] === '--text', 'argument_invalid');
async function existingBackgroundExample() {
  const sql = String.raw`BEGIN READ ONLY; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='1s';
SELECT json_build_object('promptId',p.id,'text',p.prompt) FROM probes p
JOIN embeddings e ON e.kind='prompt' AND e.model='BAAI/bge-base-en-v1.5' AND e.dim=768
  AND e.ref_hash=encode(sha256(convert_to(regexp_replace(lower(btrim(p.prompt)), '\s+', ' ', 'g'), 'UTF8')), 'hex')
WHERE p.niche_slug='travel-hospitality' AND p.status='ok' AND length(p.prompt) BETWEEN 1 AND 2400
  AND p.prompt !~* '[[:alnum:]_.+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
  AND NOT EXISTS(SELECT 1 FROM generated_prompts gp WHERE gp.request_id IS NOT NULL AND
    (gp.prompt=p.prompt OR gp.prompt_hash=e.ref_hash))
  AND EXISTS(SELECT 1 FROM ad_appearances ap JOIN ads a ON a.id=ap.ad_id
    JOIN inferred_context_hints h ON h.niche_slug='travel-hospitality'
      AND h.evidence->'adIds' @> jsonb_build_array(a.id)
    WHERE ap.probe_id=p.id AND ap.niche_slug='travel-hospitality'
      AND ap.request_id IS NULL AND ap.source IN ('aws','verseodin'))
ORDER BY p.id LIMIT 1;
ROLLBACK;`;
  return new Promise((resolve, reject) => {
    execFile('docker', ['exec', 'adsdb', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'ads', '-c', sql], { encoding: 'utf8', timeout: 12000, maxBuffer: 16384 }, (error, stdout) => {
      if (error) { reject(new Error('background_example_unavailable')); return; }
      try { const result = JSON.parse(stdout.trim()); safeText(result.text, 2400); resolve(result); }
      catch { reject(new Error('background_example_unavailable')); }
    });
  });
}
const example = args.length ? { promptId: null, text: args[1] } : await existingBackgroundExample();
const corpus = createCachedCorpus();
const inventory = await corpus.inventory();
const hit = await corpus.lookup(example.text, { limit: 2 });
assert(hit.status === 'ready' && hit.matches.length > 0, 'cached_example_unavailable');
const miss = await corpus.lookup('AXP deliberately uncached travel fixture '+randomUUID(), { limit: 1 });
assert(miss.status === 'query_vector_unavailable' && miss.matches.length === 0, 'cache_miss_check_failed');
// Aggregate/ID summary only. No text, vector array or corpus file is printed/saved.
console.log(JSON.stringify({
  schemaVersion: 'cached-corpus-demo.v1', inventory,
  cached: { status: hit.status, sourcePromptId: example.promptId, queryTextHash: hit.provenance.queryTextHash, queryVectorId: hit.provenance.queryVectorId, matches: hit.matches.map(p => ({ promptId: p.promptId, similarity: p.similarity, mappingCount: p.mappings.length, hints: p.mappings.map(m => m.hint === null ? null : { id: m.hint.id, tier: m.hint.tier }) })), sourceVectorCount: hit.provenance.sourceVectors.length, qualityFlags: hit.provenance.qualityFlags },
  missing: { status: miss.status, queryTextHash: miss.provenance.queryTextHash, queryVectorId: miss.provenance.queryVectorId, matchCount: miss.matches.length },
  readOnly: true, embeddingCalls: 0, databaseWrites: 0, corpusFilesWritten: 0,
}, null, 2));
