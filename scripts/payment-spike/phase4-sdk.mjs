// Bounded acquisition/build tooling only. Never loads wallet keys or broadcasts.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync,existsSync,statfsSync,readdirSync,symlinkSync} from 'node:fs';
import {resolve,join,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {nativeSDKRoot} from '../../packages/config/local.mjs';

const SOURCE=resolve(import.meta.dirname,'../../vendor/pay-kit');
const ROOT=nativeSDKRoot();
// FLOOR: free-disk safety margin; build machines (e.g. the hosted-site build) may lower it explicitly.
const LIMIT=100*1024*1024,FLOOR=Number(process.env.AXP_SDK_DISK_FLOOR_BYTES??40*1024**3);
const toolRequire=createRequire(new URL('../../tooling/payment-sdk/package.json',import.meta.url));
const semver=toolRequire('semver'),ts=toolRequire('typescript');
if(ts.version!=='5.9.3')throw new Error('compiler_pin_mismatch');
const sha=(b,algorithm='sha256')=>createHash(algorithm).update(b).digest('hex');
const sourceManifest=JSON.parse(readFileSync(join(SOURCE,'manifest.json'),'utf8'));
if(sourceManifest.sourceCommit!=='c294f8903f18efc746584e3cc2961d6033b8365c')throw Error('vendor_commit_mismatch');
for(const [path,expected] of Object.entries(sourceManifest.files)) {
  if(path.startsWith('/')||path.split('/').includes('..')||sha(readFileSync(join(SOURCE,path)))!==expected)throw Error('vendor_source_hash_mismatch');
}
const lockedPackages=new Map(JSON.parse(readFileSync(join(SOURCE,'locked-packages.json'),'utf8')).map(m=>[`${m.name}@${m.version}`,m]));
const lock=readFileSync(join(SOURCE,'typescript/pnpm-lock.yaml'),'utf8');
if(sha(lock)!=='58a00a82f021fdb06dbba0d8114f02c1770a19dfd92d26711741648429db749d')throw new Error('lock_hash_mismatch');
const pins=new Map();
for(const line of lock.split('\n')){
  const match=line.match(/^  ['"]?(@?[^\s:'"]+)@([^\s('":]+)(?:\([^\n]*\))?['"]?:$/);
  if(match&&semver.valid(match[2])){const values=pins.get(match[1])??new Set();values.add(match[2]);pins.set(match[1],values);}
}
const metadata=new Map(),roots=[['@solana/kit','6.10.0'],['@solana/addresses','6.10.0'],['@solana/program-client-core','6.10.0'],['@solana-program/token','0.11.0'],['mppx','0.8.15']],pending=[...roots];
const dependencies=new Map(),keyOf=(name,version)=>`${name}@${version}`;
function exact(name,range){if(semver.valid(range))return range;const versions=[...(pins.get(name)??[])].filter(v=>semver.satisfies(v,range)).sort(semver.rcompare);if(!versions.length)throw new Error(`unresolved_lock_pin:${name}:${range}`);return versions[0];}
while(pending.length){
  const [name,version]=pending.shift();
  const key=keyOf(name,version);if(metadata.has(key))continue;
  const m=lockedPackages.get(key);
  if(!m)throw Error('locked_package_missing');
  if(m.name!==name||m.version!==version||!m.dist?.integrity||!m.dist?.unpackedSize)throw new Error('metadata_invalid');
  metadata.set(key,m);
  const deps={...m.dependencies};
  for(const [n,r] of Object.entries(m.peerDependencies??{}))if(!m.peerDependenciesMeta?.[n]?.optional&&n!=='typescript')deps[n]??=r;
  const resolved=Object.entries(deps).map(([n,r])=>[n,exact(n,r)]);dependencies.set(key,resolved);pending.push(...resolved);
}
const declaredBytes=[...metadata.values()].reduce((n,m)=>n+m.dist.unpackedSize,0);
const report={schemaVersion:'axp.phase4-sdk.v1',sourceCommit:'c294f8903f18efc746584e3cc2961d6033b8365c',packageVersion:'0.11.0',compiler:ts.version,toolingOnlySource:'repository-local tooling/payment-sdk; hash-pinned vendor/pay-kit source and dependency metadata',declaredBytes,limitBytes:LIMIT,packages:[...metadata.values()].map(m=>({name:m.name,version:m.version,unpackedBytes:m.dist.unpackedSize,integrity:m.dist.integrity,tarball:m.dist.tarball})),installed:false};
console.log(JSON.stringify(['--acquire','--finish'].includes(process.argv[2])?{status:'preflight',declaredBytes,limitBytes:LIMIT,packages:metadata.size}:report,null,2));
if(!['--acquire','--finish'].includes(process.argv[2]))process.exit(0);
if(declaredBytes+10*1024*1024>LIMIT)throw new Error('dependency_footprint_over_cap');
let written=0;
function capacity(bytes){const s=statfsSync(process.cwd());if(s.bavail*s.bsize-bytes<FLOOR||written+bytes>LIMIT)throw new Error('storage_gate');}
capacity(declaredBytes+10*1024*1024);mkdirSync(ROOT,{recursive:true,mode:0o700});
const packageRoot=(name,version)=>join(ROOT,'store',`${name.replaceAll('/','+') }@${version}`);
for(const m of metadata.values()){
  const target=packageRoot(m.name,m.version);
  if(process.argv[2]==='--finish') { if(!existsSync(target))throw new Error(`incomplete_acquisition:${m.name}`); written+=m.dist.unpackedSize; continue; }
  const response=await fetch(m.dist.tarball,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('archive_download_failed');
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20*1024*1024)throw new Error('archive_over_cap');
  const [algorithm,expected]=m.dist.integrity.split('-');if(createHash(algorithm).update(bytes).digest('base64')!==expected)throw new Error('archive_integrity_mismatch');
  const listing=spawnSync('tar',['-tzf','-'],{input:bytes,encoding:'utf8',maxBuffer:5*1024*1024});
  const invalid=listing.stdout.split('\n').filter(Boolean).find(p=>!(p==='package'||p.startsWith('package/'))||p.split('/').some(segment=>segment==='..')||p.startsWith('/'));
  if(listing.status!==0||invalid)throw new Error(`archive_paths_invalid:${m.name}:${invalid??listing.stderr}`);
  const verbose=spawnSync('tar',['-tvzf','-'],{input:bytes,encoding:'utf8',maxBuffer:5*1024*1024});
  if(verbose.status!==0||verbose.stdout.split('\n').filter(Boolean).some(p=>!['-','d'].includes(p[0])))throw new Error('archive_links_forbidden');
  capacity(m.dist.unpackedSize+bytes.length);mkdirSync(target,{recursive:true,mode:0o700});
  const unpack=spawnSync('tar',['-xzf','-','--strip-components','1','-C',target],{input:bytes});if(unpack.status!==0)throw new Error('archive_extract_failed');
  written+=m.dist.unpackedSize;
}
for(const m of metadata.values())for(const [name,version] of dependencies.get(keyOf(m.name,m.version))){
  const link=join(packageRoot(m.name,m.version),'node_modules',name);mkdirSync(dirname(link),{recursive:true,mode:0o700});if(!existsSync(link))symlinkSync(relative(dirname(link),packageRoot(name,version)),link,'dir');
}
// Older packages import their own name but have no exports map/self-resolution.
for(const m of metadata.values()) { const link=join(packageRoot(m.name,m.version),'node_modules',m.name);mkdirSync(dirname(link),{recursive:true,mode:0o700});if(!existsSync(link))symlinkSync(relative(dirname(link),packageRoot(m.name,m.version)),link,'dir'); }
for(const [name,version] of roots){const link=join(ROOT,'node_modules',name);mkdirSync(dirname(link),{recursive:true,mode:0o700});if(!existsSync(link))symlinkSync(relative(dirname(link),packageRoot(name,version)),link,'dir');}
// Full MPP source package transpilation, no dev tooling or monorepo installation.
const src=join(SOURCE,'typescript/packages/mpp/src'),out=join(ROOT,'node_modules/@solana/mpp/dist');
let modules=0;const fileHashes=[];
function emit(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){const file=join(dir,ent.name);if(ent.isDirectory()){if(ent.name!=='__tests__')emit(file);continue;}if(!ent.name.endsWith('.ts')||ent.name.endsWith('.d.ts'))continue;
  const text=readFileSync(file,'utf8'),result=ts.transpileModule(text,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,verbatimModuleSyntax:true,sourceMap:false}}).outputText;
  if(sha(result)!==sourceManifest.expectedEmittedHashes[relative(src,file)])throw Error('tested_output_hash_mismatch');
  const path=join(out,relative(src,file).replace(/\.ts$/,'.js'));capacity(Buffer.byteLength(result));mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,result,{mode:0o600});written+=Buffer.byteLength(result);modules++;fileHashes.push([relative(src,file),sha(text),sha(result)]);
}}
emit(src);const manifest=JSON.parse(readFileSync(join(SOURCE,'typescript/packages/mpp/package.json'),'utf8'));
delete manifest.devDependencies;delete manifest.scripts;
for(const [name,range] of Object.entries(manifest.dependencies)) {
  const version=exact(name,range),target=packageRoot(name,version);
  if(!existsSync(target))continue; // Runtime import check identifies genuinely missing modules.
  const link=join(ROOT,'node_modules/@solana/mpp/node_modules',name);mkdirSync(dirname(link),{recursive:true,mode:0o700});if(!existsSync(link))symlinkSync(relative(dirname(link),target),link,'dir');
}
writeFileSync(join(ROOT,'node_modules/@solana/mpp/package.json'),JSON.stringify(manifest,null,2),{mode:0o600});
writeFileSync(join(ROOT,'node_modules/@solana/mpp/LICENSE'),readFileSync(join(SOURCE,'LICENSE')),{mode:0o600});
report.installed=true;report.modules=modules;report.writtenBytes=written;report.transpilation='TypeScript transpileModule; package-import and runtime checks required, not a static typecheck';report.moduleHashes=fileHashes;
writeFileSync(join(ROOT,'manifest.json'),JSON.stringify(report,null,2),{mode:0o600});
const rootURL=pathToFileURL(`${ROOT}/node_modules/@solana/mpp/dist/`);
for(const file of ['client/PaymentChannels.js','client/Session.js','server/Session.js','server/session/on-chain.js'])await import(new URL(file,rootURL));
report.imported=true;writeFileSync(join(ROOT,'manifest.json'),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify({status:'sdk_modules_imported',root:ROOT,modules,writtenBytes:written}));
