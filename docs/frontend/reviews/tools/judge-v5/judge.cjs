const { chromium } = require('/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core');
const fs = require('fs');
const OUT = '/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v5-judge';
const URL = 'http://localhost:3410/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const [tag, vp, step, every] of [['desk', {width:1440,height:900}, 450, 2], ['phone', {width:390,height:844}, 600, 2]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: tag==='phone', hasTouch: tag==='phone' });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type()==='error') console.log(`[${tag} console.error]`, m.text().slice(0,200)); });
    page.on('pageerror', e => console.log(`[${tag} pageerror]`, e.message.slice(0,200)));
    await page.route(u => !u.toString().startsWith('http://localhost'), r => r.abort());
    const t0 = Date.now();
    const resp = await page.goto(URL, { waitUntil: 'networkidle' }).catch(e=>{console.log('goto', e.message); return null;});
    console.log(tag, 'status', resp && resp.status(), 'load ms', Date.now()-t0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${tag}-00a-t1s.png` });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${tag}-00b-first-screen.png` });
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(tag, 'scrollHeight', H, 'scrollWidth', await page.evaluate(()=>document.documentElement.scrollWidth));
    let y = 0, i = 0, n = 1;
    while (y + vp.height < H && i < 90) {
      y += step; i++;
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(1000);
      if (i % every === 0) {
        await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-y${y}.png` }); n++;
      }
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-bottom.png` });
    fs.writeFileSync(`${OUT}/${tag}-page-text.txt`, await page.evaluate(() => document.body.innerText));
    if (tag==='desk') {
      const links = await page.evaluate(() => [...document.querySelectorAll('a,button')].map(a=>a.tagName+' '+a.innerText.trim().replace(/\s+/g,' ').slice(0,70)+' -> '+(a.getAttribute('href')||'')+' target='+(a.getAttribute('target')||'')));
      fs.writeFileSync(`${OUT}/desk-links.txt`, links.join('\n'));
      for (const [label, name] of [['See the working MVP','mvp'], ['Verify','verify']]) {
        await page.evaluate(() => window.scrollTo(0,0)); await page.waitForTimeout(600);
        const loc = page.locator('a,button').filter({ hasText: label });
        const cnt = await loc.count(); console.log(label, 'count', cnt);
        if (!cnt) continue;
        const el = loc.first();
        console.log(label, 'href', await el.getAttribute('href'), 'text', (await el.innerText()).slice(0,80));
        try {
          await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
          await page.screenshot({ path: `${OUT}/desk-${name}-00-link-in-context.png` });
          const [popup] = await Promise.all([
            ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null),
            el.click({ timeout: 5000 }),
          ]);
          const target = popup || page;
          await target.waitForLoadState('networkidle').catch(()=>{});
          await target.waitForTimeout(3000);
          console.log(name, 'url', target.url(), popup ? '(new tab)' : '(same tab)');
          await target.screenshot({ path: `${OUT}/desk-${name}-01.png` });
          await target.mouse.wheel(0, 800); await target.waitForTimeout(1500);
          await target.screenshot({ path: `${OUT}/desk-${name}-02.png` });
          await target.mouse.wheel(0, 800); await target.waitForTimeout(1500);
          await target.screenshot({ path: `${OUT}/desk-${name}-03.png` });
          fs.writeFileSync(`${OUT}/desk-${name}-text.txt`, await target.evaluate(() => document.body.innerText));
          if (popup) await popup.close(); else { await page.goto(URL, { waitUntil: 'networkidle' }).catch(()=>{}); }
        } catch (e) { console.log(name, 'click failed', e.message); }
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
