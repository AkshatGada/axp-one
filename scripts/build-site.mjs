#!/usr/bin/env node
// Single-site build for axp.one (Vercel Build Output API v3, written to .vercel/output):
//   /            apps/marketing static export
//   /mvp/        apps/product-ui static export (NEXT_PUBLIC_BASE_PATH=/mvp, NEXT_PUBLIC_LIVE_API=1;
//                both runs: the live Devnet run, and /mvp/first-recording/)
//   /advertiser-dashboard/, /publisher-demo/   separate root-base-path product export
//   /sdk/        alias to the publisher integration guide
//   /api/*       one Node function: recorded MVP runs + durable user-operated product API
// Works on a fresh clone: reads only committed files and builds the native payment SDK
// from the vendored, hash-pinned source when local-state/phase4-sdk is absent.
//   node scripts/build-site.mjs [--skip-apps] [--skip-sdk-build]
// Then: node scripts/build-site/serve.mjs   (local static + function smoke server)
import {spawnSync} from 'node:child_process';
import {existsSync,rmSync,mkdirSync,cpSync,writeFileSync,readFileSync,statSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {flattenSDK} from './build-site/flatten-sdk.mjs';
import {publishProductStatic,verifyPageAssets} from './build-site/product-static.mjs';
import {siteRoutes} from './build-site/site-routes.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'.vercel/output'),fnDir=join(out,'functions/api/index.func');
const args=new Set(process.argv.slice(2));
const RUNTIME=process.env.AXP_FUNCTION_RUNTIME||'nodejs22.x';
const t0=Date.now(),log=m=>console.log(`[build-site ${((Date.now()-t0)/1000).toFixed(0)}s] ${m}`);
function sh(cmd,argv,{cwd=root,env={}}={}) {
  log(`$ ${[cmd,...argv].join(' ')}`);
  const r=spawnSync(cmd,argv,{cwd,stdio:'inherit',env:{...process.env,...env}});
  if(r.status!==0)throw new Error(`command failed (${r.status}): ${cmd} ${argv.join(' ')}`);
}
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<18))throw new Error(`Node ${process.versions.node}: need 22.18+ (node:sqlite, TypeScript stripping)`);
log(`node ${process.versions.node}, function runtime ${RUNTIME}`);

// 1. Landing, root product surfaces, then both recorded MVP runs.
// Next exports to a custom distDir when supplied; keep this root export separate
// from out/ so the recorded /mvp build cannot overwrite its root asset URLs.
if(!args.has('--skip-apps')) {
  sh('pnpm',['--filter','@axp/marketing','build']);
  sh('pnpm',['--filter','@axp/product-ui','build:one'],{env:{NEXT_PUBLIC_BASE_PATH:'',NEXT_PUBLIC_LIVE_API:'1',NEXT_DIST_DIR:'.next-product-build'}});
  sh('pnpm',['--filter','@axp/product-ui','build'],{env:{NEXT_PUBLIC_BASE_PATH:'/mvp',NEXT_PUBLIC_LIVE_API:'1'}});
}
const marketingOut=join(root,'apps/marketing/out'),mvpOut=join(root,'apps/product-ui/out'),productOut=join(root,'apps/product-ui/.next-product-build');
for(const [d,name] of [[marketingOut,'apps/marketing/out'],[mvpOut,'apps/product-ui/out']])if(!existsSync(join(d,'index.html')))throw new Error(`${name} missing: build the apps first`);
if(!existsSync(join(mvpOut,'first-recording/index.html')))throw new Error('apps/product-ui/out/first-recording missing (build-all builds both runs)');
// The MVP must have been built for /mvp (asset URLs carry the base path).
if(!readFileSync(join(mvpOut,'index.html'),'utf8').includes('/mvp/_next/'))throw new Error('apps/product-ui/out was not built with NEXT_PUBLIC_BASE_PATH=/mvp');

// 2. The native payment SDK (from vendored, hash-pinned source; the loader re-checks hashes).
const sdkRoot=join(root,process.env.AXP_PAYMENT_SDK_ROOT||'local-state/phase4-sdk');
const sdkReady=()=>{try{return JSON.parse(readFileSync(join(sdkRoot,'manifest.json'),'utf8')).imported===true;}catch{return false;}};
if(!sdkReady()) {
  if(args.has('--skip-sdk-build'))throw new Error('payment SDK missing and --skip-sdk-build given');
  sh('npm',['ci','--ignore-scripts','--no-audit','--no-fund','--prefix','tooling/payment-sdk']);
  // Build machines have far less than the 40 GB local-workstation free-disk margin.
  sh(process.execPath,['scripts/payment-spike/phase4-sdk.mjs','--acquire'],{env:{AXP_SDK_DISK_FLOOR_BYTES:String(2*1024**3)}});
  if(!sdkReady())throw new Error('payment SDK build did not finish');
}

// 3. Assemble .vercel/output.
rmSync(out,{recursive:true,force:true});
const staticDir=join(out,'static');
cpSync(marketingOut,staticDir,{recursive:true});
cpSync(mvpOut,join(staticDir,'mvp'),{recursive:true});
publishProductStatic(productOut,staticDir);
log('static: / (marketing) + /mvp/ (MVP) + root advertiser dashboard, publisher chat and SDK guide');

mkdirSync(fnDir,{recursive:true});
const copy=(rel,filter)=>cpSync(join(root,rel),join(fnDir,rel),{recursive:true,dereference:false,...(filter?{filter}:{})});
writeFileSync(join(fnDir,'index.mjs'),"export {default} from './packages/hosted/vercel-function.mjs';\n");
// The function needs the backend modules only: no tests, spikes, keys or local state.
copy('packages',s=>!/[\\/](spike|node_modules)([\\/]|$)|\.test\.mjs$|\.sqlite/.test(s.slice(root.length)));
copy('apps/backend');
copy('artifacts/v2/evidence');
writeFileSync(join(fnDir,'package.json'),JSON.stringify({name:'axp-api',private:true,type:'module'},null,2)+'\n');
const sdk=flattenSDK(sdkRoot,join(fnDir,'local-state/phase4-sdk'));
log(`function: payment SDK flattened (${sdk.packages} packages, nested: ${sdk.nested.join(', ')||'none'})`);
writeFileSync(join(fnDir,'.vc-config.json'),JSON.stringify({runtime:RUNTIME,handler:'index.mjs',launcherType:'Nodejs',shouldAddHelpers:false,
  supportsResponseStreaming:false,maxDuration:300,memory:1024,environment:{NODE_OPTIONS:'--no-warnings=ExperimentalWarning'}},null,2)+'\n');

// Routes: API first, then files, then directory index pages (trailingSlash exports), then 404.
const config={version:3,
  routes:siteRoutes({mvp404:existsSync(join(staticDir,'mvp/404.html'))?'/mvp/404.html':'/404.html'}),
  // Hobby allows one cron run per day; on Pro use */2 * * * * for faster cleanup of abandoned runs.
  crons:[{path:'/api/cron/sweep',schedule:'0 9 * * *'}],
};
writeFileSync(join(out,'config.json'),JSON.stringify(config,null,2)+'\n');

// 4. Self-checks of the output.
const size=d=>readdirSync(d,{withFileTypes:true,recursive:true}).filter(e=>e.isFile()).reduce((n,e)=>n+statSync(join(e.parentPath??e.path,e.name)).size,0);
const fnBytes=size(fnDir);if(fnBytes>240*1024*1024)throw new Error(`function too large: ${fnBytes}`);
for(const p of ['index.html','demo/index.html','network/index.html','mvp/index.html','mvp/verify/index.html','mvp/first-recording/index.html','advertiser-dashboard/index.html','publisher-demo/index.html','publisher-demo/integration/index.html']) {
  if(!existsSync(join(staticDir,p)))throw new Error(`missing static page ${p}`);
  verifyPageAssets(staticDir,p);
}
const leaked=readdirSync(out,{recursive:true}).map(String).filter(p=>/(^|\/)(\.env[^/]*|test-wallets\.json|hosted-devnet-wallets\.json|[^/]*\.pem|[^/]*\.sqlite)$/.test(p));
if(leaked.length)throw new Error(`private files in output: ${leaked.join(', ')}`);
const fnTop=readdirSync(fnDir).sort().join(),fnLocal=readdirSync(join(fnDir,'local-state')).join(),fnArtifacts=readdirSync(join(fnDir,'artifacts')).join();
if(fnTop!=='.vc-config.json,apps,artifacts,index.mjs,local-state,package.json,packages'||fnLocal!=='phase4-sdk'||fnArtifacts!=='v2')throw new Error(`unexpected function contents: ${fnTop} | ${fnLocal} | ${fnArtifacts}`);
// The function must import and answer with live runs off, with no environment.
const probe=spawnSync(process.execPath,['--input-type=module','-e',`
  const {default:h}=await import(${JSON.stringify(join(fnDir,'index.mjs'))});
  const {loadNativeSDK}=await import(${JSON.stringify(join(fnDir,'packages/payments/sdk-loader.mjs'))});
  await loadNativeSDK(${JSON.stringify(join(fnDir,'local-state/phase4-sdk'))});
  const res={writeHead(s){this.s=s;},end(b){this.b=b;}};await h({url:'/api/live',method:'GET',headers:{}},res);
  const b=JSON.parse(res.b);if(res.s!==200||b.enabled!==false)throw new Error('probe '+res.s+' '+res.b);console.log('probe ok',res.s,JSON.stringify(b.configured));
  const product={writeHead(s){this.s=s;},end(b){this.b=b;}};await h({url:'/api/product/health',method:'GET',headers:{}},product);
  const p=JSON.parse(product.b);if(product.s!==200||p.configured?.enabled!==false)throw new Error('product probe '+product.s+' '+product.b);console.log('product probe ok',product.s);`],
  {cwd:fnDir,encoding:'utf8',env:{PATH:process.env.PATH,VERCEL:'1',NODE_OPTIONS:'--no-warnings'}});
if(probe.status!==0)throw new Error(`function probe failed: ${probe.stderr||probe.stdout}`);
log(probe.stdout.trim());
log(`done: .vercel/output (static ${(size(staticDir)/1e6).toFixed(1)} MB, function ${(fnBytes/1e6).toFixed(1)} MB)`);
