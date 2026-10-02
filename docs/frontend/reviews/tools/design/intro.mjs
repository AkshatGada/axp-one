import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const shots = [];
p.goto("http://localhost:3410/");
await p.waitForSelector("h1");
const t0 = Date.now();
for (const t of [150, 600, 1100, 1700]) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); shots.push((await p.screenshot({ scale: "css" })).toString("base64")); }
const m = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
await m.setContent(`<body style="margin:0;background:#888">${shots.map((s,i)=>`<img src="data:image/png;base64,${s}" style="width:790px;margin:2px">`).join("")}</body>`);
await m.screenshot({ path: "out/intro.png", fullPage: true });
await b.close();
