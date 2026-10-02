// Header nav: click each link, wait, screenshot the landing frame.
import { launch, open, SCRATCH } from "./lib.mjs";
const base = process.env.BASE || "http://localhost:3411";
const browser = await launch();
const { ctx, page } = await open(browser, base + "/", { w: 1440, h: 900 });
const links = await page.evaluate(() => [...document.querySelectorAll('a[href*="#"]')].map((a) => [a.textContent.trim(), a.getAttribute("href")]));
console.log(JSON.stringify(links));
for (const [t, href] of links.filter(([, h]) => h && h.includes("#") && !["#main","#top"].includes(h))) {
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.locator(`a[href="${href}"]`).first().click();
  await page.waitForTimeout(2500);
  const y = await page.evaluate(() => scrollY);
  const f = `${SCRATCH}/nav-${href.split("#")[1]}.png`; await page.screenshot({ path: f });
  console.log(t, href, y);
}
await ctx.close(); await browser.close();
