import {DatabaseSync} from 'node:sqlite';
import {chmodSync} from 'node:fs';
import {tempoCheck} from './tempo-wallet.mjs';
const clone=x=>x===undefined?undefined:structuredClone(x);
export class TempoPaymentStore{
 constructor(path){this.db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS tempo_channels(channel_id TEXT PRIMARY KEY, body TEXT NOT NULL)');}
 get(id){const row=this.db.prepare('SELECT body FROM tempo_channels WHERE channel_id=?').get(id);return row?JSON.parse(row.body):undefined;}
 list(){return this.db.prepare('SELECT body FROM tempo_channels ORDER BY channel_id').all().map(row=>JSON.parse(row.body));}
 update(id,mutate){this.db.exec('BEGIN IMMEDIATE');try{const next=mutate(clone(this.get(id)));tempoCheck(next&&!next.then&&next.channelId===id&&next.adapterVersion==='axp.tempo-payments.v1','tempo_store_record_invalid');this.db.prepare('INSERT INTO tempo_channels VALUES(?,?) ON CONFLICT(channel_id) DO UPDATE SET body=excluded.body').run(id,JSON.stringify(next));this.db.exec('COMMIT');return clone(next);}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}
