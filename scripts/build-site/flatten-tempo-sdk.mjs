// Bundle only the reachable server SDK dependencies, never workspace secrets.
import {cpSync,existsSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,relative,sep} from 'node:path';

function packageRoot(req,name) {
 let entry;
 try {entry=req.resolve(`${name}/package.json`);}catch {entry=req.resolve(name);}
 let dir=dirname(realpathSync(entry));
 for(;;){const p=join(dir,'package.json');if(existsSync(p)&&JSON.parse(readFileSync(p)).name===name)return dir;const parent=dirname(dir);if(parent===dir)throw new Error(`tempo_dependency_unresolved:${name}`);dir=parent;}
}

export function flattenTempoSDK(sourceRoot,targetRoot) {
 const root=realpathSync(sourceRoot),manifest=JSON.parse(readFileSync(join(root,'package.json')));
 const placements=new Map(),queue=[];
 function place(name,source,dest){
  source=realpathSync(source);const existing=placements.get(dest);
  if(existing){if(existing!==source)throw new Error(`tempo_dependency_conflict:${name}`);return;}
  placements.set(dest,source);queue.push({source,dest});
 }
 const rootRequire=createRequire(join(root,'package.json'));
 for(const name of Object.keys(manifest.dependencies??{}))place(name,packageRoot(rootRequire,name),join(targetRoot,'node_modules',name));
 while(queue.length){
  const {source,dest}=queue.shift(),pkg=JSON.parse(readFileSync(join(source,'package.json'))),req=createRequire(join(source,'package.json'));
  for(const name of Object.keys({...pkg.dependencies,...pkg.optionalDependencies})){
   let child;try{child=packageRoot(req,name);}catch(error){if(pkg.optionalDependencies?.[name])continue;throw error;}
   let found=false;
   for(let current=dest;current.startsWith(targetRoot);current=dirname(current)){
    if(current.endsWith('node_modules'))continue;
    const candidate=join(current,'node_modules',name),placed=placements.get(candidate);
    if(placed){found=placed===child;break;}
    if(current===targetRoot)break;
   }
   if(found)continue;
   const top=join(targetRoot,'node_modules',name);
   place(name,child,placements.has(top)?join(dest,'node_modules',name):top);
  }
 }
 mkdirSync(targetRoot,{recursive:true});
 for(const [dest,source] of [...placements].sort(([a],[b])=>a.length-b.length))cpSync(source,dest,{recursive:true,dereference:true,filter:path=>{const rel=relative(source,path);return rel!=='node_modules'&&!rel.startsWith(`node_modules${sep}`);}});
 writeFileSync(join(targetRoot,'package.json'),JSON.stringify({...manifest,private:true},null,2)+'\n');
 return {packages:placements.size};
}
