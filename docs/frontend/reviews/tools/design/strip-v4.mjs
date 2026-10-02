import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
// node strip-v4.mjs <selector> <comma offsets in px relative to section top> <name> [vp]
const [sel, offs, name, vp] = process.argv.slice(2);
const [w, h] = (vp || "1440x900").split("x").map(Number);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
await p.goto("http://localhost:3411/", { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
const shots = [];
for (const o of offs.split(",").map(Number)) {
  await p.evaluate(async ([sel, o]) => { const el = document.querySelector(sel); const y = el.getBoundingClientRect().top + scrollY + o; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); await new Promise(r => setTimeout(r, 500)); }, [sel, o]);
  shots.push([o, (await p.screenshot()).toString("base64")]);
}
const m = await (await b.newContext({ viewport: { width: 1600, height: 400 } })).newPage();
await m.setContent(`<body style="margin:0;background:#888">${shots.map(([o,s]) => `<div style="display:inline-block;margin:2px;vertical-align:top"><div style="font:12px sans-serif;background:#000;color:#fff">${o}</div><img src="data:image/png;base64,${s}" style="width:${Math.floor(1580/Math.min(4,shots.length))}px;display:block"></div>`).join("")}</body>`);
await m.screenshot({ path: `out/v4/${name}.png`, fullPage: true });
await b.close();
