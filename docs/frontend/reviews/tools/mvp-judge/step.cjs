// usage: node step.cjs '<js actions using page>' [shotname]
const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v2-judge';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find(p => p.url().startsWith('http://localhost:3420')) || ctx.pages()[0];
  await page.setViewportSize({ width: 1440, height: 900 });
  const code = process.argv[2] || '';
  try { await eval(`(async()=>{ ${code} })()`); } catch (e) { console.log('ERR', e.message.slice(0,300)); }
  await page.waitForTimeout(900);
  if (process.argv[3]) { await page.screenshot({ path: `${OUT}/${process.argv[3]}.png` }); console.log('shot', process.argv[3], page.url()); }
  if (process.argv[4] === 'text') { console.log((await page.evaluate(() => document.body.innerText)).slice(0, 6000)); }
  if (process.argv[4] === 'clicks') {
    console.log((await page.evaluate(() => document.body.innerText)).slice(0, 4000));
    console.log('--- CLICKABLES ---');
    const cl = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=button],[role=tab]')].filter(e=>e.offsetParent).map(e => `${e.tagName}:${(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,70)} ${e.getAttribute('href')||''}`)); console.log(cl.join('\n'));
  }
  await browser.close().catch(()=>{});
})();
