// Copy the built native payment SDK (local-state/phase4-sdk: a store of packages linked by
// relative symlinks) into a symlink-free node_modules tree for a serverless function.
// Packages are hoisted by name; a conflicting version is nested under its dependent.
// Every dependency edge is re-resolved with Node's lookup rules and must hit the same
// package version as in the source tree. Module files are copied byte for byte, so the
// loader's emitted-module hash checks still apply.
import {readdirSync,readFileSync,lstatSync,realpathSync,existsSync,mkdirSync,cpSync,copyFileSync,writeFileSync} from 'node:fs';
import {join,dirname,relative,sep} from 'node:path';

const fail=code=>{throw new Error(code);};
const pkgInfo=dir=>{const j=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));return {name:j.name,version:j.version};};
// Symlinked dependency directories inside <pkg>/node_modules (scoped names included).
function linkedDeps(pkgDir) {
  const nm=join(pkgDir,'node_modules'),out=[];if(!existsSync(nm))return out;
  for(const e of readdirSync(nm,{withFileTypes:true})) {
    const entries=e.name.startsWith('@')&&e.isDirectory()&&!lstatSync(join(nm,e.name)).isSymbolicLink()?readdirSync(join(nm,e.name)).map(n=>`${e.name}/${n}`):[e.name];
    for(const name of entries){const p=join(nm,name);if(!lstatSync(p).isSymbolicLink())continue;const target=realpathSync(p);if(target!==realpathSync(pkgDir))out.push({name,target});}
  }
  return out;
}

export function flattenSDK(sourceRoot,targetRoot) {
  const src=realpathSync(sourceRoot);
  // Nodes: every reachable package directory (real path), starting from the root links.
  const nodes=new Map(),queue=[];
  const add=dir=>{dir=realpathSync(dir);if(!nodes.has(dir)){nodes.set(dir,{dir,...pkgInfo(dir),deps:linkedDeps(dir)});queue.push(dir);}return dir;};
  const rootNm=join(src,'node_modules');
  const rootEntries=[];
  for(const e of readdirSync(rootNm,{withFileTypes:true})) {
    const names=e.name.startsWith('@')?readdirSync(join(rootNm,e.name)).map(n=>`${e.name}/${n}`):[e.name];
    for(const name of names)rootEntries.push({name,dir:add(join(rootNm,name))});
  }
  while(queue.length){const n=nodes.get(queue.shift());for(const d of n.deps)add(d.target);}
  // Hoist: root entries first, then the most-depended-on version per name.
  const want=new Map();for(const n of nodes.values())for(const d of n.deps)want.set(d.target,(want.get(d.target)??0)+1);
  const top=new Map();for(const r of rootEntries)top.set(r.name,r.dir);
  for(const n of [...nodes.values()].sort((a,b)=>(want.get(b.dir)??0)-(want.get(a.dir)??0)))if(!top.has(n.name))top.set(n.name,n.dir);
  const placements=new Map();// location -> source dir
  for(const [name,dir] of top)placements.set(join('node_modules',name),dir);
  const located=dir=>[...placements].filter(([,d])=>d===dir).map(([l])=>l);
  // Node's lookup: <D>/node_modules/<name> for every ancestor D of the package dir that is
  // not itself a node_modules dir, nearest first, ending at the root.
  const resolveFrom=(loc,name)=>{for(let cur=loc;;cur=dirname(cur)){if(!cur.endsWith('node_modules')){const cand=cur==='.'?join('node_modules',name):join(cur,'node_modules',name);if(placements.has(cand))return placements.get(cand);}if(cur==='.')return undefined;}};
  // Nest conflicting versions under each dependent location until every edge resolves.
  for(let changed=true,guard=0;changed;guard++) {
    if(guard>20)fail('sdk_flatten_no_fixpoint');changed=false;
    for(const n of nodes.values())for(const loc of located(n.dir))for(const d of n.deps) {
      if(resolveFrom(loc,d.name)===d.target)continue;
      placements.set(join(loc,'node_modules',d.name),d.target);changed=true;
    }
  }
  // Final check of every edge, including Node's lookup from each placement.
  for(const [loc,dir] of placements)for(const d of nodes.get(dir).deps)if(resolveFrom(loc,d.name)!==d.target)fail(`sdk_flatten_unresolved:${loc}:${d.name}`);
  // Copy (without each package's own symlink node_modules), then the manifest.
  mkdirSync(targetRoot,{recursive:true});
  for(const [loc,dir] of [...placements].sort(([a],[b])=>a.length-b.length)) {
    const dest=join(targetRoot,loc);
    cpSync(dir,dest,{recursive:true,dereference:false,filter:s=>{const r=relative(dir,s);if(r==='node_modules'||r.startsWith(`node_modules${sep}`))return false;if(lstatSync(s).isSymbolicLink())fail(`sdk_unexpected_symlink:${s}`);return true;}});
  }
  copyFileSync(join(src,'manifest.json'),join(targetRoot,'manifest.json'));
  writeFileSync(join(targetRoot,'package.json'),JSON.stringify({private:true,description:'flattened native payment SDK for the hosted function'})+'\n');
  return {packages:nodes.size,placements:placements.size,nested:[...placements.keys()].filter(l=>l.split('node_modules').length>2)};
}
