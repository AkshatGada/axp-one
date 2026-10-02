// Design critic capture for the axp.one landing (read-only; localhost only).
// node capture.mjs <mode>   mode = bench | shots | pins | mobile | reduced | jank
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3410/";
const OUT = "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/landing-v5";
const DATA = "/Users/akshat/agentic-dsp/docs/frontend/reviews/tools/design/out/v5";
fs.mkdirSync(DATA, { recursive: true });
const mode = process.argv[2] || "bench";

const INIT = `
window.__perf = { lcp: 0, lcpEl: '', cls: 0, shifts: [] };
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.lcp = e.startTime; window.__perf.lcpEl = (e.element && (e.element.tagName + '.' + (e.element.className||'') + ' ' + (e.element.textContent||'').slice(0,60))) || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__perf.cls += e.value; window.__perf.shifts.push({ v: e.value, t: e.startTime, src: (e.sources||[]).map(s => s.node ? (s.node.nodeName + '.' + (s.node.className||'')) : '').join('|') }); } } }).observe({ type: 'layout-shift', buffered: true });
} catch (e) {}
`;

async function launch() {
  return chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
}

async function open(browser, { w, h, reduced = false, url = BASE, mobile = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const log = { console: [], failed: [], offOrigin: [], requests: 0 };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.console.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => log.console.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => log.failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`); });
  // Block anything off localhost (record it).
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    log.requests++;
    if (!["localhost", "127.0.0.1"].includes(u.hostname) && !u.protocol.startsWith("data") && !u.protocol.startsWith("blob")) {
      log.offOrigin.push(u.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(INIT);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000); // hero intro (~2.4s)
  return { ctx, page, log };
}

async function scrollY(page, y) {
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, y);
  await page.waitForTimeout(120);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(380);
}

async function geom(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return { top, h: el.offsetHeight, span: Math.max(0, el.offsetHeight - innerHeight) };
  }, sel);
}

async function at(page, sel, p, offset = 0) {
  const g = await geom(page, sel);
  if (!g) return null;
  await scrollY(page, g.top + p * g.span + offset);
  return g;
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log("shot", name);
}

const results = {};

const browser = await launch();
try {
  if (mode === "bench") {
    for (const [w, h] of [[1440, 900], [1280, 800], [1920, 1080], [390, 844]]) {
      const { ctx, page, log } = await open(browser, { w, h, mobile: w < 500 });
      const info = await page.evaluate(() => {
        const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
        const docW = document.documentElement.scrollWidth;
        const over = [];
        if (docW > innerWidth) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right > innerWidth + 1 && r.width > 0) over.push(`${el.tagName}.${el.className} r=${Math.round(r.right)}`);
            if (over.length > 15) break;
          }
        }
        const nav = performance.getEntriesByType("navigation")[0];
        const js = performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script").reduce((a, r) => a + (r.transferSize || 0), 0);
        return { fonts, docW, vw: innerWidth, over, docH: document.documentElement.scrollHeight, perf: window.__perf, dcl: nav?.domContentLoadedEventEnd, load: nav?.loadEventEnd, jsTransfer: js, motion: document.documentElement.dataset.pxMotion, lenis: !!window.__lenis };
      });
      // full scroll to collect late CLS + errors
      for (let y = 0; y < info.docH; y += h * 0.8) await scrollY(page, y);
      const perfEnd = await page.evaluate(() => window.__perf);
      results[`${w}x${h}`] = { ...info, perfEnd, log };
      await ctx.close();
    }
    // Other routes
    for (const path of ["design/", "?film=1&from=close", "?still=1"]) {
      const { ctx, page, log } = await open(browser, { w: 1440, h: 900, url: BASE + path });
      results[path] = { log, docW: await page.evaluate(() => document.documentElement.scrollWidth) };
      await ctx.close();
    }
    fs.writeFileSync(`${DATA}/bench.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 1).slice(0, 6000));
  }

  if (mode === "pins") {
    const scenes = [
      { sel: ".hs", sticky: ".hs-stage", name: "hero" },
      { sel: ".ss", sticky: ".ss-stage", name: "stage" },
      { sel: ".ld", sticky: ".ld-stage", name: "dive" }, { sel: ".cs", sticky: ".cs-stage, .cs > *", name: "closing" },
      { sel: ".db", sticky: ".db-stage", name: "dots" },
      { sel: ".ss-shutter", sticky: ".ss-shutter-plate", name: "shutter" },
    ];
    for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]]) {
      const { ctx, page } = await open(browser, { w, h });
      for (const sc of scenes) {
        const g = await geom(page, sc.sel);
        const fwd = [];
        const N = 24;
        for (let i = 0; i <= N; i++) {
          await scrollY(page, g.top + (i / N) * g.span);
          fwd.push(await page.evaluate((s) => {
            const st = document.querySelector(s.sticky);
            const r = st?.getBoundingClientRect();
            const beat = [...document.querySelectorAll(".pg-beats li")].findIndex((l) => l.getAttribute("aria-current") === "step");
            const chat = document.querySelector(".hs .sp-chat");
            const fly = document.querySelector(".ld-fly");
            const dbs = document.querySelector(".db");
            return { top: Math.round(r?.top ?? -999), bottom: Math.round(r?.bottom ?? -999), beat, dbStep: dbs?.getAttribute("data-step") ?? dbs?.style.getPropertyValue("--p"), chatT: chat?.style.transform?.slice(0, 40), chatO: chat?.style.opacity, flyO: fly?.style.opacity };
          }, sc));
        }
        const back = [];
        for (let i = N; i >= 0; i--) {
          await scrollY(page, g.top + (i / N) * g.span);
          back.push(await page.evaluate(() => [...document.querySelectorAll(".pg-beats li")].findIndex((l) => l.getAttribute("aria-current") === "step")));
        }
        results[`${w}:${sc.name}`] = { g, fwd, back };
      }
      await ctx.close();
    }
    fs.writeFileSync(`${DATA}/pins.json`, JSON.stringify(results, null, 2));
    for (const [k, v] of Object.entries(results)) {
      console.log(k, "span", v.g.span, "tops", v.fwd.map((f) => f.top).join(","), "beats", v.fwd.map((f) => f.beat).join(","), "back", v.back.join(","));
    }
  }

  if (mode === "jank") {
    // Real wheel scrolling through Lenis; measure rAF frame gaps.
    const { ctx, page } = await open(browser, { w: 1440, h: 900 });
    await page.mouse.move(700, 450);
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const loop = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    let y = 0;
    while (y < docH - 900) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(40);
      y = await page.evaluate(() => scrollY);
    }
    await page.waitForTimeout(800);
    const f = await page.evaluate(() => window.__frames);
    const s = [...f].sort((a, b) => a - b);
    const r = { n: f.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], over50: f.filter((x) => x > 50).length, over100: f.filter((x) => x > 100).length };
    console.log(JSON.stringify(r));
    fs.writeFileSync(`${DATA}/jank.json`, JSON.stringify(r));
    await ctx.close();
  }

  if (mode === "shots") {
    const [w, h] = (process.argv[3] || "1440x900").split("x").map(Number);
    const pre = process.argv[4] || "";
    const dir = pre ? DATA : OUT;
    const S = async (n) => { await page.screenshot({ path: `${dir}/${pre}${n}.png` }); console.log("shot", n); };
    const { ctx, page } = await open(browser, { w, h, reduced: process.argv[5] === "reduced" });
    await S("01-hero-load");
    await at(page, ".hs", 0.3); await S("02-hero-pullback");
    await at(page, ".hs", 0.85); await S("03-hero-explode");
    await at(page, ".bo", 0, -60); await S("04-builton-why");
    await at(page, "#why", 0, 120); await S("04b-why");
    const sh = await geom(page, ".ss-shutter");
    await scrollY(page, sh.top - h * 0.5); await S("05a-shutter-enter");
    await scrollY(page, sh.top); await S("05b-shutter-open");
    await at(page, ".ss", 0.33); await S("06-stage-beat3");
    await at(page, ".ss", 0.5); await S("06b-stage-beat4");
    await at(page, ".ss", 0.6); await S("07-stage-beat5");
    await at(page, ".ss", 0.72); await S("07b-stage-beat6");
    await at(page, ".ss", 0.95); await S("08-stage-beat7");
    await at(page, "#rule", 0, 0); await S("09-rule");
    await at(page, "#payments", 0, 100); await S("10-payments");
    await at(page, "#data", 0, 0); await S("11-ch-opener");
    await at(page, ".ch-wallband", 0, -80); await S("11b-ch-wall");
    await at(page, ".db", 0.0); await S("12a-dots-field");
    await at(page, ".db", 0.25); await S("12b-dots-q");
    await at(page, ".db", 0.45); await S("12c-dots-mid");
    await at(page, ".db", 0.75); await S("12d-dots-settled");
    await at(page, ".db", 1); await S("12e-dots-end");
    await at(page, ".ld", 0.0, -60); await S("13a-dive");
    await at(page, ".ld-payoff", 0, -200); await S("13b-payoff");
    await at(page, ".ch-pair", 0, -60); await S("14-countries-funnel");
    await at(page, ".ch-pair", 0, 400); await S("14b-countries-funnel-low");
    await at(page, ".ch-moat", 0, -40); await S("15-moat");
    await at(page, "#proof", 0, 0); await S("16-proof");
    await at(page, "#proof", 0, h); await S("16b-proof-2");
    await at(page, "#proof", 0, 2 * h); await S("16c-proof-3");
    await at(page, "#next", 0, 0); await S("17-next");
    await at(page, ".pg-close", 0, -40); await S("18-closing");
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    await scrollY(page, H); await S("19-footer");
    await ctx.close();
  }

  if (mode === "extra") {
    // Non-saved diagnostics to /out (not counted toward the shot budget).
    const which = process.argv[3];
    const [w, h] = (process.argv[4] || "1440x900").split("x").map(Number);
    const { ctx, page } = await open(browser, { w, h, reduced: process.argv[6] === "reduced" });
    const [sel, p, off] = which.split(":");
    await at(page, sel, Number(p || 0), Number(off || 0));
    await page.screenshot({ path: `${DATA}/${process.argv[5] || "x"}.png` });
    console.log("ok");
    await ctx.close();
  }

  if (mode === "mobile") {
    const { ctx, page } = await open(browser, { w: 390, h: 844, mobile: true });
    await page.screenshot({ path: `${DATA}/m-full.png`, fullPage: true });
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log("mobile docH", H);
    await ctx.close();
  }

  if (mode === "reduced") {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, reduced: true });
    await page.screenshot({ path: `${DATA}/r-full.png`, fullPage: true });
    const info = await page.evaluate(() => ({ motion: document.documentElement.dataset.pxMotion, H: document.documentElement.scrollHeight, hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length }));
    console.log(JSON.stringify(info));
    await ctx.close();
  }
} finally {
  await browser.close();
}
