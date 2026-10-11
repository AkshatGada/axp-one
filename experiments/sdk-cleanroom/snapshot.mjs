import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const digest=data=>createHash('sha256').update(data).digest('hex');
export function snapshot(root){
  root=resolve(root);const files=[];
  const walk=directory=>{for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.name==='.git'||entry.name==='node_modules'||entry.name==='local-state'||entry.name.startsWith('.env'))continue;
    const path=join(directory,entry.name);
    if(entry.isDirectory())walk(path);
    else if(entry.isFile())files.push({path:relative(root,path).split('\\').join('/'),sha256:digest(readFileSync(path))});
    else throw new Error('snapshot_requires_regular_files');
  }};walk(root);return {algorithm:'sha256',files,treeHash:digest(JSON.stringify(files))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [root,output]=process.argv.slice(2);if(!root||!output)throw new Error('usage: snapshot.mjs SOURCE OUTPUT');
  const value=snapshot(root);mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(value,null,2)+'\n');
  console.log(JSON.stringify({output,files:value.files.length,treeHash:value.treeHash}));
}
