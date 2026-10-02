import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const ctx = await b.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage();
await p.goto('http://localhost:3420/settlement/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
const link = p.locator('a[href*="explorer.solana.com/tx/5GeY"]').first();
const t0=Date.now();
const [ex] = await Promise.all([ctx.waitForEvent('page'), link.click()]);
await ex.waitForLoadState('domcontentloaded');
let txt='';
for (let i=0;i<25;i++){ await ex.waitForTimeout(1000); txt = await ex.evaluate(()=>document.body.innerText); if (/Result|Success|SUCCESS|Not Found|not found/i.test(txt) && /Slot/.test(txt)) break; }
console.log('explorer load s',(Date.now()-t0)/1000, ex.url());
await ex.screenshot({path:`${SHOTS}/21-explorer-close-tx.png`});
console.log(txt.slice(0,3000));
await b.close();
