// Account-only Build Output API bundle. Does not build/publish landing or demo routes.
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyPageAssets} from '../build-site/product-static.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, '.vercel/output');
if (existsSync(out)) throw Error('preview_output_exists_use_fresh_output');
const page = join(root, 'apps/product-ui/out/account');
if (!existsSync(join(page, 'index.html'))) throw Error('build_product_ui_first');
const statics = join(out, 'static'), fn = join(out, 'functions/api/index.func');
mkdirSync(fn, {recursive:true}); mkdirSync(statics, {recursive:true});
cpSync(page, join(statics, 'account'), {recursive:true});
cpSync(join(root, 'apps/product-ui/out/_next'), join(statics, '_next'), {recursive:true});
// Fonts only, not recorded runs, video, demo pages or source environment files.
const fonts = join(root, 'apps/product-ui/public/fonts');
if (existsSync(fonts)) cpSync(fonts, join(statics, 'fonts'), {recursive:true});
cpSync(join(root, 'packages'), join(fn, 'packages'), {recursive:true, filter:path => {
  const name = path.split('/').at(-1);
  return name !== 'node_modules' && !name.startsWith('.') && !/\.(?:sqlite|pem|env|tgz)$/.test(name);
}});
cpSync(join(root, 'artifacts/v2/evidence'), join(fn, 'artifacts/v2/evidence'), {recursive:true});
writeFileSync(join(fn, 'package.json'), JSON.stringify({private:true,type:'module'}));
writeFileSync(join(fn, '.vc-config.json'), JSON.stringify({runtime:'nodejs24.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:60}));
writeFileSync(join(fn, 'index.mjs'), `
import {createHostedAccountsAPI} from './packages/accounts/hosted.mjs';
let api;
export default async function handler(req,res) {
 const path=new URL(req.url,'https://local').pathname;
 const blocked=process.env.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED!=='0'||process.env.AXP_ACCOUNT_FINANCIAL_MODE!=='synthetic';
 if(blocked || !path.startsWith('/api/accounts/') || /\\/(?:funding|open|voucher|close|reconcile)(?:\\/|$)/.test(path)) {
  res.writeHead(blocked?503:404,{'content-type':'application/json','cache-control':'no-store'});
  return res.end(JSON.stringify({error:blocked?'preview_safety_configuration_required':'not_found'}));
 }
 api??=createHostedAccountsAPI(); return api.handler(req,res);
}
`);
writeFileSync(join(out, 'config.json'), JSON.stringify({version:3,routes:[
 {src:'^/(.*)$',headers:{'X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'},continue:true},
 {src:'^/api/accounts(?:/.*)?$',dest:'/api/index'},
 {src:'^/$',status:307,headers:{Location:'/account/'}},
 {src:'^/account$',status:308,headers:{Location:'/account/'}},
 {handle:'filesystem'},
 {src:'^/account/$',dest:'/account/index.html'},
 {src:'^/(.*)$',status:404},
]}));
const files = dir => readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
if (files(out).some(p=>/\.(?:env|sqlite|pem|tgz)$/.test(p)||p.includes('/local-state/'))) throw Error('private_preview_file');
console.log(JSON.stringify({accountAssets:verifyPageAssets(statics,'account/index.html'),landing:false,demo:false,broadcasts:false,financialMode:'synthetic'}));
