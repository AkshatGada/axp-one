/** Read-only task/run storage guard. Never follows symlinks or deletes state. */
import {lstatSync,readdirSync,realpathSync,statfsSync} from 'node:fs';
import {resolve,relative,join,isAbsolute} from 'node:path';
import {demand} from './legacy.mjs';
export function createDevnetResourceProbe({taskStateRoot,runDirectory}){
 const root=resolve(taskStateRoot),run=resolve(runDirectory),part=relative(root,run);demand(realpathSync(root)===root&&realpathSync(run)===run&&part&&part!=='..'&&!part.startsWith('../')&&!isAbsolute(part),'RESOURCE_PATH');
 function allocated(path,seen=new Set()){const s=lstatSync(path),id=s.dev+':'+s.ino;if(seen.has(id))return 0;seen.add(id);let n=(s.blocks??Math.ceil(s.size/512))*512;if(s.isDirectory()&&!s.isSymbolicLink())for(const name of readdirSync(path))n+=allocated(join(path,name),seen);return n;}
 return ()=>{const fs=statfsSync(root,{bigint:true});return {freeBytes:Number(fs.bavail*fs.bsize),totalTaskBytes:allocated(root),appBytes:allocated(run)};};
}
