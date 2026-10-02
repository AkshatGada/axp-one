const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const fs = require('fs');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v5-judge';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1440,height:900} });
  const page = await ctx.newPage();
  await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await page.goto('http://localhost:3410/', { waitUntil: 'networkidle' });
  // scrolly: from 3000 to 5200 in 250px steps, screenshot each
  await page.evaluate(()=>window.scrollTo(0,2900)); await page.waitForTimeout(800);
  let k=0;
  for (let y=3150; y<=5150; y+=250) { await page.mouse.wheel(0,250); await page.waitForTimeout(900); await page.screenshot({path:`${OUT}/desk-scrolly-${String(k++).padStart(2,'0')}-y${y}.png`}); }
  // footer
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await page.waitForTimeout(1500);
  await page.screenshot({path:`${OUT}/desk-footer-final.png`});
  const footer = await page.evaluate(()=>{const f=document.querySelector('footer'); return f? f.innerText + ' | rect ' + JSON.stringify(f.getBoundingClientRect()) : 'no footer';});
  console.log('footer:', footer);
  // video
  await page.goto('http://localhost:3410/#video', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  const v = await page.evaluate(()=>{const v=document.querySelector('video'); return v? {src:v.currentSrc||v.src, dur:v.duration, ready:v.readyState, poster:v.poster}:null;});
  console.log('video', JSON.stringify(v));
  // MVP settlement + tamper
  const m = await ctx.newPage();
  await m.goto('http://localhost:3420/verify/', { waitUntil: 'networkidle' }); await m.waitForTimeout(2500);
  try { await m.getByRole('button',{name:/Tamper with one byte/}).click(); await m.waitForTimeout(2000); await m.screenshot({path:`${OUT}/desk-verify-tamper.png`}); } catch(e){console.log('tamper', e.message);}
  try { await m.getByRole('link',{name:/^Settlement$/}).first().click(); await m.waitForLoadState('networkidle'); await m.waitForTimeout(2000); console.log('settle url', m.url()); await m.screenshot({path:`${OUT}/desk-mvp-settlement-01.png`}); await m.mouse.wheel(0,800); await m.waitForTimeout(1200); await m.screenshot({path:`${OUT}/desk-mvp-settlement-02.png`}); fs.writeFileSync(`${OUT}/desk-mvp-settlement-text.txt`, await m.evaluate(()=>document.body.innerText)); } catch(e){console.log('settle', e.message);}
  await browser.close();
})();
