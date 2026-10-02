const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  await p.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await p.goto('http://localhost:3420/present/#1', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  console.log(await p.evaluate(()=>{const e=document.querySelector('.pr-frame'); return getComputedStyle(e).transform+' '+JSON.stringify(e.getBoundingClientRect())}));
  await p.screenshot({ path: '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v2-judge/zz-present-1920-control.png' });
  await b.close();
})();
