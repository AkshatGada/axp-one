import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await p.goto("http://localhost:3411/", { waitUntil: "networkidle" });
console.log(JSON.stringify(await p.evaluate(() => [".pr-money-n", ".pay-fact .px-num, .pay-n", ".sc-big", ".db-legend b", ".cc .px-num, .cc-n", ".fn-n, .fn .px-num", ".ch-wall-n", ".ss-copy h3, .ss-copy .ss-title", ".ss-copy"].map(s => { const e = document.querySelector(s); if (!e) return s + " none"; const c = getComputedStyle(e); return `${s} :: ${c.fontFamily.split(",")[0]} ${c.fontWeight} ${c.fontSize} ls=${c.letterSpacing} h=${e.getBoundingClientRect().height|0} "${e.textContent.trim().slice(0,30)}"`; })), null, 1));
await b.close();
