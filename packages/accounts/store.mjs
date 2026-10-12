import {createHash, randomUUID} from 'node:crypto';
import {APP_SCOPES, RESOURCE_LIMITS, validateCampaignInput, validateCredentialInput} from './resources.mjs';
import {DatabaseSync} from 'node:sqlite';
import {chmodSync, closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync} from 'node:fs';
import {join, resolve} from 'node:path';

// Bounded local profile slice, not a wallet/credential authority. Lengths are
// UTF-16 code units: IDs 128, email 254, names 120, description 2000, URL 2048,
// category 80, lists 32, tokens 16384. Per owner: 20 orgs, 50 apps per org,
// 20 live sessions. SQLite pages cap the whole private store at 16 MiB.
const DAY = 86_400_000;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail = (code, status = 400) => {throw Object.assign(new Error(code), {code, status});};
// Canonical JSON v1: sorted object keys, array order preserved, no whitespace.
// The SQL implementation uses the same UTF-8 bytes (not jsonb's display format).
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
const contentHash = input => createHash('sha256').update(canonical(input)).digest('hex');
function exact(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail('invalid_input');
  for (const key of Reflect.ownKeys(input)) {
    if (!fields.includes(key) || !Object.getOwnPropertyDescriptor(input, key)?.enumerable ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key), 'value')) fail('unknown_field');
  }
  for (const key of fields) if (!Object.hasOwn(input, key)) fail('missing_field');
}
function text(value, max, empty = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) fail('invalid_input');
  const result = value.trim();
  if (!empty && !result) fail('invalid_input');
  return result;
}
function identity(value) {
  const result = text(value, 128);
  if (result !== value || /\s/u.test(result)) fail('invalid_input');
  return result;
}
function resourceIdentity(value) {
  try {return identity(value);} catch {fail('not_found', 404);}
}
function secret(value, max, min = 1) {
  if (typeof value !== 'string' || value.length < min || value.length > max || /\s/u.test(value)) fail('invalid_input');
  return value;
}
function website(value, originOnly = false) {
  const raw = text(value, 2048);
  if (raw !== value || /[\s\\]/u.test(raw)) fail('invalid_url');
  let url;
  try {url = new URL(raw);} catch {fail('invalid_url');}
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!url.hostname || url.username || url.password || raw.includes('*') ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) fail('invalid_url');
  // Comparing the raw authority suffix catches even normalized /./, empty ?/#,
  // and percent-encoded paths rather than silently granting a broader origin.
  if (originOnly && !/^https?:\/\/[^/?#]+\/?$/u.test(raw)) fail('invalid_url');
  return originOnly ? url.origin : url.href;
}
function list(input, validate) {
  if (!Array.isArray(input) || input.length > 32) fail('invalid_input');
  const values = [];
  for (let i = 0; i < input.length; i++) values.push(validate(input[i]));
  if (new Set(values).size !== values.length) fail('invalid_input');
  return values;
}
function payout(input) {
  if (input === null) return null;
  exact(input, ['network', 'address']);
  const address = text(input.address, 64);
  if (address !== input.address) fail('invalid_payout');
  if (input.network === 'tempo-testnet') {
    if (!/^0x[0-9a-fA-F]{40}$/u.test(address)) fail('invalid_payout');
  } else if (input.network === 'solana-devnet') {
    if (address.length < 32 || address.length > 44) fail('invalid_payout');
    let number = 0n;
    for (const char of address) {
      const digit = BASE58.indexOf(char);
      if (digit < 0) fail('invalid_payout');
      number = number * 58n + BigInt(digit);
    }
    const leadingZeros = address.match(/^1*/u)[0].length;
    let bytes = 0;
    while (number) {bytes++; number >>= 8n;}
    if (leadingZeros + bytes !== 32) fail('invalid_payout');
  } else fail('invalid_payout');
  // Shape only: even the zero address has valid shape, not verified ownership.
  return {network: input.network, address};
}

// Shared boundary for the offline fixture store and the Supabase repository.
// PostgreSQL separately enforces ownership; these checks never confer authority.
export function validateAccountInput(operation, input) {
  if (operation === 'updateProfile') {
    exact(input, ['displayName']);
    return {displayName: text(input.displayName, 120, true)};
  }
  if (operation === 'createOrganization') {
    exact(input, ['name']);
    return {name: text(input.name, 120)};
  }
  if (operation === 'saveAdvertiser') {
    exact(input, ['name', 'website', 'description']);
    return {name: text(input.name, 120), website: website(input.website), description: text(input.description, 2000, true)};
  }
  if (operation === 'saveApp') {
    exact(input, ['name', 'website', 'allowedOrigins', 'blockedCategories', 'payout']);
    return {name: text(input.name, 120), website: website(input.website),
      allowedOrigins: list(input.allowedOrigins, value => website(value, true)),
      blockedCategories: list(input.blockedCategories, value => text(value, 80)), payout: payout(input.payout)};
  }
  fail('invalid_input');
}

export function createAccountStore({dir, now = Date.now} = {}) {
  if (typeof dir !== 'string' || !dir || typeof now !== 'function') fail('invalid_input');
  const directory = resolve(dir);
  if (directory === '/') fail('invalid_input');
  const filename = join(directory, 'accounts.sqlite');
  let db;
  try {
    mkdirSync(directory, {recursive: true, mode: 0o700});
    if (!lstatSync(directory).isDirectory()) fail('unsafe_storage', 500);
    chmodSync(directory, 0o700);
    // Precreate before SQLite opens it so secrets never enter a world-readable
    // file, even with a permissive umask. Refuse symlinks/hard links.
    const fd = openSync(filename, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1) fail('unsafe_storage', 500);
      chmodSync(filename, 0o600);
    } finally {closeSync(fd);}
    for (const suffix of ['-journal', '-wal', '-shm']) {
      const sidecar = filename + suffix;
      if (existsSync(sidecar)) {
        const stat = lstatSync(sidecar);
        if (!stat.isFile() || stat.nlink !== 1) fail('unsafe_storage', 500);
        chmodSync(sidecar, 0o600);
      }
    }
    db = new DatabaseSync(filename);
    // DELETE journal mode keeps accounts.sqlite a self-contained closed snapshot.
    // SQLite journals inherit the private database mode; the directory is 0700.
    db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON;
      PRAGMA max_page_count=4096;
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, displayName TEXT NOT NULL DEFAULT ''
      ) STRICT;
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY, ownerId TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS organizations_owner ON organizations(ownerId);
      CREATE TABLE IF NOT EXISTS advertisers (
        id TEXT PRIMARY KEY, organizationId TEXT NOT NULL UNIQUE REFERENCES organizations(id),
        name TEXT NOT NULL, website TEXT NOT NULL, description TEXT NOT NULL,
        createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY, organizationId TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL, website TEXT NOT NULL, allowedOrigins TEXT NOT NULL,
        blockedCategories TEXT NOT NULL, payout TEXT NOT NULL,
        createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS apps_org ON apps(organizationId);
      CREATE UNIQUE INDEX IF NOT EXISTS advertisers_binding ON advertisers(id,organizationId);
      CREATE UNIQUE INDEX IF NOT EXISTS apps_binding ON apps(id,organizationId);
      CREATE TABLE IF NOT EXISTS account_campaigns (
        id TEXT PRIMARY KEY, organizationId TEXT NOT NULL REFERENCES organizations(id),
        advertiserId TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>0),
        status TEXT NOT NULL CHECK(status IN ('draft','approved')), input TEXT NOT NULL,
        approvedContentHash TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL,
        FOREIGN KEY(advertiserId,organizationId) REFERENCES advertisers(id,organizationId),
        CHECK((status='draft' AND approvedContentHash IS NULL) OR
          (status='approved' AND length(approvedContentHash)=64))
      ) STRICT;
      CREATE INDEX IF NOT EXISTS account_campaigns_org ON account_campaigns(organizationId,createdAt,id);
      CREATE TABLE IF NOT EXISTS account_app_credentials (
        id TEXT PRIMARY KEY, organizationId TEXT NOT NULL REFERENCES organizations(id),
        appId TEXT NOT NULL, label TEXT NOT NULL, keyHash TEXT NOT NULL UNIQUE
          CHECK(length(keyHash)=64 AND keyHash NOT GLOB '*[^a-f0-9]*'),
        createdAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL, revokedAt INTEGER,
        FOREIGN KEY(appId,organizationId) REFERENCES apps(id,organizationId),
        CHECK(expiresAt=createdAt+2592000000)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS account_app_credentials_app ON account_app_credentials(appId,createdAt,id);
      CREATE TRIGGER IF NOT EXISTS account_campaign_binding BEFORE UPDATE ON account_campaigns
      WHEN NEW.id<>OLD.id OR NEW.organizationId<>OLD.organizationId OR
        NEW.advertiserId<>OLD.advertiserId OR NEW.createdAt<>OLD.createdAt
      BEGIN SELECT RAISE(ABORT,'immutable_binding'); END;
      CREATE TRIGGER IF NOT EXISTS account_credential_binding BEFORE UPDATE ON account_app_credentials
      WHEN NEW.id<>OLD.id OR NEW.organizationId<>OLD.organizationId OR NEW.appId<>OLD.appId OR
        NEW.keyHash<>OLD.keyHash OR NEW.label<>OLD.label OR NEW.createdAt<>OLD.createdAt OR
        NEW.expiresAt<>OLD.expiresAt OR (OLD.revokedAt IS NOT NULL AND NEW.revokedAt IS NOT OLD.revokedAt)
      BEGIN SELECT RAISE(ABORT,'immutable_credential'); END;
      CREATE TABLE IF NOT EXISTS sessions (
        hash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
        accessToken TEXT NOT NULL, refreshToken TEXT NOT NULL, expiresAt INTEGER NOT NULL,
        absoluteExpiresAt INTEGER NOT NULL, csrf TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(userId);
      COMMIT;`);
  } catch (error) {
    try {db?.close();} catch {}
    if (error.code === 'unsafe_storage') throw error;
    fail('store_unavailable', 503);
  }
  let closed = false;
  const timestamp = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid_time', 500);
    return value;
  };
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const publicUser = userId => {
    const row = get('SELECT id,email,displayName FROM users WHERE id=?', identity(userId));
    if (!row) fail('not_found', 404);
    return {...row};
  };
  const owned = (userId, orgId) => {
    const row = get(`SELECT id,name,'owner' AS role,createdAt,updatedAt
      FROM organizations WHERE id=? AND ownerId=?`, resourceIdentity(orgId), identity(userId));
    if (!row) fail('not_found', 404);
    return {...row};
  };
  const appRecord = row => row ? {...row, allowedOrigins: JSON.parse(row.allowedOrigins),
    blockedCategories: JSON.parse(row.blockedCategories), payout: JSON.parse(row.payout)} : null;
  const campaignRecord = row => row ? {...row, input: JSON.parse(row.input), servingStatus: 'not_connected'} : null;
  const credentialRecord = row => row ? {id: row.id, organizationId: row.organizationId,
    appId: row.appId, publisherId: `app:${row.appId}`, label: row.label, scopes: [...APP_SCOPES],
    createdAt: row.createdAt, expiresAt: row.expiresAt, revokedAt: row.revokedAt} : null;
  const ownedApp = (userId, orgId, appId) => {
    owned(userId, orgId);
    const app = get('SELECT * FROM apps WHERE id=? AND organizationId=?', resourceIdentity(appId), orgId);
    if (!app) fail('not_found', 404);
    return app;
  };
  const ownedCampaign = (userId, orgId, campaignId) => {
    owned(userId, orgId);
    const row = get('SELECT * FROM account_campaigns WHERE id=? AND organizationId=?', resourceIdentity(campaignId), orgId);
    if (!row) fail('not_found', 404);
    return row;
  };
  const ownedCredential = (userId, orgId, appId, keyId) => {
    ownedApp(userId, orgId, appId);
    const row = get('SELECT * FROM account_app_credentials WHERE id=? AND organizationId=? AND appId=?', resourceIdentity(keyId), orgId, appId);
    if (!row) fail('not_found', 404);
    return row;
  };
  const insertCredential = (orgId, appId, input, time) => {
    const {label, keyHash} = validateCredentialInput(input, {withHash: true});
    if (get('SELECT count(*) AS n FROM account_app_credentials WHERE appId=? AND revokedAt IS NULL AND expiresAt>?', appId, time).n >= RESOURCE_LIMITS.activeKeys) fail('limit_exceeded', 409);
    if (get('SELECT id FROM account_app_credentials WHERE keyHash=?', keyHash)) fail('credential_hash_conflict', 409);
    const id = randomUUID();
    run('INSERT INTO account_app_credentials VALUES(?,?,?,?,?,?,?,NULL)', id, orgId, appId, label, keyHash, time, time + RESOURCE_LIMITS.keyLifetimeMs);
    return credentialRecord(get('SELECT * FROM account_app_credentials WHERE id=?', id));
  };
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try {const result = fn(); db.exec('COMMIT'); return result;}
    catch (error) {db.exec('ROLLBACK'); throw error;}
  };
  // Hide SQLite diagnostics (which can include private input) behind safe codes.
  const safe = fn => (...args) => {
    if (closed) fail('store_closed', 503);
    try {return fn(...args);} catch (error) {
      if (error instanceof Error && Number.isInteger(error.status) &&
          /^[a-z_]+$/u.test(error.code ?? '')) throw error;
      if (error.errcode === 13) fail('limit_exceeded', 409);
      fail('store_unavailable', 503);
    }
  };

  const store = {
    // TRUST BOUNDARY: caller must pass the provider-verified identity, never a
    // request body or an unverified decoded JWT. Email is metadata, not a key.
    ensureUser: safe(input => {
      exact(input, ['id', 'email']);
      const id = identity(input.id), email = text(input.email, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) fail('invalid_input');
      return transaction(() => {
        run(`INSERT INTO users(id,email) VALUES(?,?)
          ON CONFLICT(id) DO UPDATE SET email=excluded.email`, id, email);
        return publicUser(id);
      });
    }),
    user: safe(publicUser),
    updateProfile: safe((userId, input) => {
      exact(input, ['displayName']);
      const displayName = text(input.displayName, 120, true);
      return transaction(() => {
        publicUser(userId);
        run('UPDATE users SET displayName=? WHERE id=?', displayName, userId);
        return publicUser(userId);
      });
    }),
    organizations: safe(userId => {
      publicUser(userId);
      return all(`SELECT id,name,'owner' AS role,createdAt,updatedAt FROM organizations
        WHERE ownerId=? ORDER BY createdAt,id`, userId).map(row => ({...row}));
    }),
    createOrganization: safe((userId, input) => {
      exact(input, ['name']);
      const name = text(input.name, 120);
      return transaction(() => {
        publicUser(userId);
        if (get('SELECT count(*) AS n FROM organizations WHERE ownerId=?', userId).n >= 20) fail('limit_exceeded', 409);
        const id = randomUUID(), time = timestamp();
        run('INSERT INTO organizations VALUES(?,?,?,?,?)', id, userId, name, time, time);
        return owned(userId, id);
      });
    }),
    organization: safe(owned),
    details: safe((userId, orgId) => transaction(() => ({
      organization: owned(userId, orgId),
      advertiser: (() => {const row = get('SELECT * FROM advertisers WHERE organizationId=?', orgId); return row ? {...row} : null;})(),
      apps: all('SELECT * FROM apps WHERE organizationId=? ORDER BY createdAt,id', orgId).map(appRecord),
    }))),
    saveAdvertiser: safe((userId, orgId, input) => transaction(() => {
      owned(userId, orgId);
      exact(input, ['name', 'website', 'description']);
      const name = text(input.name, 120), url = website(input.website), description = text(input.description, 2000, true);
      const previous = get('SELECT id,createdAt FROM advertisers WHERE organizationId=?', orgId);
      const id = previous?.id ?? randomUUID(), time = timestamp();
      run(`INSERT INTO advertisers VALUES(?,?,?,?,?,?,?) ON CONFLICT(organizationId)
        DO UPDATE SET name=excluded.name,website=excluded.website,
        description=excluded.description,updatedAt=excluded.updatedAt`,
      id, orgId, name, url, description, previous?.createdAt ?? time, time);
      return {...get('SELECT * FROM advertisers WHERE organizationId=?', orgId)};
    })),
    saveApp: safe((userId, orgId, input, appId = null) => transaction(() => {
      owned(userId, orgId);
      let previous;
      if (appId !== null) {
        previous = get('SELECT * FROM apps WHERE id=? AND organizationId=?', resourceIdentity(appId), orgId);
        if (!previous) fail('not_found', 404);
      }
      exact(input, ['name', 'website', 'allowedOrigins', 'blockedCategories', 'payout']);
      const name = text(input.name, 120), url = website(input.website);
      const origins = list(input.allowedOrigins, value => website(value, true));
      const categories = list(input.blockedCategories, value => text(value, 80));
      const declaredPayout = payout(input.payout);
      if (!previous && get('SELECT count(*) AS n FROM apps WHERE organizationId=?', orgId).n >= 50) fail('limit_exceeded', 409);
      const id = previous?.id ?? randomUUID(), time = timestamp();
      run(`INSERT INTO apps VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id)
        DO UPDATE SET name=excluded.name,website=excluded.website,allowedOrigins=excluded.allowedOrigins,
        blockedCategories=excluded.blockedCategories,payout=excluded.payout,updatedAt=excluded.updatedAt`,
      id, orgId, name, url, JSON.stringify(origins), JSON.stringify(categories),
      JSON.stringify(declaredPayout), previous?.createdAt ?? time, time);
      return appRecord(get('SELECT * FROM apps WHERE id=? AND organizationId=?', id, orgId));
    })),
    putSession: safe(input => {
      exact(input, ['hash', 'userId', 'accessToken', 'refreshToken', 'expiresAt', 'absoluteExpiresAt', 'csrf']);
      const hash = secret(input.hash, 128, 32), userId = identity(input.userId);
      const accessToken = secret(input.accessToken, 16384), refreshToken = secret(input.refreshToken, 16384);
      const csrf = secret(input.csrf, 256, 16);
      const {expiresAt, absoluteExpiresAt} = input;
      return transaction(() => {
        publicUser(userId);
        const time = timestamp();
        if (![expiresAt, absoluteExpiresAt].every(Number.isSafeInteger) ||
            expiresAt <= 0 || absoluteExpiresAt <= time ||
            absoluteExpiresAt > time + 7 * DAY) fail('invalid_expiry');
        const previous = get('SELECT userId,expiresAt,absoluteExpiresAt FROM sessions WHERE hash=?', hash);
        if (previous && previous.userId !== userId) fail('session_binding', 409);
        // Refresh cannot extend the original absolute lifetime or resurrect an
        // expired cookie. Sign-in must issue a fresh opaque session instead.
        if (previous && (previous.absoluteExpiresAt <= time ||
            absoluteExpiresAt !== previous.absoluteExpiresAt)) fail('invalid_expiry');
        run('DELETE FROM sessions WHERE absoluteExpiresAt<=?', time);
        if (!previous && get('SELECT count(*) AS n FROM sessions WHERE userId=?', userId).n >= 20) fail('limit_exceeded', 409);
        run(`INSERT INTO sessions VALUES(?,?,?,?,?,?,?) ON CONFLICT(hash) DO UPDATE SET
          accessToken=excluded.accessToken,refreshToken=excluded.refreshToken,
          expiresAt=excluded.expiresAt,csrf=excluded.csrf`,
        hash, userId, accessToken, refreshToken, expiresAt, absoluteExpiresAt, csrf);
      });
    }),
    session: safe(hash => {
      secret(hash, 128, 32);
      const row = get('SELECT * FROM sessions WHERE hash=?', hash), time = timestamp();
      return row && row.absoluteExpiresAt > time ? {...row} : null;
    }),
    deleteSession: safe(hash => {secret(hash, 128, 32); run('DELETE FROM sessions WHERE hash=?', hash);}),
    close() {
      if (!closed) {db.close(); closed = true;}
    },
  };
  // Additive capabilities are non-enumerable to preserve the original profile
  // adapter's key enumeration contract. This factory is explicitly an offline
  // SQLite fixture; real-provider wiring must install the Supabase repository.
  const resources = {
    campaigns: safe((userId, orgId) => {
      owned(userId, orgId);
      return all('SELECT * FROM account_campaigns WHERE organizationId=? ORDER BY createdAt,id', orgId).map(campaignRecord);
    }),
    campaign: safe((userId, orgId, campaignId) => campaignRecord(ownedCampaign(userId, orgId, campaignId))),
    saveCampaign: safe((userId, orgId, input, campaignId = null) => transaction(() => {
      owned(userId, orgId);
      const previous = campaignId === null ? null : ownedCampaign(userId, orgId, campaignId);
      const advertiser = get('SELECT id FROM advertisers WHERE organizationId=?', orgId);
      if (!advertiser) fail('not_found', 404);
      const normalized = validateCampaignInput(input), time = timestamp();
      if (!previous && get('SELECT count(*) AS n FROM account_campaigns WHERE organizationId=?', orgId).n >= RESOURCE_LIMITS.campaigns) fail('limit_exceeded', 409);
      const id = previous?.id ?? randomUUID();
      if (previous) run("UPDATE account_campaigns SET input=?,version=version+1,status='draft',approvedContentHash=NULL,updatedAt=? WHERE id=?", JSON.stringify(normalized), time, id);
      else run("INSERT INTO account_campaigns VALUES(?,?,?,1,'draft',?,NULL,?,?)", id, orgId, advertiser.id, JSON.stringify(normalized), time, time);
      return campaignRecord(get('SELECT * FROM account_campaigns WHERE id=?', id));
    })),
    approveCampaign: safe((userId, orgId, campaignId, expectedVersion) => transaction(() => {
      const row = ownedCampaign(userId, orgId, campaignId);
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) fail('invalid_input');
      if (row.version !== expectedVersion) fail('campaign_version_conflict', 409);
      run("UPDATE account_campaigns SET status='approved',approvedContentHash=?,updatedAt=? WHERE id=?", contentHash(JSON.parse(row.input)), timestamp(), row.id);
      return campaignRecord(get('SELECT * FROM account_campaigns WHERE id=?', row.id));
    })),
    appCredentials: safe((userId, orgId, appId) => {
      ownedApp(userId, orgId, appId);
      return all('SELECT * FROM account_app_credentials WHERE appId=? AND organizationId=? ORDER BY createdAt,id', appId, orgId).map(credentialRecord);
    }),
    issueAppCredential: safe((userId, orgId, appId, input) => transaction(() => {
      ownedApp(userId, orgId, appId);
      return insertCredential(orgId, appId, input, timestamp());
    })),
    revokeAppCredential: safe((userId, orgId, appId, keyId) => transaction(() => {
      const row = ownedCredential(userId, orgId, appId, keyId);
      run('UPDATE account_app_credentials SET revokedAt=coalesce(revokedAt,?) WHERE id=?', timestamp(), row.id);
      return credentialRecord(get('SELECT * FROM account_app_credentials WHERE id=?', row.id));
    })),
    rotateAppCredential: safe((userId, orgId, appId, keyId, input) => transaction(() => {
      const row = ownedCredential(userId, orgId, appId, keyId), time = timestamp();
      if (row.revokedAt !== null || row.expiresAt <= time) fail('credential_not_active', 409);
      run('UPDATE account_app_credentials SET revokedAt=? WHERE id=?', time, row.id);
      return insertCredential(orgId, appId, input, time);
    })),
    resolveAppCredential: safe(keyHash => {
      if (typeof keyHash !== 'string' || !/^[a-f0-9]{64}$/.test(keyHash)) return null;
      const row = get('SELECT * FROM account_app_credentials WHERE keyHash=? AND revokedAt IS NULL AND expiresAt>?', keyHash, timestamp());
      if (!row) return null;
      const app = get('SELECT * FROM apps WHERE id=? AND organizationId=?', row.appId, row.organizationId);
      return app ? {credential: credentialRecord(row), app: appRecord(app)} : null;
    }),
  };
  Object.defineProperties(store, Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, {value}])));
  return store;
}
