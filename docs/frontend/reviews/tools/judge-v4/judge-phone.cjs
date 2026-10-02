const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const fs = require('fs');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v4-judge';
const URL = process.env.URL || 'http://localhost:3410/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const [tag, vp, step, every] of [['phone', {width:390,height:844}, 600, 2]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: tag==='phone', hasTouch: tag==='phone' });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type()==='error') console.log(`[${tag} console.error]`, m.text().slice(0,200)); });
    page.on('pageerror', e => console.log(`[${tag} pageerror]`, e.message.slice(0,200)));
    await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'networkidle' }).catch(e=>console.log('goto', e.message));
    console.log(tag, 'load ms', Date.now()-t0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${tag}-00a-t1s.png` });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${tag}-00b-first-screen.png` });
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(tag, 'scrollHeight', H, 'scrollWidth', await page.evaluate(()=>document.documentElement.scrollWidth));
    let y = 0, i = 0, n = 1;
    while (y + vp.height < H && i < 80) {
      y += step; i++;
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(900);
      if (i % every === 0) {
        await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-y${y}.png` }); n++;
      }
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-bottom.png` });
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(`${OUT}/${tag}-page-text.txt`, text);
    if (tag==='desk') {
      const links = await page.evaluate(() => [...document.querySelectorAll('a,button')].map(a=>a.tagName+' '+a.innerText.trim().replace(/\s+/g,' ').slice(0,60)+' -> '+(a.getAttribute('href')||'')+' target='+(a.getAttribute('target')||'')));
      fs.writeFileSync(`${OUT}/desk-links.txt`, links.join('\n'));
      // click the MVP CTA
      await page.evaluate(() => window.scrollTo(0,0));
      await page.waitForTimeout(800);
      const cta = page.getByText('See the working MVP', { exact: false }).first();
      console.log('cta count', await page.getByText('See the working MVP', { exact: false }).count());
      try {
        const [popup] = await Promise.all([
          ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null),
          cta.click({ timeout: 5000 }),
        ]);
        const target = popup || page;
        await target.waitForLoadState('networkidle').catch(()=>{});
        await target.waitForTimeout(2500);
        console.log('MVP url', target.url(), popup ? '(new tab)' : '(same tab)');
        await target.screenshot({ path: `${OUT}/desk-mvp-01.png` });
        await target.mouse.wheel(0, 700); await target.waitForTimeout(1200);
        await target.screenshot({ path: `${OUT}/desk-mvp-02.png` });
        fs.writeFileSync(`${OUT}/desk-mvp-text.txt`, await target.evaluate(() => document.body.innerText));
      } catch (e) { console.log('cta click failed', e.message); }
    }
    await ctx.close();
  }
  await browser.close();
})();
