// Backend-private persistence, NOT an owner API/DTO. The caller must verify
// current authenticated resource ownership before access and project secrets out.
import {DatabaseSync} from 'node:sqlite';
import {chmodSync, closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const MAX_RECORD = 256 * 1024;
const MAX_LIST = 100;
const MAX_REVISION = Number.MAX_SAFE_INTEGER;
const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const KEY = new RegExp(`^(wallet-challenge:${UUID}|wallet:(funding|payout):${UUID}|channel:${UUID})$`, 'u');
// All other channel fields (including future address bindings) are frozen. Keep
// this allowlist aligned with SQL; adding mutable fields requires a review.
const CHANNEL_STATE = ['phase', 'servingEnabled', 'protocolChannelId', 'authorizedBaseUnits', 'paidBaseUnits',
  'refundBaseUnits', 'feeAndRentLamports', 'vouchers', 'open', 'close', 'pendingVoucher'];
const fail = (code, status = 503) => {throw Object.assign(new Error(code), {code, status});};
const invalid = () => fail('invalid_input', 400);
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\s\u0000-\u001f\u007f]/u.test(value);
const kindOK = value => ['wallet_challenge', 'wallet_binding', 'channel'].includes(value);
const keyOK = value => typeof value === 'string' && KEY.test(value);
const revisionOK = value => Number.isSafeInteger(value) && value >= 1 && value <= MAX_REVISION;
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'
    : JSON.stringify(value);

// Reject lossy/non-JSON JS values, accessors, prototypes, cycles, sparse arrays
// and excessive nesting before serialization. No toJSON code is executed.
function jsonCopy(value) {
  const seen = new Set();
  function visit(v, depth) {
    if (depth > 32) invalid();
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      if (v.includes('\0') || !v.isWellFormed()) invalid();
      return v;
    }
    if (typeof v === 'number') {if (!Number.isFinite(v)) invalid(); return v;}
    if (typeof v !== 'object' || seen.has(v)) invalid();
    seen.add(v);
    const array = Array.isArray(v);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) invalid();
    const result = array ? [] : Object.create(null);
    for (const k of Reflect.ownKeys(v)) {
      if (array && k === 'length') continue;
      if (typeof k !== 'string' || k.includes('\0') || !k.isWellFormed() ||
          array && !/^(0|[1-9][0-9]*)$/u.test(k)) invalid();
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d.enumerable || !Object.hasOwn(d, 'value')) invalid();
      result[k] = visit(d.value, depth + 1);
    }
    if (array && (result.length !== v.length || Object.keys(result).length !== v.length)) invalid();
    seen.delete(v);
    return result;
  }
  return JSON.parse(JSON.stringify(visit(value, 0)));
}

function record(key, revision, input) {
  if (!keyOK(key) || !revisionOK(revision)) invalid();
  const value = jsonCopy(input);
  if (!value || Array.isArray(value) || typeof value !== 'object' || !kindOK(value.kind) ||
      !['organizationId', 'ownerId', 'resourceId'].every(k => identity(value[k]))) invalid();
  if (value.kind === 'channel') {
    if (!key.startsWith('channel:') || !['counterpartyAppId', 'counterpartyOrgId', 'counterpartyOwnerId'].every(k => identity(value[k])) ||
        !value.terms || typeof value.terms !== 'object' || Array.isArray(value.terms) || !identity(value.terms.payee) ||
        typeof value.termsHash !== 'string' || !/^[a-f0-9]{64}$/u.test(value.termsHash) ||
        !Number.isSafeInteger(value.createdAt) || value.createdAt < 0) invalid();
  } else {
    if (!['funding', 'payout'].includes(value.purpose)) invalid();
    if (value.kind === 'wallet_binding' ? key !== `wallet:${value.purpose}:${value.resourceId}` : !key.startsWith('wallet-challenge:')) invalid();
  }
  const result = {key, revision, value};
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_RECORD) invalid();
  return result;
}
const matches = (r, kind, resourceId) => r.value.kind === kind &&
  (r.value.resourceId === resourceId || kind === 'channel' && r.value.counterpartyAppId === resourceId);
function assertImmutable(oldValue, newValue) {
  const fields = ['kind', 'organizationId', 'ownerId', 'resourceId'];
  if (oldValue.kind !== 'channel') fields.push('purpose');
  if (fields.some(k => oldValue[k] !== newValue[k])) fail('financial_conflict', 409);
  if (oldValue.kind === 'channel') {
    const frozen = v => Object.fromEntries(Object.entries(v).filter(([k]) => !CHANNEL_STATE.includes(k)));
    if (canonical(frozen(oldValue)) !== canonical(frozen(newValue))) fail('financial_conflict', 409);
  }
  if (oldValue.kind === 'wallet_challenge') {
    const frozen = v => Object.fromEntries(Object.entries(v).filter(([k]) => !['consumedAt', 'proofHash', 'verifiedBinding'].includes(k)));
    if (canonical(frozen(oldValue)) !== canonical(frozen(newValue))) fail('financial_conflict', 409);
    if (oldValue.consumedAt != null && canonical(oldValue) !== canonical(newValue)) fail('financial_conflict', 409);
    if (oldValue.consumedAt == null && newValue.consumedAt != null &&
        (!Number.isSafeInteger(newValue.consumedAt) || newValue.consumedAt < 1 ||
         typeof newValue.proofHash !== 'string' || !/^[a-f0-9]{64}$/u.test(newValue.proofHash) ||
         !newValue.verifiedBinding || newValue.verifiedBinding.kind !== 'wallet_binding')) fail('financial_conflict', 409);
    if (oldValue.consumedAt == null && newValue.consumedAt != null) {
      const binding = newValue.verifiedBinding;
      if (['id', 'resourceId', 'organizationId', 'ownerId', 'purpose', 'network', 'address'].some(k => binding[k] !== oldValue[k]) ||
          !Number.isSafeInteger(binding.verifiedAt) || binding.verifiedAt < 0) fail('financial_conflict', 409);
    }
    if (oldValue.consumedAt == null && newValue.consumedAt == null &&
        canonical(oldValue) !== canonical(newValue)) fail('financial_conflict', 409);
  }
}
const assertList = (kind, resourceId) => {if (!kindOK(kind) || !identity(resourceId)) invalid();};

// Explicit fixture only: SQLite cannot verify the real account resource graph.
// No in-memory mode, automatic fallback, wallet loader or network access exists.
export function createFixtureFinancialRepository({path, now = Date.now} = {}) {
  if (typeof path !== 'string' || !path || path === ':memory:' || typeof now !== 'function') invalid();
  const filename = resolve(path);
  let db;
  try {
    mkdirSync(dirname(filename), {recursive: true, mode: 0o700});
    const fd = openSync(filename, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1) throw Error();
      chmodSync(filename, 0o600);
    } finally {closeSync(fd);}
    for (const suffix of ['-journal', '-wal', '-shm']) {
      const sidecar = filename + suffix;
      if (existsSync(sidecar) || (() => {try {return !!lstatSync(sidecar);} catch {return false;}})()) {
        const stat = lstatSync(sidecar);
        if (!stat.isFile() || stat.nlink !== 1) throw Error();
        chmodSync(sidecar, 0o600);
      }
    }
    db = new DatabaseSync(filename);
    db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; PRAGMA trusted_schema=OFF;
      CREATE TABLE IF NOT EXISTS financial_records (
        key TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
        value TEXT NOT NULL CHECK(json_valid(value)), updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS financial_channel_binding ON financial_records(
        json_extract(value,'$.resourceId'),json_extract(value,'$.counterpartyAppId'))
        WHERE json_extract(value,'$.kind')='channel';
      CREATE INDEX IF NOT EXISTS financial_resource ON financial_records(json_extract(value,'$.kind'),json_extract(value,'$.resourceId'),key);
      CREATE INDEX IF NOT EXISTS financial_counterparty ON financial_records(json_extract(value,'$.counterpartyAppId'),key)
        WHERE json_extract(value,'$.kind')='channel';`);
  } catch {try {db?.close();} catch {} fail('financial_repository_unavailable');}
  const safe = fn => async (...args) => {
    try {return fn(...args);} catch (e) {
      if (['invalid_input', 'financial_conflict', 'channel_binding_exists', 'channel_payee_conflict'].includes(e?.code) && [400, 409].includes(e.status)) throw e;
      fail('financial_repository_unavailable');
    }
  };
  const decode = row => row ? record(row.key, row.revision, JSON.parse(row.value)) : null;
  const get = key => decode(db.prepare('SELECT key,revision,value FROM financial_records WHERE key=?').get(key));
  const write = fn => {
    db.exec('BEGIN IMMEDIATE');
    try {const result = fn(); db.exec('COMMIT'); return result;}
    catch (e) {db.exec('ROLLBACK'); throw e;}
  };
  const clock = () => {const t = now(); if (!Number.isSafeInteger(t) || t < 0) invalid(); return t;};
  return {
    get: safe(key => {if (!keyOK(key)) invalid(); return get(key);}),
    create: safe((key, value) => {
      const next = record(key, 1, value);
      return write(() => {
        if (get(key)) fail('financial_conflict', 409);
        if (next.value.kind === 'channel') {
          if (db.prepare(`SELECT 1 FROM financial_records WHERE json_extract(value,'$.kind')='channel'
            AND json_extract(value,'$.counterpartyAppId')=? AND json_extract(value,'$.resourceId')=? LIMIT 1`)
            .get(next.value.counterpartyAppId, next.value.resourceId)) fail('channel_binding_exists', 409);
          if (db.prepare(`SELECT 1 FROM financial_records WHERE json_extract(value,'$.kind')='channel'
            AND json_extract(value,'$.counterpartyAppId')=? AND json_extract(value,'$.terms.payee')<>? LIMIT 1`)
            .get(next.value.counterpartyAppId, next.value.terms.payee)) fail('channel_payee_conflict', 409);
        }
        db.prepare('INSERT INTO financial_records(key,revision,value,updated_at) VALUES(?,1,?,?)')
          .run(key, JSON.stringify(next.value), clock());
        return next;
      });
    }),
    cas: safe((key, revision, value) => {
      if (!revisionOK(revision) || revision === MAX_REVISION) invalid();
      const next = record(key, revision + 1, value);
      return write(() => {
        const prior = get(key);
        if (!prior || prior.revision !== revision) fail('financial_conflict', 409);
        assertImmutable(prior.value, next.value);
        const updated = db.prepare('UPDATE financial_records SET revision=?,value=?,updated_at=? WHERE key=? AND revision=?')
          .run(next.revision, JSON.stringify(next.value), clock(), key, revision);
        if (updated.changes !== 1) fail('financial_conflict', 409);
        return next;
      });
    }),
    list: safe((kind, resourceId) => {
      assertList(kind, resourceId);
      return db.prepare(`SELECT key,revision,value FROM financial_records WHERE json_extract(value,'$.kind')=? AND
        (json_extract(value,'$.resourceId')=? OR (?='channel' AND json_extract(value,'$.counterpartyAppId')=?))
        ORDER BY key LIMIT 100`).all(kind, resourceId, kind, resourceId).map(decode);
    }),
    close() {try {db.close();} catch {fail('financial_repository_unavailable');}},
  };
}

async function boundedJSON(response, maximum) {
  const size = response.headers?.get('content-length');
  if (size && Number(size) > maximum) throw Error();
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maximum) throw Error();
    return JSON.parse(text);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let count = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maximum) {await reader.cancel(); throw Error();}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createSupabaseFinancialRepository({url, secretKey, fetchImpl = fetch} = {}) {
  let base;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.pathname !== '/' || u.username || u.password || u.search || u.hash ||
        u.port || !u.hostname.endsWith('.supabase.co')) throw Error();
    base = u.origin;
  } catch {fail('financial_repository_configuration_required');}
  if (typeof secretKey !== 'string' || !/^sb_secret_[A-Za-z0-9_-]{16,}$/u.test(secretKey)) fail('financial_repository_secret_key_required');
  if (typeof fetchImpl !== 'function') fail('financial_repository_configuration_required');
  const responseRecord = row => {
    try {
      if (!row || Object.keys(row).sort().join(',') !== 'key,revision,value') throw Error();
      return record(row.key, row.revision, row.value);
    } catch {fail('financial_repository_invalid');}
  };
  async function rpc(operation, payload) {
    let response, data;
    try {
      response = await fetchImpl(`${base}/rest/v1/rpc/axp_account_financial_operation`, {
        method: 'POST', headers: {apikey: secretKey, 'content-type': 'application/json'},
        body: JSON.stringify({operation, payload}), redirect: 'error', signal: AbortSignal.timeout(10000),
      });
    } catch {fail('financial_repository_unavailable');}
    try {data = await boundedJSON(response, response.ok && operation === 'list' ? MAX_LIST * MAX_RECORD + MAX_LIST + 2 : MAX_RECORD);}
    catch {fail('financial_repository_invalid');}
    if (!response.ok) {
      const known = {financial_conflict: 409, channel_binding_exists: 409, channel_payee_conflict: 409, invalid_input: 400, not_found: 404};
      if (Object.hasOwn(known, data?.message) && response.status === known[data.message] && data.code === `PT${response.status}`) fail(data.message, response.status);
      if (['PGRST202', '42P01', '42883'].includes(data?.code)) fail('financial_repository_migration_required');
      fail('financial_repository_unavailable');
    }
    return data;
  }
  async function mutation(operation, key, revision, value) {
    const next = record(key, operation === 'create' ? 1 : revision + 1, value);
    const row = responseRecord(await rpc(operation, {key, ...(operation === 'cas' ? {revision} : {}), value: next.value}));
    if (row.key !== key || row.revision !== next.revision || canonical(row.value) !== canonical(next.value)) fail('financial_repository_invalid');
    return row;
  }
  return {
    async get(key) {
      if (!keyOK(key)) invalid();
      const row = await rpc('get', {key});
      if (row === null) return null;
      const result = responseRecord(row);
      if (result.key !== key) fail('financial_repository_invalid');
      return result;
    },
    async create(key, value) {return mutation('create', key, 0, value);},
    async cas(key, revision, value) {
      if (!revisionOK(revision) || revision === MAX_REVISION) invalid();
      return mutation('cas', key, revision, value);
    },
    async list(kind, resourceId) {
      assertList(kind, resourceId);
      const data = await rpc('list', {kind, resourceId});
      if (!Array.isArray(data) || data.length > MAX_LIST) fail('financial_repository_invalid');
      const rows = data.map(responseRecord);
      if (new Set(rows.map(r => r.key)).size !== rows.length || rows.some(r => !matches(r, kind, resourceId))) fail('financial_repository_invalid');
      return rows;
    },
  };
}
