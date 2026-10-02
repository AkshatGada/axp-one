// Landing final review. BASE=http://localhost:3410 node landing.mjs bench|frames <w> <h> [step]|reduced
import fs from "node:fs";
import { launch, open, scrollTo, sheet, SHOTS, OUT, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3410";
const mode = process.argv[2] || "bench";
const browser = await launch();
const VPS = [[1280, 800], [1440, 900], [1920, 1080], [390, 844, true]];

async function geometry(page) {
  return page.evaluate(() => {
    const secs = [...document.querySelectorAll("main > section, main > div, main > *, footer")].map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 40), world: el.dataset.world || "", top: Math.round(r.top + scrollY), h: Math.round(r.height) };
    });
    const worlds = [...document.querySelectorAll("[data-world]")].map((el) => { const r = el.getBoundingClientRect(); return { w: el.dataset.world, top: Math.round(r.top + scrollY), h: Math.round(r.height), id: el.id }; });
    return { sh: document.documentElement.scrollHeight, vh: innerHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, secs, worlds };
  });
}

if (mode === "bench") {
  const res = [];
  for (const [w, h, mobile] of VPS) {
    for (const reduced of [false, true]) {
      if (mobile && reduced) continue;
      const { ctx, page, log } = await open(browser, BASE + "/", { w, h, mobile, reduced, wait: 1500 });
      const g = await geometry(page);
      // slow scroll through the page to catch late console errors and CLS during scroll
      for (let y = 0; y <= g.sh; y += Math.round(h * 0.5)) await scrollTo(page, y, 120);
      await scrollTo(page, g.sh, 600);
      const g2 = await geometry(page);
      const info = await page.evaluate(() => {
        const txt = document.body.innerText;
        const visibleWide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > document.documentElement.clientWidth + 1 && getComputedStyle(e).position !== "fixed" && r.width > 0 && !e.closest("[style*='overflow'],[class*=wall],[class*=tape]"); }).slice(0, 6).map((e) => e.tagName + "." + String(e.className).slice(0, 30) + " r=" + Math.round(e.getBoundingClientRect().right));
        return {
          perf: window.__perf,
          fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight + " " + f.style),
          fontsFailed: [...document.fonts].filter((f) => f.status === "error").map((f) => f.family),
          bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 60),
          words: (document.querySelector("main")?.innerText || "").split(/\s+/).filter((x) => /[A-Za-z]/.test(x)).length,
          wordsAll: txt.split(/\s+/).filter((x) => /[A-Za-z]/.test(x)).length,
          dashes: (txt.match(/[–—]/g) || []).length,
          middots: (txt.match(/[·•]/g) || []).length,
          visibleWide,
          radii: [...new Set([...document.querySelectorAll("main *")].filter((e) => e.offsetParent && e.getBoundingClientRect().width > 40).map((e) => getComputedStyle(e).borderTopLeftRadius).filter((r) => r !== "0px"))].slice(0, 30),
        };
      });
      res.push({ w, h, mobile: !!mobile, reduced, ...log, js: undefined, jsKB: Math.round(log.js / 1024), screens: +(g.sh / h).toFixed(2), sh: g.sh, sw: g2.sw, cw: g2.cw, worlds: g.worlds, secs: g.secs, ...info });
      await ctx.close();
    }
  }
  fs.writeFileSync(`${OUT}/landing-bench.json`, JSON.stringify(res, null, 1));
  for (const r of res) console.log(`${r.w}x${r.h}${r.reduced ? " RM" : ""}: screens ${r.screens} sh ${r.sh} overflow ${r.sw > r.cw} console ${r.console.length} failed ${r.failed.length} off ${r.offOrigin.length} cls ${r.perf.cls.toFixed(4)} lcp ${Math.round(r.perf.lcp)} (${r.perf.lcpEl}) words ${r.words}/${r.wordsAll} fontsFailed ${r.fontsFailed.length} dashes ${r.dashes} dots ${r.middots}`);
  console.log(JSON.stringify(res[1].worlds), res[1].radii, res[3].visibleWide, res[0].console, res[0].fonts.length, res[1].bodyFont);
}

if (mode === "frames") {
  const w = +process.argv[3] || 1440, h = +process.argv[4] || 900, step = +(process.argv[5] || 0.25);
  const mobile = w < 600;
  const RM = !!process.env.RM; const tag = `L${w}${RM ? "rm" : ""}`;
  const dir = `${SCRATCH}/${tag}`; fs.mkdirSync(dir, { recursive: true });
  const { ctx, page, log } = await open(browser, BASE + "/", { w, h, mobile, reduced: RM, wait: 1500 });
  const g = await geometry(page);
  const files = [], labels = [];
  let i = 0;
  for (let y = 0; y <= g.sh - h + 1; y += Math.round(h * step)) {
    const got = await scrollTo(page, y, 450);
    const f = `${dir}/${String(i).padStart(3, "0")}.png`;
    await page.screenshot({ path: f });
    files.push(f); labels.push(`y=${got} (${(got / h).toFixed(2)}vh)`); i++;
  }
  const got = await scrollTo(page, g.sh, 600); const f = `${dir}/${String(i).padStart(3, "0")}.png`; await page.screenshot({ path: f }); files.push(f); labels.push(`end y=${got}`);
  for (let k = 0; k * 16 < files.length; k++) await sheet(browser, files.slice(k * 16, k * 16 + 16), `${SCRATCH}/${tag}-sheet${k}.png`, { cols: 4, tw: mobile ? 200 : 460, labels: labels.slice(k * 16, k * 16 + 16) });
  console.log(tag, files.length, "frames", "console", log.console, JSON.stringify(g.worlds));
  await ctx.close();
}
await browser.close();
