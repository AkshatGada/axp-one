// Final design critic helpers (read-only; localhost only). playwright-core + system Chrome.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
export const { chromium } = require("playwright-core");
export const SHOTS = "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final";
export const OUT = "/Users/akshat/agentic-dsp/docs/frontend/reviews/tools/final/out";
export const SCRATCH = process.env.SCRATCH || "/private/tmp/claude-501/-Users-akshat-openai-ads/536612e3-c8cf-472b-86a3-01494d0c547c/scratchpad/frames";
for (const d of [SHOTS, OUT, SCRATCH]) fs.mkdirSync(d, { recursive: true });
export const INIT = `window.__perf={lcp:0,lcpEl:'',cls:0,shifts:[]};try{new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__perf.lcp=e.startTime;window.__perf.lcpEl=e.element?(e.element.tagName+' '+(e.element.textContent||'').slice(0,50)):''}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__perf.cls+=e.value;window.__perf.shifts.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),src:(e.sources||[]).map(s=>s.node?(s.node.nodeName+'.'+String(s.node.className||'').slice(0,40)):'').join('|')})}}}).observe({type:'layout-shift',buffered:true})}catch(e){}`;
const LOCAL = ["localhost", "127.0.0.1"];
export async function launch() {
  return chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
}
export async function open(browser, url, { w = 1440, h = 900, mobile = false, dpr = 1, reduced = false, wait = 1200 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const log = { console: [], failed: [], offOrigin: [], js: 0, jsFiles: [] };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => log.console.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (!/net::ERR_ABORTED/.test(r.failure()?.errorText || "") || LOCAL.includes(new URL(r.url()).hostname)) log.failed.push(`${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", async (r) => {
    if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`);
    if (/\.js(\?|$)/.test(r.url())) { try { const b = await r.body(); log.js += b.length; log.jsFiles.push([r.url().split("/").pop(), b.length]); } catch {} }
  });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (!LOCAL.includes(u.hostname) && !["data:", "blob:"].includes(u.protocol)) { log.offOrigin.push(u.href); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(INIT);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  return { ctx, page, log };
}
export async function scrollTo(page, y, settle = 350) {
  await page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }, y);
  await page.waitForTimeout(settle);
  return page.evaluate(() => window.scrollY);
}
// Contact sheet: grid of images (absolute paths) rendered in a page, saved to out.
export async function sheet(browser, files, out, { cols = 4, tw = 480, labels = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: cols * (tw + 8) + 8, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cells = files.map((f, i) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><figcaption>${labels[i] ?? f.split("/").pop()}</figcaption></figure>`).join("");
  await page.setContent(`<style>body{margin:0;padding:8px;background:#222;font:12px system-ui;color:#fff;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:8px}figure{margin:0}img{width:${tw}px;display:block;outline:1px solid #555}figcaption{padding:2px 0}</style>${cells}`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out, fullPage: true });
  await ctx.close();
}
