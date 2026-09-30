import { createHash } from 'node:crypto';

export class ContractError extends Error {
  constructor(code = 'schema_invalid') { super(code); this.name = 'ContractError'; this.code = code; }
}
export function assert(ok, code = 'schema_invalid') { if (!ok) throw new ContractError(code); }
export function object(value, keys, required = keys) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype);
  assert(Object.keys(value).every(k => keys.includes(k)), 'unknown_field');
  assert(required.every(k => Object.hasOwn(value, k)), 'missing_field');
}
export function string(value, max = 2400) {
  assert(typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value));
}
export function id(value) { string(value, 160); assert(/^[\w.:/-]+$/u.test(value), 'invalid_id'); }
export function array(value, max, check = () => {}) { assert(Array.isArray(value) && value.length <= max); value.forEach(check); }
export function unique(value) { assert(new Set(value).size === value.length, 'duplicate_id'); }
export function ids(value, max = 60) { array(value, max, id); unique(value); }
export function safeText(value, max = 2400) {
  string(value, max);
  assert(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(value), 'private_identifier');
  assert(!/(?:bearer\s+[\w.-]{12,}|-----BEGIN .*PRIVATE KEY|\b(?:sk|ts)-[a-z0-9_-]{16,})/iu.test(value), 'credential_content');
}
export function normalizePrompt(value) { return value.normalize('NFKC').toLowerCase().replace(/ß/gu, 'ss').replace(/ς/gu, 'σ').replace(/\s+/gu, ' ').trim(); }
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  assert(value !== undefined && !(typeof value === 'number' && !Number.isFinite(value)));
  return JSON.stringify(value);
}
export function hash(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
export function textHash(value) { return createHash('sha256').update(value).digest('hex'); }
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function timestamp(value) { string(value, 40); assert(/^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)), 'invalid_timestamp'); }
export function space(value) {
  object(value, ['model', 'revision', 'dimension']); id(value.model); id(value.revision);
  assert(Number.isInteger(value.dimension) && value.dimension > 0 && value.dimension <= 4096);
}
export function vector(value, dimension) {
  array(value, 4096, x => assert(typeof x === 'number' && Number.isFinite(x)));
  assert(value.length === dimension, 'vector_incompatible');
  assert(value.some(x => x !== 0), 'vector_unavailable');
}
export function cosine(a, b) {
  assert(a.length === b.length && a.length > 0, 'vector_incompatible');
  vector(a, a.length); vector(b, b.length);
  const sa = Math.max(...a.map(Math.abs)), sb = Math.max(...b.map(Math.abs));
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] / sa, y = b[i] / sb; dot += x*y; na += x*x; nb += y*y; }
  return Math.max(-1, Math.min(1, dot / Math.sqrt(na*nb)));
}
export function sameSpace(a, b) { return !!a && !!b && hash(a) === hash(b); }
