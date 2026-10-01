import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'artifacts/v2/preservation.json');
const digest=file=>createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
function files(path){return readdirSync(join(root,path),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(path,e.name)):[join(path,e.name)]);}
const selected=['artifacts/advertiser/evidence.json',...['artifacts/phase3','artifacts/phase4','artifacts/phase5','local-state/advertiser-simulation'].filter(p=>existsSync(join(root,p))).flatMap(files)];
if(process.argv.includes('--capture')){if(existsSync(out))throw Error('preservation_baseline_exists');mkdirSync(join(root,'artifacts/v2'),{recursive:true});writeFileSync(out,JSON.stringify({capturedAt:new Date().toISOString(),files:Object.fromEntries(selected.map(p=>[p,digest(p)]))},null,2));console.log({captured:selected.length});}
else{const prior=JSON.parse(readFileSync(out));const changed=Object.entries(prior.files).filter(([p,h])=>!existsSync(join(root,p))||digest(p)!==h).map(([p])=>p);console.log(JSON.stringify({checked:Object.keys(prior.files).length,changed},null,2));if(changed.length)process.exitCode=1;}
