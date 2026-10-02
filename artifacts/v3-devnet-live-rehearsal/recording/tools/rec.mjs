// High-quality capture: CDP screencast JPEG frames with Chrome's own timestamps -> ffconcat -> H.264.
import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export async function capture({ url, outDir, seconds, warmUrl, onTick, recordVideoDir }) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'f'), { recursive: true });
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  if (warmUrl) {
    const w = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const p = await w.newPage(); await p.goto(warmUrl, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await w.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, ...(recordVideoDir ? { recordVideo: { dir: recordVideoDir, size: { width: 1920, height: 1080 } } } : {}) });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async (e) => {
    const i = n++;
    const file = `f/${String(i).padStart(6, '0')}.jpg`;
    writeFileSync(join(outDir, file), Buffer.from(e.data, 'base64'));
    frames.push({ file, ts: e.metadata.timestamp, wall: Date.now() });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 93, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const t0 = Date.now();
  const log = [];
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  log.push({ ev: 'loaded+fonts', ms: Date.now() - t0 });
  const end = t0 + seconds * 1000;
  let last = '';
  while (Date.now() < end) {
    if (onTick) {
      const s = await onTick(page).catch(() => null);
      if (s && s !== last) { log.push({ ev: s, ms: Date.now() - t0, wall: Date.now() }); last = s; }
    }
    await page.waitForTimeout(100);
  }
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  await ctx.close(); await browser.close();
  writeFileSync(join(outDir, 'frames.json'), JSON.stringify({ t0, frames, log }, null, 1));
  return { t0, frames, log };
}
