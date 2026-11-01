// Explicit export from the isolated workspace. Public signatures here authenticate
// delivery only; authorization signatures, mandates and session tokens never leave.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {HspStore} from '../../packages/hsp/store.mjs';
import {publicEvidence} from '../../packages/hsp/evidence.mjs';
import {check} from '../../packages/hsp/config.mjs';
const fixture=process.argv.includes('--fixtures'),explicit=process.argv.find(v=>v.startsWith('--fixture-dir='));check(!explicit||fixture,'hsp_fixture_flag_required');const dir=explicit?resolve(explicit.slice('--fixture-dir='.length)):resolve('local-state/hsk-hsp',fixture?'fixture':'qa');
// Never export a running writer: obtain a consistent closed checkpoint first.
try{const lock=JSON.parse(readFileSync(join(dir,'server.lock')));try{process.kill(lock.pid,0);check(false,'hsp_stop_server_before_export');}catch(e){if(e.code!=='ESRCH')throw e;}}catch(e){if(e.code!=='ENOENT')throw e;}
const store=new HspStore(join(dir,'hsp.sqlite')),db=new DatabaseSync(join(dir,'exchange.sqlite'),{readOnly:true});const run=fixture?'hsp-fixture-v1':'hsp-qa-v1';const exchange={require(table,id){check(['charges','receipt_records','publishers'].includes(table),'table_invalid');const row=db.prepare(`SELECT data FROM ${table} WHERE run=? AND id=?`).get(run,id);check(row,'hsp_evidence_row_missing');return JSON.parse(row.data);}};
try{const value=publicEvidence({exchange,store,execution:fixture?'fixture':'actual-hsp-qa'});mkdirSync('artifacts/hsp',{recursive:true});writeFileSync(`artifacts/hsp/${fixture?'fixture':'qa'}-evidence.json`,JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify({exported:true,execution:value.execution,deliveries:value.deliveries.length,contentHash:value.contentHash}));}finally{store.close();db.close();}
