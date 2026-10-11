import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';

// Single local app process; commit identity before external IO.
export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, owner TEXT UNIQUE, csrf TEXT);
      CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY, session_id TEXT, request_id TEXT,
        content TEXT, consent INTEGER, input TEXT, answer TEXT, answer_state TEXT,
        ad_state TEXT, ad_result TEXT, delivery_state TEXT, receipt TEXT, error_code TEXT,
        UNIQUE(session_id, request_id));
      UPDATE turns SET ad_state='unknown' WHERE ad_state='requesting';
      UPDATE turns SET delivery_state='unknown' WHERE delivery_state='submitting';
      UPDATE turns SET answer_state='error' WHERE answer_state='pending';`);
  }
  session(owner) { return this.db.prepare('SELECT * FROM sessions WHERE owner=?').get(owner ?? ''); }
  createSession() {
    const s = { id: randomUUID(), owner: randomBytes(32).toString('hex'), csrf: randomBytes(32).toString('hex') };
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(s.id, s.owner, s.csrf); return s;
  }
  turns(sessionId) { return this.db.prepare('SELECT * FROM turns WHERE session_id=? ORDER BY rowid').all(sessionId).map(decode); }
  turn(id, sessionId) { return decode(this.db.prepare('SELECT * FROM turns WHERE id=? AND session_id=?').get(id, sessionId)); }
  admit(session, { requestId, content, consent }) {
    const existing = this.db.prepare('SELECT * FROM turns WHERE session_id=? AND request_id=?').get(session.id, requestId);
    if (existing) {
      if (existing.content !== content || Boolean(existing.consent) !== consent) throw new Error('turn_conflict');
      return { turn: decode(existing), fresh: false };
    }
    const id = randomUUID(), share = consent && content.length <= 1200;
    const input = share ? { question: content, sessionId: session.id, turnId: id,
      placementId: 'chat-sponsored-card', requiredCapabilities: ['software_development'], excludedCategories: [] } : null;
    this.db.prepare(`INSERT INTO turns(id,session_id,request_id,content,consent,input,answer_state,ad_state)
      VALUES(?,?,?,?,?,?,?,?)`).run(id, session.id, requestId, content, Number(consent), JSON.stringify(input),
        'pending', share ? 'requesting' : consent ? 'question_too_long' : 'sharing_off');
    return { turn: this.turn(id, session.id), fresh: true };
  }
  update(id, values) {
    const allowed = new Set(['answer','answer_state','ad_state','ad_result','delivery_state','receipt','error_code']);
    if (Object.keys(values).some(k => !allowed.has(k))) throw new Error('invalid_update');
    this.db.prepare(`UPDATE turns SET ${Object.keys(values).map(k => `${k}=?`).join(',')} WHERE id=?`)
      .run(...Object.entries(values).map(([k,v]) => ['ad_result','receipt'].includes(k) ? JSON.stringify(v) : v), id);
  }
  close() { this.db.close(); }
}
function decode(row) {
  if (!row) return undefined;
  return { ...row, input: JSON.parse(row.input ?? 'null'), ad_result: JSON.parse(row.ad_result ?? 'null'), receipt: JSON.parse(row.receipt ?? 'null') };
}
