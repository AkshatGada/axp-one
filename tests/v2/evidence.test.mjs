import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash, textHash, cosine } from '../../packages/ml/core.mjs';
import { validateProfile } from '../../packages/ml/engines/contract.mjs';
import { EvidenceRetriever, loadEvidence, DEFAULT_DIRECTORY, MODEL, DIMENSION, NICHE, LIMITS, FIXED_QUESTIONS, promptHash, legacyNormalize, productKind, validateCatalogue } from '../../packages/v2/evidence.mjs';
import { exportSql, buildEvidence, dockerRead } from '../../scripts/demo/v2-evidence.mjs';

const seal = content => ({ ...content, contentHash: hash(content) });
const encoding = value => JSON.stringify(value, null, 2) + '\n';
const unit = (i = 0, j = null) => Array.from({ length: DIMENSION }, (_, n) => n === i ? 1 : n === j ? 0.5 : 0);
function campaign(kind = 'hardware') {
  const capabilities = { hardware: ['crypto_storage','hardware_wallet','offline_key_storage','ethereum','solana'], mobile: ['crypto_storage','mobile_software_wallet','ethereum','solana'], physical: ['physical_wallet','rfid_blocking'], unknown: [] }[kind];
  return { campaignId: `test-${kind}`, campaignVersionId: `test-${kind}-1`, advertiserId: `test-${kind}-adv`, allowedIntents: ['crypto_wallet_tools'], declaredConstraints: { requiredCapabilities: capabilities }, creatives: [{ creativeVersionId: `test-${kind}-creative`, approvedText: `Fictional ${kind} wallet. Only the listed declared capabilities apply.`, softFitTags: capabilities, evidenceFieldIds: ['declaredConstraints'] }], softFitTags: capabilities };
}
function fixture() {
  const copy = { hardware: 'Example hardware wallet for offline key storage.', mobile: 'Example mobile software crypto wallet.', physical: 'Example physical RFID leather wallet for cards.' };
  const records = Array.from({ length: 9 }, (_, i) => {
    const kind = ['hardware', 'mobile', 'physical'][i % 3], promptText = i ? `Compare Ethereum and Solana wallet options ${i}` : FIXED_QUESTIONS[0], normalizedHash = promptHash(promptText);
    return { id: `ads:mapping:${i+1}`, mappingId: i+1, promptId: i+10, promptText, normalizedHash, creativeId: i+100, creativeContentHash: `sha256:${textHash(copy[kind]+i)}`, advertiser: `Historical reference ${i}`, creativeText: copy[kind], hintIds: [`ads:hint:${i+200}`], source: { database: 'ads', source: i % 2 ? 'aws' : 'verseodin', sourceRefHash: textHash(`source-ref-${i}`), probeNiche: NICHE, mappingNiche: NICHE, status: 'ok', requestAssociated: false, customerGenerated: false, classification: i % 2 ? { promptHash: normalizedHash, classificationTextHash: normalizedHash, chosenSlug: NICHE, method: 'llm' } : null } };
  });
  const hints = records.map((r, i) => ({ id: r.hintIds[0], sourceHintId: i+200, text: `Audience comparing ${copy[['hardware','mobile','physical'][i % 3]]}`, tier: 'sparse', modelVersion: 'MiniMax-M3@v1', supportingCreativeIds: [r.creativeId], qualityFlags: ['inferred_not_observed','sparse_hint'] }));
  const catalogue = seal({ schemaVersion: 'v2-evidence-catalogue.v1', niche: NICHE, records, hints });
  const vectors = records.map((r, i) => ({ embeddingId: i+300, refHash: r.normalizedHash, vector: unit(0, i+1) }));
  const index = seal({ schemaVersion: 'v2-evidence-index.v1', model: MODEL, dimension: DIMENSION, revision: 'unrecorded', normalization: 'legacy-python-lower-whitespace-sha256', catalogueHash: catalogue.contentHash, vectors, queryVectors: [vectors[0]] });
  const manifest = seal({ schemaVersion: 'v2-evidence-manifest.v1', snapshotId: 'fixture-wallet-1', capturedAt: '2026-10-01T00:00:00.000Z', source: { container: 'adsdb', database: 'ads', readOnly: true, embeddingCalls: 0 }, selection: {}, counts: { associations: records.length, normalizedPrompts: records.length, creatives: records.length, hints: hints.length, vectors: vectors.length, queryVectors: 1 }, omissions: {}, files: { 'catalogue.json': textHash(encoding(catalogue)), 'index.backend.json': textHash(encoding(index)) }, limitations: ['Synthetic fixture, not real source evidence.'] });
  return { catalogue, index, manifest };
}
function reseal(f) {
  f.catalogue = seal(Object.fromEntries(Object.entries(f.catalogue).filter(([k]) => k !== 'contentHash')));
  f.index.catalogueHash = f.catalogue.contentHash; f.index = seal(Object.fromEntries(Object.entries(f.index).filter(([k]) => k !== 'contentHash')));
  return f;
}
function writeFixture(f) {
  const directory = mkdtempSync(join(tmpdir(), 'v2-evidence-test-'));
  f.manifest.files = { 'catalogue.json': textHash(encoding(f.catalogue)), 'index.backend.json': textHash(encoding(f.index)) };
  f.manifest = seal(Object.fromEntries(Object.entries(f.manifest).filter(([k]) => k !== 'contentHash')));
  for (const [name, value] of [['catalogue.json', f.catalogue], ['index.backend.json', f.index], ['manifest.json', f.manifest]]) writeFileSync(join(directory, name), encoding(value));
  return directory;
}

test('legacy source hashing does not substitute Unicode family normalization', () => {
  assert.equal(promptHash('  ETHEREUM\tand\nSolana  '), promptHash('ethereum and solana'));
  assert.equal(legacyNormalize('\u0085ETH\u3000SOL\u0085'), 'eth sol');
  assert.notEqual(promptHash('Ａ wallet'), promptHash('A wallet'));
  assert.equal(promptHash(FIXED_QUESTIONS[0]), '3acee553405385dd7038c413d23bfee0cbbc77d43e6ba76b29cc99b8c4170778');
});
test('export transport is fixed read-only, guarded, bounded, and projects no raw probe artifacts', () => {
  const sql = exportSql();
  assert.match(sql, /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/u);
  assert.match(sql, /current_database\(\) <> 'ads'/u); assert.match(sql, /ROLLBACK;/u);
  assert.match(sql, /LIMIT 512/u); assert.match(sql, /LIMIT 1500/u);
  assert.match(sql, /gp.request_id IS NOT NULL/u); assert.match(sql, /gp.prompt_hash/u);
  assert.match(sql, /c.prompt_hash = encode\(sha256/u); assert.match(sql, /c.chosen_slug = ap.niche_slug/u);
  assert.match(sql, /web3-infrastructure/u); assert.match(sql, /privacy-preserving-blockchains-zk-compliance/u);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|CREATE|COPY|ALTER|COMMIT)\b/iu);
  assert.doesNotMatch(sql, /response_text|html_path|target_url|image_url|scraped_at|appeared_at/u);
  assert.throws(() => dockerRead('SELECT 1'), /query_not_frozen/u);
});
test('classification chosen niche and both normalized hashes fail closed', () => {
  for (const change of [r => r.source.classification.chosenSlug = 'crypto-investing', r => r.source.classification.classificationTextHash = textHash('wrong'), r => r.normalizedHash = textHash('wrong'), r => r.source.classification = null]) {
    const f = fixture(); change(f.catalogue.records[1]); reseal(f);
    assert.throws(() => validateCatalogue(f.catalogue));
  }
  const f = fixture(); f.catalogue.records[1].source.probeNiche = 'source-b'; reseal(f); assert.doesNotThrow(() => validateCatalogue(f.catalogue));
  const g = fixture(); g.catalogue.records[1].source.mappingNiche = 'crypto-investing'; g.catalogue.records[1].source.probeNiche = 'source-b'; g.catalogue.records[1].source.classification.chosenSlug = 'crypto-investing'; reseal(g);
  assert.doesNotThrow(() => validateCatalogue(g.catalogue));
});
test('failed, customer-generated, request-associated and wrong-source records are rejected', () => {
  for (const [field, value] of [['status','failed'], ['customerGenerated',true], ['requestAssociated',true], ['source','private'], ['database','agentic_web_dev']]) {
    const f = fixture(); f.catalogue.records[0].source[field] = value; reseal(f); assert.throws(() => validateCatalogue(f.catalogue));
  }
});
test('public projection rejects unsafe copy and forbidden raw fields', () => {
  for (const change of [r => r.promptText = 'My email is human@example.com', r => r.creativeText = '<script>execute()</script>', r => r.responseText = 'raw answer', r => r.promptText = 'seed phrase: words go here', r => r.promptText = 'my phone 12345678901']) {
    const f = fixture(); change(f.catalogue.records[0]); reseal(f); assert.throws(() => validateCatalogue(f.catalogue));
  }
});
test('offline vector cosine uses exact query and returns at most five distinct neighbors', () => {
  const f = fixture(), r = new EvidenceRetriever(f), x = r.retrieve(FIXED_QUESTIONS[0], campaign());
  assert.equal(x.method, 'vector'); assert.equal(x.fallback, false); assert.equal(x.queryVectorId, 300);
  assert.ok(x.neighborCount > 0 && x.neighborCount <= 5); assert.equal(new Set(x.neighbors.map(n => n.normalizedHash)).size, x.neighborCount);
  assert.equal(x.neighbors[0].similarity, cosine(f.index.vectors[0].vector, f.index.vectors[0].vector));
  assert.ok(x.examples.length > 0); validateProfile(x.profile, campaign());
});
test('uncached authored tasks use lexical fallback, unrelated tasks remain unavailable', () => {
  const r = new EvidenceRetriever(fixture()), c = campaign();
  const x = r.retrieve(FIXED_QUESTIONS[1], c); assert.equal(x.method, 'lexical_fallback'); assert.equal(x.fallback, true); assert.equal(x.queryVectorId, null); validateProfile(x.profile, c);
  const y = r.retrieve('Giraffes juggling balloons', c); assert.equal(y.method, 'unavailable'); assert.equal(y.profile.historyStatus, 'unavailable'); assert.equal(y.examples.length, 0);
});
test('raw repeated associations remain but cannot multiply scores, neighbors, or packet examples', () => {
  const f = fixture(), before = new EvidenceRetriever(f).retrieve(FIXED_QUESTIONS[0], campaign());
  const dup = structuredClone(f.catalogue.records[0]); dup.mappingId = 999; dup.id = 'ads:mapping:999'; dup.promptId = 999; dup.source.sourceRefHash = textHash('another-source'); f.catalogue.records.push(dup); reseal(f);
  const r = new EvidenceRetriever(f), after = r.retrieve(FIXED_QUESTIONS[0], campaign());
  assert.equal(r.publicCatalogue().records.length, 10); assert.deepEqual(after.neighbors.map(n => [n.normalizedHash,n.similarity]), before.neighbors.map(n => [n.normalizedHash,n.similarity]));
  assert.deepEqual(after.profile.observedExamples, before.profile.observedExamples);
  assert.deepEqual(after.profile.inferredHints, before.profile.inferredHints);
  assert.notEqual(after.profile.snapshotContentHash, before.profile.snapshotContentHash); // Raw provenance changes the snapshot, not scores.
});
test('duplicate mapping IDs and inconsistent source entity identities are rejected', () => {
  for (const change of [f => f.catalogue.records.push(structuredClone(f.catalogue.records[0])), f => { f.catalogue.records[1].promptId = f.catalogue.records[0].promptId; }, f => { f.catalogue.records[1].creativeId = f.catalogue.records[0].creativeId; }]) {
    const f = fixture(); change(f); reseal(f); assert.throws(() => validateCatalogue(f.catalogue));
  }
});
test('compact profiles are bound to the own ML DTO including appended context hint', () => {
  const r = new EvidenceRetriever(fixture()), c = campaign(); c.creatives[0].approvedText += ' Context hint: offline storage comparison.';
  const x = r.retrieve(FIXED_QUESTIONS[0], c); assert.equal(x.profile.campaignContentHash, hash(c)); validateProfile(x.profile,c);
  assert.ok(x.profile.observedExamples.length <= 3 && x.profile.inferredHints.length <= 2);
  assert.ok([...x.profile.observedExamples,...x.profile.inferredHints].every(e => e.text.length <= 600));
  assert.ok([...x.profile.observedExamples,...x.profile.inferredHints].reduce((n,e) => n+e.text.length,0) <= 2400);
  assert.ok(x.examples.every(e => e.promptId && e.creativeId && e.mappingId && e.source));
  assert.deepEqual(Object.keys(x.profile.observedExamples[0]).sort(), ['id','text']);
});
test('product category alignment is declaration-only, not invented from historical evidence or context hints', () => {
  const r = new EvidenceRetriever(fixture());
  for (const kind of ['hardware','mobile','physical']) {
    const c = campaign(kind), x = r.retrieve(FIXED_QUESTIONS[0],c); validateProfile(x.profile,c);
    assert.ok(x.examples.every(e => productKind(r.publicCatalogue().records.find(a => a.id === e.id).creativeText) === kind));
    assert.ok(x.hints.every(h => h.supportingCreativeIds.some(id => x.examples.some(e => e.creativeId === id))));
    assert.ok(x.profile.observedExamples.every(e => e.text.startsWith('Historical reference, not this campaign')));
  }
  const c = campaign('unknown'); c.creatives[0].approvedText += ' Hardware wallet with offline storage';
  const x = r.retrieve(FIXED_QUESTIONS[0],c); assert.equal(x.historyStatus,'unavailable'); assert.equal(x.examples.length,0);
  assert.equal(productKind('Coin Ledger, Inc. Top Crypto Tax Software Calculate Your Crypto Taxes in Minutes.'),'unknown');
  assert.equal(productKind('Bitcoin & Crypto Wallet Recovery software helps recover wallet keys.'),'unknown');
  assert.equal(productKind('Phantom Flow Trade With More Clarity built for TradingView.'),'unknown');
  assert.equal(productKind('Crypto tax software supports importing MetaMask wallet records.'),'unknown');
  assert.equal(productKind('This crypto software uses analytics, not a mobile wallet.'),'unknown');
  assert.equal(productKind('Our crypto app does not provide hardware wallet storage.'),'unknown');
  assert.equal(productKind('Mobile crypto wallet for Ethereum and Solana.'),'mobile');
});
test('missing and malformed vectors do not get invented, wrong spaces/refs are rejected', () => {
  for (const change of [f => f.index.dimension = 384, f => f.index.model = 'other', f => f.index.vectors[0].vector = unit().slice(0,384), f => f.index.vectors[0].refHash = textHash('wrong'), f => f.index.vectors[0].vector[0] = NaN]) {
    const f = fixture(); change(f); assert.throws(() => new EvidenceRetriever(f));
  }
  const f = fixture(); f.index.vectors = []; f.index.queryVectors = []; reseal(f);
  assert.equal(new EvidenceRetriever(f).retrieve(FIXED_QUESTIONS[0],campaign()).method,'lexical_fallback');
});
test('hints must bind actual retained creatives and preserve sparse provenance', () => {
  const f = fixture(); f.catalogue.hints[0].supportingCreativeIds = [10000]; reseal(f); assert.throws(() => validateCatalogue(f.catalogue));
  const x = new EvidenceRetriever(fixture()).retrieve(FIXED_QUESTIONS[0],campaign());
  assert.ok(x.hints.every(h => h.tier === 'sparse' && h.qualityFlags.includes('sparse_hint')));
});
test('hard association, normalized prompt and byte caps fail closed', () => {
  const f = fixture(); f.catalogue.records = Array.from({length:1501},()=>f.catalogue.records[0]); assert.throws(() => validateCatalogue(f.catalogue),/association_limit/u);
  const g = fixture(); g.catalogue.hints = []; const base = g.catalogue.records[0];
  g.catalogue.records = Array.from({length:513},(_,i) => { const text = `Wallet comparison ${i}`; return {...base,id:`ads:mapping:${i+1}`,mappingId:i+1,promptId:i+1,promptText:text,normalizedHash:promptHash(text),hintIds:[]}; }); reseal(g);
  assert.throws(() => validateCatalogue(g.catalogue),/prompt_limit/u);
  const d = writeFixture(fixture()); truncateSync(join(d,'index.backend.json'),LIMITS.bytes+1);
  assert.throws(() => loadEvidence({directory:d}),/file_size_invalid/u);
});
test('five-neighbor cap applies after conservative campaign alignment', () => {
  const f = fixture(), base = f.catalogue.records[0]; f.catalogue.hints = [];
  f.catalogue.records = Array.from({length:12},(_,i) => { const text = `Wallet Ethereum Solana ${i}`; return {...base,id:`ads:mapping:${i+1}`,mappingId:i+1,promptId:i+1,promptText:text,normalizedHash:promptHash(text),creativeId:i+100,creativeContentHash:`sha256:${textHash(text)}`,hintIds:[]}; });
  f.index.vectors = f.catalogue.records.map((r,i) => ({embeddingId:i+1,refHash:r.normalizedHash,vector:unit(0,i+1)})); f.index.queryVectors = [{embeddingId:300,refHash:promptHash(FIXED_QUESTIONS[0]),vector:unit(0)}]; reseal(f);
  const x = new EvidenceRetriever(f).retrieve(FIXED_QUESTIONS[0],campaign());
  assert.equal(x.neighborCount,5); assert.equal(x.examples.length,3); assert.equal(new Set(x.examples.map(e=>e.normalizedHash)).size,3);
});
test('public catalogue, retrieval, and model packet never expose backend vector arrays', () => {
  const r = new EvidenceRetriever(fixture()), x = r.retrieve(FIXED_QUESTIONS[0],campaign());
  for (const v of [r.publicCatalogue(),x,x.profile,r]) assert.doesNotMatch(JSON.stringify(v), /"(?:vectors|queryVectors|vector)"\s*:\s*\[/u);
  assert.throws(() => { r.publicCatalogue().records[0].promptText = 'changed'; }, TypeError);
});
test('loader verifies content, manifest and file hashes; replays offline without source transport', () => {
  const f = fixture(), directory = writeFixture(f), r = loadEvidence({directory}); assert.equal(r.publicCatalogue().records.length,9);
  assert.equal(r.retrieve(FIXED_QUESTIONS[0],campaign()).method,'vector');
  writeFileSync(join(directory,'catalogue.json'), readFileSync(join(directory,'catalogue.json'),'utf8') + ' ');
  assert.throws(() => loadEvidence({directory}), /file_hash_mismatch/u);
  const g = fixture(); g.manifest.counts.associations = 100; assert.throws(() => loadEvidence({directory:writeFixture(g)}), /count_mismatch/u);
  const h = fixture(), d = writeFixture(h); const m = JSON.parse(readFileSync(join(d,'manifest.json'),'utf8')); m.contentHash = textHash('wrong'); writeFileSync(join(d,'manifest.json'),encoding(m));
  assert.throws(() => loadEvidence({directory:d}), /manifest_hash_mismatch/u);
});
test('injected exporter screens source copy, drops orphan hints/vectors and reconciles counts', async () => {
  const f = fixture(), data = { database:'ads',readOnly:true, records:f.catalogue.records,hints:f.catalogue.hints,vectors:f.index.vectors,queryVectors:f.index.queryVectors,inventory:{eligibleAssociations:9} };
  data.records[1].promptText = 'Contact customer@example.com';
  const built = await buildEvidence({read:async () => data,capturedAt:'2026-10-01T00:00:00.000Z'});
  assert.equal(built.manifest.counts.associations,8); assert.equal(built.manifest.omissions.jsUnsafeAssociations,1);
  assert.equal(built.catalogue.hints.length,8); assert.equal(built.index.vectors.length,8);
  assert.doesNotMatch(JSON.stringify(built), /customer@example/u);
  assert.equal(new EvidenceRetriever(built).retrieve(FIXED_QUESTIONS[0],campaign()).method,'vector');
});
test('actual frozen export has reconciled source IDs and exact cached first query offline', () => {
  const r = loadEvidence(), {counts,omissions} = r.manifest;
  assert.equal(counts.associations,1178); assert.equal(counts.normalizedPrompts,241); assert.equal(counts.creatives,537); assert.equal(counts.hints,331);
  assert.equal(counts.sources.aws,1031); assert.equal(counts.sources.verseodin,147); assert.equal(omissions.sqlUnsafeText,2);
  assert.equal(counts.vectors,241); assert.equal(counts.queryVectors,1);
  const x = r.retrieve(FIXED_QUESTIONS[0],campaign()); assert.equal(x.method,'vector'); assert.equal(x.queryVectorId,127592); validateProfile(x.profile,campaign());
  assert.equal(r.retrieve(FIXED_QUESTIONS[1],campaign()).method,'lexical_fallback');
  assert.ok(['manifest.json','catalogue.json','index.backend.json'].reduce((n,f) => n+statSync(join(DEFAULT_DIRECTORY,f)).size,0) <= LIMITS.bytes);
  // This screened, committed index is backend-only, not secret material. Git
  // preserves executable bits, not local owner-only modes; clones use umask.
  const indexMode = statSync(join(DEFAULT_DIRECTORY,'index.backend.json')).mode;
  assert.equal(indexMode & 0o400,0o400); assert.equal(indexMode & 0o111,0);
  for (const task of FIXED_QUESTIONS) {
    assert.equal(r.retrieve(task,campaign('mobile')).historyStatus,'unavailable');
    assert.equal(r.retrieve(task,campaign('physical')).historyStatus,'ready');
  }
  const archive = loadEvidence({directory:join(DEFAULT_DIRECTORY,'archive','v2-wallet-853e3ef3431149b593cf7c08')});
  assert.equal(archive.manifest.counts.associations,171);
  assert.equal(archive.publicCatalogue().contentHash,'853e3ef3431149b593cf7c0847f7e125f4728947fb91b0cb85029754b64862f3');
});
