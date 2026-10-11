import {existsSync,readFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tempoCheck} from './tempo-wallet.mjs';
const repositoryRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),cache=new Map();
export function tempoSDKRoot(){return resolve(process.env.AXP_TEMPO_SDK_ROOT??(existsSync(join(repositoryRoot,'local-state/tempo-sdk/node_modules'))?join(repositoryRoot,'local-state/tempo-sdk'):join(repositoryRoot,'tooling/tempo-sdk')));}
export async function loadTempoSDK(root=tempoSDKRoot()){
 root=resolve(root);if(cache.has(root))return cache.get(root);
 const pending=(async()=>{for(const [name,version] of [['mppx','0.13.4'],['viem','2.57.4']]){let pkg;try{pkg=JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'),'utf8'));}catch{tempoCheck(false,'tempo_sdk_unavailable');}tempoCheck(pkg.version===version,'tempo_sdk_version_mismatch');}
  const req=createRequire(join(root,'package.json')),module=name=>import(pathToFileURL(req.resolve(name).replace('/_cjs/','/_esm/')).href);
  const [tempo,viem,actions,accounts,chains,viemTempo]=await Promise.all(['mppx/tempo','viem','viem/actions','viem/accounts','viem/chains','viem/tempo'].map(module));
  return {Session:tempo.Session,viem,actions,accounts,chains,viemTempo,manifest:{mppx:'0.13.4',viem:'2.57.4',protocol:'TIP-1034-v2'}};
 })();cache.set(root,pending);try{return await pending;}catch(e){cache.delete(root);throw e;}
}
