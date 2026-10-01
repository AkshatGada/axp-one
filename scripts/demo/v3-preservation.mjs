import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,statSync,statfsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),path=join(root,'artifacts/v3/preservation.json');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
function files(p){if(!existsSync(p))return [];return statSync(p).isDirectory()?readdirSync(p).flatMap(n=>files(join(p,n))):[p];}
const disk=statfsSync(root);if(disk.bavail*disk.bsize<40*1024**3)throw new Error('40GiB_free_space_floor');
const prefixes=['artifacts/phase3','artifacts/phase4','artifacts/phase5','artifacts/v2','packages/v2','apps/v2-ui','apps/backend/v2.mjs','local-state/v2-wallet','local-state/v2','apps/advertiser-ui'];
if(process.argv.includes('--check')){const m=JSON.parse(readFileSync(path));const changed=m.files.filter(x=>!existsSync(join(root,x.path))||sha(join(root,x.path))!==x.sha256);if(changed.length)throw new Error(`preservation_failed:${changed.map(x=>x.path).join(',')}`);console.log(JSON.stringify({status:'unchanged',files:m.files.length}));}
else {if(existsSync(path))throw new Error('preservation_already_captured');mkdirSync(join(root,'artifacts/v3'),{recursive:true});const m={at:new Date().toISOString(),freeGiB:disk.bavail*disk.bsize/1024**3,files:prefixes.flatMap(p=>files(join(root,p))).map(p=>({path:relative(root,p),sha256:sha(p)}))};writeFileSync(path,JSON.stringify(m,null,2));console.log(JSON.stringify({status:'captured',files:m.files.length,freeGiB:m.freeGiB}));}
