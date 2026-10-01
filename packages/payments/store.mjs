import { DatabaseSync } from 'node:sqlite';
import { chmodSync } from 'node:fs';

const clone = value => value === undefined ? undefined : structuredClone(value);
export function assertState(state) {
  if (state && state.schemaVersion !== 1) throw new Error('unsupported_payment_state_schema');
}
function synchronous(next) {
  if (next && typeof next.then === 'function') throw new Error('async_store_mutator_forbidden');
  assertState(next);
  return next;
}
/** Private snapshots include synthetic signatures. Do not use as public evidence. */
export function createMemoryPaymentStore(snapshot = { schemaVersion: 1, channels: [] }) {
  assertState(snapshot);
  const channels = new Map(snapshot.channels.map(record => {
    assertState(record);
    return [record.channelId, clone(record)];
  }));
  return {
    get: id => clone(channels.get(id)),
    list: () => [...channels.values()].map(clone),
    update(id, mutate) {
      const next = synchronous(mutate(clone(channels.get(id))));
      if (next.channelId !== id) throw new Error('channel_identity_mismatch');
      channels.set(id, clone(next));
      return clone(next);
    },
    snapshot: () => ({ schemaVersion: 1, channels: [...channels.values()].map(clone) }),
  };
}

/** Single local payment worker; short synchronous transactions, never signing/RPC in mutators. */
export class SQLitePaymentStore {
  constructor(path, { readOnly = false } = {}) {
    this.db = new DatabaseSync(path, { readOnly });
    if (!readOnly && path !== ':memory:') chmodSync(path, 0o600);
    if (!readOnly) this.db.exec('CREATE TABLE IF NOT EXISTS c06_payment_state (channel_id TEXT PRIMARY KEY, body TEXT NOT NULL)');
    this.read = this.db.prepare('SELECT body FROM c06_payment_state WHERE channel_id = ?');
    this.write = this.db.prepare('INSERT INTO c06_payment_state VALUES (?, ?) ON CONFLICT(channel_id) DO UPDATE SET body = excluded.body');
  }
  get(id) {
    const row = this.read.get(id);
    const value = row ? JSON.parse(row.body) : undefined;
    assertState(value);
    return value;
  }
  list() {
    return this.db.prepare('SELECT body FROM c06_payment_state ORDER BY channel_id').all().map(row => {
      const value = JSON.parse(row.body); assertState(value); return value;
    });
  }
  update(id, mutate) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const next = synchronous(mutate(this.get(id)));
      if (next.channelId !== id) throw new Error('channel_identity_mismatch');
      this.write.run(id, JSON.stringify(next));
      this.db.exec('COMMIT');
      return clone(next);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  snapshot() { return { schemaVersion: 1, channels: this.list() }; }
  close() { this.db.close(); }
}
