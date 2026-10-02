const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v3-judge';
const URL = 'http://localhost:3410/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const [tag, vp, step, every] of [['desk', {width:1440,height:900}, 500, 2], ['phone', {width:390,height:844}, 600, 2]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: tag==='phone', hasTouch: tag==='phone' });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type()==='error') console.log(`[${tag} console.error]`, m.text().slice(0,200)); });
    await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
    await page.goto(URL, { waitUntil: 'networkidle' }).catch(e=>console.log('goto', e.message));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${tag}-00-first-screen.png` });
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(tag, 'scrollHeight', H);
    let y = 0, i = 0, n = 1;
    while (y + vp.height < H) {
      y += step; i++;
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(900);
      if (i % every === 0) {
        await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-y${y}.png` }); n++;
      }
      const H2 = await page.evaluate(() => document.documentElement.scrollHeight);
      if (i > 80) break;
      if (H2 > H) {}
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-bottom.png` });
    if (tag==='desk') {
      const text = await page.evaluate(() => document.body.innerText);
      require('fs').writeFileSync(`${OUT}/desk-page-text.txt`, text);
      const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a=>a.innerText.trim().slice(0,60)+' -> '+a.getAttribute('href')));
      require('fs').writeFileSync(`${OUT}/desk-links.txt`, links.join('\n'));
    }
    await ctx.close();
  }
  await browser.close();
})();
