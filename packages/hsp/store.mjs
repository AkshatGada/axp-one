import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {canonical,ContractError} from '../contracts/index.mjs';
export class HspStore {
 constructor(path){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS hsp_payments(charge_id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS hsp_meta(id TEXT PRIMARY KEY,data TEXT NOT NULL);');}
 get(id){const row=this.db.prepare('SELECT data FROM hsp_payments WHERE charge_id=?').get(id);return row?JSON.parse(row.data):null;}
 all(){return this.db.prepare('SELECT data FROM hsp_payments ORDER BY charge_id').all().map(r=>JSON.parse(r.data));}
 save(row){this.db.prepare('INSERT INTO hsp_payments VALUES(?,?) ON CONFLICT(charge_id) DO UPDATE SET data=excluded.data').run(row.chargeId,canonical(row));return row;}
 meta(id,value){if(value!==undefined)this.db.prepare('INSERT INTO hsp_meta VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,canonical(value));const row=this.db.prepare('SELECT data FROM hsp_meta WHERE id=?').get(id);return row?JSON.parse(row.data):null;}
 lock(){this.db.exec('BEGIN IMMEDIATE');const prior=this.meta('lease');let live=false;if(prior){try{process.kill(prior.pid,0);live=true;}catch(e){if(e.code!=='ESRCH')live=true;}}if(live){this.db.exec('ROLLBACK');throw new ContractError('hsp_operation_in_progress',undefined,409);}this.meta('lease',{at:Date.now(),pid:process.pid});this.db.exec('COMMIT');}
 unlock(){this.db.prepare("DELETE FROM hsp_meta WHERE id='lease'").run();}
 close(){this.db.close();}
}
