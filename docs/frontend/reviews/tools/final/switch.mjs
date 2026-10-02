// Run switcher: open it, screenshot, follow "First recording".
import { launch, open, SCRATCH } from "./lib.mjs";
const BASE = (process.env.BASE || "http://127.0.0.1:3421") + (process.env.PREFIX || "");
const browser = await launch();
const { ctx, page, log } = await open(browser, BASE + "/settlement/", { w: 1440, h: 900 });
const sw = page.locator("header select, header button, header [aria-haspopup], header details summary").first();
console.log(await page.evaluate(() => [...document.querySelectorAll("header select, header button, header summary, header [aria-haspopup]")].map((e) => e.tagName + ":" + e.textContent.trim().slice(0, 40))));
await sw.click(); await page.waitForTimeout(600);
await page.screenshot({ path: `${SCRATCH}/m-switch-open.png`, clip: { x: 0, y: 0, width: 900, height: 320 } });
const opts = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => /recording|Devnet run/i.test(a.textContent)).map((a) => [a.textContent.trim().slice(0, 60), a.getAttribute("href")]));
console.log(JSON.stringify(opts), log.console);
await ctx.close(); await browser.close();
