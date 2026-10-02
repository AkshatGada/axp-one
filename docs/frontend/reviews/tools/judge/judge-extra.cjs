const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v3-judge';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1440,height:900} });
  const page = await ctx.newPage();
  await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await page.goto('http://localhost:3410/', { waitUntil: 'networkidle' });
  await page.keyboard.press('End'); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/desk-29-end-key.png` });
  console.log(await page.evaluate(() => { const f=document.querySelector('footer'); if(!f) return 'no footer'; const r=f.getBoundingClientRect(); return JSON.stringify({top:r.top,h:r.height,scrollY,H:document.documentElement.scrollHeight, vis:getComputedStyle(f).visibility, op:getComputedStyle(f).opacity}); }));
  // video check
  console.log('video', await page.evaluate(() => [...document.querySelectorAll('video')].map(v=>({src:v.currentSrc||v.querySelector('source')?.src, dur:v.duration, rs:v.readyState}))));
  // mvp
  const r = await page.goto('http://localhost:3410/mvp/', { waitUntil: 'networkidle' }).catch(e=>null);
  console.log('mvp status', r && r.status());
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/mvp-00-first-screen.png` });
  console.log('mvp H', await page.evaluate(()=>document.documentElement.scrollHeight));
  await ctx.close();
  const pc = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
  const p = await pc.newPage();
  await p.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await p.goto('http://localhost:3410/', { waitUntil: 'networkidle' });
  console.log('phone overflow', await p.evaluate(() => { const w=document.documentElement.clientWidth; const bad=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.right>w+1 && r.width>0;}).slice(0,8).map(e=>e.tagName+'.'+(e.className&&e.className.baseVal===undefined?e.className:'').toString().slice(0,50)+' '+Math.round(e.getBoundingClientRect().right)); return {w, sw:document.documentElement.scrollWidth, bad}; }));
  await browser.close();
})();
