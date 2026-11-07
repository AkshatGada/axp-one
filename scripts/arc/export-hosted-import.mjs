// Operator-only export of encrypted shards + a scoped import proof. No network,
// signatures, broadcasts, resets or wallet reads. Stop the local server first.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createConnection} from 'node:net';
import {resolve,join} from 'node:path';
import {createFileKV} from '../../packages/hosted/kv.mjs';
import {productStateKey} from '../../packages/product/hosted.mjs';
import {ARC_WORKSPACE} from '../../packages/arc/hosted.mjs';
import {importProof} from '../../packages/arc/hosted-import.mjs';

const running=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:3450});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});
if(running)throw Error('Stop the local Arc backend before exporting its financial ownership.');
const state=resolve('local-state/arc/hosted-local'),output=resolve('local-state/arc/hosting');
const key=Buffer.from(readFileSync(join(state,'state-key'),'utf8').trim(),'base64');if(key.length!==32)throw Error('arc_import_key_invalid');
const kv=createFileKV({dir:join(state,'kv')}),rows={};
for(const kind of ['financial','organic']){
  const raw=await kv.get(productStateKey(ARC_WORKSPACE,kind));if(!raw)throw Error('arc_import_source_missing');
  const row=JSON.parse(raw);if(row.lease!==null)throw Error('arc_import_source_busy');rows[kind]=raw;
}
mkdirSync(output,{recursive:true,mode:0o700});
writeFileSync(join(output,'import-body.json'),JSON.stringify(rows),{mode:0o600,flag:'wx'});
writeFileSync(join(output,'import-curl.conf'),`header = "Content-Type: application/json"\nheader = "x-axp-arc-import-proof: ${importProof(key,rows)}"\n`,{mode:0o600,flag:'wx'});
console.log(JSON.stringify({prepared:true,workspaceId:ARC_WORKSPACE,shards:2,providerCalls:0,broadcasts:0}));
