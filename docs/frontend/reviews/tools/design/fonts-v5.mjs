import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await p.goto(""+(process.env.BASE||"http://localhost:3410/")+"", { waitUntil: "networkidle" });
console.log(JSON.stringify(await p.evaluate(() => [".pr-count-n", ".pay-n", ".sc-big", ".db-legend b", ".db-band b", ".cc-nums", ".cc-rate", ".fn-value", ".fn-unit", ".ch-wall-n", ".ch-traction-n", ".rs-table td, .rs td", ".px-num"].map(s => { const e = document.querySelector(s); if (!e) return s + " none"; const c = getComputedStyle(e); return `${s} :: ${c.fontFamily.split(",")[0]} ${c.fontWeight} ${c.fontSize} ls=${c.letterSpacing} h=${e.getBoundingClientRect().height|0} "${e.textContent.trim().slice(0,30)}"`; })), null, 1));
await b.close();
