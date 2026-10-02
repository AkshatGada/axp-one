import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const [vp] = process.argv.slice(2);
const [w,h] = (vp||"1440x900").split("x").map(Number);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
await p.goto("http://localhost:3410/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const out = [];
  const main = document.querySelector("main") || document.body;
  const walk = (el, depth) => {
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      if (r.height > 300 || cs.position === "sticky") out.push(`${"  ".repeat(depth)}${c.tagName}#${c.id}.${String(c.className).slice(0,60)} top=${Math.round(r.top+scrollY)} h=${Math.round(r.height)} ${cs.position==="sticky"?"STICKY":""}`);
      if (depth < 3) walk(c, depth+1);
    }
  };
  walk(main, 0);
  return { H: document.documentElement.scrollHeight, out, h2: [...document.querySelectorAll("h1,h2")].map(e=>`${e.tagName} @${Math.round(e.getBoundingClientRect().top+scrollY)}: ${e.textContent.slice(0,90)}`) };
});
console.log("H", r.H); console.log(r.out.join("\n")); console.log(r.h2.join("\n"));
await b.close();
