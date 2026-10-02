import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const out = {};
for (const [w,h,mob,red] of [[1440,900,false,true],[390,844,true,false],[390,844,true,true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, reducedMotion: red ? "reduce" : "no-preference" })).newPage();
  await p.goto("http://localhost:3411/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
  await p.waitForTimeout(600);
  out[`${w}${red?"-reduced":""}`] = await p.evaluate(() => {
    const vw = innerWidth;
    const hidden = [...document.querySelectorAll("[data-reveal]")].filter((e) => +getComputedStyle(e).opacity < 0.99).length;
    const small = []; const seen = new Set();
    for (const el of document.querySelectorAll("main *")) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      if (fs < 12 && cs.visibility !== "hidden" && +cs.opacity > 0.2) { const k = `${fs}px ${el.className}`.slice(0,70); if (!seen.has(k)) { seen.add(k); small.push(k + " :: " + el.textContent.trim().slice(0,40)); } }
    }
    const over = [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(e).position !== "fixed"; }).slice(0,8).map(e => `${e.tagName}.${String(e.className).slice(0,40)} r=${Math.round(e.getBoundingClientRect().right)}`);
    const italics = [...document.querySelectorAll("main *")].filter(e => getComputedStyle(e).fontStyle !== "normal" && e.textContent.trim()).slice(0,5).map(e=>e.tagName+"."+e.className);
    const fam = new Set([...document.querySelectorAll("main *")].map(e => getComputedStyle(e).fontFamily.split(",")[0]));
    const w700 = [...document.querySelectorAll("main *")].filter(e => +getComputedStyle(e).fontWeight >= 600 && e.textContent.trim()).slice(0,5).map(e=>`${e.tagName}.${String(e.className).slice(0,30)} ${getComputedStyle(e).fontWeight} ${getComputedStyle(e).fontFamily.split(",")[0]}`);
    return { H: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, motion: document.documentElement.dataset.pxMotion, hidden, small: small.slice(0,25), over, italics, fam: [...fam], w700 };
  });
}
console.log(JSON.stringify(out, null, 1));
await b.close();
