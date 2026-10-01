import {DatabaseSync} from 'node:sqlite';
import {chmodSync} from 'node:fs';

const encode=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?{$axpBigInt:x.toString()}:x);
const decode=s=>JSON.parse(s,(_,x)=>x&&Object.keys(x).length===1&&typeof x.$axpBigInt==='string'?BigInt(x.$axpBigInt):x);
/** One local trusted worker. Async SDK mutators serialize outside SQLite locks. */
export class NativeSessionStore {
  constructor(path) {this.db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);this.db.exec('CREATE TABLE IF NOT EXISTS native_sessions(id TEXT PRIMARY KEY,body TEXT NOT NULL)');this.queues=new Map();}
  async getChannel(id) {const r=this.db.prepare('SELECT body FROM native_sessions WHERE id=?').get(id);return r?decode(r.body):undefined;}
  async listChannels(filter={}) {return this.db.prepare('SELECT body FROM native_sessions').all().map(r=>decode(r.body)).filter(s=>(filter.sealed===undefined||s.sealed===filter.sealed)&&(filter.closePending===undefined||(s.closeRequestedAt!==undefined)===filter.closePending));}
  updateChannel(id,mutator) {const previous=this.queues.get(id)??Promise.resolve();const next=previous.catch(()=>{}).then(async()=>{const current=await this.getChannel(id),value=await mutator(current);if(value.channelId!==id||value.schemaVersion!==1)throw new Error('native_state_invalid');this.db.prepare('INSERT INTO native_sessions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(id,encode(value));return structuredClone(value);});this.queues.set(id,next);return next;}
  markSealed(id) {return this.updateChannel(id,s=>({...s,sealed:true}));}
  async deleteChannel() {throw new Error('native_history_preserved');}
  close() {this.db.close();}
}
