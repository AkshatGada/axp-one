import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, object, hash, textHash, freeze, vector, cosine } from '../ml/core.mjs';
import { validateCampaign } from '../ml/engines/contract.mjs';
import { evidenceText } from '../advertiser/evidence.mjs';

export const DEFAULT_DIRECTORY = fileURLToPath(new URL('../../artifacts/v2/evidence/', import.meta.url));
export const NICHE = 'crypto-hardware-wallets-self-custody';
export const NICHES = freeze([NICHE, 'crypto-investing', 'web3-infrastructure', 'crypto-tax-software-defi-accounting', 'privacy-preserving-blockchains-zk-compliance']);
export const WALLET_PATTERN = /wallet|cold[\s-]*storage|self[\s-]*custody/iu;
export const MODEL = 'BAAI/bge-base-en-v1.5';
export const DIMENSION = 768;
export const LIMITS = freeze({ associations: 1500, normalizedPrompts: 512, bytes: 16 * 1024 ** 2, neighbors: 5, examples: 3, hints: 2, packetText: 2400 });
export const FIXED_QUESTIONS = freeze([
  'cheapest hardware wallet that still supports ethereum and solana',
  'Compare self-custody options for Ethereum and Solana, prioritizing offline key storage over a mobile-only wallet.',
]);
// Match Python embed.py; NFKC/family folding would bind different text to these vectors.
export const legacyNormalize = text => text.toLowerCase().replace(/[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ' ').replace(/^ +| +$/gu, '');
export const promptHash = text => textHash(legacyNormalize(text));
const digest = x => assert(typeof x === 'string' && /^[a-f0-9]{64}$/u.test(x), 'evidence_hash_invalid');
const sourceId = x => assert(Number.isSafeInteger(x) && x > 0, 'evidence_source_id_invalid');
const unique = xs => assert(new Set(xs).size === xs.length, 'evidence_duplicate_identity');
export function screenText(text, max = 2400) {
  evidenceText(text, max);
  assert(!/\b(?:seed phrase|recovery phrase|mnemonic)\s*[:=]|\b0x[a-f0-9]{40,}\b|\b[a-z0-9]{80,}\b/iu.test(text), 'evidence_private_content');
  return text;
}

export function validateClassification(record) {
  const s = record.source;
  if (s.source === 'aws') {
    const c = s.classification;
    object(c, ['promptHash', 'classificationTextHash', 'chosenSlug', 'method']);
    digest(c.promptHash); digest(c.classificationTextHash);
    assert(c.promptHash === record.normalizedHash && c.classificationTextHash === record.normalizedHash && c.chosenSlug === s.mappingNiche && NICHES.includes(c.chosenSlug) && c.method === 'llm', 'evidence_classification_binding_invalid');
    assert([s.mappingNiche, 'source-b'].includes(s.probeNiche), 'evidence_probe_niche_invalid');
  } else assert(s.classification === null && s.probeNiche === s.mappingNiche && NICHES.includes(s.mappingNiche), 'evidence_probe_niche_invalid');
}

export function validateCatalogue(catalogue) {
  object(catalogue, ['schemaVersion', 'niche', 'records', 'hints', 'contentHash']);
  assert(catalogue.schemaVersion === 'v2-evidence-catalogue.v1' && catalogue.niche === NICHE, 'evidence_schema_invalid');
  assert(Array.isArray(catalogue.records) && catalogue.records.length > 0 && catalogue.records.length <= LIMITS.associations, 'evidence_association_limit');
  assert(Array.isArray(catalogue.hints) && catalogue.hints.length <= LIMITS.associations, 'evidence_hint_limit');
  unique(catalogue.records.map(r => r.id)); unique(catalogue.records.map(r => r.mappingId));
  const seenPrompts = new Map(), seenCreatives = new Map();
  const consistent = (map, key, value) => { assert(!map.has(key) || map.get(key) === hash(value), 'evidence_identity_conflict'); map.set(key, hash(value)); };
  for (const r of catalogue.records) {
    object(r, ['id', 'mappingId', 'promptId', 'promptText', 'normalizedHash', 'creativeId', 'creativeContentHash', 'advertiser', 'creativeText', 'hintIds', 'source']);
    [r.mappingId, r.promptId, r.creativeId].forEach(sourceId);
    assert(r.id === `ads:mapping:${r.mappingId}`, 'evidence_identity_invalid');
    screenText(r.promptText); screenText(r.creativeText); screenText(r.advertiser, 160);
    digest(r.normalizedHash); assert(/^sha256:[a-f0-9]{64}$/u.test(r.creativeContentHash), 'evidence_creative_hash_invalid');
    assert(promptHash(r.promptText) === r.normalizedHash, 'evidence_prompt_binding_invalid');
    consistent(seenPrompts, r.promptId, r.promptText);
    consistent(seenCreatives, r.creativeId, { hash: r.creativeContentHash, text: r.creativeText, advertiser: r.advertiser });
    object(r.source, ['database', 'source', 'sourceRefHash', 'probeNiche', 'mappingNiche', 'status', 'requestAssociated', 'customerGenerated', 'classification']);
    const s = r.source;
    assert(s.database === 'ads' && ['aws', 'verseodin'].includes(s.source) && NICHES.includes(s.mappingNiche) && s.status === 'ok' && s.requestAssociated === false && s.customerGenerated === false, 'evidence_source_invalid');
    digest(s.sourceRefHash); validateClassification(r);
    assert(Array.isArray(r.hintIds) && r.hintIds.length <= 1, 'evidence_hint_binding_invalid'); unique(r.hintIds);
  }
  assert(new Set(catalogue.records.map(r => r.normalizedHash)).size <= LIMITS.normalizedPrompts, 'evidence_prompt_limit');
  unique(catalogue.hints.map(h => h.id));
  for (const h of catalogue.hints) {
    object(h, ['id', 'sourceHintId', 'text', 'tier', 'modelVersion', 'supportingCreativeIds', 'qualityFlags']);
    sourceId(h.sourceHintId); assert(h.id === `ads:hint:${h.sourceHintId}`, 'evidence_identity_invalid');
    screenText(h.text); screenText(h.modelVersion, 160);
    assert(['holdout', 'sparse', 'loo', 'leave-one-out', 'unknown'].includes(h.tier), 'evidence_hint_tier_invalid');
    assert(Array.isArray(h.supportingCreativeIds) && h.supportingCreativeIds.length > 0, 'evidence_hint_binding_invalid'); unique(h.supportingCreativeIds); h.supportingCreativeIds.forEach(sourceId);
    assert(h.supportingCreativeIds.every(id => catalogue.records.some(r => r.creativeId === id && r.hintIds.includes(h.id))), 'evidence_hint_binding_invalid');
    assert(hash(h.qualityFlags) === hash(h.tier === 'sparse' ? ['inferred_not_observed', 'sparse_hint'] : ['inferred_not_observed']), 'evidence_hint_flags_invalid');
  }
  for (const r of catalogue.records) for (const id of r.hintIds) assert(catalogue.hints.some(h => h.id === id && h.supportingCreativeIds.includes(r.creativeId)), 'evidence_hint_binding_invalid');
  const { contentHash, ...content } = catalogue; assert(contentHash === hash(content), 'evidence_content_hash_mismatch');
  return catalogue;
}

function validateIndex(index, catalogue) {
  object(index, ['schemaVersion', 'model', 'dimension', 'revision', 'normalization', 'catalogueHash', 'vectors', 'queryVectors', 'contentHash']);
  assert(index.schemaVersion === 'v2-evidence-index.v1' && index.model === MODEL && index.dimension === DIMENSION && index.revision === 'unrecorded' && index.normalization === 'legacy-python-lower-whitespace-sha256' && index.catalogueHash === catalogue.contentHash, 'evidence_vector_space_invalid');
  assert(Array.isArray(index.vectors) && index.vectors.length <= LIMITS.normalizedPrompts && Array.isArray(index.queryVectors) && index.queryVectors.length <= 2, 'evidence_vector_limit');
  for (const [rows, queries] of [[index.vectors, false], [index.queryVectors, true]]) {
    unique(rows.map(v => v.refHash));
    for (const v of rows) {
      object(v, ['embeddingId', 'refHash', 'vector']); sourceId(v.embeddingId); digest(v.refHash); vector(v.vector, DIMENSION);
      assert(queries ? FIXED_QUESTIONS.some(q => promptHash(q) === v.refHash) : catalogue.records.some(r => r.normalizedHash === v.refHash), 'evidence_vector_binding_invalid');
    }
  }
  for (const q of index.queryVectors) { const p = index.vectors.find(v => v.refHash === q.refHash); if (p) assert(hash(q) === hash(p), 'evidence_vector_conflict'); }
  const { contentHash, ...content } = index; assert(contentHash === hash(content), 'evidence_content_hash_mismatch');
}

const tokens = text => new Set(legacyNormalize(text).match(/[\p{L}\p{N}]+/gu)?.filter(t => !['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'that', 'with', 'still', 'supports', 'over', 'only'].includes(t)) ?? []);
function lexical(a, b) { const aa = tokens(a), bb = tokens(b); return aa.size && bb.size ? [...aa].filter(x => bb.has(x)).length / Math.sqrt(aa.size * bb.size) : 0; }

// Historical copy describes a reference product, not facts about the fictional bidder.
// Conservative category alignment uses affirmative product nouns, not shared 'wallet' alone.
export function productKind(text) {
  const t = legacyNormalize(text);
  if (/\b(?:rfid|leather|cardholder|bifold|trifold|money clip)\b/u.test(t) && !/\b(?:crypto|bitcoin|ethereum|solana|self.custody|hardware wallet)\b/u.test(t)) return 'physical';
  // Reject category claims negated in the preceding clause. Do not infer a type from
  // generic crypto+'software', brand substrings, or a comparison of absent features.
  const affirmative = pattern => [...t.matchAll(pattern)].some(m => !/\b(?:not|no|without|never|isn't|aren't|cannot|can't)\b[^.!?;]{0,60}$/u.test(t.slice(Math.max(0,m.index-70),m.index)));
  const unrelatedService = /\b(?:exchange|brokerage|etf|tax|taxes|recovery|recover|tradingview)\b/u.test(t);
  if (!unrelatedService && affirmative(/\b(?:hardware wallet|cold wallet|cold storage|offline (?:key|storage)|air.gapped|trezor|ledger nano|ledger flex|ledger stax)\b/gu)) return 'hardware';
  if (!unrelatedService && affirmative(/\b(?:(?:mobile|software|non[ -]custodial|self[ -]custody) (?:crypto |bitcoin |ethereum |solana )?wallet|(?:metamask|phantom|exodus|trust|rainbow) wallet)\b/gu) && /\b(?:crypto|bitcoin|ethereum|solana|non[ -]custodial|metamask|phantom|exodus|trust wallet|rainbow wallet)\b/u.test(t)) return 'mobile';
  return 'unknown';
}
function declaredKind(campaign) {
  const caps = campaign.declaredConstraints.requiredCapabilities ?? [];
  if (caps.includes('crypto_storage') && caps.includes('hardware_wallet')) return 'hardware';
  if (caps.includes('crypto_storage') && caps.includes('mobile_software_wallet')) return 'mobile';
  if (caps.includes('physical_wallet') && !caps.includes('crypto_storage')) return 'physical';
  return 'unknown';
}

export class EvidenceRetriever {
  #catalogue; #index; #groups; #vectors;
  constructor({ catalogue, index, manifest }) {
    validateCatalogue(catalogue); validateIndex(index, catalogue);
    this.#catalogue = freeze(structuredClone(catalogue)); this.#index = freeze(structuredClone(index));
    this.manifest = freeze(structuredClone(manifest)); this.#vectors = new Map(index.vectors.map(v => [v.refHash, v]));
    this.#groups = new Map();
    for (const r of this.#catalogue.records) {
      if (!this.#groups.has(r.normalizedHash)) this.#groups.set(r.normalizedHash, []);
      this.#groups.get(r.normalizedHash).push(r);
    }
    Object.freeze(this);
  }
  publicCatalogue() { return this.#catalogue; }
  retrieve(task, campaign) {
    screenText(task, 1200); validateCampaign(campaign);
    const key = promptHash(task), query = this.#vectors.get(key) ?? this.#index.queryVectors.find(v => v.refHash === key);
    const vectorMethod = !!query;
    const kind = declaredKind(campaign);
    const alignedGroups = [...this.#groups].map(([normalizedHash, records]) => [normalizedHash, records.filter(r => kind !== 'unknown' && productKind(r.creativeText) === kind)]).filter(([,records]) => records.length);
    const ranked = alignedGroups.map(([normalizedHash, records]) => ({ normalizedHash, records, score: vectorMethod ? (this.#vectors.has(normalizedHash) ? cosine(query.vector, this.#vectors.get(normalizedHash).vector) : null) : lexical(task, records[0].promptText) }))
      .filter(n => n.score !== null && n.score > 0).sort((a, b) => b.score - a.score || a.normalizedHash.localeCompare(b.normalizedHash)).slice(0, LIMITS.neighbors);
    const method = ranked.length ? (vectorMethod ? 'vector' : 'lexical_fallback') : 'unavailable';
    const examples = [], hints = [], selected = [];
    const seenCreatives = new Set();
    for (const neighbor of ranked) {
      const r = neighbor.records.find(r => kind !== 'unknown' && productKind(r.creativeText) === kind && !seenCreatives.has(r.creativeId));
      if (!r || examples.length >= LIMITS.examples) continue;
      const text = `Historical reference, not this campaign's capabilities. Prompt: ${r.promptText}\nObserved creative: ${r.creativeText}`;
      if (text.length > 600) continue; // Never crop source text or rebind a changed vector.
      seenCreatives.add(r.creativeId); selected.push(r);
      examples.push({ id: r.id, text, normalizedHash: r.normalizedHash, promptId: r.promptId, creativeId: r.creativeId, mappingId: r.mappingId, similarity: neighbor.score, source: r.source, hintIds: r.hintIds });
    }
    let totalText = examples.reduce((n, e) => n + e.text.length, 0);
    for (const r of selected) for (const id of r.hintIds) {
      const h = this.#catalogue.hints.find(h => h.id === id);
      if (hints.length >= LIMITS.hints || hints.some(x => x.id === id) || productKind(h.text) !== kind) continue;
      const text = `Inferred historical targeting hypothesis; not a campaign declaration. ${h.text}`;
      if (text.length > 600 || totalText + text.length > LIMITS.packetText) continue;
      totalText += text.length; hints.push({ ...h, text });
    }
    const historyStatus = examples.length ? 'ready' : 'unavailable';
    const profileContent = { schemaVersion: 'retrieved-campaign-profile.v1', profileId: `v2-profile:${hash({ task: key, campaign: hash(campaign), snapshot: this.#catalogue.contentHash }).slice(0, 24)}`, campaignId: campaign.campaignId, campaignVersionId: campaign.campaignVersionId, campaignContentHash: hash(campaign), snapshotId: this.manifest.snapshotId, snapshotContentHash: this.#catalogue.contentHash, retrievalMethod: method, historyStatus, observedExamples: examples.map(({ id, text }) => ({ id, text })), contrastExamples: [], inferredHints: hints.map(({ id, text, tier, qualityFlags }) => ({ id, text, tier, qualityFlags })) };
    return freeze({ method, fallback: method === 'lexical_fallback', sourceHash: this.#catalogue.contentHash, examples, hints, profile: { ...profileContent, profileHash: hash(profileContent) }, historyStatus, queryTextHash: key, queryVectorId: query?.embeddingId ?? null, model: vectorMethod ? MODEL : null, dimension: vectorMethod ? DIMENSION : null, revision: 'unrecorded', neighborCount: ranked.length, neighbors: ranked.map(n => ({ normalizedHash: n.normalizedHash, promptIds: [...new Set(n.records.map(r => r.promptId))], similarity: n.score, associationIds: n.records.map(r => r.id) })), independentPromptCount: new Set(examples.map(e => e.normalizedHash)).size, qualityFlags: ['association_not_fit_label', 'historical_cannot_add_campaign_capabilities', ...(vectorMethod ? ['cached_exact_query', 'revision_unrecorded'] : ['uncached_query', 'lexical_not_vector_similarity']), ...(historyStatus === 'unavailable' ? ['no_aligned_history'] : [])] });
  }
}

export function loadEvidence({ directory = DEFAULT_DIRECTORY } = {}) {
  const names = ['manifest.json', 'catalogue.json', 'index.backend.json'];
  const sizes = names.map(n => { const s = statSync(resolve(directory, n)); assert(s.isFile() && s.size > 0 && s.size <= LIMITS.bytes, 'evidence_file_size_invalid'); return s.size; });
  assert(sizes.reduce((a, b) => a + b, 0) <= LIMITS.bytes, 'evidence_file_size_invalid');
  const manifest = JSON.parse(readFileSync(resolve(directory, names[0]), 'utf8'));
  object(manifest, ['schemaVersion', 'snapshotId', 'capturedAt', 'source', 'selection', 'counts', 'omissions', 'files', 'limitations', 'contentHash']);
  assert(manifest.schemaVersion === 'v2-evidence-manifest.v1', 'evidence_schema_invalid');
  const { contentHash, ...content } = manifest; assert(contentHash === hash(content), 'evidence_manifest_hash_mismatch');
  object(manifest.files, ['catalogue.json', 'index.backend.json']);
  const read = n => { const b = readFileSync(resolve(directory, n)); assert(b.length === sizes[names.indexOf(n)] && textHash(b) === manifest.files[n], 'evidence_file_hash_mismatch'); return JSON.parse(b); };
  const catalogue = read(names[1]), index = read(names[2]);
  assert(manifest.source.database === 'ads' && manifest.source.container === 'adsdb' && manifest.source.readOnly === true && manifest.source.embeddingCalls === 0, 'evidence_source_invalid');
  assert(manifest.counts.associations === catalogue.records.length && manifest.counts.normalizedPrompts === new Set(catalogue.records.map(r => r.normalizedHash)).size && manifest.counts.creatives === new Set(catalogue.records.map(r => r.creativeId)).size && manifest.counts.hints === catalogue.hints.length && manifest.counts.vectors === index.vectors.length && manifest.counts.queryVectors === index.queryVectors.length, 'evidence_count_mismatch');
  return new EvidenceRetriever({ catalogue, index, manifest });
}
