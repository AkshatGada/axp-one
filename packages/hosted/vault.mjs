// Private run state between serverless invocations: the run directory (SQLite
// files, publisher receipt key, vouchers, signed wires) is packed, gzipped and
// encrypted with AES-256-GCM under AXP_STATE_KEY before it leaves the function.
import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync,statSync,lstatSync} from 'node:fs';
import {join,relative,dirname,resolve,sep} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createCipheriv,createDecipheriv,randomBytes,createHmac} from 'node:crypto';

const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const MAX_SNAPSHOT_BYTES=8*1024*1024;

export function stateKeyFrom(config,{root,allowLocalKey}) {
  const raw=config.AXP_STATE_KEY;
  if(raw){const key=Buffer.from(raw,'base64');if(key.length!==32)fail('state_key_invalid');return key;}
  if(!allowLocalKey)fail('state_key_required');
  // Development only: a generated key file next to the local store.
  const path=join(resolve(root,config.AXP_HOSTED_DATA_DIR||'local-state/hosted'),'state.key');
  if(!existsSync(path)){mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,randomBytes(32).toString('base64'),{mode:0o600,flag:'wx'});}
  const key=Buffer.from(readFileSync(path,'utf8').trim(),'base64');if(key.length!==32)fail('state_key_invalid');return key;
}

/** Keyed, non-reversible identifier (e.g. client IP) for counters. */
export const keyedId=(key,value)=>createHmac('sha256',key).update(`axp-id:${value}`).digest('hex').slice(0,32);

function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=join(dir,e.name);if(e.isSymbolicLink())fail('snapshot_symlink');return e.isDirectory()?files(p):e.isFile()?[p]:[];});}

export function packDirectory(dir,key,{aad}) {
  const entries=existsSync(dir)?files(dir).map(p=>[relative(dir,p).split(sep).join('/'),readFileSync(p).toString('base64'),statSync(p).mode&0o777]):[];
  const plain=gzipSync(Buffer.from(JSON.stringify({v:1,entries})));
  if(plain.length>MAX_SNAPSHOT_BYTES)fail('snapshot_too_large');
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));
  const body=Buffer.concat([c.update(plain),c.final()]);
  return `v1.${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${body.toString('base64')}`;
}

export function unpackDirectory(text,dir,key,{aad}) {
  const [v,iv,tag,body]=String(text).split('.');if(v!=='v1'||!body)fail('snapshot_invalid');
  const d=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));d.setAAD(Buffer.from(aad));d.setAuthTag(Buffer.from(tag,'base64'));
  let plain;try{plain=Buffer.concat([d.update(Buffer.from(body,'base64')),d.final()]);}catch{fail('snapshot_authentication_failed');}
  const {v:version,entries}=JSON.parse(gunzipSync(plain));if(version!==1)fail('snapshot_invalid');
  mkdirSync(dir,{recursive:true,mode:0o700});const base=resolve(dir);
  for(const [rel,b64,mode] of entries) {
    const target=resolve(base,rel);if(!target.startsWith(base+sep))fail('snapshot_path_invalid');
    if(existsSync(target)&&lstatSync(target).isSymbolicLink())fail('snapshot_symlink');
    mkdirSync(dirname(target),{recursive:true,mode:0o700});writeFileSync(target,Buffer.from(b64,'base64'),{mode:mode||0o600});
  }
  return entries.length;
}
