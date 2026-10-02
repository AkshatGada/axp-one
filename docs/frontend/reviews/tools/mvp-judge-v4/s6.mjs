import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v4-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.click('nav >> text=Settlement').catch(async()=>{await p.click('a[href="/settlement/"]')});
await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);
console.log('URL',p.url());
await p.screenshot({path:`${SHOTS}/18-settlement.png`});
console.log((await p.innerText('main').catch(()=>p.innerText('body'))).slice(0,7000));
const dev = await p.$('#devnet');
if (dev) { await dev.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await p.screenshot({path:`${SHOTS}/19-settlement-devnet.png`}); }
const links = await p.$$eval('a[href*="explorer.solana.com"]',els=>els.map(e=>`[${e.innerText.trim().replace(/\s+/g,' ').slice(0,50)}] ${e.href}`));
console.log(links.join('\n'));
console.log('ERRS',errs);
await b.close();
