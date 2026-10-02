const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v5-judge';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await (await browser.newContext({ viewport: {width:1440,height:900} })).newPage();
  await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await page.goto('http://localhost:3410/', { waitUntil: 'networkidle' });
  for (let i=0;i<60;i++){ await page.mouse.wheel(0,600); await page.waitForTimeout(120); }
  await page.waitForTimeout(1500);
  console.log('scrollY', await page.evaluate(()=>scrollY), 'H', await page.evaluate(()=>document.documentElement.scrollHeight));
  await page.screenshot({path:`${OUT}/desk-20-true-bottom.png`});
  await browser.close();
})();
