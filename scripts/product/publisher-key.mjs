// Local operator only. No HTTP routes, providers, wallets or payment workers.
import {existsSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Exchange} from '../../packages/exchange/index.mjs';
import {publisherCredentials} from '../../packages/product/publisher-credentials.mjs';

const args=process.argv.slice(2),action=args.shift();
function option(name){const n=args.indexOf(name);return n<0?undefined:args[n+1];}
if(!['list','issue','rotate','revoke'].includes(action)||!option('--state-dir'))throw new Error('usage: publisher-key.mjs list|issue|rotate|revoke --state-dir PATH [--run-id ID] [--key-id ID] [--out FILENAME] [--scopes comma,list]');
const stateDir=resolve(option('--state-dir')),dbPath=join(stateDir,'exchange.sqlite');
if(!existsSync(dbPath))throw new Error('existing_initialized_workspace_required');
const read=new DatabaseSync(dbPath,{readOnly:true});
let rows;try{rows=read.prepare('SELECT data FROM runs').all().map(r=>JSON.parse(r.data));}finally{read.close();}
const runId=option('--run-id')??(rows.length===1?rows[0].runId:null),run=rows.find(r=>r.runId===runId);
if(!run)throw new Error('explicit_existing_run_required');
const exchange=new Exchange({dbPath,runId,mode:run.mode,...(run.mode!=='synthetic'?{networkState:()=>null}:{})});
try{
  const publishers=exchange.all('publishers');if(publishers.length!==1)throw new Error('single_publisher_workspace_required');
  const credentials=publisherCredentials({exchange,publisherId:publishers[0].publisherId});
  if(action==='list')console.log(JSON.stringify(credentials.list(),null,2));
  else if(action==='revoke'){if(!option('--key-id'))throw new Error('key_id_required');console.log(JSON.stringify(credentials.revoke(option('--key-id'))));}
  else{
    const name=option('--out');if(!name||!/^[a-zA-Z0-9_-]+\.env$/.test(name))throw new Error('fresh_env_filename_required');
    const path=join(stateDir,name);if(existsSync(path))throw new Error('credential_file_exists');
    if(action==='rotate'&&!option('--key-id'))throw new Error('key_id_required');
    // Check output access before changing credential state; recover from a later
    // local write failure by issuing a new key, never printing secrets.
    const options={...(option('--scopes')?{scopes:option('--scopes').split(',')}:{})};
    const result=action==='issue'?credentials.issue(options):credentials.rotate(option('--key-id'),options);
    writeFileSync(path,`AXP_PUBLISHER_API_KEY=${result.apiKey}\nAXP_PUBLISHER_KEY_ID=${result.keyId}\n`,{mode:0o600,flag:'wx'});
    console.log(JSON.stringify({keyId:result.keyId,publisherId:result.publisherId,scopes:result.scopes,credentialFile:path,action}));
  }
}finally{exchange.close();}
