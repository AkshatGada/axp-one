const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const fs = require('fs');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v4-judge';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const ctx = await browser.newContext({ viewport: {width:1440,height:900} });
  const page = await ctx.newPage();
  await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
  await page.goto('http://localhost:3420/', { waitUntil: 'networkidle' }).catch(e=>console.log(e.message));
  await page.waitForTimeout(3000);
  console.log('url', page.url());
  await page.screenshot({ path: `${OUT}/mvp3420-01.png` });
  for (let i=2;i<=3;i++){ await page.mouse.wheel(0,800); await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/mvp3420-0${i}.png` }); }
  fs.writeFileSync(`${OUT}/mvp3420-text.txt`, await page.evaluate(()=>document.body.innerText));
  const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a=>a.innerText.trim().replace(/\s+/g,' ').slice(0,50)+' -> '+a.getAttribute('href')));
  console.log(links.slice(0,30).join('\n'));
  await browser.close();
})();
