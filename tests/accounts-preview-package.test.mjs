import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = (path, text) => {mkdirSync(dirname(path), {recursive:true}); writeFileSync(path,text);};
function fixture({page=true}={}) {
  const dir=mkdtempSync(join(tmpdir(),'axp-preview-package-'));
  for(const file of ['scripts/accounts/build-preview.mjs','scripts/build-site/product-static.mjs']) {
    mkdirSync(dirname(join(dir,file)),{recursive:true}); cpSync(join(root,file),join(dir,file));
  }
  write(join(dir,'package.json'),'{"private":true,"type":"module"}');
  if(page) write(join(dir,'apps/product-ui/out/account/index.html'),'<script src="/_next/static/account.js"></script>');
  write(join(dir,'apps/product-ui/out/_next/static/account.js'),'// fixture account asset');
  write(join(dir,'apps/product-ui/out/index.html'),'landing must not be copied');
  write(join(dir,'apps/product-ui/out/publisher-demo/index.html'),'demo must not be copied');
  write(join(dir,'packages/accounts/hosted.mjs'),`export function createHostedAccountsAPI() {
    return {handler(_req,res) {res.writeHead(200,{'content-type':'application/json'});res.end('{"fixture":true}');}};
  }`);
  for(const name of ['.env.local','fixture.pem','fixture.sqlite','fixture.tgz']) write(join(dir,'packages/accounts',name),'private fixture sentinel');
  write(join(dir,'artifacts/v2/evidence/public.json'),'{"fixture":true}');
  return dir;
}
const build=dir=>spawnSync(process.execPath,['scripts/accounts/build-preview.mjs'],{cwd:dir,encoding:'utf8',env:{PATH:process.env.PATH}});

test('account-only build excludes other pages and private inputs, preserves existing output',()=>{
  const dir=fixture(); const result=build(dir);
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),{accountAssets:1,landing:false,demo:false,broadcasts:false,financialMode:'synthetic'});
  const out=join(dir,'.vercel/output');
  assert.equal(existsSync(join(out,'static/account/index.html')),true);
  assert.equal(existsSync(join(out,'static/index.html')),false);
  assert.equal(existsSync(join(out,'static/publisher-demo')),false);
  for(const name of ['.env.local','fixture.pem','fixture.sqlite','fixture.tgz']) assert.equal(existsSync(join(out,'functions/api/index.func/packages/accounts',name)),false);
  const before=readFileSync(join(out,'config.json'),'utf8');
  const repeat=build(dir); assert.notEqual(repeat.status,0); assert.match(repeat.stderr,/preview_output_exists_use_fresh_output/);
  assert.equal(readFileSync(join(out,'config.json'),'utf8'),before);
  const config=JSON.parse(before);
  assert.equal(config.version,3);
  assert.equal(config.routes[0].headers['X-Robots-Tag'],'noindex, nofollow');
  assert.deepEqual(config.routes.at(-1),{src:'^/(.*)$',status:404});
  assert.ok(!config.routes.some(route=>/demo|landing|product/.test(route.src??'')));
  const fn=JSON.parse(readFileSync(join(out,'functions/api/index.func/.vc-config.json'),'utf8'));
  assert.equal(fn.runtime,'nodejs24.x');
});

test('missing account export fails before creating an output tree',()=>{
  const dir=fixture({page:false}); const result=build(dir);
  assert.notEqual(result.status,0); assert.match(result.stderr,/build_product_ui_first/);
  assert.equal(existsSync(join(dir,'.vercel/output')),false);
});

test('generated handler blocks finance and non-account APIs before creating the backend',async()=>{
  const dir=fixture(); assert.equal(build(dir).status,0);
  const handler=(await import(pathToFileURL(join(dir,'.vercel/output/functions/api/index.func/index.mjs')))).default;
  const names=['AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED','AXP_ACCOUNT_FINANCIAL_MODE'];
  const previous=Object.fromEntries(names.map(key=>[key,process.env[key]]));
  const invoke=async path=>{
    let status,body;
    await handler({url:path},{writeHead(code){status=code;},end(text){body=JSON.parse(text);}});
    return {status,body};
  };
  try {
    for(const [broadcast,mode] of [[undefined,'synthetic'],['1','synthetic'],['0','devnet'],['0',undefined]]) {
      for(const [name,value] of [[names[0],broadcast],[names[1],mode]]) {
        if(value===undefined)delete process.env[name];else process.env[name]=value;
      }
      assert.deepEqual(await invoke('/api/accounts/health'),{status:503,body:{error:'preview_safety_configuration_required'}});
    }
    process.env[names[0]]='0';process.env[names[1]]='synthetic';
    for(const path of ['/api/product/config','/publisher-demo/','/','/api/accountsnot/health',
      ...['funding','open','voucher','close','reconcile'].map(action=>`/api/accounts/organizations/example/campaigns/example/${action}`)]) {
      assert.deepEqual(await invoke(path),{status:404,body:{error:'not_found'}},path);
    }
    for(const path of ['/api/accounts/health','/api/accounts/session','/api/accounts/organizations/example/apps/example/wallet/challenge']) {
      assert.deepEqual(await invoke(path),{status:200,body:{fixture:true}},path);
    }
  } finally {
    for(const name of names)if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];
  }
});
